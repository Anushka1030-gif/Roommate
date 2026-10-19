import db from '../db/index.js';
import { DEFAULT_IMPORTANCE_WEIGHTS } from './requirement.service.js';
import LLMService from './llm.service.js';

/**
 * Dimension labels and highlights helpers
 */
const SLEEP_DESCRIPTIONS = {
  early_bird: 'Early bird routine',
  night_owl: 'Night owl schedule',
  flexible: 'Flexible sleep schedule',
};

const HABIT_DESCRIPTIONS = {
  silent: 'Quiet and focused study environment',
  background_noise: 'Comfortable with background ambient noise',
  group_study: 'Collaborative group study habits',
  flexible: 'Adaptable study routine',
};

/**
 * Calculate deterministic compatibility score across lifestyle dimensions.
 *
 * @param {object} requester - { profile, requirement }
 * @param {object} candidate - { profile, requirement }
 * @returns {object} { compatibility_score, score_breakdown, highlights, watch_out, explanation, icebreakers }
 */
export function calculateCompatibility(requester, candidate) {
  const reqProfile = requester.profile;
  const reqReq = requester.requirement;
  const candProfile = candidate.profile;
  const candReq = candidate.requirement;

  // 1. Cleanliness Score (0 - 100)
  const reqCleanliness = Number(reqProfile.cleanliness_level ?? 3);
  const candCleanliness = Number(candProfile.cleanliness_level ?? 3);
  const cleanDiff = Math.abs(reqCleanliness - candCleanliness);
  let cleanlinessScore = 100;
  if (cleanDiff === 1) cleanlinessScore = 85;
  else if (cleanDiff === 2) cleanlinessScore = 60;
  else if (cleanDiff === 3) cleanlinessScore = 35;
  else if (cleanDiff >= 4) cleanlinessScore = 15;

  // 2. Sleep Schedule Score (0 - 100)
  const prefSleep = reqReq.preferred_sleep_schedule || 'any';
  const targetSleep =
    prefSleep === 'same_as_me' || prefSleep === 'any'
      ? reqProfile.sleep_schedule
      : prefSleep;
  const candSleep = candProfile.sleep_schedule;

  let sleepScore = 100;
  if (prefSleep !== 'any') {
    if (candSleep === targetSleep) {
      sleepScore = 100;
    } else if (candSleep === 'flexible' || targetSleep === 'flexible') {
      sleepScore = 80;
    } else {
      // Early bird vs Night owl clash
      sleepScore = 30;
    }
  }

  // 3. Smoking Compatibility Score (0 - 100)
  const reqSmoking = reqProfile.smoking_preference || 'no';
  const candSmoking = candProfile.smoking_preference || 'no';
  let smokingScore = 100;
  if (reqSmoking === 'no' && candSmoking === 'no') {
    smokingScore = 100;
  } else if (reqSmoking === candSmoking) {
    smokingScore = 95;
  } else if (reqSmoking === 'flexible' || candSmoking === 'flexible') {
    smokingScore = 85;
  } else if (reqReq.smoking_ok && candSmoking !== 'no') {
    smokingScore = 75;
  } else {
    smokingScore = 60;
  }

  // 4. Drinking Compatibility Score (0 - 100)
  const reqDrinking = reqProfile.drinking_preference || 'no';
  const candDrinking = candProfile.drinking_preference || 'no';
  let drinkingScore = 100;
  if (reqDrinking === 'no' && candDrinking === 'no') {
    drinkingScore = 100;
  } else if (reqDrinking === candDrinking) {
    drinkingScore = 95;
  } else if (
    (reqDrinking === 'socially' && candDrinking === 'no') ||
    (reqDrinking === 'no' && candDrinking === 'socially')
  ) {
    drinkingScore = 80;
  } else if (reqDrinking === 'flexible' || candDrinking === 'flexible') {
    drinkingScore = 85;
  } else {
    drinkingScore = 70;
  }

  // 5. Food Preference Score (0 - 100)
  const foodReq = reqReq.food_preference || 'any';
  const reqFood = reqProfile.food_preference || 'any';
  const candFood = candProfile.food_preference || 'any';
  let foodScore = 100;

  if (foodReq === 'vegetarian_only') {
    if (candFood === 'vegetarian' || candFood === 'vegan') foodScore = 100;
    else if (candFood === 'eggetarian') foodScore = 60;
    else if (candFood === 'non_vegetarian') foodScore = 20;
    else foodScore = 50;
  } else if (foodReq === 'same_as_me') {
    if (candFood === reqFood) foodScore = 100;
    else if (
      (reqFood === 'vegetarian' && candFood === 'vegan') ||
      (reqFood === 'vegan' && candFood === 'vegetarian')
    )
      foodScore = 90;
    else if (
      (reqFood === 'vegetarian' && candFood === 'eggetarian') ||
      (reqFood === 'eggetarian' && candFood === 'vegetarian')
    )
      foodScore = 80;
    else if (
      (reqFood === 'non_vegetarian' && candFood === 'eggetarian') ||
      (reqFood === 'eggetarian' && candFood === 'non_vegetarian')
    )
      foodScore = 75;
    else foodScore = 40;
  } else {
    foodScore = 100;
  }

  // 6. Guests Policy Score (0 - 100)
  const reqGuestsOk = reqReq.guests_ok || 'sometimes';
  const candGuestPolicy = candProfile.guest_policy || 'weekends_only';
  let guestsScore = 85;

  if (reqGuestsOk === 'rarely') {
    if (candGuestPolicy === 'rarely' || candGuestPolicy === 'no_guests') guestsScore = 100;
    else if (candGuestPolicy === 'weekends_only') guestsScore = 65;
    else if (candGuestPolicy === 'anytime') guestsScore = 30;
  } else if (reqGuestsOk === 'sometimes') {
    if (candGuestPolicy === 'weekends_only' || candGuestPolicy === 'rarely') guestsScore = 100;
    else if (candGuestPolicy === 'anytime') guestsScore = 70;
    else if (candGuestPolicy === 'no_guests') guestsScore = 75;
  } else if (reqGuestsOk === 'often') {
    if (candGuestPolicy === 'anytime') guestsScore = 100;
    else if (candGuestPolicy === 'weekends_only') guestsScore = 90;
    else if (candGuestPolicy === 'rarely') guestsScore = 60;
    else if (candGuestPolicy === 'no_guests') guestsScore = 40;
  }

  // 7. Noise Tolerance Score (0 - 100)
  const reqNoiseTol = reqReq.noise_tolerance || 'any';
  const candNoise = candProfile.noise_level || 'moderate';
  let noiseScore = 100;

  if (reqNoiseTol !== 'any') {
    if (
      (reqNoiseTol === 'quiet' && candNoise === 'quiet') ||
      (reqNoiseTol === 'moderate' && candNoise === 'moderate') ||
      (reqNoiseTol === 'lively' && candNoise === 'social')
    ) {
      noiseScore = 100;
    } else if (
      (reqNoiseTol === 'quiet' && candNoise === 'moderate') ||
      (reqNoiseTol === 'moderate' && (candNoise === 'quiet' || candNoise === 'social')) ||
      (reqNoiseTol === 'lively' && candNoise === 'moderate')
    ) {
      noiseScore = 75;
    } else {
      // quiet vs social clash
      noiseScore = 35;
    }
  }

  // 8. Study Habits / Social Style Score (0 - 100)
  const reqStudy = reqProfile.study_habits || 'silent';
  const candStudy = candProfile.study_habits || 'silent';
  let socialScore = 85;

  if (reqStudy === candStudy) {
    socialScore = 100;
  } else if (reqStudy === 'flexible' || candStudy === 'flexible') {
    socialScore = 85;
  } else if (
    (reqStudy === 'silent' && candStudy === 'background_noise') ||
    (reqStudy === 'background_noise' && candStudy === 'silent') ||
    (reqStudy === 'background_noise' && candStudy === 'group_study') ||
    (reqStudy === 'group_study' && candStudy === 'background_noise')
  ) {
    socialScore = 75;
  } else {
    // silent vs group_study clash
    socialScore = 40;
  }

  // 9. Budget Overlap Quality Score (0 - 100)
  const rMin = Number(reqReq.budget_min);
  const rMax = Number(reqReq.budget_max);
  const cMin = Number(candReq.budget_min);
  const cMax = Number(candReq.budget_max);

  const overlapMin = Math.max(rMin, cMin);
  const overlapMax = Math.min(rMax, cMax);
  const overlapSpan = Math.max(0, overlapMax - overlapMin);
  const maxSpan = Math.max(1, Math.max(rMax, cMax) - Math.min(rMin, cMin));
  const overlapRatio = Math.min(1, overlapSpan / maxSpan);

  // Range from 70 to 100 for overlapping ranges
  const budgetScore = Math.min(100, Math.round(70 + overlapRatio * 30));

  // Weights calculation
  const rawWeights = reqReq.importance_weights || {};
  const weights = {
    cleanliness: Number(rawWeights.cleanliness ?? DEFAULT_IMPORTANCE_WEIGHTS.cleanliness),
    sleep: Number(rawWeights.sleep ?? DEFAULT_IMPORTANCE_WEIGHTS.sleep),
    smoking: Number(rawWeights.smoking ?? DEFAULT_IMPORTANCE_WEIGHTS.smoking),
    drinking: Number(rawWeights.drinking ?? DEFAULT_IMPORTANCE_WEIGHTS.drinking),
    food: Number(rawWeights.food ?? DEFAULT_IMPORTANCE_WEIGHTS.food),
    guests: Number(rawWeights.guests ?? DEFAULT_IMPORTANCE_WEIGHTS.guests),
    noise: Number(rawWeights.noise ?? DEFAULT_IMPORTANCE_WEIGHTS.noise),
    social: Number(rawWeights.social ?? DEFAULT_IMPORTANCE_WEIGHTS.social),
    budget: 2, // Standard weight for budget
  };

  const dimensionScores = {
    cleanliness: cleanlinessScore,
    sleep: sleepScore,
    smoking: smokingScore,
    drinking: drinkingScore,
    food: foodScore,
    guests: guestsScore,
    noise: noiseScore,
    social: socialScore,
    budget: budgetScore,
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [dim, score] of Object.entries(dimensionScores)) {
    const weight = weights[dim] || 2;
    totalWeightedScore += score * weight;
    totalWeight += weight;
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(totalWeightedScore / totalWeight)));

  // Highlight points selection (highest scoring dimensions)
  const candidateHighlights = [];

  if (sleepScore >= 80 && candSleep) {
    candidateHighlights.push(
      sleepScore === 100
        ? `Both follow an ${SLEEP_DESCRIPTIONS[candSleep]?.toLowerCase() || 'aligned schedule'}`
        : 'Compatible and flexible sleep routines'
    );
  }

  if (budgetScore >= 80) {
    candidateHighlights.push(`Comfortable budget alignment (₹${overlapMin.toLocaleString('en-IN')} - ₹${overlapMax.toLocaleString('en-IN')})`);
  }

  if (cleanlinessScore >= 85) {
    candidateHighlights.push(`Shared clean living standards (cleanliness level ${candCleanliness}/5)`);
  }

  if (foodScore >= 85 && candFood) {
    candidateHighlights.push(
      candFood === 'vegetarian' || candFood === 'vegan'
        ? 'Complementary vegetarian-friendly diet habits'
        : 'Well-aligned food habits'
    );
  }

  if (noiseScore >= 80) {
    candidateHighlights.push('Mutual agreement on quiet study and home noise levels');
  }

  if (candidateHighlights.length < 2 && socialScore >= 75) {
    candidateHighlights.push(HABIT_DESCRIPTIONS[candStudy] || 'Complimentary study preferences');
  }

  // Ensure at least 2 highlights
  if (candidateHighlights.length < 2) {
    candidateHighlights.push('Both students verified with active housing requirements');
  }

  const highlights = candidateHighlights.slice(0, 2);

  // Watch out note (lowest scoring dimension if < 70)
  let watchOut = '';
  const sortedDimensions = Object.entries(dimensionScores).sort((a, b) => a[1] - b[1]);
  const [lowestDim, lowestScore] = sortedDimensions[0];

  if (lowestScore < 70) {
    switch (lowestDim) {
      case 'sleep':
        watchOut = 'Different daily sleep schedules (one early riser, one night owl)';
        break;
      case 'cleanliness':
        watchOut = 'Slight difference in expected tidiness and cleaning habits';
        break;
      case 'guests':
        watchOut = 'Varying expectations around having visitors and guests over';
        break;
      case 'noise':
        watchOut = 'Differing preferences regarding ambient noise and quiet study hours';
        break;
      case 'social':
        watchOut = 'Different study styles (silent study vs collaborative study)';
        break;
      case 'food':
        watchOut = 'Different dietary preferences in shared cooking areas';
        break;
      default:
        watchOut = '';
    }
  }

  // Rule-based fallback explanation (2-3 sentences)
  const candidateName = candProfile.full_name || 'Your potential roommate';
  const collegeInfo = candProfile.college_name ? ` at ${candProfile.college_name}` : '';
  const majorInfo = candProfile.major ? ` studying ${candProfile.major}` : '';
  const cityInfo = candReq.city || reqReq.city || 'your city';

  const explanation = `${candidateName} is also seeking shared housing in ${cityInfo}${collegeInfo}${majorInfo}. You share an estimated ${finalScore}% lifestyle compatibility, with notable harmony in ${highlights[0].toLowerCase()}. ${
    watchOut
      ? `A quick conversation about your preferences regarding ${lowestDim} will ensure a smooth living dynamic.`
      : 'Your daily schedules and home preferences make this a well-balanced roommate match.'
  }`;

  // Icebreakers for conversation
  const icebreakers = [
    `Ask ${candidateName} about their ${candProfile.major || 'coursework'}${collegeInfo}!`,
    `Discuss your preferred move-in timeline and shared flat expectations in ${cityInfo}.`,
  ];

  return {
    compatibility_score: finalScore,
    score_breakdown: dimensionScores,
    highlights,
    watch_out: watchOut,
    explanation,
    icebreakers,
  };
}

/**
 * Find candidates that pass all Step 1 hard filters.
 *
 * @param {number} requesterUserId
 * @param {object} requesterReq
 * @param {object} requesterProfile
 * @returns {Promise<Array>} List of eligible candidate rows
 */
export async function findEligibleCandidates(requesterUserId, requesterReq, requesterProfile) {
  const requesterCity = requesterReq.city;
  const requesterMin = Number(requesterReq.budget_min);
  const requesterMax = Number(requesterReq.budget_max);
  const requesterCleanlinessMin = Number(requesterReq.preferred_cleanliness_min ?? 1);
  const requesterCleanlinessLevel = Number(requesterProfile.cleanliness_level ?? 3);

  // 1. Hard filters query in MySQL
  const candidateRows = await db('users')
    .join('profiles', 'users.id', 'profiles.user_id')
    .join('requirements', 'users.id', 'requirements.user_id')
    .where('users.id', '!=', requesterUserId)
    .andWhere('users.status', 'active')
    .andWhere('users.email_verified', 1)
    .andWhere('profiles.profile_completed', 1)
    .andWhere('requirements.is_active', 1)
    .andWhere('requirements.city', requesterCity)
    // Budget overlap condition: candidate.min <= requester.max AND candidate.max >= requester.min
    .andWhere('requirements.budget_min', '<=', requesterMax)
    .andWhere('requirements.budget_max', '>=', requesterMin)
    // Cleanliness constraints: candidate satisfies requester minimum, and requester satisfies candidate minimum
    .andWhere('profiles.cleanliness_level', '>=', requesterCleanlinessMin)
    .andWhere('requirements.preferred_cleanliness_min', '<=', requesterCleanlinessLevel)
    // Block filter: bidirectional exclusion
    .whereNotExists(function () {
      this.select('*')
        .from('blocks')
        .where(function () {
          this.where({ blocker_id: requesterUserId, blocked_id: db.ref('users.id') }).orWhere({
            blocker_id: db.ref('users.id'),
            blocked_id: requesterUserId,
          });
        });
    })
    .select(
      'users.id as candidate_user_id',
      'profiles.full_name',
      'profiles.age',
      'profiles.gender',
      'profiles.college_name',
      'profiles.major',
      'profiles.graduation_year',
      'profiles.city as profile_city',
      'profiles.bio',
      'profiles.avatar_url',
      'profiles.sleep_schedule',
      'profiles.cleanliness_level',
      'profiles.study_habits',
      'profiles.noise_level',
      'profiles.smoking_preference',
      'profiles.drinking_preference',
      'profiles.food_preference',
      'profiles.pet_preference',
      'profiles.guest_policy',
      'requirements.id as requirement_id',
      'requirements.city as requirement_city',
      'requirements.budget_min',
      'requirements.budget_max',
      'requirements.gender_preference',
      'requirements.preferred_sleep_schedule',
      'requirements.preferred_cleanliness_min',
      'requirements.smoking_ok',
      'requirements.drinking_ok',
      'requirements.food_preference as req_food_preference',
      'requirements.guests_ok',
      'requirements.noise_tolerance',
      'requirements.deal_breakers',
      'requirements.importance_weights'
    );

  // 2. Additional hard filter checks for mutual gender & smoking/drinking constraints
  const eligibleCandidates = candidateRows.filter((candidate) => {
    const candGender = candidate.gender;
    const reqGender = requesterProfile.gender;

    // Gender compatibility must be mutual: if either side chose same_gender_only, genders must match
    if (requesterReq.gender_preference === 'same_gender_only' && candGender !== reqGender) {
      return false;
    }
    if (candidate.gender_preference === 'same_gender_only' && candGender !== reqGender) {
      return false;
    }

    // Smoking filter: if requester smoking_ok = false, exclude candidate with smoking != no/never
    const candSmoking = candidate.smoking_preference || 'no';
    if (!requesterReq.smoking_ok && candSmoking !== 'no') {
      return false;
    }
    // Symmetrical smoking filter: if candidate smoking_ok = false, exclude requester if requester smokes
    const reqSmoking = requesterProfile.smoking_preference || 'no';
    if (!candidate.smoking_ok && reqSmoking !== 'no') {
      return false;
    }

    // Drinking filter: if requester drinking_ok = false, exclude candidate with drinking != no/never
    const candDrinking = candidate.drinking_preference || 'no';
    if (!requesterReq.drinking_ok && candDrinking !== 'no') {
      return false;
    }
    // Symmetrical drinking filter: if candidate drinking_ok = false, exclude requester if requester drinks
    const reqDrinking = requesterProfile.drinking_preference || 'no';
    if (!candidate.drinking_ok && reqDrinking !== 'no') {
      return false;
    }

    return true;
  });

  return eligibleCandidates;
}

/**
 * Score, sort and rank candidates for a requester.
 *
 * @param {object} requester - { profile, requirement }
 * @param {Array} eligibleCandidates - rows from findEligibleCandidates
 * @returns {object} { shortlist, topMatches }
 */
export function rankCandidates(requester, eligibleCandidates) {
  const scored = eligibleCandidates.map((candidateRow) => {
    let parsedWeights = candidateRow.importance_weights;
    if (typeof parsedWeights === 'string') {
      try {
        parsedWeights = JSON.parse(parsedWeights);
      } catch {
        parsedWeights = {};
      }
    }

    const candidateObj = {
      profile: {
        id: candidateRow.candidate_user_id,
        user_id: candidateRow.candidate_user_id,
        full_name: candidateRow.full_name,
        age: candidateRow.age,
        gender: candidateRow.gender,
        college_name: candidateRow.college_name,
        major: candidateRow.major,
        graduation_year: candidateRow.graduation_year,
        city: candidateRow.profile_city,
        bio: candidateRow.bio,
        avatar_url: candidateRow.avatar_url,
        sleep_schedule: candidateRow.sleep_schedule,
        cleanliness_level: candidateRow.cleanliness_level,
        study_habits: candidateRow.study_habits,
        noise_level: candidateRow.noise_level,
        smoking_preference: candidateRow.smoking_preference,
        drinking_preference: candidateRow.drinking_preference,
        food_preference: candidateRow.food_preference,
        pet_preference: candidateRow.pet_preference,
        guest_policy: candidateRow.guest_policy,
      },
      requirement: {
        id: candidateRow.requirement_id,
        user_id: candidateRow.candidate_user_id,
        city: candidateRow.requirement_city,
        budget_min: Number(candidateRow.budget_min),
        budget_max: Number(candidateRow.budget_max),
        gender_preference: candidateRow.gender_preference,
        preferred_sleep_schedule: candidateRow.preferred_sleep_schedule,
        preferred_cleanliness_min: Number(candidateRow.preferred_cleanliness_min),
        smoking_ok: Boolean(candidateRow.smoking_ok),
        drinking_ok: Boolean(candidateRow.drinking_ok),
        food_preference: candidateRow.req_food_preference,
        guests_ok: candidateRow.guests_ok,
        noise_tolerance: candidateRow.noise_tolerance,
        deal_breakers: candidateRow.deal_breakers,
        importance_weights: parsedWeights,
      },
    };

    const comp = calculateCompatibility(requester, candidateObj);

    return {
      candidate_id: candidateRow.candidate_user_id,
      score: comp.compatibility_score,
      compatibility_score: comp.compatibility_score,
      user: candidateObj.profile,
      requirement: candidateObj.requirement,
      score_breakdown: comp.score_breakdown,
      highlights: comp.highlights,
      watch_out: comp.watch_out,
      explanation: comp.explanation,
      icebreakers: comp.icebreakers,
      status: 'suggested',
    };
  });

  // Sort descending by compatibility_score
  scored.sort((a, b) => b.compatibility_score - a.compatibility_score);

  // Shortlist top 15
  const shortlist = scored.slice(0, 15);
  // Top 3 matches
  const topMatches = shortlist.slice(0, 3);

  return {
    shortlist,
    topMatches,
  };
}

/**
 * Run matching for a user: runs filters and pre-score, calls the LLM when available,
 * otherwise uses the fallback, and stores the final top 3 in match_results.
 *
 * @param {number} userId
 * @returns {Promise<object>} { matches, count, shortlist_count, has_enough_matches, message }
 */
export async function runMatching(userId) {
  // 1. Fetch requester's profile and active requirement
  const profile = await db('profiles').where({ user_id: userId }).first();
  const rawRequirement = await db('requirements')
    .where({ user_id: userId, is_active: 1 })
    .orderBy('id', 'desc')
    .first();

  if (!rawRequirement) {
    return {
      matches: [],
      count: 0,
      shortlist_count: 0,
      has_enough_matches: false,
      message: 'No active requirement found. Please submit your requirements to view matches.',
    };
  }

  let weights = rawRequirement.importance_weights;
  if (typeof weights === 'string') {
    try {
      weights = JSON.parse(weights);
    } catch {
      weights = DEFAULT_IMPORTANCE_WEIGHTS;
    }
  }

  const requester = {
    profile,
    requirement: {
      ...rawRequirement,
      budget_min: Number(rawRequirement.budget_min),
      budget_max: Number(rawRequirement.budget_max),
      preferred_cleanliness_min: Number(rawRequirement.preferred_cleanliness_min ?? 1),
      smoking_ok: Boolean(rawRequirement.smoking_ok),
      drinking_ok: Boolean(rawRequirement.drinking_ok),
      importance_weights: weights || DEFAULT_IMPORTANCE_WEIGHTS,
    },
  };

  // 2. Find eligible candidates that satisfy hard filters
  const eligibleCandidates = await findEligibleCandidates(
    userId,
    requester.requirement,
    requester.profile
  );

  // 3. Pre-score and rank candidates
  const { shortlist, topMatches } = rankCandidates(requester, eligibleCandidates);

  let finalMatches = topMatches.map((m) => ({ ...m, source: 'fallback' }));
  let matchSource = 'fallback';

  // 4. Call LLM ranking if candidates exist
  if (shortlist.length > 0) {
    try {
      const llmResult = await LLMService.rankMatches({
        seeker: requester.profile,
        requirement: requester.requirement,
        shortlist,
      });

      if (
        llmResult &&
        llmResult.status === 'success' &&
        Array.isArray(llmResult.matches) &&
        llmResult.matches.length > 0
      ) {
        finalMatches = llmResult.matches;
        matchSource = llmResult.source || 'llm';
      }
    } catch (llmErr) {
      console.error(
        'LLM matching failed, falling back to rule-based ranking:',
        llmErr?.message || llmErr
      );
    }
  }

  // 5. Cache top matches in match_results table within a transaction
  await db.transaction(async (trx) => {
    // Clear previous suggested matches for this user
    await trx('match_results')
      .where({ user_id: userId, status: 'suggested' })
      .del();

    for (const match of finalMatches) {
      await trx('match_results').insert({
        user_id: userId,
        matched_user_id: match.candidate_id,
        compatibility_score: match.score ?? match.compatibility_score,
        score_breakdown: JSON.stringify(match.score_breakdown || {}),
        ai_summary: match.explanation,
        ai_pros: JSON.stringify(match.highlights || []),
        ai_cons: JSON.stringify(match.watch_out ? [match.watch_out] : []),
        ai_icebreakers: JSON.stringify(match.icebreakers || []),
        status: 'suggested',
        source: match.source || matchSource || 'fallback',
      });
    }
  });

  const hasEnoughMatches = finalMatches.length >= 3;
  const message = hasEnoughMatches
    ? null
    : 'Not enough matches yet in your city. Check back soon as more students join!';

  return {
    matches: finalMatches,
    count: finalMatches.length,
    shortlist_count: shortlist.length,
    has_enough_matches: hasEnoughMatches,
    message,
  };
}

/**
 * Generate matches for a user (alias to runMatching for backward compatibility).
 *
 * @param {number} userId
 * @returns {Promise<object>}
 */
export async function generateMatches(userId) {
  return await runMatching(userId);
}

/**
 * Fetch cached matches for a user from match_results.
 * If no cached matches exist, runs matching on the fly.
 *
 * @param {number} userId
 * @returns {Promise<object>}
 */
export async function getCachedMatches(userId) {
  // Check existing matches in database
  const cachedRows = await db('match_results')
    .join('profiles', 'match_results.matched_user_id', 'profiles.user_id')
    .where('match_results.user_id', userId)
    .andWhere('match_results.status', 'suggested')
    .orderBy('match_results.compatibility_score', 'desc')
    .select(
      'match_results.id as match_id',
      'match_results.matched_user_id',
      'match_results.compatibility_score',
      'match_results.score_breakdown',
      'match_results.ai_summary',
      'match_results.ai_pros',
      'match_results.ai_cons',
      'match_results.ai_icebreakers',
      'match_results.status',
      'match_results.source',
      'profiles.full_name',
      'profiles.age',
      'profiles.gender',
      'profiles.college_name',
      'profiles.major',
      'profiles.graduation_year',
      'profiles.city',
      'profiles.bio',
      'profiles.avatar_url',
      'profiles.sleep_schedule',
      'profiles.cleanliness_level',
      'profiles.study_habits',
      'profiles.noise_level',
      'profiles.smoking_preference',
      'profiles.drinking_preference',
      'profiles.food_preference',
      'profiles.pet_preference',
      'profiles.guest_policy'
    );

  if (cachedRows.length > 0) {
    const formattedMatches = cachedRows.map((row) => {
      let breakdown = row.score_breakdown;
      if (typeof breakdown === 'string') {
        try {
          breakdown = JSON.parse(breakdown);
        } catch {
          breakdown = {};
        }
      }

      let pros = row.ai_pros;
      if (typeof pros === 'string') {
        try {
          pros = JSON.parse(pros);
        } catch {
          pros = [];
        }
      }

      let cons = row.ai_cons;
      if (typeof cons === 'string') {
        try {
          cons = JSON.parse(cons);
        } catch {
          cons = [];
        }
      }

      let icebreakers = row.ai_icebreakers;
      if (typeof icebreakers === 'string') {
        try {
          icebreakers = JSON.parse(icebreakers);
        } catch {
          icebreakers = [];
        }
      }

      const score = Math.round(Number(row.compatibility_score));

      return {
        id: row.match_id,
        candidate_id: row.matched_user_id,
        score,
        compatibility_score: score,
        user: {
          id: row.matched_user_id,
          full_name: row.full_name,
          age: row.age,
          gender: row.gender,
          college_name: row.college_name,
          major: row.major,
          graduation_year: row.graduation_year,
          city: row.city,
          bio: row.bio,
          avatar_url: row.avatar_url,
          sleep_schedule: row.sleep_schedule,
          cleanliness_level: row.cleanliness_level,
          study_habits: row.study_habits,
          noise_level: row.noise_level,
          smoking_preference: row.smoking_preference,
          drinking_preference: row.drinking_preference,
          food_preference: row.food_preference,
          pet_preference: row.pet_preference,
          guest_policy: row.guest_policy,
        },
        explanation: row.ai_summary || '',
        highlights: Array.isArray(pros) ? pros : [],
        watch_out: Array.isArray(cons) && cons.length > 0 ? cons[0] : '',
        score_breakdown: breakdown || {},
        icebreakers: Array.isArray(icebreakers) ? icebreakers : [],
        status: row.status,
        source: row.source || 'fallback',
      };
    });

    const hasEnoughMatches = formattedMatches.length >= 3;
    const message = hasEnoughMatches
      ? null
      : 'Not enough matches yet in your city. Check back soon as more students join!';

    return {
      matches: formattedMatches,
      count: formattedMatches.length,
      shortlist_count: formattedMatches.length,
      has_enough_matches: hasEnoughMatches,
      message,
    };
  }

  // If no cached matches, run runMatching
  return await runMatching(userId);
}

/**
 * Refresh matches for a user (called when user clicks 'Refresh matches').
 *
 * @param {number} userId
 * @returns {Promise<object>}
 */
export async function refreshMatches(userId) {
  return await runMatching(userId);
}

export default {
  calculateCompatibility,
  findEligibleCandidates,
  rankCandidates,
  runMatching,
  generateMatches,
  getCachedMatches,
  refreshMatches,
};


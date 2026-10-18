import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import db from '../db/index.js';
import {
  calculateCompatibility,
  rankCandidates,
  findEligibleCandidates,
  generateMatches,
  getCachedMatches,
} from './matching.service.js';

describe('Matching Engine Service Unit & Logic Tests', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  beforeEach(async () => {
    await db('match_results').del();
    await db('blocks').del();
    await db('requirements').del();
    await db('rate_limit_events').del();
    await db('email_otps').del();
    await db('profiles').del();
    await db('users').del();
  });

  // Helper to create a complete user fixture
  async function createFixtureUser({
    email,
    gender = 'male',
    city = 'Bhopal',
    cleanliness = 4,
    sleep = 'early_bird',
    study = 'silent',
    noise = 'quiet',
    smoking = 'no',
    drinking = 'no',
    food = 'vegetarian',
    budget_min = 7000,
    budget_max = 12000,
    gender_pref = 'same_gender_only',
    clean_min = 3,
    smoking_ok = false,
    drinking_ok = false,
    sleep_pref = 'early_bird',
    food_pref = 'same_as_me',
    verified = true,
    complete = true,
    active_req = true,
    importance_weights = {},
  }) {
    const passwordHash = await bcrypt.hash('TestStudent123!', 4);
    const [userId] = await db('users').insert({
      email,
      password_hash: passwordHash,
      role: 'student',
      email_verified: verified,
      status: 'active',
    });

    await db('profiles').insert({
      user_id: userId,
      full_name: `Student ${userId}`,
      age: 21,
      gender,
      college_name: 'MANIT Bhopal',
      major: 'Computer Science',
      graduation_year: 2026,
      city,
      sleep_schedule: sleep,
      cleanliness_level: cleanliness,
      study_habits: study,
      noise_level: noise,
      smoking_preference: smoking,
      drinking_preference: drinking,
      food_preference: food,
      pet_preference: 'no_pets',
      guest_policy: 'rarely',
      bio: 'Test bio for matching verification',
      profile_completed: complete,
    });

    if (active_req) {
      await db('requirements').insert({
        user_id: userId,
        city,
        budget_min,
        budget_max,
        gender_preference: gender_pref,
        preferred_sleep_schedule: sleep_pref,
        preferred_cleanliness_min: clean_min,
        smoking_ok: smoking_ok ? 1 : 0,
        drinking_ok: drinking_ok ? 1 : 0,
        food_preference: food_pref,
        guests_ok: 'rarely',
        noise_tolerance: 'quiet',
        deal_breakers: null,
        importance_weights: JSON.stringify(importance_weights),
        is_active: 1,
      });
    }

    return userId;
  }

  describe('Deterministic Scoring Algorithm (calculateCompatibility)', () => {
    it('produces high compatibility score (>= 90) and positive highlights for identical lifestyles', () => {
      const requester = {
        profile: {
          full_name: 'Aarav',
          sleep_schedule: 'early_bird',
          cleanliness_level: 4,
          smoking_preference: 'no',
          drinking_preference: 'no',
          food_preference: 'vegetarian',
          study_habits: 'silent',
          noise_level: 'quiet',
          guest_policy: 'rarely',
        },
        requirement: {
          city: 'Bhopal',
          budget_min: 8000,
          budget_max: 12000,
          preferred_sleep_schedule: 'same_as_me',
          preferred_cleanliness_min: 3,
          smoking_ok: false,
          drinking_ok: false,
          food_preference: 'same_as_me',
          guests_ok: 'rarely',
          noise_tolerance: 'quiet',
          importance_weights: {},
        },
      };

      const candidate = {
        profile: {
          full_name: 'Rohan',
          sleep_schedule: 'early_bird',
          cleanliness_level: 4,
          smoking_preference: 'no',
          drinking_preference: 'no',
          food_preference: 'vegetarian',
          study_habits: 'silent',
          noise_level: 'quiet',
          guest_policy: 'rarely',
          college_name: 'MANIT Bhopal',
          major: 'Computer Science',
        },
        requirement: {
          city: 'Bhopal',
          budget_min: 8000,
          budget_max: 12000,
        },
      };

      const result = calculateCompatibility(requester, candidate);

      expect(result.compatibility_score).toBeGreaterThanOrEqual(95);
      expect(result.highlights.length).toBeGreaterThanOrEqual(2);
      expect(result.watch_out).toBe('');
      expect(result.explanation).toContain('Rohan');
      expect(result.icebreakers.length).toBe(2);
      expect(result.score_breakdown.cleanliness).toBe(100);
      expect(result.score_breakdown.sleep).toBe(100);
      expect(result.score_breakdown.smoking).toBe(100);
    });

    it('identifies friction points and outputs watch_out note when sleep schedules clash', () => {
      const requester = {
        profile: {
          full_name: 'Aarav',
          sleep_schedule: 'early_bird',
          cleanliness_level: 4,
          smoking_preference: 'no',
          drinking_preference: 'no',
          food_preference: 'vegetarian',
          study_habits: 'silent',
          noise_level: 'quiet',
        },
        requirement: {
          city: 'Bhopal',
          budget_min: 8000,
          budget_max: 12000,
          preferred_sleep_schedule: 'early_bird',
          smoking_ok: true,
          drinking_ok: true,
          food_preference: 'any',
          guests_ok: 'sometimes',
          noise_tolerance: 'any',
        },
      };

      const candidate = {
        profile: {
          full_name: 'Vikram',
          sleep_schedule: 'night_owl', // clash with early bird
          cleanliness_level: 4,
          smoking_preference: 'no',
          drinking_preference: 'no',
          food_preference: 'vegetarian',
          study_habits: 'silent',
          noise_level: 'quiet',
          college_name: 'MANIT Bhopal',
        },
        requirement: {
          city: 'Bhopal',
          budget_min: 8000,
          budget_max: 12000,
        },
      };

      const result = calculateCompatibility(requester, candidate);

      expect(result.score_breakdown.sleep).toBe(30);
      expect(result.watch_out).toContain('sleep schedules');
    });

    it('respects custom importance weights dynamically shifting final score', () => {
      const requesterHeavyClean = {
        profile: {
          full_name: 'Aarav',
          cleanliness_level: 5,
          sleep_schedule: 'early_bird',
          smoking_preference: 'no',
          drinking_preference: 'no',
        },
        requirement: {
          budget_min: 5000,
          budget_max: 10000,
          preferred_sleep_schedule: 'early_bird',
          importance_weights: {
            cleanliness: 3, // maximum weight on cleanliness
            sleep: 1, // low weight on sleep
          },
        },
      };

      const candidateDifferentCleanliness = {
        profile: {
          full_name: 'Candidate',
          cleanliness_level: 2, // big cleanliness gap
          sleep_schedule: 'early_bird', // perfect sleep match
          smoking_preference: 'no',
          drinking_preference: 'no',
        },
        requirement: {
          budget_min: 5000,
          budget_max: 10000,
        },
      };

      const resultHighWeight = calculateCompatibility(requesterHeavyClean, candidateDifferentCleanliness);
      
      const requesterLowClean = {
        ...requesterHeavyClean,
        requirement: {
          ...requesterHeavyClean.requirement,
          importance_weights: {
            cleanliness: 1, // low weight on cleanliness
            sleep: 3, // high weight on sleep (which is 100)
          },
        },
      };
      const resultLowWeight = calculateCompatibility(requesterLowClean, candidateDifferentCleanliness);

      expect(resultHighWeight.score_breakdown.cleanliness).toBe(35);
      // Higher weight on the low dimension (cleanliness) lowers the overall score
      expect(resultHighWeight.compatibility_score).toBeLessThan(resultLowWeight.compatibility_score);
    });
  });


  describe('Candidate Ranking and Shortlisting (rankCandidates)', () => {
    it('sorts candidates descending by compatibility score and limits shortlist to 15', () => {
      const requester = {
        profile: {
          cleanliness_level: 4,
          sleep_schedule: 'early_bird',
          smoking_preference: 'no',
          drinking_preference: 'no',
          food_preference: 'vegetarian',
        },
        requirement: {
          budget_min: 6000,
          budget_max: 12000,
          preferred_sleep_schedule: 'early_bird',
          importance_weights: {},
        },
      };

      // Create 20 mock candidates with varied cleanliness
      const mockCandidates = Array.from({ length: 20 }, (_, idx) => ({
        candidate_user_id: idx + 1,
        full_name: `Candidate ${idx + 1}`,
        cleanliness_level: (idx % 4) + 1,
        sleep_schedule: idx % 2 === 0 ? 'early_bird' : 'night_owl',
        smoking_preference: 'no',
        drinking_preference: 'no',
        food_preference: 'vegetarian',
        budget_min: 6000,
        budget_max: 12000,
        preferred_cleanliness_min: 1,
      }));

      const { shortlist, topMatches } = rankCandidates(requester, mockCandidates);

      expect(shortlist).toHaveLength(15);
      expect(topMatches).toHaveLength(3);

      // Verify descending order
      for (let i = 0; i < shortlist.length - 1; i++) {
        expect(shortlist[i].compatibility_score).toBeGreaterThanOrEqual(
          shortlist[i + 1].compatibility_score
        );
      }
    });
  });

  describe('Hard Filters Integration (findEligibleCandidates)', () => {
    it('excludes candidate if cities do not match', async () => {
      const reqUser = await createFixtureUser({ email: 'req@college.test', city: 'Bhopal' });
      const candUser = await createFixtureUser({ email: 'cand@college.test', city: 'Indore' });

      const reqProfile = await db('profiles').where({ user_id: reqUser }).first();
      const reqReq = await db('requirements').where({ user_id: reqUser, is_active: 1 }).first();

      const candidates = await findEligibleCandidates(reqUser, reqReq, reqProfile);
      const candIds = candidates.map((c) => c.candidate_user_id);

      expect(candIds).not.toContain(candUser);
    });

    it('excludes candidate if budget ranges do not overlap', async () => {
      const reqUser = await createFixtureUser({
        email: 'req@college.test',
        budget_min: 5000,
        budget_max: 8000,
      });
      const candUser = await createFixtureUser({
        email: 'cand@college.test',
        budget_min: 10000,
        budget_max: 15000,
      });

      const reqProfile = await db('profiles').where({ user_id: reqUser }).first();
      const reqReq = await db('requirements').where({ user_id: reqUser, is_active: 1 }).first();

      const candidates = await findEligibleCandidates(reqUser, reqReq, reqProfile);
      const candIds = candidates.map((c) => c.candidate_user_id);

      expect(candIds).not.toContain(candUser);
    });

    it('enforces mutual gender compatibility when either side specifies same_gender_only', async () => {
      const maleRequester = await createFixtureUser({
        email: 'male_req@college.test',
        gender: 'male',
        gender_pref: 'same_gender_only',
      });
      const femaleCandidate = await createFixtureUser({
        email: 'female_cand@college.test',
        gender: 'female',
        gender_pref: 'any',
      });
      const maleCandidate = await createFixtureUser({
        email: 'male_cand@college.test',
        gender: 'male',
        gender_pref: 'any',
      });

      const reqProfile = await db('profiles').where({ user_id: maleRequester }).first();
      const reqReq = await db('requirements').where({ user_id: maleRequester, is_active: 1 }).first();

      const candidates = await findEligibleCandidates(maleRequester, reqReq, reqProfile);
      const candIds = candidates.map((c) => c.candidate_user_id);

      expect(candIds).not.toContain(femaleCandidate);
      expect(candIds).toContain(maleCandidate);
    });

    it('excludes candidate when requester requires non-smoker (smoking_ok = false)', async () => {
      const reqUser = await createFixtureUser({
        email: 'nonsmoker_req@college.test',
        smoking: 'no',
        smoking_ok: false,
      });
      const smokerCandidate = await createFixtureUser({
        email: 'smoker_cand@college.test',
        smoking: 'outside_only',
        smoking_ok: true,
      });
      const cleanCandidate = await createFixtureUser({
        email: 'clean_cand@college.test',
        smoking: 'no',
        smoking_ok: false,
      });

      const reqProfile = await db('profiles').where({ user_id: reqUser }).first();
      const reqReq = await db('requirements').where({ user_id: reqUser, is_active: 1 }).first();

      const candidates = await findEligibleCandidates(reqUser, reqReq, reqProfile);
      const candIds = candidates.map((c) => c.candidate_user_id);

      expect(candIds).not.toContain(smokerCandidate);
      expect(candIds).toContain(cleanCandidate);
    });

    it('excludes candidate if cleanliness is below requester preferred minimum', async () => {
      const reqUser = await createFixtureUser({
        email: 'neat_req@college.test',
        cleanliness: 5,
        clean_min: 4, // requires at least 4
      });
      const messyCandidate = await createFixtureUser({
        email: 'messy_cand@college.test',
        cleanliness: 2, // only 2
      });
      const neatCandidate = await createFixtureUser({
        email: 'neat_cand@college.test',
        cleanliness: 4,
      });

      const reqProfile = await db('profiles').where({ user_id: reqUser }).first();
      const reqReq = await db('requirements').where({ user_id: reqUser, is_active: 1 }).first();

      const candidates = await findEligibleCandidates(reqUser, reqReq, reqProfile);
      const candIds = candidates.map((c) => c.candidate_user_id);

      expect(candIds).not.toContain(messyCandidate);
      expect(candIds).toContain(neatCandidate);
    });

    it('excludes blocked candidates in both directions (requester blocked candidate OR candidate blocked requester)', async () => {
      const reqUser = await createFixtureUser({ email: 'req_block@college.test' });
      const blockedCandidate = await createFixtureUser({ email: 'blocked_cand@college.test' });
      const blockerCandidate = await createFixtureUser({ email: 'blocker_cand@college.test' });

      // Requester blocks candidate 1
      await db('blocks').insert({
        blocker_id: reqUser,
        blocked_id: blockedCandidate,
      });

      // Candidate 2 blocks requester
      await db('blocks').insert({
        blocker_id: blockerCandidate,
        blocked_id: reqUser,
      });

      const reqProfile = await db('profiles').where({ user_id: reqUser }).first();
      const reqReq = await db('requirements').where({ user_id: reqUser, is_active: 1 }).first();

      const candidates = await findEligibleCandidates(reqUser, reqReq, reqProfile);
      const candIds = candidates.map((c) => c.candidate_user_id);

      expect(candIds).not.toContain(blockedCandidate);
      expect(candIds).not.toContain(blockerCandidate);
    });

  });

  describe('End-to-End Matching Generation and Caching (generateMatches & getCachedMatches)', () => {
    it('generates matches and caches top 3 into match_results table', async () => {
      const reqUser = await createFixtureUser({ email: 'primary_student@college.test' });

      // Create 5 compatible candidates
      for (let i = 1; i <= 5; i++) {
        await createFixtureUser({
          email: `compat_${i}@college.test`,
          cleanliness: 3 + (i % 2),
        });
      }

      const generated = await generateMatches(reqUser);
      expect(generated.matches).toHaveLength(3);
      expect(generated.count).toBe(3);
      expect(generated.has_enough_matches).toBe(true);

      // Verify records are saved in match_results table
      const cachedRows = await db('match_results').where({ user_id: reqUser });
      expect(cachedRows).toHaveLength(3);
      expect(cachedRows[0].status).toBe('suggested');

      // Verify getCachedMatches returns the cached records cleanly
      const cached = await getCachedMatches(reqUser);
      expect(cached.matches).toHaveLength(3);
      expect(cached.matches[0].user.full_name).toBeDefined();
    });

    it('returns empty message if fewer than 3 matches survive', async () => {
      const reqUser = await createFixtureUser({ email: 'lonely_student@college.test' });
      // Only 1 compatible candidate
      await createFixtureUser({ email: 'only_one@college.test' });

      const generated = await generateMatches(reqUser);
      expect(generated.count).toBe(1);
      expect(generated.has_enough_matches).toBe(false);
      expect(generated.message).toMatch(/Not enough matches yet/i);
    });
  });
});

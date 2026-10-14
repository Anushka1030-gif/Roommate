import db from '../db/index.js';

export const DEFAULT_IMPORTANCE_WEIGHTS = {
  cleanliness: 2,
  sleep: 2,
  smoking: 2,
  drinking: 2,
  food: 2,
  guests: 2,
  noise: 2,
  social: 2,
};

/**
 * Format a requirement database row into a standardized response shape.
 */
export function formatRequirement(req) {
  if (!req) return null;

  let weights = req.importance_weights;
  if (typeof weights === 'string') {
    try {
      weights = JSON.parse(weights);
    } catch {
      weights = null;
    }
  }

  // Ensure default importance weights if not specified or empty
  const formattedWeights = weights && typeof weights === 'object' && Object.keys(weights).length > 0
    ? { ...DEFAULT_IMPORTANCE_WEIGHTS, ...weights }
    : { ...DEFAULT_IMPORTANCE_WEIGHTS };

  return {
    id: req.id,
    user_id: req.user_id,
    city: req.city,
    budget_min: Number(req.budget_min),
    budget_max: Number(req.budget_max),
    move_in_date: req.move_in_date
      ? typeof req.move_in_date === 'string'
        ? req.move_in_date.slice(0, 10)
        : new Date(req.move_in_date).toISOString().slice(0, 10)
      : null,
    gender_preference: req.gender_preference || 'any',
    preferred_sleep_schedule: req.preferred_sleep_schedule || 'any',
    preferred_cleanliness_min: Number(req.preferred_cleanliness_min ?? 1),
    smoking_ok: Boolean(req.smoking_ok),
    drinking_ok: Boolean(req.drinking_ok),
    food_preference: req.food_preference || 'any',
    guests_ok: req.guests_ok || 'sometimes',
    noise_tolerance: req.noise_tolerance || 'any',
    deal_breakers: req.deal_breakers || null,
    importance_weights: formattedWeights,
    is_active: Boolean(req.is_active),
    created_at: req.created_at,
  };
}

/**
 * Hook placeholder for Step 7: Matching Engine
 * @param {number} userId
 * @param {number} requirementId
 */
export async function triggerMatchingHook(userId, requirementId) {
  // TODO (Step 7): Trigger matching engine algorithm:
  // 1. Run hard filters across active profiles in the same city with overlapping budget
  // 2. Compute deterministic compatibility pre-scores using importance_weights
  // 3. Invoke LLM ranking service for top candidate explanations
  // 4. Cache results into match_results table
  return { triggered: true, requirementId, userId };
}

/**
 * Get active requirement for a user.
 * @param {number} userId
 */
export async function getActiveRequirement(userId) {
  const requirement = await db('requirements')
    .where({ user_id: userId, is_active: 1 })
    .orderBy('id', 'desc')
    .first();

  return formatRequirement(requirement);
}

/**
 * Create a new requirement for a user, archiving any previous active requirements.
 * Ensures in a single transaction that the user never has more than one active requirement.
 *
 * @param {number} userId
 * @param {object} data
 */
export async function createRequirement(userId, data) {
  // Determine city: default to profile city if not provided
  let city = data.city ? data.city.trim() : null;
  if (!city) {
    const profile = await db('profiles').where({ user_id: userId }).first();
    city = profile?.city || 'Bhopal';
  }

  const importanceWeights = data.importance_weights && Object.keys(data.importance_weights).length > 0
    ? data.importance_weights
    : DEFAULT_IMPORTANCE_WEIGHTS;

  let newRequirementId;

  await db.transaction(async (trx) => {
    // In a single transaction: set is_active=0 on previous active requirements
    await trx('requirements')
      .where({ user_id: userId, is_active: 1 })
      .update({ is_active: 0 });

    // Insert new requirement with is_active=1
    const [insertedId] = await trx('requirements').insert({
      user_id: userId,
      city,
      budget_min: data.budget_min,
      budget_max: data.budget_max,
      move_in_date: data.move_in_date || null,
      gender_preference: data.gender_preference,
      preferred_sleep_schedule: data.preferred_sleep_schedule || 'any',
      preferred_cleanliness_min: data.preferred_cleanliness_min ?? 1,
      smoking_ok: data.smoking_ok ? 1 : 0,
      drinking_ok: data.drinking_ok ? 1 : 0,
      food_preference: data.food_preference || 'any',
      guests_ok: data.guests_ok,
      noise_tolerance: data.noise_tolerance || 'any',
      deal_breakers: data.deal_breakers ? data.deal_breakers.trim() : null,
      importance_weights: JSON.stringify(importanceWeights),
      is_active: 1,
    });

    newRequirementId = insertedId;
  });

  const createdRequirement = await db('requirements').where({ id: newRequirementId }).first();

  // TODO (Step 7): Trigger matching engine hook
  await triggerMatchingHook(userId, newRequirementId);

  return formatRequirement(createdRequirement);
}

export default {
  DEFAULT_IMPORTANCE_WEIGHTS,
  formatRequirement,
  triggerMatchingHook,
  getActiveRequirement,
  createRequirement,
};

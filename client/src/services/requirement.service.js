import api from './api.js';

/**
 * Fetch the current user's active requirement.
 * @returns {Promise<object|null>}
 */
export async function getActiveRequirement() {
  const response = await api.get('/requirements/active');
  return response.data?.requirement || null;
}

/**
 * Submit or update the user's requirements.
 * Creates an active requirement and archives the previous one.
 * @param {object} requirementData
 * @returns {Promise<object>}
 */
export async function createRequirement(requirementData) {
  const response = await api.post('/requirements', requirementData);
  return response.data;
}

export default {
  getActiveRequirement,
  createRequirement,
};

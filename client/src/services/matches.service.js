import api from './api.js';

/**
 * Fetch matches for the authenticated student's active requirement.
 * Supports optional status filtering ('suggested', 'liked', 'skipped', 'connected', or 'all').
 *
 * @param {string|null} status
 * @returns {Promise<object>} { matches, count, shortlist_count, has_enough_matches, message }
 */
export async function getMatches(status = null) {
  const params = {};
  if (status && status !== 'all') {
    params.status = status;
  }
  const response = await api.get('/matches', { params });
  return response.data;
}

/**
 * Trigger forced recalculation of matches (rate limited to 5/day).
 *
 * @returns {Promise<object>} { matches, count, shortlist_count, has_enough_matches, message }
 */
export async function refreshMatches() {
  const response = await api.post('/matches/refresh');
  return response.data;
}

/**
 * Update the status of a match result (e.g. liked, skipped, connected, suggested).
 *
 * @param {number|string} matchId
 * @param {'suggested'|'liked'|'skipped'|'connected'} status
 * @returns {Promise<object>} { success, match_id, candidate_id, status }
 */
export async function updateMatchStatus(matchId, status) {
  const response = await api.patch(`/matches/${matchId}/status`, { status });
  return response.data;
}

export default {
  getMatches,
  refreshMatches,
  updateMatchStatus,
};

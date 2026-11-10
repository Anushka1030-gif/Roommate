import db from '../db/index.js';

const DAILY_REPORT_LIMIT = 10;

/**
 * Submit an incident report against another user.
 *
 * @param {number} reporterId
 * @param {number} reportedUserId
 * @param {string} reason
 * @param {string|null} details
 * @returns {Promise<object>}
 */
export async function createReport(reporterId, reportedUserId, reason, details = null) {
  const currentUserId = Number(reporterId);
  const targetUserId = Number(reportedUserId);

  if (!targetUserId || isNaN(targetUserId)) {
    const error = new Error('Invalid reported user ID');
    error.statusCode = 400;
    error.code = 'INVALID_USER_ID';
    throw error;
  }

  if (currentUserId === targetUserId) {
    const error = new Error('You cannot report yourself');
    error.statusCode = 400;
    error.code = 'CANNOT_REPORT_SELF';
    throw error;
  }

  // Check if reported user exists
  const targetUser = await db('users').where({ id: targetUserId }).first();
  if (!targetUser) {
    const error = new Error('Reported user not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  // Enforce rate limit: max 10 reports per day per user (last 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const reportCountRow = await db('reports')
    .where('reporter_id', currentUserId)
    .where('created_at', '>=', twentyFourHoursAgo)
    .count('id as count')
    .first();

  const dailyCount = Number(reportCountRow?.count || 0);
  if (dailyCount >= DAILY_REPORT_LIMIT) {
    const error = new Error(`Daily report limit reached (maximum ${DAILY_REPORT_LIMIT} reports per day). Please try again later.`);
    error.statusCode = 429;
    error.code = 'REPORT_LIMIT_EXCEEDED';
    throw error;
  }

  const [reportId] = await db('reports').insert({
    reporter_id: currentUserId,
    reported_id: targetUserId,
    reason,
    details: details?.trim() || null,
    status: 'pending',
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  });

  return {
    success: true,
    message: 'Report submitted successfully. Our safety moderation team will review it.',
    report_id: reportId,
    reported_user_id: targetUserId,
    status: 'pending',
  };
}

export default {
  createReport,
  DAILY_REPORT_LIMIT,
};


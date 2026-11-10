import db from '../db/index.js';
import mailService from './mail.service.js';
import { getIO } from '../sockets/chat.socket.js';

/**
 * Fetch reports for admin moderation with reporter and reported user details.
 *
 * @param {string} statusFilter - 'open' | 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'all'
 * @returns {Promise<Array<object>>}
 */
export async function getReports(statusFilter = 'open') {
  let query = db('reports as r')
    .join('users as reporter', 'r.reporter_id', 'reporter.id')
    .leftJoin('profiles as reporter_profile', 'reporter.id', 'reporter_profile.user_id')
    .join('users as reported', 'r.reported_id', 'reported.id')
    .leftJoin('profiles as reported_profile', 'reported.id', 'reported_profile.user_id');

  if (statusFilter === 'open') {
    query = query.whereIn('r.status', ['pending', 'reviewed']);
  } else if (statusFilter && statusFilter !== 'all') {
    query = query.where('r.status', statusFilter);
  }

  // Count subquery for total reports against this reported user
  const countSubquery = db('reports as r_sub')
    .whereRaw('r_sub.reported_id = r.reported_id')
    .count('r_sub.id');

  const reportRows = await query
    .select(
      'r.id',
      'r.reporter_id',
      'r.reported_id',
      'r.reason',
      'r.details',
      'r.status',
      'r.admin_note',
      'r.reviewed_by',
      'r.reviewed_at',
      'r.created_at',
      'r.updated_at',
      'reporter.email as reporter_email',
      'reporter_profile.full_name as reporter_name',
      'reported.email as reported_email',
      'reported.status as reported_status',
      'reported_profile.full_name as reported_name',
      countSubquery.as('reported_user_total_reports')
    )
    .orderBy('r.created_at', 'desc');

  return reportRows.map((row) => ({
    id: row.id,
    reporter: {
      id: row.reporter_id,
      full_name: row.reporter_name || 'Student Reporter',
      email: row.reporter_email,
    },
    reported_user: {
      id: row.reported_id,
      full_name: row.reported_name || 'Student Candidate',
      email: row.reported_email,
      status: row.reported_status,
      total_reports_count: Number(row.reported_user_total_reports || 1),
    },
    reason: row.reason,
    details: row.details,
    status: row.status,
    admin_note: row.admin_note || null,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
  }));
}

/**
 * Handle moderation action on a report: dismiss, warn, or suspend.
 *
 * @param {number} adminUserId
 * @param {number|string} reportId
 * @param {'dismiss'|'warn'|'suspend'} action
 * @param {string|null} note
 * @returns {Promise<object>}
 */
export async function handleReportAction(adminUserId, reportId, action, note = null) {
  const currentAdminId = Number(adminUserId);
  const targetReportId = Number(reportId);

  const report = await db('reports').where({ id: targetReportId }).first();
  if (!report) {
    const error = new Error('Report not found');
    error.statusCode = 404;
    error.code = 'REPORT_NOT_FOUND';
    throw error;
  }

  const trimmedNote = typeof note === 'string' ? note.trim() : null;

  if (action === 'dismiss') {
    await db('reports')
      .where({ id: targetReportId })
      .update({
        status: 'dismissed',
        admin_note: trimmedNote,
        reviewed_by: currentAdminId,
        reviewed_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    return {
      success: true,
      message: 'Report dismissed successfully.',
      report_id: targetReportId,
      action: 'dismiss',
      status: 'dismissed',
    };
  }

  if (action === 'warn') {
    await db('reports')
      .where({ id: targetReportId })
      .update({
        status: 'reviewed',
        admin_note: trimmedNote,
        reviewed_by: currentAdminId,
        reviewed_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    // Optionally send warning notification email to reported user
    try {
      const reportedUser = await db('users').where({ id: report.reported_id }).first();
      const reportedProfile = await db('profiles').where({ user_id: report.reported_id }).first();

      if (reportedUser?.email) {
        mailService
          .sendWarningEmail({
            to: reportedUser.email,
            recipientName: reportedProfile?.full_name || 'Roommate',
            note: trimmedNote || 'Please adhere to our community guidelines.',
          })
          .catch((mailErr) => {
            console.error('Failed to dispatch warning email:', mailErr?.message || mailErr);
          });
      }
    } catch (err) {
      console.error('Error fetching reported user for warning email:', err?.message || err);
    }

    return {
      success: true,
      message: 'Warning recorded and notification sent to user.',
      report_id: targetReportId,
      action: 'warn',
      status: 'reviewed',
    };
  }

  if (action === 'suspend') {
    // 1. Update report status to resolved with admin note
    await db('reports')
      .where({ id: targetReportId })
      .update({
        status: 'resolved',
        admin_note: trimmedNote,
        reviewed_by: currentAdminId,
        reviewed_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    // 2. Set reported user status = 'suspended'
    await db('users')
      .where({ id: report.reported_id })
      .update({
        status: 'suspended',
        updated_at: db.fn.now(),
      });

    // 3. Forcibly disconnect any live socket connections for the suspended user
    const io = getIO();
    if (io) {
      try {
        io.in(`user_${report.reported_id}`).disconnectSockets(true);
      } catch (socketErr) {
        console.error('Failed to disconnect suspended user sockets:', socketErr?.message || socketErr);
      }
    }

    return {
      success: true,
      message: 'User suspended successfully and all active sessions terminated.',
      report_id: targetReportId,
      action: 'suspend',
      status: 'resolved',
      suspended_user_id: report.reported_id,
    };
  }

  const error = new Error('Invalid action. Must be one of: dismiss, warn, suspend');
  error.statusCode = 400;
  error.code = 'INVALID_ACTION';
  throw error;
}

/**
 * Get system-wide platform statistics.
 *
 * @returns {Promise<object>}
 */
export async function getStats() {
  const [
    totalUsersRow,
    verifiedUsersRow,
    completedProfilesRow,
    activeRequirementsRow,
    conversationsRow,
    contactSharesRow,
    confirmedRoommatesRow,
  ] = await Promise.all([
    db('users').count('id as count').first(),
    db('users').where({ email_verified: 1 }).count('id as count').first(),
    db('profiles').where({ profile_completed: 1 }).count('id as count').first(),
    db('requirements').where({ is_active: 1 }).count('id as count').first(),
    db('conversations').count('id as count').first(),
    db('conversations')
      .where({ a_shares_contact: 1, b_shares_contact: 1 })
      .count('id as count')
      .first(),
    db('conversations')
      .where(function () {
        this.where('roommate_status', 'confirmed').orWhere(function () {
          this.where({ a_confirmed_roommates: 1, b_confirmed_roommates: 1 });
        });
      })
      .count('id as count')
      .first(),
  ]);

  const totalUsers = Number(totalUsersRow?.count || 0);
  const verifiedUsers = Number(verifiedUsersRow?.count || 0);
  const completedProfiles = Number(completedProfilesRow?.count || 0);
  const activeRequirements = Number(activeRequirementsRow?.count || 0);
  const conversations = Number(conversationsRow?.count || 0);
  const contactShares = Number(contactSharesRow?.count || 0);
  const confirmedRoommates = Number(confirmedRoommatesRow?.count || 0);

  return {
    total_users: totalUsers,
    verified_users: verifiedUsers,
    completed_profiles: completedProfiles,
    active_requirements: activeRequirements,
    conversations,
    contact_share_agreements: contactShares,
    contact_shares: contactShares,
    confirmed_roommate_pairs: confirmedRoommates,
    confirmed_roommates: confirmedRoommates,
  };
}

export default {
  getReports,
  handleReportAction,
  getStats,
};


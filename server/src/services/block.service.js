import db from '../db/index.js';
import { getIO } from '../sockets/chat.socket.js';

/**
 * Block a user.
 * Effects:
 * - Inserts a record into `blocks` table
 * - Deletes cached `match_results` in both directions so neither user appears in matches
 * - Emits real-time `conversation_blocked` socket event if conversation exists
 *
 * @param {number} blockerId
 * @param {number} blockedId
 * @param {string|null} reason
 * @returns {Promise<object>}
 */
export async function blockUser(blockerId, blockedId, reason = null) {
  const currentUserId = Number(blockerId);
  const targetUserId = Number(blockedId);

  if (!targetUserId || isNaN(targetUserId)) {
    const error = new Error('Invalid user ID to block');
    error.statusCode = 400;
    error.code = 'INVALID_USER_ID';
    throw error;
  }

  if (currentUserId === targetUserId) {
    const error = new Error('You cannot block yourself');
    error.statusCode = 400;
    error.code = 'CANNOT_BLOCK_SELF';
    throw error;
  }

  // Check if target user exists
  const targetUser = await db('users').where({ id: targetUserId }).first();
  if (!targetUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  // Check if already blocked by current user
  const existingBlock = await db('blocks')
    .where({ blocker_id: currentUserId, blocked_id: targetUserId })
    .first();

  let blockId;
  if (existingBlock) {
    blockId = existingBlock.id;
  } else {
    const [insertedId] = await db('blocks').insert({
      blocker_id: currentUserId,
      blocked_id: targetUserId,
      reason: reason || null,
      created_at: db.fn.now(),
    });
    blockId = insertedId;
  }

  // Remove both users from each other's cached match_results
  await db('match_results')
    .where(function () {
      this.where({ user_id: currentUserId, matched_user_id: targetUserId })
        .orWhere({ user_id: targetUserId, matched_user_id: currentUserId });
    })
    .del();

  // If a conversation exists between them, emit conversation_blocked event
  const userAId = Math.min(currentUserId, targetUserId);
  const userBId = Math.max(currentUserId, targetUserId);
  const conv = await db('conversations')
    .where({ user_a_id: userAId, user_b_id: userBId })
    .first();

  const io = getIO();
  if (io && conv) {
    io.to(`conversation_${conv.id}`).emit('conversation_blocked', {
      conversation_id: conv.id,
      blocked_by: currentUserId,
      is_blocked: true,
    });
    io.to(`user_${currentUserId}`).emit('conversation_blocked', {
      conversation_id: conv.id,
      blocked_by: currentUserId,
      is_blocked: true,
    });
    io.to(`user_${targetUserId}`).emit('conversation_blocked', {
      conversation_id: conv.id,
      blocked_by: currentUserId,
      is_blocked: true,
    });
  }

  return {
    success: true,
    message: 'User blocked successfully',
    block_id: blockId,
    blocked_user_id: targetUserId,
  };
}

/**
 * Unblock a user.
 * Effects:
 * - Deletes the record from `blocks` table
 * - Restores conversation access (if no reverse block exists)
 * - Does NOT re-add to matches until matching engine runs again
 *
 * @param {number} blockerId
 * @param {number} blockedId
 * @returns {Promise<object>}
 */
export async function unblockUser(blockerId, blockedId) {
  const currentUserId = Number(blockerId);
  const targetUserId = Number(blockedId);

  if (!targetUserId || isNaN(targetUserId)) {
    const error = new Error('Invalid user ID to unblock');
    error.statusCode = 400;
    error.code = 'INVALID_USER_ID';
    throw error;
  }

  const blockRecord = await db('blocks')
    .where({ blocker_id: currentUserId, blocked_id: targetUserId })
    .first();

  if (!blockRecord) {
    const error = new Error('Block record not found');
    error.statusCode = 404;
    error.code = 'BLOCK_NOT_FOUND';
    throw error;
  }

  await db('blocks')
    .where({ blocker_id: currentUserId, blocked_id: targetUserId })
    .del();

  // Check if reverse block still exists
  const reverseBlock = await db('blocks')
    .where({ blocker_id: targetUserId, blocked_id: currentUserId })
    .first();

  const isStillBlocked = Boolean(reverseBlock);

  // If conversation exists and is now fully unblocked, notify real-time clients
  const userAId = Math.min(currentUserId, targetUserId);
  const userBId = Math.max(currentUserId, targetUserId);
  const conv = await db('conversations')
    .where({ user_a_id: userAId, user_b_id: userBId })
    .first();

  const io = getIO();
  if (io && conv) {
    io.to(`conversation_${conv.id}`).emit('conversation_unblocked', {
      conversation_id: conv.id,
      is_blocked: isStillBlocked,
    });
    io.to(`user_${currentUserId}`).emit('conversation_unblocked', {
      conversation_id: conv.id,
      is_blocked: isStillBlocked,
    });
    io.to(`user_${targetUserId}`).emit('conversation_unblocked', {
      conversation_id: conv.id,
      is_blocked: isStillBlocked,
    });
  }

  return {
    success: true,
    message: 'User unblocked successfully',
    unblocked_user_id: targetUserId,
  };
}

/**
 * List the users blocked by the caller, showing display names and avatars only.
 * Strict Privacy: Never returns email, phone, or password hash.
 *
 * @param {number} userId
 * @returns {Promise<Array<object>>}
 */
export async function getBlockedUsers(userId) {
  const currentUserId = Number(userId);

  const blockedRows = await db('blocks')
    .leftJoin('profiles', 'blocks.blocked_id', 'profiles.user_id')
    .where('blocks.blocker_id', currentUserId)
    .orderBy('blocks.created_at', 'desc')
    .select(
      'blocks.id as block_id',
      'blocks.blocked_id as blocked_user_id',
      db.raw('COALESCE(profiles.full_name, "Student Roommate") as display_name'),
      'profiles.avatar_url',
      'blocks.created_at'
    );

  return blockedRows.map((row) => ({
    block_id: row.block_id,
    blocked_user_id: row.blocked_user_id,
    display_name: row.display_name,
    avatar_url: row.avatar_url || null,
    created_at: row.created_at,
  }));
}

export default {
  blockUser,
  unblockUser,
  getBlockedUsers,
};


import bcrypt from 'bcrypt';
import db from '../db/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { getIO } from '../sockets/chat.socket.js';

/**
 * Change account password with verification of the current password.
 *
 * @param {number} userId
 * @param {object} params
 * @param {string} params.current_password
 * @param {string} params.new_password
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function changePassword(userId, { current_password, new_password }) {
  const user = await db('users').where({ id: userId }).first();
  if (!user || user.status === 'deactivated') {
    throw new NotFoundError('User account not found.', 'USER_NOT_FOUND');
  }

  const isCurrentValid = await bcrypt.compare(current_password, user.password_hash);
  if (!isCurrentValid) {
    throw new BadRequestError('Current password is incorrect.', 'INVALID_PASSWORD');
  }

  if (current_password === new_password) {
    throw new BadRequestError(
      'New password must be different from current password.',
      'SAME_PASSWORD'
    );
  }

  const newHash = await bcrypt.hash(new_password, 10);
  await db('users')
    .where({ id: userId })
    .update({
      password_hash: newHash,
      updated_at: db.fn.now(),
    });

  return {
    success: true,
    message: 'Password changed successfully.',
  };
}

/**
 * Anonymize and deactivate account.
 * Removes profile, requirements, match results, and replaces sent messages content with '[deleted]'.
 * Blanks email to a unique deleted placeholder, terminates active socket connections, and sets status to 'deactivated'.
 *
 * @param {number} userId
 * @param {object} params
 * @param {string} params.password
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function deleteAccount(userId, { password }) {
  const user = await db('users').where({ id: userId }).first();
  if (!user || user.status === 'deactivated') {
    throw new NotFoundError('User account not found.', 'USER_NOT_FOUND');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new BadRequestError(
      'Incorrect password. Please verify your password to delete your account.',
      'INVALID_PASSWORD'
    );
  }

  const deletedPlaceholderEmail = `deleted_${userId}_${Date.now()}@deleted.invalid`;

  await db.transaction(async (trx) => {
    // 1. Anonymize messages content sent by user
    await trx('messages')
      .where({ sender_id: userId })
      .update({ content: '[deleted]' });

    // 2. Remove match results involving this user
    await trx('match_results')
      .where({ user_id: userId })
      .orWhere({ matched_user_id: userId })
      .del();

    // 3. Remove housing requirements
    await trx('requirements')
      .where({ user_id: userId })
      .del();

    // 4. Remove student profile
    await trx('profiles')
      .where({ user_id: userId })
      .del();

    // 5. Remove blocks involving user
    await trx('blocks')
      .where({ blocker_id: userId })
      .orWhere({ blocked_id: userId })
      .del();

    // 6. Remove any active unconsumed OTPs
    await trx('email_otps')
      .where({ email: user.email })
      .del();

    // 7. Blank email to unique deleted placeholder and mark status deactivated
    await trx('users')
      .where({ id: userId })
      .update({
        email: deletedPlaceholderEmail,
        password_hash: 'DELETED',
        status: 'deactivated',
        phone: null,
        email_verified: 0,
        updated_at: trx.fn.now(),
      });
  });

  // 8. Terminate active socket connections if any
  try {
    const io = getIO();
    if (io) {
      io.in(`user_${userId}`).disconnectSockets(true);
    }
  } catch {
    // Sockets might not be initialized in non-socket testing environments
  }

  return {
    success: true,
    message: 'Your account has been permanently deactivated and data removed.',
  };
}

export default {
  changePassword,
  deleteAccount,
};


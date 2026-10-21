import db from '../db/index.js';
import mailService from './mail.service.js';

/**
 * Format a conversation record with the other participant's profile and last message.
 */
export async function formatConversation(userId, conv) {
  if (!conv) return null;

  const otherUserId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id;

  // Fetch other user's profile (Strict Privacy: no email, phone, or password_hash)
  const otherProfile = await db('profiles')
    .where({ user_id: otherUserId })
    .first();

  // Fetch block status
  const blockRecord = await db('blocks')
    .where((builder) => {
      builder
        .where({ blocker_id: userId, blocked_id: otherUserId })
        .orWhere({ blocker_id: otherUserId, blocked_id: userId });
    })
    .first();

  // Fetch latest message
  const lastMessage = await db('messages')
    .where({ conversation_id: conv.id })
    .orderBy('id', 'desc')
    .first();

  // Count unread messages sent to this user
  const unreadRow = await db('messages')
    .where({ conversation_id: conv.id, is_read: 0 })
    .whereNot({ sender_id: userId })
    .count('id as unread_count')
    .first();

  const unreadCount = Number(unreadRow?.unread_count || 0);

  const contactRevealed = Boolean(
    conv.contact_revealed_by_a && conv.contact_revealed_by_b
  );

  return {
    id: conv.id,
    user_a_id: conv.user_a_id,
    user_b_id: conv.user_b_id,
    other_user: {
      id: otherUserId,
      full_name: otherProfile?.full_name || 'Student Roommate',
      age: otherProfile?.age || null,
      gender: otherProfile?.gender || null,
      college_name: otherProfile?.college_name || null,
      major: otherProfile?.major || null,
      city: otherProfile?.city || 'Bhopal',
      avatar_url: otherProfile?.avatar_url || null,
    },
    last_message: lastMessage
      ? {
          id: lastMessage.id,
          sender_id: lastMessage.sender_id,
          content: lastMessage.content,
          is_read: Boolean(lastMessage.is_read),
          created_at: lastMessage.created_at,
        }
      : null,
    unread_count: unreadCount,
    last_message_at: conv.last_message_at || conv.created_at,
    roommate_status: conv.roommate_status || 'none',
    contact_revealed: contactRevealed,
    contact_revealed_by_me: Boolean(
      conv.user_a_id === userId ? conv.contact_revealed_by_a : conv.contact_revealed_by_b
    ),
    contact_revealed_by_other: Boolean(
      conv.user_a_id === userId ? conv.contact_revealed_by_b : conv.contact_revealed_by_a
    ),
    is_blocked: Boolean(blockRecord),
    blocked_by_me: blockRecord ? blockRecord.blocker_id === userId : false,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
  };
}

/**
 * Create a new conversation between two users or return existing one.
 * Stores pairs ordered: user_a_id < user_b_id.
 *
 * @param {number} userId
 * @param {number} candidateUserId
 * @returns {Promise<object>}
 */
export async function getOrCreateConversation(userId, candidateUserId) {
  const currentUserId = Number(userId);
  const targetUserId = Number(candidateUserId);

  if (!targetUserId || isNaN(targetUserId)) {
    const error = new Error('Candidate user ID is required and must be a number');
    error.statusCode = 400;
    error.code = 'INVALID_CANDIDATE_ID';
    throw error;
  }

  if (currentUserId === targetUserId) {
    const error = new Error('Cannot start a conversation with yourself');
    error.statusCode = 400;
    error.code = 'SELF_CHAT_NOT_ALLOWED';
    throw error;
  }

  // Verify candidate exists and is active
  const candidateUser = await db('users').where({ id: targetUserId }).first();
  if (!candidateUser || candidateUser.status === 'suspended') {
    const error = new Error('Candidate user not found or unavailable');
    error.statusCode = 404;
    error.code = 'CANDIDATE_NOT_FOUND';
    throw error;
  }

  // Check bidirectional block status
  const isBlocked = await db('blocks')
    .where((builder) => {
      builder
        .where({ blocker_id: currentUserId, blocked_id: targetUserId })
        .orWhere({ blocker_id: targetUserId, blocked_id: currentUserId });
    })
    .first();

  if (isBlocked) {
    const error = new Error('Cannot start a conversation with a blocked user');
    error.statusCode = 403;
    error.code = 'USER_BLOCKED';
    throw error;
  }

  // Enforce ordering: user_a_id < user_b_id
  const userAId = Math.min(currentUserId, targetUserId);
  const userBId = Math.max(currentUserId, targetUserId);

  // Check for existing conversation
  let conv = await db('conversations')
    .where({ user_a_id: userAId, user_b_id: userBId })
    .first();

  if (!conv) {
    const [insertedId] = await db('conversations').insert({
      user_a_id: userAId,
      user_b_id: userBId,
      roommate_status: 'none',
      contact_revealed_by_a: 0,
      contact_revealed_by_b: 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    conv = await db('conversations').where({ id: insertedId }).first();
  }

  return await formatConversation(currentUserId, conv);
}

/**
 * Get all conversations for a user (inbox list) with latest message and unread count.
 *
 * @param {number} userId
 * @returns {Promise<Array<object>>}
 */
export async function getUserConversations(userId) {
  const currentUserId = Number(userId);

  const convRows = await db('conversations')
    .where({ user_a_id: currentUserId })
    .orWhere({ user_b_id: currentUserId })
    .orderBy('last_message_at', 'desc')
    .orderBy('updated_at', 'desc');

  const formattedList = await Promise.all(
    convRows.map((conv) => formatConversation(currentUserId, conv))
  );

  return formattedList;
}

/**
 * Get paginated messages for a conversation.
 *
 * @param {number} userId
 * @param {number|string} conversationId
 * @param {object} options - { before, limit }
 * @returns {Promise<object>} { messages, conversation, is_blocked, has_more }
 */
export async function getConversationMessages(userId, conversationId, { before, limit = 50 } = {}) {
  const currentUserId = Number(userId);
  const convId = Number(conversationId);

  const conv = await db('conversations').where({ id: convId }).first();
  if (!conv) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }

  // Verify participant access
  if (conv.user_a_id !== currentUserId && conv.user_b_id !== currentUserId) {
    const error = new Error('You do not have permission to access this conversation');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const otherUserId = conv.user_a_id === currentUserId ? conv.user_b_id : conv.user_a_id;

  // Check bidirectional blocks
  const blockRecord = await db('blocks')
    .where((builder) => {
      builder
        .where({ blocker_id: currentUserId, blocked_id: otherUserId })
        .orWhere({ blocker_id: otherUserId, blocked_id: currentUserId });
    })
    .first();

  const isBlocked = Boolean(blockRecord);

  const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  let query = db('messages')
    .where({ conversation_id: convId });

  if (before && !isNaN(Number(before))) {
    query = query.andWhere('id', '<', Number(before));
  }

  const messagesDesc = await query
    .orderBy('id', 'desc')
    .limit(parsedLimit + 1);

  const hasMore = messagesDesc.length > parsedLimit;
  const messagesSlice = hasMore ? messagesDesc.slice(0, parsedLimit) : messagesDesc;

  // Return in chronological order (asc)
  const chronologicalMessages = messagesSlice.reverse().map((msg) => ({
    id: msg.id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    content: msg.content,
    is_read: Boolean(msg.is_read),
    read_at: msg.read_at,
    created_at: msg.created_at,
  }));

  // Auto mark unread incoming messages as read
  await markMessagesAsRead(currentUserId, convId);

  const formattedConv = await formatConversation(currentUserId, conv);

  return {
    conversation: formattedConv,
    messages: chronologicalMessages,
    is_blocked: isBlocked,
    has_more: hasMore,
  };
}

/**
 * Mark all incoming unread messages in a conversation as read.
 *
 * @param {number} userId
 * @param {number|string} conversationId
 * @returns {Promise<{ updated_count: number }>}
 */
export async function markMessagesAsRead(userId, conversationId) {
  const currentUserId = Number(userId);
  const convId = Number(conversationId);

  const updatedCount = await db('messages')
    .where({ conversation_id: convId, is_read: 0 })
    .whereNot({ sender_id: currentUserId })
    .update({
      is_read: 1,
      read_at: db.fn.now(),
    });

  return { updated_count: updatedCount };
}

/**
 * Create and persist a new message in a conversation.
 * Sends an email notification to the recipient (rate-limited to 1 per conversation per hour).
 *
 * @param {number} userId
 * @param {number|string} conversationId
 * @param {string} content
 * @returns {Promise<object>}
 */
export async function createMessage(userId, conversationId, content) {
  const currentUserId = Number(userId);
  const convId = Number(conversationId);

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    const error = new Error('Message content cannot be empty');
    error.statusCode = 400;
    error.code = 'EMPTY_MESSAGE';
    throw error;
  }

  const trimmedContent = content.trim();

  if (trimmedContent.length > 1000) {
    const error = new Error('Message length exceeds maximum 1000 characters');
    error.statusCode = 400;
    error.code = 'MESSAGE_TOO_LONG';
    throw error;
  }

  const conv = await db('conversations').where({ id: convId }).first();
  if (!conv) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }

  // Access control
  if (conv.user_a_id !== currentUserId && conv.user_b_id !== currentUserId) {
    const error = new Error('You do not have permission to post in this conversation');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const otherUserId = conv.user_a_id === currentUserId ? conv.user_b_id : conv.user_a_id;

  // Check blocks
  const isBlocked = await db('blocks')
    .where((builder) => {
      builder
        .where({ blocker_id: currentUserId, blocked_id: otherUserId })
        .orWhere({ blocker_id: otherUserId, blocked_id: currentUserId });
    })
    .first();

  if (isBlocked) {
    const error = new Error('Cannot send messages in a blocked conversation');
    error.statusCode = 403;
    error.code = 'CONVERSATION_BLOCKED';
    throw error;
  }

  // Insert message and update conversation timestamp within transaction
  let newMsgId;
  await db.transaction(async (trx) => {
    const [insertedId] = await trx('messages').insert({
      conversation_id: convId,
      sender_id: currentUserId,
      content: trimmedContent,
      is_read: 0,
      read_at: null,
      created_at: trx.fn.now(),
    });

    newMsgId = insertedId;

    await trx('conversations')
      .where({ id: convId })
      .update({
        last_message_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
  });

  const insertedMessage = await db('messages').where({ id: newMsgId }).first();

  // Asynchronously send email notification to recipient (1 per hour rate limited)
  try {
    const recipientUser = await db('users').where({ id: otherUserId }).first();
    const senderProfile = await db('profiles').where({ user_id: currentUserId }).first();
    const recipientProfile = await db('profiles').where({ user_id: otherUserId }).first();

    if (recipientUser?.email) {
      mailService.sendMessageNotificationEmail({
        to: recipientUser.email,
        recipientName: recipientProfile?.full_name || 'Roommate',
        senderName: senderProfile?.full_name || 'Your Roommate Match',
        conversationId: convId,
        messageSnippet: trimmedContent,
      }).catch((mailErr) => {
        console.error('Failed to dispatch message notification email:', mailErr?.message || mailErr);
      });
    }
  } catch (err) {
    console.error('Error fetching recipient for email notification:', err?.message || err);
  }

  return {
    message: {
      id: insertedMessage.id,
      conversation_id: insertedMessage.conversation_id,
      sender_id: insertedMessage.sender_id,
      content: insertedMessage.content,
      is_read: Boolean(insertedMessage.is_read),
      read_at: insertedMessage.read_at,
      created_at: insertedMessage.created_at,
    },
    recipient_id: otherUserId,
  };
}

export default {
  formatConversation,
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  markMessagesAsRead,
  createMessage,
};

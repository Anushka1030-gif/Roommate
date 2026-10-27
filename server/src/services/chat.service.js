import db from '../db/index.js';
import mailService from './mail.service.js';
import { getIO } from '../sockets/chat.socket.js';

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

  const isUserA = conv.user_a_id === userId;
  const aShares = Boolean(conv.a_shares_contact ?? conv.contact_revealed_by_a);
  const bShares = Boolean(conv.b_shares_contact ?? conv.contact_revealed_by_b);
  const myShare = isUserA ? aShares : bShares;
  const otherShared = isUserA ? bShares : aShares;
  const bothShared = aShares && bShares;

  const aConfirmed = Boolean(conv.a_confirmed_roommates || conv.roommate_status === 'confirmed');
  const bConfirmed = Boolean(conv.b_confirmed_roommates || conv.roommate_status === 'confirmed');
  const meConfirmed = isUserA ? aConfirmed : bConfirmed;
  const otherConfirmed = isUserA ? bConfirmed : aConfirmed;
  const bothConfirmed = aConfirmed && bConfirmed;

  const roommateStatus = bothConfirmed
    ? 'confirmed'
    : (meConfirmed || otherConfirmed ? 'pending' : 'none');

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
    
    // Step 12 Contact Sharing & Confirmation fields
    my_share: myShare,
    other_shared: otherShared,
    both_shared: bothShared,
    me_confirmed: meConfirmed,
    other_confirmed: otherConfirmed,
    both_confirmed: bothConfirmed,
    roommate_status: roommateStatus,

    // Backward-compatibility aliases
    contact_revealed: bothShared,
    contact_revealed_by_me: myShare,
    contact_revealed_by_other: otherShared,

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

/**
 * Fetch a single conversation by ID with participant permission check.
 *
 * @param {number} userId
 * @param {number|string} conversationId
 * @returns {Promise<object>}
 */
export async function getConversationById(userId, conversationId) {
  const currentUserId = Number(userId);
  const convId = Number(conversationId);

  const conv = await db('conversations').where({ id: convId }).first();
  if (!conv) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }

  if (conv.user_a_id !== currentUserId && conv.user_b_id !== currentUserId) {
    const error = new Error('You do not have permission to access this conversation');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  return await formatConversation(currentUserId, conv);
}

/**
 * Update caller's contact sharing consent flag and emit contact_status_changed.
 *
 * @param {number} userId
 * @param {number|string} conversationId
 * @param {boolean} share
 * @returns {Promise<object>}
 */
export async function shareContact(userId, conversationId, share) {
  const currentUserId = Number(userId);
  const convId = Number(conversationId);

  const conv = await db('conversations').where({ id: convId }).first();
  if (!conv) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }

  if (conv.user_a_id !== currentUserId && conv.user_b_id !== currentUserId) {
    const error = new Error('You do not have permission to access this conversation');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const otherUserId = conv.user_a_id === currentUserId ? conv.user_b_id : conv.user_a_id;

  // Check bidirectional blocks
  const isBlocked = await db('blocks')
    .where((builder) => {
      builder
        .where({ blocker_id: currentUserId, blocked_id: otherUserId })
        .orWhere({ blocker_id: otherUserId, blocked_id: currentUserId });
    })
    .first();

  if (isBlocked) {
    const error = new Error('Cannot share contact in a blocked conversation');
    error.statusCode = 403;
    error.code = 'CONVERSATION_BLOCKED';
    throw error;
  }

  const isUserA = conv.user_a_id === currentUserId;
  const shareBool = Boolean(share);
  const updateData = isUserA
    ? {
        a_shares_contact: shareBool ? 1 : 0,
        contact_revealed_by_a: shareBool ? 1 : 0,
        updated_at: db.fn.now(),
      }
    : {
        b_shares_contact: shareBool ? 1 : 0,
        contact_revealed_by_b: shareBool ? 1 : 0,
        updated_at: db.fn.now(),
      };

  await db('conversations').where({ id: convId }).update(updateData);

  const updatedConv = await db('conversations').where({ id: convId }).first();
  const aShares = Boolean(updatedConv.a_shares_contact ?? updatedConv.contact_revealed_by_a);
  const bShares = Boolean(updatedConv.b_shares_contact ?? updatedConv.contact_revealed_by_b);
  const bothShared = aShares && bShares;
  const myShare = isUserA ? aShares : bShares;
  const otherShared = isUserA ? bShares : aShares;

  // Emit contact_status_changed socket event with ONLY the booleans (never contact itself)
  const io = getIO();
  if (io) {
    io.to(`conversation_${convId}`).emit('contact_status_changed', {
      conversation_id: convId,
      a_shares_contact: aShares,
      b_shares_contact: bShares,
      both_shared: bothShared,
    });
    io.to(`user_${conv.user_a_id}`).emit('contact_status_changed', {
      conversation_id: convId,
      my_share: aShares,
      other_shared: bShares,
      both_shared: bothShared,
      a_shares_contact: aShares,
      b_shares_contact: bShares,
    });
    io.to(`user_${conv.user_b_id}`).emit('contact_status_changed', {
      conversation_id: convId,
      my_share: bShares,
      other_shared: aShares,
      both_shared: bothShared,
      a_shares_contact: aShares,
      b_shares_contact: bShares,
    });
  }

  return {
    success: true,
    conversation_id: convId,
    my_share: myShare,
    other_shared: otherShared,
    both_shared: bothShared,
    a_shares_contact: aShares,
    b_shares_contact: bShares,
  };
}

/**
 * Return the OTHER user's contact (email, phone) ONLY if both share flags are true
 * and neither user has blocked the other. Otherwise throws CONTACT_NOT_SHARED.
 *
 * @param {number} userId
 * @param {number|string} conversationId
 * @returns {Promise<object>}
 */
export async function getContactDetails(userId, conversationId) {
  const currentUserId = Number(userId);
  const convId = Number(conversationId);

  const conv = await db('conversations').where({ id: convId }).first();
  if (!conv) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }

  if (conv.user_a_id !== currentUserId && conv.user_b_id !== currentUserId) {
    const error = new Error('You do not have permission to access this conversation');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const otherUserId = conv.user_a_id === currentUserId ? conv.user_b_id : conv.user_a_id;

  // Check bidirectional blocks
  const isBlocked = await db('blocks')
    .where((builder) => {
      builder
        .where({ blocker_id: currentUserId, blocked_id: otherUserId })
        .orWhere({ blocker_id: otherUserId, blocked_id: currentUserId });
    })
    .first();

  if (isBlocked) {
    const error = new Error('Contact sharing requires mutual consent and unblocked status');
    error.statusCode = 403;
    error.code = 'CONTACT_NOT_SHARED';
    throw error;
  }

  const aShares = Boolean(conv.a_shares_contact ?? conv.contact_revealed_by_a);
  const bShares = Boolean(conv.b_shares_contact ?? conv.contact_revealed_by_b);

  if (!aShares || !bShares) {
    const error = new Error('Contact details are private until both users consent to share.');
    error.statusCode = 403;
    error.code = 'CONTACT_NOT_SHARED';
    throw error;
  }

  // Fetch the other user's contact information ONLY
  const otherUser = await db('users').where({ id: otherUserId }).first();
  const otherProfile = await db('profiles').where({ user_id: otherUserId }).first();

  const phone = otherUser?.phone || otherProfile?.phone || null;

  return {
    success: true,
    contact: {
      email: otherUser?.email || null,
      phone,
    },
    email: otherUser?.email || null,
    phone,
  };
}

/**
 * Confirm roommate partnership. When both confirm, mark roommate_status as confirmed,
 * clean up match results, and emit socket event.
 *
 * @param {number} userId
 * @param {number|string} conversationId
 * @returns {Promise<object>}
 */
export async function confirmRoommates(userId, conversationId) {
  const currentUserId = Number(userId);
  const convId = Number(conversationId);

  const conv = await db('conversations').where({ id: convId }).first();
  if (!conv) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }

  if (conv.user_a_id !== currentUserId && conv.user_b_id !== currentUserId) {
    const error = new Error('You do not have permission to access this conversation');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const otherUserId = conv.user_a_id === currentUserId ? conv.user_b_id : conv.user_a_id;

  // Check bidirectional blocks
  const isBlocked = await db('blocks')
    .where((builder) => {
      builder
        .where({ blocker_id: currentUserId, blocked_id: otherUserId })
        .orWhere({ blocker_id: otherUserId, blocked_id: currentUserId });
    })
    .first();

  if (isBlocked) {
    const error = new Error('Cannot confirm roommates in a blocked conversation');
    error.statusCode = 403;
    error.code = 'CONVERSATION_BLOCKED';
    throw error;
  }

  const isUserA = conv.user_a_id === currentUserId;
  const updatedAConfirmed = isUserA ? true : Boolean(conv.a_confirmed_roommates);
  const updatedBConfirmed = isUserA ? Boolean(conv.b_confirmed_roommates) : true;
  const bothConfirmed = Boolean(updatedAConfirmed && updatedBConfirmed);

  const updateData = {
    a_confirmed_roommates: updatedAConfirmed ? 1 : 0,
    b_confirmed_roommates: updatedBConfirmed ? 1 : 0,
    roommate_status: bothConfirmed ? 'confirmed' : (isUserA ? 'pending_a' : 'pending_b'),
    updated_at: db.fn.now(),
  };

  await db('conversations').where({ id: convId }).update(updateData);

  // When both confirm, remove each other from match_results cache
  if (bothConfirmed) {
    await db('match_results')
      .where(function () {
        this.where({ user_id: conv.user_a_id, matched_user_id: conv.user_b_id })
          .orWhere({ user_id: conv.user_b_id, matched_user_id: conv.user_a_id });
      })
      .del();
  }

  const meConfirmed = isUserA ? updatedAConfirmed : updatedBConfirmed;
  const otherConfirmed = isUserA ? updatedBConfirmed : updatedAConfirmed;

  // Emit socket event so both UIs update
  const io = getIO();
  if (io) {
    io.to(`conversation_${convId}`).emit('roommate_status_changed', {
      conversation_id: convId,
      a_confirmed_roommates: updatedAConfirmed,
      b_confirmed_roommates: updatedBConfirmed,
      both_confirmed: bothConfirmed,
      roommate_status: bothConfirmed ? 'confirmed' : 'pending',
    });
    io.to(`user_${conv.user_a_id}`).emit('roommate_status_changed', {
      conversation_id: convId,
      me_confirmed: updatedAConfirmed,
      other_confirmed: updatedBConfirmed,
      both_confirmed: bothConfirmed,
      roommate_status: bothConfirmed ? 'confirmed' : 'pending',
    });
    io.to(`user_${conv.user_b_id}`).emit('roommate_status_changed', {
      conversation_id: convId,
      me_confirmed: updatedBConfirmed,
      other_confirmed: updatedAConfirmed,
      both_confirmed: bothConfirmed,
      roommate_status: bothConfirmed ? 'confirmed' : 'pending',
    });
  }

  return {
    success: true,
    conversation_id: convId,
    me_confirmed: meConfirmed,
    other_confirmed: otherConfirmed,
    both_confirmed: bothConfirmed,
    roommate_status: bothConfirmed ? 'confirmed' : 'pending',
  };
}

export default {
  formatConversation,
  getOrCreateConversation,
  getUserConversations,
  getConversationById,
  getConversationMessages,
  markMessagesAsRead,
  createMessage,
  shareContact,
  getContactDetails,
  confirmRoommates,
};

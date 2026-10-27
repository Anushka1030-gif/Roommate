import api from './api.js';

/**
 * Create or retrieve an existing conversation with a candidate.
 *
 * @param {number|string} candidateUserId
 * @returns {Promise<object>} { success, conversation }
 */
export async function getOrCreateConversation(candidateUserId) {
  const response = await api.post('/conversations', {
    candidate_user_id: Number(candidateUserId),
  });
  return response.data;
}

/**
 * Fetch all conversations for the authenticated student (Inbox list).
 *
 * @returns {Promise<object>} { conversations, count }
 */
export async function getConversations() {
  const response = await api.get('/conversations');
  return response.data;
}

/**
 * Fetch paginated messages for a conversation.
 *
 * @param {number|string} conversationId
 * @param {object} options - { before, limit }
 * @returns {Promise<object>} { conversation, messages, is_blocked, has_more }
 */
export async function getMessages(conversationId, { before, limit } = {}) {
  const params = {};
  if (before) params.before = before;
  if (limit) params.limit = limit;

  const response = await api.get(`/conversations/${conversationId}/messages`, { params });
  return response.data;
}

/**
 * Send a new message in a conversation.
 *
 * @param {number|string} conversationId
 * @param {string} content
 * @returns {Promise<object>} { success, message }
 */
export async function sendMessage(conversationId, content) {
  const response = await api.post(`/conversations/${conversationId}/messages`, {
    content,
  });
  return response.data;
}

/**
 * Mark all incoming unread messages in a conversation as read.
 *
 * @param {number|string} conversationId
 * @returns {Promise<object>} { success, updated_count }
 */
export async function markAsRead(conversationId) {
  const response = await api.post(`/conversations/${conversationId}/read`);
  return response.data;
}

/**
 * Fetch a single conversation by ID.
 *
 * @param {number|string} conversationId
 * @returns {Promise<object>} { success, conversation }
 */
export async function getConversation(conversationId) {
  const response = await api.get(`/conversations/${conversationId}`);
  return response.data;
}

/**
 * Toggle contact sharing consent for this conversation.
 *
 * @param {number|string} conversationId
 * @param {boolean} share
 * @returns {Promise<object>}
 */
export async function shareContact(conversationId, share) {
  const response = await api.post(`/conversations/${conversationId}/share-contact`, {
    share: Boolean(share),
  });
  return response.data;
}

/**
 * Fetch the other participant's contact details (email, phone) if both consented.
 *
 * @param {number|string} conversationId
 * @returns {Promise<object>} { success, contact: { email, phone } }
 */
export async function getContact(conversationId) {
  const response = await api.get(`/conversations/${conversationId}/contact`);
  return response.data;
}

/**
 * Confirm roommate partnership.
 *
 * @param {number|string} conversationId
 * @returns {Promise<object>}
 */
export async function confirmRoommates(conversationId) {
  const response = await api.post(`/conversations/${conversationId}/confirm-roommates`);
  return response.data;
}

/**
 * Update the user's account contact phone number.
 *
 * @param {string|null} phone
 * @returns {Promise<object>}
 */
export async function updatePhone(phone) {
  const response = await api.put('/account/phone', {
    phone: phone ? phone.trim() : null,
  });
  return response.data;
}

export default {
  getOrCreateConversation,
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  markAsRead,
  shareContact,
  getContact,
  confirmRoommates,
  updatePhone,
};

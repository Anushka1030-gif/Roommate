import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import db from '../db/index.js';
import chatService from '../services/chat.service.js';

function parseCookieHeader(header) {
  if (!header || typeof header !== 'string') return {};
  return header.split(';').reduce((acc, pair) => {
    const [key, ...val] = pair.trim().split('=');
    if (key) {
      acc[key] = decodeURIComponent(val.join('='));
    }
    return acc;
  }, {});
}

/**
 * Socket.IO authentication middleware.
 * Verifies JWT from handshake auth token or httpOnly cookie.
 */
export function socketAuthMiddleware(socket, next) {
  try {
    let token = socket.handshake.auth?.token;

    // Check cookie header if token not in handshake auth
    if (!token && socket.handshake.headers?.cookie) {
      const parsedCookies = parseCookieHeader(socket.handshake.headers.cookie);
      token = parsedCookies.token || parsedCookies.jwt;
    }

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const jwtSecret = config.jwt?.secret || config.jwtSecret;
    const decoded = jwt.verify(token, jwtSecret);
    socket.user = decoded;
    return next();
  } catch (err) {
    return next(new Error(`Authentication error: ${err.message}`));
  }
}

/**
 * Register chat Socket.IO handlers.
 *
 * @param {import('socket.io').Server} io
 */
export default function registerChatSocket(io) {
  // Apply auth middleware to all incoming socket connections
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    // Join personal user room for direct inbox updates & notifications
    const userRoom = `user_${userId}`;
    socket.join(userRoom);

    /**
     * Join a specific conversation room.
     */
    socket.on('join_conversation', async (data, callback) => {
      try {
        const conversationId = Number(data?.conversation_id);
        if (!conversationId || isNaN(conversationId)) {
          if (typeof callback === 'function') {
            return callback({ error: { code: 'INVALID_CONVERSATION_ID', message: 'Invalid conversation ID' } });
          }
          return;
        }

        // Verify user is a participant
        const conv = await db('conversations').where({ id: conversationId }).first();
        if (!conv || (conv.user_a_id !== userId && conv.user_b_id !== userId)) {
          if (typeof callback === 'function') {
            return callback({ error: { code: 'FORBIDDEN', message: 'Not authorized for this conversation' } });
          }
          return;
        }

        const roomName = `conversation_${conversationId}`;
        socket.join(roomName);

        if (typeof callback === 'function') {
          callback({ success: true, conversation_id: conversationId });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ error: { code: 'JOIN_ERROR', message: err.message } });
        }
      }
    });

    /**
     * Leave a conversation room.
     */
    socket.on('leave_conversation', (data) => {
      const conversationId = Number(data?.conversation_id);
      if (conversationId) {
        socket.leave(`conversation_${conversationId}`);
      }
    });

    /**
     * Send a real-time message.
     */
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversation_id, content } = data || {};
        const result = await chatService.createMessage(userId, conversation_id, content);

        const roomName = `conversation_${conversation_id}`;

        // Broadcast to all clients inside the conversation room
        io.to(roomName).emit('new_message', result.message);

        // Also notify the recipient's personal user room so their inbox list updates immediately
        io.to(`user_${result.recipient_id}`).emit('inbox_update', {
          conversation_id: Number(conversation_id),
          last_message: result.message,
          unread_delta: 1,
        });

        if (typeof callback === 'function') {
          callback({ success: true, message: result.message });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({
            error: {
              code: err.code || 'MESSAGE_SEND_FAILED',
              message: err.message || 'Failed to send message',
            },
          });
        }
      }
    });

    /**
     * Mark messages in conversation as read.
     */
    socket.on('mark_read', async (data, callback) => {
      try {
        const conversationId = Number(data?.conversation_id);
        if (!conversationId) return;

        const { updated_count } = await chatService.markMessagesAsRead(userId, conversationId);

        const roomName = `conversation_${conversationId}`;
        io.to(roomName).emit('messages_read', {
          conversation_id: conversationId,
          reader_id: userId,
          read_at: new Date().toISOString(),
          count: updated_count,
        });

        if (typeof callback === 'function') {
          callback({ success: true, updated_count });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ error: { message: err.message } });
        }
      }
    });

    /**
     * Typing indicators.
     */
    socket.on('typing', (data) => {
      const conversationId = Number(data?.conversation_id);
      const isTyping = Boolean(data?.is_typing);

      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          conversation_id: conversationId,
          user_id: userId,
          is_typing: isTyping,
        });
      }
    });
  });
}

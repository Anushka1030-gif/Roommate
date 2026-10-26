import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth.js';
import chatService from '../services/chat.service.js';
import { getSocket, connectSocket } from '../services/socket.js';
import { getErrorMessage } from '../utils/error.js';

/**
 * Custom hook to manage 1-on-1 chats, conversations list, message history,
 * real-time Socket.IO events, typing indicators, and read receipts.
 */
export function useChat() {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState(null);

  const activeConvRef = useRef(activeConversationId);
  activeConvRef.current = activeConversationId;

  const typingTimeoutRef = useRef(null);
  const selfTypingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  /**
   * Fetch all conversations for user inbox.
   */
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      setError(null);
      const data = await chatService.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load conversations'));
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  /**
   * Load messages for a specific conversation.
   */
  const loadConversationMessages = useCallback(async (convId) => {
    if (!convId) return;
    try {
      setLoadingMessages(true);
      setError(null);
      const data = await chatService.getMessages(convId, { limit: 40 });
      setMessages(data.messages || []);
      setHasMoreMessages(Boolean(data.has_more));
      setIsBlocked(Boolean(data.is_blocked));

      // Reset unread count locally for this conversation
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load messages'));
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  /**
   * Load earlier paginated messages (scrolling up).
   */
  const loadOlderMessages = useCallback(async () => {
    if (!activeConversationId || loadingMoreMessages || !hasMoreMessages) return;
    const oldestMessageId = messages[0]?.id;
    if (!oldestMessageId) return;

    try {
      setLoadingMoreMessages(true);
      const data = await chatService.getMessages(activeConversationId, {
        before: oldestMessageId,
        limit: 30,
      });

      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => [...data.messages, ...prev]);
      }
      setHasMoreMessages(Boolean(data.has_more));
    } catch {
      // Non-critical, ignore
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [activeConversationId, loadingMoreMessages, hasMoreMessages, messages]);

  /**
   * Select an active conversation.
   */
  const selectConversation = useCallback(
    (convId) => {
      const parsedId = Number(convId);
      if (activeConvRef.current === parsedId) return;

      const socket = getSocket();
      // Leave previous room if any
      if (activeConvRef.current && socket.connected) {
        socket.emit('leave_conversation', { conversation_id: activeConvRef.current });
      }

      setActiveConversationId(parsedId);
      setPartnerTyping(false);

      if (parsedId) {
        loadConversationMessages(parsedId);
        if (socket.connected) {
          socket.emit('join_conversation', { conversation_id: parsedId });
          socket.emit('mark_read', { conversation_id: parsedId });
        }
      } else {
        setMessages([]);
      }
    },
    [loadConversationMessages]
  );

  /**
   * Start or open a conversation with a candidate user ID.
   */
  const startConversationWithCandidate = useCallback(
    async (candidateUserId) => {
      try {
        setError(null);
        const data = await chatService.getOrCreateConversation(candidateUserId);
        const conv = data.conversation;
        if (!conv) return null;

        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conv.id);
          if (exists) {
            return prev.map((c) => (c.id === conv.id ? conv : c));
          }
          return [conv, ...prev];
        });

        selectConversation(conv.id);
        return conv;
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to start conversation'));
        return null;
      }
    },
    [selectConversation]
  );

  /**
   * Dispatch a message via Socket.IO with fallback to REST.
   */
  const sendChatMessage = useCallback(
    async (content) => {
      const trimmed = content?.trim();
      if (!trimmed || !activeConversationId || sendingMessage) return false;

      setSendingMessage(true);
      setError(null);

      // Stop self typing indicator
      if (isTypingRef.current) {
        const socket = getSocket();
        if (socket.connected) {
          socket.emit('typing', { conversation_id: activeConversationId, is_typing: false });
        }
        isTypingRef.current = false;
        if (selfTypingTimeoutRef.current) clearTimeout(selfTypingTimeoutRef.current);
      }

      try {
        const socket = getSocket();

        if (socket.connected) {
          // Send via Socket.IO
          await new Promise((resolve, reject) => {
            socket.emit(
              'send_message',
              { conversation_id: activeConversationId, content: trimmed },
              (response) => {
                if (response?.error) {
                  reject(new Error(response.error.message || 'Failed to send message'));
                } else {
                  resolve(response);
                }
              }
            );
          });
        } else {
          // Fallback to REST API
          const response = await chatService.sendMessage(activeConversationId, trimmed);
          const newMsg = response.message;
          if (newMsg) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            setConversations((prev) => {
              const updated = prev.map((c) =>
                c.id === activeConversationId
                  ? {
                      ...c,
                      last_message: newMsg,
                      last_message_at: newMsg.created_at,
                    }
                  : c
              );
              return [...updated].sort(
                (a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
              );
            });
          }
        }

        return true;
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to send message'));
        return false;
      } finally {
        setSendingMessage(false);
      }
    },
    [activeConversationId, sendingMessage]
  );

  /**
   * Emit typing status with auto-reset debounce.
   */
  const emitTyping = useCallback(
    (isTyping) => {
      if (!activeConversationId) return;
      const socket = getSocket();
      if (!socket.connected) return;

      if (isTyping) {
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          socket.emit('typing', { conversation_id: activeConversationId, is_typing: true });
        }

        if (selfTypingTimeoutRef.current) {
          clearTimeout(selfTypingTimeoutRef.current);
        }

        selfTypingTimeoutRef.current = setTimeout(() => {
          if (isTypingRef.current) {
            isTypingRef.current = false;
            socket.emit('typing', { conversation_id: activeConversationId, is_typing: false });
          }
        }, 1500);
      } else {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          socket.emit('typing', { conversation_id: activeConversationId, is_typing: false });
        }
        if (selfTypingTimeoutRef.current) {
          clearTimeout(selfTypingTimeoutRef.current);
        }
      }
    },
    [activeConversationId]
  );

  /**
   * Initialize socket connection and lifecycle listeners.
   */
  useEffect(() => {
    fetchConversations();

    const socket = connectSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      if (activeConvRef.current) {
        socket.emit('join_conversation', { conversation_id: activeConvRef.current });
      }
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleNewMessage = (msg) => {
      if (!msg) return;
      const convId = Number(msg.conversation_id);

      // If active conversation, append message and mark as read
      if (activeConvRef.current === convId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (msg.sender_id !== currentUserId) {
          socket.emit('mark_read', { conversation_id: convId });
        }
      }

      // Update conversations inbox list
      setConversations((prev) => {
        const found = prev.some((c) => c.id === convId);
        const isCurrentActive = activeConvRef.current === convId;

        const updated = found
          ? prev.map((c) => {
              if (c.id === convId) {
                const unreadDelta =
                  !isCurrentActive && msg.sender_id !== currentUserId ? (c.unread_count || 0) + 1 : 0;
                return {
                  ...c,
                  last_message: msg,
                  last_message_at: msg.created_at,
                  unread_count: isCurrentActive ? 0 : unreadDelta,
                };
              }
              return c;
            })
          : [
              {
                id: convId,
                last_message: msg,
                last_message_at: msg.created_at,
                unread_count: !isCurrentActive && msg.sender_id !== currentUserId ? 1 : 0,
              },
              ...prev,
            ];

        return [...updated].sort(
          (a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
        );
      });
    };

    const handleInboxUpdate = (data) => {
      if (!data) return;
      const convId = Number(data.conversation_id);
      const isCurrentActive = activeConvRef.current === convId;

      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id === convId) {
            return {
              ...c,
              last_message: data.last_message || c.last_message,
              last_message_at: data.last_message?.created_at || c.last_message_at,
              unread_count: isCurrentActive
                ? 0
                : (c.unread_count || 0) + (data.unread_delta || 0),
            };
          }
          return c;
        });

        return [...updated].sort(
          (a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
        );
      });
    };

    const handleMessagesRead = (data) => {
      if (!data) return;
      const convId = Number(data.conversation_id);
      if (activeConvRef.current === convId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === currentUserId ? { ...m, is_read: true, read_at: data.read_at } : m
          )
        );
      }
    };

    const handleUserTyping = (data) => {
      if (!data) return;
      const convId = Number(data.conversation_id);
      if (activeConvRef.current === convId && data.user_id !== currentUserId) {
        setPartnerTyping(Boolean(data.is_typing));

        if (data.is_typing) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setPartnerTyping(false);
          }, 3500);
        }
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('inbox_update', handleInboxUpdate);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);

    if (socket.connected) {
      setSocketConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('inbox_update', handleInboxUpdate);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);

      if (activeConvRef.current && socket.connected) {
        socket.emit('leave_conversation', { conversation_id: activeConvRef.current });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (selfTypingTimeoutRef.current) clearTimeout(selfTypingTimeoutRef.current);
    };
  }, [currentUserId, fetchConversations]);

  return {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    hasMoreMessages,
    isBlocked,
    partnerTyping,
    loadingConversations,
    loadingMessages,
    loadingMoreMessages,
    sendingMessage,
    socketConnected,
    error,
    selectConversation,
    startConversationWithCandidate,
    sendChatMessage,
    loadOlderMessages,
    emitTyping,
    fetchConversations,
    clearError: () => setError(null),
  };
}

export default useChat;

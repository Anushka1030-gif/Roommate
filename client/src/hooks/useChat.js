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
  const [socketConnected, setSocketConnected] = useState(() => Boolean(getSocket()?.connected));
  const [error, setError] = useState(null);

  // Step 12 Contact sharing and roommate confirmation state
  const [contactDetails, setContactDetails] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [togglingShare, setTogglingShare] = useState(false);
  const [confirmingRoommates, setConfirmingRoommates] = useState(false);

  const activeConvRef = useRef(activeConversationId);

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  const typingTimeoutRef = useRef(null);
  const selfTypingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Auto-fetch contact details if active conversation has mutual consent
  useEffect(() => {
    let isMounted = true;
    if (activeConversationId && activeConversation?.both_shared) {
      chatService
        .getContact(activeConversationId)
        .then((res) => {
          if (isMounted) {
            setContactDetails(res.contact || { email: res.email, phone: res.phone });
          }
        })
        .catch(() => {
          if (isMounted) setContactDetails(null);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [activeConversationId, activeConversation?.both_shared]);

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
      setContactDetails(null);

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

  useEffect(() => {
    let isMounted = true;

    async function loadInitialConversations() {
      try {
        const data = await chatService.getConversations();
        if (isMounted) {
          setConversations(data.conversations || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err, 'Failed to load conversations'));
        }
      } finally {
        if (isMounted) {
          setLoadingConversations(false);
        }
      }
    }

    loadInitialConversations();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Initialize socket connection and lifecycle listeners.
   */
  useEffect(() => {
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

    const handleContactStatusChanged = (data) => {
      if (!data) return;
      const convId = Number(data.conversation_id);

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === convId) {
            const isUserA = c.user_a_id === currentUserId;
            const aShares =
              data.a_shares_contact !== undefined
                ? Boolean(data.a_shares_contact)
                : Boolean(c.a_shares_contact);
            const bShares =
              data.b_shares_contact !== undefined
                ? Boolean(data.b_shares_contact)
                : Boolean(c.b_shares_contact);
            const myShare =
              data.my_share !== undefined
                ? Boolean(data.my_share)
                : isUserA
                ? aShares
                : bShares;
            const otherShared =
              data.other_shared !== undefined
                ? Boolean(data.other_shared)
                : isUserA
                ? bShares
                : aShares;
            const bothShared =
              data.both_shared !== undefined
                ? Boolean(data.both_shared)
                : aShares && bShares;

            return {
              ...c,
              my_share: myShare,
              other_shared: otherShared,
              both_shared: bothShared,
              contact_revealed: bothShared,
              contact_revealed_by_me: myShare,
              contact_revealed_by_other: otherShared,
            };
          }
          return c;
        })
      );

      // If this conversation is currently open
      if (activeConvRef.current === convId) {
        if (data.both_shared) {
          setLoadingContact(true);
          chatService
            .getContact(convId)
            .then((res) => {
              setContactDetails(res.contact || { email: res.email, phone: res.phone });
            })
            .catch(() => {
              setContactDetails(null);
            })
            .finally(() => {
              setLoadingContact(false);
            });
        } else {
          // Immediately hide contact details if either user disabled sharing
          setContactDetails(null);
        }
      }
    };

    const handleRoommateStatusChanged = (data) => {
      if (!data) return;
      const convId = Number(data.conversation_id);

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === convId) {
            const isUserA = c.user_a_id === currentUserId;
            const aConf =
              data.a_confirmed_roommates !== undefined
                ? Boolean(data.a_confirmed_roommates)
                : Boolean(c.a_confirmed_roommates);
            const bConf =
              data.b_confirmed_roommates !== undefined
                ? Boolean(data.b_confirmed_roommates)
                : Boolean(c.b_confirmed_roommates);
            const meConf =
              data.me_confirmed !== undefined
                ? Boolean(data.me_confirmed)
                : isUserA
                ? aConf
                : bConf;
            const otherConf =
              data.other_confirmed !== undefined
                ? Boolean(data.other_confirmed)
                : isUserA
                ? bConf
                : aConf;
            const bothConf =
              data.both_confirmed !== undefined
                ? Boolean(data.both_confirmed)
                : aConf && bConf;
            const status =
              data.roommate_status || (bothConf ? 'confirmed' : meConf || otherConf ? 'pending' : 'none');

            return {
              ...c,
              me_confirmed: meConf,
              other_confirmed: otherConf,
              both_confirmed: bothConf,
              roommate_status: status,
            };
          }
          return c;
        })
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('inbox_update', handleInboxUpdate);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('contact_status_changed', handleContactStatusChanged);
    socket.on('roommate_status_changed', handleRoommateStatusChanged);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('inbox_update', handleInboxUpdate);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('contact_status_changed', handleContactStatusChanged);
      socket.off('roommate_status_changed', handleRoommateStatusChanged);

      if (activeConvRef.current && socket.connected) {
        socket.emit('leave_conversation', { conversation_id: activeConvRef.current });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (selfTypingTimeoutRef.current) clearTimeout(selfTypingTimeoutRef.current);
    };
  }, [currentUserId]);

  /**
   * Toggle contact sharing consent for the active conversation.
   */
  const toggleShareContact = useCallback(
    async (share) => {
      if (!activeConversationId) return;
      try {
        setTogglingShare(true);
        setError(null);
        const res = await chatService.shareContact(activeConversationId, share);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  my_share: res.my_share,
                  other_shared: res.other_shared,
                  both_shared: res.both_shared,
                  contact_revealed: res.both_shared,
                }
              : c
          )
        );

        if (res.both_shared) {
          try {
            setLoadingContact(true);
            const contactRes = await chatService.getContact(activeConversationId);
            setContactDetails(contactRes.contact || { email: contactRes.email, phone: contactRes.phone });
          } catch {
            setContactDetails(null);
          } finally {
            setLoadingContact(false);
          }
        } else {
          setContactDetails(null);
        }

        return res;
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to update contact sharing'));
        throw err;
      } finally {
        setTogglingShare(false);
      }
    },
    [activeConversationId]
  );

  /**
   * Confirm roommate partnership for the active conversation.
   */
  const confirmRoommatesAction = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      setConfirmingRoommates(true);
      setError(null);
      const res = await chatService.confirmRoommates(activeConversationId);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                me_confirmed: res.me_confirmed,
                other_confirmed: res.other_confirmed,
                both_confirmed: res.both_confirmed,
                roommate_status: res.roommate_status,
              }
            : c
        )
      );

      return res;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to confirm roommate partnership'));
      throw err;
    } finally {
      setConfirmingRoommates(false);
    }
  }, [activeConversationId]);

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

    // Step 12 Contact & Roommate confirmation state and actions
    contactDetails,
    loadingContact,
    togglingShare,
    confirmingRoommates,
    toggleShareContact,
    confirmRoommates: confirmRoommatesAction,
  };
}

export default useChat;

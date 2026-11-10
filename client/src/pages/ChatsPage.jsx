import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useChat } from '../hooks/useChat.js';
import { useToast } from '../hooks/useToast.js';
import api from '../services/api.js';
import { getErrorMessage } from '../utils/error.js';

import ChatSidebar from '../components/chat/ChatSidebar.jsx';
import ChatHeader from '../components/chat/ChatHeader.jsx';
import ChatContactSharingBar from '../components/chat/ChatContactSharingBar.jsx';
import ChatMessageList from '../components/chat/ChatMessageList.jsx';
import ChatIcebreakers from '../components/chat/ChatIcebreakers.jsx';
import ChatMessageComposer from '../components/chat/ChatMessageComposer.jsx';
import ChatPartnerDrawer from '../components/chat/ChatPartnerDrawer.jsx';
import BlockConfirmModal from '../components/safety/BlockConfirmModal.jsx';
import ReportModal from '../components/safety/ReportModal.jsx';

export default function ChatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const composerRef = useRef(null);

  const [partnerDrawerOpen, setPartnerDrawerOpen] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    hasMoreMessages,
    isBlocked,
    setIsBlocked,
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
    clearError,
    // Step 12 Contact sharing and roommate confirmation
    contactDetails,
    loadingContact,
    togglingShare,
    confirmingRoommates,
    toggleShareContact,
    confirmRoommates,
  } = useChat();

  const candidateIdParam = searchParams.get('candidateId');
  const convIdParam = searchParams.get('conversationId');

  // Handle URL query parameters (?candidateId=... or ?conversationId=...)
  useEffect(() => {
    if (candidateIdParam) {
      startConversationWithCandidate(candidateIdParam).then(() => {
        // Clear param after initiating conversation
        setSearchParams({}, { replace: true });
      });
    } else if (convIdParam) {
      selectConversation(Number(convIdParam));
    }
  }, [candidateIdParam, convIdParam, startConversationWithCandidate, selectConversation, setSearchParams]);

  const partner = activeConversation?.other_user;

  const handleSelectIcebreaker = (prompt) => {
    composerRef.current?.setText(prompt);
  };

  const handleSendIcebreaker = (prompt) => {
    sendChatMessage(prompt);
  };

  const handleConfirmBlock = async () => {
    if (!partner?.id) return;
    try {
      setIsBlocking(true);
      await api.post('/api/blocks', { blocked_user_id: partner.id });
      setIsBlocked(true);
      toast.success(`${partner.full_name || 'User'} has been blocked.`);
      setShowBlockModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to block user.'));
    } finally {
      setIsBlocking(false);
    }
  };

  const handleConfirmReport = async ({ reason, details }) => {
    if (!partner?.id) return;
    try {
      setIsReporting(true);
      await api.post('/api/reports', {
        reported_user_id: partner.id,
        reason,
        details,
      });
      toast.success('Report submitted successfully. Our safety team will review it.');
      setShowReportModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit report.'));
      throw err;
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-50">
      {/* Left Sidebar: Conversations Inbox */}
      <div
        className={`${
          activeConversationId ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 flex-col shrink-0 h-full`}
      >
        <ChatSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelectConversation={selectConversation}
          currentUserId={user?.id}
          loading={loadingConversations}
        />
      </div>

      {/* Right Pane: Active Chat Window or Empty State */}
      <main
        className={`${
          activeConversationId ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col h-full bg-white overflow-hidden relative`}
        aria-label="Active Conversation Window"
      >
        {error && (
          <div className="bg-rose-50 border-b border-rose-200 text-rose-800 text-xs px-4 py-2.5 flex items-center justify-between shrink-0">
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-rose-500 hover:text-rose-800 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {activeConversationId && activeConversation ? (
          <>
            {/* Active Chat Header */}
            <ChatHeader
              partner={partner}
              socketConnected={socketConnected}
              partnerTyping={partnerTyping}
              onBack={() => selectConversation(null)}
              onOpenDetails={() => setPartnerDrawerOpen(true)}
              onBlock={() => setShowBlockModal(true)}
              onReport={() => setShowReportModal(true)}
            />

            {/* Blocked Conversation Banner */}
            {isBlocked && (
              <div
                role="alert"
                className="bg-rose-50 border-b border-rose-200 px-4 py-3 flex items-center gap-3 text-xs sm:text-sm text-rose-800 font-medium shrink-0 shadow-2xs"
              >
                <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span>This conversation is read-only because one of the users has been blocked. Messages and contact details cannot be exchanged.</span>
              </div>
            )}

            {/* Step 12: Mutual Contact Sharing & Roommate Confirmation Bar */}
            <ChatContactSharingBar
              conversation={activeConversation}
              partner={partner}
              contactDetails={contactDetails}
              loadingContact={loadingContact}
              togglingShare={togglingShare}
              confirmingRoommates={confirmingRoommates}
              onToggleShare={toggleShareContact}
              onConfirmRoommates={confirmRoommates}
            />

            {/* Messages Scroll Stream */}
            <ChatMessageList
              messages={messages}
              currentUserId={user?.id}
              partnerName={partner?.full_name}
              loading={loadingMessages}
              loadingMore={loadingMoreMessages}
              hasMore={hasMoreMessages}
              onLoadMore={loadOlderMessages}
              partnerTyping={partnerTyping}
            />

            {/* AI Icebreaker Suggestions */}
            {!isBlocked && (
              <ChatIcebreakers
                onSelectPrompt={handleSelectIcebreaker}
                onSendPrompt={handleSendIcebreaker}
              />
            )}

            {/* Message Composer Input */}
            <ChatMessageComposer
              ref={composerRef}
              onSendMessage={sendChatMessage}
              onTyping={emitTyping}
              isBlocked={isBlocked}
              sending={sendingMessage}
            />

            {/* Partner Details Drawer */}
            <ChatPartnerDrawer
              partner={partner}
              isOpen={partnerDrawerOpen}
              onClose={() => setPartnerDrawerOpen(false)}
            />
          </>
        ) : (
          /* Empty Chat Selected State (Desktop) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
            <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-100/80 text-teal-600 flex items-center justify-center shadow-xs mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Your Roommate Messages</h2>
            <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Select a conversation from the sidebar to chat in real time, or browse matches to connect with new student roommates.
            </p>
          </div>
        )}

        {/* Safety: Block Confirmation Modal */}
        <BlockConfirmModal
          isOpen={showBlockModal}
          userName={partner?.full_name || 'this student'}
          loading={isBlocking}
          onClose={() => setShowBlockModal(false)}
          onConfirm={handleConfirmBlock}
        />

        {/* Safety: Report User Modal */}
        <ReportModal
          isOpen={showReportModal}
          userName={partner?.full_name || 'this student'}
          loading={isReporting}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleConfirmReport}
        />
      </main>
    </div>
  );
}

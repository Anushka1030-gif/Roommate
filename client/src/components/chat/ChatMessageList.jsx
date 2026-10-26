import { useEffect, useRef } from 'react';
import ChatMessageBubble from './ChatMessageBubble.jsx';
import { formatDateDivider, isSameDay } from '../../utils/date.js';

export default function ChatMessageList({
  messages = [],
  currentUserId,
  partnerName,
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  partnerTyping = false,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const prevMessagesCountRef = useRef(messages.length);

  // Auto-scroll to bottom on initial load and when a new message is appended at bottom
  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (prevMessagesCountRef.current === 0 && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom when partner starts typing
  useEffect(() => {
    if (partnerTyping) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [partnerTyping]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading chat history...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-slate-50/60 to-white"
      aria-label="Message History"
    >
      {/* Load earlier messages button */}
      {hasMore && (
        <div className="text-center py-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-3.5 py-1.5 rounded-full shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <div className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading older messages...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Load earlier messages</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty State */}
      {messages.length === 0 && (
        <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-xs">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="max-w-xs">
            <h4 className="text-sm font-bold text-slate-800">
              Start chatting with {partnerName || 'Roommate'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Your contact details remain private until you both choose to share them. Say hello or pick an icebreaker below!
            </p>
          </div>
        </div>
      )}

      {/* Message stream with day grouping */}
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showDateDivider = !prevMessage || !isSameDay(prevMessage.created_at, message.created_at);

        return (
          <div key={message.id || index}>
            {showDateDivider && (
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-slate-200/80" />
                <span className="mx-3 text-[11px] font-semibold text-slate-400 bg-white px-3 py-0.5 rounded-full border border-slate-200/60 shadow-2xs">
                  {formatDateDivider(message.created_at)}
                </span>
                <div className="flex-grow border-t border-slate-200/80" />
              </div>
            )}
            <ChatMessageBubble
              message={message}
              isMe={message.sender_id === currentUserId}
              partnerName={partnerName}
            />
          </div>
        );
      })}

      {/* Partner Typing Bubble */}
      {partnerTyping && (
        <div className="flex items-end gap-2 animate-in fade-in duration-200">
          <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-semibold shrink-0 mb-1">
            {(partnerName || 'R')[0]?.toUpperCase()}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-4 py-2.5 shadow-xs flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium mr-1">{partnerName} is typing</span>
            <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

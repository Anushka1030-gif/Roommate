import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatConversationDate } from '../../utils/date.js';

export default function ChatSidebar({
  conversations = [],
  activeId,
  onSelectConversation,
  currentUserId,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations by candidate full name or college/city
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const name = c.other_user?.full_name?.toLowerCase() || '';
      const college = c.other_user?.college_name?.toLowerCase() || '';
      const city = c.other_user?.city?.toLowerCase() || '';
      return name.includes(query) || college.includes(query) || city.includes(query);
    });
  }, [conversations, searchQuery]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );

  return (
    <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200/90 flex flex-col shrink-0 h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Messages</h1>
          {totalUnread > 0 && (
            <span
              title={`${totalUnread} unread messages`}
              className="bg-teal-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-2xs"
            >
              {totalUnread}
            </span>
          )}
        </div>
        <Link
          to="/matches"
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
        >
          <span>Find Matches</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Search Filter Input */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="relative">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100" role="list">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            {searchQuery ? (
              <p className="text-xs">No conversations matching &ldquo;{searchQuery}&rdquo;</p>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-700">No conversations yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Connect with compatible roommates from your matches.
                </p>
                <Link
                  to="/matches"
                  className="mt-3 inline-block text-xs font-medium text-teal-700 hover:text-teal-900 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200"
                >
                  Browse Matches
                </Link>
              </div>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const partner = conv.other_user || {};
            const isActive = conv.id === activeId;
            const lastMsg = conv.last_message;
            const isMyLastMsg = lastMsg && lastMsg.sender_id === currentUserId;
            const initial = (partner.full_name || 'R')[0]?.toUpperCase();
            const dateStr = formatConversationDate(conv.last_message_at || conv.created_at);

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3.5 sm:p-4 flex items-start gap-3 transition-colors cursor-pointer relative group ${
                  isActive
                    ? 'bg-teal-50/80 border-l-4 border-l-teal-600'
                    : 'hover:bg-slate-50/90'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {initial}
                  </div>
                  {conv.unread_count > 0 && !isActive && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-600 rounded-full border-2 border-white ring-1 ring-teal-500/20" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <h3 className={`text-sm truncate ${isActive ? 'font-bold text-teal-950' : 'font-semibold text-slate-900'}`}>
                      {partner.full_name}
                    </h3>
                    <span className="text-[11px] text-slate-400 shrink-0 font-normal">
                      {dateStr}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate mb-1">
                    {[partner.college_name, partner.city].filter(Boolean).join(' • ')}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${conv.unread_count > 0 && !isActive ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                      {lastMsg ? (
                        <>
                          {isMyLastMsg && <span className="text-slate-400 font-normal">You: </span>}
                          {lastMsg.content}
                        </>
                      ) : (
                        <span className="italic text-slate-400">No messages yet</span>
                      )}
                    </p>

                    {conv.unread_count > 0 && !isActive && (
                      <span className="shrink-0 bg-teal-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

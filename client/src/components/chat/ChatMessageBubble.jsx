import { formatMessageTime } from '../../utils/date.js';

export default function ChatMessageBubble({ message, isMe, partnerName }) {
  const timeStr = formatMessageTime(message.created_at);

  if (isMe) {
    return (
      <div className="flex justify-end mb-2.5 group">
        <div className="max-w-[82%] sm:max-w-[72%] flex flex-col items-end">
          <div className="bg-gradient-to-tr from-teal-700 to-teal-600 text-white rounded-2xl rounded-br-xs px-4 py-2.5 shadow-xs transition-shadow">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words selection:bg-teal-900 selection:text-white">
              {message.content}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-400 select-none">
            <span>{timeStr}</span>
            {message.is_read ? (
              <span
                title="Read by partner"
                aria-label="Read"
                className="text-teal-600 flex items-center font-bold"
              >
                <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <svg className="w-3.5 h-3.5 inline -ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <span title="Delivered" aria-label="Delivered" className="text-slate-400">
                <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Incoming message from partner
  const initial = (partnerName || 'R')[0]?.toUpperCase();

  return (
    <div className="flex justify-start items-end gap-2 mb-2.5 group">
      <div
        className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-xs mb-4"
        title={partnerName}
      >
        {initial}
      </div>
      <div className="max-w-[82%] sm:max-w-[72%] flex flex-col items-start">
        <div className="bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-bl-xs px-4 py-2.5 shadow-xs">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-400 select-none">
          <span>{timeStr}</span>
        </div>
      </div>
    </div>
  );
}

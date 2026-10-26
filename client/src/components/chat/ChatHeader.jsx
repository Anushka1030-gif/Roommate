export default function ChatHeader({
  partner,
  socketConnected = false,
  partnerTyping = false,
  onBack,
  onOpenDetails,
}) {
  if (!partner) return null;

  const initial = (partner.full_name || 'R')[0]?.toUpperCase();

  return (
    <header className="px-4 py-3 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile back button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {initial}
          </div>
          {socketConnected && (
            <span
              title="Real-time connected"
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-500/20"
            />
          )}
        </div>

        {/* User Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {partner.full_name}
            </h2>
            {partnerTyping ? (
              <span className="text-xs font-semibold text-teal-600 animate-pulse">
                typing...
              </span>
            ) : socketConnected ? (
              <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded-full">
                Active
              </span>
            ) : null}
          </div>

          <p className="text-xs text-slate-500 truncate">
            {[partner.college_name || 'Student', partner.city || 'Bhopal']
              .filter(Boolean)
              .join(' • ')}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenDetails && (
          <button
            type="button"
            onClick={onOpenDetails}
            aria-label="View Roommate Profile"
            className="text-xs font-medium text-slate-700 hover:text-teal-800 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:inline">Profile</span>
          </button>
        )}
      </div>
    </header>
  );
}

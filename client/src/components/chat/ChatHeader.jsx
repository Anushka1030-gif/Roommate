import SafetyActionMenu from '../safety/SafetyActionMenu.jsx';

export default function ChatHeader({
  partner,
  socketConnected = false,
  partnerTyping = false,
  onBack,
  onOpenDetails,
  onBlock,
  onReport,
}) {
  if (!partner) return null;

  const initial = (partner.full_name || 'R')[0]?.toUpperCase();

  return (
    <header className="px-4 py-3 bg-surface border-b border-surface-border flex items-center justify-between shrink-0 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile back button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="md:hidden p-1.5 -ml-1 text-text-secondary hover:text-text-primary hover:bg-beige/60 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-peach-soft text-text-primary border border-peach/50 flex items-center justify-center font-bold text-sm shadow-xs">
            {initial}
          </div>
          {socketConnected && (
            <span
              title="Real-time connected"
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#5E9C76] border-2 border-white rounded-full ring-1 ring-[#5E9C76]/20"
            />
          )}
        </div>

        {/* User Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-text-primary truncate">
              {partner.full_name}
            </h2>
            {partnerTyping ? (
              <span className="text-xs font-semibold text-peach-deep animate-pulse">
                typing...
              </span>
            ) : socketConnected ? (
              <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-[#2E4E38] bg-[#5E9C76]/15 border border-[#5E9C76]/30 px-1.5 py-0.2 rounded-full">
                Active
              </span>
            ) : null}
          </div>

          <p className="text-xs text-text-secondary truncate">
            {[partner.college_name || 'Student', partner.city || 'Bhopal']
              .filter(Boolean)
              .join(' • ')}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenDetails && (
          <button
            type="button"
            onClick={onOpenDetails}
            aria-label="View Roommate Profile"
            className="text-xs font-medium text-text-primary hover:text-peach-deep bg-beige-50/70 hover:bg-peach-soft/40 border border-surface-border hover:border-peach/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 group"
          >
            <svg className="w-4 h-4 text-text-secondary/70 group-hover:text-peach-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:inline">Profile</span>
          </button>
        )}

        {(onBlock || onReport) && (
          <SafetyActionMenu
            userName={partner?.full_name || 'Roommate'}
            onBlock={onBlock}
            onReport={onReport}
          />
        )}
      </div>
    </header>
  );
}

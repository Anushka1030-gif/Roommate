export default function ChatPartnerDrawer({ partner, isOpen, onClose }) {
  if (!isOpen || !partner) return null;

  const initial = (partner.full_name || 'R')[0]?.toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Roommate details"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2C24]/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-surface rounded-2xl shadow-xl border border-surface-border max-w-sm w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-peach-soft text-text-primary border border-peach/50 flex items-center justify-center font-bold text-lg shadow-xs">
              {initial}
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {partner.full_name}
              </h3>
              <p className="text-xs text-text-secondary">
                {[partner.age ? `${partner.age} yrs` : null, partner.gender]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-beige/60 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Education & Location */}
        <div className="bg-beige-50/70 rounded-xl p-3.5 border border-surface-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">College / University:</span>
            <span className="font-semibold text-text-primary">{partner.college_name || 'Student'}</span>
          </div>
          {partner.major && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Major / Course:</span>
              <span className="font-semibold text-text-primary">{partner.major}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Target City:</span>
            <span className="font-semibold text-text-primary">{partner.city || 'Bhopal'}</span>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-3 rounded-xl bg-peach-soft/30 border border-peach/40 flex items-start gap-2 text-[11px] text-text-primary leading-relaxed">
          <svg className="w-4 h-4 text-peach-deep shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>
            Contact details (email and phone number) are hidden until both roommates agree to share contacts.
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-beige hover:bg-peach-soft/50 text-text-primary font-semibold text-xs rounded-xl border border-peach/30 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}

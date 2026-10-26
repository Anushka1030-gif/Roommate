export default function ChatPartnerDrawer({ partner, isOpen, onClose }) {
  if (!isOpen || !partner) return null;

  const initial = (partner.full_name || 'R')[0]?.toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Roommate details"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-sm w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {initial}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {partner.full_name}
              </h3>
              <p className="text-xs text-slate-500">
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
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Education & Location */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">College / University:</span>
            <span className="font-semibold text-slate-800">{partner.college_name || 'Student'}</span>
          </div>
          {partner.major && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Major / Course:</span>
              <span className="font-semibold text-slate-800">{partner.major}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Target City:</span>
            <span className="font-semibold text-slate-800">{partner.city || 'Bhopal'}</span>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/70 flex items-start gap-2 text-[11px] text-teal-900 leading-relaxed">
          <svg className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>
            Contact details (email and phone number) are hidden until both roommates agree to share contacts.
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function ToastContainer({ toasts = [], onRemove }) {
  if (!toasts || toasts.length === 0) {
    return null;
  }

  const variantIcons = {
    success: (
      <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-rose-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-sky-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const borderVariants = {
    success: 'border-l-4 border-l-emerald-500 border-slate-200/90',
    error: 'border-l-4 border-l-rose-500 border-slate-200/90',
    warning: 'border-l-4 border-l-amber-500 border-slate-200/90',
    info: 'border-l-4 border-l-sky-500 border-slate-200/90',
  };

  return (
    <div
      aria-live="polite"
      role="region"
      aria-label="Notifications"
      className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const type = toast.type || 'info';
        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto bg-white/95 backdrop-blur-md shadow-lg shadow-slate-900/10 rounded-xl p-4 border transition-all duration-200 flex items-start gap-3 ${borderVariants[type] || borderVariants.info}`}
          >
            <div className="pt-0.5">
              {variantIcons[type] || variantIcons.info}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <p className="text-sm font-semibold text-slate-900 leading-snug mb-0.5">
                  {toast.title}
                </p>
              )}
              <p className="text-sm text-slate-600 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

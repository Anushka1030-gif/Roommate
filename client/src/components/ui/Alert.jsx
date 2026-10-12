export default function Alert({
  variant = 'info',
  title,
  children,
  icon,
  onClose,
  className = '',
  ...props
}) {
  const variantStyles = {
    info: {
      wrapper: 'bg-sky-50/80 border-sky-200 text-sky-900',
      iconColor: 'text-sky-600',
      titleColor: 'text-sky-950',
      defaultIcon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    success: {
      wrapper: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
      iconColor: 'text-emerald-600',
      titleColor: 'text-emerald-950',
      defaultIcon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    warning: {
      wrapper: 'bg-amber-50/80 border-amber-200 text-amber-900',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-950',
      defaultIcon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    error: {
      wrapper: 'bg-rose-50/90 border-rose-200 text-rose-900',
      iconColor: 'text-rose-600',
      titleColor: 'text-rose-950',
      defaultIcon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  const style = variantStyles[variant] || variantStyles.info;

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 p-4 rounded-xl border text-sm transition-all duration-150 ${style.wrapper} ${className}`}
      {...props}
    >
      <div className={`shrink-0 mt-0.5 ${style.iconColor}`}>{icon || style.defaultIcon}</div>

      <div className="flex-1 space-y-0.5">
        {title && <h5 className={`font-semibold tracking-tight ${style.titleColor}`}>{title}</h5>}
        {children && <div className="text-sm leading-relaxed">{children}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition cursor-pointer"
          aria-label="Dismiss alert"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

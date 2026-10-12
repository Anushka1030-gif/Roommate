import { forwardRef } from 'react';

const Select = forwardRef(function Select(
  {
    id,
    name,
    value,
    onChange,
    options = [],
    placeholder,
    disabled = false,
    hasError = false,
    fullWidth = true,
    className = '',
    children,
    ...props
  },
  ref
) {
  const baseClasses =
    'rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed appearance-none cursor-pointer pr-10';

  const stateClasses = hasError
    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900'
    : 'border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-teal-600/20';

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <div className={`relative ${widthClass}`}>
      <select
        ref={ref}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : undefined}
        className={`${baseClasses} ${stateClasses} ${widthClass} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children ||
          options.map((opt) => {
            const optValue = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optValue} value={optValue}>
                {optLabel}
              </option>
            );
          })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
});

export default Select;

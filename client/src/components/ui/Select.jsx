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
    'rounded-xl border bg-beige-50/70 px-3.5 py-2.5 text-sm text-text-primary transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-beige-200/50 disabled:text-text-secondary/60 disabled:cursor-not-allowed appearance-none cursor-pointer pr-10';

  const stateClasses = hasError
    ? 'border-brand-error focus:border-brand-error focus:ring-brand-error/20 text-brand-error'
    : 'border-surface-border hover:border-peach focus:border-peach-deep focus:ring-peach-deep/20 focus:bg-white';

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
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-secondary">
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
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

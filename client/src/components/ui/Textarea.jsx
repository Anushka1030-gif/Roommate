import { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea(
  {
    id,
    name,
    value,
    onChange,
    rows = 3,
    placeholder,
    disabled = false,
    hasError = false,
    fullWidth = true,
    className = '',
    ...props
  },
  ref
) {
  const baseClasses =
    'rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed resize-y';

  const stateClasses = hasError
    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900'
    : 'border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-teal-600/20';

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <textarea
      ref={ref}
      id={id}
      name={name}
      rows={rows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={hasError ? 'true' : undefined}
      className={`${baseClasses} ${stateClasses} ${widthClass} ${className}`}
      {...props}
    />
  );
});

export default Textarea;

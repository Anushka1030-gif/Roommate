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
    'rounded-xl border bg-beige-50/70 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-beige-200/50 disabled:text-text-secondary/60 disabled:cursor-not-allowed resize-y';

  const stateClasses = hasError
    ? 'border-brand-error focus:border-brand-error focus:ring-brand-error/20 text-brand-error'
    : 'border-surface-border hover:border-peach focus:border-peach-deep focus:ring-peach-deep/20 focus:bg-white';

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

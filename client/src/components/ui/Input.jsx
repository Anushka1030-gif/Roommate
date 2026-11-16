import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    id,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
    disabled = false,
    hasError = false,
    fullWidth = true,
    leftIcon,
    rightIcon,
    className = '',
    ...props
  },
  ref
) {
  const baseClasses =
    'rounded-xl border bg-beige-50/70 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-beige-200/50 disabled:text-text-secondary/60 disabled:cursor-not-allowed';

  const stateClasses = hasError
    ? 'border-brand-error focus:border-brand-error focus:ring-brand-error/20 text-brand-error'
    : 'border-surface-border hover:border-peach focus:border-peach-deep focus:ring-peach-deep/20 focus:bg-white';

  const widthClass = fullWidth ? 'w-full' : '';
  const paddingLeft = leftIcon ? 'pl-10' : '';
  const paddingRight = rightIcon ? 'pr-10' : '';

  return (
    <div className={`relative ${widthClass}`}>
      {leftIcon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-secondary">
          {leftIcon}
        </div>
      )}
      <input
        ref={ref}
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : undefined}
        className={`${baseClasses} ${stateClasses} ${widthClass} ${paddingLeft} ${paddingRight} ${className}`}
        {...props}
      />
      {rightIcon && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-secondary">
          {rightIcon}
        </div>
      )}
    </div>
  );
});

export default Input;

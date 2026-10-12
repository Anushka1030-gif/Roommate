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
    'rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

  const stateClasses = hasError
    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900'
    : 'border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-teal-600/20';

  const widthClass = fullWidth ? 'w-full' : '';
  const paddingLeft = leftIcon ? 'pl-10' : '';
  const paddingRight = rightIcon ? 'pr-10' : '';

  return (
    <div className={`relative ${widthClass}`}>
      {leftIcon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
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
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
          {rightIcon}
        </div>
      )}
    </div>
  );
});

export default Input;

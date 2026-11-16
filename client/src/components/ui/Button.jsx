import Spinner from './Spinner.jsx';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed select-none rounded-xl cursor-pointer';

  const variantClasses = {
    primary:
      'bg-peach-deep hover:bg-peach-deeper active:bg-peach-deeper text-white shadow-xs focus:ring-peach-deep',
    secondary:
      'bg-beige hover:bg-beige-300 active:bg-beige-400 text-text-primary border border-peach focus:ring-peach-deep',
    outline:
      'bg-surface hover:bg-beige-50 active:bg-beige text-text-primary border border-surface-border shadow-xs focus:ring-peach-deep',
    danger:
      'bg-brand-error hover:opacity-90 active:opacity-100 text-white shadow-xs focus:ring-brand-error',
    ghost:
      'bg-transparent hover:bg-beige-100 active:bg-beige-200 text-text-primary focus:ring-peach-deep',
  };

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${
        sizeClasses[size] || sizeClasses.md
      } ${widthClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size={size === 'lg' ? 'md' : 'sm'} className="text-current" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

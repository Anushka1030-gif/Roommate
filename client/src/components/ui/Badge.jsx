export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) {
  const variantClasses = {
    primary: 'bg-peach-soft text-text-primary border-peach/60',
    secondary: 'bg-beige text-text-primary border-surface-border',
    peach: 'bg-peach text-text-primary border-peach-deep/40',
    success: 'bg-[#5E9C76]/15 text-[#2E4E38] border-[#5E9C76]/40',
    warning: 'bg-[#D9A441]/15 text-[#6B4B10] border-[#D9A441]/40',
    danger: 'bg-[#C75146]/15 text-[#6B241E] border-[#C75146]/40',
    neutral: 'bg-beige text-text-secondary border-surface-border',
    info: 'bg-peach-soft/60 text-text-primary border-peach/40',
  };

  const dotColorClasses = {
    primary: 'bg-peach-deep',
    secondary: 'bg-peach',
    peach: 'bg-peach-deep',
    success: 'bg-[#5E9C76]',
    warning: 'bg-[#D9A441]',
    danger: 'bg-[#C75146]',
    neutral: 'bg-text-secondary',
    info: 'bg-peach-deep',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${
        variantClasses[variant] || variantClasses.primary
      } ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            dotColorClasses[variant] || dotColorClasses.primary
          }`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

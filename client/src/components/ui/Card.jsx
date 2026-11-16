export default function Card({
  children,
  className = '',
  hover = false,
  as: Component = 'div',
  ...props
}) {
  const hoverClass = hover
    ? 'hover:border-peach hover:shadow-sm transition-all duration-200'
    : '';

  return (
    <Component
      className={`bg-surface border border-surface-border rounded-2xl shadow-xs overflow-hidden ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

Card.Header = function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-6 border-b border-surface-border/60 ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className = '', as: Component = 'h3', ...props }) {
  return (
    <Component
      className={`text-xl font-semibold text-text-primary tracking-tight ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

Card.Description = function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-sm text-text-secondary mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
};

Card.Body = function CardBody({ children, className = '', ...props }) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={`p-6 bg-beige-50/50 border-t border-surface-border/60 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

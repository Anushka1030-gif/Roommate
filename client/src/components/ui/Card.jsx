export default function Card({
  children,
  className = '',
  hover = false,
  as: Component = 'div',
  ...props
}) {
  const hoverClass = hover
    ? 'hover:border-slate-300 hover:shadow-md transition-all duration-200'
    : '';

  return (
    <Component
      className={`bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

Card.Header = function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-6 border-b border-slate-100 ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className = '', as: Component = 'h3', ...props }) {
  return (
    <Component
      className={`text-xl font-semibold text-slate-900 tracking-tight ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

Card.Description = function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-sm text-slate-500 mt-1 ${className}`} {...props}>
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
      className={`p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

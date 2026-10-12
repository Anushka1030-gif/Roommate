export default function Spinner({ size = 'md', className = '', label = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      role="status"
      className={`inline-flex items-center justify-center ${className}`}
      aria-label={label}
    >
      <div
        className={`${selectedSize} rounded-full border-slate-300 border-t-teal-600 animate-spin`}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

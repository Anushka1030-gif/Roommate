export default function Skeleton({
  className = '',
  circle = false,
  as: Component = 'div',
  ...props
}) {
  const shapeClass = circle ? 'rounded-full' : 'rounded-xl';

  return (
    <Component
      className={`animate-pulse bg-[#EADFCF] ${shapeClass} ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

import { cloneElement, isValidElement } from 'react';

export default function FormField({
  id,
  label,
  error,
  helperText,
  required = false,
  children,
  className = '',
}) {
  const errorId = id ? `${id}-error` : undefined;
  const helperId = id ? `${id}-helper` : undefined;

  let childWithProps = children;
  if (isValidElement(children)) {
    const existingProps = children.props || {};
    const isCustomComponent =
      typeof children.type === 'function' || typeof children.type === 'object';

    const childProps = {
      id: existingProps.id || id,
      'aria-describedby': error
        ? errorId
        : helperText
        ? helperId
        : existingProps['aria-describedby'],
    };

    if (isCustomComponent && existingProps.hasError === undefined) {
      childProps.hasError = Boolean(error);
    }

    childWithProps = cloneElement(children, childProps);
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 select-none"
        >
          {label}
          {required && (
            <span className="text-rose-500 ml-1 font-semibold" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {childWithProps}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-600 flex items-center gap-1 mt-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    icon: Icon,
    error,
    hint,
    className = '',
    large = false,
    id,
    ...props
  },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-surface-500 pointer-events-none" />
        )}
        <input
          id={id}
          ref={ref}
          className={`field ${large ? 'field-lg' : ''} ${Icon ? 'pl-12' : ''} ${error ? 'border-danger/60 focus:border-danger focus:ring-danger/15' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-[13px] text-surface-500">{hint}</p>}
    </div>
  );
});

export default Input;

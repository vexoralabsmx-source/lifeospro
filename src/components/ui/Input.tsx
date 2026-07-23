import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || React.useId();
  
  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="text-xs font-semibold text-text-secondary select-none tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-text-secondary pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-xl border bg-surface text-sm transition-all duration-200
            ${icon ? 'pl-11' : 'px-4'} py-3 text-text-primary placeholder:text-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-brand/20
            disabled:opacity-50 disabled:bg-surface-secondary/50 disabled:cursor-not-allowed
            ${error 
              ? 'border-danger focus:border-danger focus:ring-danger/20' 
              : 'border-border-primary focus:border-brand/80'
            }
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-[11px] text-danger font-medium animate-slide-up">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-[11px] text-text-secondary">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

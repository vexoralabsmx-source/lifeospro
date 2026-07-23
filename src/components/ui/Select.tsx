import React from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  error,
  helperText,
  icon,
  className = '',
  id,
  children,
  ...props
}, ref) => {
  const selectId = id || React.useId();
  
  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={selectId} 
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
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full rounded-xl border bg-surface text-sm transition-all duration-200 appearance-none
            ${icon ? 'pl-11' : 'px-4'} py-3 pr-10 text-text-primary placeholder:text-text-secondary/60
            focus:outline-none focus:ring-2 focus:ring-brand/20
            disabled:opacity-50 disabled:bg-surface-secondary/50 disabled:cursor-not-allowed
            ${error 
              ? 'border-danger focus:border-danger focus:ring-danger/20' 
              : 'border-border-primary focus:border-brand/80'
            }
          `}
          {...props}
        >
          {children || options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 pointer-events-none text-text-secondary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
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

Select.displayName = 'Select';

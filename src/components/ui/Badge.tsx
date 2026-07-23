import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'premium';
  size?: 'xs' | 'sm';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-full select-none';
  
  const variants = {
    brand: 'bg-brand-light text-brand border border-brand/10',
    success: 'bg-success-light text-success border border-success/10',
    warning: 'bg-warning-light text-warning border border-warning/10',
    danger: 'bg-danger-light text-danger border border-danger/10',
    neutral: 'bg-surface-secondary text-text-secondary border border-border-primary/60',
    premium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-[10px] tracking-wide',
    sm: 'px-2.5 py-1 text-xs'
  };

  return (
    <span
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

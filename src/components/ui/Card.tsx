import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'premium' | 'flat';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverable = false,
  className = '',
  ...props
}) => {
  const baseStyle = 'rounded-2xl border border-border-primary transition-all duration-200 overflow-hidden';
  
  const variants = {
    default: 'bg-surface shadow-sm',
    glass: 'glass shadow-sm border-border-primary/50',
    premium: 'bg-surface border-amber-500/20 shadow-md relative after:absolute after:inset-0 after:rounded-2xl after:border after:border-amber-500/10 after:pointer-events-none',
    flat: 'bg-surface-secondary border-transparent'
  };

  const hoverStyle = hoverable 
    ? 'hover:-translate-y-0.5 hover:shadow-md hover:border-border-primary/80 dark:hover:border-zinc-700/80 cursor-pointer' 
    : '';

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

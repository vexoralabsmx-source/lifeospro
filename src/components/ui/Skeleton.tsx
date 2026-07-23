import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'circle' | 'rect' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  className = '',
  ...props
}) => {
  const baseStyle = 'animate-pulse bg-zinc-200 dark:bg-zinc-800/80';
  
  const variants = {
    circle: 'rounded-full',
    rect: 'rounded-xl',
    text: 'rounded h-3 w-5/6 my-1'
  };

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

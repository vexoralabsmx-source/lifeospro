import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border-primary/60 rounded-2xl bg-surface-secondary/10 py-16 animate-slide-up">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center text-brand mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-heading font-bold text-base text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="secondary" className="px-5 py-2 text-xs">
          {actionText}
        </Button>
      )}
    </div>
  );
};

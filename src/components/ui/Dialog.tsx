import React, { useEffect } from 'react';
import { Button } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}) => {
  // Prevent body scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
      />

      {/* Content Container */}
      <div 
        className={`
          relative w-full bg-surface dark:bg-surface border border-border-primary/60 
          rounded-2xl shadow-premium animate-scale-in flex flex-col max-h-[90vh] overflow-hidden
          ${sizes[size]}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border-primary/40">
          <h3 className="font-heading font-bold text-lg text-text-primary">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-secondary/70 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer !== undefined ? (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-primary/40 bg-surface-secondary/20">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

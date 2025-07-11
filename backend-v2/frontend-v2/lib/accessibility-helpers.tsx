'use client';

import React, { useRef, useEffect, useState } from 'react';

// Screen reader helpers
export const screenReaderHelpers = {
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const element = document.createElement('div');
    element.setAttribute('aria-live', priority);
    element.setAttribute('aria-atomic', 'true');
    element.setAttribute('role', 'status');
    element.className = 'sr-only';
    element.textContent = message;
    
    document.body.appendChild(element);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(element);
    }, 1000);
  },

  announcePolite: (message: string) => {
    screenReaderHelpers.announce(message, 'polite');
  },

  announceUrgent: (message: string) => {
    screenReaderHelpers.announce(message, 'assertive');
  }
};

// Keyboard navigation helpers
export const keyboardHelpers = {
  onEnterOrSpace: (handler: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  },

  onEscape: (handler: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handler();
    }
  },

  trapFocus: (containerRef: React.RefObject<HTMLElement>) => {
    if (!containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleTabKey);

    return () => {
      containerRef.current?.removeEventListener('keydown', handleTabKey);
    };
  }
};

// Focus management hook
export const useFocusManagement = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus();
    }
  };

  return { saveFocus, restoreFocus };
};

// Screen reader announcement hook
export const useScreenReader = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const announce = (message: string) => {
    setAnnouncements(prev => [...prev, message]);
    
    // Clear announcement after delay
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 2000);
  };

  useEffect(() => {
    if (liveRegionRef.current && announcements.length > 0) {
      liveRegionRef.current.textContent = announcements[0];
    }
  }, [announcements]);

  const LiveRegion = () => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      role="status"
    />
  );

  return { announce, LiveRegion };
};

// Accessible form helpers
export const formHelpers = {
  generateId: (prefix: string = 'field') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  getAriaDescribedBy: (fieldId: string, hasError: boolean, hasHint: boolean) => {
    const describedBy = [];
    if (hasHint) describedBy.push(`${fieldId}-hint`);
    if (hasError) describedBy.push(`${fieldId}-error`);
    return describedBy.length > 0 ? describedBy.join(' ') : undefined;
  },

  getFieldValidationProps: (isValid: boolean, errorMessage?: string) => ({
    'aria-invalid': !isValid,
    'aria-describedby': errorMessage ? 'error-message' : undefined
  })
};

// ID generation utility
export const generateId = (prefix: string = 'element') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Accessible button component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = 'Loading...',
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 focus:outline-none focus:ring-2 
    focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
    disabled:pointer-events-none
  `;

  const variantClasses = {
    primary: `
      bg-primary-600 text-white hover:bg-primary-700 
      focus:ring-primary-500 active:bg-primary-800
    `,
    secondary: `
      bg-gray-200 text-gray-900 hover:bg-gray-300 
      focus:ring-gray-500 active:bg-gray-400
    `,
    ghost: `
      bg-transparent text-gray-700 hover:bg-gray-100 
      focus:ring-gray-500 active:bg-gray-200
    `
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

// Accessible input component
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  isRequired?: boolean;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  hint,
  error,
  isRequired = false,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || generateId('input');
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1">
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {isRequired && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {hint && (
        <p id={hintId} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
      
      <input
        id={inputId}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={isRequired}
        className={`
          block w-full px-3 py-2 border border-gray-300 rounded-md
          shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500
          focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Progress indicator hook
export const useProgressIndicator = (steps: string[], currentStep: number) => {
  const { announce } = useScreenReader();

  useEffect(() => {
    const stepName = steps[currentStep - 1];
    if (stepName) {
      announce(`Step ${currentStep} of ${steps.length}: ${stepName}`);
    }
  }, [currentStep, steps, announce]);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep - 1) return 'completed';
    if (stepIndex === currentStep - 1) return 'current';
    return 'upcoming';
  };

  return { getStepStatus };
};

// Accessible modal management
export const useAccessibleModal = (isOpen: boolean) => {
  const { saveFocus, restoreFocus } = useFocusManagement();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      saveFocus();
      
      // Focus first focusable element in modal
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);

      // Trap focus
      const cleanup = keyboardHelpers.trapFocus(modalRef);
      
      return () => {
        cleanup?.();
      };
    } else {
      restoreFocus();
    }
  }, [isOpen, saveFocus, restoreFocus]);

  return { modalRef };
};

// Live region component for announcements
export const LiveRegion: React.FC<{
  children: React.ReactNode;
  priority?: 'polite' | 'assertive';
}> = ({ children, priority = 'polite' }) => {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {children}
    </div>
  );
};

// Visually hidden component (screen reader only)
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
};

// High contrast mode detection hook
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isHighContrast;
};

// Reduced motion detection hook
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};
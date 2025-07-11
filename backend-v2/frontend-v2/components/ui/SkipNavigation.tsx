'use client';

import React from 'react';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

// Individual skip link component
export const SkipLink: React.FC<SkipLinkProps> = ({ 
  href, 
  children, 
  className = '' 
}) => {
  return (
    <a
      href={href}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
        focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
        focus:font-medium focus:text-sm focus:shadow-lg focus:transition-all
        focus:duration-200 focus:transform focus:scale-105
        ${className}
      `}
      onClick={(e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Focus the target element if it's focusable
          if (target instanceof HTMLElement && target.tabIndex >= 0) {
            target.focus();
          }
        }
      }}
    >
      {children}
    </a>
  );
};

// Skip navigation container for booking pages
export const BookingSkipNavigation: React.FC = () => {
  return (
    <nav 
      role="navigation" 
      aria-label="Skip navigation"
      className="sr-only focus-within:not-sr-only"
    >
      <ul className="fixed top-4 left-4 z-50 space-y-2">
        <li>
          <SkipLink href="#main-content">
            Skip to main content
          </SkipLink>
        </li>
        <li>
          <SkipLink href="#service-selection">
            Skip to service selection
          </SkipLink>
        </li>
        <li>
          <SkipLink href="#calendar-section">
            Skip to calendar
          </SkipLink>
        </li>
        <li>
          <SkipLink href="#time-slots">
            Skip to time slots
          </SkipLink>
        </li>
        <li>
          <SkipLink href="#booking-form">
            Skip to booking form
          </SkipLink>
        </li>
        <li>
          <SkipLink href="#booking-summary">
            Skip to booking summary
          </SkipLink>
        </li>
      </ul>
    </nav>
  );
};

// Skip navigation for dashboard pages
export const DashboardSkipNavigation: React.FC = () => {
  return (
    <nav 
      role="navigation" 
      aria-label="Skip navigation"
      className="sr-only focus-within:not-sr-only"
    >
      <ul className="fixed top-4 left-4 z-50 space-y-2">
        <li>
          <SkipLink href="#main-content">
            Skip to main content
          </SkipLink>
        </li>
        <li>
          <SkipLink href="#sidebar-navigation">
            Skip to sidebar navigation
          </SkipLink>
        </li>
        <li>
          <SkipLink href="#dashboard-stats">
            Skip to dashboard statistics
          </SkipLink>
        </li>
        <li>
          <SkipLink href="#appointments-list">
            Skip to appointments list
          </SkipLink>
        </li>
        <li>
          <SkipLink href="#quick-actions">
            Skip to quick actions
          </SkipLink>
        </li>
      </ul>
    </nav>
  );
};

// Generic skip navigation component
interface SkipNavigationProps {
  links: Array<{
    href: string;
    label: string;
  }>;
  ariaLabel?: string;
}

export const SkipNavigation: React.FC<SkipNavigationProps> = ({ 
  links, 
  ariaLabel = "Skip navigation" 
}) => {
  return (
    <nav 
      role="navigation" 
      aria-label={ariaLabel}
      className="sr-only focus-within:not-sr-only"
    >
      <ul className="fixed top-4 left-4 z-50 space-y-2">
        {links.map((link, index) => (
          <li key={`${link.href}-${index}`}>
            <SkipLink href={link.href}>
              {link.label}
            </SkipLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Content wrapper that provides landmark IDs
interface AccessibleContentProps {
  children: React.ReactNode;
  className?: string;
}

export const MainContent: React.FC<AccessibleContentProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <main 
      id="main-content" 
      role="main"
      tabIndex={-1}
      className={`focus:outline-none ${className}`}
    >
      {children}
    </main>
  );
};

export const ServiceSelection: React.FC<AccessibleContentProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <section 
      id="service-selection" 
      aria-labelledby="service-selection-heading"
      tabIndex={-1}
      className={`focus:outline-none ${className}`}
    >
      <h2 id="service-selection-heading" className="sr-only">
        Service Selection
      </h2>
      {children}
    </section>
  );
};

export const CalendarSection: React.FC<AccessibleContentProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <section 
      id="calendar-section" 
      aria-labelledby="calendar-section-heading"
      tabIndex={-1}
      className={`focus:outline-none ${className}`}
    >
      <h2 id="calendar-section-heading" className="sr-only">
        Date Selection Calendar
      </h2>
      {children}
    </section>
  );
};

export const TimeSlots: React.FC<AccessibleContentProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <section 
      id="time-slots" 
      aria-labelledby="time-slots-heading"
      tabIndex={-1}
      className={`focus:outline-none ${className}`}
    >
      <h2 id="time-slots-heading" className="sr-only">
        Available Time Slots
      </h2>
      {children}
    </section>
  );
};

export const BookingForm: React.FC<AccessibleContentProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <section 
      id="booking-form" 
      aria-labelledby="booking-form-heading"
      tabIndex={-1}
      className={`focus:outline-none ${className}`}
    >
      <h2 id="booking-form-heading" className="sr-only">
        Booking Information Form
      </h2>
      {children}
    </section>
  );
};

export const BookingSummary: React.FC<AccessibleContentProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <section 
      id="booking-summary" 
      aria-labelledby="booking-summary-heading"
      tabIndex={-1}
      className={`focus:outline-none ${className}`}
    >
      <h2 id="booking-summary-heading" className="sr-only">
        Booking Summary and Confirmation
      </h2>
      {children}
    </section>
  );
};

// Utility hook for managing skip link targets
export const useSkipLinkTargets = () => {
  const scrollToTarget = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Focus the element if it can receive focus
      if (element.tabIndex >= 0) {
        element.focus();
      } else {
        // Find the first focusable element within the target
        const focusableElement = element.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        
        if (focusableElement) {
          focusableElement.focus();
        }
      }
    }
  };

  return { scrollToTarget };
};

// Enhanced skip link with keyboard navigation
export const EnhancedSkipLink: React.FC<SkipLinkProps & {
  onActivate?: () => void;
}> = ({ href, children, className = '', onActivate }) => {
  const { scrollToTarget } = useSkipLinkTargets();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    scrollToTarget(targetId);
    onActivate?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const targetId = href.replace('#', '');
      scrollToTarget(targetId);
      onActivate?.();
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
        focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
        focus:font-medium focus:text-sm focus:shadow-lg focus:transition-all
        focus:duration-200 focus:transform focus:scale-105
        hover:bg-primary-700 active:bg-primary-800
        ${className}
      `}
      role="button"
      tabIndex={0}
    >
      {children}
    </a>
  );
};

// Skip navigation with keyboard shortcuts
export const KeyboardShortcutSkipNavigation: React.FC = () => {
  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Alt + number shortcuts for quick navigation
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const shortcuts: Record<string, string> = {
          '1': '#main-content',
          '2': '#service-selection', 
          '3': '#calendar-section',
          '4': '#time-slots',
          '5': '#booking-form',
          '6': '#booking-summary'
        };

        const target = shortcuts[e.key];
        if (target) {
          e.preventDefault();
          const element = document.querySelector(target) as HTMLElement;
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            element.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  return (
    <div className="sr-only">
      <p>
        Keyboard shortcuts: Alt+1 (main content), Alt+2 (services), 
        Alt+3 (calendar), Alt+4 (time slots), Alt+5 (form), Alt+6 (summary)
      </p>
    </div>
  );
};
'use client';

import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';

// Screen reader announcement types
export interface CalendarAnnouncement {
  message: string;
  priority: 'polite' | 'assertive';
  delay?: number;
}

// Calendar accessibility context
interface CalendarA11yContextType {
  announceToScreenReader: (announcement: CalendarAnnouncement) => void;
  focusedDate: Date | null;
  setFocusedDate: (date: Date | null) => void;
  keyboardMode: boolean;
  setKeyboardMode: (mode: boolean) => void;
}

const CalendarA11yContext = createContext<CalendarA11yContextType | undefined>(undefined);

// Calendar accessibility provider
export const CalendarA11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [announcements, setAnnouncements] = useState<CalendarAnnouncement[]>([]);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const announceToScreenReader = useCallback((announcement: CalendarAnnouncement) => {
    setAnnouncements(prev => [...prev, announcement]);
    
    // Clear announcement after delay
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a !== announcement));
    }, announcement.delay || 3000);
  }, []);

  // Update live region with latest announcement
  useEffect(() => {
    if (announcements.length > 0 && liveRegionRef.current) {
      const latest = announcements[announcements.length - 1];
      liveRegionRef.current.textContent = latest.message;
      liveRegionRef.current.setAttribute('aria-live', latest.priority);
    }
  }, [announcements]);

  return (
    <CalendarA11yContext.Provider value={{
      announceToScreenReader,
      focusedDate,
      setFocusedDate,
      keyboardMode,
      setKeyboardMode
    }}>
      {children}
      {/* Screen reader live region */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      />
    </CalendarA11yContext.Provider>
  );
};

// Hook to access calendar accessibility context
export const useCalendarA11y = () => {
  const context = useContext(CalendarA11yContext);
  if (!context) {
    throw new Error('useCalendarA11y must be used within CalendarA11yProvider');
  }
  return context;
};

// Calendar keyboard navigation hook
export const useCalendarKeyboardNavigation = (
  currentDate: Date,
  onDateSelect: (date: Date) => void,
  onMonthChange: (direction: 'prev' | 'next') => void,
  availableDates: Date[] = []
) => {
  const { announceToScreenReader, focusedDate, setFocusedDate, setKeyboardMode } = useCalendarA11y();

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!focusedDate) return;

    setKeyboardMode(true);
    let newDate = new Date(focusedDate);
    let shouldPreventDefault = true;
    let announcement: CalendarAnnouncement | null = null;

    switch (event.key) {
      case 'ArrowRight':
        // Move to next day
        newDate.setDate(newDate.getDate() + 1);
        announcement = {
          message: `Moved to ${newDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}`,
          priority: 'polite'
        };
        break;

      case 'ArrowLeft':
        // Move to previous day
        newDate.setDate(newDate.getDate() - 1);
        announcement = {
          message: `Moved to ${newDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}`,
          priority: 'polite'
        };
        break;

      case 'ArrowDown':
        // Move to same day next week
        newDate.setDate(newDate.getDate() + 7);
        announcement = {
          message: `Moved to ${newDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}`,
          priority: 'polite'
        };
        break;

      case 'ArrowUp':
        // Move to same day previous week
        newDate.setDate(newDate.getDate() - 7);
        announcement = {
          message: `Moved to ${newDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}`,
          priority: 'polite'
        };
        break;

      case 'Home':
        // Move to first day of month
        newDate.setDate(1);
        announcement = {
          message: `Moved to first day of ${newDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })}`,
          priority: 'polite'
        };
        break;

      case 'End':
        // Move to last day of month
        newDate.setMonth(newDate.getMonth() + 1, 0);
        announcement = {
          message: `Moved to last day of ${newDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })}`,
          priority: 'polite'
        };
        break;

      case 'PageUp':
        // Previous month
        event.preventDefault();
        onMonthChange('prev');
        announcement = {
          message: `Moved to previous month`,
          priority: 'polite'
        };
        return;

      case 'PageDown':
        // Next month
        event.preventDefault();
        onMonthChange('next');
        announcement = {
          message: `Moved to next month`,
          priority: 'polite'
        };
        return;

      case 'Enter':
      case ' ':
        // Select current date
        if (availableDates.some(date => 
          date.toDateString() === focusedDate.toDateString()
        )) {
          onDateSelect(focusedDate);
          announcement = {
            message: `Selected ${focusedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}`,
            priority: 'assertive'
          };
        } else {
          announcement = {
            message: `${focusedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })} is not available for booking`,
            priority: 'assertive'
          };
        }
        break;

      case 'Escape':
        // Clear focus
        setFocusedDate(null);
        setKeyboardMode(false);
        announcement = {
          message: 'Calendar navigation cleared',
          priority: 'polite'
        };
        break;

      default:
        shouldPreventDefault = false;
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    // Update focused date if it changed
    if (newDate.getTime() !== focusedDate.getTime() && 
        ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      setFocusedDate(newDate);
    }

    // Announce to screen reader
    if (announcement) {
      announceToScreenReader(announcement);
    }
  }, [focusedDate, onDateSelect, onMonthChange, availableDates, announceToScreenReader, setFocusedDate, setKeyboardMode]);

  return {
    handleKeyDown,
    focusedDate,
    setFocusedDate
  };
};

// Calendar instructions component
export const CalendarInstructions: React.FC = () => {
  return (
    <div className="sr-only" id="calendar-instructions">
      <p>
        Use arrow keys to navigate between dates. 
        Press Enter or Space to select a date. 
        Use Page Up and Page Down to navigate between months. 
        Press Home to go to the first day of the month, 
        End to go to the last day of the month.
        Press Escape to exit calendar navigation.
      </p>
    </div>
  );
};

// Skip link component for calendar
export const CalendarSkipLink: React.FC<{ targetId: string; label: string }> = ({ 
  targetId, 
  label 
}) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 
                 focus:bg-blue-600 focus:text-white focus:px-3 focus:py-2 focus:rounded-md 
                 focus:text-sm focus:font-medium focus:outline-none focus:ring-2 
                 focus:ring-blue-500 focus:ring-offset-2"
    >
      {label}
    </a>
  );
};

// Helper function to format date for screen readers
export const formatDateForScreenReader = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to get calendar cell aria-label
export const getCalendarCellAriaLabel = (
  date: Date, 
  isSelected: boolean, 
  isAvailable: boolean,
  isToday: boolean
): string => {
  let label = formatDateForScreenReader(date);
  
  if (isToday) {
    label += ', today';
  }
  
  if (isSelected) {
    label += ', selected';
  }
  
  if (!isAvailable) {
    label += ', not available';
  } else {
    label += ', available for booking';
  }
  
  return label;
};

// Missing exports that Calendar.tsx expects
export const useScreenReaderAnnouncement = () => {
  const { announceToScreenReader } = useCalendarA11y();
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader({ message, priority });
  }, [announceToScreenReader]);
  
  return { announce };
};

export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
};

export const useHighContrastMode = () => {
  const [highContrast, setHighContrast] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return highContrast;
};

// Alias for CalendarSkipLink to match the expected import
export const SkipToCalendar = CalendarSkipLink;
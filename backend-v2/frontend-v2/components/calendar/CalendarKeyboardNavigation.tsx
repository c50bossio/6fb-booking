'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useKeyboardShortcuts, KeyboardShortcut, SHORTCUT_PATTERNS } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { useToast } from '@/hooks/use-toast';

export type CalendarView = 'day' | 'week' | 'month';

interface CalendarKeyboardNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNewAppointment?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  onShowHelp?: () => void;
  selectedAppointmentId?: string;
  onSelectAppointment?: (id: string | null) => void;
  onEditAppointment?: (id: string) => void;
  onDeleteAppointment?: (id: string) => void;
  appointments?: Array<{ id: string; date: Date }>;
  enabled?: boolean;
}

export function CalendarKeyboardNavigation({
  currentDate,
  onDateChange,
  currentView,
  onViewChange,
  onNewAppointment,
  onSearch,
  onRefresh,
  onShowHelp,
  selectedAppointmentId,
  onSelectAppointment,
  onEditAppointment,
  onDeleteAppointment,
  appointments = [],
  enabled = true,
}: CalendarKeyboardNavigationProps) {
  const { toast } = useToast();
  const [showHelp, setShowHelp] = useState(false);
  const [focusedAppointmentIndex, setFocusedAppointmentIndex] = useState<number>(-1);

  // Stable navigation helpers with proper memoization
  const navigateDate = useCallback((direction: 'next' | 'prev', unit: 'day' | 'week' | 'month') => {
    const amount = direction === 'next' ? 1 : -1;
    let newDate: Date;

    switch (unit) {
      case 'day':
        newDate = addDays(currentDate, amount);
        break;
      case 'week':
        newDate = addWeeks(currentDate, amount);
        break;
      case 'month':
        newDate = addMonths(currentDate, amount);
        break;
    }

    onDateChange(newDate);
    
      // Announce to screen readers with more context
    const dayOfWeek = format(newDate, 'EEEE')
    const hasAppointments = appointments?.some(apt => 
      format(new Date(apt.date), 'yyyy-MM-dd') === format(newDate, 'yyyy-MM-dd')
    )
    const appointmentText = hasAppointments ? ', has appointments' : ', no appointments'
    const announcement = `Navigated to ${dayOfWeek}, ${format(newDate, 'MMMM d, yyyy')}${appointmentText}`
    announceToScreenReader(announcement)
  }, [currentDate, onDateChange]);

  // Appointment navigation with stable references
  const navigateAppointments = useCallback((direction: 'up' | 'down') => {
    if (appointments.length === 0) return;

    let newIndex: number;
    if (focusedAppointmentIndex === -1) {
      newIndex = direction === 'down' ? 0 : appointments.length - 1;
    } else {
      newIndex = direction === 'down' 
        ? (focusedAppointmentIndex + 1) % appointments.length
        : (focusedAppointmentIndex - 1 + appointments.length) % appointments.length;
    }

    setFocusedAppointmentIndex(newIndex);
    const appointment = appointments[newIndex];
    if (appointment && onSelectAppointment) {
      onSelectAppointment(appointment.id);
    }
  }, [appointments, focusedAppointmentIndex, onSelectAppointment]);

  // Stable callback for toast notifications
  const showToast = useCallback((title: string) => {
    toast({ title });
  }, [toast]);

  // Stable callback for view changes with announcements
  const handleViewChange = useCallback((view: CalendarView, announcement: string) => {
    onViewChange?.(view);
    announceToScreenReader(announcement);
  }, [onViewChange]);

  // Stable callback for today navigation
  const handleTodayNavigation = useCallback(() => {
    onDateChange(new Date());
    showToast('Navigated to today');
  }, [onDateChange, showToast]);

  // Enhanced keyboard navigation with focus management
  const handleNextPeriod = useCallback(() => {
    switch (currentView) {
      case 'day': 
        navigateDate('next', 'day')
        announceToScreenReader(`Moved to next day`)
        break
      case 'week': 
        navigateDate('next', 'week')
        announceToScreenReader(`Moved to next week`)
        break
      case 'month': 
        navigateDate('next', 'month')
        announceToScreenReader(`Moved to next month`)
        break
    }
  }, [currentView, navigateDate]);

  const handlePrevPeriod = useCallback(() => {
    switch (currentView) {
      case 'day': 
        navigateDate('prev', 'day')
        announceToScreenReader(`Moved to previous day`)
        break
      case 'week': 
        navigateDate('prev', 'week')
        announceToScreenReader(`Moved to previous week`)
        break
      case 'month': 
        navigateDate('prev', 'month')
        announceToScreenReader(`Moved to previous month`)
        break
    }
  }, [currentView, navigateDate]);

  const handleNavigateToStart = useCallback(() => {
    let newDate: Date;
    switch (currentView) {
      case 'day': newDate = currentDate; break;
      case 'week': newDate = startOfWeek(currentDate); break;
      case 'month': newDate = startOfMonth(currentDate); break;
    }
    onDateChange(newDate);
  }, [currentView, currentDate, onDateChange]);

  const handleNavigateToEnd = useCallback(() => {
    let newDate: Date;
    switch (currentView) {
      case 'day': newDate = currentDate; break;
      case 'week': newDate = endOfWeek(currentDate); break;
      case 'month': newDate = endOfMonth(currentDate); break;
    }
    onDateChange(newDate);
  }, [currentView, currentDate, onDateChange]);

  const handleRefreshAction = useCallback(() => {
    onRefresh?.();
    showToast('Calendar refreshed');
  }, [onRefresh, showToast]);

  const handleHelpAction = useCallback(() => {
    if (onShowHelp) {
      onShowHelp();
    } else {
      setShowHelp(true);
    }
  }, [onShowHelp]);

  const handleAppointmentSelect = useCallback(() => {
    if (focusedAppointmentIndex >= 0 && appointments[focusedAppointmentIndex]) {
      const appointment = appointments[focusedAppointmentIndex]
      const appointmentDate = format(appointment.date, 'MMMM d, h:mm a')
      
      if (selectedAppointmentId === appointment.id) {
        onSelectAppointment?.(null)
        announceToScreenReader(`Deselected appointment on ${appointmentDate}`)
      } else {
        onSelectAppointment?.(appointment.id)
        announceToScreenReader(`Selected appointment on ${appointmentDate}. Press Enter to edit, Delete to remove.`)
      }
    }
  }, [focusedAppointmentIndex, appointments, selectedAppointmentId, onSelectAppointment]);

  const handleAppointmentEdit = useCallback(() => {
    if (selectedAppointmentId && onEditAppointment) {
      onEditAppointment(selectedAppointmentId);
    }
  }, [selectedAppointmentId, onEditAppointment]);

  const handleAppointmentDelete = useCallback(() => {
    if (selectedAppointmentId && onDeleteAppointment) {
      if (confirm('Are you sure you want to delete this appointment?')) {
        onDeleteAppointment(selectedAppointmentId);
      }
    }
  }, [selectedAppointmentId, onDeleteAppointment]);

  // Memoized keyboard shortcuts array to prevent unnecessary re-renders
  const shortcuts = useMemo<KeyboardShortcut[]>(() => [
    // Navigation
    {
      ...SHORTCUT_PATTERNS.navigation.next,
      category: 'Navigation',
      action: handleNextPeriod,
    },
    {
      ...SHORTCUT_PATTERNS.navigation.previous,
      category: 'Navigation',
      action: handlePrevPeriod,
    },
    {
      ...SHORTCUT_PATTERNS.navigation.up,
      category: 'Navigation',
      description: 'Previous appointment',
      action: () => navigateAppointments('up'),
    },
    {
      ...SHORTCUT_PATTERNS.navigation.down,
      category: 'Navigation',
      description: 'Next appointment',
      action: () => navigateAppointments('down'),
    },
    {
      ...SHORTCUT_PATTERNS.navigation.pageUp,
      category: 'Navigation',
      description: 'Previous month',
      action: () => navigateDate('prev', 'month'),
    },
    {
      ...SHORTCUT_PATTERNS.navigation.pageDown,
      category: 'Navigation',
      description: 'Next month',
      action: () => navigateDate('next', 'month'),
    },
    {
      ...SHORTCUT_PATTERNS.navigation.home,
      category: 'Navigation',
      description: 'Start of period',
      action: handleNavigateToStart,
    },
    {
      ...SHORTCUT_PATTERNS.navigation.end,
      category: 'Navigation',
      description: 'End of period',
      action: handleNavigateToEnd,
    },

    // View shortcuts
    {
      ...SHORTCUT_PATTERNS.calendar.today,
      category: 'Calendar',
      action: handleTodayNavigation,
    },
    {
      ...SHORTCUT_PATTERNS.calendar.dayView,
      category: 'Views',
      action: () => handleViewChange('day', 'Switched to day view'),
    },
    {
      ...SHORTCUT_PATTERNS.calendar.weekView,
      category: 'Views',
      action: () => handleViewChange('week', 'Switched to week view'),
    },
    {
      ...SHORTCUT_PATTERNS.calendar.monthView,
      category: 'Views',
      action: () => handleViewChange('month', 'Switched to month view'),
    },

    // Actions
    {
      ...SHORTCUT_PATTERNS.actions.create,
      category: 'Actions',
      description: 'New appointment',
      action: () => onNewAppointment?.(),
      enabled: !!onNewAppointment,
    },
    {
      ...SHORTCUT_PATTERNS.actions.search,
      category: 'Actions',
      action: () => onSearch?.(),
      enabled: !!onSearch,
    },
    {
      ...SHORTCUT_PATTERNS.calendar.refresh,
      category: 'Actions',
      action: handleRefreshAction,
      enabled: !!onRefresh,
    },
    {
      ...SHORTCUT_PATTERNS.actions.help,
      category: 'Actions',
      action: handleHelpAction,
    },

    // Appointment actions
    {
      ...SHORTCUT_PATTERNS.actions.select,
      category: 'Appointment',
      description: 'Select/deselect',
      action: handleAppointmentSelect,
    },
    {
      ...SHORTCUT_PATTERNS.actions.open,
      category: 'Appointment',
      description: 'Open details',
      action: handleAppointmentEdit,
      enabled: !!selectedAppointmentId && !!onEditAppointment,
    },
    {
      ...SHORTCUT_PATTERNS.actions.edit,
      category: 'Appointment',
      action: handleAppointmentEdit,
      enabled: !!selectedAppointmentId && !!onEditAppointment,
    },
    {
      ...SHORTCUT_PATTERNS.actions.delete,
      category: 'Appointment',
      action: handleAppointmentDelete,
      enabled: !!selectedAppointmentId && !!onDeleteAppointment,
    },

    // Quick navigation (vim-style)
    {
      key: 'j',
      category: 'Quick Navigation',
      description: 'Next period (vim-style)',
      action: handleNextPeriod,
    },
    {
      key: 'k',
      category: 'Quick Navigation',
      description: 'Previous period (vim-style)',
      action: handlePrevPeriod,
    },
    {
      key: 'h',
      category: 'Quick Navigation',
      description: 'Previous day (vim-style)',
      action: () => {
        navigateDate('prev', 'day')
        announceToScreenReader('Moved to previous day')
      },
    },
    {
      key: 'l',
      category: 'Quick Navigation',
      description: 'Next day (vim-style)',
      action: () => {
        navigateDate('next', 'day')
        announceToScreenReader('Moved to next day')
      },
    },
    
    // Focus management shortcuts
    {
      key: 'f',
      category: 'Focus',
      description: 'Focus first appointment',
      action: () => {
        if (appointments.length > 0) {
          setFocusedAppointmentIndex(0)
          onSelectAppointment?.(appointments[0].id)
          announceToScreenReader(`Focused first appointment: ${format(appointments[0].date, 'MMMM d, h:mm a')}`)
        }
      },
    },
    {
      key: 'F',
      shift: true,
      category: 'Focus',
      description: 'Focus last appointment',
      action: () => {
        if (appointments.length > 0) {
          const lastIndex = appointments.length - 1
          setFocusedAppointmentIndex(lastIndex)
          onSelectAppointment?.(appointments[lastIndex].id)
          announceToScreenReader(`Focused last appointment: ${format(appointments[lastIndex].date, 'MMMM d, h:mm a')}`)
        }
      },
    },
  ], [
    handleNextPeriod,
    handlePrevPeriod,
    navigateAppointments,
    navigateDate,
    handleNavigateToStart,
    handleNavigateToEnd,
    handleTodayNavigation,
    handleViewChange,
    onNewAppointment,
    onSearch,
    handleRefreshAction,
    onRefresh,
    handleHelpAction,
    handleAppointmentSelect,
    handleAppointmentEdit,
    selectedAppointmentId,
    onEditAppointment,
    handleAppointmentDelete,
    onDeleteAppointment
  ]);

  // Use keyboard shortcuts
  useKeyboardShortcuts(shortcuts, { enabled });

  // Optimized effect to sync focused appointment with external selection
  useEffect(() => {
    if (selectedAppointmentId) {
      const index = appointments.findIndex(a => a.id === selectedAppointmentId);
      if (index !== -1 && index !== focusedAppointmentIndex) {
        setFocusedAppointmentIndex(index);
      }
    } else if (focusedAppointmentIndex !== -1) {
      setFocusedAppointmentIndex(-1);
    }
  }, [selectedAppointmentId, appointments, focusedAppointmentIndex]);

  return (
    <>
      {!onShowHelp && (
        <KeyboardShortcutsHelp
          shortcuts={shortcuts.filter(s => s.enabled !== false)}
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          title="Calendar Keyboard Shortcuts"
        />
      )}
      
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        <span id="calendar-announcement"></span>
      </div>
      
      {/* Enhanced keyboard navigation hints */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        <span id="keyboard-navigation-hints"></span>
      </div>
      
      {/* Keyboard shortcuts help */}
      <div className="sr-only" aria-live="polite">
        <span id="keyboard-shortcuts-help">
          Calendar keyboard shortcuts: Arrow keys to navigate dates, 
          J/K for next/previous period, H/L for previous/next day, 
          Tab to focus appointments, Enter to select, 
          F to focus first appointment, Shift+F for last appointment,
          ? for help, Escape to cancel.
        </span>
      </div>
      
      {/* Focus indicators for keyboard users */}
      <style jsx>{`
        .calendar-nav-button:focus,
        .calendar-action-button:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        
        @media (prefers-contrast: high) {
          .calendar-nav-button:focus,
          .calendar-action-button:focus {
            outline: 3px solid #000;
            outline-offset: 2px;
            box-shadow: 0 0 0 1px #fff, 0 0 0 4px #000;
          }
        }
        
        /* Enhanced focus visibility for appointment cards */
        .appointment-card:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 1px;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        
        @media (prefers-contrast: high) {
          .appointment-card:focus {
            outline: 3px solid #000;
            box-shadow: 0 0 0 1px #fff, 0 0 0 5px #000;
          }
        }
      `}</style>
      
      {/* Focus trap for keyboard users */}
      <div 
        className="sr-only" 
        tabIndex={-1}
        onFocus={() => {
          // If user tabs backwards into this element, move focus to last focusable element
          const lastFocusable = document.querySelector('[data-calendar-last-focusable]') as HTMLElement
          lastFocusable?.focus()
        }}
      />
    </>
  );
}

// Helper function for screen reader announcements
function announceToScreenReader(message: string) {
  const announcement = document.getElementById('calendar-announcement');
  if (announcement) {
    announcement.textContent = message;
    // Clear after announcement
    setTimeout(() => {
      announcement.textContent = '';
    }, 1000);
  }
}

// Export types and helpers
export { formatShortcut } from '@/hooks/useKeyboardShortcuts';
export type { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
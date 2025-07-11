'use client';

import { useCallback, useEffect, useState } from 'react';
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

  // Navigation helpers
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
    
    // Announce to screen readers
    const announcement = `Navigated to ${format(newDate, 'MMMM d, yyyy')}`;
    announceToScreenReader(announcement);
  }, [currentDate, onDateChange]);

  // Appointment navigation
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

  // Define all keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    {
      ...SHORTCUT_PATTERNS.navigation.next,
      category: 'Navigation',
      action: () => {
        switch (currentView) {
          case 'day': navigateDate('next', 'day'); break;
          case 'week': navigateDate('next', 'week'); break;
          case 'month': navigateDate('next', 'month'); break;
        }
      },
    },
    {
      ...SHORTCUT_PATTERNS.navigation.previous,
      category: 'Navigation',
      action: () => {
        switch (currentView) {
          case 'day': navigateDate('prev', 'day'); break;
          case 'week': navigateDate('prev', 'week'); break;
          case 'month': navigateDate('prev', 'month'); break;
        }
      },
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
      action: () => {
        let newDate: Date;
        switch (currentView) {
          case 'day': newDate = currentDate; break;
          case 'week': newDate = startOfWeek(currentDate); break;
          case 'month': newDate = startOfMonth(currentDate); break;
        }
        onDateChange(newDate);
      },
    },
    {
      ...SHORTCUT_PATTERNS.navigation.end,
      category: 'Navigation',
      description: 'End of period',
      action: () => {
        let newDate: Date;
        switch (currentView) {
          case 'day': newDate = currentDate; break;
          case 'week': newDate = endOfWeek(currentDate); break;
          case 'month': newDate = endOfMonth(currentDate); break;
        }
        onDateChange(newDate);
      },
    },

    // View shortcuts
    {
      ...SHORTCUT_PATTERNS.calendar.today,
      category: 'Calendar',
      action: () => {
        onDateChange(new Date());
        toast({ title: 'Navigated to today' });
      },
    },
    {
      ...SHORTCUT_PATTERNS.calendar.dayView,
      category: 'Views',
      action: () => {
        onViewChange('day');
        announceToScreenReader('Switched to day view');
      },
    },
    {
      ...SHORTCUT_PATTERNS.calendar.weekView,
      category: 'Views',
      action: () => {
        onViewChange('week');
        announceToScreenReader('Switched to week view');
      },
    },
    {
      ...SHORTCUT_PATTERNS.calendar.monthView,
      category: 'Views',
      action: () => {
        onViewChange('month');
        announceToScreenReader('Switched to month view');
      },
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
      action: () => {
        onRefresh?.();
        toast({ title: 'Calendar refreshed' });
      },
      enabled: !!onRefresh,
    },
    {
      ...SHORTCUT_PATTERNS.actions.help,
      category: 'Actions',
      action: () => {
        if (onShowHelp) {
          onShowHelp();
        } else {
          setShowHelp(true);
        }
      },
    },

    // Appointment actions
    {
      ...SHORTCUT_PATTERNS.actions.select,
      category: 'Appointment',
      description: 'Select/deselect',
      action: () => {
        if (focusedAppointmentIndex >= 0 && appointments[focusedAppointmentIndex]) {
          const appointment = appointments[focusedAppointmentIndex];
          if (selectedAppointmentId === appointment.id) {
            onSelectAppointment?.(null);
          } else {
            onSelectAppointment?.(appointment.id);
          }
        }
      },
    },
    {
      ...SHORTCUT_PATTERNS.actions.open,
      category: 'Appointment',
      description: 'Open details',
      action: () => {
        if (selectedAppointmentId && onEditAppointment) {
          onEditAppointment(selectedAppointmentId);
        }
      },
      enabled: !!selectedAppointmentId && !!onEditAppointment,
    },
    {
      ...SHORTCUT_PATTERNS.actions.edit,
      category: 'Appointment',
      action: () => {
        if (selectedAppointmentId && onEditAppointment) {
          onEditAppointment(selectedAppointmentId);
        }
      },
      enabled: !!selectedAppointmentId && !!onEditAppointment,
    },
    {
      ...SHORTCUT_PATTERNS.actions.delete,
      category: 'Appointment',
      action: () => {
        if (selectedAppointmentId && onDeleteAppointment) {
          if (confirm('Are you sure you want to delete this appointment?')) {
            onDeleteAppointment(selectedAppointmentId);
          }
        }
      },
      enabled: !!selectedAppointmentId && !!onDeleteAppointment,
    },

    // Quick navigation
    {
      key: 'j',
      category: 'Quick Navigation',
      description: 'Next period',
      action: () => {
        switch (currentView) {
          case 'day': navigateDate('next', 'day'); break;
          case 'week': navigateDate('next', 'week'); break;
          case 'month': navigateDate('next', 'month'); break;
        }
      },
    },
    {
      key: 'k',
      category: 'Quick Navigation',
      description: 'Previous period',
      action: () => {
        switch (currentView) {
          case 'day': navigateDate('prev', 'day'); break;
          case 'week': navigateDate('prev', 'week'); break;
          case 'month': navigateDate('prev', 'month'); break;
        }
      },
    },
    {
      key: 'h',
      category: 'Quick Navigation',
      description: 'Previous day',
      action: () => navigateDate('prev', 'day'),
    },
    {
      key: 'l',
      category: 'Quick Navigation',
      description: 'Next day',
      action: () => navigateDate('next', 'day'),
    },
  ];

  // Use keyboard shortcuts
  useKeyboardShortcuts(shortcuts, { enabled });

  // Reset focused appointment when selection changes externally
  useEffect(() => {
    if (selectedAppointmentId) {
      const index = appointments.findIndex(a => a.id === selectedAppointmentId);
      if (index !== -1) {
        setFocusedAppointmentIndex(index);
      }
    }
  }, [selectedAppointmentId, appointments]);

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
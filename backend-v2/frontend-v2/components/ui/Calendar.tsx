'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  CalendarA11yProvider,
  useCalendarA11y,
  useCalendarKeyboardNavigation,
  useScreenReaderAnnouncement,
  useReducedMotion,
  useHighContrastMode,
  CalendarInstructions,
  SkipToCalendar
} from '../calendar/CalendarAccessibility.tsx';

export interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | null;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  classNames?: {
    months?: string;
    month?: string;
    caption?: string;
    caption_label?: string;
    nav?: string;
    nav_button?: string;
    nav_button_previous?: string;
    nav_button_next?: string;
    table?: string;
    head_row?: string;
    head_cell?: string;
    row?: string;
    cell?: string;
    day?: string;
    day_selected?: string;
    day_today?: string;
    day_outside?: string;
    day_disabled?: string;
  };
  showOutsideDays?: boolean;
  numberOfMonths?: number;
  // Accessibility props
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  minDate?: Date;
  maxDate?: Date;
  onMonthChange?: (date: Date) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Internal accessible calendar component
function AccessibleCalendar({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className,
  classNames,
  showOutsideDays = true,
  numberOfMonths = 1,
  id = 'calendar',
  ariaLabel = 'Calendar',
  ariaDescribedBy,
  minDate,
  maxDate,
  onMonthChange,
  ...props
}: CalendarProps) {
  const { announceToScreenReader, currentFocusDate, setCurrentFocusDate, isKeyboardNavigating } = useCalendarA11y();
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncement();
  const prefersReducedMotion = useReducedMotion();
  const isHighContrast = useHighContrastMode();
  
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    if (selected && selected instanceof Date) {
      return new Date(selected.getFullYear(), selected.getMonth(), 1);
    }
    return new Date();
  });

  const [focusedDate, setFocusedDate] = React.useState<Date | null>(
    selected instanceof Date ? selected : new Date()
  );

  const calendarRef = React.useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Enhanced month navigation with accessibility announcements
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      
      // Announce month change to screen readers
      const monthName = MONTHS[newMonth.getMonth()];
      const year = newMonth.getFullYear();
      announce(`Navigated to ${monthName} ${year}`);
      
      // Call external month change handler
      if (onMonthChange) {
        onMonthChange(newMonth);
      }
      
      return newMonth;
    });
  };

  // Keyboard navigation setup
  const { handleKeyDown } = useCalendarKeyboardNavigation({
    selectedDate: focusedDate,
    onDateSelect: (date: Date) => {
      setFocusedDate(date);
      setCurrentFocusDate(date);
      if (onSelect) {
        onSelect(date);
      }
    },
    onMonthChange: navigateMonth,
    minDate,
    maxDate,
  });

  // Handle keyboard events on the calendar container
  React.useEffect(() => {
    const handleCalendarKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events when the calendar is focused
      if (calendarRef.current?.contains(document.activeElement)) {
        handleKeyDown(e);
      }
    };

    document.addEventListener('keydown', handleCalendarKeyDown);
    return () => document.removeEventListener('keydown', handleCalendarKeyDown);
  }, [handleKeyDown]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, firstDay };
  };

  const isDateSelected = (date: Date) => {
    if (!selected) return false;
    if (selected instanceof Date) {
      return date.toDateString() === selected.toDateString();
    }
    return false;
  };

  const isDateToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isDateDisabled = (date: Date) => {
    if (disabled && disabled(date)) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isDateFocused = (date: Date) => {
    return focusedDate?.toDateString() === date.toDateString();
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    
    setFocusedDate(date);
    setCurrentFocusDate(date);
    
    if (onSelect) {
      onSelect(date);
    }

    // Announce selection to screen readers
    const dateString = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const announcements = [dateString];
    if (isDateToday(date)) announcements.push('Today');
    announce(`Selected ${announcements.join(', ')}`);
  };

  const renderMonth = (monthDate: Date, monthIndex: number) => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(monthDate);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    // Previous month's trailing days
    const prevMonth = new Date(year, month - 1);
    const prevMonthDays = new Date(year, month, 0).getDate();
    const prevMonthTrailingDays = startingDayOfWeek;

    // Next month's leading days
    const totalCells = 42; // 6 weeks * 7 days
    const nextMonthLeadingDays = totalCells - (prevMonthTrailingDays + daysInMonth);

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add previous month's trailing days
    if (showOutsideDays) {
      for (let i = prevMonthTrailingDays - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        days.push({
          date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day),
          isCurrentMonth: false
        });
      }
    } else {
      for (let i = 0; i < prevMonthTrailingDays; i++) {
        days.push({
          date: new Date(),
          isCurrentMonth: false
        });
      }
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }

    // Add next month's leading days
    if (showOutsideDays) {
      const nextMonth = new Date(year, month + 1);
      for (let day = 1; day <= nextMonthLeadingDays; day++) {
        days.push({
          date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day),
          isCurrentMonth: false
        });
      }
    }

    return (
      <div key={monthIndex} className={cn('space-y-4', classNames?.month)}>
        {/* Month header */}
        <div className={cn('flex items-center justify-between', classNames?.caption)}>
          {monthIndex === 0 && (
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className={cn(
                'p-3 sm:p-2 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200',
                'touch-manipulation select-none active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                isHighContrast 
                  ? 'border-2 border-gray-800 hover:bg-gray-100' 
                  : 'hover:bg-gray-100',
                prefersReducedMotion ? '' : 'transform hover:scale-105',
                classNames?.nav_button,
                classNames?.nav_button_previous
              )}
              aria-label={`Previous month, go to ${MONTHS[month === 0 ? 11 : month - 1]} ${month === 0 ? year - 1 : year}`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          
          <h2 
            className={cn('text-lg font-semibold', classNames?.caption_label)}
            id={`${id}-month-${monthIndex}`}
            aria-live="polite"
          >
            {MONTHS[month]} {year}
          </h2>
          
          {monthIndex === numberOfMonths - 1 && (
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className={cn(
                'p-3 sm:p-2 min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200',
                'touch-manipulation select-none active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                isHighContrast 
                  ? 'border-2 border-gray-800 hover:bg-gray-100' 
                  : 'hover:bg-gray-100',
                prefersReducedMotion ? '' : 'transform hover:scale-105',
                classNames?.nav_button,
                classNames?.nav_button_next
              )}
              aria-label={`Next month, go to ${MONTHS[month === 11 ? 0 : month + 1]} ${month === 11 ? year + 1 : year}`}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Calendar grid */}
        <div 
          role="grid" 
          className={cn('space-y-2', classNames?.table)}
          aria-labelledby={`${id}-month-${monthIndex}`}
          aria-describedby={ariaDescribedBy}
        >
          {/* Weekday headers */}
          <div 
            role="row" 
            className={cn('grid grid-cols-7 gap-0', classNames?.head_row)}
          >
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                role="columnheader"
                className={cn(
                  'text-center text-sm font-medium text-gray-600 p-2',
                  isHighContrast ? 'text-gray-900 font-bold' : '',
                  classNames?.head_cell
                )}
                aria-label={WEEKDAYS_FULL[index]}
              >
                <abbr title={WEEKDAYS_FULL[index]} aria-hidden="true">
                  {day}
                </abbr>
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="space-y-1">
            {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
              <div 
                key={weekIndex} 
                role="row" 
                className={cn('grid grid-cols-7 gap-0', classNames?.row)}
              >
                {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((dayObj, dayIndex) => {
                  const { date, isCurrentMonth } = dayObj;
                  const isSelected = isDateSelected(date);
                  const isToday = isDateToday(date);
                  const isDisabled = isDateDisabled(date);
                  const isFocused = isDateFocused(date);
                  const isOutside = !isCurrentMonth;

                  if (!showOutsideDays && isOutside) {
                    return (
                      <div 
                        key={dayIndex} 
                        role="gridcell" 
                        className="aspect-square p-1" 
                        aria-hidden="true"
                      />
                    );
                  }

                  // Create comprehensive ARIA label
                  const dateString = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                  
                  const ariaLabelParts = [dateString];
                  if (isToday) ariaLabelParts.push('Today');
                  if (isSelected) ariaLabelParts.push('Selected');
                  if (isOutside) ariaLabelParts.push('Outside current month');
                  if (isDisabled) ariaLabelParts.push('Unavailable');

                  return (
                    <div 
                      key={dayIndex} 
                      role="gridcell"
                      className={cn('aspect-square p-1', classNames?.cell)}
                    >
                      <button
                        type="button"
                        onClick={() => handleDateClick(date)}
                        disabled={isDisabled}
                        tabIndex={isFocused ? 0 : -1}
                        aria-label={ariaLabelParts.join(', ')}
                        aria-pressed={isSelected}
                        aria-current={isToday ? 'date' : undefined}
                        aria-disabled={isDisabled}
                        className={cn(
                          'relative w-full h-full min-h-[44px] rounded-lg font-medium text-sm transition-all',
                          'touch-manipulation select-none active:scale-95',
                          prefersReducedMotion ? 'duration-0' : 'duration-200',
                          'focus:outline-none focus:ring-2 focus:ring-offset-2',
                          isHighContrast 
                            ? 'focus:ring-gray-900 border-2 border-transparent' 
                            : 'focus:ring-primary-500',
                          {
                            'text-gray-300 cursor-not-allowed': isDisabled,
                            'text-gray-400 hover:bg-gray-50': isOutside && !isSelected && !isDisabled,
                            'bg-primary-600 text-white hover:bg-primary-700': isSelected,
                            'bg-primary-50 text-primary-600 font-semibold ring-2 ring-primary-200': isToday && !isSelected,
                            'hover:bg-gray-100 cursor-pointer': !isDisabled && !isSelected,
                            'ring-2 ring-primary-500': isFocused && isKeyboardNavigating,
                          },
                          isHighContrast && {
                            'border-gray-900': isSelected || isToday,
                            'bg-white text-black': !isSelected && !isToday && !isDisabled,
                          },
                          classNames?.day,
                          isSelected && classNames?.day_selected,
                          isToday && classNames?.day_today,
                          isOutside && classNames?.day_outside,
                          isDisabled && classNames?.day_disabled
                        )}
                      >
                        <span aria-hidden="true">
                          {isCurrentMonth || showOutsideDays ? date.getDate() : ''}
                        </span>
                        {/* Screen reader only content for better context */}
                        <span className="sr-only">
                          {ariaLabelParts.join(', ')}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={calendarRef}
      id={id}
      className={cn(
        'p-3 sm:p-4 bg-white rounded-lg border border-gray-200 shadow-sm',
        isHighContrast ? 'border-4 border-gray-900' : '',
        className
      )}
      role="application"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      <SkipToCalendar targetId={id} />
      <CalendarInstructions id={`${id}-instructions`} />
      
      <div className={cn('space-y-6', classNames?.months)}>
        {Array.from({ length: numberOfMonths }).map((_, index) => {
          const monthDate = new Date(currentMonth);
          monthDate.setMonth(monthDate.getMonth() + index);
          return renderMonth(monthDate, index);
        })}
      </div>
      
      <AnnouncementRegion />
    </div>
  );
}

// Main Calendar component with accessibility provider
export function Calendar(props: CalendarProps) {
  return (
    <CalendarA11yProvider>
      <AccessibleCalendar {...props} />
    </CalendarA11yProvider>
  );
}

// Default export for lazy loading compatibility
export default Calendar;
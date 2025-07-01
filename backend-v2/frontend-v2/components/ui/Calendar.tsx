'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className,
  classNames,
  showOutsideDays = true,
  numberOfMonths = 1,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    if (selected && selected instanceof Date) {
      return new Date(selected.getFullYear(), selected.getMonth(), 1);
    }
    return new Date();
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

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
    return disabled ? disabled(date) : false;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    if (onSelect) {
      onSelect(date);
    }
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
                'p-2 hover:bg-gray-100 rounded-lg transition-colors',
                classNames?.nav_button,
                classNames?.nav_button_previous
              )}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          
          <h2 className={cn('text-lg font-semibold', classNames?.caption_label)}>
            {MONTHS[month]} {year}
          </h2>
          
          {monthIndex === numberOfMonths - 1 && (
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className={cn(
                'p-2 hover:bg-gray-100 rounded-lg transition-colors',
                classNames?.nav_button,
                classNames?.nav_button_next
              )}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Calendar grid */}
        <div className={cn('space-y-2', classNames?.table)}>
          {/* Weekday headers */}
          <div className={cn('grid grid-cols-7 gap-0', classNames?.head_row)}>
            {WEEKDAYS.map(day => (
              <div
                key={day}
                className={cn(
                  'text-center text-sm font-medium text-gray-600 p-2',
                  classNames?.head_cell
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="space-y-1">
            {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
              <div key={weekIndex} className={cn('grid grid-cols-7 gap-0', classNames?.row)}>
                {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((dayObj, dayIndex) => {
                  const { date, isCurrentMonth } = dayObj;
                  const isSelected = isDateSelected(date);
                  const isToday = isDateToday(date);
                  const isDisabled = isDateDisabled(date);
                  const isOutside = !isCurrentMonth;

                  if (!showOutsideDays && isOutside) {
                    return (
                      <div key={dayIndex} className="aspect-square p-1" />
                    );
                  }

                  return (
                    <div key={dayIndex} className={cn('aspect-square p-1', classNames?.cell)}>
                      <button
                        type="button"
                        onClick={() => handleDateClick(date)}
                        disabled={isDisabled}
                        className={cn(
                          'relative w-full h-full rounded-lg font-medium text-sm transition-all duration-200',
                          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                          {
                            'text-gray-300 cursor-not-allowed hover:bg-transparent': isDisabled,
                            'text-gray-400': isOutside && !isSelected && !isDisabled,
                            'bg-blue-600 text-white hover:bg-blue-700': isSelected,
                            'bg-blue-50 text-blue-600 font-semibold': isToday && !isSelected,
                            'cursor-pointer': !isDisabled,
                          },
                          classNames?.day,
                          isSelected && classNames?.day_selected,
                          isToday && classNames?.day_today,
                          isOutside && classNames?.day_outside,
                          isDisabled && classNames?.day_disabled
                        )}
                      >
                        {isCurrentMonth || showOutsideDays ? date.getDate() : ''}
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
      className={cn('p-4 bg-white rounded-lg border border-gray-200 shadow-sm', className)}
      {...props}
    >
      <div className={cn('space-y-6', classNames?.months)}>
        {Array.from({ length: numberOfMonths }).map((_, index) => {
          const monthDate = new Date(currentMonth);
          monthDate.setMonth(monthDate.getMonth() + index);
          return renderMonth(monthDate, index);
        })}
      </div>
    </div>
  );
}
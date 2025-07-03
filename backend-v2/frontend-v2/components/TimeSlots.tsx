'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
import { TimeSlot } from '@/lib/api'
import { formatTimeWithTimezone, getTimezoneAbbreviation } from '@/lib/timezone'

interface TimeSlotsProps {
  slots: TimeSlot[]
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  loading?: boolean
  showNextAvailableBadge?: boolean
  // Accessibility props
  id?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  selectedDate?: Date
}

const TimeSlots = React.memo(function TimeSlots({ 
  slots, 
  selectedTime, 
  onTimeSelect, 
  loading = false, 
  showNextAvailableBadge = true,
  id = 'time-slots',
  ariaLabel = 'Available time slots',
  ariaDescribedBy,
  selectedDate
}: TimeSlotsProps) {
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number>(-1);
  const [announcementText, setAnnouncementText] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Initialize slot refs array
  useEffect(() => {
    slotRefs.current = slotRefs.current.slice(0, slots.length);
  }, [slots.length]);

  // Screen reader announcements
  const announceToScreenReader = (message: string) => {
    setAnnouncementText(message);
    setTimeout(() => setAnnouncementText(''), 1000);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      const availableSlots = slots.filter(slot => slot.available);
      const currentIndex = focusedSlotIndex;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = Math.min(currentIndex + 1, availableSlots.length - 1);
          setFocusedSlotIndex(nextIndex);
          slotRefs.current[nextIndex]?.focus();
          announceToScreenReader(`${formatTime(availableSlots[nextIndex]?.time)}`);
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = Math.max(currentIndex - 1, 0);
          setFocusedSlotIndex(prevIndex);
          slotRefs.current[prevIndex]?.focus();
          announceToScreenReader(`${formatTime(availableSlots[prevIndex]?.time)}`);
          break;

        case 'Home':
          e.preventDefault();
          setFocusedSlotIndex(0);
          slotRefs.current[0]?.focus();
          announceToScreenReader(`First available time: ${formatTime(availableSlots[0]?.time)}`);
          break;

        case 'End':
          e.preventDefault();
          const lastIndex = availableSlots.length - 1;
          setFocusedSlotIndex(lastIndex);
          slotRefs.current[lastIndex]?.focus();
          announceToScreenReader(`Last available time: ${formatTime(availableSlots[lastIndex]?.time)}`);
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (currentIndex >= 0 && availableSlots[currentIndex]) {
            const slot = availableSlots[currentIndex];
            onTimeSelect(slot.time);
            announceToScreenReader(`Selected ${formatTime(slot.time)}`);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedSlotIndex, slots, onTimeSelect]);

  // Handle slot selection
  const handleSlotSelect = (slot: TimeSlot, index: number) => {
    if (!slot.available) return;
    
    setFocusedSlotIndex(index);
    onTimeSelect(slot.time);
    
    const timeString = formatTime(slot.time);
    const announcement = slot.is_next_available 
      ? `Selected next available appointment time: ${timeString}`
      : `Selected appointment time: ${timeString}`;
    announceToScreenReader(announcement);
  };
  if (loading) {
    return (
      <div 
        className="w-full max-w-2xl mx-auto"
        role="region"
        aria-live="polite"
        aria-label="Loading time slots"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          <span className="sr-only">Loading available time slots, please wait...</span>
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    const noSlotsMessage = selectedDate 
      ? `No available time slots for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`
      : 'No available time slots for this date.';
      
    return (
      <div 
        className="w-full max-w-2xl mx-auto"
        role="region"
        aria-live="polite"
        aria-label="Time slots status"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-gray-500" role="status">
              {noSlotsMessage}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Memoize slot grouping to prevent recalculation on every render
  const groupedSlots = useMemo(() => {
    const groupSlots = (slots: TimeSlot[]) => {
    const groups = {
      morning: [] as TimeSlot[],
      afternoon: [] as TimeSlot[],
      evening: [] as TimeSlot[]
    }

    slots.forEach(slot => {
      const hour = parseInt(slot.time.split(':')[0])
      if (hour < 12) {
        groups.morning.push(slot)
      } else if (hour < 17) {
        groups.afternoon.push(slot)
      } else {
        groups.evening.push(slot)
      }
    })

    return groups
    }
    
    return groupSlots(slots)
  }, [slots])

  // Memoize time formatting function
  const formatTime = useMemo(() => (time: string) => {
    // Format time without timezone for compact display in slots
    return formatTimeWithTimezone(time, false)
  }, [])
  
  // Memoize timezone abbreviation to prevent repeated calls
  const timezoneAbbr = useMemo(() => getTimezoneAbbreviation(), [])

  const renderSlotGroup = (title: string, slots: TimeSlot[], groupIndex: number) => {
    if (slots.length === 0) return null

    const groupId = `${id}-${title.toLowerCase().replace(' ', '-')}`;
    
    return (
      <div className="mb-6 last:mb-0" role="group" aria-labelledby={`${groupId}-heading`}>
        <h3 
          id={`${groupId}-heading`}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
        >
          {title}
        </h3>
        <div 
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"
          role="grid"
          aria-labelledby={`${groupId}-heading`}
        >
          {slots.map((slot, slotIndex) => {
            const isSelected = selectedTime === slot.time;
            const isNextAvailable = slot.is_next_available && showNextAvailableBadge;
            const globalIndex = groupIndex * 100 + slotIndex; // Unique index across groups
            
            // Build comprehensive ARIA label
            const ariaLabelParts = [formatTime(slot.time)];
            if (isSelected) ariaLabelParts.push('Selected');
            if (isNextAvailable) ariaLabelParts.push('Next available');
            if (!slot.available) ariaLabelParts.push('Unavailable');
            
            return (
              <div key={slot.time} className="relative" role="gridcell">
                <button
                  ref={(el) => { slotRefs.current[globalIndex] = el; }}
                  onClick={() => handleSlotSelect(slot, globalIndex)}
                  disabled={!slot.available}
                  tabIndex={focusedSlotIndex === globalIndex ? 0 : -1}
                  aria-label={ariaLabelParts.join(', ')}
                  aria-pressed={isSelected}
                  aria-disabled={!slot.available}
                  aria-describedby={isNextAvailable ? `${groupId}-next-available` : undefined}
                  className={`
                    w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                    ${!slot.available 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : isSelected
                        ? 'bg-primary-600 text-white'
                        : isNextAvailable
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg ring-2 ring-primary-300 hover:from-primary-600 hover:to-primary-700'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50'
                    }
                  `}
                >
                  <span aria-hidden="true">{formatTime(slot.time)}</span>
                </button>
                {isNextAvailable && slot.available && (
                  <>
                    <div 
                      className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold shadow-sm animate-pulse"
                      aria-hidden="true"
                    >
                      ⚡
                    </div>
                    <span 
                      id={`${groupId}-next-available`} 
                      className="sr-only"
                    >
                      This is the next available appointment time
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        ref={containerRef}
        id={id}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        role="region"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      >
        {/* Screen reader announcements */}
        <div 
          role="status" 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        >
          {announcementText}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 
              id={`${id}-title`}
              className="text-lg font-semibold"
            >
              Available Time Slots
              {selectedDate && (
                <span className="sr-only">
                  {` for ${selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}`}
                </span>
              )}
            </h2>
            {timezoneAbbr && (
              <p 
                className="text-sm text-gray-500 mt-1"
                id={`${id}-timezone`}
              >
                All times in {timezoneAbbr}
              </p>
            )}
          </div>
          {slots.some(slot => slot.is_next_available) && showNextAvailableBadge && (
            <div 
              className="flex items-center text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full"
              role="note"
              aria-label="Next available appointment indicator"
            >
              <span className="mr-1" aria-hidden="true">⚡</span>
              Next Available
            </div>
          )}
        </div>

        {/* Instructions for screen readers */}
        <div className="sr-only" id={`${id}-instructions`}>
          <p>Use arrow keys to navigate between time slots. Press Enter or Space to select a time.</p>
          {slots.some(slot => slot.is_next_available) && (
            <p>Times marked with lightning bolt are the next available appointments.</p>
          )}
        </div>
        
        {/* Time slot groups */}
        <div aria-describedby={`${id}-timezone ${id}-instructions`}>
          {renderSlotGroup('Morning', groupedSlots.morning, 0)}
          {renderSlotGroup('Afternoon', groupedSlots.afternoon, 1)}
          {renderSlotGroup('Evening', groupedSlots.evening, 2)}
        </div>

        {/* Summary for screen readers */}
        <div className="sr-only" aria-live="polite">
          {slots.filter(slot => slot.available).length} available time slots total.
          {selectedTime && ` Currently selected: ${formatTime(selectedTime)}.`}
        </div>
      </div>
    </div>
  )
})

// Add display name for debugging
TimeSlots.displayName = 'TimeSlots'

export default TimeSlots
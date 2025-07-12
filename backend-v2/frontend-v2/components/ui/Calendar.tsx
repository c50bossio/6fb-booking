'use client'

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CalendarProps {
  className?: string
  classNames?: Record<string, string>
  showOutsideDays?: boolean
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  minDate?: Date
  maxDate?: Date
  onMonthChange?: (month: Date) => void
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  onSelect,
  disabled,
  minDate,
  maxDate,
  onMonthChange,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    if (selected && selected instanceof Date) {
      return new Date(selected.getFullYear(), selected.getMonth(), 1)
    }
    return new Date()
  })

  const today = new Date()
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

  const previousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const nextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const selectDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    if (disabled?.(date)) return
    onSelect?.(date)
  }

  const isDateSelected = (day: number) => {
    if (!selected) return false
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return (
      selected.getDate() === date.getDate() &&
      selected.getMonth() === date.getMonth() &&
      selected.getFullYear() === date.getFullYear()
    )
  }

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return disabled?.(date) || false
  }

  // Generate calendar days
  const days = []
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  return (
    <div className={cn("p-3", className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-1 hover:bg-gray-100 rounded"
          type="button"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <div className="font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded"
          type="button"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className="aspect-square">
            {day && (
              <button
                onClick={() => selectDate(day)}
                disabled={isDateDisabled(day)}
                className={cn(
                  "w-full h-full rounded-md text-sm transition-colors",
                  "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  {
                    "bg-blue-500 text-white hover:bg-blue-600": isDateSelected(day),
                    "text-gray-400 cursor-not-allowed": isDateDisabled(day),
                    "text-gray-900": !isDateSelected(day) && !isDateDisabled(day),
                  }
                )}
                type="button"
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
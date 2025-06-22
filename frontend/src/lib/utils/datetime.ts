/**
 * Date/Time Utilities with Timezone Support
 * Comprehensive date and time handling for the calendar system
 */

// === TIMEZONE UTILITIES ===

export class TimezoneHelper {
  private static readonly DEFAULT_TIMEZONE = 'America/New_York'
  
  /**
   * Get user's current timezone
   */
  static getUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return this.DEFAULT_TIMEZONE
    }
  }

  /**
   * Convert date between timezones
   */
  static convertTimezone(date: Date, fromTz: string, toTz: string): Date {
    // Create a date string in the source timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
    const sourceDate = new Date(date.toLocaleString('en-US', { timeZone: fromTz }))
    const targetDate = new Date(date.toLocaleString('en-US', { timeZone: toTz }))
    
    // Calculate the difference and apply it
    const offset = sourceDate.getTime() - targetDate.getTime()
    return new Date(utcDate.getTime() + offset)
  }

  /**
   * Get timezone offset in hours
   */
  static getTimezoneOffset(timezone: string, date?: Date): number {
    const targetDate = date || new Date()
    const utc = new Date(targetDate.getTime() + (targetDate.getTimezoneOffset() * 60000))
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }))
    return (utc.getTime() - targetTime.getTime()) / (1000 * 60 * 60)
  }

  /**
   * Format time for display in specific timezone
   */
  static formatTimeInTimezone(
    time: string,
    timezone: string,
    options: {
      hour12?: boolean
      includeSeconds?: boolean
    } = {}
  ): string {
    const { hour12 = true, includeSeconds = false } = options
    const [hours, minutes, seconds = '00'] = time.split(':').map(Number)
    
    const date = new Date()
    date.setHours(hours, minutes, includeSeconds ? parseInt(seconds.toString()) : 0, 0)
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour12,
      hour: 'numeric',
      minute: '2-digit'
    }
    
    if (includeSeconds) {
      formatOptions.second = '2-digit'
    }
    
    return date.toLocaleTimeString('en-US', formatOptions)
  }

  /**
   * Check if timezone observes daylight saving time
   */
  static isDaylightSavingTime(timezone: string, date?: Date): boolean {
    const targetDate = date || new Date()
    const january = new Date(targetDate.getFullYear(), 0, 1)
    const july = new Date(targetDate.getFullYear(), 6, 1)
    
    const janOffset = this.getTimezoneOffset(timezone, january)
    const julyOffset = this.getTimezoneOffset(timezone, july)
    const currentOffset = this.getTimezoneOffset(timezone, targetDate)
    
    return currentOffset !== Math.max(janOffset, julyOffset)
  }

  /**
   * Get list of common timezones
   */
  static getCommonTimezones(): Array<{ value: string; label: string; offset: string }> {
    const timezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
      'America/Toronto',
      'America/Vancouver',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Australia/Sydney'
    ]

    return timezones.map(tz => {
      const offset = this.getTimezoneOffset(tz)
      const sign = offset >= 0 ? '+' : '-'
      const hours = Math.floor(Math.abs(offset))
      const minutes = Math.round((Math.abs(offset) - hours) * 60)
      const offsetString = `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      
      return {
        value: tz,
        label: tz.replace('_', ' ').replace('/', ' - '),
        offset: offsetString
      }
    })
  }
}

// === DATE UTILITIES ===

export class DateHelper {
  /**
   * Format date for display
   */
  static formatDate(
    date: Date | string,
    format: 'short' | 'medium' | 'long' | 'full' = 'medium',
    timezone?: string
  ): string {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || TimezoneHelper.getUserTimezone()
    }

    switch (format) {
      case 'short':
        options.month = 'numeric'
        options.day = 'numeric'
        options.year = 'numeric'
        break
      case 'medium':
        options.month = 'short'
        options.day = 'numeric'
        options.year = 'numeric'
        break
      case 'long':
        options.month = 'long'
        options.day = 'numeric'
        options.year = 'numeric'
        break
      case 'full':
        options.weekday = 'long'
        options.month = 'long'
        options.day = 'numeric'
        options.year = 'numeric'
        break
    }

    return targetDate.toLocaleDateString('en-US', options)
  }

  /**
   * Format datetime for display
   */
  static formatDateTime(
    date: Date | string,
    options: {
      dateFormat?: 'short' | 'medium' | 'long' | 'full'
      timeFormat?: 'short' | 'medium'
      timezone?: string
      separator?: string
    } = {}
  ): string {
    const {
      dateFormat = 'medium',
      timeFormat = 'short',
      timezone,
      separator = ' at '
    } = options

    const targetDate = typeof date === 'string' ? new Date(date) : date
    const dateStr = this.formatDate(targetDate, dateFormat, timezone)
    const timeStr = this.formatTime(targetDate, timeFormat, timezone)
    
    return `${dateStr}${separator}${timeStr}`
  }

  /**
   * Format time for display
   */
  static formatTime(
    date: Date | string,
    format: 'short' | 'medium' = 'short',
    timezone?: string
  ): string {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || TimezoneHelper.getUserTimezone(),
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    }

    if (format === 'medium') {
      options.second = '2-digit'
    }

    return targetDate.toLocaleTimeString('en-US', options)
  }

  /**
   * Get relative time (e.g., "2 hours ago", "in 3 days")
   */
  static getRelativeTime(date: Date | string): string {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = targetDate.getTime() - now.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

    if (Math.abs(diffSeconds) < 60) {
      return rtf.format(diffSeconds, 'second')
    } else if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, 'minute')
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour')
    } else if (Math.abs(diffDays) < 7) {
      return rtf.format(diffDays, 'day')
    } else if (Math.abs(diffDays) < 30) {
      const weeks = Math.floor(diffDays / 7)
      return rtf.format(weeks, 'week')
    } else if (Math.abs(diffDays) < 365) {
      const months = Math.floor(diffDays / 30)
      return rtf.format(months, 'month')
    } else {
      const years = Math.floor(diffDays / 365)
      return rtf.format(years, 'year')
    }
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    
    return (
      targetDate.getDate() === today.getDate() &&
      targetDate.getMonth() === today.getMonth() &&
      targetDate.getFullYear() === today.getFullYear()
    )
  }

  /**
   * Check if date is tomorrow
   */
  static isTomorrow(date: Date | string): boolean {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return (
      targetDate.getDate() === tomorrow.getDate() &&
      targetDate.getMonth() === tomorrow.getMonth() &&
      targetDate.getFullYear() === tomorrow.getFullYear()
    )
  }

  /**
   * Check if date is yesterday
   */
  static isYesterday(date: Date | string): boolean {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    return (
      targetDate.getDate() === yesterday.getDate() &&
      targetDate.getMonth() === yesterday.getMonth() &&
      targetDate.getFullYear() === yesterday.getFullYear()
    )
  }

  /**
   * Get day of week name
   */
  static getDayName(
    date: Date | string | number,
    format: 'long' | 'short' | 'narrow' = 'long'
  ): string {
    let targetDate: Date
    
    if (typeof date === 'number') {
      // Day of week (0-6)
      targetDate = new Date()
      targetDate.setDate(targetDate.getDate() - targetDate.getDay() + date)
    } else {
      targetDate = typeof date === 'string' ? new Date(date) : date
    }

    return targetDate.toLocaleDateString('en-US', { weekday: format })
  }

  /**
   * Get month name
   */
  static getMonthName(
    month: number | Date | string,
    format: 'long' | 'short' | 'narrow' = 'long'
  ): string {
    let targetDate: Date
    
    if (typeof month === 'number') {
      targetDate = new Date()
      targetDate.setMonth(month)
    } else {
      targetDate = typeof month === 'string' ? new Date(month) : month
    }

    return targetDate.toLocaleDateString('en-US', { month: format })
  }

  /**
   * Get start of day
   */
  static startOfDay(date: Date | string): Date {
    const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    return targetDate
  }

  /**
   * Get end of day
   */
  static endOfDay(date: Date | string): Date {
    const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
    targetDate.setHours(23, 59, 59, 999)
    return targetDate
  }

  /**
   * Get start of week (Sunday)
   */
  static startOfWeek(date: Date | string): Date {
    const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
    const diff = targetDate.getDate() - targetDate.getDay()
    return new Date(targetDate.setDate(diff))
  }

  /**
   * Get end of week (Saturday)
   */
  static endOfWeek(date: Date | string): Date {
    const startOfWeek = this.startOfWeek(date)
    return new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000)
  }

  /**
   * Get start of month
   */
  static startOfMonth(date: Date | string): Date {
    const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
    return new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
  }

  /**
   * Get end of month
   */
  static endOfMonth(date: Date | string): Date {
    const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
    return new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
  }

  /**
   * Add/subtract time from date
   */
  static addTime(
    date: Date | string,
    amount: number,
    unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
  ): Date {
    const targetDate = typeof date === 'string' ? new Date(date) : new Date(date)
    
    switch (unit) {
      case 'seconds':
        return new Date(targetDate.getTime() + amount * 1000)
      case 'minutes':
        return new Date(targetDate.getTime() + amount * 60 * 1000)
      case 'hours':
        return new Date(targetDate.getTime() + amount * 60 * 60 * 1000)
      case 'days':
        return new Date(targetDate.getTime() + amount * 24 * 60 * 60 * 1000)
      case 'weeks':
        return new Date(targetDate.getTime() + amount * 7 * 24 * 60 * 60 * 1000)
      case 'months':
        const newDate = new Date(targetDate)
        newDate.setMonth(newDate.getMonth() + amount)
        return newDate
      case 'years':
        const yearDate = new Date(targetDate)
        yearDate.setFullYear(yearDate.getFullYear() + amount)
        return yearDate
      default:
        return targetDate
    }
  }

  /**
   * Get difference between two dates
   */
  static getDifference(
    date1: Date | string,
    date2: Date | string,
    unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
  ): number {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2
    const diffMs = d2.getTime() - d1.getTime()
    
    switch (unit) {
      case 'seconds':
        return Math.floor(diffMs / 1000)
      case 'minutes':
        return Math.floor(diffMs / (1000 * 60))
      case 'hours':
        return Math.floor(diffMs / (1000 * 60 * 60))
      case 'days':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24))
      case 'weeks':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))
      case 'months':
        return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
      case 'years':
        return d2.getFullYear() - d1.getFullYear()
      default:
        return 0
    }
  }
}

// === TIME UTILITIES ===

export class TimeHelper {
  /**
   * Parse time string to components
   */
  static parseTime(timeStr: string): { hours: number; minutes: number; seconds: number } {
    const parts = timeStr.split(':').map(Number)
    return {
      hours: parts[0] || 0,
      minutes: parts[1] || 0,
      seconds: parts[2] || 0
    }
  }

  /**
   * Format time components to string
   */
  static formatTimeString(hours: number, minutes: number, seconds = 0): string {
    const h = hours.toString().padStart(2, '0')
    const m = minutes.toString().padStart(2, '0')
    const s = seconds.toString().padStart(2, '0')
    return seconds > 0 ? `${h}:${m}:${s}` : `${h}:${m}`
  }

  /**
   * Convert 24-hour time to 12-hour time
   */
  static to12Hour(timeStr: string): string {
    const { hours, minutes } = this.parseTime(timeStr)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  /**
   * Convert 12-hour time to 24-hour time
   */
  static to24Hour(timeStr: string): string {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return timeStr
    
    let [, hours, minutes, period] = match
    let h = parseInt(hours)
    
    if (period.toUpperCase() === 'PM' && h !== 12) {
      h += 12
    } else if (period.toUpperCase() === 'AM' && h === 12) {
      h = 0
    }
    
    return this.formatTimeString(h, parseInt(minutes))
  }

  /**
   * Add minutes to time string
   */
  static addMinutes(timeStr: string, minutes: number): string {
    const { hours, minutes: mins } = this.parseTime(timeStr)
    const totalMinutes = hours * 60 + mins + minutes
    const newHours = Math.floor(totalMinutes / 60) % 24
    const newMins = totalMinutes % 60
    return this.formatTimeString(newHours, newMins)
  }

  /**
   * Get time difference in minutes
   */
  static getTimeDifference(startTime: string, endTime: string): number {
    const start = this.parseTime(startTime)
    const end = this.parseTime(endTime)
    
    const startMinutes = start.hours * 60 + start.minutes
    const endMinutes = end.hours * 60 + end.minutes
    
    // Handle overnight times
    if (endMinutes < startMinutes) {
      return (24 * 60) - startMinutes + endMinutes
    }
    
    return endMinutes - startMinutes
  }

  /**
   * Check if time is between two times
   */
  static isTimeBetween(checkTime: string, startTime: string, endTime: string): boolean {
    const check = this.parseTime(checkTime)
    const start = this.parseTime(startTime)
    const end = this.parseTime(endTime)
    
    const checkMinutes = check.hours * 60 + check.minutes
    const startMinutes = start.hours * 60 + start.minutes
    const endMinutes = end.hours * 60 + end.minutes
    
    // Handle overnight ranges
    if (endMinutes < startMinutes) {
      return checkMinutes >= startMinutes || checkMinutes <= endMinutes
    }
    
    return checkMinutes >= startMinutes && checkMinutes <= endMinutes
  }

  /**
   * Generate time slots
   */
  static generateTimeSlots(
    startTime: string,
    endTime: string,
    intervalMinutes: number,
    includeEndTime = false
  ): string[] {
    const slots: string[] = []
    let current = startTime
    
    while (this.getTimeDifference(current, endTime) > 0) {
      slots.push(current)
      current = this.addMinutes(current, intervalMinutes)
      
      // Prevent infinite loop
      if (slots.length > 200) break
    }
    
    if (includeEndTime && current === endTime) {
      slots.push(endTime)
    }
    
    return slots
  }

  /**
   * Round time to nearest interval
   */
  static roundToInterval(timeStr: string, intervalMinutes: number): string {
    const { hours, minutes } = this.parseTime(timeStr)
    const totalMinutes = hours * 60 + minutes
    const roundedMinutes = Math.round(totalMinutes / intervalMinutes) * intervalMinutes
    const newHours = Math.floor(roundedMinutes / 60) % 24
    const newMins = roundedMinutes % 60
    return this.formatTimeString(newHours, newMins)
  }
}

// === BUSINESS HOURS UTILITIES ===

export class BusinessHoursHelper {
  /**
   * Check if current time is within business hours
   */
  static isWithinBusinessHours(
    businessHours: Array<{
      day_of_week: number
      is_open: boolean
      open_time?: string
      close_time?: string
      break_start?: string
      break_end?: string
    }>,
    date?: Date,
    timezone?: string
  ): boolean {
    const checkDate = date || new Date()
    const dayOfWeek = checkDate.getDay()
    const currentTime = DateHelper.formatTime(checkDate, 'short', timezone)
    
    const dayHours = businessHours.find(h => h.day_of_week === dayOfWeek)
    if (!dayHours || !dayHours.is_open || !dayHours.open_time || !dayHours.close_time) {
      return false
    }
    
    // Check if current time is within business hours
    const isWithinHours = TimeHelper.isTimeBetween(
      TimeHelper.to24Hour(currentTime),
      dayHours.open_time,
      dayHours.close_time
    )
    
    // Check if current time is during break
    if (isWithinHours && dayHours.break_start && dayHours.break_end) {
      const isDuringBreak = TimeHelper.isTimeBetween(
        TimeHelper.to24Hour(currentTime),
        dayHours.break_start,
        dayHours.break_end
      )
      return !isDuringBreak
    }
    
    return isWithinHours
  }

  /**
   * Get next opening time
   */
  static getNextOpeningTime(
    businessHours: Array<{
      day_of_week: number
      is_open: boolean
      open_time?: string
      close_time?: string
    }>,
    fromDate?: Date
  ): Date | null {
    const checkDate = fromDate || new Date()
    let currentDay = checkDate.getDay()
    let daysChecked = 0
    
    while (daysChecked < 7) {
      const dayHours = businessHours.find(h => h.day_of_week === currentDay)
      
      if (dayHours?.is_open && dayHours.open_time) {
        const openingDate = new Date(checkDate)
        openingDate.setDate(openingDate.getDate() + daysChecked)
        
        const { hours, minutes } = TimeHelper.parseTime(dayHours.open_time)
        openingDate.setHours(hours, minutes, 0, 0)
        
        // If it's today, check if opening time hasn't passed
        if (daysChecked === 0 && openingDate <= checkDate) {
          // Opening time has passed, check next day
        } else {
          return openingDate
        }
      }
      
      currentDay = (currentDay + 1) % 7
      daysChecked++
    }
    
    return null // No opening hours found
  }

  /**
   * Format business hours for display
   */
  static formatBusinessHoursDisplay(
    businessHours: Array<{
      day_of_week: number
      is_open: boolean
      open_time?: string
      close_time?: string
      break_start?: string
      break_end?: string
    }>
  ): Record<string, string> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const formatted: Record<string, string> = {}
    
    businessHours.forEach(hours => {
      const dayName = dayNames[hours.day_of_week]
      
      if (!hours.is_open) {
        formatted[dayName] = 'Closed'
      } else if (hours.open_time && hours.close_time) {
        let timeStr = `${TimeHelper.to12Hour(hours.open_time)} - ${TimeHelper.to12Hour(hours.close_time)}`
        
        if (hours.break_start && hours.break_end) {
          timeStr += ` (Break: ${TimeHelper.to12Hour(hours.break_start)} - ${TimeHelper.to12Hour(hours.break_end)})`
        }
        
        formatted[dayName] = timeStr
      } else {
        formatted[dayName] = 'Hours vary'
      }
    })
    
    return formatted
  }
}

// === APPOINTMENT UTILITIES ===

export class AppointmentTimeHelper {
  /**
   * Calculate appointment end time
   */
  static calculateEndTime(startTime: string, durationMinutes: number): string {
    return TimeHelper.addMinutes(startTime, durationMinutes)
  }

  /**
   * Check for time conflicts
   */
  static hasTimeConflict(
    newStart: string,
    newEnd: string,
    existingAppointments: Array<{
      start_time: string
      end_time: string
    }>
  ): boolean {
    return existingAppointments.some(appt => {
      // Check if appointments overlap
      return !(newEnd <= appt.start_time || newStart >= appt.end_time)
    })
  }

  /**
   * Find next available slot
   */
  static findNextAvailableSlot(
    startTime: string,
    endTime: string,
    durationMinutes: number,
    existingAppointments: Array<{
      start_time: string
      end_time: string
    }>,
    intervalMinutes = 15
  ): string | null {
    const slots = TimeHelper.generateTimeSlots(startTime, endTime, intervalMinutes)
    
    for (const slot of slots) {
      const slotEnd = this.calculateEndTime(slot, durationMinutes)
      
      // Check if slot fits within business hours
      if (TimeHelper.getTimeDifference(slotEnd, endTime) < 0) {
        continue
      }
      
      // Check for conflicts
      if (!this.hasTimeConflict(slot, slotEnd, existingAppointments)) {
        return slot
      }
    }
    
    return null
  }

  /**
   * Get buffer time around appointment
   */
  static addBufferTime(
    startTime: string,
    endTime: string,
    bufferMinutes: number
  ): { bufferedStart: string; bufferedEnd: string } {
    return {
      bufferedStart: TimeHelper.addMinutes(startTime, -bufferMinutes),
      bufferedEnd: TimeHelper.addMinutes(endTime, bufferMinutes)
    }
  }
}

// Classes are already exported above with 'export class' declarations
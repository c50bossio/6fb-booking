// Timezone utilities for consistent date/time handling across the booking system

/**
 * Get the user's timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/**
 * Get timezone abbreviation (e.g., PST, EST)
 */
export function getTimezoneAbbreviation(date: Date = new Date()): string {
  const timeString = date.toLocaleTimeString('en-US', {
    timeZoneName: 'short'
  })
  // Extract the timezone abbreviation from the formatted time string
  const matches = timeString.match(/\s([A-Z]{3,4})$/)
  return matches ? matches[1] : ''
}

/**
 * Format date for API calls in YYYY-MM-DD format
 * Ensures the date is interpreted in the user's timezone
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse API date string (YYYY-MM-DD) to Date object in user's timezone
 */
export function parseAPIDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Create date in local timezone (month is 0-indexed)
  return new Date(year, month - 1, day)
}

/**
 * Format time with timezone abbreviation
 */
export function formatTimeWithTimezone(time: string, includeTimezone: boolean = true): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const formattedTime = `${displayHour}:${minutes} ${ampm}`
  
  if (includeTimezone) {
    const tz = getTimezoneAbbreviation()
    return `${formattedTime} ${tz}`
  }
  
  return formattedTime
}

/**
 * Get a user-friendly timezone display name
 */
export function getTimezoneDisplayName(): string {
  const timezone = getUserTimezone()
  const now = new Date()
  const tzAbbr = getTimezoneAbbreviation(now)
  
  // Try to get a more user-friendly name
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long'
    })
    const parts = formatter.formatToParts(now)
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value
    
    if (timeZoneName && tzAbbr) {
      return `${timeZoneName} (${tzAbbr})`
    }
    return timeZoneName || timezone
  } catch {
    return `${timezone} ${tzAbbr ? `(${tzAbbr})` : ''}`
  }
}

/**
 * Check if a date is today in the user's timezone
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate()
}

/**
 * Check if a date is tomorrow in the user's timezone
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return date.getFullYear() === tomorrow.getFullYear() &&
         date.getMonth() === tomorrow.getMonth() &&
         date.getDate() === tomorrow.getDate()
}

/**
 * Get a friendly date label
 */
export function getFriendlyDateLabel(date: Date): string {
  if (isToday(date)) {
    return 'Today'
  }
  if (isTomorrow(date)) {
    return 'Tomorrow'
  }
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  })
}

/**
 * Create a date from API date and time strings in user's timezone
 */
export function createDateTimeFromAPI(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

/**
 * Format a full datetime with timezone
 */
export function formatDateTimeWithTimezone(date: Date): string {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })
  return `${dateStr} at ${timeStr}`
}

/**
 * Detect browser timezone
 */
export function detectBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/**
 * Check if a timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Format date in a specific timezone
 */
export function formatDateInTimezone(
  date: Date | string,
  format: string,
  timezone: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Simple format implementation
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
  
  const formatter = new Intl.DateTimeFormat('en-US', options)
  const parts = formatter.formatToParts(dateObj)
  
  const partsMap: Record<string, string> = {}
  parts.forEach(part => {
    partsMap[part.type] = part.value
  })
  
  // Basic format replacements
  return format
    .replace('YYYY', partsMap.year || '')
    .replace('MM', partsMap.month || '')
    .replace('DD', partsMap.day || '')
    .replace('HH', partsMap.hour || '')
    .replace('mm', partsMap.minute || '')
    .replace('ss', partsMap.second || '')
}

/**
 * Convert date between timezones
 */
export function convertTimezone(
  date: Date | string,
  fromTimezone: string,
  toTimezone: string
): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Get the date string in the source timezone
  const sourceStr = dateObj.toLocaleString('en-US', {
    timeZone: fromTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Parse and create new date
  const [datePart, timePart] = sourceStr.split(', ')
  const [month, day, year] = datePart.split('/')
  const [hour, minute, second] = timePart.split(':')
  
  // Create date in target timezone
  const targetDate = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )
  
  return targetDate
}

/**
 * Format date/time with timezone
 */
export function formatWithTimezone(
  date: Date | string,
  timezone: string,
  includeDate: boolean = true
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (includeDate) {
    return dateObj.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  } else {
    return dateObj.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }
}

/**
 * Get current time in specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  const now = new Date()
  const timeStr = now.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const [datePart, timePart] = timeStr.split(', ')
  const [month, day, year] = datePart.split('/')
  const [hour, minute, second] = timePart.split(':')
  
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )
}

/**
 * Convert local time to UTC
 */
export function localToUTC(date: Date | string, localTimezone: string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Get the UTC offset for the local timezone
  const localStr = dateObj.toLocaleString('en-US', {
    timeZone: localTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const utcStr = dateObj.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  return new Date(utcStr)
}

/**
 * Convert UTC to local time
 */
export function utcToLocal(date: Date | string, localTimezone: string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Create date string in target timezone
  const localStr = dateObj.toLocaleString('en-US', {
    timeZone: localTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const [datePart, timePart] = localStr.split(', ')
  const [month, day, year] = datePart.split('/')
  const [hour, minute, second] = timePart.split(':')
  
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )
}
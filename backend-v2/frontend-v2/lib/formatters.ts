/**
 * Formatting utilities for consistent display of numbers, currency, dates, etc.
 */

export const formatters = {
  /**
   * Format a number as USD currency
   */
  currency: (amount: number | null | undefined, options?: { showCents?: boolean }) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0'
    
    // Safely convert to number
    const numAmount = Number(amount)
    if (isNaN(numAmount)) return '$0'
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: options?.showCents !== false ? 2 : 0,
      maximumFractionDigits: options?.showCents !== false ? 2 : 0,
    })
    
    return formatter.format(numAmount)
  },

  /**
   * Format a number as a percentage
   */
  percentage: (value: number | null | undefined, decimals: number = 1) => {
    if (value === null || value === undefined || isNaN(value)) return '0%'
    
    // Safely convert to number and apply toFixed
    const numValue = Number(value)
    if (isNaN(numValue)) return '0%'
    
    return `${numValue.toFixed(decimals)}%`
  },

  /**
   * Format a number with commas for thousands
   */
  number: (value: number | null | undefined, decimals: number = 0) => {
    if (value === null || value === undefined || isNaN(value)) return '0'
    
    // Safely convert to number
    const numValue = Number(value)
    if (isNaN(numValue)) return '0'
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue)
  },

  /**
   * Format duration in minutes to human readable format
   */
  duration: (minutes: number | null | undefined) => {
    if (!minutes) return '0m'
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  },

  /**
   * Format a date to a readable string
   */
  date: (date: string | Date | null | undefined, options?: { includeTime?: boolean }) => {
    if (!date) return ''
    
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (options?.includeTime) {
      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
    
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  },

  /**
   * Format a time string (HH:MM) to 12-hour format
   */
  time: (time: string | null | undefined) => {
    if (!time) return ''
    
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  },

  /**
   * Format phone number for display
   */
  phone: (phone: string | null | undefined) => {
    if (!phone) return ''
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    
    // Format as +X (XXX) XXX-XXXX
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    
    return phone
  },

  /**
   * Truncate text with ellipsis
   */
  truncate: (text: string | null | undefined, maxLength: number = 50) => {
    if (!text) return ''
    
    if (text.length <= maxLength) return text
    return `${text.slice(0, maxLength)}...`
  },
}
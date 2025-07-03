import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  addDays, 
  addWeeks, 
  addMonths,
  format,
  isWithinInterval,
  differenceInDays,
  isSameDay,
  eachDayOfInterval
} from 'date-fns'

interface DateRange {
  start: Date
  end: Date
}

interface WeekInfo {
  weekStart: Date
  weekEnd: Date
  days: Date[]
  weekNumber: number
  year: number
}

interface MonthInfo {
  monthStart: Date
  monthEnd: Date
  days: Date[]
  weeksInMonth: WeekInfo[]
  monthNumber: number
  year: number
  daysInMonth: number
}

interface TimeSlot {
  hour: number
  minute: number
  timeString: string
  timestamp: number
}

// Enhanced LRU cache with size limits and TTL
class OptimizedCache<K, V> {
  private cache = new Map<string, { value: V; timestamp: number; accessCount: number }>()
  private maxSize: number
  private ttl: number
  private accessOrder = new Map<string, number>()
  private accessCounter = 0

  constructor(maxSize = 100, ttlMs = 300000) { // 5 minutes TTL
    this.maxSize = maxSize
    this.ttl = ttlMs
  }

  private createKey(key: K): string {
    if (typeof key === 'object' && key !== null) {
      return JSON.stringify(key)
    }
    return String(key)
  }

  get(key: K): V | undefined {
    const keyStr = this.createKey(key)
    const entry = this.cache.get(keyStr)
    
    if (!entry) {
      return undefined
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(keyStr)
      this.accessOrder.delete(keyStr)
      return undefined
    }

    // Update access tracking
    entry.accessCount++
    this.accessOrder.set(keyStr, ++this.accessCounter)
    
    return entry.value
  }

  set(key: K, value: V): void {
    const keyStr = this.createKey(key)
    const now = Date.now()

    // Remove old entry if exists
    if (this.cache.has(keyStr)) {
      this.cache.delete(keyStr)
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(keyStr, {
      value,
      timestamp: now,
      accessCount: 1
    })
    this.accessOrder.set(keyStr, ++this.accessCounter)
  }

  private evictLRU(): void {
    let oldestKey = ''
    let oldestAccess = Infinity

    this.accessOrder.forEach((accessTime, key) => {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime
        oldestKey = key
      }
    })

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.accessOrder.delete(oldestKey)
    }
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder.clear()
    this.accessCounter = 0
  }

  size(): number {
    return this.cache.size
  }

  // Clean expired entries
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
        this.accessOrder.delete(key)
        cleaned++
      }
    })

    return cleaned
  }
}

// Global caches with different TTLs for different data types
const weekInfoCache = new OptimizedCache<string, WeekInfo>(200, 600000) // 10 minutes
const monthInfoCache = new OptimizedCache<string, MonthInfo>(50, 1800000) // 30 minutes
const dateRangeCache = new OptimizedCache<string, DateRange>(100, 300000) // 5 minutes
const timeSlotsCache = new OptimizedCache<string, TimeSlot[]>(20, 900000) // 15 minutes
const dayArrayCache = new OptimizedCache<string, Date[]>(150, 600000) // 10 minutes

// Optimized date calculation functions with caching
export class OptimizedDateCalculations {
  // Generate week info with caching
  static getWeekInfo(date: Date, startDay: 0 | 1 = 1): WeekInfo {
    const cacheKey = `${format(date, 'yyyy-MM-dd')}-${startDay}`
    
    let weekInfo = weekInfoCache.get(cacheKey)
    if (weekInfo) {
      return weekInfo
    }

    const weekStart = startOfWeek(date, { weekStartsOn: startDay })
    const weekEnd = endOfWeek(date, { weekStartsOn: startDay })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    weekInfo = {
      weekStart,
      weekEnd,
      days,
      weekNumber: Math.ceil(differenceInDays(date, startOfMonth(date)) / 7) + 1,
      year: date.getFullYear()
    }

    weekInfoCache.set(cacheKey, weekInfo)
    return weekInfo
  }

  // Generate month info with caching
  static getMonthInfo(date: Date, startDay: 0 | 1 = 1): MonthInfo {
    const cacheKey = `${format(date, 'yyyy-MM')}-${startDay}`
    
    let monthInfo = monthInfoCache.get(cacheKey)
    if (monthInfo) {
      return monthInfo
    }

    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    // Generate weeks in month
    const weeksInMonth: WeekInfo[] = []
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: startDay })
    const lastWeekEnd = endOfWeek(monthEnd, { weekStartsOn: startDay })
    
    let currentWeekStart = firstWeekStart
    let weekNumber = 1
    
    while (currentWeekStart <= lastWeekEnd) {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: startDay })
      const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd })
      
      weeksInMonth.push({
        weekStart: currentWeekStart,
        weekEnd,
        days: weekDays,
        weekNumber,
        year: date.getFullYear()
      })
      
      currentWeekStart = addWeeks(currentWeekStart, 1)
      weekNumber++
    }

    monthInfo = {
      monthStart,
      monthEnd,
      days,
      weeksInMonth,
      monthNumber: date.getMonth() + 1,
      year: date.getFullYear(),
      daysInMonth: days.length
    }

    monthInfoCache.set(cacheKey, monthInfo)
    return monthInfo
  }

  // Generate date range with caching
  static getDateRange(startDate: Date, endDate: Date): DateRange {
    const cacheKey = `${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`
    
    let range = dateRangeCache.get(cacheKey)
    if (range) {
      return range
    }

    range = {
      start: new Date(startDate),
      end: new Date(endDate)
    }

    dateRangeCache.set(cacheKey, range)
    return range
  }

  // Generate time slots with caching
  static getTimeSlots(
    startHour = 6,
    endHour = 22,
    intervalMinutes = 30
  ): TimeSlot[] {
    const cacheKey = `${startHour}-${endHour}-${intervalMinutes}`
    
    let timeSlots = timeSlotsCache.get(cacheKey)
    if (timeSlots) {
      return timeSlots
    }

    timeSlots = []
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const baseDate = new Date(2000, 0, 1, hour, minute)
        
        timeSlots.push({
          hour,
          minute,
          timeString,
          timestamp: baseDate.getTime()
        })
      }
    }

    timeSlotsCache.set(cacheKey, timeSlots)
    return timeSlots
  }

  // Get days in range with caching
  static getDaysInRange(startDate: Date, endDate: Date): Date[] {
    const cacheKey = `days-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`
    
    let days = dayArrayCache.get(cacheKey)
    if (days) {
      return days
    }

    days = eachDayOfInterval({ start: startDate, end: endDate })
    dayArrayCache.set(cacheKey, days)
    return days
  }

  // Get business days in range (excluding weekends)
  static getBusinessDaysInRange(startDate: Date, endDate: Date): Date[] {
    const cacheKey = `business-days-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`
    
    let days = dayArrayCache.get(cacheKey)
    if (days) {
      return days
    }

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
    days = allDays.filter(day => {
      const dayOfWeek = day.getDay()
      return dayOfWeek !== 0 && dayOfWeek !== 6 // Exclude Sunday (0) and Saturday (6)
    })

    dayArrayCache.set(cacheKey, days)
    return days
  }

  // Get next N days/weeks/months with caching
  static getNextPeriods(
    date: Date,
    count: number,
    period: 'day' | 'week' | 'month'
  ): Date[] {
    const cacheKey = `next-${period}-${format(date, 'yyyy-MM-dd')}-${count}`
    
    let periods = dayArrayCache.get(cacheKey)
    if (periods) {
      return periods
    }

    periods = []
    
    for (let i = 0; i < count; i++) {
      let nextDate: Date
      
      switch (period) {
        case 'day':
          nextDate = addDays(date, i)
          break
        case 'week':
          nextDate = addWeeks(date, i)
          break
        case 'month':
          nextDate = addMonths(date, i)
          break
        default:
          nextDate = addDays(date, i)
      }
      
      periods.push(nextDate)
    }

    dayArrayCache.set(cacheKey, periods)
    return periods
  }

  // Check if date is within any of the provided ranges
  static isDateInRanges(date: Date, ranges: DateRange[]): boolean {
    return ranges.some(range => 
      isWithinInterval(date, { start: range.start, end: range.end })
    )
  }

  // Group dates by month with caching
  static groupDatesByMonth(dates: Date[]): Map<string, Date[]> {
    const cacheKey = `group-months-${dates.length}-${dates[0]?.getTime()}-${dates[dates.length - 1]?.getTime()}`
    
    // Use a simpler cache for complex objects
    const result = new Map<string, Date[]>()
    
    dates.forEach(date => {
      const monthKey = format(date, 'yyyy-MM')
      if (!result.has(monthKey)) {
        result.set(monthKey, [])
      }
      result.get(monthKey)!.push(date)
    })

    return result
  }

  // Batch date operations with optimization
  static batchDateOperations<T>(
    dates: Date[],
    operation: (date: Date) => T,
    batchSize = 50
  ): T[] {
    const results: T[] = []
    
    // Process in batches to prevent blocking
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize)
      batch.forEach(date => {
        results.push(operation(date))
      })
      
      // Allow other tasks to run between batches
      if (i + batchSize < dates.length) {
        // In a real app, you might use setTimeout or requestIdleCallback here
      }
    }
    
    return results
  }

  // Cache management methods
  static clearAllCaches(): void {
    weekInfoCache.clear()
    monthInfoCache.clear()
    dateRangeCache.clear()
    timeSlotsCache.clear()
    dayArrayCache.clear()
  }

  static cleanupExpiredCaches(): number {
    const cleaned = weekInfoCache.cleanup() +
                   monthInfoCache.cleanup() +
                   dateRangeCache.cleanup() +
                   timeSlotsCache.cleanup() +
                   dayArrayCache.cleanup()
    
    return cleaned
  }

  static getCacheStats(): {
    weekInfo: number
    monthInfo: number
    dateRange: number
    timeSlots: number
    dayArray: number
    total: number
  } {
    return {
      weekInfo: weekInfoCache.size(),
      monthInfo: monthInfoCache.size(),
      dateRange: dateRangeCache.size(),
      timeSlots: timeSlotsCache.size(),
      dayArray: dayArrayCache.size(),
      total: weekInfoCache.size() + monthInfoCache.size() + dateRangeCache.size() + 
             timeSlotsCache.size() + dayArrayCache.size()
    }
  }
}

// Auto-cleanup expired caches every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    OptimizedDateCalculations.cleanupExpiredCaches()
  }, 300000) // 5 minutes
}

export default OptimizedDateCalculations
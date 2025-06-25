import Fuse from 'fuse.js'
import { CalendarAppointment, Barber, Service } from '@/components/calendar/RobustCalendar'

// ===== TYPES AND INTERFACES =====

export interface SearchOptions {
  fuzzyThreshold?: number
  limit?: number
  includeScore?: boolean
  sortByRelevance?: boolean
}

export interface SearchResult<T> {
  item: T
  score?: number
  matches?: Fuse.FuseResultMatch[]
  highlights?: Map<string, string[]>
}

export interface DateRangeQuery {
  start: Date | null
  end: Date | null
  includeTime?: boolean
}

export interface PriceRangeQuery {
  min: number
  max: number
}

export interface AdvancedSearchQuery {
  // Text search
  query?: string

  // Filters
  barberIds?: number[]
  serviceIds?: number[]
  statuses?: string[]
  paymentStatuses?: string[]
  clientIds?: number[]
  tags?: string[]

  // Range filters
  dateRange?: DateRangeQuery
  priceRange?: PriceRangeQuery
  durationRange?: { min: number; max: number }

  // Logical operators
  operator?: 'AND' | 'OR'

  // Natural language parsing
  naturalLanguage?: boolean
}

export interface SearchCache {
  query: string
  results: any[]
  timestamp: number
  ttl: number
}

export interface SearchAnalytics {
  query: string
  resultCount: number
  searchTime: number
  clickedResults: string[]
  timestamp: Date
}

// ===== NATURAL LANGUAGE PARSING =====

const naturalLanguagePatterns = {
  // Date patterns
  today: () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return { start: today, end: tomorrow }
  },
  tomorrow: () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 1)
    return { start: tomorrow, end: dayAfter }
  },
  'this week': () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)
    return { start: startOfWeek, end: endOfWeek }
  },
  'next week': () => {
    const now = new Date()
    const startOfNextWeek = new Date(now)
    startOfNextWeek.setDate(now.getDate() - now.getDay() + 7)
    startOfNextWeek.setHours(0, 0, 0, 0)
    const endOfNextWeek = new Date(startOfNextWeek)
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 7)
    return { start: startOfNextWeek, end: endOfNextWeek }
  },
  'last week': () => {
    const now = new Date()
    const startOfLastWeek = new Date(now)
    startOfLastWeek.setDate(now.getDate() - now.getDay() - 7)
    startOfLastWeek.setHours(0, 0, 0, 0)
    const endOfLastWeek = new Date(startOfLastWeek)
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 7)
    return { start: startOfLastWeek, end: endOfLastWeek }
  },
  'this month': () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)
    return { start: startOfMonth, end: endOfMonth }
  },
  'next month': () => {
    const now = new Date()
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    endOfNextMonth.setHours(23, 59, 59, 999)
    return { start: startOfNextMonth, end: endOfNextMonth }
  },
  'last month': () => {
    const now = new Date()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    endOfLastMonth.setHours(23, 59, 59, 999)
    return { start: startOfLastMonth, end: endOfLastMonth }
  }
}

// ===== SEARCH SERVICE CLASS =====

export class SearchService {
  private cache: Map<string, SearchCache>
  private analytics: SearchAnalytics[]
  private maxCacheSize: number
  private defaultCacheTTL: number

  constructor() {
    this.cache = new Map()
    this.analytics = []
    this.maxCacheSize = 100
    this.defaultCacheTTL = 5 * 60 * 1000 // 5 minutes
  }

  // ===== APPOINTMENT SEARCH =====

  searchAppointments(
    appointments: CalendarAppointment[],
    query: AdvancedSearchQuery,
    options: SearchOptions = {}
  ): SearchResult<CalendarAppointment>[] {
    const startTime = performance.now()

    // Check cache first
    const cacheKey = this.generateCacheKey('appointments', query)
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached as SearchResult<CalendarAppointment>[]
    }

    // Parse natural language if enabled
    if (query.naturalLanguage && query.query) {
      const parsedQuery = this.parseNaturalLanguage(query.query)
      query = { ...query, ...parsedQuery }
    }

    // Apply filters first
    let filtered = this.applyAppointmentFilters(appointments, query)

    // Then apply fuzzy search if query text exists
    let results: SearchResult<CalendarAppointment>[]

    if (query.query && query.query.trim()) {
      const fuse = new Fuse(filtered, {
        keys: [
          { name: 'title', weight: 0.3 },
          { name: 'client', weight: 0.3 },
          { name: 'barber', weight: 0.2 },
          { name: 'service', weight: 0.2 },
          { name: 'notes', weight: 0.1 },
          { name: 'tags', weight: 0.1 }
        ],
        threshold: options.fuzzyThreshold || 0.3,
        includeScore: true,
        includeMatches: true,
        useExtendedSearch: true
      })

      const fuseResults = fuse.search(query.query)
      results = fuseResults.map(result => ({
        item: result.item,
        score: result.score,
        matches: result.matches,
        highlights: this.generateHighlights(result.matches)
      }))
    } else {
      results = filtered.map(item => ({ item }))
    }

    // Apply sorting
    if (options.sortByRelevance && query.query) {
      results.sort((a, b) => (a.score || 1) - (b.score || 1))
    }

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit)
    }

    // Cache results
    this.addToCache(cacheKey, results)

    // Track analytics
    const searchTime = performance.now() - startTime
    this.trackAnalytics({
      query: query.query || '',
      resultCount: results.length,
      searchTime,
      clickedResults: [],
      timestamp: new Date()
    })

    return results
  }

  // ===== FILTER APPLICATION =====

  private applyAppointmentFilters(
    appointments: CalendarAppointment[],
    query: AdvancedSearchQuery
  ): CalendarAppointment[] {
    return appointments.filter(appointment => {
      const checks: boolean[] = []

      // Barber filter
      if (query.barberIds && query.barberIds.length > 0) {
        checks.push(query.barberIds.includes(appointment.barberId))
      }

      // Service filter
      if (query.serviceIds && query.serviceIds.length > 0) {
        checks.push(query.serviceIds.includes(appointment.serviceId || 0))
      }

      // Status filter
      if (query.statuses && query.statuses.length > 0) {
        checks.push(query.statuses.includes(appointment.status))
      }

      // Payment status filter
      if (query.paymentStatuses && query.paymentStatuses.length > 0) {
        checks.push(query.paymentStatuses.includes(appointment.paymentStatus || ''))
      }

      // Client filter
      if (query.clientIds && query.clientIds.length > 0) {
        checks.push(query.clientIds.includes(appointment.clientId || 0))
      }

      // Tags filter
      if (query.tags && query.tags.length > 0) {
        const appointmentTags = appointment.tags || []
        const hasMatchingTag = query.tags.some(tag => appointmentTags.includes(tag))
        checks.push(hasMatchingTag)
      }

      // Date range filter
      if (query.dateRange?.start && query.dateRange?.end) {
        const appointmentDate = new Date(appointment.date)
        checks.push(
          appointmentDate >= query.dateRange.start &&
          appointmentDate <= query.dateRange.end
        )
      }

      // Price range filter
      if (query.priceRange) {
        checks.push(
          appointment.price >= query.priceRange.min &&
          appointment.price <= query.priceRange.max
        )
      }

      // Duration range filter
      if (query.durationRange) {
        checks.push(
          appointment.duration >= query.durationRange.min &&
          appointment.duration <= query.durationRange.max
        )
      }

      // Apply logical operator
      if (checks.length === 0) return true

      return query.operator === 'OR'
        ? checks.some(check => check)
        : checks.every(check => check)
    })
  }

  // ===== NATURAL LANGUAGE PARSING =====

  private parseNaturalLanguage(input: string): Partial<AdvancedSearchQuery> {
    const result: Partial<AdvancedSearchQuery> = {}
    const lowerInput = input.toLowerCase()

    // Parse date ranges
    for (const [pattern, dateRangeFunc] of Object.entries(naturalLanguagePatterns)) {
      if (lowerInput.includes(pattern)) {
        result.dateRange = dateRangeFunc()
        // Remove the pattern from the query
        result.query = input.replace(new RegExp(pattern, 'gi'), '').trim()
        break
      }
    }

    // Parse specific date mentions (e.g., "on Monday", "on March 15")
    const dateMatch = lowerInput.match(/on\s+(\w+\s+\d+|\w+day)/)
    if (dateMatch) {
      try {
        const dateStr = dateMatch[1]
        const parsedDate = new Date(dateStr)
        if (!isNaN(parsedDate.getTime())) {
          const endDate = new Date(parsedDate)
          endDate.setDate(endDate.getDate() + 1)
          result.dateRange = { start: parsedDate, end: endDate }
          result.query = input.replace(dateMatch[0], '').trim()
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Parse price mentions (e.g., "under $50", "between $20 and $80")
    const priceUnderMatch = lowerInput.match(/under\s+\$?(\d+)/)
    if (priceUnderMatch) {
      result.priceRange = { min: 0, max: parseInt(priceUnderMatch[1]) }
      result.query = input.replace(priceUnderMatch[0], '').trim()
    }

    const priceOverMatch = lowerInput.match(/over\s+\$?(\d+)/)
    if (priceOverMatch) {
      result.priceRange = { min: parseInt(priceOverMatch[1]), max: 999999 }
      result.query = input.replace(priceOverMatch[0], '').trim()
    }

    const priceBetweenMatch = lowerInput.match(/between\s+\$?(\d+)\s+and\s+\$?(\d+)/)
    if (priceBetweenMatch) {
      result.priceRange = {
        min: parseInt(priceBetweenMatch[1]),
        max: parseInt(priceBetweenMatch[2])
      }
      result.query = input.replace(priceBetweenMatch[0], '').trim()
    }

    // Parse status mentions
    const statusKeywords = {
      'confirmed': ['confirmed'],
      'pending': ['pending', 'unconfirmed'],
      'completed': ['completed', 'done', 'finished'],
      'cancelled': ['cancelled', 'canceled'],
      'no_show': ['no show', 'no-show', 'missed']
    }

    for (const [status, keywords] of Object.entries(statusKeywords)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        result.statuses = [status]
        break
      }
    }

    // Parse payment status
    if (lowerInput.includes('paid')) {
      result.paymentStatuses = ['paid']
    } else if (lowerInput.includes('unpaid')) {
      result.paymentStatuses = ['unpaid']
    }

    // If no query remains after parsing, use the original
    if (!result.query || result.query.trim() === '') {
      result.query = input
    }

    return result
  }

  // ===== AUTOCOMPLETE AND SUGGESTIONS =====

  getSuggestions(
    partial: string,
    appointments: CalendarAppointment[],
    barbers: Barber[],
    services: Service[]
  ): string[] {
    const suggestions = new Set<string>()
    const lowerPartial = partial.toLowerCase()

    // Add client names
    appointments.forEach(apt => {
      if (apt.client.toLowerCase().includes(lowerPartial)) {
        suggestions.add(apt.client)
      }
    })

    // Add barber names
    barbers.forEach(barber => {
      if (barber.name.toLowerCase().includes(lowerPartial)) {
        suggestions.add(barber.name)
      }
    })

    // Add service names
    services.forEach(service => {
      if (service.name.toLowerCase().includes(lowerPartial)) {
        suggestions.add(service.name)
      }
    })

    // Add common search terms
    const commonTerms = [
      'today', 'tomorrow', 'this week', 'next week',
      'confirmed', 'pending', 'cancelled',
      'paid', 'unpaid'
    ]

    commonTerms.forEach(term => {
      if (term.includes(lowerPartial)) {
        suggestions.add(term)
      }
    })

    return Array.from(suggestions).slice(0, 10)
  }

  // ===== RECENT SEARCHES =====

  getRecentSearches(limit: number = 10): string[] {
    const searches = this.analytics
      .filter(a => a.query && a.query.trim())
      .map(a => a.query)
      .reverse()

    // Remove duplicates while preserving order
    const unique = Array.from(new Set(searches))

    return unique.slice(0, limit)
  }

  // ===== HIGHLIGHT GENERATION =====

  private generateHighlights(
    matches?: Fuse.FuseResultMatch[]
  ): Map<string, string[]> {
    const highlights = new Map<string, string[]>()

    if (!matches) return highlights

    matches.forEach(match => {
      const fieldHighlights: string[] = []

      match.indices.forEach(([start, end]) => {
        const value = match.value || ''
        const highlighted = value.substring(start, end + 1)
        fieldHighlights.push(highlighted)
      })

      if (fieldHighlights.length > 0) {
        highlights.set(match.key || '', fieldHighlights)
      }
    })

    return highlights
  }

  // ===== CACHE MANAGEMENT =====

  private generateCacheKey(type: string, query: any): string {
    return `${type}:${JSON.stringify(query)}`
  }

  private getFromCache(key: string): any[] | null {
    const cached = this.cache.get(key)

    if (!cached) return null

    // Check if cache is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.results
  }

  private addToCache(key: string, results: any[]): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      query: key,
      results,
      timestamp: Date.now(),
      ttl: this.defaultCacheTTL
    })
  }

  clearCache(): void {
    this.cache.clear()
  }

  // ===== ANALYTICS =====

  private trackAnalytics(analytics: SearchAnalytics): void {
    this.analytics.push(analytics)

    // Keep only last 1000 searches
    if (this.analytics.length > 1000) {
      this.analytics = this.analytics.slice(-1000)
    }
  }

  trackResultClick(query: string, resultId: string): void {
    const lastSearch = this.analytics
      .reverse()
      .find(a => a.query === query)

    if (lastSearch) {
      lastSearch.clickedResults.push(resultId)
    }
  }

  getSearchAnalytics(): {
    totalSearches: number
    averageSearchTime: number
    popularQueries: Array<{ query: string; count: number }>
    averageResultCount: number
    clickThroughRate: number
  } {
    const totalSearches = this.analytics.length

    const averageSearchTime = totalSearches > 0
      ? this.analytics.reduce((sum, a) => sum + a.searchTime, 0) / totalSearches
      : 0

    const averageResultCount = totalSearches > 0
      ? this.analytics.reduce((sum, a) => sum + a.resultCount, 0) / totalSearches
      : 0

    // Calculate popular queries
    const queryCounts = new Map<string, number>()
    this.analytics.forEach(a => {
      if (a.query) {
        queryCounts.set(a.query, (queryCounts.get(a.query) || 0) + 1)
      }
    })

    const popularQueries = Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate click-through rate
    const searchesWithClicks = this.analytics.filter(a => a.clickedResults.length > 0).length
    const clickThroughRate = totalSearches > 0
      ? (searchesWithClicks / totalSearches) * 100
      : 0

    return {
      totalSearches,
      averageSearchTime,
      popularQueries,
      averageResultCount,
      clickThroughRate
    }
  }
}

// ===== SINGLETON INSTANCE =====

export const searchService = new SearchService()

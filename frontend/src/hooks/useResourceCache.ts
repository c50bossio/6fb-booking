/**
 * Resource-specific hooks for intelligent caching of common API resources
 * Provides specialized caching strategies for different types of data
 */
import { useCallback, useMemo } from 'react'
import { useApiStateWithCache, useMultiApiStateWithCache } from './useApiStateWithCache'
import { apiClient } from '@/lib/api/client'
import { cacheManager } from '@/lib/cache/cacheManager'

// API endpoint functions
const api = {
  users: {
    getAll: () => apiClient.get('/users'),
    getById: (id: number) => apiClient.get(`/users/${id}`),
    getMe: () => apiClient.get('/users/me'),
    getProfile: (id: number) => apiClient.get(`/users/${id}/profile`)
  },
  appointments: {
    getAll: (params?: any) => apiClient.get('/appointments', { params }),
    getById: (id: number) => apiClient.get(`/appointments/${id}`),
    getUpcoming: () => apiClient.get('/appointments/upcoming'),
    getByDate: (date: string) => apiClient.get(`/appointments/date/${date}`),
    getByBarber: (barberId: number) => apiClient.get(`/appointments/barber/${barberId}`)
  },
  analytics: {
    getDashboard: () => apiClient.get('/analytics/dashboard'),
    getRevenue: (period?: string) => apiClient.get('/analytics/revenue', { params: { period } }),
    getPerformance: () => apiClient.get('/analytics/performance'),
    getMetrics: (type: string) => apiClient.get(`/analytics/metrics/${type}`)
  },
  clients: {
    getAll: (params?: any) => apiClient.get('/clients', { params }),
    getById: (id: number) => apiClient.get(`/clients/${id}`),
    getHistory: (id: number) => apiClient.get(`/clients/${id}/history`)
  },
  barbers: {
    getAll: () => apiClient.get('/barbers'),
    getById: (id: number) => apiClient.get(`/barbers/${id}`),
    getSchedule: (id: number, date?: string) => apiClient.get(`/barbers/${id}/schedule`, { params: { date } })
  },
  financial: {
    getDashboard: () => apiClient.get('/financial/dashboard'),
    getPayouts: () => apiClient.get('/financial/payouts'),
    getTransactions: (params?: any) => apiClient.get('/financial/transactions', { params })
  }
}

/**
 * Hook for caching user-related data with intelligent invalidation
 */
export function useUsersCache() {
  // Current user data with high priority caching
  const currentUser = useApiStateWithCache(
    api.users.getMe,
    {
      cacheKey: 'users:me',
      cacheTTL: 600000, // 10 minutes
      cacheTags: ['users', 'auth', 'profile'],
      cachePriority: 'high',
      staleWhileRevalidate: true,
      backgroundRefresh: true,
      onCacheHit: (data) => {
        // Update global user context
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(data))
        }
      }
    }
  )

  // All users list with medium priority
  const allUsers = useApiStateWithCache(
    api.users.getAll,
    {
      cacheKey: 'users:all',
      cacheTTL: 300000, // 5 minutes
      cacheTags: ['users', 'list'],
      cachePriority: 'medium',
      staleWhileRevalidate: true,
      immediate: false // Load on demand
    }
  )

  // Individual user getter with entity-specific caching
  const getUser = useCallback((id: number) => {
    return useApiStateWithCache(
      () => api.users.getById(id),
      {
        cacheKey: `users:entity:${id}`,
        cacheTTL: 600000, // 10 minutes
        cacheTags: ['users', 'entity', `user:${id}`],
        cachePriority: 'medium',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  // User profile with extended caching
  const getUserProfile = useCallback((id: number) => {
    return useApiStateWithCache(
      () => api.users.getProfile(id),
      {
        cacheKey: `users:profile:${id}`,
        cacheTTL: 900000, // 15 minutes
        cacheTags: ['users', 'profile', `user:${id}`],
        cachePriority: 'low',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  // Bulk operations
  const invalidateAllUsers = useCallback(() => {
    cacheManager.invalidateByTag('users')
  }, [])

  const invalidateUser = useCallback((id: number) => {
    cacheManager.invalidateByTag(`user:${id}`)
  }, [])

  const warmUserCache = useCallback(async (userIds: number[]) => {
    const endpoints = userIds.map(id => `/users/${id}`)
    await cacheManager.prefetch(endpoints, 'medium')
  }, [])

  return {
    currentUser,
    allUsers,
    getUser,
    getUserProfile,
    invalidateAllUsers,
    invalidateUser,
    warmUserCache,
    // Helper methods
    refreshCurrentUser: currentUser.refresh,
    isCurrentUserLoading: currentUser.loading,
    currentUserError: currentUser.error
  }
}

/**
 * Hook for caching appointment data with time-sensitive strategies
 */
export function useAppointmentsCache() {
  // Upcoming appointments with high-frequency refresh
  const upcomingAppointments = useApiStateWithCache(
    api.appointments.getUpcoming,
    {
      cacheKey: 'appointments:upcoming',
      cacheTTL: 120000, // 2 minutes (time-sensitive)
      cacheTags: ['appointments', 'upcoming'],
      cachePriority: 'high',
      staleWhileRevalidate: true,
      backgroundRefresh: true
    }
  )

  // All appointments with pagination-aware caching
  const getAllAppointments = useCallback((params?: any) => {
    const cacheKey = `appointments:all:${JSON.stringify(params || {})}`
    
    return useApiStateWithCache(
      () => api.appointments.getAll(params),
      {
        cacheKey,
        cacheTTL: 300000, // 5 minutes
        cacheTags: ['appointments', 'list'],
        cachePriority: 'medium',
        staleWhileRevalidate: true,
        immediate: false,
        prefetchRelated: params?.date ? [`/appointments/date/${params.date}`] : []
      }
    )
  }, [])

  // Date-specific appointments with date-based invalidation
  const getAppointmentsByDate = useCallback((date: string) => {
    return useApiStateWithCache(
      () => api.appointments.getByDate(date),
      {
        cacheKey: `appointments:date:${date}`,
        cacheTTL: 180000, // 3 minutes
        cacheTags: ['appointments', 'date', `date:${date}`],
        cachePriority: 'high',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  // Barber-specific appointments
  const getAppointmentsByBarber = useCallback((barberId: number) => {
    return useApiStateWithCache(
      () => api.appointments.getByBarber(barberId),
      {
        cacheKey: `appointments:barber:${barberId}`,
        cacheTTL: 240000, // 4 minutes
        cacheTags: ['appointments', 'barber', `barber:${barberId}`],
        cachePriority: 'medium',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  // Individual appointment with optimistic updates
  const getAppointment = useCallback((id: number) => {
    return useApiStateWithCache(
      () => api.appointments.getById(id),
      {
        cacheKey: `appointments:entity:${id}`,
        cacheTTL: 300000, // 5 minutes
        cacheTags: ['appointments', 'entity', `appointment:${id}`],
        cachePriority: 'medium',
        staleWhileRevalidate: true,
        optimisticUpdates: true,
        immediate: false
      }
    )
  }, [])

  // Cache management functions
  const invalidateAppointments = useCallback((scope?: 'all' | 'upcoming' | 'date' | number) => {
    if (scope === 'all') {
      cacheManager.invalidateByTag('appointments')
    } else if (scope === 'upcoming') {
      cacheManager.invalidateByTag('upcoming')
    } else if (scope === 'date') {
      // Invalidate today's appointments
      const today = new Date().toISOString().split('T')[0]
      cacheManager.invalidateByTag(`date:${today}`)
    } else if (typeof scope === 'number') {
      cacheManager.invalidateByTag(`appointment:${scope}`)
    }
  }, [])

  const warmAppointmentCache = useCallback(async (date?: string) => {
    const endpoints = ['/appointments/upcoming']
    
    if (date) {
      endpoints.push(`/appointments/date/${date}`)
    } else {
      // Warm current week
      const today = new Date()
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        endpoints.push(`/appointments/date/${date.toISOString().split('T')[0]}`)
      }
    }
    
    await cacheManager.prefetch(endpoints, 'medium')
  }, [])

  return {
    upcomingAppointments,
    getAllAppointments,
    getAppointmentsByDate,
    getAppointmentsByBarber,
    getAppointment,
    invalidateAppointments,
    warmAppointmentCache,
    // Helper methods
    refreshUpcoming: upcomingAppointments.refresh,
    isUpcomingLoading: upcomingAppointments.loading,
    upcomingError: upcomingAppointments.error
  }
}

/**
 * Hook for caching analytics data with different refresh strategies
 */
export function useAnalyticsCache() {
  // Dashboard analytics with background refresh
  const dashboardAnalytics = useApiStateWithCache(
    api.analytics.getDashboard,
    {
      cacheKey: 'analytics:dashboard',
      cacheTTL: 600000, // 10 minutes
      cacheTags: ['analytics', 'dashboard'],
      cachePriority: 'high',
      staleWhileRevalidate: true,
      backgroundRefresh: true
    }
  )

  // Revenue analytics with period-based caching
  const getRevenueAnalytics = useCallback((period: string = 'month') => {
    return useApiStateWithCache(
      () => api.analytics.getRevenue(period),
      {
        cacheKey: `analytics:revenue:${period}`,
        cacheTTL: 900000, // 15 minutes
        cacheTags: ['analytics', 'revenue', `period:${period}`],
        cachePriority: 'medium',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  // Performance metrics with longer TTL
  const performanceMetrics = useApiStateWithCache(
    api.analytics.getPerformance,
    {
      cacheKey: 'analytics:performance',
      cacheTTL: 1800000, // 30 minutes
      cacheTags: ['analytics', 'performance'],
      cachePriority: 'low',
      staleWhileRevalidate: true,
      immediate: false
    }
  )

  // Specific metrics getter
  const getMetrics = useCallback((type: string) => {
    return useApiStateWithCache(
      () => api.analytics.getMetrics(type),
      {
        cacheKey: `analytics:metrics:${type}`,
        cacheTTL: 1200000, // 20 minutes
        cacheTags: ['analytics', 'metrics', `metrics:${type}`],
        cachePriority: 'low',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  // Multi-period analytics for comparison
  const getMultiPeriodAnalytics = useCallback((periods: string[]) => {
    const apiCalls = periods.reduce((acc, period) => {
      acc[period] = () => api.analytics.getRevenue(period)
      return acc
    }, {} as Record<string, () => Promise<any>>)

    return useMultiApiStateWithCache(apiCalls, {
      cacheKey: 'analytics:multi-period',
      cacheTTL: 900000, // 15 minutes
      cacheTags: ['analytics', 'revenue', 'comparison'],
      cachePriority: 'medium',
      staleWhileRevalidate: true
    })
  }, [])

  // Cache management
  const invalidateAnalytics = useCallback((scope?: 'all' | 'dashboard' | 'revenue' | 'performance') => {
    if (scope === 'all') {
      cacheManager.invalidateByTag('analytics')
    } else if (scope) {
      cacheManager.invalidateByTag(scope)
    }
  }, [])

  const warmAnalyticsCache = useCallback(async () => {
    const endpoints = [
      '/analytics/dashboard',
      '/analytics/performance',
      '/analytics/revenue?period=week',
      '/analytics/revenue?period=month'
    ]
    
    await cacheManager.prefetch(endpoints, 'low')
  }, [])

  return {
    dashboardAnalytics,
    getRevenueAnalytics,
    performanceMetrics,
    getMetrics,
    getMultiPeriodAnalytics,
    invalidateAnalytics,
    warmAnalyticsCache,
    // Helper methods
    refreshDashboard: dashboardAnalytics.refresh,
    isDashboardLoading: dashboardAnalytics.loading,
    dashboardError: dashboardAnalytics.error
  }
}

/**
 * Hook for caching client data with relationship-aware invalidation
 */
export function useClientsCache() {
  // All clients with search-aware caching
  const getAllClients = useCallback((params?: any) => {
    const cacheKey = `clients:all:${JSON.stringify(params || {})}`
    
    return useApiStateWithCache(
      () => api.clients.getAll(params),
      {
        cacheKey,
        cacheTTL: 600000, // 10 minutes
        cacheTags: ['clients', 'list'],
        cachePriority: 'medium',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  // Individual client with extended caching
  const getClient = useCallback((id: number) => {
    return useApiStateWithCache(
      () => api.clients.getById(id),
      {
        cacheKey: `clients:entity:${id}`,
        cacheTTL: 1200000, // 20 minutes
        cacheTags: ['clients', 'entity', `client:${id}`],
        cachePriority: 'medium',
        staleWhileRevalidate: true,
        immediate: false,
        prefetchRelated: [`/clients/${id}/history`]
      }
    )
  }, [])

  // Client history with long-term caching
  const getClientHistory = useCallback((id: number) => {
    return useApiStateWithCache(
      () => api.clients.getHistory(id),
      {
        cacheKey: `clients:history:${id}`,
        cacheTTL: 1800000, // 30 minutes
        cacheTags: ['clients', 'history', `client:${id}`],
        cachePriority: 'low',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  const invalidateClients = useCallback((scope?: 'all' | number) => {
    if (scope === 'all') {
      cacheManager.invalidateByTag('clients')
    } else if (typeof scope === 'number') {
      cacheManager.invalidateByTag(`client:${scope}`)
    }
  }, [])

  return {
    getAllClients,
    getClient,
    getClientHistory,
    invalidateClients
  }
}

/**
 * Hook for caching barber data with schedule-aware strategies
 */
export function useBarbersCache() {
  // All barbers with medium-term caching
  const allBarbers = useApiStateWithCache(
    api.barbers.getAll,
    {
      cacheKey: 'barbers:all',
      cacheTTL: 900000, // 15 minutes
      cacheTags: ['barbers', 'list'],
      cachePriority: 'medium',
      staleWhileRevalidate: true
    }
  )

  // Individual barber
  const getBarber = useCallback((id: number) => {
    return useApiStateWithCache(
      () => api.barbers.getById(id),
      {
        cacheKey: `barbers:entity:${id}`,
        cacheTTL: 900000, // 15 minutes
        cacheTags: ['barbers', 'entity', `barber:${id}`],
        cachePriority: 'medium',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  // Barber schedule with time-sensitive caching
  const getBarberSchedule = useCallback((id: number, date?: string) => {
    const dateKey = date || new Date().toISOString().split('T')[0]
    
    return useApiStateWithCache(
      () => api.barbers.getSchedule(id, date),
      {
        cacheKey: `barbers:schedule:${id}:${dateKey}`,
        cacheTTL: 300000, // 5 minutes (schedule changes frequently)
        cacheTags: ['barbers', 'schedule', `barber:${id}`, `date:${dateKey}`],
        cachePriority: 'high',
        staleWhileRevalidate: true,
        immediate: false
      }
    )
  }, [])

  return {
    allBarbers,
    getBarber,
    getBarberSchedule
  }
}

/**
 * Hook for caching financial data with security-aware strategies
 */
export function useFinancialCache() {
  // Financial dashboard with high-security caching
  const financialDashboard = useApiStateWithCache(
    api.financial.getDashboard,
    {
      cacheKey: 'financial:dashboard',
      cacheTTL: 300000, // 5 minutes (sensitive data)
      cacheTags: ['financial', 'dashboard', 'sensitive'],
      cachePriority: 'high',
      staleWhileRevalidate: false, // Don't serve stale financial data
      backgroundRefresh: true
    }
  )

  // Payouts with audit-trail awareness
  const payouts = useApiStateWithCache(
    api.financial.getPayouts,
    {
      cacheKey: 'financial:payouts',
      cacheTTL: 600000, // 10 minutes
      cacheTags: ['financial', 'payouts', 'sensitive'],
      cachePriority: 'high',
      staleWhileRevalidate: false,
      immediate: false
    }
  )

  // Transactions with parameter-aware caching
  const getTransactions = useCallback((params?: any) => {
    const cacheKey = `financial:transactions:${JSON.stringify(params || {})}`
    
    return useApiStateWithCache(
      () => api.financial.getTransactions(params),
      {
        cacheKey,
        cacheTTL: 600000, // 10 minutes
        cacheTags: ['financial', 'transactions', 'sensitive'],
        cachePriority: 'high',
        staleWhileRevalidate: false,
        immediate: false
      }
    )
  }, [])

  // Strict invalidation for financial data
  const invalidateFinancialData = useCallback((clearAll = false) => {
    if (clearAll) {
      cacheManager.invalidateByTag('financial')
    } else {
      // Only invalidate non-sensitive cached data
      cacheManager.invalidateByTag('dashboard')
    }
  }, [])

  return {
    financialDashboard,
    payouts,
    getTransactions,
    invalidateFinancialData,
    // Security helpers
    clearSensitiveCache: () => cacheManager.invalidateByTag('sensitive'),
    refreshFinancialData: financialDashboard.refresh
  }
}

/**
 * Master resource cache controller
 */
export function useResourceCacheController() {
  const users = useUsersCache()
  const appointments = useAppointmentsCache()
  const analytics = useAnalyticsCache()
  const clients = useClientsCache()
  const barbers = useBarbersCache()
  const financial = useFinancialCache()

  // Global cache operations
  const invalidateAllResourceCaches = useCallback(() => {
    cacheManager.clear()
  }, [])

  const warmAllCaches = useCallback(async () => {
    await Promise.all([
      users.warmUserCache([]),
      appointments.warmAppointmentCache(),
      analytics.warmAnalyticsCache()
    ])
  }, [users, appointments, analytics])

  const getGlobalCacheStats = useCallback(() => {
    return cacheManager.getMetrics()
  }, [])

  // Resource-specific bulk operations
  const bulkInvalidate = useCallback((resources: Array<'users' | 'appointments' | 'analytics' | 'clients' | 'barbers' | 'financial'>) => {
    resources.forEach(resource => {
      cacheManager.invalidateByTag(resource)
    })
  }, [])

  return {
    users,
    appointments,
    analytics,
    clients,
    barbers,
    financial,
    // Global operations
    invalidateAllResourceCaches,
    warmAllCaches,
    getGlobalCacheStats,
    bulkInvalidate
  }
}
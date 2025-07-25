'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, format, parseISO } from 'date-fns'
import { 
  CircleStackIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  ChartBarIcon,
  CpuChipIcon,
  CloudArrowDownIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCalendar, CalendarAppointment, CalendarBarber } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface CacheEntry {
  key: string
  data: any
  timestamp: number
  ttl: number // Time to live in milliseconds
  size: number // Estimated size in bytes
  hitCount: number
  lastAccessed: number
  priority: 'high' | 'medium' | 'low'
  type: 'appointments' | 'barbers' | 'analytics' | 'ui-state' | 'api-response'
}

interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  evictionCount: number
  memoryUsage: number
  compressionRatio: number
}

interface PrefetchStrategy {
  type: 'calendar-range' | 'user-behavior' | 'time-based' | 'dependency-graph'
  description: string
  enabled: boolean
  priority: number
}

interface AdvancedCacheManagerProps {
  className?: string
  maxCacheSize?: number // Max cache size in MB
  defaultTTL?: number // Default TTL in minutes
  enablePrefetching?: boolean
  enableCompression?: boolean
  showDebugInfo?: boolean
  onCacheHit?: (key: string) => void
  onCacheMiss?: (key: string) => void
  onCacheEviction?: (key: string) => void
}

export default function AdvancedCacheManager({
  className,
  maxCacheSize = 50, // 50MB default
  defaultTTL = 30, // 30 minutes default
  enablePrefetching = true,
  enableCompression = true,
  showDebugInfo = false,
  onCacheHit,
  onCacheMiss,
  onCacheEviction
}: AdvancedCacheManagerProps) {
  const { state, actions } = useCalendar()
  const [cacheEntries, setCacheEntries] = useState<Map<string, CacheEntry>>(new Map())
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    memoryUsage: 0,
    compressionRatio: 0
  })
  const [prefetchStrategies, setPrefetchStrategies] = useState<PrefetchStrategy[]>([
    {
      type: 'calendar-range',
      description: 'Prefetch appointments for upcoming weeks',
      enabled: true,
      priority: 1
    },
    {
      type: 'user-behavior',
      description: 'Prefetch based on user navigation patterns',
      enabled: true,
      priority: 2
    },
    {
      type: 'time-based',
      description: 'Prefetch during low activity periods',
      enabled: true,
      priority: 3
    },
    {
      type: 'dependency-graph',
      description: 'Prefetch related data automatically',
      enabled: true,
      priority: 4
    }
  ])
  
  const cacheHitCountRef = useRef(0)
  const cacheMissCountRef = useRef(0)
  const evictionCountRef = useRef(0)
  const compressionWorkerRef = useRef<Worker | null>(null)

  // Initialize compression worker
  useEffect(() => {
    if (enableCompression && typeof Worker !== 'undefined') {
      try {
        // In production, this would load a proper compression worker
        compressionWorkerRef.current = new Worker(
          URL.createObjectURL(new Blob([`
            self.onmessage = function(e) {
              const { type, data, key } = e.data;
              if (type === 'compress') {
                // Simple compression simulation
                const compressed = JSON.stringify(data);
                self.postMessage({ 
                  type: 'compressed', 
                  key, 
                  data: compressed,
                  originalSize: JSON.stringify(data).length,
                  compressedSize: compressed.length
                });
              }
            }
          `], { type: 'application/javascript' }))
        )
        
        compressionWorkerRef.current.onmessage = (e) => {
          const { type, key, data, originalSize, compressedSize } = e.data
          if (type === 'compressed') {
            updateCacheEntry(key, data, { 
              compressed: true,
              originalSize,
              compressedSize
            })
          }
        }
      } catch (error) {
        console.warn('Failed to initialize compression worker:', error)
      }
    }

    return () => {
      if (compressionWorkerRef.current) {
        compressionWorkerRef.current.terminate()
      }
    }
  }, [enableCompression])

  // Cache management functions
  const generateCacheKey = useCallback((type: string, params: any): string => {
    const paramString = JSON.stringify(params, Object.keys(params).sort())
    return `${type}:${btoa(paramString).replace(/[+/=]/g, '')}`
  }, [])

  const estimateSize = useCallback((data: any): number => {
    return new Blob([JSON.stringify(data)]).size
  }, [])

  const isExpired = useCallback((entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp > entry.ttl
  }, [])

  const updateCacheEntry = useCallback((key: string, data: any, metadata?: any) => {
    setCacheEntries(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(key)
      
      const entry: CacheEntry = {
        key,
        data,
        timestamp: Date.now(),
        ttl: defaultTTL * 60 * 1000,
        size: estimateSize(data),
        hitCount: existing?.hitCount || 0,
        lastAccessed: Date.now(),
        priority: metadata?.priority || 'medium',
        type: metadata?.type || 'api-response',
        ...metadata
      }
      
      newMap.set(key, entry)
      return newMap
    })
  }, [defaultTTL, estimateSize])

  const get = useCallback((key: string): any => {
    const entry = cacheEntries.get(key)
    
    if (!entry) {
      cacheMissCountRef.current++
      onCacheMiss?.(key)
      return null
    }
    
    if (isExpired(entry)) {
      cacheEntries.delete(key)
      cacheMissCountRef.current++
      onCacheMiss?.(key)
      return null
    }
    
    // Update access statistics
    entry.hitCount++
    entry.lastAccessed = Date.now()
    cacheHitCountRef.current++
    onCacheHit?.(key)
    
    return entry.data
  }, [cacheEntries, isExpired, onCacheHit, onCacheMiss])

  const set = useCallback((key: string, data: any, options?: {
    ttl?: number
    priority?: 'high' | 'medium' | 'low'
    type?: CacheEntry['type']
  }) => {
    const ttl = (options?.ttl || defaultTTL) * 60 * 1000
    const size = estimateSize(data)
    
    // Check if we need to evict entries to make room
    const currentSize = Array.from(cacheEntries.values()).reduce((sum, entry) => sum + entry.size, 0)
    const maxBytes = maxCacheSize * 1024 * 1024
    
    if (currentSize + size > maxBytes) {
      evictEntries(size)
    }
    
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      size,
      hitCount: 0,
      lastAccessed: Date.now(),
      priority: options?.priority || 'medium',
      type: options?.type || 'api-response'
    }
    
    if (enableCompression && compressionWorkerRef.current && size > 1024) {
      // Compress large entries
      compressionWorkerRef.current.postMessage({ 
        type: 'compress', 
        data, 
        key 
      })
    } else {
      setCacheEntries(prev => new Map(prev).set(key, entry))
    }
  }, [cacheEntries, defaultTTL, estimateSize, maxCacheSize, enableCompression])

  const evictEntries = useCallback((spaceNeeded: number) => {
    const entries = Array.from(cacheEntries.entries())
    
    // Sort by eviction priority (LRU + priority + TTL)
    entries.sort(([keyA, entryA], [keyB, entryB]) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      const scoreA = entryA.lastAccessed + (priorityWeight[entryA.priority] * 3600000) // 1 hour per priority level
      const scoreB = entryB.lastAccessed + (priorityWeight[entryB.priority] * 3600000)
      return scoreA - scoreB
    })
    
    let freedSpace = 0
    const toEvict: string[] = []
    
    for (const [key, entry] of entries) {
      toEvict.push(key)
      freedSpace += entry.size
      evictionCountRef.current++
      onCacheEviction?.(key)
      
      if (freedSpace >= spaceNeeded) break
    }
    
    setCacheEntries(prev => {
      const newMap = new Map(prev)
      toEvict.forEach(key => newMap.delete(key))
      return newMap
    })
  }, [cacheEntries, onCacheEviction])

  const clear = useCallback((type?: CacheEntry['type']) => {
    setCacheEntries(prev => {
      if (!type) return new Map()
      
      const newMap = new Map(prev)
      for (const [key, entry] of newMap.entries()) {
        if (entry.type === type) {
          newMap.delete(key)
        }
      }
      return newMap
    })
  }, [])

  // Prefetching strategies
  const prefetchCalendarRange = useCallback(async (centerDate: Date, rangeDays: number = 14) => {
    const startDate = addDays(centerDate, -rangeDays / 2)
    const endDate = addDays(centerDate, rangeDays / 2)
    
    // Prefetch appointments for the range
    for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
      const key = generateCacheKey('appointments', { date: format(date, 'yyyy-MM-dd') })
      
      if (!get(key)) {
        try {
          const response = await fetch(`/api/v2/appointments?date=${format(date, 'yyyy-MM-dd')}`)
          const appointments = await response.json()
          set(key, appointments, { type: 'appointments', priority: 'medium' })
        } catch (error) {
          console.warn('Prefetch failed for date:', date, error)
        }
      }
    }
  }, [generateCacheKey, get, set])

  const prefetchUserBehavior = useCallback(async () => {
    // Prefetch based on user's typical navigation patterns
    const currentView = state.view
    const currentDate = state.currentDate
    
    // Prefetch adjacent time periods
    const nextPeriod = currentView === 'day' ? addDays(currentDate, 1) :
                      currentView === 'week' ? addDays(currentDate, 7) :
                      addDays(currentDate, 30)
    
    const prevPeriod = currentView === 'day' ? addDays(currentDate, -1) :
                      currentView === 'week' ? addDays(currentDate, -7) :
                      addDays(currentDate, -30)
    
    await Promise.all([
      prefetchCalendarRange(nextPeriod, 7),
      prefetchCalendarRange(prevPeriod, 7)
    ])
  }, [state.view, state.currentDate, prefetchCalendarRange])

  const prefetchDependencies = useCallback(async (appointmentIds: string[]) => {
    // Prefetch related data for appointments
    const promises = appointmentIds.map(async id => {
      const clientKey = generateCacheKey('client', { appointmentId: id })
      const barberKey = generateCacheKey('barber', { appointmentId: id })
      
      if (!get(clientKey) || !get(barberKey)) {
        try {
          const [clientResponse, barberResponse] = await Promise.all([
            fetch(`/api/v2/appointments/${id}/client`),
            fetch(`/api/v2/appointments/${id}/barber`)
          ])
          
          const [client, barber] = await Promise.all([
            clientResponse.json(),
            barberResponse.json()
          ])
          
          set(clientKey, client, { type: 'api-response', priority: 'low' })
          set(barberKey, barber, { type: 'api-response', priority: 'low' })
        } catch (error) {
          console.warn('Dependency prefetch failed for appointment:', id, error)
        }
      }
    })
    
    await Promise.all(promises)
  }, [generateCacheKey, get, set])

  // Execute prefetching strategies
  useEffect(() => {
    if (!enablePrefetching) return

    const executePrefetch = async () => {
      const enabledStrategies = prefetchStrategies
        .filter(s => s.enabled)
        .sort((a, b) => a.priority - b.priority)
      
      for (const strategy of enabledStrategies) {
        try {
          switch (strategy.type) {
            case 'calendar-range':
              await prefetchCalendarRange(state.currentDate)
              break
            case 'user-behavior':
              await prefetchUserBehavior()
              break
            case 'dependency-graph':
              const visibleAppointmentIds = state.appointments
                .slice(0, 20) // Limit to prevent excessive prefetching
                .map(apt => apt.id.toString())
              await prefetchDependencies(visibleAppointmentIds)
              break
          }
        } catch (error) {
          console.warn('Prefetch strategy failed:', strategy.type, error)
        }
      }
    }

    // Debounce prefetching
    const timeoutId = setTimeout(executePrefetch, 1000)
    return () => clearTimeout(timeoutId)
  }, [enablePrefetching, prefetchStrategies, state.currentDate, state.appointments, prefetchCalendarRange, prefetchUserBehavior, prefetchDependencies])

  // Update cache statistics
  useEffect(() => {
    const updateStats = () => {
      const entries = Array.from(cacheEntries.values())
      const totalHits = cacheHitCountRef.current
      const totalMisses = cacheMissCountRef.current
      const totalRequests = totalHits + totalMisses
      
      setCacheStats({
        totalEntries: entries.length,
        totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
        hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
        missRate: totalRequests > 0 ? (totalMisses / totalRequests) * 100 : 0,
        evictionCount: evictionCountRef.current,
        memoryUsage: (entries.reduce((sum, entry) => sum + entry.size, 0) / (maxCacheSize * 1024 * 1024)) * 100,
        compressionRatio: enableCompression ? 0.7 : 1 // Placeholder
      })
    }

    const intervalId = setInterval(updateStats, 5000) // Update every 5 seconds
    updateStats() // Initial update
    
    return () => clearInterval(intervalId)
  }, [cacheEntries, maxCacheSize, enableCompression])

  // Cleanup expired entries
  useEffect(() => {
    const cleanupExpired = () => {
      setCacheEntries(prev => {
        const newMap = new Map(prev)
        for (const [key, entry] of newMap.entries()) {
          if (isExpired(entry)) {
            newMap.delete(key)
          }
        }
        return newMap
      })
    }

    const intervalId = setInterval(cleanupExpired, 60000) // Cleanup every minute
    return () => clearInterval(intervalId)
  }, [isExpired])

  // Cache API for external use
  const cacheAPI = useMemo(() => ({
    get,
    set,
    clear,
    generateKey: generateCacheKey,
    stats: cacheStats
  }), [get, set, clear, generateCacheKey, cacheStats])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Cache Statistics */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <CircleStackIcon className="h-5 w-5 text-blue-600" />
            <span>Advanced Cache Manager</span>
            <Badge variant="secondary" className="ml-2">
              {cacheStats.totalEntries} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {cacheStats.hitRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Hit Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(cacheStats.totalSize / 1024 / 1024).toFixed(1)}MB
              </div>
              <div className="text-sm text-gray-600">Cache Size</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {cacheStats.totalEntries}
              </div>
              <div className="text-sm text-gray-600">Entries</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {cacheStats.evictionCount}
              </div>
              <div className="text-sm text-gray-600">Evictions</div>
            </div>
          </div>

          {/* Memory Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Memory Usage</span>
              <span className="text-sm text-gray-600">
                {cacheStats.memoryUsage.toFixed(1)}% of {maxCacheSize}MB
              </span>
            </div>
            <Progress value={cacheStats.memoryUsage} className="h-2" />
          </div>

          {/* Cache Controls */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clear()}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Clear All
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => prefetchCalendarRange(state.currentDate)}
              >
                <CloudArrowDownIcon className="h-4 w-4 mr-1" />
                Prefetch
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              {enableCompression && (
                <Badge variant="outline" className="text-xs">
                  Compression: {(cacheStats.compressionRatio * 100).toFixed(0)}%
                </Badge>
              )}
              
              {enablePrefetching && (
                <Badge variant="outline" className="text-xs">
                  Prefetching Enabled
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prefetch Strategies */}
      {enablePrefetching && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <BoltIcon className="h-4 w-4 text-yellow-600" />
              <span>Prefetch Strategies</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {prefetchStrategies.map((strategy, index) => (
                <div key={strategy.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant={strategy.enabled ? "default" : "outline"} className="text-xs">
                      #{strategy.priority}
                    </Badge>
                    <span className="text-sm font-medium capitalize">
                      {strategy.type.replace('-', ' ')}
                    </span>
                    <span className="text-xs text-gray-600">
                      {strategy.description}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPrefetchStrategies(prev => 
                        prev.map((s, i) => 
                          i === index ? { ...s, enabled: !s.enabled } : s
                        )
                      )
                    }}
                  >
                    {strategy.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      {showDebugInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <CpuChipIcon className="h-4 w-4 text-gray-600" />
              <span>Cache Debug Info</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Array.from(cacheEntries.entries()).map(([key, entry]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {entry.type}
                    </Badge>
                    <span className="font-mono truncate max-w-[200px]">
                      {key}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">
                      {(entry.size / 1024).toFixed(1)}KB
                    </span>
                    <span className="text-blue-600">
                      {entry.hitCount} hits
                    </span>
                    <span className="text-gray-600">
                      {Math.round((Date.now() - entry.timestamp) / 1000)}s ago
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
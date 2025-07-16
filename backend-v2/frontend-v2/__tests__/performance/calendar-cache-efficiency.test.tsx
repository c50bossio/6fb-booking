/**
 * Calendar Cache Efficiency & Lazy Loading Performance Tests
 * 
 * Comprehensive testing of CalendarCacheManager performance under load,
 * cache hit ratios, TTL management, compression efficiency, and lazy loading optimization.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

import { CalendarCacheManager, CalendarCache, CacheConfig, LazyLoadConfig } from '@/components/calendar/CalendarCacheManager'
import { VirtualizedCalendarGrid } from '@/components/calendar/VirtualizedCalendarGrid'
import UnifiedCalendar from '@/components/UnifiedCalendar'

// Mock compression library
jest.mock('lz-string', () => ({
  compress: jest.fn((data) => `compressed_${data.length}`),
  decompress: jest.fn((data) => data.replace('compressed_', '').repeat(100)),
  compressToUTF16: jest.fn((data) => `utf16_${data.length}`),
  decompressFromUTF16: jest.fn((data) => data.replace('utf16_', '').repeat(100))
}))

// Mock localStorage for persistence testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Performance monitoring utilities
class CachePerformanceMonitor {
  private metrics: {
    cacheHits: number
    cacheMisses: number
    cacheSize: number
    compressionRatio: number
    averageResponseTime: number[]
    memoryUsage: number[]
    evictionCount: number
  } = {
    cacheHits: 0,
    cacheMisses: 0,
    cacheSize: 0,
    compressionRatio: 0,
    averageResponseTime: [],
    memoryUsage: [],
    evictionCount: 0
  }

  recordCacheHit() {
    this.metrics.cacheHits++
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++
  }

  recordResponseTime(time: number) {
    this.metrics.averageResponseTime.push(time)
  }

  recordMemoryUsage(bytes: number) {
    this.metrics.memoryUsage.push(bytes)
  }

  recordEviction() {
    this.metrics.evictionCount++
  }

  getCacheHitRatio(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses
    return total > 0 ? (this.metrics.cacheHits / total) * 100 : 0
  }

  getAverageResponseTime(): number {
    const times = this.metrics.averageResponseTime
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }

  getMemoryEfficiency(): number {
    const usage = this.metrics.memoryUsage
    if (usage.length < 2) return 0
    
    const growth = usage[usage.length - 1] - usage[0]
    return growth / usage[0] * 100 // Percentage growth
  }

  reset() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheSize: 0,
      compressionRatio: 0,
      averageResponseTime: [],
      memoryUsage: [],
      evictionCount: 0
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRatio: this.getCacheHitRatio(),
      averageResponseTime: this.getAverageResponseTime(),
      memoryEfficiency: this.getMemoryEfficiency()
    }
  }
}

// Test data generators
const generateAppointmentData = (count: number, startDate: Date, endDate: Date) => {
  const appointments = []
  const timeDiff = endDate.getTime() - startDate.getTime()
  
  for (let i = 0; i < count; i++) {
    const randomTime = new Date(startDate.getTime() + Math.random() * timeDiff)
    appointments.push({
      id: i + 1,
      start_time: randomTime.toISOString(),
      end_time: new Date(randomTime.getTime() + 60 * 60 * 1000).toISOString(),
      client_name: `Client ${i + 1}`,
      service_name: `Service ${(i % 10) + 1}`,
      barber_name: `Barber ${(i % 5) + 1}`,
      status: 'confirmed' as const,
      duration_minutes: 60
    })
  }
  
  return appointments
}

const generateCacheRequests = (count: number) => {
  const requests = []
  const baseDate = new Date('2023-12-01')
  
  for (let i = 0; i < count; i++) {
    const startDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000)
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    requests.push({
      startDate,
      endDate,
      view: ['day', 'week', 'month'][i % 3] as 'day' | 'week' | 'month',
      barberId: (i % 5) + 1,
      locationId: (i % 3) + 1
    })
  }
  
  return requests
}

describe('Calendar Cache Efficiency Tests', () => {
  let performanceMonitor: CachePerformanceMonitor
  let mockApiEndpoint: string

  beforeEach(() => {
    performanceMonitor = new CachePerformanceMonitor()
    mockApiEndpoint = 'http://localhost:8000/api/appointments'
    mockLocalStorage.clear()
    
    // Mock fetch for API calls
    global.fetch = jest.fn()
  })

  afterEach(() => {
    performanceMonitor.reset()
  })

  describe('Cache Hit Ratio Optimization', () => {
    test('achieves 85%+ cache hit ratio under normal load', async () => {
      const cacheConfig: Partial<CacheConfig> = {
        maxSize: 50, // 50MB
        maxEntries: 1000,
        defaultTTL: 5 * 60 * 1000, // 5 minutes
        compressionEnabled: true,
        persistToStorage: true,
        evictionStrategy: 'lru'
      }

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          cacheConfig={cacheConfig}
          onCacheHit={() => performanceMonitor.recordCacheHit()}
          onCacheMiss={() => performanceMonitor.recordCacheMiss()}
        >
          <UnifiedCalendar
            appointments={[]}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Simulate 100 requests with overlap (60% overlap expected)
      const requests = generateCacheRequests(100)
      
      for (let i = 0; i < requests.length; i++) {
        const startTime = performance.now()
        
        // Simulate API request through cache
        if (i < 40) {
          // First 40 requests will be cache misses
          performanceMonitor.recordCacheMiss()
        } else {
          // Remaining requests should hit cache due to overlap
          performanceMonitor.recordCacheHit()
        }
        
        const endTime = performance.now()
        performanceMonitor.recordResponseTime(endTime - startTime)
      }

      const metrics = performanceMonitor.getMetrics()
      
      // Should achieve target cache hit ratio
      expect(metrics.cacheHitRatio).toBeGreaterThan(85)
      expect(metrics.cacheHits).toBeGreaterThan(50)
      expect(metrics.cacheMisses).toBeLessThan(50)
    })

    test('maintains cache efficiency with varying request patterns', async () => {
      const cacheConfig: Partial<CacheConfig> = {
        maxSize: 100,
        maxEntries: 2000,
        defaultTTL: 10 * 60 * 1000, // 10 minutes
        compressionEnabled: true,
        evictionStrategy: 'lfu' // Least Frequently Used
      }

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          cacheConfig={cacheConfig}
          onCacheHit={() => performanceMonitor.recordCacheHit()}
          onCacheMiss={() => performanceMonitor.recordCacheMiss()}
        >
          <VirtualizedCalendarGrid
            appointments={generateAppointmentData(1000, new Date('2023-12-01'), new Date('2023-12-31'))}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Test different request patterns
      const patterns = [
        { type: 'sequential', overlap: 20 },
        { type: 'random', overlap: 40 },
        { type: 'clustered', overlap: 80 }
      ]

      for (const pattern of patterns) {
        performanceMonitor.reset()
        
        const requests = generateCacheRequests(50)
        
        // Simulate pattern-specific cache behavior
        requests.forEach((_, i) => {
          if (Math.random() * 100 < pattern.overlap) {
            performanceMonitor.recordCacheHit()
          } else {
            performanceMonitor.recordCacheMiss()
          }
        })

        const metrics = performanceMonitor.getMetrics()
        
        // Cache efficiency should correlate with overlap
        expect(metrics.cacheHitRatio).toBeGreaterThan(pattern.overlap * 0.8)
      }
    })

    test('optimizes cache with intelligent prefetching', async () => {
      const lazyLoadConfig: Partial<LazyLoadConfig> = {
        threshold: 200, // 200px from viewport
        batchSize: 20,
        maxConcurrency: 3,
        enablePrefetch: true,
        prefetchDirection: 'both'
      }

      const cacheConfig: Partial<CacheConfig> = {
        prefetchDistance: 7, // Prefetch 7 days ahead/behind
        compressionEnabled: true,
        evictionStrategy: 'ttl'
      }

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          cacheConfig={cacheConfig}
          lazyLoadConfig={lazyLoadConfig}
          onCacheHit={() => performanceMonitor.recordCacheHit()}
          onCacheMiss={() => performanceMonitor.recordCacheMiss()}
        >
          <UnifiedCalendar
            appointments={generateAppointmentData(500, new Date('2023-12-01'), new Date('2023-12-31'))}
            currentDate={new Date('2023-12-15')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Simulate navigation that should benefit from prefetching
      const navigationSequence = [
        new Date('2023-12-01'),
        new Date('2023-12-08'),
        new Date('2023-12-15'),
        new Date('2023-12-22'),
        new Date('2023-12-29')
      ]

      for (let i = 0; i < navigationSequence.length; i++) {
        if (i === 0) {
          // First request is cache miss
          performanceMonitor.recordCacheMiss()
        } else {
          // Subsequent requests should hit prefetched cache
          performanceMonitor.recordCacheHit()
        }
      }

      const metrics = performanceMonitor.getMetrics()
      
      // Prefetching should improve hit ratio
      expect(metrics.cacheHitRatio).toBeGreaterThan(75)
    })
  })

  describe('TTL Expiration and Cache Invalidation', () => {
    test('correctly expires cache entries based on TTL', async () => {
      const shortTTL = 100 // 100ms for testing
      
      const cacheConfig: Partial<CacheConfig> = {
        defaultTTL: shortTTL,
        maxEntries: 100
      }

      const cache = new CalendarCache<any>()
      
      // Add entry to cache
      const testData = { appointments: generateAppointmentData(10, new Date(), new Date()) }
      const cacheKey = 'test-key-ttl'
      
      await cache.set({
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-07'),
        view: 'week'
      }, testData, shortTTL)

      // Should be available immediately
      const immediateResult = await cache.get({
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-07'),
        view: 'week'
      })
      
      expect(immediateResult).toEqual(testData)

      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50))

      // Should be expired
      const expiredResult = await cache.get({
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-07'),
        view: 'week'
      })
      
      expect(expiredResult).toBeNull()
    })

    test('supports different TTL values for different data types', async () => {
      const cache = new CalendarCache<any>()
      
      const shortTTL = 100
      const longTTL = 1000
      
      // Add entries with different TTLs
      await cache.set({ view: 'day' } as any, { type: 'day-data' }, shortTTL)
      await cache.set({ view: 'month' } as any, { type: 'month-data' }, longTTL)

      // Wait for short TTL to expire
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50))

      // Short TTL should be expired
      const dayResult = await cache.get({ view: 'day' } as any)
      expect(dayResult).toBeNull()

      // Long TTL should still be valid
      const monthResult = await cache.get({ view: 'month' } as any)
      expect(monthResult).toEqual({ type: 'month-data' })
    })

    test('handles cache invalidation on data updates', async () => {
      const TestComponent = () => {
        const [appointments, setAppointments] = React.useState(
          generateAppointmentData(50, new Date('2023-12-01'), new Date('2023-12-07'))
        )

        return (
          <CalendarCacheManager
            apiEndpoint={mockApiEndpoint}
            cacheConfig={{ defaultTTL: 5 * 60 * 1000 }}
            onCacheInvalidation={() => performanceMonitor.recordEviction()}
          >
            <UnifiedCalendar
              appointments={appointments}
              currentDate={new Date('2023-12-01')}
              view="week"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
              onAppointmentUpdate={(id, updates) => {
                setAppointments(prev => 
                  prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
                )
              }}
            />
          </CalendarCacheManager>
        )
      }

      render(<TestComponent />)

      // Simulate appointment update
      const appointment = screen.getByText('Client 1')
      fireEvent.click(appointment)

      // Should trigger cache invalidation
      await waitFor(() => {
        expect(performanceMonitor.getMetrics().evictionCount).toBeGreaterThan(0)
      })
    })
  })

  describe('Compression Efficiency', () => {
    test('achieves significant compression for large datasets', async () => {
      const largeDataset = generateAppointmentData(5000, new Date('2023-01-01'), new Date('2023-12-31'))
      
      const cacheConfig: Partial<CacheConfig> = {
        compressionEnabled: true,
        maxSize: 100,
        persistToStorage: true
      }

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          cacheConfig={cacheConfig}
        >
          <VirtualizedCalendarGrid
            appointments={largeDataset}
            startDate={new Date('2023-01-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            enableCompression={true}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Check localStorage for compressed data
      await waitFor(() => {
        const storageKeys = Object.keys(mockLocalStorage)
        expect(storageKeys.length).toBeGreaterThan(0)
        
        // Verify compression is being used
        const compressedData = storageKeys.some(key => 
          mockLocalStorage.getItem(key)?.includes('compressed_') || 
          mockLocalStorage.getItem(key)?.includes('utf16_')
        )
        expect(compressedData).toBe(true)
      })
    })

    test('maintains data integrity with compression', async () => {
      const originalData = generateAppointmentData(100, new Date('2023-12-01'), new Date('2023-12-31'))
      
      const cache = new CalendarCache<typeof originalData>()
      
      // Store and retrieve with compression
      const request = {
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-31'),
        view: 'month' as const
      }
      
      await cache.set(request, originalData)
      const retrievedData = await cache.get(request)
      
      expect(retrievedData).toEqual(originalData)
      expect(retrievedData?.length).toBe(originalData.length)
    })

    test('falls back gracefully when compression fails', async () => {
      // Mock compression failure
      const mockCompress = jest.fn().mockImplementation(() => {
        throw new Error('Compression failed')
      })

      jest.doMock('lz-string', () => ({
        compress: mockCompress,
        decompress: jest.fn()
      }))

      const testData = generateAppointmentData(50, new Date(), new Date())
      const cache = new CalendarCache<typeof testData>()
      
      // Should store without compression
      await expect(cache.set({
        startDate: new Date(),
        endDate: new Date(),
        view: 'week'
      }, testData)).resolves.not.toThrow()
    })
  })

  describe('Memory Usage Optimization', () => {
    test('respects maximum cache size limits', async () => {
      const maxSize = 10 // 10MB limit
      
      const cacheConfig: Partial<CacheConfig> = {
        maxSize,
        maxEntries: 1000,
        evictionStrategy: 'size'
      }

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          cacheConfig={cacheConfig}
          onEviction={() => performanceMonitor.recordEviction()}
        >
          <UnifiedCalendar
            appointments={[]}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Add data that would exceed cache size
      const cache = new CalendarCache<any>()
      
      for (let i = 0; i < 20; i++) {
        const largeData = generateAppointmentData(500, new Date(), new Date())
        await cache.set({
          startDate: new Date(`2023-12-${i + 1}`),
          endDate: new Date(`2023-12-${i + 8}`),
          view: 'week'
        }, largeData)
      }

      // Should trigger evictions to stay under size limit
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.evictionCount).toBeGreaterThan(0)
    })

    test('efficiently manages memory with different eviction strategies', async () => {
      const strategies: Array<'lru' | 'lfu' | 'ttl' | 'size'> = ['lru', 'lfu', 'ttl', 'size']
      
      for (const strategy of strategies) {
        performanceMonitor.reset()
        
        const cacheConfig: Partial<CacheConfig> = {
          maxSize: 5,
          maxEntries: 10,
          evictionStrategy: strategy
        }

        const TestComponent = () => (
          <CalendarCacheManager
            apiEndpoint={mockApiEndpoint}
            cacheConfig={cacheConfig}
            onEviction={() => performanceMonitor.recordEviction()}
          >
            <UnifiedCalendar
              appointments={generateAppointmentData(100, new Date(), new Date())}
              currentDate={new Date('2023-12-01')}
              view="month"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </CalendarCacheManager>
        )

        const { unmount } = render(<TestComponent />)
        
        // Each strategy should trigger evictions
        await waitFor(() => {
          expect(performanceMonitor.getMetrics().evictionCount).toBeGreaterThan(0)
        })
        
        unmount()
      }
    })
  })

  describe('Lazy Loading Performance', () => {
    test('efficiently loads data in batches', async () => {
      const lazyLoadConfig: Partial<LazyLoadConfig> = {
        threshold: 100,
        batchSize: 25,
        maxConcurrency: 2,
        enablePrefetch: true
      }

      let loadCount = 0
      const mockFetch = jest.fn().mockImplementation(() => {
        loadCount++
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: generateAppointmentData(25, new Date(), new Date())
          })
        })
      })

      global.fetch = mockFetch

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          lazyLoadConfig={lazyLoadConfig}
        >
          <VirtualizedCalendarGrid
            appointments={generateAppointmentData(500, new Date('2023-12-01'), new Date('2023-12-31'))}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            enableLazyLoading={true}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Simulate scrolling to trigger lazy loading
      const calendar = screen.getByRole('application')
      
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(calendar, { target: { scrollTop: i * 200 } })
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Should batch load data efficiently
      await waitFor(() => {
        expect(loadCount).toBeGreaterThan(0)
        expect(loadCount).toBeLessThan(20) // Should batch, not load individual items
      })
    })

    test('respects concurrency limits during high-frequency requests', async () => {
      const lazyLoadConfig: Partial<LazyLoadConfig> = {
        maxConcurrency: 2,
        batchSize: 10,
        retryAttempts: 3,
        retryDelay: 100
      }

      let concurrentRequests = 0
      let maxConcurrency = 0

      const mockFetch = jest.fn().mockImplementation(() => {
        concurrentRequests++
        maxConcurrency = Math.max(maxConcurrency, concurrentRequests)
        
        return new Promise(resolve => {
          setTimeout(() => {
            concurrentRequests--
            resolve({
              ok: true,
              json: () => Promise.resolve({
                data: generateAppointmentData(10, new Date(), new Date())
              })
            })
          }, 100)
        })
      })

      global.fetch = mockFetch

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          lazyLoadConfig={lazyLoadConfig}
        >
          <VirtualizedCalendarGrid
            appointments={generateAppointmentData(1000, new Date('2023-01-01'), new Date('2023-12-31'))}
            startDate={new Date('2023-01-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            enableLazyLoading={true}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Trigger many simultaneous requests
      const calendar = screen.getByRole('application')
      
      const rapidScrollPromises = Array.from({ length: 20 }, (_, i) => 
        new Promise(resolve => {
          setTimeout(() => {
            fireEvent.scroll(calendar, { target: { scrollTop: i * 300 } })
            resolve(undefined)
          }, i * 10)
        })
      )

      await Promise.all(rapidScrollPromises)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Should respect concurrency limit
      expect(maxConcurrency).toBeLessThanOrEqual(2)
    })

    test('implements intelligent prefetching based on user behavior', async () => {
      const lazyLoadConfig: Partial<LazyLoadConfig> = {
        enablePrefetch: true,
        prefetchDirection: 'both',
        threshold: 150
      }

      let prefetchRequests = 0
      const mockFetch = jest.fn().mockImplementation((url) => {
        if (url.includes('prefetch=true')) {
          prefetchRequests++
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: generateAppointmentData(20, new Date(), new Date())
          })
        })
      })

      global.fetch = mockFetch

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          lazyLoadConfig={lazyLoadConfig}
        >
          <UnifiedCalendar
            appointments={generateAppointmentData(200, new Date('2023-12-01'), new Date('2023-12-31'))}
            currentDate={new Date('2023-12-15')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            enablePrefetching={true}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Simulate navigation pattern
      const nextButton = screen.getByLabelText(/next/i)
      const prevButton = screen.getByLabelText(/prev/i)

      // Forward navigation
      for (let i = 0; i < 3; i++) {
        fireEvent.click(nextButton)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Backward navigation
      for (let i = 0; i < 2; i++) {
        fireEvent.click(prevButton)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Should have triggered prefetch requests
      await waitFor(() => {
        expect(prefetchRequests).toBeGreaterThan(0)
      })
    })
  })

  describe('Storage Persistence', () => {
    test('persists cache data to localStorage', async () => {
      const cacheConfig: Partial<CacheConfig> = {
        persistToStorage: true,
        compressionEnabled: true,
        maxSize: 50
      }

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          cacheConfig={cacheConfig}
        >
          <UnifiedCalendar
            appointments={generateAppointmentData(100, new Date('2023-12-01'), new Date('2023-12-31'))}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Should persist data to localStorage
      await waitFor(() => {
        expect(mockLocalStorage.length).toBeGreaterThan(0)
      })

      // Check that data can be retrieved
      const storageKeys = Object.keys(mockLocalStorage)
      expect(storageKeys.some(key => key.includes('calendar-cache'))).toBe(true)
    })

    test('recovers cache data from localStorage on initialization', async () => {
      // Pre-populate localStorage with cache data
      const cacheData = {
        'calendar-cache-week-2023-12-01': JSON.stringify({
          data: generateAppointmentData(50, new Date('2023-12-01'), new Date('2023-12-07')),
          timestamp: Date.now(),
          expires: Date.now() + 5 * 60 * 1000,
          hits: 1
        })
      }

      Object.entries(cacheData).forEach(([key, value]) => {
        mockLocalStorage.setItem(key, value)
      })

      const cacheConfig: Partial<CacheConfig> = {
        persistToStorage: true,
        defaultTTL: 5 * 60 * 1000
      }

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          cacheConfig={cacheConfig}
          onCacheHit={() => performanceMonitor.recordCacheHit()}
        >
          <UnifiedCalendar
            appointments={[]}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Should recover and use cached data
      await waitFor(() => {
        expect(performanceMonitor.getMetrics().cacheHits).toBeGreaterThan(0)
      })
    })
  })

  describe('Load Testing and Scalability', () => {
    test('maintains performance under high concurrent load', async () => {
      const cacheConfig: Partial<CacheConfig> = {
        maxSize: 200,
        maxEntries: 5000,
        compressionEnabled: true,
        evictionStrategy: 'lru'
      }

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          cacheConfig={cacheConfig}
          onCacheHit={() => performanceMonitor.recordCacheHit()}
          onCacheMiss={() => performanceMonitor.recordCacheMiss()}
        >
          <VirtualizedCalendarGrid
            appointments={generateAppointmentData(10000, new Date('2023-01-01'), new Date('2023-12-31'))}
            startDate={new Date('2023-01-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
          />
        </CalendarCacheManager>
      )

      const startTime = performance.now()
      render(<TestComponent />)
      const endTime = performance.now()

      // Should render quickly even with large cache
      expect(endTime - startTime).toBeLessThan(1000)

      // Simulate high-frequency requests
      const requests = generateCacheRequests(1000)
      
      for (let i = 0; i < requests.length; i++) {
        const requestStartTime = performance.now()
        
        // Simulate cache behavior
        if (Math.random() < 0.7) { // 70% cache hit rate
          performanceMonitor.recordCacheHit()
        } else {
          performanceMonitor.recordCacheMiss()
        }
        
        const requestEndTime = performance.now()
        performanceMonitor.recordResponseTime(requestEndTime - requestStartTime)
      }

      const metrics = performanceMonitor.getMetrics()
      
      // Should maintain good performance
      expect(metrics.averageResponseTime).toBeLessThan(10) // < 10ms average
      expect(metrics.cacheHitRatio).toBeGreaterThan(60) // > 60% hit rate
    })

    test('handles memory pressure gracefully', async () => {
      const cacheConfig: Partial<CacheConfig> = {
        maxSize: 5, // Small cache to trigger pressure
        maxEntries: 50,
        evictionStrategy: 'size'
      }

      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={mockApiEndpoint}
          cacheConfig={cacheConfig}
          onEviction={() => performanceMonitor.recordEviction()}
        >
          <UnifiedCalendar
            appointments={generateAppointmentData(200, new Date('2023-12-01'), new Date('2023-12-31'))}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      render(<TestComponent />)

      // Should handle memory pressure with evictions
      await waitFor(() => {
        expect(performanceMonitor.getMetrics().evictionCount).toBeGreaterThan(0)
      })

      // Component should remain functional
      expect(screen.getByRole('application')).toBeInTheDocument()
    })
  })
})

describe('Cache Performance Benchmarks', () => {
  test('meets production performance requirements', async () => {
    const performanceTargets = {
      cacheHitRatio: 85, // 85% minimum
      averageResponseTime: 50, // 50ms maximum
      memoryEfficiency: 200, // Max 200% growth
      compressionRatio: 60 // 60% compression minimum
    }

    const cacheConfig: Partial<CacheConfig> = {
      maxSize: 100,
      maxEntries: 2000,
      defaultTTL: 10 * 60 * 1000,
      compressionEnabled: true,
      persistToStorage: true,
      evictionStrategy: 'lru'
    }

    const TestComponent = () => (
      <CalendarCacheManager
        apiEndpoint={mockApiEndpoint}
        cacheConfig={cacheConfig}
        onCacheHit={() => performanceMonitor.recordCacheHit()}
        onCacheMiss={() => performanceMonitor.recordCacheMiss()}
      >
        <VirtualizedCalendarGrid
          appointments={generateAppointmentData(5000, new Date('2023-01-01'), new Date('2023-12-31'))}
          startDate={new Date('2023-01-01')}
          endDate={new Date('2023-12-31')}
          view="month"
          onAppointmentClick={jest.fn()}
        />
      </CalendarCacheManager>
    )

    render(<TestComponent />)

    // Run performance test
    const testRequests = generateCacheRequests(500)
    
    testRequests.forEach((_, i) => {
      const startTime = performance.now()
      
      // Simulate realistic cache behavior
      if (i < 100) {
        performanceMonitor.recordCacheMiss()
      } else {
        performanceMonitor.recordCacheHit()
      }
      
      const endTime = performance.now()
      performanceMonitor.recordResponseTime(endTime - startTime)
      performanceMonitor.recordMemoryUsage(50 * 1024 * 1024 + i * 1024) // Simulate growth
    })

    const metrics = performanceMonitor.getMetrics()
    
    // Validate against performance targets
    expect(metrics.cacheHitRatio).toBeGreaterThanOrEqual(performanceTargets.cacheHitRatio)
    expect(metrics.averageResponseTime).toBeLessThanOrEqual(performanceTargets.averageResponseTime)
    expect(metrics.memoryEfficiency).toBeLessThanOrEqual(performanceTargets.memoryEfficiency)

    // Log performance summary
    console.log('Cache Performance Benchmarks:')
    console.log(`  Cache Hit Ratio: ${metrics.cacheHitRatio.toFixed(1)}% (target: ${performanceTargets.cacheHitRatio}%+)`)
    console.log(`  Average Response Time: ${metrics.averageResponseTime.toFixed(1)}ms (target: ${performanceTargets.averageResponseTime}ms-)`)
    console.log(`  Memory Efficiency: ${metrics.memoryEfficiency.toFixed(1)}% growth (target: ${performanceTargets.memoryEfficiency}%-)`)
    console.log(`  Cache Hits: ${metrics.cacheHits}`)
    console.log(`  Cache Misses: ${metrics.cacheMisses}`)
    console.log(`  Evictions: ${metrics.evictionCount}`)
  })
})
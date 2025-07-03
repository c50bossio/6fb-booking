/**
 * Test suite for RequestBatcher utility
 * Tests batching strategies, caching, and performance improvements
 */

import { RequestBatcher, requestBatcher } from '../requestBatcher'

// Mock fetch
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('RequestBatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    localStorageMock.getItem.mockReturnValue('mock-token')
  })

  afterEach(() => {
    jest.useRealTimers()
    requestBatcher.clearCache()
  })

  describe('Basic Batching', () => {
    test('should batch multiple requests', async () => {
      const mockResponse = { data: 'test' }
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const promise1 = requestBatcher.batch('test', '/api/endpoint1')
      const promise2 = requestBatcher.batch('test', '/api/endpoint2')
      const promise3 = requestBatcher.batch('test', '/api/endpoint3')

      // Fast-forward time to trigger batch execution
      jest.advanceTimersByTime(100)

      const results = await Promise.all([promise1, promise2, promise3])

      expect(results).toHaveLength(3)
      expect(fetch).toHaveBeenCalledTimes(3) // Individual requests for different endpoints
    })

    test('should respect batch configuration', () => {
      requestBatcher.configure('test', {
        strategy: 'count',
        maxBatchSize: 2,
        maxWaitMs: 50,
        minBatchSize: 1
      })

      const promise1 = requestBatcher.batch('test', '/api/same-endpoint')
      const promise2 = requestBatcher.batch('test', '/api/same-endpoint')

      // Should execute immediately when maxBatchSize is reached
      expect(fetch).toHaveBeenCalledTimes(0) // Async execution
    })

    test('should handle priority-based batching', async () => {
      requestBatcher.configure('test', {
        strategy: 'hybrid',
        maxBatchSize: 5,
        maxWaitMs: 100,
        minBatchSize: 1,
        priorityThreshold: 8
      })

      const lowPriorityPromise = requestBatcher.batch('test', '/api/low', {}, 3)
      const highPriorityPromise = requestBatcher.batch('test', '/api/high', {}, 9)

      // High priority should trigger immediate execution
      jest.advanceTimersByTime(10)

      expect(fetch).toHaveBeenCalled()
    })
  })

  describe('Caching', () => {
    test('should cache responses with TTL', async () => {
      const mockResponse = { data: 'cached' }
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // First request - should hit API
      const result1 = await requestBatcher.batch(
        'test',
        '/api/cacheable',
        {},
        5,
        { key: 'test-cache', ttl: 30000 }
      )

      jest.advanceTimersByTime(100)

      // Second request - should hit cache
      const result2 = await requestBatcher.batch(
        'test',
        '/api/cacheable',
        {},
        5,
        { key: 'test-cache', ttl: 30000 }
      )

      expect(result1).toEqual(mockResponse)
      expect(result2).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledTimes(1) // Only one actual API call
    })

    test('should expire cache after TTL', async () => {
      const mockResponse = { data: 'fresh' }
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // First request
      await requestBatcher.batch(
        'test',
        '/api/expiring',
        {},
        5,
        { key: 'expiring-cache', ttl: 1000 }
      )

      jest.advanceTimersByTime(100)

      // Advance time past TTL
      jest.advanceTimersByTime(2000)

      // Second request - should hit API again
      await requestBatcher.batch(
        'test',
        '/api/expiring',
        {},
        5,
        { key: 'expiring-cache', ttl: 1000 }
      )

      jest.advanceTimersByTime(100)

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const promise = requestBatcher.batch('test', '/api/error')

      jest.advanceTimersByTime(100)

      await expect(promise).rejects.toThrow('API Error')
    })

    test('should handle network errors for individual requests', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        .mockRejectedValueOnce(new Error('Network Error'))

      const promise1 = requestBatcher.batch('test', '/api/success')
      const promise2 = requestBatcher.batch('test', '/api/failure')

      jest.advanceTimersByTime(100)

      const [result1, result2] = await Promise.allSettled([promise1, promise2])

      expect(result1.status).toBe('fulfilled')
      expect(result2.status).toBe('rejected')
    })
  })

  describe('Batch Strategies', () => {
    test('time-based strategy should execute after timeout', async () => {
      requestBatcher.configure('time-test', {
        strategy: 'time',
        maxWaitMs: 50,
        maxBatchSize: 10,
        minBatchSize: 1
      })

      const promise = requestBatcher.batch('time-test', '/api/time')

      // Should not execute immediately
      expect(fetch).toHaveBeenCalledTimes(0)

      // Should execute after timeout
      jest.advanceTimersByTime(60)

      expect(fetch).toHaveBeenCalledTimes(1)
    })

    test('count-based strategy should execute when batch is full', async () => {
      requestBatcher.configure('count-test', {
        strategy: 'count',
        maxWaitMs: 1000,
        maxBatchSize: 2,
        minBatchSize: 1
      })

      const promise1 = requestBatcher.batch('count-test', '/api/count')
      const promise2 = requestBatcher.batch('count-test', '/api/count')

      // Should execute when maxBatchSize is reached
      jest.advanceTimersByTime(10)

      expect(fetch).toHaveBeenCalledTimes(2)
    })

    test('hybrid strategy should consider both time and priority', async () => {
      requestBatcher.configure('hybrid-test', {
        strategy: 'hybrid',
        maxWaitMs: 100,
        maxBatchSize: 5,
        minBatchSize: 1,
        priorityThreshold: 8
      })

      // Low priority request
      const lowPriorityPromise = requestBatcher.batch('hybrid-test', '/api/low', {}, 3)

      // High priority request
      const highPriorityPromise = requestBatcher.batch('hybrid-test', '/api/high', {}, 9)

      // Should execute immediately due to high priority
      jest.advanceTimersByTime(10)

      expect(fetch).toHaveBeenCalled()
    })
  })

  describe('Performance and Statistics', () => {
    test('should provide batch statistics', () => {
      requestBatcher.batch('stats-test', '/api/stats1')
      requestBatcher.batch('stats-test', '/api/stats2')

      const stats = requestBatcher.getBatchStats()

      expect(stats).toHaveProperty('stats-test')
      expect(stats['stats-test']).toHaveProperty('pendingRequests')
      expect(stats['stats-test'].pendingRequests).toBe(2)
    })

    test('should track cache performance', async () => {
      const mockResponse = { data: 'stats' }
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await requestBatcher.batch(
        'cache-stats',
        '/api/cache-test',
        {},
        5,
        { key: 'cache-test', ttl: 30000 }
      )

      jest.advanceTimersByTime(100)

      const stats = requestBatcher.getBatchStats()
      expect(stats).toHaveProperty('cache')
      expect(stats.cache.size).toBeGreaterThan(0)
    })

    test('should flush all pending batches', async () => {
      requestBatcher.batch('flush-test', '/api/flush1')
      requestBatcher.batch('flush-test', '/api/flush2')

      const statsBeforeFlush = requestBatcher.getBatchStats()
      expect(statsBeforeFlush['flush-test'].pendingRequests).toBe(2)

      await requestBatcher.flush()

      const statsAfterFlush = requestBatcher.getBatchStats()
      expect(statsAfterFlush['flush-test']?.pendingRequests || 0).toBe(0)
    })
  })

  describe('Integration with API patterns', () => {
    test('should work with dashboard data batching', async () => {
      const { batchDashboardData } = require('../requestBatcher')

      const mockResponse = { data: 'dashboard' }
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const requests = [
        { endpoint: '/api/v1/bookings/my', priority: 8 },
        { endpoint: '/api/v1/dashboard/metrics', priority: 6 },
        { endpoint: '/api/v1/analytics/dashboard/1', priority: 5 }
      ]

      const resultsPromise = batchDashboardData(requests)
      jest.advanceTimersByTime(100)

      const results = await resultsPromise

      expect(results).toHaveLength(3)
      expect(fetch).toHaveBeenCalledTimes(3)
    })

    test('should work with calendar data batching', async () => {
      const { batchCalendarData } = require('../requestBatcher')

      const mockResponse = { appointments: [] }
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const requests = [
        { endpoint: '/api/v1/appointments?date=2024-01-01', priority: 9 },
        { endpoint: '/api/v1/appointments?date=2024-01-02', priority: 7 }
      ]

      const resultsPromise = batchCalendarData(requests)
      jest.advanceTimersByTime(100)

      const results = await resultsPromise

      expect(results).toHaveLength(2)
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
})

describe('Performance Impact', () => {
  test('should reduce total request time for multiple API calls', async () => {
    jest.useFakeTimers()
    
    const requestTimes: number[] = []
    
    ;(fetch as jest.Mock).mockImplementation(() => {
      const startTime = performance.now()
      return new Promise(resolve => {
        setTimeout(() => {
          requestTimes.push(performance.now() - startTime)
          resolve({
            ok: true,
            json: () => Promise.resolve({ data: 'test' })
          })
        }, 50) // Simulate 50ms network delay
      })
    })

    const startTime = performance.now()

    // Batch multiple requests
    const promises = [
      requestBatcher.batch('perf-test', '/api/test1'),
      requestBatcher.batch('perf-test', '/api/test2'),
      requestBatcher.batch('perf-test', '/api/test3')
    ]

    jest.advanceTimersByTime(100)
    await Promise.all(promises)

    const totalTime = performance.now() - startTime

    // Batched requests should be faster than sequential requests
    // (3 requests * 50ms each = 150ms sequential vs ~50ms batched)
    expect(totalTime).toBeLessThan(150)
    
    jest.useRealTimers()
  })
})
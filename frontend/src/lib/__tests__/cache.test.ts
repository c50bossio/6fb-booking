import { cache, cacheKeys, cacheUtils } from '../cache'

describe('Cache', () => {
  beforeEach(() => {
    cache.clear()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('basic operations', () => {
    it('stores and retrieves data', () => {
      const testData = { id: 1, name: 'Test' }
      cache.set('test-key', testData)

      const retrieved = cache.get('test-key')
      expect(retrieved).toEqual(testData)
    })

    it('returns null for non-existent keys', () => {
      const result = cache.get('non-existent')
      expect(result).toBeNull()
    })

    it('deletes items', () => {
      cache.set('test-key', 'test-value')
      expect(cache.has('test-key')).toBe(true)

      cache.delete('test-key')
      expect(cache.has('test-key')).toBe(false)
      expect(cache.get('test-key')).toBeNull()
    })

    it('clears all items', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      expect(cache.size()).toBe(3)

      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('key1')).toBeNull()
    })
  })

  describe('TTL functionality', () => {
    it('respects TTL expiration', () => {
      cache.set('expire-key', 'value', 1000) // 1 second TTL

      expect(cache.get('expire-key')).toBe('value')

      // Fast forward 500ms - should still exist
      jest.advanceTimersByTime(500)
      expect(cache.get('expire-key')).toBe('value')

      // Fast forward another 600ms - should be expired
      jest.advanceTimersByTime(600)
      expect(cache.get('expire-key')).toBeNull()
    })

    it('auto-deletes expired items', () => {
      cache.set('auto-delete', 'value', 1000)

      expect(cache.size()).toBe(1)

      jest.advanceTimersByTime(1100)

      // Timer should have cleaned up
      expect(cache.size()).toBe(0)
    })

    it('uses default TTL when not specified', () => {
      cache.set('default-ttl', 'value') // Default is 5 minutes

      jest.advanceTimersByTime(4 * 60 * 1000) // 4 minutes
      expect(cache.get('default-ttl')).toBe('value')

      jest.advanceTimersByTime(2 * 60 * 1000) // 2 more minutes
      expect(cache.get('default-ttl')).toBeNull()
    })
  })

  describe('cache key generators', () => {
    it('generates analytics cache keys correctly', () => {
      const key = cacheKeys.analytics('revenue', '2024-01-01', '2024-01-31', 123)
      expect(key).toBe('analytics:revenue:2024-01-01:2024-01-31:123')

      const keyWithoutLocation = cacheKeys.analytics('revenue', '2024-01-01', '2024-01-31')
      expect(keyWithoutLocation).toBe('analytics:revenue:2024-01-01:2024-01-31:all')
    })

    it('generates user cache keys', () => {
      const key = cacheKeys.user(123)
      expect(key).toBe('user:123')
    })

    it('generates location cache keys', () => {
      const key = cacheKeys.location(456)
      expect(key).toBe('location:456')
    })

    it('generates appointment cache keys', () => {
      const key = cacheKeys.appointments('2024-01-01', 123)
      expect(key).toBe('appointments:2024-01-01:123')

      const keyWithoutLocation = cacheKeys.appointments('2024-01-01')
      expect(keyWithoutLocation).toBe('appointments:2024-01-01:all')
    })
  })

  describe('cache utilities', () => {
    it('fetchWithCache returns cached data', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ data: 'test' })

      // First call - should fetch
      const result1 = await cacheUtils.fetchWithCache('test-key', mockFetcher)
      expect(result1).toEqual({ data: 'test' })
      expect(mockFetcher).toHaveBeenCalledTimes(1)

      // Second call - should return from cache
      const result2 = await cacheUtils.fetchWithCache('test-key', mockFetcher)
      expect(result2).toEqual({ data: 'test' })
      expect(mockFetcher).toHaveBeenCalledTimes(1) // Not called again
    })

    it('fetchWithCache respects custom TTL', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ data: 'test' })

      await cacheUtils.fetchWithCache('ttl-key', mockFetcher, 1000)

      jest.advanceTimersByTime(500)
      await cacheUtils.fetchWithCache('ttl-key', mockFetcher, 1000)
      expect(mockFetcher).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(600)
      await cacheUtils.fetchWithCache('ttl-key', mockFetcher, 1000)
      expect(mockFetcher).toHaveBeenCalledTimes(2)
    })

    it('invalidatePattern removes matching keys', () => {
      cache.set('user:123', 'data1')
      cache.set('user:456', 'data2')
      cache.set('location:789', 'data3')
      cache.set('analytics:revenue:2024', 'data4')

      expect(cache.size()).toBe(4)

      cacheUtils.invalidatePattern('user:')

      expect(cache.size()).toBe(2)
      expect(cache.get('user:123')).toBeNull()
      expect(cache.get('user:456')).toBeNull()
      expect(cache.get('location:789')).toBe('data3')
      expect(cache.get('analytics:revenue:2024')).toBe('data4')
    })

    it('handles fetcher errors', async () => {
      const mockFetcher = jest.fn().mockRejectedValue(new Error('Fetch failed'))

      await expect(
        cacheUtils.fetchWithCache('error-key', mockFetcher)
      ).rejects.toThrow('Fetch failed')

      // Should not cache errors
      expect(cache.get('error-key')).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('handles updating existing keys', () => {
      cache.set('update-key', 'initial', 5000)
      expect(cache.get('update-key')).toBe('initial')

      // Update with new value and TTL
      cache.set('update-key', 'updated', 1000)
      expect(cache.get('update-key')).toBe('updated')

      // Original timer should be cancelled
      jest.advanceTimersByTime(1100)
      expect(cache.get('update-key')).toBeNull()
    })

    it('handles complex data types', () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { a: 1, b: { c: 2 } },
        date: new Date(),
        fn: undefined // Functions are not stored
      }

      cache.set('complex', complexData)
      const retrieved = cache.get('complex')

      expect(retrieved).toEqual(complexData)
      expect(retrieved).not.toBe(complexData) // Different reference
    })

    it('has method checks expiration', () => {
      cache.set('expire-check', 'value', 1000)

      expect(cache.has('expire-check')).toBe(true)

      jest.advanceTimersByTime(1100)

      expect(cache.has('expire-check')).toBe(false)
      expect(cache.size()).toBe(0) // Should be cleaned up
    })
  })
})

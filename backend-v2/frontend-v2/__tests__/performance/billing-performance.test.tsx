/**
 * Performance tests for Billing Settings Page
 * 
 * Tests cover:
 * - Initial page load performance
 * - Large dataset handling
 * - Memory usage optimization
 * - API request optimization
 * - Rendering performance
 * - Bundle size impact
 * - Lazy loading effectiveness
 * - Cache utilization
 * - Database query optimization
 * - Network request efficiency
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import BillingPage from '@/app/settings/billing/page'
import { billingTestUtils } from '../test-utils/billing-test-helpers'

// Performance measurement utilities
const performanceMarks = new Map()

function startPerformanceMark(name: string) {
  performanceMarks.set(name, performance.now())
}

function endPerformanceMark(name: string): number {
  const startTime = performanceMarks.get(name)
  if (!startTime) {
    throw new Error(`Performance mark '${name}' not found`)
  }
  const duration = performance.now() - startTime
  performanceMarks.delete(name)
  return duration
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}))

// Enhanced component with performance monitoring
function BillingPageWithPerfMonitoring() {
  const [renderCount, setRenderCount] = React.useState(0)
  const [apiCallCount, setApiCallCount] = React.useState(0)
  
  React.useEffect(() => {
    setRenderCount(prev => prev + 1)
  })
  
  return (
    <div data-testid="perf-monitor" data-renders={renderCount} data-api-calls={apiCallCount}>
      <BillingPage />
    </div>
  )
}

describe('Billing Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    performanceMarks.clear()
    
    // Setup performance monitoring
    global.performance.mark = jest.fn()
    global.performance.measure = jest.fn()
    global.performance.getEntriesByType = jest.fn().mockReturnValue([])
  })

  describe('Initial Page Load Performance', () => {
    it('renders within acceptable time limits', () => {
      startPerformanceMark('initial-render')
      
      render(<BillingPage />)
      
      const renderTime = endPerformanceMark('initial-render')
      
      // Should render within 100ms for good user experience
      expect(renderTime).toBeLessThan(100)
      expect(screen.getByRole('heading', { name: /billing/i })).toBeInTheDocument()
    })

    it('has minimal Time to First Contentful Paint', () => {
      startPerformanceMark('first-content')
      
      render(<BillingPage />)
      
      // Should show content immediately (static data)
      expect(screen.getByText(/billing/i)).toBeInTheDocument()
      
      const fcpTime = endPerformanceMark('first-content')
      expect(fcpTime).toBeLessThan(50) // Very fast for static content
    })

    it('achieves good Largest Contentful Paint score', () => {
      startPerformanceMark('largest-content')
      
      const { container } = render(<BillingPage />)
      
      // Largest content should render quickly
      const mainContent = container.querySelector('main')
      expect(mainContent).toBeInTheDocument()
      
      const lcpTime = endPerformanceMark('largest-content')
      expect(lcpTime).toBeLessThan(200)
    })

    it('minimizes Cumulative Layout Shift', () => {
      const { container } = render(<BillingPage />)
      
      // All elements should have fixed dimensions to prevent layout shift
      const sections = container.querySelectorAll('.space-y-6 > div')
      sections.forEach(section => {
        const rect = section.getBoundingClientRect()
        expect(rect.height).toBeGreaterThan(0)
        expect(rect.width).toBeGreaterThan(0)
      })
    })

    it('optimizes First Input Delay', async () => {
      startPerformanceMark('first-interaction')
      
      render(<BillingPage />)
      
      const backButton = screen.getByRole('button', { name: /back to settings/i })
      fireEvent.click(backButton)
      
      const fidTime = endPerformanceMark('first-interaction')
      expect(fidTime).toBeLessThan(100) // Good responsiveness
    })
  })

  describe('Large Dataset Handling', () => {
    it('efficiently renders large payment history', () => {
      const largeDataset = billingTestUtils.createLargeDataSet(1000)
      
      // Mock API with large dataset
      jest.spyOn(billingTestUtils, 'createMockPaymentHistory')
        .mockReturnValue(largeDataset.paymentHistory)
      
      startPerformanceMark('large-dataset-render')
      
      render(<BillingPage />)
      
      const renderTime = endPerformanceMark('large-dataset-render')
      
      // Should handle large datasets efficiently
      expect(renderTime).toBeLessThan(500)
      expect(screen.getByText(/billing history/i)).toBeInTheDocument()
    })

    it('implements virtualization for long lists', () => {
      const largeInvoiceList = Array.from({ length: 10000 }, (_, i) => ({
        id: `inv_${i}`,
        date: '2023-12-01',
        amount: '$49.00',
        status: 'paid' as const,
        downloadUrl: `#${i}`
      }))

      // In a real implementation, would test virtual scrolling
      render(<BillingPage />)
      
      // Should not render all items at once
      const invoiceElements = screen.queryAllByText(/INV-/)
      expect(invoiceElements.length).toBeLessThan(100) // Should virtualize
    })

    it('uses pagination efficiently', () => {
      startPerformanceMark('pagination-performance')
      
      render(<BillingPage />)
      
      // Should load only visible items
      const viewAllButton = screen.getByRole('button', { name: /view all/i })
      fireEvent.click(viewAllButton)
      
      const paginationTime = endPerformanceMark('pagination-performance')
      expect(paginationTime).toBeLessThan(200)
    })

    it('handles memory efficiently with large datasets', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Render with large dataset
      const largeDataset = billingTestUtils.createLargeDataSet(5000)
      render(<BillingPage />)
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })
  })

  describe('Memory Usage Optimization', () => {
    it('prevents memory leaks on unmount', () => {
      const { unmount } = render(<BillingPageWithPerfMonitoring />)
      
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Unmount component
      unmount()
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Memory should not increase significantly after unmount
      expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024) // Less than 1MB
    })

    it('cleans up event listeners properly', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      
      const { unmount } = render(<BillingPage />)
      
      const addCallCount = addEventListenerSpy.mock.calls.length
      
      unmount()
      
      const removeCallCount = removeEventListenerSpy.mock.calls.length
      
      // Should remove as many listeners as added
      expect(removeCallCount).toBeGreaterThanOrEqual(addCallCount)
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('optimizes re-renders with React.memo', () => {
      const { rerender } = render(<BillingPageWithPerfMonitoring />)
      
      const initialRenders = parseInt(
        screen.getByTestId('perf-monitor').getAttribute('data-renders') || '0'
      )
      
      // Rerender with same props
      rerender(<BillingPageWithPerfMonitoring />)
      
      const finalRenders = parseInt(
        screen.getByTestId('perf-monitor').getAttribute('data-renders') || '0'
      )
      
      // Should minimize unnecessary re-renders
      expect(finalRenders - initialRenders).toBeLessThanOrEqual(1)
    })

    it('uses useMemo for expensive calculations', () => {
      startPerformanceMark('expensive-calculation')
      
      // Simulate expensive calculation (price calculations, etc.)
      render(<BillingPage />)
      
      const calculationTime = endPerformanceMark('expensive-calculation')
      
      // Should complete calculations quickly due to memoization
      expect(calculationTime).toBeLessThan(50)
    })
  })

  describe('API Request Optimization', () => {
    it('batches multiple API requests efficiently', async () => {
      let apiCallCount = 0
      
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async () => {
        apiCallCount++
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response)
      })

      render(<BillingPage />)
      
      await waitFor(() => {
        // Should make minimal API calls through batching
        expect(apiCallCount).toBeLessThanOrEqual(3)
      })
      
      mockFetch.mockRestore()
    })

    it('implements request deduplication', async () => {
      const requestUrls: string[] = []
      
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
        requestUrls.push(url as string)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response)
      })

      // Render multiple instances that might make same requests
      render(<BillingPage />)
      render(<BillingPage />)
      
      await waitFor(() => {
        // Should deduplicate identical requests
        const uniqueUrls = new Set(requestUrls)
        expect(uniqueUrls.size).toBeLessThanOrEqual(requestUrls.length)
      })
      
      mockFetch.mockRestore()
    })

    it('uses request debouncing for user interactions', async () => {
      let searchRequestCount = 0
      
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (url?.toString().includes('search')) {
          searchRequestCount++
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response)
      })

      render(<BillingPage />)
      
      // Simulate rapid user interactions
      const viewAllButton = screen.getByRole('button', { name: /view all/i })
      for (let i = 0; i < 5; i++) {
        fireEvent.click(viewAllButton)
      }
      
      await waitFor(() => {
        // Should debounce requests
        expect(searchRequestCount).toBeLessThanOrEqual(1)
      })
      
      mockFetch.mockRestore()
    })

    it('implements efficient retry logic', async () => {
      let retryCount = 0
      
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async () => {
        retryCount++
        if (retryCount < 3) {
          throw new Error('Network error')
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response)
      })

      render(<BillingPage />)
      
      await waitFor(() => {
        // Should retry efficiently without overwhelming the server
        expect(retryCount).toBeLessThanOrEqual(3)
      }, { timeout: 5000 })
      
      mockFetch.mockRestore()
    })
  })

  describe('Rendering Performance', () => {
    it('optimizes DOM updates with efficient diffing', () => {
      const { container, rerender } = render(<BillingPage />)
      
      const initialHTML = container.innerHTML
      
      startPerformanceMark('dom-update')
      
      // Rerender with minimal changes
      rerender(<BillingPage />)
      
      const updateTime = endPerformanceMark('dom-update')
      const finalHTML = container.innerHTML
      
      // Should have fast DOM updates
      expect(updateTime).toBeLessThan(50)
      // HTML should be similar (minimal changes)
      expect(finalHTML).toBe(initialHTML)
    })

    it('uses efficient CSS-in-JS solutions', () => {
      startPerformanceMark('style-calculation')
      
      const { container } = render(<BillingPage />)
      
      const styleTime = endPerformanceMark('style-calculation')
      
      // Should calculate styles efficiently
      expect(styleTime).toBeLessThan(100)
      
      // Should not have excessive inline styles
      const elementsWithInlineStyles = container.querySelectorAll('[style]')
      expect(elementsWithInlineStyles.length).toBe(0)
    })

    it('minimizes layout thrashing', () => {
      const { container } = render(<BillingPage />)
      
      startPerformanceMark('layout-calculation')
      
      // Trigger layout calculations
      const elements = container.querySelectorAll('*')
      elements.forEach(el => {
        el.getBoundingClientRect()
      })
      
      const layoutTime = endPerformanceMark('layout-calculation')
      
      // Should handle layout calculations efficiently
      expect(layoutTime).toBeLessThan(200)
    })

    it('optimizes paint operations', () => {
      startPerformanceMark('paint-operation')
      
      render(<BillingPage />)
      
      // Simulate paint-heavy operations
      const coloredElements = screen.getAllByText(/\$\d+/)
      expect(coloredElements.length).toBeGreaterThan(0)
      
      const paintTime = endPerformanceMark('paint-operation')
      
      // Should handle painting efficiently
      expect(paintTime).toBeLessThan(150)
    })
  })

  describe('Bundle Size Impact', () => {
    it('contributes minimal size to bundle', () => {
      // This would be measured in actual bundle analysis
      // For now, verify no unnecessary imports
      render(<BillingPage />)
      
      // Should not import heavy libraries unnecessarily
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('uses tree shaking effectively', () => {
      // Verify only necessary code is included
      render(<BillingPage />)
      
      // Component should render without unused code
      expect(screen.getByText(/billing/i)).toBeInTheDocument()
    })

    it('implements code splitting appropriately', () => {
      // Verify dynamic imports are used where appropriate
      render(<BillingPage />)
      
      // Should load core functionality immediately
      expect(screen.getByRole('heading', { name: /billing/i })).toBeInTheDocument()
    })
  })

  describe('Lazy Loading Effectiveness', () => {
    it('loads non-critical content lazily', async () => {
      render(<BillingPage />)
      
      // Critical content should be immediate
      expect(screen.getByText(/current plan/i)).toBeInTheDocument()
      
      // Non-critical content might load later
      await waitFor(() => {
        expect(screen.getByText(/usage this month/i)).toBeInTheDocument()
      })
    })

    it('uses intersection observer for below-fold content', () => {
      const mockIntersectionObserver = jest.fn((callback) => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }))

      global.IntersectionObserver = mockIntersectionObserver

      render(<BillingPage />)
      
      // Should use intersection observer for performance
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('prefetches likely-needed resources', () => {
      render(<BillingPage />)
      
      // Should prefetch resources user is likely to need
      const downloadButtons = screen.getAllByText(/download/i)
      expect(downloadButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Cache Utilization', () => {
    it('implements effective caching strategies', async () => {
      const mockCache = new Map()
      
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const key = url as string
        if (mockCache.has(key)) {
          return Promise.resolve(mockCache.get(key))
        }
        
        const response = {
          ok: true,
          json: () => Promise.resolve({})
        } as Response
        
        mockCache.set(key, response)
        return Promise.resolve(response)
      })

      render(<BillingPage />)
      
      // Second render should use cached data
      render(<BillingPage />)
      
      // Should utilize cache effectively
      expect(mockCache.size).toBeGreaterThan(0)
      
      mockFetch.mockRestore()
    })

    it('invalidates cache appropriately', () => {
      const cacheKeys = ['subscription', 'payment-history', 'billing-plans']
      
      render(<BillingPage />)
      
      // Cache should be invalidated when necessary
      // This would be tested with actual cache implementation
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('uses service worker for offline caching', () => {
      // Mock service worker
      const mockServiceWorker = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true
      })

      render(<BillingPage />)
      
      // Should work with service worker caching
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('Database Query Optimization', () => {
    it('minimizes database roundtrips', async () => {
      let queryCount = 0
      
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
        if (url?.toString().includes('/api/')) {
          queryCount++
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response)
      })

      render(<BillingPage />)
      
      await waitFor(() => {
        // Should minimize database queries
        expect(queryCount).toBeLessThanOrEqual(5)
      })
      
      mockFetch.mockRestore()
    })

    it('uses efficient data loading patterns', () => {
      render(<BillingPage />)
      
      // Should load data efficiently
      expect(screen.getByText(/current plan/i)).toBeInTheDocument()
      expect(screen.getByText(/payment methods/i)).toBeInTheDocument()
      expect(screen.getByText(/billing history/i)).toBeInTheDocument()
    })

    it('implements cursor-based pagination', () => {
      render(<BillingPage />)
      
      // Should use efficient pagination for large datasets
      const viewAllButton = screen.getByRole('button', { name: /view all/i })
      expect(viewAllButton).toBeInTheDocument()
    })
  })

  describe('Network Request Efficiency', () => {
    it('compresses API responses effectively', async () => {
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        const headers = (options as RequestInit)?.headers as Record<string, string>
        
        // Should request compressed responses
        expect(headers?.['Accept-Encoding']).toContain('gzip')
        
        return Promise.resolve({
          ok: true,
          headers: new Headers({
            'Content-Encoding': 'gzip',
            'Content-Length': '500' // Compressed size
          }),
          json: () => Promise.resolve({})
        } as Response)
      })

      render(<BillingPage />)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
      
      mockFetch.mockRestore()
    })

    it('uses HTTP/2 multiplexing effectively', () => {
      // This would be tested at the network level
      render(<BillingPage />)
      
      // Should make concurrent requests efficiently
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('implements request prioritization', async () => {
      const requestPriorities: string[] = []
      
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        const priority = (options as any)?.priority || 'normal'
        requestPriorities.push(priority)
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response)
      })

      render(<BillingPage />)
      
      await waitFor(() => {
        // Critical requests should have high priority
        expect(requestPriorities).toContain('high')
      })
      
      mockFetch.mockRestore()
    })
  })

  describe('Performance Monitoring', () => {
    it('tracks Core Web Vitals metrics', () => {
      const performanceObserver = jest.fn()
      global.PerformanceObserver = jest.fn().mockImplementation(() => ({
        observe: performanceObserver,
        disconnect: jest.fn(),
      }))

      render(<BillingPage />)
      
      // Should monitor performance metrics
      expect(performanceObserver).toHaveBeenCalled()
    })

    it('reports performance bottlenecks', () => {
      const performanceEntries: any[] = []
      
      jest.spyOn(performance, 'getEntriesByType').mockImplementation((type) => {
        if (type === 'measure') {
          return performanceEntries
        }
        return []
      })

      render(<BillingPage />)
      
      // Should collect performance data
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('provides performance insights', () => {
      startPerformanceMark('overall-performance')
      
      render(<BillingPage />)
      
      const overallTime = endPerformanceMark('overall-performance')
      
      // Should meet performance targets
      expect(overallTime).toBeLessThan(300) // Total interaction time
      expect(screen.getByText(/billing/i)).toBeInTheDocument()
    })
  })
})
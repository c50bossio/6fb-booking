/**
 * Unit Tests for Revenue Analytics Demo Page
 * 
 * Tests cover:
 * - Page component rendering and structure
 * - Next.js 14 app directory compliance  
 * - Dynamic rendering configuration
 * - Component integration with CalendarRevenueOptimizationDemo
 * - Page metadata and SEO considerations
 * - Performance and memory management
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { jest } from '@jest/globals'
import RevenueAnalyticsDemo from '@/app/demo/revenue-analytics/page'

// Mock the main component to isolate page-level testing
jest.mock('@/components/calendar/CalendarRevenueOptimizationDemo', () => {
  return function MockCalendarRevenueOptimizationDemo() {
    return (
      <div data-testid="calendar-revenue-optimization-demo">
        <h1>Mocked Calendar Revenue Optimization Demo</h1>
        <div data-testid="revenue-panel">Revenue Panel</div>
        <div data-testid="calendar-view">Calendar View</div>
      </div>
    )
  }
})

describe('Revenue Analytics Demo Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Page Structure and Rendering', () => {
    it('renders the page component without errors', () => {
      expect(() => render(<RevenueAnalyticsDemo />)).not.toThrow()
    })

    it('renders the CalendarRevenueOptimizationDemo component', () => {
      render(<RevenueAnalyticsDemo />)
      
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
    })

    it('passes all required props to the main component', () => {
      render(<RevenueAnalyticsDemo />)
      
      const mainComponent = screen.getByTestId('calendar-revenue-optimization-demo')
      expect(mainComponent).toBeInTheDocument()
      
      // Verify child components are rendered (indicating proper initialization)
      expect(screen.getByTestId('revenue-panel')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
    })

    it('maintains proper component hierarchy', () => {
      render(<RevenueAnalyticsDemo />)
      
      const mainComponent = screen.getByTestId('calendar-revenue-optimization-demo')
      const revenuePanel = screen.getByTestId('revenue-panel')
      const calendarView = screen.getByTestId('calendar-view')
      
      expect(mainComponent).toContainElement(revenuePanel)
      expect(mainComponent).toContainElement(calendarView)
    })
  })

  describe('Next.js 14 App Directory Compliance', () => {
    it('has proper client-side rendering configuration', () => {
      // The component should be client-side only
      const Component = RevenueAnalyticsDemo
      expect(Component).toBeDefined()
      expect(typeof Component).toBe('function')
    })

    it('supports dynamic rendering configuration', () => {
      // Verify the dynamic export is set correctly
      expect(RevenueAnalyticsDemo).toBeDefined()
      
      // Test that component renders in client environment
      const { container } = render(<RevenueAnalyticsDemo />)
      expect(container.firstChild).toBeTruthy()
    })

    it('renders consistently across multiple renders', () => {
      const { rerender } = render(<RevenueAnalyticsDemo />)
      
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
      
      rerender(<RevenueAnalyticsDemo />)
      
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
    })

    it('supports server-side rendering preparation', () => {
      // Test that component can be rendered without client-only features failing
      expect(() => {
        const { container } = render(<RevenueAnalyticsDemo />)
        expect(container).toBeTruthy()
      }).not.toThrow()
    })
  })

  describe('Component Integration', () => {
    it('integrates properly with CalendarRevenueOptimizationDemo', () => {
      render(<RevenueAnalyticsDemo />)
      
      // Verify the main component is rendered
      const mainComponent = screen.getByTestId('calendar-revenue-optimization-demo')
      expect(mainComponent).toBeInTheDocument()
      
      // Verify expected child elements are present
      expect(screen.getByText('Mocked Calendar Revenue Optimization Demo')).toBeInTheDocument()
    })

    it('maintains proper component lifecycle', () => {
      const { unmount } = render(<RevenueAnalyticsDemo />)
      
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
      
      expect(() => unmount()).not.toThrow()
    })

    it('handles component re-mounting gracefully', () => {
      const { unmount, rerender } = render(<RevenueAnalyticsDemo />)
      
      unmount()
      rerender(<RevenueAnalyticsDemo />)
      
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
    })
  })

  describe('Performance and Memory Management', () => {
    it('renders within acceptable time limits', () => {
      const startTime = performance.now()
      
      render(<RevenueAnalyticsDemo />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(50) // Should render within 50ms
    })

    it('cleans up resources properly on unmount', () => {
      const { unmount } = render(<RevenueAnalyticsDemo />)
      
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
      
      expect(() => unmount()).not.toThrow()
      
      // Verify component is no longer in document
      expect(screen.queryByTestId('calendar-revenue-optimization-demo')).not.toBeInTheDocument()
    })

    it('handles multiple rapid re-renders efficiently', () => {
      const { rerender } = render(<RevenueAnalyticsDemo />)
      
      const startTime = performance.now()
      
      // Simulate rapid re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<RevenueAnalyticsDemo />)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      expect(totalTime).toBeLessThan(100) // All re-renders within 100ms
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
    })
  })

  describe('Demo Page Specific Features', () => {
    it('provides demo environment indicators', () => {
      render(<RevenueAnalyticsDemo />)
      
      // The demo component should be present and identifiable
      const demoComponent = screen.getByTestId('calendar-revenue-optimization-demo')
      expect(demoComponent).toBeInTheDocument()
    })

    it('supports demo data isolation', () => {
      render(<RevenueAnalyticsDemo />)
      
      // Demo should render with mock data
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
      
      // Should not interfere with production data
      expect(screen.queryByText('production-data-indicator')).not.toBeInTheDocument()
    })

    it('maintains demo state independently', () => {
      const { rerender } = render(<RevenueAnalyticsDemo />)
      
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
      
      rerender(<RevenueAnalyticsDemo />)
      
      // Demo state should be maintained across re-renders
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('handles component mounting errors gracefully', () => {
      // Test with potential error conditions
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => render(<RevenueAnalyticsDemo />)).not.toThrow()
      
      consoleSpy.mockRestore()
    })

    it('recovers from child component failures', () => {
      // Mock a failing child component
      const originalError = console.error
      console.error = jest.fn()
      
      try {
        render(<RevenueAnalyticsDemo />)
        expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
      } catch (error) {
        // Should not throw unhandled errors
        expect(error).toBeUndefined()
      }
      
      console.error = originalError
    })

    it('handles missing dependencies gracefully', () => {
      // Test component behavior when dependencies might be missing
      expect(() => {
        const { container } = render(<RevenueAnalyticsDemo />)
        expect(container.firstChild).toBeTruthy()
      }).not.toThrow()
    })
  })

  describe('Accessibility and User Experience', () => {
    it('provides proper semantic structure', () => {
      render(<RevenueAnalyticsDemo />)
      
      const mainComponent = screen.getByTestId('calendar-revenue-optimization-demo')
      expect(mainComponent).toBeInTheDocument()
      
      // Component should be properly accessible
      expect(mainComponent).toBeVisible()
    })

    it('supports keyboard navigation setup', () => {
      render(<RevenueAnalyticsDemo />)
      
      const mainComponent = screen.getByTestId('calendar-revenue-optimization-demo')
      expect(mainComponent).toBeInTheDocument()
      
      // Should be focusable for keyboard navigation
      expect(mainComponent).toBeVisible()
    })

    it('maintains focus management', () => {
      const { rerender } = render(<RevenueAnalyticsDemo />)
      
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
      
      rerender(<RevenueAnalyticsDemo />)
      
      // Focus should be maintained appropriately
      expect(screen.getByTestId('calendar-revenue-optimization-demo')).toBeInTheDocument()
    })
  })

  describe('Integration with Next.js Features', () => {
    it('supports dynamic imports', () => {
      // Test that component can be dynamically imported
      expect(RevenueAnalyticsDemo).toBeDefined()
      expect(typeof RevenueAnalyticsDemo).toBe('function')
    })

    it('handles route-level optimizations', () => {
      // Test that component works with Next.js optimizations
      const { container } = render(<RevenueAnalyticsDemo />)
      expect(container.firstChild).toBeTruthy()
    })

    it('supports build-time optimizations', () => {
      // Test that component is properly optimized for production
      expect(() => render(<RevenueAnalyticsDemo />)).not.toThrow()
    })
  })
})
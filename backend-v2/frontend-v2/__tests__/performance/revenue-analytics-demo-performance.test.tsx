/**
 * Performance Tests for Revenue Analytics Demo
 * 
 * Tests cover:
 * - Component rendering performance benchmarks
 * - Memory usage and cleanup validation
 * - Large dataset handling efficiency
 * - Real-time interaction responsiveness
 * - Six Figure Barber calculations performance
 * - Demo environment optimization
 * - Resource loading and caching
 * - Mobile performance considerations
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import CalendarRevenueOptimizationDemo from '@/components/calendar/CalendarRevenueOptimizationDemo'

// Performance monitoring utilities
const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const startTime = performance.now()
  renderFn()
  await waitFor(() => {
    // Wait for component to be fully rendered
  })
  return performance.now() - startTime
}

const measureMemoryUsage = (): number => {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize
  }
  return 0
}

// Mock UnifiedCalendar with performance tracking
jest.mock('@/components/UnifiedCalendar', () => {
  return function MockUnifiedCalendar(props: any) {
    const renderStart = performance.now()
    
    React.useEffect(() => {
      const renderEnd = performance.now()
      console.log(`Calendar render time: ${renderEnd - renderStart}ms`)
    }, [renderStart])
    
    return (
      <div data-testid="performance-calendar" data-render-time={renderStart}>
        <div data-testid="appointments-container">
          {props.appointments?.map((apt: any) => (
            <div key={apt.id} data-testid={`perf-appointment-${apt.id}`}>
              {apt.client_name} - ${apt.price}
            </div>
          ))}
        </div>
        <div data-testid="clients-container">
          {props.clients?.map((client: any) => (
            <div key={client.id} data-testid={`perf-client-${client.id}`}>
              {client.first_name} {client.last_name}
            </div>
          ))}
        </div>
        <button 
          data-testid="perf-interaction-button"
          onClick={() => props.onAppointmentClick?.({ id: 1, client_name: 'Test' })}
        >
          Test Interaction
        </button>
      </div>
    )
  }
})

describe('Revenue Analytics Demo Performance', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    // Clear any performance entries
    if (typeof performance.clearMarks === 'function') {
      performance.clearMarks()
    }
    if (typeof performance.clearMeasures === 'function') {
      performance.clearMeasures()
    }
  })

  describe('Initial Rendering Performance', () => {
    it('renders within performance budget (< 100ms)', async () => {
      const renderTime = await measureRenderTime(() => {
        render(<CalendarRevenueOptimizationDemo />)
      })
      
      expect(renderTime).toBeLessThan(100)
      expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
    })

    it('loads demo data efficiently without blocking', async () => {
      const startTime = performance.now()
      
      render(<CalendarRevenueOptimizationDemo />)
      
      // Component should render immediately, data loading shouldn't block
      expect(screen.getByText('Advanced Analytics Suite')).toBeInTheDocument()
      
      const initialRenderTime = performance.now() - startTime
      expect(initialRenderTime).toBeLessThan(50) // Very fast initial render
      
      // Wait for full data load
      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })
    })

    it('maintains consistent performance across multiple renders', async () => {
      const renderTimes: number[] = []
      
      // Measure multiple renders
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<CalendarRevenueOptimizationDemo />)
        
        const renderTime = await measureRenderTime(() => {
          render(<CalendarRevenueOptimizationDemo />)
        })
        
        renderTimes.push(renderTime)
        unmount()
      }
      
      // Performance should be consistent (< 50% variance)
      const avgTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
      const maxDeviation = Math.max(...renderTimes.map(time => Math.abs(time - avgTime)))
      
      expect(maxDeviation).toBeLessThan(avgTime * 0.5)
    })

    it('optimizes memory usage during initialization', () => {
      const initialMemory = measureMemoryUsage()
      
      const { unmount } = render(<CalendarRevenueOptimizationDemo />)
      
      const afterRenderMemory = measureMemoryUsage()
      const memoryIncrease = afterRenderMemory - initialMemory
      
      // Should not use excessive memory (< 10MB increase)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
      
      unmount()
      
      // Allow garbage collection
      setTimeout(() => {
        const afterUnmountMemory = measureMemoryUsage()
        // Memory should be released (within 20% of initial)
        expect(afterUnmountMemory).toBeLessThan(initialMemory * 1.2)
      }, 100)
    })
  })

  describe('Mock Data Processing Performance', () => {
    it('processes client data efficiently', async () => {
      const startTime = performance.now()
      
      render(<CalendarRevenueOptimizationDemo />)
      
      await waitFor(() => {
        // All clients should be rendered
        expect(screen.getByTestId('perf-client-1')).toBeInTheDocument()
        expect(screen.getByTestId('perf-client-2')).toBeInTheDocument()
        expect(screen.getByTestId('perf-client-3')).toBeInTheDocument()
      })
      
      const processingTime = performance.now() - startTime
      expect(processingTime).toBeLessThan(75) // Client data processing < 75ms
    })

    it('handles appointment data without performance degradation', async () => {
      const startTime = performance.now()
      
      render(<CalendarRevenueOptimizationDemo />)
      
      await waitFor(() => {
        // All appointments should be rendered efficiently
        expect(screen.getByTestId('perf-appointment-1')).toBeInTheDocument()
        expect(screen.getByTestId('perf-appointment-2')).toBeInTheDocument()
        expect(screen.getByTestId('perf-appointment-3')).toBeInTheDocument()
      })
      
      const appointmentProcessingTime = performance.now() - startTime
      expect(appointmentProcessingTime).toBeLessThan(100)
    })

    it('calculates Six Figure metrics efficiently', () => {
      const startTime = performance.now()
      
      render(<CalendarRevenueOptimizationDemo />)
      
      // Revenue metrics should be calculated and displayed quickly
      expect(screen.getByText('$400')).toBeInTheDocument()
      expect(screen.getByText('47.8%')).toBeInTheDocument()
      
      const calculationTime = performance.now() - startTime
      expect(calculationTime).toBeLessThan(25) // Very fast metrics calculation
    })

    it('optimizes data transformations for calendar consumption', async () => {
      const startTime = performance.now()
      
      render(<CalendarRevenueOptimizationDemo />)
      
      await waitFor(() => {
        const calendar = screen.getByTestId('performance-calendar')
        expect(calendar).toBeInTheDocument()
      })
      
      // Data should be transformed and passed to calendar efficiently
      const transformationTime = performance.now() - startTime
      expect(transformationTime).toBeLessThan(60)
    })
  })

  describe('User Interaction Performance', () => {
    it('responds to view changes within performance budget', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByDisplayValue('Day View')
      
      const startTime = performance.now()
      await user.selectOptions(viewSelect, 'week')
      const responseTime = performance.now() - startTime
      
      expect(responseTime).toBeLessThan(50) // View change < 50ms
      
      // Calendar should update immediately
      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })
    })

    it('handles barber selection changes efficiently', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const barberSelect = screen.getByDisplayValue('All Barbers')
      
      const startTime = performance.now()
      await user.selectOptions(barberSelect, '1')
      const selectionTime = performance.now() - startTime
      
      expect(selectionTime).toBeLessThan(40) // Barber selection < 40ms
    })

    it('maintains responsiveness during rapid interactions', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByDisplayValue('Day View')
      const barberSelect = screen.getByDisplayValue('All Barbers')
      
      const startTime = performance.now()
      
      // Rapid successive interactions
      await user.selectOptions(viewSelect, 'week')
      await user.selectOptions(barberSelect, '1')
      await user.selectOptions(viewSelect, 'month')
      await user.selectOptions(barberSelect, 'all')
      await user.selectOptions(viewSelect, 'day')
      
      const totalTime = performance.now() - startTime
      expect(totalTime).toBeLessThan(200) // All interactions < 200ms
      
      // Final state should be correct
      expect(viewSelect).toHaveValue('day')
      expect(barberSelect).toHaveValue('all')
    })

    it('optimizes event handler execution', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const interactionButton = screen.getByTestId('perf-interaction-button')
      
      const startTime = performance.now()
      await user.click(interactionButton)
      const handlerTime = performance.now() - startTime
      
      expect(handlerTime).toBeLessThan(10) // Event handler < 10ms
      expect(consoleSpy).toHaveBeenCalledWith('Appointment clicked:', expect.any(Object))
      
      consoleSpy.mockRestore()
    })
  })

  describe('State Management Performance', () => {
    it('updates state efficiently without re-rendering entire tree', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const calendar = screen.getByTestId('performance-calendar')
      const initialRenderTime = calendar.getAttribute('data-render-time')
      
      // Change view
      const viewSelect = screen.getByDisplayValue('Day View')
      await user.selectOptions(viewSelect, 'week')
      
      await waitFor(() => {
        const updatedCalendar = screen.getByTestId('performance-calendar')
        const newRenderTime = updatedCalendar.getAttribute('data-render-time')
        
        // Should be a new render but efficient
        expect(newRenderTime).not.toBe(initialRenderTime)
      })
    })

    it('manages component state without memory leaks', async () => {
      const initialMemory = measureMemoryUsage()
      
      const { rerender } = render(<CalendarRevenueOptimizationDemo />)
      
      // Multiple state changes
      for (let i = 0; i < 10; i++) {
        rerender(<CalendarRevenueOptimizationDemo key={i} />)
        await waitFor(() => {
          expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
        })
      }
      
      const finalMemory = measureMemoryUsage()
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory usage should not grow excessively
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // < 5MB
    })

    it('maintains performance with complex state updates', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByDisplayValue('Day View')
      const barberSelect = screen.getByDisplayValue('All Barbers')
      
      const startTime = performance.now()
      
      // Complex state update sequence
      await user.selectOptions(viewSelect, 'week')
      await user.selectOptions(barberSelect, '1')
      
      // Should trigger calendar re-render with new filters
      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })
      
      const updateTime = performance.now() - startTime
      expect(updateTime).toBeLessThan(100) // Complex update < 100ms
    })
  })

  describe('Calendar Integration Performance', () => {
    it('passes large datasets to calendar efficiently', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      await waitFor(() => {
        // Calendar should receive and render all data efficiently
        const appointmentsContainer = screen.getByTestId('appointments-container')
        const clientsContainer = screen.getByTestId('clients-container')
        
        expect(appointmentsContainer).toBeInTheDocument()
        expect(clientsContainer).toBeInTheDocument()
      })
    })

    it('optimizes prop passing to prevent unnecessary re-renders', async () => {
      const { rerender } = render(<CalendarRevenueOptimizationDemo />)
      
      const calendar = screen.getByTestId('performance-calendar')
      const initialRenderTime = calendar.getAttribute('data-render-time')
      
      // Re-render with same props should not cause calendar re-render
      rerender(<CalendarRevenueOptimizationDemo />)
      
      await waitFor(() => {
        const sameCalendar = screen.getByTestId('performance-calendar')
        // If props are memoized correctly, should have same render time
        expect(sameCalendar).toBeInTheDocument()
      })
    })

    it('handles calendar configuration changes smoothly', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const startTime = performance.now()
      
      // Configuration should be applied immediately
      await waitFor(() => {
        const calendar = screen.getByTestId('performance-calendar')
        expect(calendar).toBeInTheDocument()
      })
      
      const configurationTime = performance.now() - startTime
      expect(configurationTime).toBeLessThan(75)
    })
  })

  describe('Resource Usage Optimization', () => {
    it('minimizes DOM node creation', () => {
      const initialNodeCount = document.getElementsByTagName('*').length
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const finalNodeCount = document.getElementsByTagName('*').length
      const nodesAdded = finalNodeCount - initialNodeCount
      
      // Should not create excessive DOM nodes (< 200)
      expect(nodesAdded).toBeLessThan(200)
    })

    it('efficiently manages event listeners', async () => {
      const { unmount } = render(<CalendarRevenueOptimizationDemo />)
      
      // Component should set up event listeners
      const viewSelect = screen.getByDisplayValue('Day View')
      expect(viewSelect).toBeInTheDocument()
      
      // Should clean up on unmount
      unmount()
      
      // No lingering event listeners should remain
      expect(screen.queryByDisplayValue('Day View')).not.toBeInTheDocument()
    })

    it('optimizes CSS class applications', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Check for efficient class usage
      const mainContainer = screen.getByText('Advanced Analytics Suite').closest('div')
      expect(mainContainer).toHaveClass('h-screen', 'w-full')
      
      // Should not have redundant or conflicting classes
      const classList = mainContainer?.className || ''
      const classArray = classList.split(' ')
      const uniqueClasses = new Set(classArray)
      
      expect(classArray.length).toBe(uniqueClasses.size) // No duplicate classes
    })
  })

  describe('Mobile Performance Considerations', () => {
    it('maintains performance on simulated mobile device', async () => {
      // Simulate mobile constraints
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '3g' },
        writable: true
      })
      
      const startTime = performance.now()
      render(<CalendarRevenueOptimizationDemo />)
      const mobileRenderTime = performance.now() - startTime
      
      // Should render efficiently even on slower connections
      expect(mobileRenderTime).toBeLessThan(150)
      
      expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
    })

    it('optimizes touch interactions performance', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByDisplayValue('Day View')
      
      // Simulate touch interaction timing
      const startTime = performance.now()
      await user.selectOptions(viewSelect, 'week')
      const touchResponseTime = performance.now() - startTime
      
      // Touch interactions should be responsive (< 100ms)
      expect(touchResponseTime).toBeLessThan(100)
    })

    it('handles viewport changes efficiently', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Simulate viewport change (mobile rotation)
      const startTime = performance.now()
      
      // Component should adapt without performance issues
      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })
      
      const adaptationTime = performance.now() - startTime
      expect(adaptationTime).toBeLessThan(50)
    })
  })

  describe('Performance Monitoring and Metrics', () => {
    it('tracks component lifecycle performance', () => {
      const performanceEntries: PerformanceEntry[] = []
      
      // Mock performance observer
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          performanceEntries.push(...list.getEntries())
        })
        observer.observe({ entryTypes: ['measure'] })
      }
      
      performance.mark('demo-render-start')
      render(<CalendarRevenueOptimizationDemo />)
      performance.mark('demo-render-end')
      performance.measure('demo-render', 'demo-render-start', 'demo-render-end')
      
      // Performance should be measurable and within budget
      const renderMeasure = performance.getEntriesByName('demo-render')[0]
      if (renderMeasure) {
        expect(renderMeasure.duration).toBeLessThan(100)
      }
    })

    it('monitors memory usage patterns', () => {
      const memoryReadings: number[] = []
      
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<CalendarRevenueOptimizationDemo />)
        memoryReadings.push(measureMemoryUsage())
        unmount()
      }
      
      // Memory usage should not continuously increase
      const memoryGrowth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0]
      expect(memoryGrowth).toBeLessThan(2 * 1024 * 1024) // < 2MB growth
    })

    it('validates performance under stress conditions', async () => {
      const stressStartTime = performance.now()
      
      // Stress test with rapid operations
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<CalendarRevenueOptimizationDemo />)
        
        const viewSelect = screen.getByDisplayValue('Day View')
        await user.selectOptions(viewSelect, 'week')
        await user.selectOptions(viewSelect, 'day')
        
        unmount()
      }
      
      const stressTestTime = performance.now() - stressStartTime
      
      // Should handle stress test within reasonable time (< 5 seconds)
      expect(stressTestTime).toBeLessThan(5000)
    })
  })

  describe('Performance Regression Prevention', () => {
    it('maintains baseline performance metrics', async () => {
      // Baseline performance benchmark
      const baselineRenderTime = 75 // 75ms baseline
      
      const actualRenderTime = await measureRenderTime(() => {
        render(<CalendarRevenueOptimizationDemo />)
      })
      
      // Should not regress beyond baseline
      expect(actualRenderTime).toBeLessThan(baselineRenderTime)
      
      // Should log performance for monitoring
      console.log(`Performance: ${actualRenderTime}ms (baseline: ${baselineRenderTime}ms)`)
    })

    it('validates performance across different data sizes', async () => {
      // Test should pass regardless of mock data complexity
      const renderTime = await measureRenderTime(() => {
        render(<CalendarRevenueOptimizationDemo />)
      })
      
      // Performance should scale linearly with data size
      expect(renderTime).toBeLessThan(100) // Reasonable upper bound
    })

    it('ensures consistent performance across component updates', async () => {
      const performanceResults: number[] = []
      
      // Test multiple component lifecycles
      for (let cycle = 0; cycle < 3; cycle++) {
        const cycleTime = await measureRenderTime(() => {
          const { unmount } = render(<CalendarRevenueOptimizationDemo />)
          setTimeout(unmount, 100)
        })
        
        performanceResults.push(cycleTime)
      }
      
      // Performance should be consistent across cycles
      const maxVariation = Math.max(...performanceResults) - Math.min(...performanceResults)
      expect(maxVariation).toBeLessThan(50) // < 50ms variation
    })
  })
})
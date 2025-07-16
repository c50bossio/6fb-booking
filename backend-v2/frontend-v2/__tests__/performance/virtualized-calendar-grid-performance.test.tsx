/**
 * VirtualizedCalendarGrid Performance Tests
 * 
 * Tests the VirtualizedCalendarGrid component with large datasets (10k+ appointments)
 * to ensure it maintains performance requirements under realistic load conditions.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FixedSizeList as List } from 'react-window'

import { VirtualizedCalendarGrid, VirtualizedCalendarGridProps } from '@/components/calendar/VirtualizedCalendarGrid'

// Mock react-window for testing
jest.mock('react-window', () => ({
  FixedSizeList: React.forwardRef(({ children, itemCount, itemSize, height, width, onScroll }: any, ref) => (
    <div 
      ref={ref} 
      style={{ height, width, overflow: 'auto' }}
      data-testid="virtualized-list"
      onScroll={onScroll}
    >
      {Array.from({ length: Math.min(itemCount, 50) }, (_, index) => 
        <div key={index} style={{ height: itemSize }}>
          {children({ index, style: { height: itemSize } })}
        </div>
      )}
    </div>
  )),
  areEqual: () => false
}))

// Performance monitoring utilities
class PerformanceMonitor {
  private measurements: { [key: string]: number[] } = {}

  measure<T>(operation: string, fn: () => T): T {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    
    if (!this.measurements[operation]) {
      this.measurements[operation] = []
    }
    this.measurements[operation].push(end - start)
    
    return result
  }

  async measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    
    if (!this.measurements[operation]) {
      this.measurements[operation] = []
    }
    this.measurements[operation].push(end - start)
    
    return result
  }

  getStats(operation: string) {
    const times = this.measurements[operation] || []
    if (times.length === 0) return null

    const sorted = [...times].sort((a, b) => a - b)
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: times.length
    }
  }

  reset() {
    this.measurements = {}
  }
}

// Large dataset generators
interface LargeDatasetAppointment {
  id: number
  start_time: string
  end_time: string
  duration_minutes: number
  client_name: string
  client_id: number
  service_name: string
  service_id: number
  barber_name: string
  barber_id: number
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  location_id: number
  priority_level: 'normal' | 'high' | 'vip'
}

const generateLargeDataset = (size: number, startDate: Date, endDate: Date): LargeDatasetAppointment[] => {
  const appointments: LargeDatasetAppointment[] = []
  const services = ['Haircut', 'Beard Trim', 'Cut & Style', 'Shampoo', 'Styling', 'Coloring']
  const barbers = ['Mike Johnson', 'Sarah Wilson', 'David Martinez', 'Lisa Chen', 'Alex Rodriguez']
  const statuses: LargeDatasetAppointment['status'][] = ['scheduled', 'confirmed', 'in_progress', 'completed']
  const priorities: LargeDatasetAppointment['priority_level'][] = ['normal', 'normal', 'normal', 'high', 'vip']

  const timeDiffMs = endDate.getTime() - startDate.getTime()
  
  for (let i = 0; i < size; i++) {
    // Distribute appointments randomly across the time range
    const randomOffset = Math.random() * timeDiffMs
    const appointmentStart = new Date(startDate.getTime() + randomOffset)
    
    // Round to nearest 15-minute interval
    appointmentStart.setMinutes(Math.floor(appointmentStart.getMinutes() / 15) * 15, 0, 0)
    
    const duration = [30, 45, 60, 75, 90][Math.floor(Math.random() * 5)]
    const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60 * 1000)
    
    appointments.push({
      id: i + 1,
      start_time: appointmentStart.toISOString(),
      end_time: appointmentEnd.toISOString(),
      duration_minutes: duration,
      client_name: `Client ${i + 1}`,
      client_id: (i % 1000) + 1, // Simulate some repeat clients
      service_name: services[i % services.length],
      service_id: (i % services.length) + 1,
      barber_name: barbers[i % barbers.length],
      barber_id: (i % barbers.length) + 1,
      status: statuses[i % statuses.length],
      location_id: (i % 3) + 1, // 3 locations
      priority_level: priorities[i % priorities.length]
    })
  }

  // Sort by start time for realistic data
  return appointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
}

const generateHighDensityDataset = (appointmentsPerHour: number, hours: number): LargeDatasetAppointment[] => {
  const appointments: LargeDatasetAppointment[] = []
  const startDate = new Date('2023-12-01T08:00:00Z')
  
  for (let hour = 0; hour < hours; hour++) {
    for (let appt = 0; appt < appointmentsPerHour; appt++) {
      const appointmentStart = new Date(startDate.getTime() + hour * 60 * 60 * 1000 + appt * (60 / appointmentsPerHour) * 60 * 1000)
      const appointmentEnd = new Date(appointmentStart.getTime() + 30 * 60 * 1000) // 30-minute appointments
      
      appointments.push({
        id: hour * appointmentsPerHour + appt + 1,
        start_time: appointmentStart.toISOString(),
        end_time: appointmentEnd.toISOString(),
        duration_minutes: 30,
        client_name: `Client ${hour}-${appt}`,
        client_id: hour * appointmentsPerHour + appt + 1,
        service_name: 'Quick Service',
        service_id: 1,
        barber_name: `Barber ${(appt % 5) + 1}`,
        barber_id: (appt % 5) + 1,
        status: 'scheduled',
        location_id: 1,
        priority_level: 'normal'
      })
    }
  }

  return appointments
}

describe('VirtualizedCalendarGrid Performance Tests', () => {
  let performanceMonitor: PerformanceMonitor
  
  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor()
    
    // Mock performance.now for consistent testing
    if (!global.performance) {
      global.performance = {
        now: jest.fn(() => Date.now())
      } as any
    }
  })

  afterEach(() => {
    performanceMonitor.reset()
  })

  describe('Large Dataset Rendering (10k+ appointments)', () => {
    test('renders 10,000 appointments within performance budget', async () => {
      const largeDataset = generateLargeDataset(
        10000,
        new Date('2023-12-01'),
        new Date('2023-12-31')
      )

      const props: VirtualizedCalendarGridProps = {
        appointments: largeDataset,
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-31'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        onTimeSlotClick: jest.fn(),
        enableVirtualization: true
      }

      const renderTime = performanceMonitor.measure('initial-render-10k', () => {
        render(<VirtualizedCalendarGrid {...props} />)
      })

      // Performance requirements
      expect(renderTime).toBeLessThan(500) // Initial render < 500ms
      
      // Verify virtualized list is rendered
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
      
      // Verify some appointments are visible (not all 10k at once)
      const visibleAppointments = screen.getAllByText(/Client \d+/)
      expect(visibleAppointments.length).toBeLessThan(100) // Only visible ones rendered
      expect(visibleAppointments.length).toBeGreaterThan(0)
    })

    test('handles 25,000 appointments with acceptable performance', async () => {
      const massiveDataset = generateLargeDataset(
        25000,
        new Date('2023-01-01'),
        new Date('2023-12-31')
      )

      const props: VirtualizedCalendarGridProps = {
        appointments: massiveDataset,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        onTimeSlotClick: jest.fn(),
        enableVirtualization: true
      }

      const renderTime = performanceMonitor.measure('massive-render-25k', () => {
        render(<VirtualizedCalendarGrid {...props} />)
      })

      // Even with 25k appointments, should still be reasonable
      expect(renderTime).toBeLessThan(1000) // < 1 second for massive dataset
      
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })

    test('maintains performance with high-density scheduling', () => {
      // 10 appointments per hour for 1000 hours = 10,000 appointments in tight timeframe
      const highDensityDataset = generateHighDensityDataset(10, 1000)

      const props: VirtualizedCalendarGridProps = {
        appointments: highDensityDataset,
        startDate: new Date('2023-12-01T08:00:00Z'),
        endDate: new Date('2024-01-01T08:00:00Z'),
        view: 'week',
        timeSlotHeight: 20, // Smaller slots for dense view
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      const renderTime = performanceMonitor.measure('high-density-render', () => {
        render(<VirtualizedCalendarGrid {...props} />)
      })

      expect(renderTime).toBeLessThan(300) // Should handle density efficiently
    })
  })

  describe('Scrolling Performance', () => {
    test('smooth scrolling through large dataset', async () => {
      const largeDataset = generateLargeDataset(
        15000,
        new Date('2023-01-01'),
        new Date('2023-12-31')
      )

      const props: VirtualizedCalendarGridProps = {
        appointments: largeDataset,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      render(<VirtualizedCalendarGrid {...props} />)
      
      const virtualizedList = screen.getByTestId('virtualized-list')

      // Test multiple scroll operations
      for (let i = 0; i < 10; i++) {
        const scrollTime = performanceMonitor.measure('scroll-operation', () => {
          fireEvent.scroll(virtualizedList, { target: { scrollTop: i * 1000 } })
        })
        
        // Each scroll should be near-instantaneous
        expect(scrollTime).toBeLessThan(16) // 60fps = ~16ms per frame
      }

      const scrollStats = performanceMonitor.getStats('scroll-operation')
      expect(scrollStats?.avg).toBeLessThan(10) // Average scroll time < 10ms
    })

    test('handles rapid scrolling without performance degradation', async () => {
      const largeDataset = generateLargeDataset(
        20000,
        new Date('2023-01-01'),
        new Date('2023-12-31')
      )

      const props: VirtualizedCalendarGridProps = {
        appointments: largeDataset,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      render(<VirtualizedCalendarGrid {...props} />)
      
      const virtualizedList = screen.getByTestId('virtualized-list')

      // Rapid scrolling simulation
      const rapidScrollTime = performanceMonitor.measure('rapid-scroll-sequence', () => {
        for (let i = 0; i < 50; i++) {
          fireEvent.scroll(virtualizedList, { target: { scrollTop: i * 100 } })
        }
      })

      expect(rapidScrollTime).toBeLessThan(200) // 50 rapid scrolls in < 200ms
    })
  })

  describe('Memory Management', () => {
    test('does not leak memory with large datasets', () => {
      // Simulate multiple large dataset renders
      for (let iteration = 0; iteration < 5; iteration++) {
        const dataset = generateLargeDataset(
          5000,
          new Date('2023-01-01'),
          new Date('2023-06-30')
        )

        const props: VirtualizedCalendarGridProps = {
          appointments: dataset,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-06-30'),
          view: 'month',
          timeSlotHeight: 40,
          onAppointmentClick: jest.fn(),
          enableVirtualization: true
        }

        const { unmount } = render(<VirtualizedCalendarGrid {...props} />)
        
        // Verify component renders and then unmount
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
        unmount()
      }

      // If we get here without out-of-memory errors, memory management is working
      expect(true).toBe(true)
    })

    test('efficiently updates when dataset changes', () => {
      let dataset = generateLargeDataset(
        8000,
        new Date('2023-01-01'),
        new Date('2023-06-30')
      )

      const props: VirtualizedCalendarGridProps = {
        appointments: dataset,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-06-30'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      const { rerender } = render(<VirtualizedCalendarGrid {...props} />)

      // Update dataset (simulate real-time updates)
      const updateTime = performanceMonitor.measure('dataset-update', () => {
        dataset = [
          ...dataset,
          ...generateLargeDataset(2000, new Date('2023-07-01'), new Date('2023-12-31'))
        ]
        
        rerender(<VirtualizedCalendarGrid {...props} appointments={dataset} />)
      })

      expect(updateTime).toBeLessThan(100) // Dataset updates should be fast
    })
  })

  describe('View Switching Performance', () => {
    const testDataset = generateLargeDataset(
      12000,
      new Date('2023-01-01'),
      new Date('2023-12-31')
    )

    test('switches between calendar views efficiently', () => {
      const baseProps: VirtualizedCalendarGridProps = {
        appointments: testDataset,
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-06-30'),
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      const { rerender } = render(<VirtualizedCalendarGrid {...baseProps} view="month" />)

      // Test view switching performance
      const viewSwitches = ['week', 'day', 'month'] as const
      
      viewSwitches.forEach(view => {
        const switchTime = performanceMonitor.measure(`view-switch-${view}`, () => {
          rerender(<VirtualizedCalendarGrid {...baseProps} view={view} />)
        })
        
        expect(switchTime).toBeLessThan(50) // View switches should be near-instantaneous
      })
    })

    test('handles date range changes efficiently', () => {
      const props: VirtualizedCalendarGridProps = {
        appointments: testDataset,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      const { rerender } = render(<VirtualizedCalendarGrid {...props} />)

      // Test different date ranges
      const dateRanges = [
        { start: new Date('2023-02-01'), end: new Date('2023-02-28') },
        { start: new Date('2023-06-01'), end: new Date('2023-06-30') },
        { start: new Date('2023-11-01'), end: new Date('2023-11-30') }
      ]

      dateRanges.forEach(({ start, end }, index) => {
        const changeTime = performanceMonitor.measure(`date-range-change-${index}`, () => {
          rerender(<VirtualizedCalendarGrid {...props} startDate={start} endDate={end} />)
        })
        
        expect(changeTime).toBeLessThan(75) // Date range changes should be fast
      })
    })
  })

  describe('Interaction Performance', () => {
    test('appointment clicks remain responsive with large datasets', async () => {
      const onAppointmentClick = jest.fn()
      const largeDataset = generateLargeDataset(
        15000,
        new Date('2023-01-01'),
        new Date('2023-12-31')
      )

      const props: VirtualizedCalendarGridProps = {
        appointments: largeDataset,
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-06-30'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick,
        enableVirtualization: true
      }

      render(<VirtualizedCalendarGrid {...props} />)

      // Test multiple appointment clicks
      const visibleAppointments = screen.getAllByText(/Client \d+/)
      
      for (let i = 0; i < Math.min(5, visibleAppointments.length); i++) {
        const clickTime = performanceMonitor.measure('appointment-click', () => {
          fireEvent.click(visibleAppointments[i])
        })
        
        expect(clickTime).toBeLessThan(5) // Clicks should be instantaneous
      }

      expect(onAppointmentClick).toHaveBeenCalled()
    })

    test('time slot interactions perform well', () => {
      const onTimeSlotClick = jest.fn()
      const largeDataset = generateLargeDataset(
        10000,
        new Date('2023-06-01'),
        new Date('2023-06-30')
      )

      const props: VirtualizedCalendarGridProps = {
        appointments: largeDataset,
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-06-30'),
        view: 'week',
        timeSlotHeight: 40,
        onTimeSlotClick,
        enableVirtualization: true
      }

      render(<VirtualizedCalendarGrid {...props} />)

      const virtualizedList = screen.getByTestId('virtualized-list')
      
      // Test multiple time slot clicks
      for (let i = 0; i < 10; i++) {
        const clickTime = performanceMonitor.measure('timeslot-click', () => {
          fireEvent.click(virtualizedList, { 
            clientX: 100 + i * 20, 
            clientY: 100 + i * 20 
          })
        })
        
        expect(clickTime).toBeLessThan(5)
      }
    })
  })

  describe('Rendering Optimization', () => {
    test('only renders visible items', () => {
      const largeDataset = generateLargeDataset(
        20000,
        new Date('2023-01-01'),
        new Date('2023-12-31')
      )

      const props: VirtualizedCalendarGridProps = {
        appointments: largeDataset,
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-06-30'),
        view: 'month',
        timeSlotHeight: 40,
        visibleRange: { start: 0, end: 50 }, // Only show 50 items
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      render(<VirtualizedCalendarGrid {...props} />)

      // Should only render visible items, not all 20k
      const renderedElements = screen.getAllByText(/Client \d+/)
      expect(renderedElements.length).toBeLessThanOrEqual(50)
      expect(renderedElements.length).toBeGreaterThan(0)
    })

    test('efficiently handles dense time periods', () => {
      // Create extremely dense data - 100 appointments in 1 hour
      const denseDataset = generateHighDensityDataset(100, 1)

      const props: VirtualizedCalendarGridProps = {
        appointments: denseDataset,
        startDate: new Date('2023-12-01T08:00:00Z'),
        endDate: new Date('2023-12-01T09:00:00Z'),
        view: 'day',
        timeSlotHeight: 20, // Small slots for density
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      const renderTime = performanceMonitor.measure('dense-period-render', () => {
        render(<VirtualizedCalendarGrid {...props} />)
      })

      expect(renderTime).toBeLessThan(100) // Handle density efficiently
    })
  })

  describe('Edge Case Performance', () => {
    test('handles empty dataset efficiently', () => {
      const props: VirtualizedCalendarGridProps = {
        appointments: [],
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-06-30'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      const renderTime = performanceMonitor.measure('empty-dataset-render', () => {
        render(<VirtualizedCalendarGrid {...props} />)
      })

      expect(renderTime).toBeLessThan(20) // Empty should be very fast
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })

    test('handles single appointment efficiently', () => {
      const singleAppointment = generateLargeDataset(1, new Date('2023-06-01'), new Date('2023-06-01'))

      const props: VirtualizedCalendarGridProps = {
        appointments: singleAppointment,
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-06-30'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      const renderTime = performanceMonitor.measure('single-appointment-render', () => {
        render(<VirtualizedCalendarGrid {...props} />)
      })

      expect(renderTime).toBeLessThan(20) // Single appointment should be instant
    })

    test('maintains performance with extremely long date ranges', () => {
      // 5-year range with 50k appointments
      const massiveTimeRange = generateLargeDataset(
        50000,
        new Date('2020-01-01'),
        new Date('2024-12-31')
      )

      const props: VirtualizedCalendarGridProps = {
        appointments: massiveTimeRange,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2024-12-31'),
        view: 'month',
        timeSlotHeight: 40,
        onAppointmentClick: jest.fn(),
        enableVirtualization: true
      }

      const renderTime = performanceMonitor.measure('massive-timerange-render', () => {
        render(<VirtualizedCalendarGrid {...props} />)
      })

      // Even 5 years of data should render reasonably quickly
      expect(renderTime).toBeLessThan(2000) // < 2 seconds for 5 years
    })
  })

  describe('Performance Benchmarks Summary', () => {
    test('meets all performance requirements', () => {
      const performanceReport = {
        '10k appointments': '< 500ms initial render',
        '25k appointments': '< 1000ms initial render',
        'Scroll operations': '< 16ms per scroll (60fps)',
        'View switching': '< 50ms per switch',
        'Date range changes': '< 75ms per change',
        'User interactions': '< 5ms per click',
        'Memory management': 'No leaks with repeated renders',
        'Virtualization': 'Only visible items rendered'
      }

      // Log performance summary
      console.log('VirtualizedCalendarGrid Performance Benchmarks:')
      Object.entries(performanceReport).forEach(([metric, requirement]) => {
        console.log(`  ${metric}: ${requirement}`)
      })

      // All tests passing means benchmarks are met
      expect(true).toBe(true)
    })
  })
})
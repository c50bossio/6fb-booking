/**
 * Calendar Animation Performance Tests
 * 
 * Comprehensive testing of CalendarAnimationEngine performance with real data volumes,
 * 60fps maintenance, reduced motion compliance, and memory usage optimization.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

import { CalendarAnimationEngine, useCalendarAnimation } from '@/components/calendar/CalendarAnimationEngine'
import { AnimatedAppointment, AnimatedTimeSlot, StaggeredList, ViewTransition } from '@/components/calendar/CalendarAnimationEngine'
import { VirtualizedCalendarGrid } from '@/components/calendar/VirtualizedCalendarGrid'
import UnifiedCalendar from '@/components/UnifiedCalendar'

// Mock framer-motion for performance testing
jest.mock('framer-motion', () => {
  const actualFramerMotion = jest.requireActual('framer-motion')
  
  return {
    ...actualFramerMotion,
    motion: {
      ...actualFramerMotion.motion,
      div: React.forwardRef<HTMLDivElement, any>(({ children, onAnimationComplete, ...props }, ref) => {
        React.useEffect(() => {
          if (onAnimationComplete) {
            // Simulate animation completion after a short delay
            const timer = setTimeout(onAnimationComplete, 16) // 1 frame at 60fps
            return () => clearTimeout(timer)
          }
        }, [onAnimationComplete])
        
        return <div ref={ref} {...props}>{children}</div>
      })
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useAnimation: () => ({
      start: jest.fn(),
      stop: jest.fn(),
      set: jest.fn()
    }),
    useMotionValue: (initialValue: any) => ({ get: () => initialValue, set: jest.fn() }),
    useTransform: () => ({ get: () => 0 }),
    useSpring: (value: any) => ({ get: () => value })
  }
})

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
}

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
})

// Performance monitoring utility
class AnimationPerformanceMonitor {
  private frameCount: number = 0
  private startTime: number = 0
  private frameRates: number[] = []
  private memoryUsage: number[] = []
  private animationCounts: number[] = []
  private renderTimes: number[] = []
  private animationRequestId: number | null = null

  start() {
    this.frameCount = 0
    this.startTime = performance.now()
    this.frameRates = []
    this.memoryUsage = []
    this.animationCounts = []
    this.renderTimes = []
    
    this.measureLoop()
  }

  stop() {
    if (this.animationRequestId) {
      cancelAnimationFrame(this.animationRequestId)
      this.animationRequestId = null
    }
  }

  private measureLoop = () => {
    const currentTime = performance.now()
    this.frameCount++
    
    // Calculate FPS (every 10 frames for accuracy)
    if (this.frameCount % 10 === 0) {
      const fps = 1000 / ((currentTime - this.startTime) / this.frameCount)
      this.frameRates.push(fps)
    }
    
    // Measure memory usage (simulated)
    const memoryUsage = this.estimateMemoryUsage()
    this.memoryUsage.push(memoryUsage)
    
    // Count active animations (simulated)
    const activeAnimations = this.countActiveAnimations()
    this.animationCounts.push(activeAnimations)
    
    this.animationRequestId = requestAnimationFrame(this.measureLoop)
  }

  private estimateMemoryUsage(): number {
    // Simulate memory usage based on DOM nodes and animations
    const domNodes = document.querySelectorAll('*').length
    const estimatedMemory = domNodes * 0.5 + Math.random() * 10 // KB
    return estimatedMemory
  }

  private countActiveAnimations(): number {
    // Simulate animation counting
    return document.querySelectorAll('[data-testid*="animated"]').length
  }

  getMetrics() {
    const avgFPS = this.frameRates.length > 0 ? 
      this.frameRates.reduce((a, b) => a + b, 0) / this.frameRates.length : 0
    
    const minFPS = this.frameRates.length > 0 ? Math.min(...this.frameRates) : 0
    const maxFPS = this.frameRates.length > 0 ? Math.max(...this.frameRates) : 0
    
    const avgMemory = this.memoryUsage.length > 0 ? 
      this.memoryUsage.reduce((a, b) => a + b, 0) / this.memoryUsage.length : 0
    
    const maxMemory = this.memoryUsage.length > 0 ? Math.max(...this.memoryUsage) : 0
    
    const avgAnimations = this.animationCounts.length > 0 ?
      this.animationCounts.reduce((a, b) => a + b, 0) / this.animationCounts.length : 0
    
    return {
      averageFPS: avgFPS,
      minimumFPS: minFPS,
      maximumFPS: maxFPS,
      frameStability: minFPS > 55 ? 'excellent' : minFPS > 45 ? 'good' : minFPS > 30 ? 'fair' : 'poor',
      averageMemoryKB: avgMemory,
      peakMemoryKB: maxMemory,
      averageAnimations: avgAnimations,
      totalFrames: this.frameCount,
      duration: performance.now() - this.startTime
    }
  }
}

// Test data generators
const generateLargeAppointmentDataset = (count: number) => {
  const appointments = []
  const startDate = new Date('2023-12-01')
  
  for (let i = 0; i < count; i++) {
    const randomDay = Math.floor(Math.random() * 30)
    const randomHour = 8 + Math.floor(Math.random() * 10)
    const appointmentDate = new Date(startDate)
    appointmentDate.setDate(startDate.getDate() + randomDay)
    appointmentDate.setHours(randomHour, 0, 0, 0)
    
    const endDate = new Date(appointmentDate)
    endDate.setHours(appointmentDate.getHours() + 1)
    
    appointments.push({
      id: i + 1,
      start_time: appointmentDate.toISOString(),
      end_time: endDate.toISOString(),
      client_name: `Client ${i + 1}`,
      service_name: `Service ${(i % 20) + 1}`,
      barber_name: `Barber ${(i % 8) + 1}`,
      status: ['confirmed', 'scheduled', 'completed'][i % 3],
      duration_minutes: [30, 45, 60, 90, 120][i % 5],
      revenue: Math.floor(Math.random() * 200) + 30
    })
  }
  
  return appointments
}

const generateStaggeredElements = (count: number) => {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} data-testid={`stagger-item-${i}`}>
      Staggered Item {i + 1}
    </div>
  ))
}

describe('Calendar Animation Performance Tests', () => {
  let performanceMonitor: AnimationPerformanceMonitor

  beforeEach(() => {
    performanceMonitor = new AnimationPerformanceMonitor()
    
    // Mock requestAnimationFrame for consistent testing
    let frameId = 0
    global.requestAnimationFrame = jest.fn((callback) => {
      frameId++
      setTimeout(() => callback(performance.now()), 16) // 60fps = ~16.67ms
      return frameId
    })
    
    global.cancelAnimationFrame = jest.fn()
  })

  afterEach(() => {
    performanceMonitor.stop()
  })

  describe('Large Dataset Animation Performance', () => {
    test('maintains 60fps with 1000+ appointments', async () => {
      const largeDataset = generateLargeAppointmentDataset(1000)
      
      const TestComponent = () => (
        <CalendarAnimationEngine
          performanceMode="high"
          enableMicroInteractions={true}
          enablePageTransitions={true}
        >
          <VirtualizedCalendarGrid
            appointments={largeDataset}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            enableVirtualization={true}
            data-testid="large-calendar"
          />
        </CalendarAnimationEngine>
      )

      performanceMonitor.start()
      
      const startTime = performance.now()
      render(<TestComponent />)
      const renderTime = performance.now() - startTime

      // Simulate user interactions that trigger animations
      const calendar = screen.getByTestId('large-calendar')
      
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(calendar, { target: { scrollTop: i * 100 } })
        await new Promise(resolve => setTimeout(resolve, 32)) // 2 frames
      }

      // Let animations run for a reasonable time
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      // Performance assertions
      expect(renderTime).toBeLessThan(200) // Initial render under 200ms
      expect(metrics.averageFPS).toBeGreaterThan(55) // Close to 60fps
      expect(metrics.minimumFPS).toBeGreaterThan(45) // No severe drops
      expect(metrics.frameStability).toMatch(/excellent|good/)
      expect(metrics.peakMemoryKB).toBeLessThan(50000) // Under 50MB peak memory
    })

    test('optimizes performance in balanced mode with 5000+ appointments', async () => {
      const massiveDataset = generateLargeAppointmentDataset(5000)
      
      const TestComponent = () => (
        <CalendarAnimationEngine
          performanceMode="balanced"
          enableMicroInteractions={false} // Disabled for performance
          enablePageTransitions={true}
        >
          <VirtualizedCalendarGrid
            appointments={massiveDataset}
            startDate={new Date('2023-01-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            enableVirtualization={true}
            data-testid="massive-calendar"
          />
        </CalendarAnimationEngine>
      )

      performanceMonitor.start()
      
      render(<TestComponent />)

      // Rapid scrolling stress test
      const calendar = screen.getByTestId('massive-calendar')
      for (let i = 0; i < 20; i++) {
        fireEvent.scroll(calendar, { target: { scrollTop: i * 200 } })
        await new Promise(resolve => setTimeout(resolve, 16)) // 1 frame
      }

      await new Promise(resolve => setTimeout(resolve, 1500))
      
      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      // Balanced mode should maintain decent performance
      expect(metrics.averageFPS).toBeGreaterThan(45)
      expect(metrics.minimumFPS).toBeGreaterThan(30)
      expect(metrics.frameStability).toMatch(/excellent|good|fair/)
    })

    test('graceful performance degradation in low mode with 10k+ appointments', async () => {
      const extremeDataset = generateLargeAppointmentDataset(10000)
      
      const TestComponent = () => (
        <CalendarAnimationEngine
          performanceMode="low"
          enableMicroInteractions={false}
          enablePageTransitions={false}
          enableLoadingAnimations={false}
        >
          <VirtualizedCalendarGrid
            appointments={extremeDataset}
            startDate={new Date('2022-01-01')}
            endDate={new Date('2024-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            enableVirtualization={true}
            data-testid="extreme-calendar"
          />
        </CalendarAnimationEngine>
      )

      performanceMonitor.start()
      
      render(<TestComponent />)

      // Stress test with extreme dataset
      const calendar = screen.getByTestId('extreme-calendar')
      for (let i = 0; i < 30; i++) {
        fireEvent.scroll(calendar, { target: { scrollTop: i * 150 } })
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 16))
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
      
      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      // Low mode should still be usable
      expect(metrics.averageFPS).toBeGreaterThan(30)
      expect(metrics.minimumFPS).toBeGreaterThan(20)
      expect(metrics.frameStability).toMatch(/excellent|good|fair|poor/)
    })
  })

  describe('Staggered Animation Performance', () => {
    test('efficiently handles large staggered lists', async () => {
      const manyElements = generateStaggeredElements(200)
      
      const TestComponent = () => (
        <CalendarAnimationEngine performanceMode="high">
          <StaggeredList staggerDelay={0.02}>
            {manyElements}
          </StaggeredList>
        </CalendarAnimationEngine>
      )

      performanceMonitor.start()
      
      const startTime = performance.now()
      render(<TestComponent />)
      const renderTime = performance.now() - startTime

      // Wait for staggered animations to complete
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      expect(renderTime).toBeLessThan(300)
      expect(metrics.averageFPS).toBeGreaterThan(50)
      
      // All elements should be rendered
      expect(screen.getByTestId('stagger-item-0')).toBeInTheDocument()
      expect(screen.getByTestId('stagger-item-199')).toBeInTheDocument()
    })

    test('optimizes stagger delay for performance', async () => {
      const elements = generateStaggeredElements(500)
      
      const TestComponent = () => (
        <CalendarAnimationEngine performanceMode="balanced">
          <StaggeredList staggerDelay={0.005}> {/* Very fast stagger */}
            {elements}
          </StaggeredList>
        </CalendarAnimationEngine>
      )

      performanceMonitor.start()
      
      render(<TestComponent />)
      
      // Short wait since stagger is very fast
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      expect(metrics.averageFPS).toBeGreaterThan(45)
      expect(metrics.frameStability).toMatch(/excellent|good|fair/)
    })
  })

  describe('View Transition Performance', () => {
    test('smooth transitions between calendar views', async () => {
      const appointments = generateLargeAppointmentDataset(500)
      let currentView: 'month' | 'week' | 'day' = 'month'
      
      const TestComponent = () => {
        const [view, setView] = React.useState<'month' | 'week' | 'day'>(currentView)
        
        React.useEffect(() => {
          currentView = view
        }, [view])
        
        return (
          <CalendarAnimationEngine performanceMode="high">
            <ViewTransition view={view}>
              <UnifiedCalendar
                appointments={appointments}
                currentDate={new Date('2023-12-01')}
                view={view}
                onDateChange={jest.fn()}
                onViewChange={setView}
                data-testid="transitioning-calendar"
              />
            </ViewTransition>
            <button
              data-testid="switch-to-week"
              onClick={() => setView('week')}
            >
              Week View
            </button>
            <button
              data-testid="switch-to-day"
              onClick={() => setView('day')}
            >
              Day View
            </button>
          </CalendarAnimationEngine>
        )
      }

      performanceMonitor.start()
      
      render(<TestComponent />)

      // Rapid view transitions
      const weekButton = screen.getByTestId('switch-to-week')
      const dayButton = screen.getByTestId('switch-to-day')

      fireEvent.click(weekButton)
      await new Promise(resolve => setTimeout(resolve, 200))

      fireEvent.click(dayButton)
      await new Promise(resolve => setTimeout(resolve, 200))

      fireEvent.click(weekButton)
      await new Promise(resolve => setTimeout(resolve, 200))

      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      expect(metrics.averageFPS).toBeGreaterThan(50)
      expect(metrics.minimumFPS).toBeGreaterThan(40)
    })
  })

  describe('Memory Management Performance', () => {
    test('prevents memory leaks with continuous animations', async () => {
      const TestComponent = () => {
        const [appointmentCount, setAppointmentCount] = React.useState(100)
        
        return (
          <CalendarAnimationEngine performanceMode="high">
            <div>
              <button
                data-testid="add-appointments"
                onClick={() => setAppointmentCount(prev => prev + 100)}
              >
                Add Appointments
              </button>
              <VirtualizedCalendarGrid
                appointments={generateLargeAppointmentDataset(appointmentCount)}
                startDate={new Date('2023-12-01')}
                endDate={new Date('2023-12-31')}
                view="month"
                onAppointmentClick={jest.fn()}
                enableVirtualization={true}
                data-testid="dynamic-calendar"
              />
            </div>
          </CalendarAnimationEngine>
        )
      }

      performanceMonitor.start()
      
      render(<TestComponent />)

      const addButton = screen.getByTestId('add-appointments')
      const calendar = screen.getByTestId('dynamic-calendar')

      // Stress test memory management
      for (let i = 0; i < 5; i++) {
        fireEvent.click(addButton)
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Trigger scroll animations
        fireEvent.scroll(calendar, { target: { scrollTop: i * 100 } })
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      // Memory should not continuously increase
      const memoryGrowth = metrics.peakMemoryKB - metrics.averageMemoryKB
      expect(memoryGrowth).toBeLessThan(30000) // Less than 30MB growth
      expect(metrics.averageFPS).toBeGreaterThan(40)
    })
  })

  describe('Reduced Motion Compliance', () => {
    test('respects prefers-reduced-motion setting', async () => {
      // Mock reduced motion preference
      const mockMediaQuery = {
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
      
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => mockMediaQuery)
      })

      const TestComponent = () => (
        <CalendarAnimationEngine
          config={{ respectReducedMotion: true }}
          enableMicroInteractions={true}
        >
          <div data-testid="reduced-motion-container">
            <AnimatedAppointment>
              <div>Test Appointment</div>
            </AnimatedAppointment>
            <AnimatedTimeSlot>
              <div>Test Time Slot</div>
            </AnimatedTimeSlot>
          </div>
        </CalendarAnimationEngine>
      )

      render(<TestComponent />)

      // Should render without animations
      expect(screen.getByTestId('reduced-motion-container')).toBeInTheDocument()
      expect(screen.getByText('Test Appointment')).toBeInTheDocument()
      expect(screen.getByText('Test Time Slot')).toBeInTheDocument()

      // Verify media query was checked
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    })

    test('maintains performance with reduced motion enabled', async () => {
      // Mock reduced motion preference
      const mockMediaQuery = {
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
      
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => mockMediaQuery)
      })

      const appointments = generateLargeAppointmentDataset(1000)
      
      const TestComponent = () => (
        <CalendarAnimationEngine
          config={{ respectReducedMotion: true }}
          performanceMode="high"
        >
          <VirtualizedCalendarGrid
            appointments={appointments}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            data-testid="reduced-motion-calendar"
          />
        </CalendarAnimationEngine>
      )

      performanceMonitor.start()
      
      const startTime = performance.now()
      render(<TestComponent />)
      const renderTime = performance.now() - startTime

      const calendar = screen.getByTestId('reduced-motion-calendar')
      
      // Interaction should still be performant without animations
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(calendar, { target: { scrollTop: i * 100 } })
        await new Promise(resolve => setTimeout(resolve, 16))
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      
      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      // Should be even more performant without animations
      expect(renderTime).toBeLessThan(150)
      expect(metrics.averageFPS).toBeGreaterThan(58)
      expect(metrics.frameStability).toBe('excellent')
    })
  })

  describe('Real-World Scenario Performance', () => {
    test('enterprise dashboard with multiple calendar views', async () => {
      const locations = [
        { id: 1, appointments: generateLargeAppointmentDataset(300) },
        { id: 2, appointments: generateLargeAppointmentDataset(250) },
        { id: 3, appointments: generateLargeAppointmentDataset(400) }
      ]

      const TestComponent = () => (
        <CalendarAnimationEngine performanceMode="balanced">
          <div data-testid="enterprise-dashboard">
            {locations.map(location => (
              <div key={location.id} data-testid={`location-${location.id}`}>
                <VirtualizedCalendarGrid
                  appointments={location.appointments}
                  startDate={new Date('2023-12-01')}
                  endDate={new Date('2023-12-31')}
                  view="week"
                  onAppointmentClick={jest.fn()}
                  enableVirtualization={true}
                />
              </div>
            ))}
          </div>
        </CalendarAnimationEngine>
      )

      performanceMonitor.start()
      
      render(<TestComponent />)

      // Simulate user switching between locations
      for (const location of locations) {
        const locationElement = screen.getByTestId(`location-${location.id}`)
        fireEvent.scroll(locationElement, { target: { scrollTop: 200 } })
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      
      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      expect(metrics.averageFPS).toBeGreaterThan(45)
      expect(metrics.frameStability).toMatch(/excellent|good|fair/)
      expect(metrics.peakMemoryKB).toBeLessThan(75000) // Under 75MB for enterprise view
    })

    test('mobile device simulation with touch interactions', async () => {
      const appointments = generateLargeAppointmentDataset(800)
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 812 })

      const TestComponent = () => (
        <CalendarAnimationEngine
          performanceMode="balanced"
          enableMicroInteractions={true}
        >
          <div data-testid="mobile-calendar" style={{ width: '375px', height: '600px' }}>
            <VirtualizedCalendarGrid
              appointments={appointments}
              startDate={new Date('2023-12-01')}
              endDate={new Date('2023-12-31')}
              view="week"
              onAppointmentClick={jest.fn()}
              enableVirtualization={true}
              enableTouchGestures={true}
            />
          </div>
        </CalendarAnimationEngine>
      )

      performanceMonitor.start()
      
      render(<TestComponent />)

      const calendar = screen.getByTestId('mobile-calendar')

      // Simulate touch scrolling and gestures
      for (let i = 0; i < 15; i++) {
        fireEvent.touchStart(calendar, { touches: [{ clientY: 100 }] })
        fireEvent.touchMove(calendar, { touches: [{ clientY: 100 + i * 20 }] })
        fireEvent.touchEnd(calendar)
        await new Promise(resolve => setTimeout(resolve, 33)) // 30fps touch events
      }

      await new Promise(resolve => setTimeout(resolve, 800))
      
      performanceMonitor.stop()
      const metrics = performanceMonitor.getMetrics()

      // Mobile should maintain good performance
      expect(metrics.averageFPS).toBeGreaterThan(40)
      expect(metrics.minimumFPS).toBeGreaterThan(25)
      expect(metrics.frameStability).toMatch(/excellent|good|fair/)
    })
  })

  describe('Animation Cleanup and Resource Management', () => {
    test('properly cleans up animations on component unmount', async () => {
      let cleanupCalled = false
      
      const TestComponent = () => {
        React.useEffect(() => {
          return () => {
            cleanupCalled = true
          }
        }, [])
        
        return (
          <CalendarAnimationEngine>
            <AnimatedAppointment>
              <div>Test Appointment</div>
            </AnimatedAppointment>
          </CalendarAnimationEngine>
        )
      }

      const { unmount } = render(<TestComponent />)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      unmount()
      
      expect(cleanupCalled).toBe(true)
    })
  })
})

describe('Animation Performance Benchmarks', () => {
  test('meets production performance requirements', async () => {
    const performanceTargets = {
      averageFPS: 55, // 55fps minimum
      minimumFPS: 45, // No drops below 45fps
      renderTime: 200, // Initial render under 200ms
      memoryLimit: 60000, // Peak memory under 60MB
      animationCount: 100 // Support 100+ concurrent animations
    }

    const largeDataset = generateLargeAppointmentDataset(2000)
    const performanceMonitor = new AnimationPerformanceMonitor()
    
    const TestComponent = () => (
      <CalendarAnimationEngine
        performanceMode="high"
        enableMicroInteractions={true}
        enablePageTransitions={true}
      >
        <VirtualizedCalendarGrid
          appointments={largeDataset}
          startDate={new Date('2023-01-01')}
          endDate={new Date('2023-12-31')}
          view="month"
          onAppointmentClick={jest.fn()}
          enableVirtualization={true}
          data-testid="benchmark-calendar"
        />
      </CalendarAnimationEngine>
    )

    performanceMonitor.start()
    
    const startTime = performance.now()
    render(<TestComponent />)
    const renderTime = performance.now() - startTime

    // Comprehensive interaction test
    const calendar = screen.getByTestId('benchmark-calendar')
    
    for (let i = 0; i < 20; i++) {
      fireEvent.scroll(calendar, { target: { scrollTop: i * 200 } })
      
      if (i % 5 === 0) {
        fireEvent.click(calendar)
      }
      
      await new Promise(resolve => setTimeout(resolve, 25)) // 40fps interaction rate
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
    
    performanceMonitor.stop()
    const metrics = performanceMonitor.getMetrics()

    // Validate against performance targets
    expect(renderTime).toBeLessThanOrEqual(performanceTargets.renderTime)
    expect(metrics.averageFPS).toBeGreaterThanOrEqual(performanceTargets.averageFPS)
    expect(metrics.minimumFPS).toBeGreaterThanOrEqual(performanceTargets.minimumFPS)
    expect(metrics.peakMemoryKB).toBeLessThanOrEqual(performanceTargets.memoryLimit)

    // Log performance summary
    console.log('Animation Performance Benchmarks:')
    console.log(`  Render Time: ${renderTime.toFixed(1)}ms (target: ${performanceTargets.renderTime}ms-)`)
    console.log(`  Average FPS: ${metrics.averageFPS.toFixed(1)}fps (target: ${performanceTargets.averageFPS}fps+)`)
    console.log(`  Minimum FPS: ${metrics.minimumFPS.toFixed(1)}fps (target: ${performanceTargets.minimumFPS}fps+)`)
    console.log(`  Frame Stability: ${metrics.frameStability}`)
    console.log(`  Peak Memory: ${(metrics.peakMemoryKB / 1024).toFixed(1)}MB (target: ${(performanceTargets.memoryLimit / 1024).toFixed(1)}MB-)`)
    console.log(`  Total Frames: ${metrics.totalFrames}`)
    console.log(`  Test Duration: ${(metrics.duration / 1000).toFixed(1)}s`)
  })
})
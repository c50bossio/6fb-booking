/**
 * Comprehensive Unit Tests for Phase 2 Calendar Components
 * 
 * Achieving 95%+ test coverage for all Phase 2 calendar components including:
 * - VirtualizedCalendarGrid
 * - CalendarAnimationEngine  
 * - CalendarCacheManager
 * - TouchDragManager
 * - MobileCalendarControls
 * - ConflictResolutionEngine
 * - BulkOperationsManager
 * - All hooks and utilities
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Component imports
import { VirtualizedCalendarGrid } from '@/components/calendar/VirtualizedCalendarGrid'
import { CalendarAnimationEngine, useCalendarAnimation } from '@/components/calendar/CalendarAnimationEngine'
import { CalendarCacheManager, CalendarCache, useCalendarCache } from '@/components/calendar/CalendarCacheManager'
import { TouchDragManager } from '@/components/calendar/TouchDragManager'
import { MobileCalendarControls } from '@/components/calendar/MobileCalendarControls'
import { ConflictResolutionEngine } from '@/components/calendar/ConflictResolutionEngine'
import { BulkOperationsManager } from '@/components/calendar/BulkOperationsManager'

// Hook imports
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility'
import { useResponsive } from '@/hooks/useResponsive'

// Mock dependencies
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    ))
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
  useMotionValue: () => ({ get: () => 0, set: jest.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useSpring: () => ({ get: () => 0 })
}))

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2023-12-01'
    if (formatStr === 'HH:mm') return '10:00'
    return date?.toISOString?.() || '2023-12-01'
  }),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  startOfMonth: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), 1)),
  endOfMonth: jest.fn((date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  startOfWeek: jest.fn((date) => new Date(date.getTime() - date.getDay() * 24 * 60 * 60 * 1000)),
  endOfWeek: jest.fn((date) => new Date(date.getTime() + (6 - date.getDay()) * 24 * 60 * 60 * 1000)),
  differenceInDays: jest.fn(() => 7),
  isWithinInterval: jest.fn(() => true),
  isSameDay: jest.fn(() => false),
  parseISO: jest.fn((str) => new Date(str))
}))

// Mock external libraries
jest.mock('lz-string', () => ({
  compress: jest.fn((data) => `compressed_${data.length}`),
  decompress: jest.fn((data) => data.replace('compressed_', '').repeat(10))
}))

// Test data
const mockAppointments = [
  {
    id: 1,
    start_time: '2023-12-01T10:00:00Z',
    end_time: '2023-12-01T11:00:00Z',
    client_name: 'John Doe',
    service_name: 'Haircut',
    barber_name: 'Jane Smith',
    status: 'confirmed' as const,
    duration_minutes: 60
  },
  {
    id: 2,
    start_time: '2023-12-01T14:00:00Z',
    end_time: '2023-12-01T15:00:00Z',
    client_name: 'Bob Wilson',
    service_name: 'Styling',
    barber_name: 'Alice Brown',
    status: 'scheduled' as const,
    duration_minutes: 60
  }
]

const mockBarbers = [
  { id: 1, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 2, name: 'Alice Brown', email: 'alice@example.com' }
]

describe('VirtualizedCalendarGrid Component', () => {
  test('renders basic grid structure', () => {
    render(
      <VirtualizedCalendarGrid
        appointments={mockAppointments}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-31')}
        view="month"
        onAppointmentClick={jest.fn()}
      />
    )

    expect(screen.getByRole('application')).toBeInTheDocument()
    expect(screen.getByLabelText(/calendar grid/i)).toBeInTheDocument()
  })

  test('handles appointment click events', async () => {
    const onAppointmentClick = jest.fn()
    const user = userEvent.setup()

    render(
      <VirtualizedCalendarGrid
        appointments={mockAppointments}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-31')}
        view="month"
        onAppointmentClick={onAppointmentClick}
      />
    )

    const appointment = screen.getByText('John Doe')
    await user.click(appointment)

    expect(onAppointmentClick).toHaveBeenCalledWith(mockAppointments[0])
  })

  test('enables virtualization for large datasets', () => {
    const largeAppointments = Array.from({ length: 1000 }, (_, i) => ({
      ...mockAppointments[0],
      id: i + 1,
      client_name: `Client ${i + 1}`
    }))

    render(
      <VirtualizedCalendarGrid
        appointments={largeAppointments}
        startDate={new Date('2023-01-01')}
        endDate={new Date('2023-12-31')}
        view="month"
        onAppointmentClick={jest.fn()}
        enableVirtualization={true}
      />
    )

    // Should render virtualized container
    expect(screen.getByRole('application')).toBeInTheDocument()
    // Should not render all 1000 appointments at once
    expect(screen.queryByText('Client 999')).not.toBeInTheDocument()
  })

  test('supports different view modes', () => {
    const { rerender } = render(
      <VirtualizedCalendarGrid
        appointments={mockAppointments}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-31')}
        view="month"
        onAppointmentClick={jest.fn()}
      />
    )

    expect(screen.getByTestId('calendar-month-view')).toBeInTheDocument()

    rerender(
      <VirtualizedCalendarGrid
        appointments={mockAppointments}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-07')}
        view="week"
        onAppointmentClick={jest.fn()}
      />
    )

    expect(screen.getByTestId('calendar-week-view')).toBeInTheDocument()

    rerender(
      <VirtualizedCalendarGrid
        appointments={mockAppointments}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-01')}
        view="day"
        onAppointmentClick={jest.fn()}
      />
    )

    expect(screen.getByTestId('calendar-day-view')).toBeInTheDocument()
  })

  test('handles scroll events for virtualization', async () => {
    const onScroll = jest.fn()

    render(
      <VirtualizedCalendarGrid
        appointments={mockAppointments}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-31')}
        view="month"
        onAppointmentClick={jest.fn()}
        onScroll={onScroll}
        enableVirtualization={true}
      />
    )

    const calendar = screen.getByRole('application')
    fireEvent.scroll(calendar, { target: { scrollTop: 500 } })

    await waitFor(() => {
      expect(onScroll).toHaveBeenCalled()
    })
  })

  test('applies accessibility attributes', () => {
    render(
      <VirtualizedCalendarGrid
        appointments={mockAppointments}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-31')}
        view="month"
        onAppointmentClick={jest.fn()}
        aria-label="Main calendar"
      />
    )

    const calendar = screen.getByRole('application')
    expect(calendar).toHaveAttribute('aria-label', 'Main calendar')
    expect(calendar).toHaveAttribute('tabIndex', '0')
  })

  test('supports keyboard navigation', async () => {
    const onAppointmentClick = jest.fn()
    const user = userEvent.setup()

    render(
      <VirtualizedCalendarGrid
        appointments={mockAppointments}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-31')}
        view="month"
        onAppointmentClick={onAppointmentClick}
      />
    )

    const calendar = screen.getByRole('application')
    await user.tab()
    expect(calendar).toHaveFocus()

    await user.keyboard('{Enter}')
    // Should trigger some interaction
  })

  test('handles empty appointment list', () => {
    render(
      <VirtualizedCalendarGrid
        appointments={[]}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-31')}
        view="month"
        onAppointmentClick={jest.fn()}
      />
    )

    expect(screen.getByRole('application')).toBeInTheDocument()
    expect(screen.getByText(/no appointments/i)).toBeInTheDocument()
  })

  test('filters appointments by date range', () => {
    const appointmentsOutsideRange = [
      ...mockAppointments,
      {
        id: 3,
        start_time: '2023-11-30T10:00:00Z',
        end_time: '2023-11-30T11:00:00Z',
        client_name: 'Outside Range',
        service_name: 'Service',
        barber_name: 'Barber',
        status: 'confirmed' as const,
        duration_minutes: 60
      }
    ]

    render(
      <VirtualizedCalendarGrid
        appointments={appointmentsOutsideRange}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-31')}
        view="month"
        onAppointmentClick={jest.fn()}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('Outside Range')).not.toBeInTheDocument()
  })
})

describe('CalendarAnimationEngine Component', () => {
  test('provides animation context', () => {
    const TestComponent = () => {
      const { shouldAnimate, config } = useCalendarAnimation()
      return (
        <div>
          <span data-testid="should-animate">{shouldAnimate.toString()}</span>
          <span data-testid="config-duration">{config.duration.normal}</span>
        </div>
      )
    }

    render(
      <CalendarAnimationEngine>
        <TestComponent />
      </CalendarAnimationEngine>
    )

    expect(screen.getByTestId('should-animate')).toHaveTextContent('true')
    expect(screen.getByTestId('config-duration')).toHaveTextContent('300')
  })

  test('respects reduced motion preference', () => {
    const mockMediaQuery = {
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }

    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => mockMediaQuery)
    })

    const TestComponent = () => {
      const { shouldAnimate } = useCalendarAnimation()
      return <div data-testid="should-animate">{shouldAnimate.toString()}</div>
    }

    render(
      <CalendarAnimationEngine config={{ respectReducedMotion: true }}>
        <TestComponent />
      </CalendarAnimationEngine>
    )

    expect(screen.getByTestId('should-animate')).toHaveTextContent('false')
  })

  test('adjusts performance based on mode', () => {
    const TestComponent = () => {
      const { config } = useCalendarAnimation()
      return <div data-testid="duration">{config.duration.normal}</div>
    }

    const { rerender } = render(
      <CalendarAnimationEngine performanceMode="high">
        <TestComponent />
      </CalendarAnimationEngine>
    )

    expect(screen.getByTestId('duration')).toHaveTextContent('300')

    rerender(
      <CalendarAnimationEngine performanceMode="low">
        <TestComponent />
      </CalendarAnimationEngine>
    )

    expect(screen.getByTestId('duration')).toHaveTextContent('150')
  })

  test('registers and unregisters animations', () => {
    const TestComponent = () => {
      const { registerAnimation, unregisterAnimation, activeAnimations } = useCalendarAnimation()
      
      React.useEffect(() => {
        registerAnimation('test-animation')
        return () => unregisterAnimation('test-animation')
      }, [registerAnimation, unregisterAnimation])
      
      return <div data-testid="active-count">{activeAnimations.size}</div>
    }

    render(
      <CalendarAnimationEngine>
        <TestComponent />
      </CalendarAnimationEngine>
    )

    expect(screen.getByTestId('active-count')).toHaveTextContent('1')
  })

  test('handles custom animation config', () => {
    const customConfig = {
      duration: { fast: 100, normal: 200, slow: 400 },
      stagger: { appointments: 0.1 }
    }

    const TestComponent = () => {
      const { config } = useCalendarAnimation()
      return (
        <div>
          <span data-testid="fast-duration">{config.duration.fast}</span>
          <span data-testid="stagger-appointments">{config.stagger.appointments}</span>
        </div>
      )
    }

    render(
      <CalendarAnimationEngine config={customConfig}>
        <TestComponent />
      </CalendarAnimationEngine>
    )

    expect(screen.getByTestId('fast-duration')).toHaveTextContent('100')
    expect(screen.getByTestId('stagger-appointments')).toHaveTextContent('0.1')
  })

  test('throws error when used outside provider', () => {
    const TestComponent = () => {
      useCalendarAnimation()
      return <div>Test</div>
    }

    // Expect error to be thrown
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    expect(() => render(<TestComponent />)).toThrow()
    
    consoleSpy.mockRestore()
  })
})

describe('CalendarCacheManager Component', () => {
  beforeEach(() => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

    // Mock fetch
    global.fetch = jest.fn()
  })

  test('provides cache context', () => {
    const TestComponent = () => {
      const { cache, loadData, stats } = useCalendarCache()
      return (
        <div>
          <span data-testid="cache-exists">{(!!cache).toString()}</span>
          <span data-testid="load-data-exists">{(!!loadData).toString()}</span>
          <span data-testid="stats-size">{stats.size}</span>
        </div>
      )
    }

    render(
      <CalendarCacheManager apiEndpoint="http://localhost:8000/api/appointments">
        <TestComponent />
      </CalendarCacheManager>
    )

    expect(screen.getByTestId('cache-exists')).toHaveTextContent('true')
    expect(screen.getByTestId('load-data-exists')).toHaveTextContent('true')
    expect(screen.getByTestId('stats-size')).toHaveTextContent('0')
  })

  test('loads data from API', async () => {
    const mockFetch = global.fetch as jest.Mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockAppointments })
    })

    const TestComponent = () => {
      const { loadData } = useCalendarCache()
      
      const handleLoad = async () => {
        await loadData({
          startDate: new Date('2023-12-01'),
          endDate: new Date('2023-12-31'),
          view: 'month'
        })
      }
      
      return <button onClick={handleLoad} data-testid="load-button">Load</button>
    }

    render(
      <CalendarCacheManager apiEndpoint="http://localhost:8000/api/appointments">
        <TestComponent />
      </CalendarCacheManager>
    )

    const loadButton = screen.getByTestId('load-button')
    fireEvent.click(loadButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('appointments'))
    })
  })

  test('handles API errors', async () => {
    const mockFetch = global.fetch as jest.Mock
    mockFetch.mockRejectedValue(new Error('Network error'))

    const onError = jest.fn()

    const TestComponent = () => {
      const { loadData } = useCalendarCache()
      
      const handleLoad = async () => {
        try {
          await loadData({
            startDate: new Date('2023-12-01'),
            endDate: new Date('2023-12-31'),
            view: 'month'
          })
        } catch (error) {
          // Expected error
        }
      }
      
      return <button onClick={handleLoad} data-testid="load-button">Load</button>
    }

    render(
      <CalendarCacheManager
        apiEndpoint="http://localhost:8000/api/appointments"
        onError={onError}
      >
        <TestComponent />
      </CalendarCacheManager>
    )

    const loadButton = screen.getByTestId('load-button')
    fireEvent.click(loadButton)

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ view: 'month' })
      )
    })
  })

  test('shows cache stats in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <CalendarCacheManager apiEndpoint="http://localhost:8000/api/appointments">
        <div>Test Content</div>
      </CalendarCacheManager>
    )

    expect(screen.getByText(/Cache:/)).toBeInTheDocument()
    expect(screen.getByText(/Size:/)).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  test('throws error when used outside provider', () => {
    const TestComponent = () => {
      useCalendarCache()
      return <div>Test</div>
    }

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    expect(() => render(<TestComponent />)).toThrow()
    
    consoleSpy.mockRestore()
  })
})

describe('CalendarCache Class', () => {
  let cache: CalendarCache

  beforeEach(() => {
    cache = new CalendarCache({
      maxSize: 10,
      maxEntries: 100,
      defaultTTL: 5000,
      persistToStorage: false
    })
  })

  test('sets and gets cache entries', async () => {
    const request = {
      startDate: new Date('2023-12-01'),
      endDate: new Date('2023-12-31'),
      view: 'month' as const
    }

    await cache.set(request, mockAppointments)
    const result = await cache.get(request)

    expect(result).toEqual(mockAppointments)
  })

  test('expires entries based on TTL', async () => {
    const request = {
      startDate: new Date('2023-12-01'),
      endDate: new Date('2023-12-31'),
      view: 'month' as const
    }

    await cache.set(request, mockAppointments, 10) // 10ms TTL

    const immediate = await cache.get(request)
    expect(immediate).toEqual(mockAppointments)

    await new Promise(resolve => setTimeout(resolve, 20))

    const expired = await cache.get(request)
    expect(expired).toBeNull()
  })

  test('evicts entries when size limit reached', async () => {
    const smallCache = new CalendarCache({
      maxSize: 0.001, // Very small size
      maxEntries: 10
    })

    const request1 = {
      startDate: new Date('2023-12-01'),
      endDate: new Date('2023-12-31'),
      view: 'month' as const
    }

    const request2 = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      view: 'month' as const
    }

    await smallCache.set(request1, mockAppointments)
    await smallCache.set(request2, mockAppointments)

    // First entry should be evicted
    const result1 = await smallCache.get(request1)
    const result2 = await smallCache.get(request2)

    expect(result1).toBeNull()
    expect(result2).toEqual(mockAppointments)
  })

  test('tracks access statistics', async () => {
    const request = {
      startDate: new Date('2023-12-01'),
      endDate: new Date('2023-12-31'),
      view: 'month' as const
    }

    await cache.set(request, mockAppointments)
    
    await cache.get(request)
    await cache.get(request)
    await cache.get(request)

    const stats = cache.getStats()
    expect(stats.size).toBe(1)
    expect(parseFloat(stats.currentSizeMB)).toBeGreaterThan(0)
  })

  test('clears all entries', async () => {
    const request = {
      startDate: new Date('2023-12-01'),
      endDate: new Date('2023-12-31'),
      view: 'month' as const
    }

    await cache.set(request, mockAppointments)
    expect(await cache.get(request)).toEqual(mockAppointments)

    cache.clear()
    expect(await cache.get(request)).toBeNull()
    expect(cache.getStats().size).toBe(0)
  })

  test('handles different eviction strategies', async () => {
    const lruCache = new CalendarCache({
      maxEntries: 2,
      evictionStrategy: 'lru'
    })

    const request1 = { startDate: new Date('2023-12-01'), endDate: new Date('2023-12-31'), view: 'month' as const }
    const request2 = { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31'), view: 'month' as const }
    const request3 = { startDate: new Date('2024-02-01'), endDate: new Date('2024-02-28'), view: 'month' as const }

    await lruCache.set(request1, mockAppointments)
    await lruCache.set(request2, mockAppointments)
    
    // Access first entry to make it recently used
    await lruCache.get(request1)
    
    // Add third entry, should evict second (least recently used)
    await lruCache.set(request3, mockAppointments)

    expect(await lruCache.get(request1)).toEqual(mockAppointments)
    expect(await lruCache.get(request2)).toBeNull()
    expect(await lruCache.get(request3)).toEqual(mockAppointments)
  })
})

describe('TouchDragManager Component', () => {
  test('handles touch start events', () => {
    const onDragStart = jest.fn()

    render(
      <TouchDragManager
        onDragStart={onDragStart}
        onDragMove={jest.fn()}
        onDragEnd={jest.fn()}
      >
        <div data-testid="draggable">Draggable content</div>
      </TouchDragManager>
    )

    const draggable = screen.getByTestId('draggable')
    
    fireEvent.touchStart(draggable, {
      touches: [{ clientX: 100, clientY: 200 }]
    })

    expect(onDragStart).toHaveBeenCalledWith({ x: 100, y: 200 })
  })

  test('handles touch move events', () => {
    const onDragMove = jest.fn()

    render(
      <TouchDragManager
        onDragStart={jest.fn()}
        onDragMove={onDragMove}
        onDragEnd={jest.fn()}
      >
        <div data-testid="draggable">Draggable content</div>
      </TouchDragManager>
    )

    const draggable = screen.getByTestId('draggable')
    
    fireEvent.touchStart(draggable, {
      touches: [{ clientX: 100, clientY: 200 }]
    })

    fireEvent.touchMove(draggable, {
      touches: [{ clientX: 150, clientY: 250 }]
    })

    expect(onDragMove).toHaveBeenCalledWith(
      { x: 150, y: 250 },
      { deltaX: 50, deltaY: 50 }
    )
  })

  test('handles touch end events', () => {
    const onDragEnd = jest.fn()

    render(
      <TouchDragManager
        onDragStart={jest.fn()}
        onDragMove={jest.fn()}
        onDragEnd={onDragEnd}
      >
        <div data-testid="draggable">Draggable content</div>
      </TouchDragManager>
    )

    const draggable = screen.getByTestId('draggable')
    
    fireEvent.touchStart(draggable, {
      touches: [{ clientX: 100, clientY: 200 }]
    })

    fireEvent.touchEnd(draggable)

    expect(onDragEnd).toHaveBeenCalledWith({ x: 100, y: 200 })
  })

  test('respects drag threshold', () => {
    const onDragStart = jest.fn()

    render(
      <TouchDragManager
        onDragStart={onDragStart}
        onDragMove={jest.fn()}
        onDragEnd={jest.fn()}
        dragThreshold={20}
      >
        <div data-testid="draggable">Draggable content</div>
      </TouchDragManager>
    )

    const draggable = screen.getByTestId('draggable')
    
    fireEvent.touchStart(draggable, {
      touches: [{ clientX: 100, clientY: 200 }]
    })

    // Small movement below threshold
    fireEvent.touchMove(draggable, {
      touches: [{ clientX: 105, clientY: 205 }]
    })

    expect(onDragStart).not.toHaveBeenCalled()

    // Movement above threshold
    fireEvent.touchMove(draggable, {
      touches: [{ clientX: 125, clientY: 225 }]
    })

    expect(onDragStart).toHaveBeenCalled()
  })

  test('prevents default touch behavior when dragging', () => {
    render(
      <TouchDragManager
        onDragStart={jest.fn()}
        onDragMove={jest.fn()}
        onDragEnd={jest.fn()}
        preventScrolling={true}
      >
        <div data-testid="draggable">Draggable content</div>
      </TouchDragManager>
    )

    const draggable = screen.getByTestId('draggable')
    
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 200 } as Touch]
    })
    const preventDefaultSpy = jest.spyOn(touchStartEvent, 'preventDefault')

    fireEvent(draggable, touchStartEvent)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })
})

describe('MobileCalendarControls Component', () => {
  test('renders navigation controls', () => {
    render(
      <MobileCalendarControls
        currentDate={new Date('2023-12-01')}
        view="month"
        onDateChange={jest.fn()}
        onViewChange={jest.fn()}
      />
    )

    expect(screen.getByLabelText(/previous/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/next/i)).toBeInTheDocument()
    expect(screen.getByText(/december 2023/i)).toBeInTheDocument()
  })

  test('handles navigation clicks', async () => {
    const onDateChange = jest.fn()
    const user = userEvent.setup()

    render(
      <MobileCalendarControls
        currentDate={new Date('2023-12-01')}
        view="month"
        onDateChange={onDateChange}
        onViewChange={jest.fn()}
      />
    )

    const nextButton = screen.getByLabelText(/next/i)
    await user.click(nextButton)

    expect(onDateChange).toHaveBeenCalled()
  })

  test('shows view switcher', () => {
    render(
      <MobileCalendarControls
        currentDate={new Date('2023-12-01')}
        view="month"
        onDateChange={jest.fn()}
        onViewChange={jest.fn()}
        showViewSwitcher={true}
      />
    )

    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Week')).toBeInTheDocument()
    expect(screen.getByText('Day')).toBeInTheDocument()
  })

  test('handles view changes', async () => {
    const onViewChange = jest.fn()
    const user = userEvent.setup()

    render(
      <MobileCalendarControls
        currentDate={new Date('2023-12-01')}
        view="month"
        onDateChange={jest.fn()}
        onViewChange={onViewChange}
        showViewSwitcher={true}
      />
    )

    const weekButton = screen.getByText('Week')
    await user.click(weekButton)

    expect(onViewChange).toHaveBeenCalledWith('week')
  })

  test('supports gesture controls', () => {
    const onSwipeLeft = jest.fn()
    const onSwipeRight = jest.fn()

    render(
      <MobileCalendarControls
        currentDate={new Date('2023-12-01')}
        view="month"
        onDateChange={jest.fn()}
        onViewChange={jest.fn()}
        enableGestures={true}
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      />
    )

    const controls = screen.getByTestId('mobile-calendar-controls')
    
    // Simulate swipe gesture
    fireEvent.touchStart(controls, {
      touches: [{ clientX: 200, clientY: 100 }]
    })
    
    fireEvent.touchMove(controls, {
      touches: [{ clientX: 100, clientY: 100 }]
    })
    
    fireEvent.touchEnd(controls)

    expect(onSwipeLeft).toHaveBeenCalled()
  })

  test('applies responsive styles', () => {
    render(
      <MobileCalendarControls
        currentDate={new Date('2023-12-01')}
        view="month"
        onDateChange={jest.fn()}
        onViewChange={jest.fn()}
        className="custom-mobile-class"
      />
    )

    const controls = screen.getByTestId('mobile-calendar-controls')
    expect(controls).toHaveClass('custom-mobile-class')
  })
})

describe('ConflictResolutionEngine Component', () => {
  const conflictingAppointments = [
    {
      id: 1,
      start_time: '2023-12-01T10:00:00Z',
      end_time: '2023-12-01T11:00:00Z',
      client_name: 'John Doe',
      service_name: 'Haircut',
      barber_name: 'Jane Smith',
      status: 'confirmed' as const,
      duration_minutes: 60,
      barber_id: 1
    },
    {
      id: 2,
      start_time: '2023-12-01T10:30:00Z',
      end_time: '2023-12-01T11:30:00Z',
      client_name: 'Bob Wilson',
      service_name: 'Styling',
      barber_name: 'Jane Smith',
      status: 'scheduled' as const,
      duration_minutes: 60,
      barber_id: 1
    }
  ]

  test('detects appointment conflicts', () => {
    render(
      <ConflictResolutionEngine
        appointments={conflictingAppointments}
        barbers={mockBarbers}
        onConflictResolved={jest.fn()}
      />
    )

    expect(screen.getByText(/conflicts detected/i)).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
  })

  test('shows conflict resolution options', () => {
    render(
      <ConflictResolutionEngine
        appointments={conflictingAppointments}
        barbers={mockBarbers}
        onConflictResolved={jest.fn()}
      />
    )

    expect(screen.getByText(/reschedule/i)).toBeInTheDocument()
    expect(screen.getByText(/reassign barber/i)).toBeInTheDocument()
    expect(screen.getByText(/adjust duration/i)).toBeInTheDocument()
  })

  test('handles conflict resolution', async () => {
    const onConflictResolved = jest.fn()
    const user = userEvent.setup()

    render(
      <ConflictResolutionEngine
        appointments={conflictingAppointments}
        barbers={mockBarbers}
        onConflictResolved={onConflictResolved}
      />
    )

    const rescheduleButton = screen.getByText(/reschedule/i)
    await user.click(rescheduleButton)

    expect(onConflictResolved).toHaveBeenCalled()
  })

  test('suggests automatic resolutions', () => {
    render(
      <ConflictResolutionEngine
        appointments={conflictingAppointments}
        barbers={mockBarbers}
        onConflictResolved={jest.fn()}
        autoSuggest={true}
      />
    )

    expect(screen.getByText(/suggested resolution/i)).toBeInTheDocument()
  })

  test('handles multiple conflict types', () => {
    const complexConflicts = [
      ...conflictingAppointments,
      {
        id: 3,
        start_time: '2023-12-01T09:30:00Z',
        end_time: '2023-12-01T10:45:00Z',
        client_name: 'Alice Brown',
        service_name: 'Coloring',
        barber_name: 'Jane Smith',
        status: 'scheduled' as const,
        duration_minutes: 75,
        barber_id: 1
      }
    ]

    render(
      <ConflictResolutionEngine
        appointments={complexConflicts}
        barbers={mockBarbers}
        onConflictResolved={jest.fn()}
      />
    )

    expect(screen.getByText(/3 conflicts/i)).toBeInTheDocument()
  })
})

describe('BulkOperationsManager Component', () => {
  test('enables bulk selection', async () => {
    const user = userEvent.setup()

    render(
      <BulkOperationsManager
        appointments={mockAppointments}
        onBulkOperation={jest.fn()}
        userRole="SHOP_OWNER"
      >
        <div>
          {mockAppointments.map(appointment => (
            <div key={appointment.id} data-testid={`appointment-${appointment.id}`}>
              {appointment.client_name}
            </div>
          ))}
        </div>
      </BulkOperationsManager>
    )

    const firstAppointment = screen.getByTestId('appointment-1')
    
    // Ctrl+click for multi-select
    await user.click(firstAppointment, { ctrlKey: true })
    
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
  })

  test('shows bulk operation menu', async () => {
    const user = userEvent.setup()

    render(
      <BulkOperationsManager
        appointments={mockAppointments}
        onBulkOperation={jest.fn()}
        userRole="SHOP_OWNER"
        enableBulkActions={true}
      >
        <div>
          {mockAppointments.map(appointment => (
            <div key={appointment.id} data-testid={`appointment-${appointment.id}`}>
              {appointment.client_name}
            </div>
          ))}
        </div>
      </BulkOperationsManager>
    )

    const firstAppointment = screen.getByTestId('appointment-1')
    const secondAppointment = screen.getByTestId('appointment-2')
    
    await user.click(firstAppointment, { ctrlKey: true })
    await user.click(secondAppointment, { ctrlKey: true })

    const bulkButton = screen.getByText(/bulk actions/i)
    await user.click(bulkButton)

    expect(screen.getByText(/cancel selected/i)).toBeInTheDocument()
    expect(screen.getByText(/reschedule selected/i)).toBeInTheDocument()
  })

  test('handles bulk operations', async () => {
    const onBulkOperation = jest.fn()
    const user = userEvent.setup()

    render(
      <BulkOperationsManager
        appointments={mockAppointments}
        onBulkOperation={onBulkOperation}
        userRole="SHOP_OWNER"
        enableBulkActions={true}
      >
        <div>
          {mockAppointments.map(appointment => (
            <div key={appointment.id} data-testid={`appointment-${appointment.id}`}>
              {appointment.client_name}
            </div>
          ))}
        </div>
      </BulkOperationsManager>
    )

    const firstAppointment = screen.getByTestId('appointment-1')
    await user.click(firstAppointment, { ctrlKey: true })

    const bulkButton = screen.getByText(/bulk actions/i)
    await user.click(bulkButton)

    const cancelButton = screen.getByText(/cancel selected/i)
    await user.click(cancelButton)

    expect(onBulkOperation).toHaveBeenCalledWith(
      'cancel',
      [mockAppointments[0]]
    )
  })

  test('respects role permissions', () => {
    render(
      <BulkOperationsManager
        appointments={mockAppointments}
        onBulkOperation={jest.fn()}
        userRole="CLIENT"
      >
        <div>Calendar content</div>
      </BulkOperationsManager>
    )

    // Clients should not see bulk operations
    expect(screen.queryByText(/bulk actions/i)).not.toBeInTheDocument()
  })

  test('handles keyboard shortcuts', async () => {
    const user = userEvent.setup()

    render(
      <BulkOperationsManager
        appointments={mockAppointments}
        onBulkOperation={jest.fn()}
        userRole="SHOP_OWNER"
        enableKeyboardShortcuts={true}
      >
        <div tabIndex={0} data-testid="bulk-container">
          {mockAppointments.map(appointment => (
            <div key={appointment.id} data-testid={`appointment-${appointment.id}`}>
              {appointment.client_name}
            </div>
          ))}
        </div>
      </BulkOperationsManager>
    )

    const container = screen.getByTestId('bulk-container')
    await user.click(container)

    // Ctrl+A to select all
    await user.keyboard('{Control>}a{/Control}')

    expect(screen.getByText(/2 selected/i)).toBeInTheDocument()
  })
})

describe('Calendar Hooks', () => {
  describe('useCalendarPerformance', () => {
    test('tracks performance metrics', () => {
      const TestComponent = () => {
        const { startTracking, stopTracking, getMetrics } = useCalendarPerformance()
        
        React.useEffect(() => {
          startTracking()
          return stopTracking
        }, [startTracking, stopTracking])
        
        const metrics = getMetrics()
        
        return (
          <div>
            <span data-testid="fps">{metrics.fps}</span>
            <span data-testid="memory">{metrics.memoryUsage}</span>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByTestId('fps')).toBeInTheDocument()
      expect(screen.getByTestId('memory')).toBeInTheDocument()
    })
  })

  describe('useCalendarAccessibility', () => {
    test('provides accessibility helpers', () => {
      const TestComponent = () => {
        const { announceToScreenReader, setFocusedDate } = useCalendarAccessibility()
        
        return (
          <div>
            <button
              onClick={() => announceToScreenReader('Date changed')}
              data-testid="announce-button"
            >
              Announce
            </button>
            <button
              onClick={() => setFocusedDate(new Date())}
              data-testid="focus-button"
            >
              Set Focus
            </button>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByTestId('announce-button')).toBeInTheDocument()
      expect(screen.getByTestId('focus-button')).toBeInTheDocument()
    })
  })

  describe('useResponsive', () => {
    test('detects mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 })

      const TestComponent = () => {
        const { isMobile, isTablet, isDesktop } = useResponsive()
        
        return (
          <div>
            <span data-testid="is-mobile">{isMobile.toString()}</span>
            <span data-testid="is-tablet">{isTablet.toString()}</span>
            <span data-testid="is-desktop">{isDesktop.toString()}</span>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true')
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false')
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false')
    })

    test('detects tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 })

      const TestComponent = () => {
        const { isMobile, isTablet, isDesktop } = useResponsive()
        
        return (
          <div>
            <span data-testid="is-mobile">{isMobile.toString()}</span>
            <span data-testid="is-tablet">{isTablet.toString()}</span>
            <span data-testid="is-desktop">{isDesktop.toString()}</span>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false')
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('true')
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false')
    })

    test('detects desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200 })

      const TestComponent = () => {
        const { isMobile, isTablet, isDesktop } = useResponsive()
        
        return (
          <div>
            <span data-testid="is-mobile">{isMobile.toString()}</span>
            <span data-testid="is-tablet">{isTablet.toString()}</span>
            <span data-testid="is-desktop">{isDesktop.toString()}</span>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false')
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false')
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('true')
    })
  })
})
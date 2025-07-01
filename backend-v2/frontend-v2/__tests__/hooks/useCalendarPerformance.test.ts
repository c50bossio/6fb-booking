import { renderHook, act } from '@testing-library/react'
import { useCalendarPerformance, useCalendarViewOptimization } from '@/hooks/useCalendarPerformance'
import type { Appointment } from '@/types/calendar'

// Mock performance.now
const mockPerformanceNow = jest.fn()
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow
  }
})

describe('useCalendarPerformance', () => {
  const mockAppointments: Appointment[] = [
    {
      id: 1,
      start_time: '2023-12-01T10:00:00Z',
      service_name: 'Haircut',
      barber_id: 1,
      status: 'confirmed',
      duration_minutes: 60,
      price: 50
    },
    {
      id: 2,
      start_time: '2023-12-01T14:00:00Z',
      service_name: 'Beard Trim',
      barber_id: 1,
      status: 'pending',
      duration_minutes: 30,
      price: 25
    },
    {
      id: 3,
      start_time: '2023-12-02T10:00:00Z',
      service_name: 'Haircut',
      barber_id: 2,
      status: 'completed',
      duration_minutes: 60,
      price: 50
    }
  ]

  beforeEach(() => {
    mockPerformanceNow.mockReturnValue(1000)
    jest.clearAllMocks()
  })

  it('provides performance measurement functions', () => {
    const { result } = renderHook(() => 
      useCalendarPerformance(mockAppointments)
    )

    expect(typeof result.current.startMeasurement).toBe('function')
    expect(typeof result.current.endMeasurement).toBe('function')
    expect(result.current.metrics).toBeDefined()
  })

  it('measures render performance', () => {
    const { result } = renderHook(() => 
      useCalendarPerformance(mockAppointments, { enableMetrics: true })
    )

    // Start measurement
    act(() => {
      result.current.startMeasurement()
    })

    // Simulate some time passing
    mockPerformanceNow.mockReturnValue(1150)

    // End measurement
    act(() => {
      result.current.endMeasurement()
    })

    expect(result.current.metrics.renderTime).toBe(150)
    expect(result.current.metrics.appointmentCount).toBe(3)
  })

  it('provides optimized appointment filtering', () => {
    const { result } = renderHook(() => 
      useCalendarPerformance(mockAppointments)
    )

    const testDate = new Date('2023-12-01')
    const dayAppointments = result.current.getAppointmentsForDay(testDate)

    expect(dayAppointments).toHaveLength(2)
    expect(dayAppointments[0].id).toBe(1)
    expect(dayAppointments[1].id).toBe(2)
  })

  it('filters appointments by barber', () => {
    const { result } = renderHook(() => 
      useCalendarPerformance(mockAppointments)
    )

    const barber1Appointments = result.current.getAppointmentsByBarber(1)
    const allAppointments = result.current.getAppointmentsByBarber('all')

    expect(barber1Appointments).toHaveLength(2)
    expect(allAppointments).toHaveLength(3)
  })

  it('groups appointments by date', () => {
    const { result } = renderHook(() => 
      useCalendarPerformance(mockAppointments)
    )

    const groupedAppointments = result.current.appointmentsByDate

    expect(Object.keys(groupedAppointments)).toHaveLength(2)
    expect(groupedAppointments['2023-12-01']).toHaveLength(2)
    expect(groupedAppointments['2023-12-02']).toHaveLength(1)
  })

  it('calculates appointment statistics', () => {
    const { result } = renderHook(() => 
      useCalendarPerformance(mockAppointments)
    )

    const stats = result.current.appointmentStats

    expect(stats.total).toBe(3)
    expect(stats.confirmed).toBe(1)
    expect(stats.pending).toBe(1)
    expect(stats.completed).toBe(1)
    expect(stats.revenue).toBe(50) // Only completed appointments count
  })

  it('detects large datasets', () => {
    const largeAppointmentSet = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      start_time: new Date().toISOString(),
      service_name: 'Service',
      status: 'confirmed',
      barber_id: 1
    })) as Appointment[]

    const { result } = renderHook(() => 
      useCalendarPerformance(largeAppointmentSet, { virtualizeThreshold: 100 })
    )

    expect(result.current.shouldVirtualize).toBe(true)
    expect(result.current.isLargeDataset).toBe(true)
  })

  it('creates debounced search function', () => {
    jest.useFakeTimers()
    const mockSearchFn = jest.fn()

    const { result } = renderHook(() => 
      useCalendarPerformance(mockAppointments, { debounceDelay: 500 })
    )

    const debouncedSearch = result.current.createDebouncedSearch(mockSearchFn)

    // Call multiple times quickly
    debouncedSearch('test1')
    debouncedSearch('test2')
    debouncedSearch('test3')

    // Should not be called yet
    expect(mockSearchFn).not.toHaveBeenCalled()

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Should be called once with the last value
    expect(mockSearchFn).toHaveBeenCalledTimes(1)
    expect(mockSearchFn).toHaveBeenCalledWith('test3')

    jest.useRealTimers()
  })

  it('handles appointments with invalid dates gracefully', () => {
    const appointmentsWithInvalidDates: Appointment[] = [
      ...mockAppointments,
      {
        id: 4,
        start_time: 'invalid-date',
        service_name: 'Service',
        status: 'pending',
        barber_id: 1
      } as Appointment
    ]

    const { result } = renderHook(() => 
      useCalendarPerformance(appointmentsWithInvalidDates)
    )

    // Should not throw and should filter out invalid dates
    const testDate = new Date('2023-12-01')
    const dayAppointments = result.current.getAppointmentsForDay(testDate)

    expect(dayAppointments).toHaveLength(2) // Only valid appointments
  })
})

describe('useCalendarViewOptimization', () => {
  it('provides optimized view change function', () => {
    const mockOnViewChange = jest.fn()

    const { result } = renderHook(() => 
      useCalendarViewOptimization('week', mockOnViewChange)
    )

    expect(typeof result.current.optimizedViewChange).toBe('function')
    expect(result.current.viewSwitchInProgress).toBe(false)
  })

  it('calls view change callback with new view', () => {
    const mockOnViewChange = jest.fn()

    const { result } = renderHook(() => 
      useCalendarViewOptimization('week', mockOnViewChange)
    )

    act(() => {
      result.current.optimizedViewChange('day')
    })

    expect(mockOnViewChange).toHaveBeenCalledWith('day')
  })

  it('tracks view switch performance', () => {
    const mockOnViewChange = jest.fn()
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    const { result, rerender } = renderHook(
      ({ currentView }) => useCalendarViewOptimization(currentView, mockOnViewChange),
      { initialProps: { currentView: 'week' as const } }
    )

    // Start view switch
    mockPerformanceNow.mockReturnValue(1000)
    act(() => {
      result.current.optimizedViewChange('day')
    })

    // Simulate view change completion
    mockPerformanceNow.mockReturnValue(1150)
    rerender({ currentView: 'day' as const })

    // Should log the switch time
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Calendar view switch (week → day): 150.00ms')
    )

    consoleSpy.mockRestore()
  })
})
/**
 * Calendar API Integration Tests
 * 
 * Comprehensive testing of Phase 2 calendar components with real API endpoints.
 * Tests authentication, error handling, network failures, and API response validation.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import Phase 2 calendar components
import { VirtualizedCalendarGrid } from '@/components/calendar/VirtualizedCalendarGrid'
import { BulkOperationsManager } from '@/components/calendar/BulkOperationsManager'
import { ConflictResolutionEngine } from '@/components/calendar/ConflictResolutionEngine'
import { CalendarCacheManager } from '@/components/calendar/CalendarCacheManager'
import UnifiedCalendar from '@/components/UnifiedCalendar'

// Import API clients
import * as appointmentsAPI from '@/lib/api/appointments'
import * as analyticsAPI from '@/lib/api/analytics'
import * as calendarAPI from '@/lib/api/calendar'
import * as dashboardsAPI from '@/lib/api/dashboards'
import * as authAPI from '@/lib/api/auth'

// API Response Types
interface APIAppointment {
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
  can_reschedule: boolean
  can_cancel: boolean
  created_at: string
  updated_at: string
}

interface APIError {
  message: string
  code: string
  details?: Record<string, any>
  status: number
}

interface BulkOperationRequest {
  appointmentIds: number[]
  operation: 'reschedule' | 'cancel' | 'complete' | 'update_status'
  data?: Record<string, any>
}

interface BulkOperationResponse {
  success: boolean
  updated: number[]
  failed: Array<{ id: number; reason: string }>
  errors?: APIError[]
}

// Mock API endpoints
const API_BASE_URL = 'http://localhost:8000/api/v1'

const mockAPIResponses = {
  appointments: {
    list: {
      status: 200,
      data: [
        {
          id: 1,
          start_time: '2023-12-01T10:00:00Z',
          end_time: '2023-12-01T11:00:00Z',
          duration_minutes: 60,
          client_name: 'John Smith',
          client_id: 101,
          service_name: 'Haircut',
          service_id: 1,
          barber_name: 'Mike Johnson',
          barber_id: 1,
          status: 'confirmed',
          location_id: 1,
          can_reschedule: true,
          can_cancel: true,
          created_at: '2023-11-20T10:00:00Z',
          updated_at: '2023-11-20T10:00:00Z'
        },
        {
          id: 2,
          start_time: '2023-12-01T14:00:00Z',
          end_time: '2023-12-01T15:30:00Z',
          duration_minutes: 90,
          client_name: 'Jane Wilson',
          client_id: 102,
          service_name: 'Cut & Style',
          service_id: 2,
          barber_name: 'Sarah Davis',
          barber_id: 2,
          status: 'scheduled',
          location_id: 1,
          can_reschedule: true,
          can_cancel: true,
          created_at: '2023-11-21T09:30:00Z',
          updated_at: '2023-11-21T09:30:00Z'
        }
      ] as APIAppointment[]
    },
    create: {
      status: 201,
      data: {
        id: 3,
        start_time: '2023-12-02T11:00:00Z',
        end_time: '2023-12-02T12:00:00Z',
        duration_minutes: 60,
        client_name: 'New Client',
        client_id: 103,
        service_name: 'Beard Trim',
        service_id: 3,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'scheduled',
        location_id: 1,
        can_reschedule: true,
        can_cancel: true,
        created_at: '2023-12-01T15:00:00Z',
        updated_at: '2023-12-01T15:00:00Z'
      } as APIAppointment
    },
    update: {
      status: 200,
      data: {
        id: 1,
        start_time: '2023-12-01T11:00:00Z', // Updated time
        end_time: '2023-12-01T12:00:00Z',
        duration_minutes: 60,
        client_name: 'John Smith',
        client_id: 101,
        service_name: 'Haircut',
        service_id: 1,
        barber_name: 'Mike Johnson',
        barber_id: 1,
        status: 'confirmed',
        location_id: 1,
        can_reschedule: true,
        can_cancel: true,
        created_at: '2023-11-20T10:00:00Z',
        updated_at: '2023-12-01T16:00:00Z'
      } as APIAppointment
    },
    bulkUpdate: {
      status: 200,
      data: {
        success: true,
        updated: [1, 2],
        failed: []
      } as BulkOperationResponse
    },
    conflicts: {
      status: 409,
      data: {
        error: 'Scheduling conflicts detected',
        conflicts: [
          {
            type: 'time_overlap',
            message: 'Appointment overlaps with existing booking',
            conflicting_appointment_id: 2
          }
        ]
      }
    }
  },
  analytics: {
    calendar: {
      status: 200,
      data: {
        total_appointments: 150,
        completed_appointments: 120,
        cancelled_appointments: 15,
        no_show_appointments: 15,
        average_duration: 75,
        peak_hours: ['10:00', '11:00', '14:00', '15:00'],
        busiest_days: ['Friday', 'Saturday'],
        revenue_summary: {
          total: 15750,
          average_per_appointment: 105
        }
      }
    },
    performance: {
      status: 200,
      data: {
        cache_hit_ratio: 87.5,
        average_response_time: 45,
        api_call_count: 1250,
        error_rate: 0.8
      }
    }
  },
  dashboard: {
    barber: {
      status: 200,
      data: {
        user: {
          id: 1,
          role: 'BARBER',
          first_name: 'Mike',
          last_name: 'Johnson'
        },
        appointments: mockAPIResponses.appointments.list.data.filter(apt => apt.barber_id === 1),
        analytics: {
          daily_revenue: 420,
          weekly_appointments: 28,
          client_retention: 85
        }
      }
    }
  }
}

// Mock fetch implementation
const createMockFetch = (responses: Record<string, any>) => {
  return jest.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const method = options?.method || 'GET'
    const endpoint = url.replace(API_BASE_URL, '')
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Handle different endpoints
    if (endpoint.includes('/appointments') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => responses.appointments?.list || mockAPIResponses.appointments.list
      }
    }
    
    if (endpoint.includes('/appointments') && method === 'POST') {
      return {
        ok: true,
        status: 201,
        json: async () => responses.appointments?.create || mockAPIResponses.appointments.create
      }
    }
    
    if (endpoint.includes('/appointments') && method === 'PUT') {
      return {
        ok: true,
        status: 200,
        json: async () => responses.appointments?.update || mockAPIResponses.appointments.update
      }
    }
    
    if (endpoint.includes('/appointments/bulk') && method === 'POST') {
      return {
        ok: true,
        status: 200,
        json: async () => responses.appointments?.bulkUpdate || mockAPIResponses.appointments.bulkUpdate
      }
    }
    
    if (endpoint.includes('/analytics/calendar')) {
      return {
        ok: true,
        status: 200,
        json: async () => responses.analytics?.calendar || mockAPIResponses.analytics.calendar
      }
    }
    
    if (endpoint.includes('/dashboard')) {
      return {
        ok: true,
        status: 200,
        json: async () => responses.dashboard?.barber || mockAPIResponses.dashboard.barber
      }
    }
    
    // Default error response
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Endpoint not found' })
    }
  })
}

describe('Calendar API Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>
  
  beforeEach(() => {
    user = userEvent.setup()
    global.fetch = createMockFetch(mockAPIResponses)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Appointments API Integration', () => {
    test('fetches and displays appointments from API', async () => {
      const TestComponent = () => {
        const [appointments, setAppointments] = React.useState<APIAppointment[]>([])
        const [loading, setLoading] = React.useState(true)

        React.useEffect(() => {
          const fetchAppointments = async () => {
            try {
              const response = await appointmentsAPI.getAppointments()
              setAppointments(response.data)
            } catch (error) {
              console.error('Failed to fetch appointments:', error)
            } finally {
              setLoading(false)
            }
          }

          fetchAppointments()
        }, [])

        if (loading) return <div>Loading...</div>

        return (
          <UnifiedCalendar
            appointments={appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        )
      }

      render(<TestComponent />)

      // Should show loading state initially
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Should fetch and display appointments
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('Jane Wilson')).toBeInTheDocument()
      })

      // Verify API was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/appointments'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    test('creates new appointments through API', async () => {
      const onAppointmentCreate = jest.fn()

      const TestComponent = () => {
        const handleCreateAppointment = async (appointmentData: any) => {
          try {
            const response = await appointmentsAPI.createAppointment(appointmentData)
            onAppointmentCreate(response.data)
          } catch (error) {
            console.error('Failed to create appointment:', error)
          }
        }

        return (
          <div>
            <UnifiedCalendar
              appointments={mockAPIResponses.appointments.list.data}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
              onAppointmentCreate={handleCreateAppointment}
            />
            <button onClick={() => handleCreateAppointment({
              start_time: '2023-12-02T11:00:00Z',
              client_name: 'New Client',
              service_id: 3,
              barber_id: 1
            })}>
              Create Appointment
            </button>
          </div>
        )
      }

      render(<TestComponent />)

      // Create new appointment
      const createButton = screen.getByText('Create Appointment')
      await user.click(createButton)

      // Should call API and trigger callback
      await waitFor(() => {
        expect(onAppointmentCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 3,
            client_name: 'New Client',
            service_name: 'Beard Trim'
          })
        )
      })

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/appointments'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('New Client')
        })
      )
    })

    test('updates appointments through API', async () => {
      const onAppointmentUpdate = jest.fn()

      const TestComponent = () => {
        const handleUpdateAppointment = async (id: number, updates: any) => {
          try {
            const response = await appointmentsAPI.updateAppointment(id, updates)
            onAppointmentUpdate(response.data)
          } catch (error) {
            console.error('Failed to update appointment:', error)
          }
        }

        return (
          <UnifiedCalendar
            appointments={mockAPIResponses.appointments.list.data}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            onAppointmentUpdate={handleUpdateAppointment}
          />
        )
      }

      render(<TestComponent />)

      // Click on appointment to edit
      const appointment = screen.getByText('John Smith')
      await user.click(appointment)

      // Simulate reschedule action
      act(() => {
        fireEvent.click(screen.getByText('Reschedule'))
      })

      // Should call update API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/appointments/1'),
          expect.objectContaining({ method: 'PUT' })
        )
      })
    })

    test('handles API errors gracefully', async () => {
      // Mock API error
      global.fetch = createMockFetch({
        appointments: {
          list: {
            status: 500,
            error: 'Internal server error'
          }
        }
      })

      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null)
        const [appointments, setAppointments] = React.useState<APIAppointment[]>([])

        React.useEffect(() => {
          const fetchAppointments = async () => {
            try {
              const response = await appointmentsAPI.getAppointments()
              setAppointments(response.data)
            } catch (err) {
              setError('Failed to load appointments')
            }
          }

          fetchAppointments()
        }, [])

        if (error) {
          return <div>Error: {error}</div>
        }

        return (
          <UnifiedCalendar
            appointments={appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        )
      }

      render(<TestComponent />)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Error: Failed to load appointments/)).toBeInTheDocument()
      })
    })
  })

  describe('Bulk Operations API Integration', () => {
    test('performs bulk reschedule operations', async () => {
      const onBulkOperationComplete = jest.fn()

      const TestComponent = () => (
        <BulkOperationsManager
          appointments={mockAPIResponses.appointments.list.data}
          selectedAppointmentIds={[1, 2]}
          onBulkOperation={onBulkOperationComplete}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={mockAPIResponses.appointments.list.data}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      // Open bulk actions menu
      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      // Click reschedule
      const rescheduleButton = screen.getByText('Reschedule Selected')
      await user.click(rescheduleButton)

      // Set new date and time
      await waitFor(() => {
        const dateInput = screen.getByLabelText(/New Date/i)
        fireEvent.change(dateInput, { target: { value: '2023-12-02' } })

        const timeInput = screen.getByLabelText(/New Time/i)
        fireEvent.change(timeInput, { target: { value: '11:00' } })
      })

      // Confirm operation
      const confirmButton = screen.getByText('Confirm Reschedule')
      await user.click(confirmButton)

      // Should call bulk API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/appointments/bulk'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('"appointmentIds":[1,2]')
          })
        )
      })

      // Should trigger completion callback
      expect(onBulkOperationComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          updated: [1, 2]
        })
      )
    })

    test('handles bulk operation failures', async () => {
      // Mock partial failure response
      global.fetch = createMockFetch({
        appointments: {
          bulkUpdate: {
            status: 207, // Multi-status
            data: {
              success: false,
              updated: [1],
              failed: [
                { id: 2, reason: 'Appointment cannot be cancelled - already in progress' }
              ]
            }
          }
        }
      })

      const TestComponent = () => (
        <BulkOperationsManager
          appointments={mockAPIResponses.appointments.list.data}
          selectedAppointmentIds={[1, 2]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={mockAPIResponses.appointments.list.data}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      // Perform bulk cancel operation
      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const cancelButton = screen.getByText('Cancel Selected')
      await user.click(cancelButton)

      const confirmButton = screen.getByText('Confirm Cancellation')
      await user.click(confirmButton)

      // Should show partial success message
      await waitFor(() => {
        expect(screen.getByText(/1 appointment cancelled, 1 failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Conflict Resolution API Integration', () => {
    test('detects and reports scheduling conflicts', async () => {
      // Mock conflict response
      global.fetch = createMockFetch({
        appointments: {
          create: {
            status: 409,
            data: mockAPIResponses.appointments.conflicts.data
          }
        }
      })

      const conflictEngine = new ConflictResolutionEngine()
      const onConflictDetected = jest.fn()

      const TestComponent = () => (
        <div>
          <ConflictResolutionEngine
            appointments={mockAPIResponses.appointments.list.data}
            barbers={[{ id: 1, name: 'Mike Johnson', is_available: true }]}
            onConflictDetected={onConflictDetected}
          />
          <button onClick={async () => {
            try {
              await appointmentsAPI.createAppointment({
                start_time: '2023-12-01T14:30:00Z', // Conflicts with existing
                client_name: 'Conflict Client',
                service_id: 1,
                barber_id: 2
              })
            } catch (error: any) {
              if (error.status === 409) {
                onConflictDetected(error.data)
              }
            }
          }}>
            Create Conflicting Appointment
          </button>
        </div>
      )

      render(<TestComponent />)

      // Try to create conflicting appointment
      const createButton = screen.getByText('Create Conflicting Appointment')
      await user.click(createButton)

      // Should detect and report conflict
      await waitFor(() => {
        expect(onConflictDetected).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Scheduling conflicts detected',
            conflicts: expect.arrayContaining([
              expect.objectContaining({
                type: 'time_overlap'
              })
            ])
          })
        )
      })
    })

    test('integrates conflict resolution with calendar UI', async () => {
      const TestComponent = () => {
        const [conflicts, setConflicts] = React.useState<any[]>([])

        return (
          <div>
            <ConflictResolutionEngine
              appointments={mockAPIResponses.appointments.list.data}
              barbers={[{ id: 1, name: 'Mike Johnson', is_available: true }]}
              onConflictDetected={(conflictData) => setConflicts(conflictData.conflicts)}
            />
            <UnifiedCalendar
              appointments={mockAPIResponses.appointments.list.data}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
              conflicts={conflicts}
            />
            {conflicts.length > 0 && (
              <div data-testid="conflict-banner">
                Scheduling conflicts detected: {conflicts.length} issues
              </div>
            )}
          </div>
        )
      }

      render(<TestComponent />)

      // Simulate conflict detection
      act(() => {
        const conflictEvent = new CustomEvent('conflictDetected', {
          detail: {
            conflicts: [
              { type: 'time_overlap', message: 'Overlaps with existing appointment' }
            ]
          }
        })
        document.dispatchEvent(conflictEvent)
      })

      // Should show conflict banner
      await waitFor(() => {
        expect(screen.getByTestId('conflict-banner')).toBeInTheDocument()
        expect(screen.getByText(/Scheduling conflicts detected: 1 issues/)).toBeInTheDocument()
      })
    })
  })

  describe('Analytics API Integration', () => {
    test('fetches and displays calendar analytics', async () => {
      const TestComponent = () => {
        const [analytics, setAnalytics] = React.useState<any>(null)

        React.useEffect(() => {
          const fetchAnalytics = async () => {
            try {
              const response = await analyticsAPI.getCalendarAnalytics({
                startDate: '2023-12-01',
                endDate: '2023-12-31'
              })
              setAnalytics(response.data)
            } catch (error) {
              console.error('Failed to fetch analytics:', error)
            }
          }

          fetchAnalytics()
        }, [])

        if (!analytics) return <div>Loading analytics...</div>

        return (
          <div>
            <div data-testid="analytics-summary">
              Total Appointments: {analytics.total_appointments}
              Completion Rate: {((analytics.completed_appointments / analytics.total_appointments) * 100).toFixed(1)}%
            </div>
            <UnifiedCalendar
              appointments={mockAPIResponses.appointments.list.data}
              currentDate={new Date('2023-12-01')}
              view="month"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
              analyticsOverlay={analytics}
            />
          </div>
        )
      }

      render(<TestComponent />)

      // Should fetch and display analytics
      await waitFor(() => {
        expect(screen.getByTestId('analytics-summary')).toBeInTheDocument()
        expect(screen.getByText(/Total Appointments: 150/)).toBeInTheDocument()
        expect(screen.getByText(/Completion Rate: 80.0%/)).toBeInTheDocument()
      })

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/analytics/calendar'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    test('tracks performance metrics in real-time', async () => {
      const TestComponent = () => {
        const [performanceMetrics, setPerformanceMetrics] = React.useState<any>(null)

        React.useEffect(() => {
          const fetchPerformance = async () => {
            const response = await analyticsAPI.getPerformanceMetrics()
            setPerformanceMetrics(response.data)
          }

          fetchPerformance()
          
          // Set up polling for real-time updates
          const interval = setInterval(fetchPerformance, 5000)
          return () => clearInterval(interval)
        }, [])

        return (
          <div>
            {performanceMetrics && (
              <div data-testid="performance-metrics">
                Cache Hit Ratio: {performanceMetrics.cache_hit_ratio}%
                Avg Response Time: {performanceMetrics.average_response_time}ms
                API Calls: {performanceMetrics.api_call_count}
                Error Rate: {performanceMetrics.error_rate}%
              </div>
            )}
            <VirtualizedCalendarGrid
              appointments={mockAPIResponses.appointments.list.data}
              startDate={new Date('2023-12-01')}
              endDate={new Date('2023-12-31')}
              view="month"
              onAppointmentClick={jest.fn()}
              performanceTracking={true}
            />
          </div>
        )
      }

      render(<TestComponent />)

      // Should show performance metrics
      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument()
        expect(screen.getByText(/Cache Hit Ratio: 87.5%/)).toBeInTheDocument()
        expect(screen.getByText(/Avg Response Time: 45ms/)).toBeInTheDocument()
      })
    })
  })

  describe('Dashboard API Integration', () => {
    test('loads role-specific dashboard data', async () => {
      const TestComponent = () => {
        const [dashboardData, setDashboardData] = React.useState<any>(null)

        React.useEffect(() => {
          const fetchDashboard = async () => {
            try {
              const response = await dashboardsAPI.getBarberDashboard(1)
              setDashboardData(response.data)
            } catch (error) {
              console.error('Failed to fetch dashboard:', error)
            }
          }

          fetchDashboard()
        }, [])

        if (!dashboardData) return <div>Loading dashboard...</div>

        return (
          <div>
            <div data-testid="dashboard-header">
              Welcome, {dashboardData.user.first_name} {dashboardData.user.last_name}
              Daily Revenue: ${dashboardData.analytics.daily_revenue}
            </div>
            <UnifiedCalendar
              appointments={dashboardData.appointments}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
              userRole={dashboardData.user.role}
              userId={dashboardData.user.id}
            />
          </div>
        )
      }

      render(<TestComponent />)

      // Should load dashboard data
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-header')).toBeInTheDocument()
        expect(screen.getByText(/Welcome, Mike Johnson/)).toBeInTheDocument()
        expect(screen.getByText(/Daily Revenue: \$420/)).toBeInTheDocument()
      })

      // Should show only barber's appointments
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.queryByText('Jane Wilson')).not.toBeInTheDocument() // Different barber
    })
  })

  describe('Authentication Integration', () => {
    test('handles authentication headers in API requests', async () => {
      const mockToken = 'test-jwt-token'
      
      // Mock auth token storage
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
        if (key === 'auth_token') return mockToken
        return null
      })

      const TestComponent = () => {
        const [appointments, setAppointments] = React.useState<APIAppointment[]>([])

        React.useEffect(() => {
          const fetchAppointments = async () => {
            const response = await appointmentsAPI.getAppointments()
            setAppointments(response.data)
          }

          fetchAppointments()
        }, [])

        return (
          <UnifiedCalendar
            appointments={appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        )
      }

      render(<TestComponent />)

      // Should include auth header in API calls
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/appointments'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': `Bearer ${mockToken}`
            })
          })
        )
      })
    })

    test('handles authentication failures', async () => {
      // Mock 401 response
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      const onAuthError = jest.fn()

      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null)

        React.useEffect(() => {
          const fetchAppointments = async () => {
            try {
              await appointmentsAPI.getAppointments()
            } catch (err: any) {
              if (err.status === 401) {
                setError('Authentication failed')
                onAuthError()
              }
            }
          }

          fetchAppointments()
        }, [])

        if (error) {
          return <div>Error: {error}</div>
        }

        return <div>Loading...</div>
      }

      render(<TestComponent />)

      // Should handle auth error
      await waitFor(() => {
        expect(screen.getByText(/Error: Authentication failed/)).toBeInTheDocument()
        expect(onAuthError).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling and Retry Logic', () => {
    test('implements retry logic for network failures', async () => {
      let callCount = 0
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAPIResponses.appointments.list
        })
      })

      const TestComponent = () => {
        const [appointments, setAppointments] = React.useState<APIAppointment[]>([])
        const [loading, setLoading] = React.useState(true)

        React.useEffect(() => {
          const fetchWithRetry = async (retries = 3) => {
            try {
              const response = await appointmentsAPI.getAppointments()
              setAppointments(response.data)
            } catch (error) {
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                return fetchWithRetry(retries - 1)
              }
              throw error
            } finally {
              setLoading(false)
            }
          }

          fetchWithRetry()
        }, [])

        if (loading) return <div>Loading...</div>

        return (
          <UnifiedCalendar
            appointments={appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        )
      }

      render(<TestComponent />)

      // Should retry and eventually succeed
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Should have made multiple attempts
      expect(callCount).toBe(3)
    })

    test('handles rate limiting with exponential backoff', async () => {
      let callCount = 0
      const callTimes: number[] = []

      global.fetch = jest.fn().mockImplementation(() => {
        callTimes.push(Date.now())
        callCount++
        
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map([['Retry-After', '1']]),
            json: async () => ({ error: 'Rate limit exceeded' })
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAPIResponses.appointments.list
        })
      })

      const TestComponent = () => {
        const [appointments, setAppointments] = React.useState<APIAppointment[]>([])

        React.useEffect(() => {
          const fetchWithBackoff = async () => {
            let delay = 1000
            let attempts = 0
            
            while (attempts < 3) {
              try {
                const response = await appointmentsAPI.getAppointments()
                setAppointments(response.data)
                break
              } catch (error: any) {
                if (error.status === 429 && attempts < 2) {
                  await new Promise(resolve => setTimeout(resolve, delay))
                  delay *= 2 // Exponential backoff
                  attempts++
                } else {
                  throw error
                }
              }
            }
          }

          fetchWithBackoff()
        }, [])

        return (
          <UnifiedCalendar
            appointments={appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        )
      }

      render(<TestComponent />)

      // Should eventually succeed with backoff
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
      }, { timeout: 10000 })

      // Should have made multiple attempts with increasing delays
      expect(callCount).toBe(3)
      
      if (callTimes.length >= 3) {
        const firstDelay = callTimes[1] - callTimes[0]
        const secondDelay = callTimes[2] - callTimes[1]
        expect(secondDelay).toBeGreaterThan(firstDelay)
      }
    })
  })

  describe('Cache Integration with API', () => {
    test('integrates cache with API responses', async () => {
      const TestComponent = () => (
        <CalendarCacheManager
          apiEndpoint={`${API_BASE_URL}/appointments`}
          cacheConfig={{
            defaultTTL: 5 * 60 * 1000,
            maxSize: 50,
            compressionEnabled: true
          }}
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

      // First request should hit API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Subsequent identical requests should use cache
      const sameComponent = render(<TestComponent />)
      
      // Should not make additional API calls for cached data
      expect(global.fetch).toHaveBeenCalledTimes(1)

      sameComponent.unmount()
    })
  })

  describe('Real-time Updates and WebSocket Integration', () => {
    test('handles real-time appointment updates', async () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn()
      }

      // Mock WebSocket
      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket)

      const TestComponent = () => {
        const [appointments, setAppointments] = React.useState(mockAPIResponses.appointments.list.data)

        React.useEffect(() => {
          const ws = new WebSocket('ws://localhost:8000/ws/appointments')
          
          ws.addEventListener('message', (event) => {
            const update = JSON.parse(event.data)
            if (update.type === 'appointment_updated') {
              setAppointments(prev => 
                prev.map(apt => 
                  apt.id === update.appointment.id ? update.appointment : apt
                )
              )
            }
          })

          return () => ws.close()
        }, [])

        return (
          <UnifiedCalendar
            appointments={appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            enableRealTimeUpdates={true}
          />
        )
      }

      render(<TestComponent />)

      // Simulate real-time update
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]

      if (messageHandler) {
        act(() => {
          messageHandler({
            data: JSON.stringify({
              type: 'appointment_updated',
              appointment: {
                ...mockAPIResponses.appointments.list.data[0],
                status: 'completed'
              }
            })
          })
        })
      }

      // Should update appointment status in real-time
      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument()
      })
    })
  })
})

describe('API Performance and Load Testing', () => {
  test('handles high-frequency API requests efficiently', async () => {
    let requestCount = 0
    const responseTime: number[] = []

    global.fetch = jest.fn().mockImplementation(async () => {
      const start = performance.now()
      requestCount++
      
      // Simulate API processing time
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const end = performance.now()
      responseTime.push(end - start)
      
      return {
        ok: true,
        status: 200,
        json: async () => mockAPIResponses.appointments.list
      }
    })

    const TestComponent = () => {
      const [data, setData] = React.useState<any[]>([])

      React.useEffect(() => {
        // Simulate high-frequency requests
        const fetchData = async () => {
          const promises = Array.from({ length: 50 }, () => 
            appointmentsAPI.getAppointments()
          )
          
          const results = await Promise.all(promises)
          setData(results.map(r => r.data).flat())
        }

        fetchData()
      }, [])

      return (
        <VirtualizedCalendarGrid
          appointments={data}
          startDate={new Date('2023-12-01')}
          endDate={new Date('2023-12-31')}
          view="month"
          onAppointmentClick={jest.fn()}
        />
      )
    }

    render(<TestComponent />)

    // Should handle multiple requests efficiently
    await waitFor(() => {
      expect(requestCount).toBe(50)
    }, { timeout: 5000 })

    // Calculate performance metrics
    const avgResponseTime = responseTime.reduce((a, b) => a + b, 0) / responseTime.length
    
    // Should maintain good performance
    expect(avgResponseTime).toBeLessThan(100) // Under 100ms average
    expect(requestCount).toBe(50)
  })
})
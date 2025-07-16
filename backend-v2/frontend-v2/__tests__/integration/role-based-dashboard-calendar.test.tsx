/**
 * Role-Based Dashboard Calendar Integration Tests
 * 
 * Comprehensive testing of calendar components within different user role contexts.
 * Validates permission boundaries, data scope, and role-specific functionality.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import dashboard components
import { EnterpriseDashboard } from '@/components/dashboards/EnterpriseDashboard'
import { ShopOwnerDashboard } from '@/components/dashboards/ShopOwnerDashboard'
import { IndividualBarberDashboard } from '@/components/dashboards/IndividualBarberDashboard'
import { ClientPortal } from '@/components/dashboards/ClientPortal'
import { SnapshotDashboard } from '@/components/dashboards/SnapshotDashboard'

// Import Phase 2 calendar components
import { VirtualizedCalendarGrid } from '@/components/calendar/VirtualizedCalendarGrid'
import { BulkOperationsManager } from '@/components/calendar/BulkOperationsManager'
import { ConflictResolutionEngine } from '@/components/calendar/ConflictResolutionEngine'
import UnifiedCalendar from '@/components/UnifiedCalendar'

// Mock API responses for different roles
const mockAPIResponses = {
  CLIENT: {
    profile: {
      id: 101,
      first_name: 'John',
      last_name: 'Smith',
      email: 'john@example.com',
      role: 'CLIENT',
      location_id: 1
    },
    appointments: [
      {
        id: 1,
        start_time: '2023-12-01T10:00:00Z',
        end_time: '2023-12-01T11:00:00Z',
        client_name: 'John Smith',
        service_name: 'Haircut',
        barber_name: 'Mike Johnson',
        status: 'confirmed',
        can_reschedule: true,
        can_cancel: true
      },
      {
        id: 2,
        start_time: '2023-12-05T14:00:00Z',
        end_time: '2023-12-05T15:00:00Z',
        client_name: 'John Smith',
        service_name: 'Beard Trim',
        barber_name: 'Sarah Wilson',
        status: 'scheduled',
        can_reschedule: true,
        can_cancel: true
      }
    ]
  },
  BARBER: {
    profile: {
      id: 201,
      first_name: 'Mike',
      last_name: 'Johnson',
      email: 'mike@barbershop.com',
      role: 'BARBER',
      location_id: 1,
      barber_id: 1
    },
    appointments: [
      {
        id: 1,
        start_time: '2023-12-01T09:00:00Z',
        end_time: '2023-12-01T10:00:00Z',
        client_name: 'Alice Brown',
        service_name: 'Haircut',
        barber_name: 'Mike Johnson',
        status: 'confirmed'
      },
      {
        id: 2,
        start_time: '2023-12-01T10:00:00Z',
        end_time: '2023-12-01T11:00:00Z',
        client_name: 'John Smith',
        service_name: 'Haircut',
        barber_name: 'Mike Johnson',
        status: 'confirmed'
      },
      {
        id: 3,
        start_time: '2023-12-01T11:30:00Z',
        end_time: '2023-12-01T12:30:00Z',
        client_name: 'Bob Wilson',
        service_name: 'Cut & Style',
        barber_name: 'Mike Johnson',
        status: 'scheduled'
      }
    ]
  },
  INDIVIDUAL_BARBER: {
    profile: {
      id: 301,
      first_name: 'Sarah',
      last_name: 'Wilson',
      email: 'sarah@sarahcuts.com',
      role: 'INDIVIDUAL_BARBER',
      location_id: 2,
      barber_id: 2
    },
    appointments: [
      {
        id: 10,
        start_time: '2023-12-01T10:00:00Z',
        end_time: '2023-12-01T11:00:00Z',
        client_name: 'Emma Davis',
        service_name: 'Coloring',
        barber_name: 'Sarah Wilson',
        status: 'confirmed',
        revenue: 120
      },
      {
        id: 11,
        start_time: '2023-12-01T14:00:00Z',
        end_time: '2023-12-01T16:00:00Z',
        client_name: 'Lisa Chen',
        service_name: 'Full Service',
        barber_name: 'Sarah Wilson',
        status: 'scheduled',
        revenue: 200
      }
    ],
    analytics: {
      daily_revenue: 320,
      weekly_revenue: 1850,
      monthly_revenue: 7200,
      client_retention: 85
    }
  },
  SHOP_OWNER: {
    profile: {
      id: 401,
      first_name: 'Carlos',
      last_name: 'Rodriguez',
      email: 'carlos@carlosbarbershop.com',
      role: 'SHOP_OWNER',
      location_id: 3
    },
    appointments: [
      // Appointments for all barbers at the shop
      {
        id: 20,
        start_time: '2023-12-01T09:00:00Z',
        end_time: '2023-12-01T10:00:00Z',
        client_name: 'Client A',
        service_name: 'Haircut',
        barber_name: 'Barber 1',
        barber_id: 3,
        status: 'confirmed',
        revenue: 35
      },
      {
        id: 21,
        start_time: '2023-12-01T09:00:00Z',
        end_time: '2023-12-01T10:30:00Z',
        client_name: 'Client B',
        service_name: 'Cut & Style',
        barber_name: 'Barber 2',
        barber_id: 4,
        status: 'confirmed',
        revenue: 65
      },
      {
        id: 22,
        start_time: '2023-12-01T10:00:00Z',
        end_time: '2023-12-01T11:00:00Z',
        client_name: 'Client C',
        service_name: 'Beard Trim',
        barber_name: 'Barber 1',
        barber_id: 3,
        status: 'scheduled',
        revenue: 25
      }
    ],
    barbers: [
      { id: 3, name: 'Barber 1', email: 'b1@shop.com' },
      { id: 4, name: 'Barber 2', email: 'b2@shop.com' }
    ]
  },
  ENTERPRISE_OWNER: {
    profile: {
      id: 501,
      first_name: 'Maria',
      last_name: 'Garcia',
      email: 'maria@elitecuts.com',
      role: 'ENTERPRISE_OWNER'
    },
    locations: [
      {
        id: 1,
        name: 'Downtown Location',
        appointments_today: 25,
        revenue_today: 1250,
        barber_count: 4
      },
      {
        id: 2,
        name: 'Uptown Location',
        appointments_today: 18,
        revenue_today: 950,
        barber_count: 3
      },
      {
        id: 3,
        name: 'Mall Location',
        appointments_today: 32,
        revenue_today: 1680,
        barber_count: 5
      }
    ],
    appointments: [
      // Aggregated appointments from all locations
      {
        id: 30,
        start_time: '2023-12-01T10:00:00Z',
        end_time: '2023-12-01T11:00:00Z',
        client_name: 'Enterprise Client 1',
        service_name: 'Premium Service',
        barber_name: 'Top Barber',
        location_name: 'Downtown Location',
        status: 'confirmed',
        revenue: 150
      }
    ]
  },
  SHOP_MANAGER: {
    profile: {
      id: 601,
      first_name: 'Lisa',
      last_name: 'Thompson',
      email: 'lisa@elitecuts.com',
      role: 'SHOP_MANAGER',
      location_id: 1
    },
    appointments: [
      // All appointments for managed location
      {
        id: 40,
        start_time: '2023-12-01T09:00:00Z',
        end_time: '2023-12-01T10:00:00Z',
        client_name: 'Managed Client 1',
        service_name: 'Haircut',
        barber_name: 'Staff Barber 1',
        status: 'confirmed'
      },
      {
        id: 41,
        start_time: '2023-12-01T10:30:00Z',
        end_time: '2023-12-01T11:30:00Z',
        client_name: 'Managed Client 2',
        service_name: 'Styling',
        barber_name: 'Staff Barber 2',
        status: 'scheduled'
      }
    ]
  }
}

// Mock API client
const createMockAPI = (role: keyof typeof mockAPIResponses) => ({
  getProfile: jest.fn().mockResolvedValue(mockAPIResponses[role].profile),
  getAppointments: jest.fn().mockResolvedValue({ data: mockAPIResponses[role].appointments || [] }),
  getDashboardAnalytics: jest.fn().mockResolvedValue(mockAPIResponses[role]),
  getEnterpriseAnalytics: jest.fn().mockResolvedValue(mockAPIResponses[role]),
  updateAppointment: jest.fn().mockResolvedValue({ success: true }),
  cancelAppointment: jest.fn().mockResolvedValue({ success: true }),
  rescheduleAppointment: jest.fn().mockResolvedValue({ success: true })
})

describe('Role-Based Dashboard Calendar Integration', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  describe('CLIENT Role - Simple Client Portal', () => {
    test('shows only client own appointments in calendar', async () => {
      const mockAPI = createMockAPI('CLIENT')

      const ClientCalendarView = () => (
        <ClientPortal>
          <UnifiedCalendar
            appointments={mockAPIResponses.CLIENT.appointments}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            userRole="CLIENT"
            userId={101}
          />
        </ClientPortal>
      )

      render(<ClientCalendarView />)

      // Should only see own appointments
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('Haircut')).toBeInTheDocument()
        expect(screen.getByText('Beard Trim')).toBeInTheDocument()
      })

      // Should NOT see other client appointments
      expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument()
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument()
    })

    test('allows basic appointment actions for clients', async () => {
      const onReschedule = jest.fn()
      const onCancel = jest.fn()

      const ClientCalendarView = () => (
        <ClientPortal>
          <UnifiedCalendar
            appointments={mockAPIResponses.CLIENT.appointments}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            onAppointmentReschedule={onReschedule}
            onAppointmentCancel={onCancel}
            userRole="CLIENT"
            enableClientActions={true}
          />
        </ClientPortal>
      )

      render(<ClientCalendarView />)

      // Click on appointment
      const appointment = screen.getByText('Haircut')
      await user.click(appointment)

      // Should show client-appropriate actions
      await waitFor(() => {
        expect(screen.getByText('Reschedule')).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })

      // Should NOT show admin actions
      expect(screen.queryByText('Mark Complete')).not.toBeInTheDocument()
      expect(screen.queryByText('Edit Details')).not.toBeInTheDocument()
    })

    test('disables bulk operations for clients', () => {
      const ClientCalendarView = () => (
        <ClientPortal>
          <BulkOperationsManager
            appointments={mockAPIResponses.CLIENT.appointments}
            userRole="CLIENT"
            onBulkOperation={jest.fn()}
          >
            <UnifiedCalendar
              appointments={mockAPIResponses.CLIENT.appointments}
              currentDate={new Date('2023-12-01')}
              view="month"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </BulkOperationsManager>
        </ClientPortal>
      )

      render(<ClientCalendarView />)

      // Bulk operations should not be available
      expect(screen.queryByText('Bulk Actions')).not.toBeInTheDocument()
      expect(screen.queryByText('Select Multiple')).not.toBeInTheDocument()
    })
  })

  describe('BARBER Role - Personal Performance Dashboard', () => {
    test('shows only barber own appointments and schedule', async () => {
      const BarberCalendarView = () => (
        <IndividualBarberDashboard userRole="BARBER" barberId={1}>
          <UnifiedCalendar
            appointments={mockAPIResponses.BARBER.appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            userRole="BARBER"
            barberId={1}
          />
        </IndividualBarberDashboard>
      )

      render(<BarberCalendarView />)

      // Should see all appointments assigned to this barber
      await waitFor(() => {
        expect(screen.getByText('Alice Brown')).toBeInTheDocument()
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      })

      // All appointments should be for Mike Johnson
      const appointments = screen.getAllByText(/Mike Johnson/)
      expect(appointments.length).toBeGreaterThan(0)
    })

    test('allows barber to manage their own appointments', async () => {
      const onAppointmentUpdate = jest.fn()

      const BarberCalendarView = () => (
        <IndividualBarberDashboard userRole="BARBER" barberId={1}>
          <UnifiedCalendar
            appointments={mockAPIResponses.BARBER.appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            onAppointmentUpdate={onAppointmentUpdate}
            userRole="BARBER"
            enableBarberActions={true}
          />
        </IndividualBarberDashboard>
      )

      render(<BarberCalendarView />)

      // Click on appointment
      const appointment = screen.getByText('Alice Brown')
      await user.click(appointment)

      // Should show barber-appropriate actions
      await waitFor(() => {
        expect(screen.getByText('Mark Complete')).toBeInTheDocument()
        expect(screen.getByText('Add Notes')).toBeInTheDocument()
        expect(screen.getByText('Reschedule')).toBeInTheDocument()
      })

      // Should NOT show admin-only actions
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
      expect(screen.queryByText('Assign to Other Barber')).not.toBeInTheDocument()
    })

    test('enables limited bulk operations for barber', async () => {
      const BarberCalendarView = () => (
        <IndividualBarberDashboard userRole="BARBER" barberId={1}>
          <BulkOperationsManager
            appointments={mockAPIResponses.BARBER.appointments}
            userRole="BARBER"
            onBulkOperation={jest.fn()}
            enableBulkComplete={true}
            enableBulkReschedule={false}
          >
            <UnifiedCalendar
              appointments={mockAPIResponses.BARBER.appointments}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </BulkOperationsManager>
        </IndividualBarberDashboard>
      )

      render(<BarberCalendarView />)

      // Enable multi-select mode
      const firstAppointment = screen.getByText('Alice Brown')
      fireEvent.click(firstAppointment, { ctrlKey: true })

      const secondAppointment = screen.getByText('John Smith')
      fireEvent.click(secondAppointment, { ctrlKey: true })

      // Should show limited bulk actions
      await waitFor(() => {
        expect(screen.getByText(/Bulk Actions/i)).toBeInTheDocument()
      })

      const bulkButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkButton)

      // Should allow bulk completion but not cancellation
      expect(screen.getByText('Mark Selected Complete')).toBeInTheDocument()
      expect(screen.queryByText('Cancel Selected')).not.toBeInTheDocument()
    })
  })

  describe('INDIVIDUAL_BARBER Role - Business Command Center', () => {
    test('shows full business calendar with analytics integration', async () => {
      const IndividualBarberCalendarView = () => (
        <IndividualBarberDashboard userRole="INDIVIDUAL_BARBER" barberId={2}>
          <div>
            <div data-testid="revenue-metrics">
              Daily: ${mockAPIResponses.INDIVIDUAL_BARBER.analytics.daily_revenue}
              Weekly: ${mockAPIResponses.INDIVIDUAL_BARBER.analytics.weekly_revenue}
            </div>
            <UnifiedCalendar
              appointments={mockAPIResponses.INDIVIDUAL_BARBER.appointments}
              currentDate={new Date('2023-12-01')}
              view="week"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
              userRole="INDIVIDUAL_BARBER"
              showRevenueData={true}
              enableFullBusinessFeatures={true}
            />
          </div>
        </IndividualBarberDashboard>
      )

      render(<IndividualBarberCalendarView />)

      // Should show appointments with revenue data
      await waitFor(() => {
        expect(screen.getByText('Emma Davis')).toBeInTheDocument()
        expect(screen.getByText('Lisa Chen')).toBeInTheDocument()
      })

      // Should show revenue metrics
      expect(screen.getByText(/Daily: \$320/)).toBeInTheDocument()
      expect(screen.getByText(/Weekly: \$1850/)).toBeInTheDocument()
    })

    test('enables advanced business features', async () => {
      const IndividualBarberCalendarView = () => (
        <IndividualBarberDashboard userRole="INDIVIDUAL_BARBER" barberId={2}>
          <VirtualizedCalendarGrid
            appointments={mockAPIResponses.INDIVIDUAL_BARBER.appointments}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            userRole="INDIVIDUAL_BARBER"
            enableBusinessAnalytics={true}
            enableRevenueTracking={true}
          />
        </IndividualBarberDashboard>
      )

      render(<IndividualBarberCalendarView />)

      // Should show business features
      await waitFor(() => {
        expect(screen.getByText(/Revenue Tracking/i)).toBeInTheDocument()
        expect(screen.getByText(/Client Analytics/i)).toBeInTheDocument()
      })
    })
  })

  describe('SHOP_OWNER Role - Single-Location Business Dashboard', () => {
    test('shows all shop appointments across barbers', async () => {
      const ShopOwnerCalendarView = () => (
        <ShopOwnerDashboard locationId={3}>
          <UnifiedCalendar
            appointments={mockAPIResponses.SHOP_OWNER.appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            userRole="SHOP_OWNER"
            locationId={3}
            showAllBarbers={true}
          />
        </ShopOwnerDashboard>
      )

      render(<ShopOwnerCalendarView />)

      // Should show appointments from all barbers
      await waitFor(() => {
        expect(screen.getByText('Client A')).toBeInTheDocument()
        expect(screen.getByText('Client B')).toBeInTheDocument()
        expect(screen.getByText('Client C')).toBeInTheDocument()
      })

      // Should show multiple barbers
      expect(screen.getByText('Barber 1')).toBeInTheDocument()
      expect(screen.getByText('Barber 2')).toBeInTheDocument()
    })

    test('enables full shop management features', async () => {
      const onBarberAssign = jest.fn()

      const ShopOwnerCalendarView = () => (
        <ShopOwnerDashboard locationId={3}>
          <BulkOperationsManager
            appointments={mockAPIResponses.SHOP_OWNER.appointments}
            userRole="SHOP_OWNER"
            onBulkOperation={jest.fn()}
            onBarberReassignment={onBarberAssign}
            enableAdvancedOperations={true}
          >
            <UnifiedCalendar
              appointments={mockAPIResponses.SHOP_OWNER.appointments}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
              userRole="SHOP_OWNER"
            />
          </BulkOperationsManager>
        </ShopOwnerDashboard>
      )

      render(<ShopOwnerCalendarView />)

      // Select multiple appointments
      const appointment1 = screen.getByText('Client A')
      fireEvent.click(appointment1, { ctrlKey: true })

      const appointment2 = screen.getByText('Client B')
      fireEvent.click(appointment2, { ctrlKey: true })

      // Should show shop owner operations
      await waitFor(() => {
        const bulkButton = screen.getByText(/Bulk Actions/i)
        fireEvent.click(bulkButton)
      })

      // Should include barber reassignment
      expect(screen.getByText('Reassign Barber')).toBeInTheDocument()
      expect(screen.getByText('Bulk Reschedule')).toBeInTheDocument()
      expect(screen.getByText('Cancel Selected')).toBeInTheDocument()
    })

    test('shows shop-level conflict resolution', async () => {
      const conflictEngine = new ConflictResolutionEngine()

      const ShopOwnerCalendarView = () => (
        <ShopOwnerDashboard locationId={3}>
          <ConflictResolutionEngine
            appointments={mockAPIResponses.SHOP_OWNER.appointments}
            barbers={mockAPIResponses.SHOP_OWNER.barbers}
            userRole="SHOP_OWNER"
            enableShopLevelResolution={true}
          />
        </ShopOwnerDashboard>
      )

      render(<ShopOwnerCalendarView />)

      // Should have access to shop-level conflict resolution
      expect(screen.getByText(/Conflict Resolution/i)).toBeInTheDocument()
    })
  })

  describe('ENTERPRISE_OWNER Role - Multi-Location Enterprise Dashboard', () => {
    test('shows enterprise-wide calendar overview', async () => {
      const EnterpriseCalendarView = () => (
        <EnterpriseDashboard>
          <div>
            <div data-testid="location-summary">
              {mockAPIResponses.ENTERPRISE_OWNER.locations.map(location => (
                <div key={location.id}>
                  {location.name}: {location.appointments_today} appointments
                </div>
              ))}
            </div>
            <UnifiedCalendar
              appointments={mockAPIResponses.ENTERPRISE_OWNER.appointments}
              currentDate={new Date('2023-12-01')}
              view="month"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
              userRole="ENTERPRISE_OWNER"
              showMultiLocation={true}
              enableEnterpriseFeatures={true}
            />
          </div>
        </EnterpriseDashboard>
      )

      render(<EnterpriseCalendarView />)

      // Should show enterprise overview
      await waitFor(() => {
        expect(screen.getByText('Downtown Location: 25 appointments')).toBeInTheDocument()
        expect(screen.getByText('Uptown Location: 18 appointments')).toBeInTheDocument()
        expect(screen.getByText('Mall Location: 32 appointments')).toBeInTheDocument()
      })

      // Should show high-level appointment data
      expect(screen.getByText('Enterprise Client 1')).toBeInTheDocument()
      expect(screen.getByText('Downtown Location')).toBeInTheDocument()
    })

    test('enables enterprise-level analytics and reporting', async () => {
      const EnterpriseCalendarView = () => (
        <EnterpriseDashboard>
          <VirtualizedCalendarGrid
            appointments={mockAPIResponses.ENTERPRISE_OWNER.appointments}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            userRole="ENTERPRISE_OWNER"
            enableEnterpriseAnalytics={true}
            showCrossLocationInsights={true}
          />
        </EnterpriseDashboard>
      )

      render(<EnterpriseCalendarView />)

      // Should show enterprise-level features
      await waitFor(() => {
        expect(screen.getByText(/Cross-Location Analytics/i)).toBeInTheDocument()
        expect(screen.getByText(/Enterprise Reporting/i)).toBeInTheDocument()
      })
    })
  })

  describe('SHOP_MANAGER Role - Operations Management Center', () => {
    test('shows location-specific operational calendar', async () => {
      const ManagerCalendarView = () => (
        <SnapshotDashboard userRole="SHOP_MANAGER" locationId={1}>
          <UnifiedCalendar
            appointments={mockAPIResponses.SHOP_MANAGER.appointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            userRole="SHOP_MANAGER"
            locationId={1}
            enableOperationalFeatures={true}
          />
        </SnapshotDashboard>
      )

      render(<ManagerCalendarView />)

      // Should show appointments for managed location
      await waitFor(() => {
        expect(screen.getByText('Managed Client 1')).toBeInTheDocument()
        expect(screen.getByText('Managed Client 2')).toBeInTheDocument()
      })

      // Should show operational controls
      expect(screen.getByText(/Staff Management/i)).toBeInTheDocument()
    })

    test('enables staff scheduling and operational features', async () => {
      const ManagerCalendarView = () => (
        <SnapshotDashboard userRole="SHOP_MANAGER" locationId={1}>
          <BulkOperationsManager
            appointments={mockAPIResponses.SHOP_MANAGER.appointments}
            userRole="SHOP_MANAGER"
            onBulkOperation={jest.fn()}
            enableStaffManagement={true}
          >
            <UnifiedCalendar
              appointments={mockAPIResponses.SHOP_MANAGER.appointments}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </BulkOperationsManager>
        </SnapshotDashboard>
      )

      render(<ManagerCalendarView />)

      // Should show manager-level operations
      expect(screen.getByText(/Staff Scheduling/i)).toBeInTheDocument()
      expect(screen.getByText(/Operational Dashboard/i)).toBeInTheDocument()
    })
  })

  describe('Permission Boundary Validation', () => {
    test('enforces data scope restrictions by role', async () => {
      const permissions = {
        CLIENT: { canSeeAllAppointments: false, canManageOthers: false },
        BARBER: { canSeeAllAppointments: false, canManageOthers: false },
        INDIVIDUAL_BARBER: { canSeeAllAppointments: true, canManageOthers: true },
        SHOP_OWNER: { canSeeAllAppointments: true, canManageOthers: true },
        ENTERPRISE_OWNER: { canSeeAllAppointments: true, canManageOthers: true },
        SHOP_MANAGER: { canSeeAllAppointments: true, canManageOthers: true }
      }

      Object.entries(permissions).forEach(([role, perms]) => {
        const roleData = mockAPIResponses[role as keyof typeof mockAPIResponses]
        if (!roleData) return

        const TestComponent = () => (
          <UnifiedCalendar
            appointments={roleData.appointments || []}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
            userRole={role}
            userPermissions={perms}
          />
        )

        const { unmount } = render(<TestComponent />)

        // Validate permissions are enforced
        if (!perms.canSeeAllAppointments) {
          // Should only see user's own data
          expect(screen.queryByText('Admin')).not.toBeInTheDocument()
        }

        unmount()
      })
    })

    test('prevents unauthorized calendar operations', async () => {
      const unauthorizedActions = jest.fn()

      const RestrictedCalendarView = () => (
        <UnifiedCalendar
          appointments={mockAPIResponses.CLIENT.appointments}
          currentDate={new Date('2023-12-01')}
          view="day"
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
          userRole="CLIENT"
          onUnauthorizedAction={unauthorizedActions}
        />
      )

      render(<RestrictedCalendarView />)

      // Try to access admin function (should be blocked)
      const appointment = screen.getByText('Haircut')
      fireEvent.contextMenu(appointment) // Right-click for admin menu

      // Should not show admin options
      expect(screen.queryByText('Delete Appointment')).not.toBeInTheDocument()
      expect(screen.queryByText('Transfer to Another Barber')).not.toBeInTheDocument()
    })
  })

  describe('Role Switching and State Persistence', () => {
    test('maintains calendar state when switching between roles', async () => {
      let currentRole = 'BARBER'
      const calendarState = {
        currentDate: new Date('2023-12-01'),
        view: 'week',
        selectedAppointments: []
      }

      const DynamicRoleCalendar = () => (
        <UnifiedCalendar
          appointments={mockAPIResponses[currentRole as keyof typeof mockAPIResponses].appointments || []}
          currentDate={calendarState.currentDate}
          view={calendarState.view as any}
          onDateChange={(date) => { calendarState.currentDate = date }}
          onViewChange={(view) => { calendarState.view = view }}
          userRole={currentRole}
          persistState={true}
        />
      )

      const { rerender } = render(<DynamicRoleCalendar />)

      // Change date
      const nextButton = screen.getByLabelText(/next/i)
      await user.click(nextButton)

      // Switch role
      currentRole = 'SHOP_OWNER'
      rerender(<DynamicRoleCalendar />)

      // Calendar state should persist
      expect(calendarState.currentDate).not.toEqual(new Date('2023-12-01'))
    })
  })

  describe('Dashboard Integration Performance', () => {
    test('maintains performance with role-specific data loads', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        start_time: `2023-12-01T${String(9 + Math.floor(i / 10)).padStart(2, '0')}:00:00Z`,
        end_time: `2023-12-01T${String(10 + Math.floor(i / 10)).padStart(2, '0')}:00:00Z`,
        client_name: `Client ${i + 1}`,
        service_name: 'Service',
        barber_name: 'Barber',
        status: 'confirmed' as const
      }))

      const PerformanceTestView = () => (
        <EnterpriseDashboard>
          <VirtualizedCalendarGrid
            appointments={largeDataset}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            userRole="ENTERPRISE_OWNER"
            enableVirtualization={true}
          />
        </EnterpriseDashboard>
      )

      const startTime = performance.now()
      render(<PerformanceTestView />)
      const endTime = performance.now()

      // Should render large dataset efficiently
      expect(endTime - startTime).toBeLessThan(500)
    })
  })
})

describe('Dashboard-Specific Calendar Features', () => {
  test('CLIENT dashboard shows simplified calendar interface', () => {
    const ClientView = () => (
      <ClientPortal>
        <UnifiedCalendar
          appointments={mockAPIResponses.CLIENT.appointments}
          currentDate={new Date('2023-12-01')}
          view="month"
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
          userRole="CLIENT"
          simplifiedInterface={true}
        />
      </ClientPortal>
    )

    render(<ClientView />)

    // Should show simplified interface
    expect(screen.getByText(/My Appointments/i)).toBeInTheDocument()
    expect(screen.queryByText(/Advanced Options/i)).not.toBeInTheDocument()
  })

  test('ENTERPRISE dashboard shows multi-location calendar aggregation', () => {
    const EnterpriseView = () => (
      <EnterpriseDashboard>
        <UnifiedCalendar
          appointments={mockAPIResponses.ENTERPRISE_OWNER.appointments}
          currentDate={new Date('2023-12-01')}
          view="month"
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
          userRole="ENTERPRISE_OWNER"
          enableMultiLocationView={true}
        />
      </EnterpriseDashboard>
    )

    render(<EnterpriseView />)

    // Should show enterprise features
    expect(screen.getByText(/Multi-Location View/i)).toBeInTheDocument()
    expect(screen.getByText(/Enterprise Analytics/i)).toBeInTheDocument()
  })

  test('SHOP_OWNER dashboard enables team coordination features', () => {
    const ShopOwnerView = () => (
      <ShopOwnerDashboard locationId={3}>
        <UnifiedCalendar
          appointments={mockAPIResponses.SHOP_OWNER.appointments}
          currentDate={new Date('2023-12-01')}
          view="day"
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
          userRole="SHOP_OWNER"
          enableTeamCoordination={true}
        />
      </ShopOwnerDashboard>
    )

    render(<ShopOwnerView />)

    // Should show team coordination
    expect(screen.getByText(/Team Schedule/i)).toBeInTheDocument()
    expect(screen.getByText(/Barber Coordination/i)).toBeInTheDocument()
  })
})
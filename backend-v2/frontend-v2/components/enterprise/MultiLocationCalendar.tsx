'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

// Multi-Location Calendar Component
// Advanced calendar system with multi-location management and conflict resolution

interface Location {
  id: number
  name: string
  timezone: string
  address: string
  status: 'active' | 'inactive'
  chairs: number
  staff: number
  color: string // For calendar display
}

interface Appointment {
  id: string
  clientName: string
  service: string
  barberName: string
  barberId: string
  locationId: number
  locationName: string
  startTime: string
  endTime: string
  duration: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  revenue: number
  isBlocked?: boolean
  conflictId?: string
  priority: 'high' | 'medium' | 'low'
}

interface ConflictResolution {
  id: string
  type: 'double_booking' | 'staff_unavailable' | 'location_closed' | 'equipment_conflict'
  severity: 'critical' | 'warning' | 'info'
  appointments: Appointment[]
  suggestedActions: {
    action: string
    description: string
    impact: string
  }[]
  autoResolvable: boolean
}

interface CalendarView {
  mode: 'day' | 'week' | 'month'
  date: Date
  selectedLocations: number[]
  selectedStaff: string[]
  showConflicts: boolean
}

interface MultiLocationCalendarProps {
  organizationId?: number
  className?: string
}

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'no_show': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

function getConflictColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
    case 'warning': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
    case 'info': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
    default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20'
  }
}

export default function MultiLocationCalendar({ organizationId, className }: MultiLocationCalendarProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([])
  const [loading, setLoading] = useState(true)
  const [calendarView, setCalendarView] = useState<CalendarView>({
    mode: 'day',
    date: new Date(),
    selectedLocations: [],
    selectedStaff: [],
    showConflicts: true
  })

  useEffect(() => {
    async function loadCalendarData() {
      setLoading(true)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock locations data
      const mockLocations: Location[] = [
        {
          id: 1,
          name: 'Downtown Location',
          timezone: 'America/New_York',
          address: '123 Main St, Downtown',
          status: 'active',
          chairs: 8,
          staff: 4,
          color: '#3B82F6'
        },
        {
          id: 2,
          name: 'Uptown Branch',
          timezone: 'America/New_York',
          address: '456 Oak Ave, Uptown',
          status: 'active',
          chairs: 6,
          staff: 3,
          color: '#10B981'
        },
        {
          id: 3,
          name: 'Westside Shop',
          timezone: 'America/New_York',
          address: '789 Pine Rd, Westside',
          status: 'active',
          chairs: 10,
          staff: 5,
          color: '#8B5CF6'
        }
      ]
      
      // Generate mock appointments for today
      const today = new Date()
      const mockAppointments: Appointment[] = [
        {
          id: '1',
          clientName: 'John Smith',
          service: 'Beard Trim & Style',
          barberName: 'Marcus Johnson',
          barberId: 'barber1',
          locationId: 1,
          locationName: 'Downtown Location',
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 45).toISOString(),
          duration: 45,
          status: 'scheduled',
          revenue: 65,
          priority: 'high'
        },
        {
          id: '2',
          clientName: 'Mike Wilson',
          service: 'Full Service Cut',
          barberName: 'Sarah Williams',
          barberId: 'barber2',
          locationId: 1,
          locationName: 'Downtown Location',
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30).toISOString(),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30).toISOString(),
          duration: 60,
          status: 'scheduled',
          revenue: 85,
          priority: 'medium'
        },
        {
          id: '3',
          clientName: 'David Chen',
          service: 'Quick Trim',
          barberName: 'Marcus Johnson',
          barberId: 'barber1',
          locationId: 1,
          locationName: 'Downtown Location',
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30).toISOString(),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString(),
          duration: 30,
          status: 'scheduled',
          revenue: 45,
          conflictId: 'conflict1',
          priority: 'low'
        },
        {
          id: '4',
          clientName: 'Emily Rodriguez',
          service: 'Premium Package',
          barberName: 'Alex Thompson',
          barberId: 'barber3',
          locationId: 2,
          locationName: 'Uptown Branch',
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString(),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30).toISOString(),
          duration: 90,
          status: 'scheduled',
          revenue: 120,
          priority: 'high'
        },
        {
          id: '5',
          clientName: 'Robert Davis',
          service: 'Consultation',
          barberName: 'Maria Garcia',
          barberId: 'barber4',
          locationId: 3,
          locationName: 'Westside Shop',
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString(),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30).toISOString(),
          duration: 30,
          status: 'completed',
          revenue: 25,
          priority: 'low'
        }
      ]
      
      // Mock conflict resolution data
      const mockConflicts: ConflictResolution[] = [
        {
          id: 'conflict1',
          type: 'double_booking',
          severity: 'critical',
          appointments: mockAppointments.filter(apt => apt.conflictId === 'conflict1' || apt.id === '1'),
          suggestedActions: [
            {
              action: 'Reschedule later appointment',
              description: 'Move David Chen\'s appointment to 11:15 AM',
              impact: 'Minimal customer impact, no revenue loss'
            },
            {
              action: 'Assign to different barber',
              description: 'Transfer David Chen to Sarah Williams at 11:30 AM',
              impact: 'Customer may prefer original barber'
            },
            {
              action: 'Move to different location',
              description: 'Transfer to Uptown Branch with available slot',
              impact: 'Customer may need to travel further'
            }
          ],
          autoResolvable: true
        }
      ]
      
      setLocations(mockLocations)
      setAppointments(mockAppointments)
      setConflicts(mockConflicts)
      
      // Set initial selected locations to all active locations
      setCalendarView(prev => ({
        ...prev,
        selectedLocations: mockLocations.filter(loc => loc.status === 'active').map(loc => loc.id)
      }))
      
      setLoading(false)
    }
    
    loadCalendarData()
  }, [organizationId])

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      if (calendarView.selectedLocations.length > 0 && !calendarView.selectedLocations.includes(apt.locationId)) {
        return false
      }
      if (calendarView.selectedStaff.length > 0 && !calendarView.selectedStaff.includes(apt.barberId)) {
        return false
      }
      
      // Filter by date based on view mode
      const aptDate = new Date(apt.startTime)
      const viewDate = calendarView.date
      
      switch (calendarView.mode) {
        case 'day':
          return aptDate.toDateString() === viewDate.toDateString()
        case 'week':
          const weekStart = new Date(viewDate)
          weekStart.setDate(viewDate.getDate() - viewDate.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          return aptDate >= weekStart && aptDate <= weekEnd
        case 'month':
          return aptDate.getMonth() === viewDate.getMonth() && aptDate.getFullYear() === viewDate.getFullYear()
        default:
          return true
      }
    })
  }, [appointments, calendarView])

  const navigateDate = (direction: 'prev' | 'next') => {
    setCalendarView(prev => {
      const newDate = new Date(prev.date)
      
      switch (prev.mode) {
        case 'day':
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
          break
        case 'week':
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
          break
        case 'month':
          newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
          break
      }
      
      return { ...prev, date: newDate }
    })
  }

  const formatDateHeader = (): string => {
    const date = calendarView.date
    
    switch (calendarView.mode) {
      case 'day':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'month':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon />
            <span>Multi-Location Calendar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Conflict Alerts */}
      {conflicts.length > 0 && calendarView.showConflicts && (
        <div className="mb-6 space-y-3">
          {conflicts.map((conflict) => (
            <Card key={conflict.id} className={`border-l-4 ${getConflictColor(conflict.severity)}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertIcon />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {conflict.type.replace('_', ' ').toUpperCase()} - {conflict.severity.toUpperCase()}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {conflict.appointments.length} appointments affected
                      </p>
                      
                      <div className="space-y-2">
                        {conflict.suggestedActions.slice(0, 2).map((action, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{action.action}:</span>{' '}
                            <span className="text-gray-600 dark:text-gray-400">{action.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {conflict.autoResolvable && (
                      <Button size="sm" variant="default">
                        Auto Resolve
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      Manual Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* View Mode Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex border rounded-lg">
                {(['day', 'week', 'month'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={calendarView.mode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCalendarView(prev => ({ ...prev, mode }))}
                    className="capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
              
              {/* Date Navigation */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                >
                  <ChevronLeftIcon />
                </Button>
                
                <div className="min-w-0 text-center">
                  <h3 className="font-semibold whitespace-nowrap">{formatDateHeader()}</h3>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarView(prev => ({ ...prev, date: new Date() }))}
              >
                Today
              </Button>
            </div>
            
            {/* Filters and Actions */}
            <div className="flex flex-wrap items-center space-x-2">
              <Select
                value=""
                onChange={() => {}}
                className="w-40"
                placeholder="Filter Locations"
                options={locations.map(loc => ({ 
                  value: loc.id.toString(), 
                  label: loc.name 
                }))}
              />
              
              <Button
                variant={calendarView.showConflicts ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalendarView(prev => ({ ...prev, showConflicts: !prev.showConflicts }))}
              >
                Show Conflicts
              </Button>
              
              <Button variant="outline" size="sm">
                Export
              </Button>
              
              <Button size="sm">
                New Appointment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {locations.filter(loc => calendarView.selectedLocations.includes(loc.id)).map((location) => {
          const locationAppointments = filteredAppointments.filter(apt => apt.locationId === location.id)
          const revenue = locationAppointments.reduce((sum, apt) => sum + apt.revenue, 0)
          const conflicts = locationAppointments.filter(apt => apt.conflictId).length
          
          return (
            <Card key={location.id} className="border-l-4" style={{ borderLeftColor: location.color }}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: location.color }}
                    />
                    <h3 className="font-semibold">{location.name}</h3>
                  </div>
                  <Badge className={location.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {location.status}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Appointments:</span>
                    <span className="font-medium">{locationAppointments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
                    <span className="font-medium">{formatCurrency(revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Chairs:</span>
                    <span className="font-medium">{location.chairs}</span>
                  </div>
                  {conflicts > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-600 dark:text-red-400">Conflicts:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{conflicts}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Appointments Overview</span>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <span>{filteredAppointments.length} appointments</span>
              <span>•</span>
              <span>{formatCurrency(filteredAppointments.reduce((sum, apt) => sum + apt.revenue, 0))} revenue</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {calendarView.mode === 'day' && (
            <div className="space-y-3">
              {filteredAppointments
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((appointment) => {
                  const location = locations.find(loc => loc.id === appointment.locationId)
                  const isConflicted = !!appointment.conflictId
                  
                  return (
                    <Card 
                      key={appointment.id} 
                      className={`${isConflicted ? 'border-red-200 dark:border-red-800' : ''} border-l-4`}
                      style={{ borderLeftColor: location?.color || '#gray' }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="text-lg font-bold">{formatTime(appointment.startTime)}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{appointment.duration}min</div>
                            </div>
                            
                            <div className="flex-1">
                              <h4 className="font-semibold">{appointment.clientName}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.service}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {appointment.barberName} • {appointment.locationName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(appointment.revenue)}</div>
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                            
                            {isConflicted && (
                              <div className="text-red-500">
                                <AlertIcon />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              
              {filteredAppointments.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CalendarIcon />
                  <p className="mt-2">No appointments scheduled for this day</p>
                </div>
              )}
            </div>
          )}
          
          {calendarView.mode === 'week' && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CalendarIcon />
              <p className="mt-2">Week view coming soon</p>
            </div>
          )}
          
          {calendarView.mode === 'month' && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CalendarIcon />
              <p className="mt-2">Month view coming soon</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
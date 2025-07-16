'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingStates } from '@/components/ui/LoadingSystem'
import { type UserWithRole } from '@/lib/roleUtils'

// Icons
const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const CreditCardIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

// Types for client portal data
interface ClientAppointment {
  id: number
  service_name: string
  start_time: string
  end_time: string
  barber_name: string
  barbershop_name: string
  status: 'scheduled' | 'completed' | 'cancelled'
  can_reschedule: boolean
  can_cancel: boolean
}

interface ClientPortalData {
  upcomingAppointments: ClientAppointment[]
  recentAppointments: ClientAppointment[]
  savedPaymentMethods: number
  profileComplete: boolean
  loyaltyPoints?: number
}

interface ClientPortalProps {
  user: UserWithRole & {
    email: string
    name: string
  }
  className?: string
}

export function ClientPortal({ user, className = '' }: ClientPortalProps) {
  const router = useRouter()
  const [data, setData] = useState<ClientPortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClientData() {
      try {
        setLoading(true)
        // This will be implemented when we create the dashboard API
        // const response = await getClientPortalData(user.id)
        
        // Mock data for now
        const mockData: ClientPortalData = {
          upcomingAppointments: [
            {
              id: 1,
              service_name: "Haircut & Beard Trim",
              start_time: "2025-07-18T10:00:00Z",
              end_time: "2025-07-18T10:45:00Z",
              barber_name: "Mike Johnson",
              barbershop_name: "Elite Cuts Downtown",
              status: "scheduled",
              can_reschedule: true,
              can_cancel: true
            },
            {
              id: 2,
              service_name: "Classic Haircut",
              start_time: "2025-07-25T14:30:00Z",
              end_time: "2025-07-25T15:00:00Z",
              barber_name: "Sarah Davis",
              barbershop_name: "Elite Cuts Downtown",
              status: "scheduled",
              can_reschedule: true,
              can_cancel: true
            }
          ],
          recentAppointments: [
            {
              id: 3,
              service_name: "Fade Cut",
              start_time: "2025-07-10T16:00:00Z",
              end_time: "2025-07-10T16:30:00Z",
              barber_name: "Carlos Rodriguez",
              barbershop_name: "Elite Cuts Downtown",
              status: "completed",
              can_reschedule: false,
              can_cancel: false
            }
          ],
          savedPaymentMethods: 1,
          profileComplete: true,
          loyaltyPoints: 150
        }
        
        setData(mockData)
      } catch (err) {
        setError('Failed to load your appointment data')
        console.error('Error fetching client data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchClientData()
  }, [user.id])

  const formatAppointmentTime = (startTime: string) => {
    const date = new Date(startTime)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    let dateStr = ''
    if (date.toDateString() === today.toDateString()) {
      dateStr = 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow'
    } else {
      dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }

    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })

    return `${dateStr}, ${timeStr}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Scheduled</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 ${className}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoadingStates.Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LoadingStates.CardSkeleton />
            <LoadingStates.CardSkeleton />
            <LoadingStates.CardSkeleton />
            <LoadingStates.CardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 ${className}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <EmptyState
            title="Unable to load your appointments"
            description={error}
            action={
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.first_name || user.name || 'there'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage your appointments and account settings
          </p>
        </div>

        {/* Quick Book CTA */}
        <Card className="mb-6 border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Ready for your next appointment?</h3>
              <p className="text-blue-700 dark:text-blue-200 text-sm mt-1">Book with your favorite barber today</p>
            </div>
            <Button 
              onClick={() => router.push('/book')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              leftIcon={<CalendarIcon />}
            >
              Book Now
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.upcomingAppointments.length === 0 ? (
                <EmptyState
                  icon={<CalendarIcon />}
                  title="No upcoming appointments"
                  description="Book your next appointment to see it here"
                  action={
                    <Button onClick={() => router.push('/book')} size="sm">
                      Book Appointment
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {data?.upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {appointment.service_name}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mt-1">
                            <span className="flex items-center gap-1">
                              <ClockIcon />
                              {formatAppointmentTime(appointment.start_time)}
                            </span>
                            <span className="flex items-center gap-1">
                              <UserIcon />
                              {appointment.barber_name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {appointment.barbershop_name}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(appointment.status)}
                          {appointment.can_reschedule && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/appointments/${appointment.id}/reschedule`)}
                            >
                              Reschedule
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(data?.upcomingAppointments.length || 0) > 0 && (
                    <Button 
                      variant="ghost" 
                      className="w-full mt-4"
                      onClick={() => router.push('/appointments')}
                      rightIcon={<ArrowRightIcon />}
                    >
                      View All Appointments
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.recentAppointments.length === 0 ? (
                <EmptyState
                  title="No recent appointments"
                  description="Your appointment history will appear here"
                />
              ) : (
                <div className="space-y-4">
                  {data?.recentAppointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {appointment.service_name}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mt-1">
                            <span className="flex items-center gap-1">
                              <ClockIcon />
                              {formatAppointmentTime(appointment.start_time)}
                            </span>
                            <span className="flex items-center gap-1">
                              <UserIcon />
                              {appointment.barber_name}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="ghost" 
                    className="w-full mt-4"
                    onClick={() => router.push('/appointments/history')}
                    rightIcon={<ArrowRightIcon />}
                  >
                    View Full History
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon />
                Account Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Profile</span>
                  <div className="flex items-center gap-2">
                    {data?.profileComplete ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>
                    ) : (
                      <Badge variant="destructive">Incomplete</Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push('/profile')}
                      leftIcon={<EditIcon />}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Payment Methods</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{data?.savedPaymentMethods || 0} saved</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push('/payment-methods')}
                      leftIcon={<CreditCardIcon />}
                    >
                      Manage
                    </Button>
                  </div>
                </div>

                {data?.loyaltyPoints !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Loyalty Points</span>
                    <span className="text-sm font-medium text-blue-600">{data.loyaltyPoints} points</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/book')}
                  leftIcon={<CalendarIcon />}
                >
                  Book New Appointment
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/appointments')}
                  leftIcon={<ClockIcon />}
                >
                  Manage Appointments
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/profile')}
                  leftIcon={<UserIcon />}
                >
                  Update Profile
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/payment-methods')}
                  leftIcon={<CreditCardIcon />}
                >
                  Payment Settings
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
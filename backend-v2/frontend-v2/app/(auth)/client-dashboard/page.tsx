'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  ChevronRight,
  Plus,
  History,
  Star,
  Settings
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/Badge'
import { LoadingSpinner } from '../../../components/LoadingStates'
import { ErrorDisplay } from '../../../components/LoadingStates'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/use-toast'
import { getMyBookings, getProfile, type BookingResponse } from '../../../lib/api'
import { format, parseISO, isFuture, isPast } from 'date-fns'

export default function ClientDashboard() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upcomingBookings, setUpcomingBookings] = useState<BookingResponse[]>([])
  const [pastBookings, setPastBookings] = useState<BookingResponse[]>([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    // Redirect if not a client
    if (!authLoading && user && user.unified_role !== 'client') {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch bookings and profile in parallel
      const [bookingsResponse, profileData] = await Promise.all([
        getMyBookings(),
        getProfile()
      ])

      // Separate upcoming and past bookings
      const now = new Date()
      const upcoming = bookingsResponse.bookings.filter((booking: BookingResponse) => 
        isFuture(parseISO(booking.start_time))
      ).sort((a: BookingResponse, b: BookingResponse) => 
        parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
      )

      const past = bookingsResponse.bookings.filter((booking: BookingResponse) => 
        isPast(parseISO(booking.start_time))
      ).sort((a: BookingResponse, b: BookingResponse) => 
        parseISO(b.start_time).getTime() - parseISO(a.start_time).getTime()
      )

      setUpcomingBookings(upcoming)
      setPastBookings(past)
      setProfile(profileData)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('Failed to load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    try {
      // TODO: Implement cancellation API call
      toast({
        title: 'Appointment cancelled',
        description: 'Your appointment has been cancelled successfully.'
      })
      fetchDashboardData()
    } catch (err) {
      toast({
        title: 'Cancellation failed',
        description: 'Failed to cancel appointment. Please try again.',
        variant: 'destructive'
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorDisplay error={error} onRetry={fetchDashboardData} />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your appointments and profile
            </p>
          </div>
          <Button
            onClick={() => router.push('/book')}
            variant="primary"
            size="lg"
            leftIcon={<Plus className="w-5 h-5" />}
          >
            Book New Appointment
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingBookings.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Visits</p>
                <p className="text-2xl font-bold">{pastBookings.length}</p>
              </div>
              <History className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
                <p className="text-lg font-semibold">
                  {profile?.created_at ? format(parseISO(profile.created_at), 'MMM yyyy') : 'New'}
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Next Visit</p>
                <p className="text-lg font-semibold">
                  {upcomingBookings[0] 
                    ? format(parseISO(upcomingBookings[0].start_time), 'MMM d')
                    : 'None scheduled'
                  }
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No upcoming appointments
                  </p>
                  <Button
                    onClick={() => router.push('/book')}
                    variant="primary"
                  >
                    Book an Appointment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {booking.service_name || 'Service'}
                            </h3>
                            <Badge variant="default">Confirmed</Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {format(parseISO(booking.start_time), 'h:mm a')} - 
                              {format(parseISO(booking.end_time), 'h:mm a')}
                            </div>
                            {booking.barber_name && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {booking.barber_name}
                              </div>
                            )}
                            {/* {booking.location_name && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {booking.location_name}
                              </div>
                            )} */}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => router.push(`/bookings/${booking.id}`)}
                            variant="outline"
                            size="sm"
                          >
                            View Details
                          </Button>
                          <Button
                            onClick={() => handleCancelBooking(booking.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Appointments */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Appointment History</CardTitle>
            </CardHeader>
            <CardContent>
              {pastBookings.length === 0 ? (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  No past appointments
                </p>
              ) : (
                <div className="space-y-4">
                  {pastBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{booking.service_name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format(parseISO(booking.start_time), 'MMM d, yyyy')} with {booking.barber_name}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            // Pre-fill booking form with same service/barber
                            router.push(`/book?service=${booking.service_name}&barber=${booking.barber_id}`)
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          Book Again
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {pastBookings.length > 5 && (
                    <Button
                      onClick={() => router.push('/bookings?view=history')}
                      variant="ghost"
                      fullWidth
                      className="mt-4"
                    >
                      View All History
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile & Quick Actions */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="font-medium">{profile?.name || user?.name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {profile?.email || user?.email}
                  </p>
                </div>
                
                {profile?.phone && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {profile.phone}
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => router.push('/settings/profile')}
                  variant="outline"
                  fullWidth
                  leftIcon={<Settings className="w-4 h-4" />}
                >
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/book')}
                  variant="primary"
                  fullWidth
                  leftIcon={<Calendar className="w-4 h-4" />}
                >
                  Book New Appointment
                </Button>
                
                <Button
                  onClick={() => router.push('/bookings')}
                  variant="outline"
                  fullWidth
                  leftIcon={<History className="w-4 h-4" />}
                >
                  View All Appointments
                </Button>
                
                <Button
                  onClick={() => router.push('/settings/notifications')}
                  variant="outline"
                  fullWidth
                  leftIcon={<Settings className="w-4 h-4" />}
                >
                  Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loyalty/Rewards (Future Feature) */}
          <Card>
            <CardHeader>
              <CardTitle>Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <Star className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Loyalty rewards coming soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
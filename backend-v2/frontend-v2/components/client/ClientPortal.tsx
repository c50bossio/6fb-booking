'use client'

/**
 * Comprehensive Client Portal
 * 
 * Self-service capabilities for clients including:
 * - Appointment management (view, reschedule, cancel)
 * - Payment history and upcoming charges
 * - Loyalty program tracking and rewards
 * - Communication preferences
 * - Appointment history and rebooking
 * - Service preferences and notes
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner, ErrorDisplay, CardSkeleton } from '@/components/ui/LoadingSystem'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Calendar, Clock, CreditCard, Star, Settings, History, 
  MapPin, Phone, Mail, Bell, Gift, Trophy, User,
  CheckCircle, XCircle, AlertCircle, Edit, Plus
} from 'lucide-react'

interface ClientAppointment {
  id: number
  service_name: string
  barber_name: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  location: string
  price: number
  notes?: string
  can_reschedule: boolean
  can_cancel: boolean
}

interface PaymentRecord {
  id: number
  appointment_id: number
  amount: number
  currency: string
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  payment_date: string
  method: string
  receipt_url?: string
}

interface LoyaltyProgram {
  current_points: number
  lifetime_points: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  tier_benefits: string[]
  next_tier_points_needed: number
  available_rewards: Array<{
    id: number
    name: string
    points_required: number
    description: string
  }>
}

interface ClientProfile {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  preferences: {
    preferred_barber_id?: number
    preferred_services: string[]
    preferred_times: string[]
    communication_preferences: {
      email_reminders: boolean
      sms_reminders: boolean
      marketing_emails: boolean
      appointment_confirmations: boolean
    }
  }
  notes: string
  member_since: string
  total_appointments: number
  total_spent: number
}

export function ClientPortal() {
  const [activeTab, setActiveTab] = useState('overview')
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [appointments, setAppointments] = useState<ClientAppointment[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClientData()
  }, [])

  const fetchClientData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all client portal data
      const [profileRes, appointmentsRes, paymentsRes, loyaltyRes] = await Promise.all([
        fetch('/api/v1/clients/profile', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        }),
        fetch('/api/v1/appointments/?status=all', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        }),
        fetch('/api/v1/payments/history', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        }),
        fetch('/api/v1/loyalty/status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
      ])

      if (profileRes.ok) {
        setProfile(await profileRes.json())
      }
      if (appointmentsRes.ok) {
        setAppointments(await appointmentsRes.json())
      }
      if (paymentsRes.ok) {
        setPaymentHistory(await paymentsRes.json())
      }
      if (loyaltyRes.ok) {
        setLoyaltyProgram(await loyaltyRes.json())
      }

    } catch (err) {
      console.error('Error fetching client data:', err)
      setError('Failed to load client portal data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'no_show': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-orange-600'
      case 'silver': return 'text-gray-600'
      case 'gold': return 'text-yellow-600'
      case 'platinum': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })

  const formatTime = (dateString: string) => 
    new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <CardSkeleton className="h-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CardSkeleton className="h-96" />
          </div>
          <div className="space-y-6">
            <CardSkeleton className="h-48" />
            <CardSkeleton className="h-48" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <ErrorDisplay
          error={error}
          onRetry={fetchClientData}
          className="max-w-2xl mx-auto"
        />
      </div>
    )
  }

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'scheduled' && new Date(apt.start_time) > new Date()
  )

  const recentAppointments = appointments
    .filter(apt => apt.status === 'completed')
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 5)

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {profile?.first_name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your appointments and account preferences
            </p>
          </div>
          <Button onClick={() => setActiveTab('settings')} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Upcoming
                </p>
                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Loyalty Points
                </p>
                <p className="text-2xl font-bold">{loyaltyProgram?.current_points || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Visits
                </p>
                <p className="text-2xl font-bold">{profile?.total_appointments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Spent
                </p>
                <p className="text-2xl font-bold">{formatCurrency(profile?.total_spent || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: User },
            { id: 'appointments', name: 'Appointments', icon: Calendar },
            { id: 'payments', name: 'Payments', icon: CreditCard },
            { id: 'loyalty', name: 'Rewards', icon: Star },
            { id: 'settings', name: 'Settings', icon: Settings }
          ].map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <IconComponent className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Upcoming Appointments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingAppointments.slice(0, 3).map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <Calendar className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {appointment.service_name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                with {appointment.barber_name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(appointment.start_time)} at {formatTime(appointment.start_time)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </Badge>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No upcoming appointments</p>
                      <Button className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Book Appointment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="h-5 w-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">{appointment.service_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(appointment.start_time)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(appointment.price)}</p>
                          <Button size="sm" variant="ghost">
                            Rebook
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Additional tabs would be implemented here */}
          {activeTab !== 'overview' && (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This section is under development and will be available soon.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Loyalty Status */}
          {loyaltyProgram && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Loyalty Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className={`text-2xl font-bold ${getTierColor(loyaltyProgram.tier)}`}>
                    {loyaltyProgram.tier.toUpperCase()}
                  </div>
                  <p className="text-lg font-semibold">{loyaltyProgram.current_points} points</p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress to next tier</span>
                      <span>{loyaltyProgram.next_tier_points_needed} points needed</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(
                            (loyaltyProgram.current_points / (loyaltyProgram.current_points + loyaltyProgram.next_tier_points_needed)) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <h4 className="font-semibold mb-2">Available Rewards</h4>
                    <div className="space-y-2">
                      {loyaltyProgram.available_rewards.slice(0, 2).map((reward) => (
                        <div key={reward.id} className="flex justify-between items-center text-sm">
                          <span>{reward.name}</span>
                          <Badge variant="outline">{reward.points_required} pts</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book New Appointment
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Reschedule Appointment
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Update Payment Method
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Bell className="h-4 w-4 mr-2" />
                  Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-gray-600" />
                  <span>(555) 123-4567</span>
                </div>
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-gray-600" />
                  <span>support@bookedbarber.com</span>
                </div>
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-gray-600" />
                  <span>123 Main St, City, ST 12345</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
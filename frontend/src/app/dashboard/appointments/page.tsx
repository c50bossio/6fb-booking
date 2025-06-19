'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import { 
  ArrowLeftIcon,
  ClockIcon,
  UserIcon,
  ScissorsIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

interface Appointment {
  id: number
  trafft_id: string
  date: string
  time: string
  status: string
  display_status: string
  service: {
    name: string
    price: number
  }
  client: {
    name: string
    email: string
    phone: string
  }
  barber: {
    name: string
    email: string
  }
  location: string
}

interface DashboardData {
  date: string
  appointments: Appointment[]
  summary: {
    total_appointments: number
    upcoming_appointments: number
    completed_appointments: number
    cancelled_appointments: number
    today_revenue: number
  }
}

export default function AppointmentsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBarber, setSelectedBarber] = useState<string>('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    fetchAppointments()
    // Refresh every 30 seconds
    const interval = setInterval(fetchAppointments, 30000)
    return () => clearInterval(interval)
  }, [selectedBarber])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const params = selectedBarber ? { barber_id: selectedBarber } : {}
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/dashboard/appointments/today`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      )

      setData(response.data)
      setError('')
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login')
      } else {
        setError('Failed to load appointments')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (displayStatus: string) => {
    const statusStyles = {
      upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      no_show: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      past: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusStyles[displayStatus as keyof typeof statusStyles] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
        {displayStatus.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading appointments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </a>
              <Image
                src="/6fb-logo.png"
                alt="6FB Logo"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-white">Today's Appointments</h1>
                <p className="text-xs text-gray-400">Live Updates Every 30 Seconds</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-400">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-lg font-semibold text-white">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Total</div>
                <div className="text-2xl font-bold text-white">{data?.summary.total_appointments || 0}</div>
              </div>
              <CalendarIcon className="h-8 w-8 text-gray-600" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Upcoming</div>
                <div className="text-2xl font-bold text-blue-400">{data?.summary.upcoming_appointments || 0}</div>
              </div>
              <ClockIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Completed</div>
                <div className="text-2xl font-bold text-green-400">{data?.summary.completed_appointments || 0}</div>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Cancelled</div>
                <div className="text-2xl font-bold text-red-400">{data?.summary.cancelled_appointments || 0}</div>
              </div>
              <XCircleIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Revenue</div>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(data?.summary.today_revenue || 0)}
                </div>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
          {error && (
            <div className="p-4 bg-red-900/20 border-l-4 border-red-500">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {data?.appointments.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">No appointments</h3>
              <p className="mt-1 text-sm text-gray-500">No appointments scheduled for today.</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Mobile View */}
              <div className="md:hidden">
                {data?.appointments.map((appointment) => (
                  <div key={appointment.id} className="p-4 border-b border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-lg font-semibold text-white">{appointment.time}</div>
                      {getStatusBadge(appointment.display_status)}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-300">
                        <UserIcon className="h-4 w-4 mr-2 text-gray-500" />
                        {appointment.client.name}
                      </div>
                      <div className="flex items-center text-gray-300">
                        <ScissorsIcon className="h-4 w-4 mr-2 text-gray-500" />
                        {appointment.service.name}
                      </div>
                      <div className="flex items-center text-gray-300">
                        <UserIcon className="h-4 w-4 mr-2 text-gray-500" />
                        {appointment.barber.name}
                      </div>
                      <div className="flex items-center text-green-400 font-semibold">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                        {formatCurrency(appointment.service.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Barber
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {data?.appointments.map((appointment) => (
                      <tr key={appointment.id} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{appointment.time}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-white">{appointment.client.name}</div>
                              <div className="text-xs text-gray-400 flex items-center mt-1">
                                <PhoneIcon className="h-3 w-3 mr-1" />
                                {appointment.client.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{appointment.service.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{appointment.barber.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400 flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {appointment.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(appointment.display_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-400">
                            {formatCurrency(appointment.service.price)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Auto-refreshing every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

// Missing icon imports
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
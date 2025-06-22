'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'
import ModernCalendar from '@/components/ModernCalendar'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

interface TodayStats {
  total_appointments: number
  upcoming_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  today_revenue: number
}

interface BarberInfo {
  id: string
  first_name: string
  last_name: string
  is_active: boolean
}

interface WeeklyStats {
  payout_amount: number
  payout_date: string
  total_appointments: number
  revenue_change: number
}

interface DashboardCard {
  title: string
  description: string
  href: string
  icon: any
  color: string
  stats: string
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [activeBarbers, setActiveBarbers] = useState<number>(0)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // DEMO MODE: Skip authentication checks
    const demoUser = {
      id: '1',
      email: 'demo@6fb.com',
      first_name: 'Demo',
      last_name: 'User',
      role: 'admin'
    }

    setUser(demoUser)
    fetchDashboardData('demo-token')
    setLoading(false)
  }, [mounted])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchDashboardData = async (token: string) => {
    try {
      // Try to fetch authenticated data first
      const appointmentsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboard/appointments/today`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (appointmentsResponse.data.stats) {
        // Map backend stats to frontend format
        const stats = appointmentsResponse.data.stats
        setTodayStats({
          total_appointments: stats.total,
          upcoming_appointments: stats.upcoming,
          completed_appointments: stats.completed,
          cancelled_appointments: stats.cancelled,
          today_revenue: stats.revenue
        })
      }

      // Fetch barber list
      const barbersResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/barbers`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      const activeBarbersCount = barbersResponse.data.filter(
        (barber: BarberInfo) => barber.is_active
      ).length
      setActiveBarbers(activeBarbersCount)

      // Set weekly stats (mock for now)
      setWeeklyStats({
        payout_amount: 1200,
        payout_date: 'Thursday',
        total_appointments: 45,
        revenue_change: 12.5
      })

    } catch (error) {
      console.error('Failed to fetch authenticated data, trying demo endpoints...')

      // Use demo endpoints when authentication fails
      try {
        const demoAppointmentsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboard/demo/appointments/today`
        )

        if (demoAppointmentsResponse.data.stats) {
          const stats = demoAppointmentsResponse.data.stats
          setTodayStats({
            total_appointments: stats.total,
            upcoming_appointments: stats.upcoming,
            completed_appointments: stats.completed,
            cancelled_appointments: stats.cancelled,
            today_revenue: stats.revenue
          })
        }

        const demoBarbersResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboard/demo/barbers`
        )

        const activeBarbersCount = demoBarbersResponse.data.filter(
          (barber: BarberInfo) => barber.is_active
        ).length
        setActiveBarbers(activeBarbersCount)

      } catch (demoError) {
        console.error('Demo endpoints also failed, using fallback data:', demoError)
        // Use fallback mock data when everything fails
        setTodayStats({
          total_appointments: 8,
          upcoming_appointments: 2,
          completed_appointments: 6,
          cancelled_appointments: 0,
          today_revenue: 0
        })
        setActiveBarbers(3)
      }

      // Set weekly stats (mock for now)
      setWeeklyStats({
        payout_amount: 1200,
        payout_date: 'Thursday',
        total_appointments: 45,
        revenue_change: 12.5
      })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Remove the dashboard cards array as we're using a new layout

  // Show dashboard immediately with mock data if not loaded
  const currentUser = user || {
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin'
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {currentUser.first_name}!
              </h1>
              <p className="text-gray-400">
                Here's what's happening with your barbershop today.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all duration-200 shadow-lg">
                Quick Actions
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200">
                <PlusIcon className="h-5 w-5" />
                <span>New Appointment</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics - Dark Theme Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Today's Revenue */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  +12.5%
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">Today's Revenue</p>
              <p className="text-2xl font-bold text-white">
                {todayStats ? formatCurrency(todayStats.today_revenue) : '$0'}
              </p>
              <div className="mt-3 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Appointments */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                  Active
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">Appointments</p>
              <p className="text-2xl font-bold text-white">
                {todayStats ? todayStats.total_appointments : 8}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <p className="text-xs text-purple-400">
                  {todayStats ? `${todayStats.completed_appointments} completed, ${todayStats.upcoming_appointments} upcoming` : '6 completed, 2 upcoming'}
                </p>
              </div>
            </div>
          </div>

          {/* Active Barbers */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                  Online
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">Active Barbers</p>
              <p className="text-2xl font-bold text-white">
                {activeBarbers || 3}
              </p>
              <p className="text-xs text-blue-400 mt-1">All team members active</p>
            </div>
          </div>

          {/* Weekly Payout */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-orange-500/50 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
                <BanknotesIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">
                  Next: Thu
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">Weekly Payout</p>
              <p className="text-2xl font-bold text-white">
                ${weeklyStats ? weeklyStats.payout_amount.toLocaleString() : '1,200'}
              </p>
              <p className="text-xs text-orange-400 mt-1">Auto-payout enabled</p>
            </div>
          </div>
        </div>

        {/* Calendar/Schedule Section */}
        <div className="mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Today's Schedule</h2>
              <button className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
                View Full Calendar →
              </button>
            </div>
            <div className="space-y-4">
              {/* Appointment Slots */}
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-400">9:00 AM</p>
                    <p className="text-xs text-gray-500">45 min</p>
                  </div>
                  <div className="h-8 w-px bg-gray-700"></div>
                  <div>
                    <p className="font-medium text-white">Haircut & Beard Trim</p>
                    <p className="text-sm text-gray-400">John Smith • Barber: Marcus</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                    Confirmed
                  </span>
                  <span className="text-sm font-medium text-white">$65</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-400">10:30 AM</p>
                    <p className="text-xs text-gray-500">30 min</p>
                  </div>
                  <div className="h-8 w-px bg-gray-700"></div>
                  <div>
                    <p className="font-medium text-white">Haircut</p>
                    <p className="text-sm text-gray-400">Michael Johnson • Barber: Alex</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                    In Progress
                  </span>
                  <span className="text-sm font-medium text-white">$45</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-400">12:00 PM</p>
                    <p className="text-xs text-gray-500">60 min</p>
                  </div>
                  <div className="h-8 w-px bg-gray-700"></div>
                  <div>
                    <p className="font-medium text-white">Color & Style</p>
                    <p className="text-sm text-gray-400">Sarah Wilson • Barber: Jordan</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">
                    Upcoming
                  </span>
                  <span className="text-sm font-medium text-white">$120</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <a
            href="/dashboard/appointments"
            className="group bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-violet-500/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400 group-hover:text-violet-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-400 transition-colors">
              Manage Appointments
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              View and manage today's schedule
            </p>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="w-0 group-hover:w-full h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"></div>
            </div>
          </a>

          <a
            href="/barbers"
            className="group bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
              Team Management
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Manage barbers and payment accounts
            </p>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="w-0 group-hover:w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"></div>
            </div>
          </a>

          <a
            href="/analytics"
            className="group bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400 group-hover:text-green-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-green-400 transition-colors">
              Analytics Dashboard
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Track performance and insights
            </p>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="w-0 group-hover:w-full h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"></div>
            </div>
          </a>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/payments"
            className="group bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-emerald-500/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                <CreditCardIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-emerald-400 transition-colors">Payments</span>
            </div>
          </a>

          <a
            href="/dashboard/calendar"
            className="group bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-blue-400 transition-colors">Calendar</span>
            </div>
          </a>

          <a
            href="/barber-payments"
            className="group bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-orange-500/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg">
                <BanknotesIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-orange-400 transition-colors">Payouts</span>
            </div>
          </a>

          <a
            href="/communications"
            className="group bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-purple-500/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-purple-400 transition-colors">Communications</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

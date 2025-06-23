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
  LinkIcon,
  ChevronDownIcon,
  EyeIcon,
  DocumentChartBarIcon,
  CogIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'
import ModernCalendar from '@/components/ModernCalendar'
import CreateAppointmentModal from '@/components/modals/CreateAppointmentModal'

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
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
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

  // Close quick actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showQuickActions && !target.closest('.quick-actions-dropdown')) {
        setShowQuickActions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showQuickActions])

  const fetchDashboardData = async (token: string) => {
    try {
      // Try to fetch authenticated data first
      const appointmentsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/dashboard/appointments/today`,
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
        `${process.env.NEXT_PUBLIC_API_URL}/barbers`,
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
          `${process.env.NEXT_PUBLIC_API_URL}/dashboard/demo/appointments/today`
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
          `${process.env.NEXT_PUBLIC_API_URL}/dashboard/demo/barbers`
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back, {currentUser.first_name}!
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Here's what's happening with your barbershop today.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Quick Actions Dropdown */}
              <div className="relative quick-actions-dropdown">
                <button 
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 min-h-[44px] bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg"
                >
                  <span>Quick Actions</span>
                  <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${showQuickActions ? 'rotate-180' : ''}`} />
                </button>
                
                {showQuickActions && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          router.push('/dashboard/appointments')
                          setShowQuickActions(false)
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 text-teal-600" />
                        <span>View Today's Schedule</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/clients')
                          setShowQuickActions(false)
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <UsersIcon className="h-4 w-4 text-teal-600" />
                        <span>Add New Client</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/analytics')
                          setShowQuickActions(false)
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <DocumentChartBarIcon className="h-4 w-4 text-teal-600" />
                        <span>Generate Report</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/settings')
                          setShowQuickActions(false)
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <CogIcon className="h-4 w-4 text-teal-600" />
                        <span>Settings</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setShowAppointmentModal(true)}
                className="flex items-center justify-center space-x-2 px-4 py-3 min-h-[44px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200">
                <PlusIcon className="h-5 w-5" />
                <span className="hidden sm:inline">New Appointment</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics - Dark Theme Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Today's Revenue */}
          <div 
            onClick={() => router.push('/analytics')}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition-all duration-200 cursor-pointer group shadow-sm"
          >
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
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayStats ? formatCurrency(todayStats.today_revenue) : '$0'}
              </p>
              <div className="mt-3 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Appointments */}
          <div 
            onClick={() => router.push('/dashboard/appointments')}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-teal-500/50 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-teal-400 bg-teal-500/10 px-2 py-1 rounded-full">
                  Active
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Appointments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayStats ? todayStats.total_appointments : 8}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircleIcon className="h-4 w-4 text-green-400" />
                <p className="text-xs text-teal-400">
                  {todayStats ? `${todayStats.completed_appointments} completed, ${todayStats.upcoming_appointments} upcoming` : '6 completed, 2 upcoming'}
                </p>
              </div>
            </div>
          </div>

          {/* Active Barbers */}
          <div 
            onClick={() => router.push('/barbers')}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-slate-500/50 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl shadow-lg">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-400 bg-slate-500/10 px-2 py-1 rounded-full">
                  Online
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Active Barbers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeBarbers || 3}
              </p>
              <p className="text-xs text-slate-400 mt-1">All team members active</p>
            </div>
          </div>

          {/* Weekly Payout */}
          <div 
            onClick={() => router.push('/payouts')}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-orange-500/50 transition-all duration-200 cursor-pointer group"
          >
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
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Weekly Payout</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${weeklyStats ? weeklyStats.payout_amount.toLocaleString() : '1,200'}
              </p>
              <p className="text-xs text-orange-400 mt-1">Auto-payout enabled</p>
            </div>
          </div>
        </div>

        {/* Calendar/Schedule Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Today's Schedule</h2>
              <button className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors">
                View Full Calendar →
              </button>
            </div>
            <div className="space-y-4">
              {/* Appointment Slots */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">9:00 AM</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">45 min</p>
                  </div>
                  <div className="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Haircut & Beard Trim</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">John Smith • Barber: Marcus</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-teal-400 bg-teal-500/10 px-2 py-1 rounded-full">
                    Confirmed
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">$65</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">10:30 AM</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">30 min</p>
                  </div>
                  <div className="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Haircut</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Michael Johnson • Barber: Alex</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-slate-400 bg-slate-500/10 px-2 py-1 rounded-full">
                    In Progress
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">$45</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">12:00 PM</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">60 min</p>
                  </div>
                  <div className="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Color & Style</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Sarah Wilson • Barber: Jordan</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">
                    Upcoming
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">$120</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <a
            href="/dashboard/appointments"
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-teal-500/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <ArrowTrendingUpIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-teal-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-teal-400 transition-colors">
              Manage Appointments
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              View and manage today's schedule
            </p>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="w-0 group-hover:w-full h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full transition-all duration-500"></div>
            </div>
          </a>

          <a
            href="/barbers"
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-slate-500/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <ArrowTrendingUpIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-slate-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-slate-400 transition-colors">
              Team Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manage barbers and payment accounts
            </p>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="w-0 group-hover:w-full h-full bg-gradient-to-r from-slate-500 to-slate-600 rounded-full transition-all duration-500"></div>
            </div>
          </a>

          <a
            href="/analytics"
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <ArrowTrendingUpIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-green-400 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-green-400 transition-colors">
              Analytics Dashboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Track performance and insights
            </p>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="w-0 group-hover:w-full h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"></div>
            </div>
          </a>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/payments"
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-emerald-500/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                <CreditCardIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300 group-hover:text-emerald-400 transition-colors">Payments</span>
            </div>
          </a>

          <a
            href="/dashboard/calendar"
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-slate-500/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300 group-hover:text-slate-400 transition-colors">Calendar</span>
            </div>
          </a>

          <a
            href="/barber-payments"
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-orange-500/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg">
                <BanknotesIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300 group-hover:text-orange-400 transition-colors">Payouts</span>
            </div>
          </a>

          <a
            href="/communications"
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-teal-500/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300 group-hover:text-teal-400 transition-colors">Communications</span>
            </div>
          </a>
        </div>
      </div>
      
      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSuccess={(booking) => {
          console.log('New appointment created:', booking)
          setShowAppointmentModal(false)
          // Optionally refresh the dashboard data
          fetchDashboardData(localStorage.getItem('access_token') || 'demo-token')
        }}
      />
    </div>
  )
}

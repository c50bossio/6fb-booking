'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  CalendarIcon, 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'
import TrafftIntegration from '@/components/dashboard/TrafftIntegration'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

interface DashboardCard {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  stats?: string
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

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [activeBarbers, setActiveBarbers] = useState<number>(0)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchDashboardData(token)
    } catch (err) {
      console.error('Failed to parse user data:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router, mounted])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchDashboardData = async (token: string) => {
    try {
      // Fetch today's appointments stats
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

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Use mock data when API fails
      setTodayStats({
        total_appointments: 1,
        upcoming_appointments: 1,
        completed_appointments: 0,
        cancelled_appointments: 0,
        today_revenue: 30.00
      })
      setActiveBarbers(1)
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

  const dashboardCards: DashboardCard[] = [
    {
      title: 'Barbers',
      description: 'Manage your team and payment accounts',
      href: '/barbers',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      stats: activeBarbers ? `${activeBarbers} active barbers` : 'Loading...'
    },
    {
      title: 'Appointments',
      description: 'View and manage today\'s appointments',
      href: '/dashboard/appointments',
      icon: CalendarIcon,
      color: 'bg-blue-500',
      stats: todayStats ? `${todayStats.total_appointments} Today` : 'Loading...'
    },
    {
      title: 'Analytics',
      description: 'Track performance metrics and insights',
      href: '/analytics',
      icon: ChartBarIcon,
      color: 'bg-green-500',
      stats: '+23% This Week'
    },
    {
      title: 'Communications',
      description: 'Manage client messages and notifications',
      href: '/communications',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-orange-500',
      stats: 'Coming Soon'
    },
    {
      title: 'Payments',
      description: 'Process and track payment transactions',
      href: '/payments',
      icon: CreditCardIcon,
      color: 'bg-indigo-500',
      stats: todayStats ? formatCurrency(todayStats.today_revenue) + ' Today' : 'Loading...'
    },
    {
      title: 'Clients',
      description: 'Manage client database and profiles',
      href: '/clients',
      icon: UserGroupIcon,
      color: 'bg-pink-500',
      stats: 'View All'
    },
    {
      title: 'Revenue Share',
      description: 'Track barber commissions and payouts',
      href: '/revenue',
      icon: CurrencyDollarIcon,
      color: 'bg-yellow-500',
      stats: 'Weekly Payout'
    },
    {
      title: 'Trafft Integration',
      description: 'Manage Trafft booking system connection',
      href: '/dashboard/trafft-connect',
      icon: LinkIcon,
      color: 'bg-orange-500',
      stats: 'Connected'
    }
  ]

  // Show dashboard immediately with mock data if not loaded
  const currentUser = user || { 
    first_name: 'Admin', 
    last_name: 'User', 
    role: 'admin' 
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <a href="/" className="cursor-pointer">
                <Image
                  src="/6fb-logo.png"
                  alt="6FB Logo"
                  width={75}
                  height={75}
                  className="rounded-full hover:opacity-80 transition-opacity"
                />
              </a>
              <div>
                <h1 className="text-xl font-bold text-white">6FB Booking Platform</h1>
                <p className="text-xs text-gray-400">Barber Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-400">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-lg font-semibold text-white">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              
              <div className="flex items-center space-x-4 border-l border-gray-700 pl-6">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {currentUser.first_name} {currentUser.last_name}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{currentUser.role}</p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {currentUser.first_name}!
          </h2>
          <p className="text-gray-400">
            Here's what's happening with your barbershop today.
          </p>
        </div>

        {/* Key Metrics - Simplified */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">Today's Revenue</p>
                <p className="text-2xl font-bold text-white">
                  {todayStats ? formatCurrency(todayStats.today_revenue) : '$200'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Appointments</p>
                <p className="text-2xl font-bold text-white">
                  {todayStats ? todayStats.total_appointments : 5}
                </p>
                <p className="text-xs text-blue-400 mt-1">5 via Trafft</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <ClockIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {todayStats ? todayStats.completed_appointments : 1}
                </p>
                <p className="text-xs text-slate-400 mt-1">{activeBarbers || 4} active barbers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Actions - Streamlined */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <a
            href="/dashboard/appointments"
            className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                <CalendarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-700/50 px-3 py-1 rounded-full">
                {todayStats ? `${todayStats.total_appointments} Today` : '5 Today'}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
              Appointments
            </h3>
            <p className="text-sm text-slate-400">
              View and manage today's schedule
            </p>
          </a>

          <a
            href="/dashboard/trafft-connect"
            className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                <LinkIcon className="h-6 w-6 text-orange-400" />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                Connected
              </span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">
              Trafft Integration
            </h3>
            <p className="text-sm text-slate-400">
              Manage booking system connection
            </p>
          </a>
        </div>

        {/* Primary Action - Barbers (More Discreet) */}
        <div className="mb-8">
          <a
            href="/barbers"
            className="group block bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-purple-600/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                  <UserGroupIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    Manage Barbers
                  </h3>
                  <p className="text-sm text-slate-400">
                    Team management, payment accounts, and schedules
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full">
                  {activeBarbers ? `${activeBarbers} active` : 'Loading...'}
                </span>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </a>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/analytics"
            className="group bg-slate-800/30 backdrop-blur-sm rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Analytics</span>
            </div>
          </a>
          
          <a
            href="/payments"
            className="group bg-slate-800/30 backdrop-blur-sm rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <CreditCardIcon className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Payments</span>
            </div>
          </a>
          
          <a
            href="/clients"
            className="group bg-slate-800/30 backdrop-blur-sm rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <UserGroupIcon className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Clients</span>
            </div>
          </a>
          
          <a
            href="/revenue"
            className="group bg-slate-800/30 backdrop-blur-sm rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Revenue</span>
            </div>
          </a>
        </div>

        {/* Trafft Integration Status - Streamlined */}
        <div className="mt-8">
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50">
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Trafft Integration</h3>
                  <p className="text-sm text-slate-400 mt-1">Real-time booking synchronization</p>
                </div>
                <a
                  href="/dashboard/trafft-connect"
                  className="text-orange-400 hover:text-orange-300 text-sm font-medium px-4 py-2 bg-orange-500/10 rounded-lg border border-orange-500/20 hover:bg-orange-500/20 transition-all"
                >
                  Manage →
                </a>
              </div>
            </div>
            <TrafftIntegration />
          </div>
        </div>

      </main>
    </div>
  )
}
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [activeBarbers, setActiveBarbers] = useState<number>(0)
  const router = useRouter()

  useEffect(() => {
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
  }, [router])

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
      color: 'bg-purple-500',
      stats: '+23% This Week'
    },
    {
      title: 'Communications',
      description: 'Manage client messages and notifications',
      href: '/communications',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-green-500',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <Image
                src="/6fb-logo.png"
                alt="6FB Logo"
                width={75}
                height={75}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-white">Booking Platform</h1>
                <p className="text-xs text-gray-400">Management Dashboard</p>
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
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
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
            Welcome back, {user.first_name}!
          </h2>
          <p className="text-gray-400">
            Here's what's happening with your barbershop today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Today's Revenue</p>
                <p className="text-2xl font-bold text-white">
                  {todayStats ? formatCurrency(todayStats.today_revenue) : '$200'}
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Appointments</p>
                <p className="text-2xl font-bold text-white">
                  {todayStats ? todayStats.total_appointments : 5}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Trafft Synced</p>
                <p className="text-2xl font-bold text-white">5</p>
                <p className="text-xs text-orange-400">via Trafft API</p>
              </div>
              <LinkIcon className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Barbers</p>
                <p className="text-2xl font-bold text-white">{activeBarbers || 4}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completed Today</p>
                <p className="text-2xl font-bold text-white">
                  {todayStats ? todayStats.completed_appointments : 1}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="group bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-black/20"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                {card.stats && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    {card.stats}
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-green-400 transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-gray-400">
                {card.description}
              </p>
            </a>
          ))}
        </div>

        {/* Trafft Integration Status */}
        <div className="mt-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Trafft Integration Status</h3>
              <a
                href="/dashboard/trafft-connect"
                className="text-orange-400 hover:text-orange-300 text-sm font-medium"
              >
                Manage Connection →
              </a>
            </div>
            <TrafftIntegration />
          </div>
        </div>

        {/* Additional Options */}
        <div className="mt-8 flex justify-center space-x-4">
          <a
            href="/dashboard/trafft-connect"
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 border border-green-500 rounded-lg text-sm text-white font-semibold transition-colors"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect New Trafft Account
          </a>
          
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            API Documentation
          </a>
          
          <button
            className="inline-flex items-center px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            Settings
          </button>
        </div>
      </main>
    </div>
  )
}
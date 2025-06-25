'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  CalendarIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  BanknotesIcon,
  ClockIcon,
  EyeIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'

// Import our enhanced chart components
import AnimatedKPICard from '@/components/charts/AnimatedKPICard'
import RevenueTrendChart from '@/components/charts/RevenueTrendChart'
import ServicePopularityChart from '@/components/charts/ServicePopularityChart'
import AppointmentDistributionChart from '@/components/charts/AppointmentDistributionChart'
import PeakHoursHeatmap from '@/components/charts/PeakHoursHeatmap'
import CreateAppointmentModal from '@/components/modals/CreateAppointmentModal'
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton'

interface DashboardData {
  todayStats: {
    total_appointments: number
    upcoming_appointments: number
    completed_appointments: number
    cancelled_appointments: number
    today_revenue: number
  }
  activeBarbers: number
  weeklyStats: {
    payout_amount: number
    payout_date: string
    total_appointments: number
    revenue_change: number
  }
  revenueData: Array<{
    date: string
    revenue: number
    services: number
    products: number
    tips: number
    target: number
  }>
  serviceData: Array<{
    name: string
    bookings: number
    revenue: number
    averagePrice: number
    growth: number
  }>
  appointmentDistribution: Array<{
    status: string
    count: number
    percentage: number
  }>
  peakHoursData: Array<{
    day: string
    hour: number
    bookings: number
    revenue: number
  }>
}

export default function EnhancedDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Try to fetch real data from API endpoints
      try {
        const [todayResponse, weeklyResponse] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/demo/appointments/today`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/analytics/metrics`)
        ])

        // Use real data if available, otherwise fall back to mock data
        const realData = todayResponse.data

        setData({
          todayStats: realData.stats || generateMockTodayStats(),
          activeBarbers: 4,
          weeklyStats: generateMockWeeklyStats(),
          revenueData: generateRevenueData(),
          serviceData: generateServiceData(),
          appointmentDistribution: generateAppointmentDistribution(),
          peakHoursData: generatePeakHoursData()
        })
      } catch (error) {
        console.log('Using mock data due to API error:', error)

        // Generate comprehensive mock data
        setData({
          todayStats: generateMockTodayStats(),
          activeBarbers: 4,
          weeklyStats: generateMockWeeklyStats(),
          revenueData: generateRevenueData(),
          serviceData: generateServiceData(),
          appointmentDistribution: generateAppointmentDistribution(),
          peakHoursData: generatePeakHoursData()
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Mock data generators
  const generateMockTodayStats = () => ({
    total_appointments: 12,
    upcoming_appointments: 4,
    completed_appointments: 6,
    cancelled_appointments: 2,
    today_revenue: 1435
  })

  const generateMockWeeklyStats = () => ({
    payout_amount: 1200,
    payout_date: 'Thursday',
    total_appointments: 45,
    revenue_change: 12.5
  })

  const generateRevenueData = () => {
    const data = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      const baseRevenue = 800 + Math.random() * 600
      const weekend = date.getDay() === 0 || date.getDay() === 6
      const revenue = weekend ? baseRevenue * 1.3 : baseRevenue

      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round(revenue),
        services: Math.round(revenue * 0.7),
        products: Math.round(revenue * 0.2),
        tips: Math.round(revenue * 0.1),
        target: 1000
      })
    }
    return data
  }

  const generateServiceData = () => [
    { name: 'Haircut & Beard Trim', bookings: 145, revenue: 8750, averagePrice: 65, growth: 8.2 },
    { name: 'Haircut', bookings: 89, revenue: 4005, averagePrice: 45, growth: 5.1 },
    { name: 'Beard Trim', bookings: 67, revenue: 2010, averagePrice: 30, growth: -2.3 },
    { name: 'Color & Style', bookings: 34, revenue: 4080, averagePrice: 120, growth: 15.7 },
    { name: 'Hot Towel Shave', bookings: 23, revenue: 1380, averagePrice: 60, growth: 3.4 },
    { name: 'Eyebrow Trim', bookings: 18, revenue: 360, averagePrice: 20, growth: 12.1 }
  ]

  const generateAppointmentDistribution = () => [
    { status: 'Completed', count: 156, percentage: 68.1 },
    { status: 'Upcoming', count: 42, percentage: 18.3 },
    { status: 'Cancelled', count: 21, percentage: 9.2 },
    { status: 'No Show', count: 10, percentage: 4.4 }
  ]

  const generatePeakHoursData = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const data = []

    days.forEach(day => {
      for (let hour = 9; hour <= 20; hour++) {
        const isWeekend = day === 'Saturday' || day === 'Sunday'
        const isPeakHour = hour >= 10 && hour <= 18

        let baseBookings = 2
        if (isPeakHour) baseBookings += 3
        if (isWeekend) baseBookings += 2

        const bookings = Math.max(0, baseBookings + Math.floor(Math.random() * 4) - 1)

        data.push({
          day,
          hour,
          bookings,
          revenue: bookings * (50 + Math.random() * 30)
        })
      }
    })

    return data
  }

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium">Failed to load dashboard data</div>
          <button
            onClick={() => fetchDashboardData()}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Enhanced Dashboard
              </h1>
              <p className="text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                <span>Real-time insights and analytics for your barbershop</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  • Last updated: {currentTime.toLocaleTimeString()}
                </span>
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${
                  refreshing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => router.push('/analytics')}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-cyan-700 transition-all duration-200"
              >
                <ChartBarIcon className="h-4 w-4" />
                <span>Full Analytics</span>
              </button>
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <PlusIcon className="h-4 w-4" />
                <span>New Appointment</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AnimatedKPICard
            title="Today's Revenue"
            value={data.todayStats.today_revenue}
            previousValue={1200}
            prefix="$"
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            color="#10b981"
            trend="up"
            trendValue={data.weeklyStats.revenue_change}
            trendData={data.revenueData.slice(-7).map(d => ({ value: d.revenue }))}
            onClick={() => router.push('/analytics')}
            loading={refreshing}
          />

          <AnimatedKPICard
            title="Appointments Today"
            value={data.todayStats.total_appointments}
            previousValue={8}
            icon={<CalendarIcon className="h-6 w-6" />}
            color="#0d9488"
            trend="up"
            trendValue={5.2}
            onClick={() => router.push('/dashboard/appointments')}
            loading={refreshing}
          />

          <AnimatedKPICard
            title="Active Barbers"
            value={data.activeBarbers}
            icon={<UserGroupIcon className="h-6 w-6" />}
            color="#6b7280"
            trend="neutral"
            onClick={() => router.push('/barbers')}
            loading={refreshing}
          />

          <AnimatedKPICard
            title="Weekly Payout"
            value={data.weeklyStats.payout_amount}
            prefix="$"
            icon={<BanknotesIcon className="h-6 w-6" />}
            color="#f59e0b"
            trend="up"
            trendValue={8.7}
            onClick={() => router.push('/payouts')}
            loading={refreshing}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RevenueTrendChart
            data={data.revenueData}
            title="Revenue Trends"
            subtitle="30-day revenue performance with targets"
            showTarget={true}
            showBreakdown={false}
            height={350}
            loading={refreshing}
          />

          <ServicePopularityChart
            data={data.serviceData}
            title="Service Popularity"
            subtitle="Top performing services by revenue"
            sortBy="revenue"
            height={350}
            loading={refreshing}
          />

          <AppointmentDistributionChart
            data={data.appointmentDistribution}
            title="Appointment Status"
            subtitle="Distribution of appointment outcomes"
            height={350}
            loading={refreshing}
          />

          <PeakHoursHeatmap
            data={data.peakHoursData}
            title="Peak Hours Analysis"
            subtitle="Busy times throughout the week"
            metric="bookings"
            height={350}
            loading={refreshing}
          />
        </div>

        {/* Today's Schedule Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Today's Schedule</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {data.todayStats.completed_appointments} completed • {data.todayStats.upcoming_appointments} upcoming
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/calendar')}
              className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors"
            >
              View Full Calendar →
            </button>
          </div>

          <div className="space-y-4">
            {/* Sample appointments with more realistic data */}
            {[
              { time: '9:00 AM', duration: '45 min', service: 'Haircut & Beard Trim', client: 'John Smith', barber: 'Marcus', status: 'Confirmed', price: 65, statusColor: 'teal' },
              { time: '10:30 AM', duration: '30 min', service: 'Haircut', client: 'Michael Johnson', barber: 'Alex', status: 'In Progress', price: 45, statusColor: 'blue' },
              { time: '12:00 PM', duration: '60 min', service: 'Color & Style', client: 'Sarah Wilson', barber: 'Jordan', status: 'Upcoming', price: 120, statusColor: 'yellow' },
              { time: '2:30 PM', duration: '30 min', service: 'Beard Trim', client: 'David Brown', barber: 'Marcus', status: 'Upcoming', price: 30, statusColor: 'yellow' }
            ].map((appointment, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => router.push(`/appointments/${index + 1}`)}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{appointment.time}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{appointment.duration}</p>
                  </div>
                  <div className="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{appointment.service}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{appointment.client} • Barber: {appointment.barber}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    appointment.statusColor === 'teal' ? 'text-teal-400 bg-teal-500/10' :
                    appointment.statusColor === 'blue' ? 'text-blue-400 bg-blue-500/10' :
                    'text-yellow-400 bg-yellow-500/10'
                  }`}>
                    {appointment.status}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">${appointment.price}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSuccess={(booking) => {
          console.log('New appointment created:', booking)
          setShowAppointmentModal(false)
          fetchDashboardData()
        }}
      />
    </div>
  )
}

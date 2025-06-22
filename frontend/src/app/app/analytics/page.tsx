'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Activity,
  Download,
  Filter,
  Target,
  BarChart3,
  TrendingDown,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react'

// Enhanced Analytics Dashboard with Full Interactivity
export default function AnalyticsPage() {
  const [selectedDateRange, setSelectedDateRange] = useState('30days')
  const [selectedBarber, setSelectedBarber] = useState('all')
  const [selectedService, setSelectedService] = useState('all')
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true)
  const [showExportSuccess, setShowExportSuccess] = useState(false)
  const [animatedMetrics, setAnimatedMetrics] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    activeClients: 0,
    avgBookingValue: 0,
    conversionRate: 0,
    clientRetention: 0,
    sixFbScore: 0
  })

  // Simulated data that updates in real-time
  const [realtimeData, setRealtimeData] = useState({
    totalRevenue: 47250,
    totalBookings: 284,
    activeClients: 156,
    avgBookingValue: 166.37,
    conversionRate: 68.5,
    clientRetention: 85.2,
    sixFbScore: 87.3,
    revenueGrowth: 12.5,
    bookingGrowth: 8.7,
    clientGrowth: 15.3,
    valueGrowth: 4.2
  })

  // Simulated barber data
  const barberData = [
    { id: 'all', name: 'All Barbers', bookings: 284, revenue: 47250 },
    { id: 'john', name: 'John Smith', bookings: 95, revenue: 15800 },
    { id: 'mike', name: 'Mike Johnson', bookings: 87, revenue: 14200 },
    { id: 'sarah', name: 'Sarah Davis', bookings: 74, revenue: 12100 },
    { id: 'alex', name: 'Alex Wilson', bookings: 28, revenue: 5150 }
  ]

  const serviceData = [
    { id: 'all', name: 'All Services', popularity: 100 },
    { id: 'haircut', name: 'Haircut & Style', popularity: 45 },
    { id: 'beard', name: 'Beard Trim', popularity: 32 },
    { id: 'color', name: 'Hair Color', popularity: 15 },
    { id: 'wash', name: 'Wash & Style', popularity: 8 }
  ]

  const bookingSourceData = [
    { source: 'Direct Booking', count: 128, percentage: 45.1 },
    { source: 'Instagram', count: 76, percentage: 26.8 },
    { source: 'Google', count: 45, percentage: 15.8 },
    { source: 'Referral', count: 23, percentage: 8.1 },
    { source: 'Walk-in', count: 12, percentage: 4.2 }
  ]

  // Revenue forecast data
  const forecastData = [
    { month: 'Jan', actual: 38500, forecast: 42000 },
    { month: 'Feb', actual: 41200, forecast: 44500 },
    { month: 'Mar', actual: 47250, forecast: 48000 },
    { month: 'Apr', actual: null, forecast: 52000 },
    { month: 'May', actual: null, forecast: 55500 },
    { month: 'Jun', actual: null, forecast: 58000 }
  ]

  // Conversion funnel data
  const conversionFunnel = [
    { stage: 'Website Visits', count: 2543, percentage: 100 },
    { stage: 'Service Views', count: 1821, percentage: 71.6 },
    { stage: 'Booking Started', count: 892, percentage: 35.1 },
    { stage: 'Booking Completed', count: 284, percentage: 11.2 },
    { stage: 'Return Clients', count: 156, percentage: 6.1 }
  ]

  // Animate metrics on load and real-time updates
  useEffect(() => {
    const animateToValues = () => {
      const duration = 2000
      const steps = 60
      const interval = duration / steps

      Object.keys(animatedMetrics).forEach(key => {
        const targetValue = realtimeData[key as keyof typeof realtimeData]
        const startValue = animatedMetrics[key as keyof typeof animatedMetrics]
        const increment = (targetValue - startValue) / steps

        let currentStep = 0
        const timer = setInterval(() => {
          currentStep++
          setAnimatedMetrics(prev => ({
            ...prev,
            [key]: Math.round(startValue + (increment * currentStep))
          }))

          if (currentStep >= steps) {
            clearInterval(timer)
          }
        }, interval)
      })
    }

    animateToValues()
  }, [realtimeData])

  // Real-time data simulation
  useEffect(() => {
    if (!isRealTimeEnabled) return

    const interval = setInterval(() => {
      setRealtimeData(prev => ({
        ...prev,
        totalRevenue: prev.totalRevenue + Math.floor(Math.random() * 200),
        totalBookings: prev.totalBookings + (Math.random() > 0.7 ? 1 : 0),
        activeClients: prev.activeClients + (Math.random() > 0.9 ? 1 : 0),
        avgBookingValue: prev.avgBookingValue + (Math.random() - 0.5) * 2,
        conversionRate: Math.max(0, Math.min(100, prev.conversionRate + (Math.random() - 0.5) * 0.5)),
        clientRetention: Math.max(0, Math.min(100, prev.clientRetention + (Math.random() - 0.5) * 0.3)),
        sixFbScore: Math.max(0, Math.min(100, prev.sixFbScore + (Math.random() - 0.5) * 0.2))
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [isRealTimeEnabled])

  // Interactive handlers
  const handleMetricClick = (metric: string) => {
    setSelectedMetric(selectedMetric === metric ? null : metric)
  }

  const handleExport = (type: string) => {
    setShowExportSuccess(true)
    setTimeout(() => setShowExportSuccess(false), 3000)
  }

  const MetricCard = ({
    icon: Icon,
    title,
    value,
    growth,
    color,
    onClick,
    isSelected,
    format = (v: number) => v.toLocaleString()
  }: any) => (
    <motion.div
      className={`rounded-xl p-6 shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${
        theme === 'dark'
          ? (isSelected ? 'bg-gray-800 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600')
          : (isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-100 hover:border-gray-200')
      }`}
      onClick={() => onClick?.(title)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <motion.div
            className="text-2xl font-bold text-gray-900"
            key={value}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {format(value)}
          </motion.div>
          {growth !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growth >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(growth)}% vs last period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )

  const FilterButton = ({ label, value, selectedValue, onChange, options }: any) => (
    <div className="relative">
      <select
        value={selectedValue}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
      >
        {options.map((option: any) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )

  const { theme } = useTheme();

  return (
    <div className={`min-h-screen transition-colors ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Top Controls Bar */}
      <div className={`sticky top-0 z-50 backdrop-blur border-b transition-colors ${theme === 'dark' ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center h-16 space-x-4">
            <motion.button
              onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isRealTimeEnabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <div className={`w-2 h-2 rounded-full ${isRealTimeEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              {isRealTimeEnabled ? 'Live' : 'Paused'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Interactive Filters */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className={`text-3xl font-bold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Interactive Analytics</h2>
              <p className={`mt-1 transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Professional analytics platform with real-time insights</p>
            </div>

            {/* Interactive Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <FilterButton
                label="Date Range"
                selectedValue={selectedDateRange}
                onChange={setSelectedDateRange}
                options={[
                  { id: '7days', name: 'Last 7 Days' },
                  { id: '30days', name: 'Last 30 Days' },
                  { id: '90days', name: 'Last 90 Days' },
                  { id: 'year', name: 'This Year' }
                ]}
              />

              <FilterButton
                label="Barber"
                selectedValue={selectedBarber}
                onChange={setSelectedBarber}
                options={barberData}
              />

              <FilterButton
                label="Service"
                selectedValue={selectedService}
                onChange={setSelectedService}
                options={serviceData}
              />

              <motion.button
                onClick={() => handleExport('pdf')}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </motion.button>
            </div>
          </div>

          {/* Export Success Message */}
          <AnimatePresence>
            {showExportSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2 text-green-700"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Analytics data exported successfully!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Interactive Key Metrics */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          <MetricCard
            icon={DollarSign}
            title="Total Revenue"
            value={animatedMetrics.totalRevenue}
            growth={realtimeData.revenueGrowth}
            color="bg-green-500"
            onClick={handleMetricClick}
            isSelected={selectedMetric === 'Total Revenue'}
            format={(v: number) => `$${v.toLocaleString()}`}
          />
          <MetricCard
            icon={Calendar}
            title="Total Bookings"
            value={animatedMetrics.totalBookings}
            growth={realtimeData.bookingGrowth}
            color="bg-blue-500"
            onClick={handleMetricClick}
            isSelected={selectedMetric === 'Total Bookings'}
          />
          <MetricCard
            icon={Users}
            title="Active Clients"
            value={animatedMetrics.activeClients}
            growth={realtimeData.clientGrowth}
            color="bg-purple-500"
            onClick={handleMetricClick}
            isSelected={selectedMetric === 'Active Clients'}
          />
          <MetricCard
            icon={Target}
            title="6FB Score"
            value={animatedMetrics.sixFbScore}
            growth={2.3}
            color="bg-orange-500"
            onClick={handleMetricClick}
            isSelected={selectedMetric === '6FB Score'}
            format={(v: number) => `${v.toFixed(1)}`}
          />
        </motion.div>

        {/* Interactive Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Forecast Chart */}
          <motion.div
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Revenue Forecast</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Zap className="w-4 h-4" />
                <span>AI Powered</span>
              </div>
            </div>
            <div className="space-y-3">
              {forecastData.map((item, index) => (
                <motion.div
                  key={item.month}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 5 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-medium">{item.month}</span>
                  </div>
                  <div className="text-right">
                    {item.actual && (
                      <div className="text-sm text-gray-900 font-medium">
                        ${item.actual.toLocaleString()}
                      </div>
                    )}
                    <div className={`text-sm ${item.actual ? 'text-gray-500' : 'text-blue-600 font-medium'}`}>
                      Forecast: ${item.forecast.toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Booking Sources */}
          <motion.div
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Sources</h3>
            <div className="space-y-3">
              {bookingSourceData.map((source, index) => (
                <motion.div
                  key={source.source}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `hsl(${index * 70}, 60%, 50%)` }}
                    />
                    <span className="font-medium">{source.source}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-900 font-medium">
                      {source.count} bookings
                    </div>
                    <div className="text-sm text-gray-500">
                      {source.percentage}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Conversion Funnel */}
        <motion.div
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Booking Conversion Funnel</h3>
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>+5.2% this month</span>
            </div>
          </div>
          <div className="space-y-4">
            {conversionFunnel.map((stage, index) => (
              <motion.div
                key={stage.stage}
                className="relative"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                  <div className="text-sm text-gray-500">
                    {stage.count.toLocaleString()} ({stage.percentage}%)
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stage.percentage}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Barber Performance Comparison */}
        <motion.div
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Team Performance</h3>
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Click to drill down</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {barberData.slice(1).map((barber, index) => (
              <motion.div
                key={barber.id}
                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedBarber(barber.id)}
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg mx-auto mb-3">
                    {barber.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{barber.name}</h4>
                  <div className="text-sm text-gray-500">
                    {barber.bookings} bookings
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    ${barber.revenue.toLocaleString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Detailed View for Selected Metric */}
        <AnimatePresence>
          {selectedMetric && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMetric(null)}
            >
              <motion.div
                className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedMetric} Details</h3>
                  <button
                    onClick={() => setSelectedMetric(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Drill-down Analysis</h4>
                    <p className="text-gray-600">
                      This metric shows strong performance with consistent growth trends.
                      Consider expanding successful strategies to maintain momentum.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">+15.3%</div>
                      <div className="text-sm text-gray-500">vs last month</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">+8.7%</div>
                      <div className="text-sm text-gray-500">vs last year</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

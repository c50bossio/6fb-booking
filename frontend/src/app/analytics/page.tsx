'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Users,
  Clock,
  BarChart3,
  Download,
  Filter,
  ChevronRight,
  Activity,
  Target,
  Award,
  AlertCircle
} from 'lucide-react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import apiClient from '@/lib/api/client'
import { formatDate as formatDateDate, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Chart default options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleColor: '#fff',
      bodyColor: '#94a3b8',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(148, 163, 184, 0.1)'
      },
      ticks: {
        color: '#94a3b8'
      }
    },
    y: {
      grid: {
        color: 'rgba(148, 163, 184, 0.1)'
      },
      ticks: {
        color: '#94a3b8'
      }
    }
  }
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  subtitle?: string
}

function MetricCard({ title, value, change, trend, icon, subtitle }: MetricCardProps) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              ) : null}
              <span className={`text-sm ${
                trend === 'up' ? 'text-green-500' : 
                trend === 'down' ? 'text-red-500' : 
                'text-gray-400'
              }`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        <div className="text-blue-500 bg-blue-500/10 rounded-lg p-3">
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  })
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Data states
  const [metrics, setMetrics] = useState<any>(null)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [bookingData, setBookingData] = useState<any[]>([])
  const [serviceData, setServiceData] = useState<any[]>([])
  const [retentionData, setRetentionData] = useState<any>(null)
  const [peakHoursData, setPeakHoursData] = useState<any[]>([])
  const [barberComparison, setBarberComparison] = useState<any[]>([])
  const [sixFBScores, setSixFBScores] = useState<any[]>([])

  // Quick date range presets
  const datePresets = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'This Month', custom: true },
    { label: 'Year to Date', ytd: true }
  ]

  // Fetch all analytics data
  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const startDate = formatDate(dateRange.start, 'yyyy-MM-dd')
      const endDate = formatDate(dateRange.end, 'yyyy-MM-dd')
      const locationParam = selectedLocation ? `&location_id=${selectedLocation}` : ''

      // Fetch all data in parallel
      const [
        metricsRes,
        revenueRes,
        bookingRes,
        serviceRes,
        retentionRes,
        peakHoursRes,
        barberRes
      ] = await Promise.all([
        apiClient.get(`/analytics/metrics?start_date=${startDate}&end_date=${endDate}${locationParam}`),
        apiClient.get(`/analytics/revenue?start_date=${startDate}&end_date=${endDate}${locationParam}`),
        apiClient.get(`/analytics/bookings?start_date=${startDate}&end_date=${endDate}${locationParam}`),
        apiClient.get(`/analytics/services?start_date=${startDate}&end_date=${endDate}${locationParam}`),
        apiClient.get(`/analytics/retention?start_date=${startDate}&end_date=${endDate}${locationParam}`),
        apiClient.get(`/analytics/peak-hours?start_date=${startDate}&end_date=${endDate}${locationParam}`),
        apiClient.get(`/analytics/barber-comparison?start_date=${startDate}&end_date=${endDate}${locationParam}`)
      ])

      setMetrics(metricsRes.data)
      setRevenueData(revenueRes.data)
      setBookingData(bookingRes.data)
      setServiceData(serviceRes.data)
      setRetentionData(retentionRes.data)
      setPeakHoursData(peakHoursRes.data)
      setBarberComparison(barberRes.data)

      // Fetch 6FB scores for top barbers
      const topBarbers = barberRes.data.slice(0, 3)
      const scorePromises = topBarbers.map((barber: any) =>
        apiClient.get(`/analytics/sixfb-score/${barber.id}?period=monthly`)
      )
      const scores = await Promise.all(scorePromises)
      setSixFBScores(scores.map(res => res.data))

    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, selectedLocation])

  // Handle date range changes
  const handleDatePreset = (preset: any) => {
    if (preset.days === 0) {
      const today = new Date()
      setDateRange({ start: today, end: today })
    } else if (preset.days) {
      setDateRange({
        start: subDays(new Date(), preset.days),
        end: new Date()
      })
    } else if (preset.custom) {
      setDateRange({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      })
    } else if (preset.ytd) {
      setDateRange({
        start: new Date(new Date().getFullYear(), 0, 1),
        end: new Date()
      })
    }
  }

  // Export functionality
  const handleExport = async (formatDate: 'csv' | 'pdf' | 'excel') => {
    try {
      const startDate = formatDate(dateRange.start, 'yyyy-MM-dd')
      const endDate = formatDate(dateRange.end, 'yyyy-MM-dd')
      const locationParam = selectedLocation ? `&location_id=${selectedLocation}` : ''
      
      const response = await apiClient.get(
        `/analytics/export?formatDate=${formatDate}&start_date=${startDate}&end_date=${endDate}${locationParam}`,
        { responseType: 'blob' }
      )
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `analytics_${startDate}_${endDate}.${formatDate}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Prepare chart data
  const revenueChartData = {
    labels: revenueData.map(d => formatDate(new Date(d.date), 'MMM d')),
    datasets: [
      {
        label: 'Total Revenue',
        data: revenueData.map(d => d.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const bookingChartData = {
    labels: bookingData.map(d => formatDate(new Date(d.date), 'MMM d')),
    datasets: [
      {
        label: 'Completed',
        data: bookingData.map(d => d.completed),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 4
      },
      {
        label: 'Cancelled',
        data: bookingData.map(d => d.cancelled),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4
      },
      {
        label: 'No Show',
        data: bookingData.map(d => d.no_show),
        backgroundColor: 'rgba(251, 146, 60, 0.8)',
        borderRadius: 4
      }
    ]
  }

  const serviceChartData = {
    labels: serviceData.slice(0, 5).map(s => s.name),
    datasets: [
      {
        data: serviceData.slice(0, 5).map(s => s.revenue),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Track your business performance and insights</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Date presets */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            {datePresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleDatePreset(preset)}
                className="px-3 py-1.5 text-sm rounded-md hover:bg-slate-700 text-gray-300 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
          
          {/* Export dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-gray-300 hover:bg-slate-700 rounded-t-lg"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-2 text-left text-gray-300 hover:bg-slate-700"
              >
                Export as Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-2 text-left text-gray-300 hover:bg-slate-700 rounded-b-lg"
              >
                Export as PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
        {['overview', 'revenue', 'bookings', 'retention', 'barbers'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md capitalize transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={`$${metrics?.totalRevenue?.toLocaleString() || 0}`}
              change={metrics?.revenueGrowth}
              trend={metrics?.revenueGrowth > 0 ? 'up' : 'down'}
              icon={<DollarSign className="w-6 h-6" />}
              subtitle={`Target: $${metrics?.revenueTarget?.toLocaleString() || 0}`}
            />
            <MetricCard
              title="Total Bookings"
              value={metrics?.totalBookings || 0}
              change={metrics?.bookingGrowth}
              trend={metrics?.bookingGrowth > 0 ? 'up' : 'down'}
              icon={<Calendar className="w-6 h-6" />}
              subtitle={`${metrics?.bookingRate || 0}% completion rate`}
            />
            <MetricCard
              title="Active Clients"
              value={metrics?.activeClients || 0}
              change={metrics?.retention - 80}
              trend={metrics?.retention > 80 ? 'up' : 'down'}
              icon={<Users className="w-6 h-6" />}
              subtitle={`${metrics?.retention || 0}% retention`}
            />
            <MetricCard
              title="Utilization Rate"
              value={`${metrics?.utilizationRate || 0}%`}
              trend={metrics?.utilizationRate > 70 ? 'up' : 'down'}
              icon={<Clock className="w-6 h-6" />}
              subtitle="Appointment capacity"
            />
          </div>

          {/* Revenue and Booking Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
              <div className="h-64">
                <Line data={revenueChartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Booking Status</h3>
              <div className="h-64">
                <Bar data={bookingChartData} options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    x: { ...chartOptions.scales.x, stacked: true },
                    y: { ...chartOptions.scales.y, stacked: true }
                  }
                }} />
              </div>
            </div>
          </div>

          {/* Service Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Top Services</h3>
              <div className="h-64">
                <Doughnut data={serviceChartData} options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      display: true,
                      position: 'bottom' as const,
                      labels: {
                        color: '#94a3b8',
                        padding: 10
                      }
                    }
                  }
                }} />
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Service Details</h3>
              <div className="space-y-3">
                {serviceData.slice(0, 5).map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">{service.name}</p>
                      <p className="text-sm text-gray-400">{service.bookings} bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">${service.revenue.toLocaleString()}</p>
                      <p className="text-sm text-gray-400">{service.avg_duration} min avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          {metrics?.insights && metrics.insights.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Insights & Recommendations</h3>
              <div className="space-y-3">
                {metrics.insights.map((insight: any, index: number) => (
                  <div key={index} className={`flex items-start gap-3 p-4 rounded-lg ${
                    insight.type === 'positive' ? 'bg-green-900/20 border border-green-800' :
                    insight.type === 'warning' ? 'bg-yellow-900/20 border border-yellow-800' :
                    'bg-red-900/20 border border-red-800'
                  }`}>
                    <AlertCircle className={`w-5 h-5 mt-0.5 ${
                      insight.type === 'positive' ? 'text-green-500' :
                      insight.type === 'warning' ? 'text-yellow-500' :
                      'text-red-500'
                    }`} />
                    <p className="text-gray-300">{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Breakdown</h3>
              <div className="h-80">
                <Line 
                  data={{
                    labels: revenueData.map(d => formatDate(new Date(d.date), 'MMM d')),
                    datasets: [
                      {
                        label: 'Services',
                        data: revenueData.map(d => d.services),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true
                      },
                      {
                        label: 'Products',
                        data: revenueData.map(d => d.products),
                        borderColor: 'rgb(168, 85, 247)',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        fill: true
                      },
                      {
                        label: 'Tips',
                        data: revenueData.map(d => d.tips),
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true
                      }
                    ]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        display: true,
                        position: 'bottom' as const,
                        labels: {
                          color: '#94a3b8'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">
                    ${revenueData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2 pt-4 border-t border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Services</span>
                    <span className="text-white">
                      ${revenueData.reduce((sum, d) => sum + d.services, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Products</span>
                    <span className="text-white">
                      ${revenueData.reduce((sum, d) => sum + d.products, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tips</span>
                    <span className="text-white">
                      ${revenueData.reduce((sum, d) => sum + d.tips, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-sm text-gray-400 mb-1">Average Transaction</p>
                  <p className="text-xl font-semibold text-white">
                    ${metrics?.avgBookingValue?.toFixed(2) || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Peak hours heatmap */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Peak Hours Heatmap</h3>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-13 gap-1 min-w-[600px]">
                <div></div>
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="text-center text-xs text-gray-400">
                    {i + 9}:00
                  </div>
                ))}
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <>
                    <div key={day} className="text-right text-sm text-gray-400 pr-2">
                      {day}
                    </div>
                    {Array.from({ length: 12 }, (_, hour) => {
                      const data = peakHoursData.find(d => 
                        d.day === day && d.hour === hour + 9
                      )
                      const intensity = data ? Math.min(data.bookings / 10, 1) : 0
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="aspect-square rounded"
                          style={{
                            backgroundColor: intensity > 0
                              ? `rgba(59, 130, 246, ${intensity})`
                              : 'rgba(148, 163, 184, 0.1)'
                          }}
                          title={`${data?.bookings || 0} bookings`}
                        />
                      )
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'retention' && retentionData && (
        <div className="space-y-6">
          {/* Retention metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Overall Retention"
              value={`${retentionData.overallRetention}%`}
              icon={<Activity className="w-6 h-6" />}
            />
            <MetricCard
              title="New Clients"
              value={retentionData.newClients}
              icon={<Users className="w-6 h-6" />}
            />
            <MetricCard
              title="Returning Clients"
              value={retentionData.returningClients}
              icon={<Award className="w-6 h-6" />}
            />
            <MetricCard
              title="Avg Lifetime Value"
              value={`$${retentionData.avgLifetimeValue}`}
              icon={<DollarSign className="w-6 h-6" />}
            />
          </div>

          {/* Retention trend */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Retention Trend</h3>
            <div className="h-64">
              <Line
                data={{
                  labels: retentionData.monthlyRetention.map((d: any) => d.month),
                  datasets: [
                    {
                      label: 'Retention Rate',
                      data: retentionData.monthlyRetention.map((d: any) => d.retention),
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      fill: true
                    },
                    {
                      label: 'Target',
                      data: retentionData.monthlyRetention.map((d: any) => d.target),
                      borderColor: 'rgb(107, 114, 128)',
                      borderDash: [5, 5]
                    }
                  ]
                }}
                options={chartOptions}
              />
            </div>
          </div>

          {/* Client segments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Visit Frequency</h3>
              <div className="space-y-3">
                {retentionData.visitFrequency.map((freq: any) => (
                  <div key={freq.frequency} className="flex items-center justify-between">
                    <span className="text-gray-300">{freq.frequency}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(freq.clients / 280) * 100}%` }}
                        />
                      </div>
                      <span className="text-white font-medium w-12 text-right">
                        {freq.clients}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Client Segments</h3>
              <div className="space-y-3">
                {retentionData.segmentAnalysis.map((segment: any) => (
                  <div key={segment.segment} className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{segment.segment}</span>
                      <span className="text-green-500">{segment.retention}% retention</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Avg spend: ${segment.avgSpend}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'barbers' && (
        <div className="space-y-6">
          {/* Barber comparison table */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Barber Performance Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-700">
                    <th className="pb-3 text-gray-400 font-medium">Barber</th>
                    <th className="pb-3 text-gray-400 font-medium text-right">Bookings</th>
                    <th className="pb-3 text-gray-400 font-medium text-right">Revenue</th>
                    <th className="pb-3 text-gray-400 font-medium text-right">Rating</th>
                    <th className="pb-3 text-gray-400 font-medium text-right">Efficiency</th>
                    <th className="pb-3 text-gray-400 font-medium text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {barberComparison.map((barber) => (
                    <tr key={barber.id} className="border-b border-slate-700/50">
                      <td className="py-3 text-white">{barber.name}</td>
                      <td className="py-3 text-right text-gray-300">{barber.bookings}</td>
                      <td className="py-3 text-right text-gray-300">${barber.revenue.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <span className="text-yellow-500">★</span> {barber.rating}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`${barber.efficiency >= 85 ? 'text-green-500' : 'text-gray-300'}`}>
                          {barber.efficiency}%
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {barber.trend > 0 ? (
                          <span className="text-green-500">+{barber.trend}%</span>
                        ) : (
                          <span className="text-red-500">{barber.trend}%</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6FB Scores */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {sixFBScores.map((score) => (
              <div key={score.barber_id} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-white">{score.barber_name}</h4>
                  <div className="text-2xl font-bold text-blue-500">{score.overall_score}</div>
                </div>
                <div className="space-y-2">
                  {Object.entries(score.components).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (value as number) >= 80 ? 'bg-green-500' :
                              (value as number) >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300 w-8">{value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                {score.improvements_needed.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-sm text-gray-400 mb-2">Areas for improvement:</p>
                    <ul className="space-y-1">
                      {score.improvements_needed.map((improvement: string, idx: number) => (
                        <li key={idx} className="text-xs text-gray-500">• {improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
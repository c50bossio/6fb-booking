'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { getAppointmentPatterns, type BookingResponse } from '@/lib/api'
import { useResponsive } from '@/hooks/useResponsive'
import { Button } from '@/components/ui/Button'

interface CalendarAnalyticsSidebarProps {
  appointments: BookingResponse[]
  selectedDate: Date
  userId?: number
  isOpen?: boolean
  onToggle?: () => void
  position?: 'left' | 'right'
}

interface QuickStats {
  completionRate: number
  noShowRate: number
  peakHour: number | null
  busiestDay: number | null
  totalAppointments: number
  avgDailyAppointments: number
}

export default function CalendarAnalyticsSidebar({
  appointments,
  selectedDate,
  userId,
  isOpen = true,
  onToggle,
  position = 'right'
}: CalendarAnalyticsSidebarProps) {
  const { isMobile, isTablet } = useResponsive()
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState('7d')

  // Calculate quick stats from current appointments
  const quickStats = useMemo((): QuickStats => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })

    // Filter appointments for current week
    const weekAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= weekStart && aptDate <= weekEnd
    })

    // Calculate metrics
    const completed = weekAppointments.filter(apt => apt.status === 'completed').length
    const noShow = weekAppointments.filter(apt => apt.status === 'no_show').length
    const total = weekAppointments.length

    // Hour distribution
    const hourCounts: Record<number, number> = {}
    weekAppointments.forEach(apt => {
      const hour = new Date(apt.start_time).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    // Day distribution
    const dayCounts: Record<number, number> = {}
    weekAppointments.forEach(apt => {
      const day = new Date(apt.start_time).getDay()
      dayCounts[day] = (dayCounts[day] || 0) + 1
    })

    // Find peak hour and busiest day
    const peakHour = Object.entries(hourCounts).reduce((max, [hour, count]) => 
      count > (hourCounts[max] || 0) ? parseInt(hour) : max
    , 0)

    const busiestDay = Object.entries(dayCounts).reduce((max, [day, count]) => 
      count > (dayCounts[max] || 0) ? parseInt(day) : max
    , 0)

    return {
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      peakHour: Object.keys(hourCounts).length > 0 ? peakHour : null,
      busiestDay: Object.keys(dayCounts).length > 0 ? busiestDay : null,
      totalAppointments: total,
      avgDailyAppointments: total / 7
    }
  }, [appointments, selectedDate])

  // Load detailed analytics if user ID is provided
  useEffect(() => {
    if (userId && isOpen) {
      loadAnalytics()
    }
  }, [userId, timeRange, isOpen])

  const loadAnalytics = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const endDate = new Date()
      const startDate = new Date()

      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
      }

      const data = await getAppointmentPatterns(
        userId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      setAnalyticsData(data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Mobile view - bottom sheet
  if (isMobile) {
    if (!isOpen) {
      return (
        <button
          onClick={onToggle}
          className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg flex items-center justify-center hover:bg-primary-700 transform transition-all duration-200"
        >
          <BarChart3 className="w-6 h-6" />
        </button>
      )
    }

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onToggle}
        />

        {/* Bottom Sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[70vh] overflow-hidden transform transition-transform duration-300">
          {/* Handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              Calendar Analytics
            </h3>
            <button
              onClick={onToggle}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto px-4 py-4 space-y-4 max-h-[calc(70vh-5rem)]">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                label="Completion"
                value={`${quickStats.completionRate.toFixed(0)}%`}
                trend={quickStats.completionRate >= 90 ? 'up' : 'down'}
              />
              <MetricCard
                icon={<XCircle className="w-5 h-5 text-red-600" />}
                label="No-Shows"
                value={`${quickStats.noShowRate.toFixed(0)}%`}
                trend={quickStats.noShowRate <= 5 ? 'up' : 'down'}
              />
              <MetricCard
                icon={<Clock className="w-5 h-5 text-blue-600" />}
                label="Peak Hour"
                value={quickStats.peakHour !== null ? formatHour(quickStats.peakHour) : 'N/A'}
              />
              <MetricCard
                icon={<Calendar className="w-5 h-5 text-purple-600" />}
                label="Busiest Day"
                value={quickStats.busiestDay !== null ? daysOfWeek[quickStats.busiestDay] : 'N/A'}
              />
            </div>

            {/* Insights */}
            <InsightsSection
              completionRate={quickStats.completionRate}
              noShowRate={quickStats.noShowRate}
              peakHour={quickStats.peakHour}
              avgDaily={quickStats.avgDailyAppointments}
            />
          </div>
        </div>
      </>
    )
  }

  // Desktop/Tablet sidebar view
  const sidebarWidth = isTablet ? 'w-80' : 'w-96'
  const translateClass = position === 'right' 
    ? (isOpen ? 'translate-x-0' : 'translate-x-full')
    : (isOpen ? 'translate-x-0' : '-translate-x-full')

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className={`fixed top-32 ${position === 'right' ? 'right-0' : 'left-0'} z-40 p-3 bg-white dark:bg-gray-800 shadow-lg rounded-${position === 'right' ? 'l' : 'r'}-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
        >
          <BarChart3 className="w-5 h-5 text-primary-600" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 ${position === 'right' ? 'right-0' : 'left-0'} h-full ${sidebarWidth} bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ${translateClass} z-30 overflow-hidden`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              Calendar Analytics
            </h3>
            <button
              onClick={onToggle}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {position === 'right' ? (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={timeRange === '7d' ? 'primary' : 'outline'}
                onClick={() => setTimeRange('7d')}
              >
                7 Days
              </Button>
              <Button
                size="sm"
                variant={timeRange === '30d' ? 'primary' : 'outline'}
                onClick={() => setTimeRange('30d')}
              >
                30 Days
              </Button>
              <Button
                size="sm"
                variant={timeRange === '90d' ? 'primary' : 'outline'}
                onClick={() => setTimeRange('90d')}
              >
                90 Days
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                label="Completion Rate"
                value={`${quickStats.completionRate.toFixed(0)}%`}
                trend={quickStats.completionRate >= 90 ? 'up' : 'down'}
                fullWidth={false}
              />
              <MetricCard
                icon={<XCircle className="w-5 h-5 text-red-600" />}
                label="No-Show Rate"
                value={`${quickStats.noShowRate.toFixed(0)}%`}
                trend={quickStats.noShowRate <= 5 ? 'up' : 'down'}
                fullWidth={false}
              />
              <MetricCard
                icon={<Clock className="w-5 h-5 text-blue-600" />}
                label="Peak Hour"
                value={quickStats.peakHour !== null ? formatHour(quickStats.peakHour) : 'N/A'}
                fullWidth={false}
              />
              <MetricCard
                icon={<Calendar className="w-5 h-5 text-purple-600" />}
                label="Busiest Day"
                value={quickStats.busiestDay !== null ? daysOfWeek[quickStats.busiestDay] : 'N/A'}
                fullWidth={false}
              />
            </div>

            {/* Weekly Summary */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Week of {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Appointments</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{quickStats.totalAppointments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Daily Average</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{quickStats.avgDailyAppointments.toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            <InsightsSection
              completionRate={quickStats.completionRate}
              noShowRate={quickStats.noShowRate}
              peakHour={quickStats.peakHour}
              avgDaily={quickStats.avgDailyAppointments}
            />

            {/* Loading State for Detailed Analytics */}
            {loading && (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            )}

            {/* Detailed Analytics (when available) */}
            {analyticsData && !loading && (
              <>
                {/* Service Distribution */}
                {analyticsData.service_patterns && Object.keys(analyticsData.service_patterns).length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Top Services
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(analyticsData.service_patterns)
                          .sort((a: any, b: any) => b[1].count - a[1].count)
                          .slice(0, 3)
                          .map(([service, data]: [string, any]) => (
                            <div key={service} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{service}</span>
                              <div className="text-right">
                                <span className="font-semibold text-gray-900 dark:text-white">{data.count}</span>
                                <span className="text-xs text-gray-500 ml-1">({data.percentage.toFixed(0)}%)</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Metric Card Component
function MetricCard({ 
  icon, 
  label, 
  value, 
  trend,
  fullWidth = true 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  trend?: 'up' | 'down'
  fullWidth?: boolean
}) {
  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${fullWidth ? '' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
          </div>
        )}
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {label}
      </div>
    </div>
  )
}

// Insights Section Component
function InsightsSection({ 
  completionRate, 
  noShowRate, 
  peakHour, 
  avgDaily 
}: { 
  completionRate: number
  noShowRate: number
  peakHour: number | null
  avgDaily: number
}) {
  const insights = []

  if (noShowRate > 10) {
    insights.push({
      type: 'warning',
      icon: <AlertCircle className="w-4 h-4 text-orange-500" />,
      text: `High no-show rate (${noShowRate.toFixed(0)}%) - consider deposits`
    })
  }

  if (completionRate >= 95) {
    insights.push({
      type: 'success',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
      text: 'Excellent completion rate!'
    })
  }

  if (peakHour !== null && (peakHour < 10 || peakHour > 17)) {
    insights.push({
      type: 'info',
      icon: <Clock className="w-4 h-4 text-blue-500" />,
      text: 'Consider adjusting hours for peak demand'
    })
  }

  if (avgDaily < 3) {
    insights.push({
      type: 'info',
      icon: <Users className="w-4 h-4 text-purple-500" />,
      text: 'Room to grow - promote available slots'
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: 'success',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
      text: 'Calendar performance looks great!'
    })
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          📊 Quick Insights
        </h4>
        <div className="space-y-2">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              {insight.icon}
              <span className="text-gray-600 dark:text-gray-400">{insight.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
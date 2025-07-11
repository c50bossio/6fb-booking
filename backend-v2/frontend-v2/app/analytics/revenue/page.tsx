'use client'

import React, { useEffect, useState } from 'react'
import { getProfile, type User } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  CurrencyDollarIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  CreditCardIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface RevenuePageProps {}

interface RevenueStats {
  today: number
  yesterday: number
  thisWeek: number
  lastWeek: number
  thisMonth: number
  lastMonth: number
  thisYear: number
  averagePerDay: number
  averagePerAppointment: number
  topServiceRevenue: number
  topServiceName: string
}

interface RevenueBreakdown {
  service: string
  revenue: number
  percentage: number
  trend: 'up' | 'down' | 'neutral'
  trendValue: number
}

export default function RevenuePage({}: RevenuePageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30d')
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null)
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown[]>([])

  // Mock function to generate revenue stats based on user role
  const generateRevenueStats = (userRole: string | undefined): RevenueStats => {
    if (!userRole) return {
      today: 0, yesterday: 0, thisWeek: 0, lastWeek: 0, thisMonth: 0, lastMonth: 0, 
      thisYear: 0, averagePerDay: 0, averagePerAppointment: 0, topServiceRevenue: 0, topServiceName: ''
    }

    const baseMultiplier = userRole === 'enterprise_owner' ? 3.5 : userRole === 'location_manager' ? 1.8 : 1

    return {
      today: Math.round(420 * baseMultiplier),
      yesterday: Math.round(380 * baseMultiplier),
      thisWeek: Math.round(2800 * baseMultiplier),
      lastWeek: Math.round(2600 * baseMultiplier),
      thisMonth: Math.round(12400 * baseMultiplier),
      lastMonth: Math.round(11200 * baseMultiplier),
      thisYear: Math.round(142000 * baseMultiplier),
      averagePerDay: Math.round(410 * baseMultiplier),
      averagePerAppointment: Math.round(85 * baseMultiplier),
      topServiceRevenue: Math.round(4200 * baseMultiplier),
      topServiceName: 'Premium Cut & Style'
    }
  }

  // Mock function to generate revenue breakdown
  const generateRevenueBreakdown = (userRole: string | undefined): RevenueBreakdown[] => {
    const baseMultiplier = userRole === 'enterprise_owner' ? 3.5 : userRole === 'location_manager' ? 1.8 : 1

    return [
      {
        service: 'Premium Cut & Style',
        revenue: Math.round(4200 * baseMultiplier),
        percentage: 35,
        trend: 'up',
        trendValue: 12.5
      },
      {
        service: 'Beard Trim & Styling',
        revenue: Math.round(2800 * baseMultiplier),
        percentage: 23,
        trend: 'up',
        trendValue: 8.3
      },
      {
        service: 'Hot Towel Shave',
        revenue: Math.round(2100 * baseMultiplier),
        percentage: 18,
        trend: 'neutral',
        trendValue: 0.5
      },
      {
        service: 'Hair Wash & Treatment',
        revenue: Math.round(1500 * baseMultiplier),
        percentage: 12,
        trend: 'up',
        trendValue: 15.2
      },
      {
        service: 'Styling & Grooming',
        revenue: Math.round(1400 * baseMultiplier),
        percentage: 12,
        trend: 'down',
        trendValue: -3.7
      }
    ]
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const userData = await getProfile()
        setUser(userData)
        
        // Generate mock revenue data
        const stats = generateRevenueStats(userData.role)
        const breakdown = generateRevenueBreakdown(userData.role)
        
        setRevenueStats(stats)
        setRevenueBreakdown(breakdown)
        
      } catch (err) {
        console.error('Failed to load revenue data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load revenue data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleRefresh = () => {
    if (user) {
      setLoading(true)
      // Simulate refresh delay
      setTimeout(() => {
        const stats = generateRevenueStats(user.role)
        const breakdown = generateRevenueBreakdown(user.role)
        setRevenueStats(stats)
        setRevenueBreakdown(breakdown)
        setLoading(false)
      }, 1000)
    }
  }

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]

  const getTrendIcon = (trend: string, trendValue: number) => {
    if (trend === 'up') {
      return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
    } else if (trend === 'down') {
      return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
    }
    return <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
  }

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400'
    if (trend === 'down') return 'text-red-600 dark:text-red-400'
    return 'text-gray-500 dark:text-gray-400'
  }

  if (loading && !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Loading revenue analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card variant="outlined">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-error-600 dark:text-error-400" />
              <div>
                <h3 className="font-medium text-error-900 dark:text-error-100">
                  Failed to Load Revenue Data
                </h3>
                <p className="text-sm text-error-700 dark:text-error-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user || !revenueStats) return null

  const todayVsYesterday = ((revenueStats.today - revenueStats.yesterday) / revenueStats.yesterday * 100).toFixed(1)
  const thisWeekVsLast = ((revenueStats.thisWeek - revenueStats.lastWeek) / revenueStats.lastWeek * 100).toFixed(1)
  const thisMonthVsLast = ((revenueStats.thisMonth - revenueStats.lastMonth) / revenueStats.lastMonth * 100).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Revenue Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Detailed revenue analysis, trends, and service performance breakdown
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${revenueStats.today.toLocaleString()}
                </p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
            </div>
            <p className={`text-xs mt-2 ${parseFloat(todayVsYesterday) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {parseFloat(todayVsYesterday) >= 0 ? '+' : ''}{todayVsYesterday}% vs yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${revenueStats.thisWeek.toLocaleString()}
                </p>
              </div>
              <CalendarDaysIcon className="w-8 h-8 text-blue-500" />
            </div>
            <p className={`text-xs mt-2 ${parseFloat(thisWeekVsLast) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {parseFloat(thisWeekVsLast) >= 0 ? '+' : ''}{thisWeekVsLast}% vs last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${revenueStats.thisMonth.toLocaleString()}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-500" />
            </div>
            <p className={`text-xs mt-2 ${parseFloat(thisMonthVsLast) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {parseFloat(thisMonthVsLast) >= 0 ? '+' : ''}{thisMonthVsLast}% vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Per Appointment</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${revenueStats.averagePerAppointment}
                </p>
              </div>
              <BanknotesIcon className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Based on {timeRange}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ChartBarIcon className="w-5 h-5" />
            <span>Revenue by Service</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.service}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.percentage}% of total revenue</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    ${item.revenue.toLocaleString()}
                  </p>
                  <div className={`flex items-center space-x-1 text-xs ${getTrendColor(item.trend)}`}>
                    {getTrendIcon(item.trend, item.trendValue)}
                    <span>
                      {item.trend === 'up' ? '+' : item.trend === 'down' ? '-' : ''}
                      {Math.abs(item.trendValue)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Best Performing Service
                  </span>
                </div>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {revenueStats.topServiceName}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Daily Average
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  ${revenueStats.averagePerDay.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Year-to-Date
                  </span>
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  ${revenueStats.thisYear.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Six Figure Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Monthly Goal Progress</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${revenueStats.thisMonth.toLocaleString()} / $15,000
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full" 
                    style={{ width: `${Math.min((revenueStats.thisMonth / 15000) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round((revenueStats.thisMonth / 15000) * 100)}% of monthly goal
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Annual Goal Progress</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${revenueStats.thisYear.toLocaleString()} / $180,000
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${Math.min((revenueStats.thisYear / 180000) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round((revenueStats.thisYear / 180000) * 100)}% of Six Figure Goal
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
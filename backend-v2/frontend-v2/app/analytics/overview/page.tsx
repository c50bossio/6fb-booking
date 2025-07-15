'use client'

import React, { useEffect, useState } from 'react'
import { getProfile, type User } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import SixFigureAnalyticsDashboard from '@/components/analytics/SixFigureAnalyticsDashboard'
import { 
  ChartBarIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface OverviewPageProps {}

interface TodayStats {
  appointments: number
  revenue: number
  newClients: number
  completionRate: number
}

export default function OverviewPage({}: OverviewPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30d')
  const [todayStats, setTodayStats] = useState<TodayStats>({
    appointments: 0,
    revenue: 0,
    newClients: 0,
    completionRate: 0
  })

  // Mock function to generate today's stats based on user role
  const generateTodayStats = (userRole: string | undefined): TodayStats => {
    if (!userRole) return { appointments: 0, revenue: 0, newClients: 0, completionRate: 0 }

    // Simulate different stats based on role
    if (userRole === 'enterprise_owner') {
      return {
        appointments: 45,
        revenue: 2340,
        newClients: 8,
        completionRate: 92
      }
    }

    if (userRole === 'location_manager') {
      return {
        appointments: 18,
        revenue: 950,
        newClients: 3,
        completionRate: 89
      }
    }

    // Default for barber or other roles
    return {
      appointments: 7,
      revenue: 420,
      newClients: 2,
      completionRate: 85
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const userData = await getProfile()
        setUser(userData)
        
        // Generate mock today stats
        const stats = generateTodayStats(userData.role)
        setTodayStats(stats)
        
      } catch (err) {
        console.error('Failed to load overview data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
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
        const stats = generateTodayStats(user.role)
        setTodayStats(stats)
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

  if (loading && !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Loading comprehensive analytics...</p>
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
                  Failed to Load Analytics
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

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive view of your business performance and Six Figure Barber methodology progress
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

      {/* Today's Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {todayStats.appointments}
                </p>
              </div>
              <CalendarDaysIcon className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {user.role === 'enterprise_owner' ? 'Across all locations' : 'Scheduled for today'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${todayStats.revenue.toLocaleString()}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 font-bold">$</span>
              </div>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              +12.5% vs yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Clients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {todayStats.newClients}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 font-bold">+</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              First-time bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {todayStats.completionRate}%
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <span className="text-orange-600 dark:text-orange-400 font-bold">✓</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Show-up rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Six Figure Barber Analytics Dashboard */}
      <div className="space-y-6">
        <SixFigureAnalyticsDashboard
          userId={user.id}
          timeRange={timeRange}
          userName={user.name}
          todayStats={todayStats}
        />
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Revenue Goal Progress
                  </span>
                </div>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  78%
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Client Retention Rate
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  94%
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Average Service Value
                  </span>
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  $85
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Premium cut completed
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    2 minutes ago
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">
                    New client booking received
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    15 minutes ago
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Appointment reminder sent
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    1 hour ago
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
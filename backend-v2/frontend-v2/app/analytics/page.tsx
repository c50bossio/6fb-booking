'use client'

import React, { useEffect, useState } from 'react'
import { getProfile, type User } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  StarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface QuickStat {
  label: string
  value: string
  change: string
  changeType: 'increase' | 'decrease' | 'neutral'
  trend: 'up' | 'down' | 'neutral'
}

interface AnalyticsHubProps {}

export default function AnalyticsHub({}: AnalyticsHubProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [quickStats, setQuickStats] = useState<QuickStat[]>([])

  // Mock quick stats - in production, these would come from API
  const generateQuickStats = (userRole: string | undefined): QuickStat[] => {
    if (!userRole) return []

    const baseStats: QuickStat[] = [
      {
        label: 'Today\'s Revenue',
        value: '$450',
        change: '+12.5%',
        changeType: 'increase',
        trend: 'up'
      },
      {
        label: 'Active Clients',
        value: '127',
        change: '+8 this week',
        changeType: 'increase',
        trend: 'up'
      },
      {
        label: 'Appointments Today',
        value: '8',
        change: '2 remaining',
        changeType: 'neutral',
        trend: 'neutral'
      },
      {
        label: 'Average Rating',
        value: '4.9',
        change: '+0.2 this month',
        changeType: 'increase',
        trend: 'up'
      }
    ]

    // Customize stats based on role
    if (userRole === 'enterprise_owner') {
      return [
        {
          label: 'Total Revenue',
          value: '$15,240',
          change: '+18.7%',
          changeType: 'increase',
          trend: 'up'
        },
        {
          label: 'All Locations',
          value: '3',
          change: 'Active',
          changeType: 'neutral',
          trend: 'neutral'
        },
        {
          label: 'Total Clients',
          value: '1,247',
          change: '+156 this month',
          changeType: 'increase',
          trend: 'up'
        },
        {
          label: 'Avg. Performance',
          value: '94%',
          change: '+5.2%',
          changeType: 'increase',
          trend: 'up'
        }
      ]
    }

    if (userRole === 'location_manager') {
      return [
        {
          label: 'Location Revenue',
          value: '$5,840',
          change: '+15.3%',
          changeType: 'increase',
          trend: 'up'
        },
        {
          label: 'Team Members',
          value: '5',
          change: 'All active',
          changeType: 'neutral',
          trend: 'neutral'
        },
        {
          label: 'Location Clients',
          value: '423',
          change: '+52 this month',
          changeType: 'increase',
          trend: 'up'
        },
        {
          label: 'Team Performance',
          value: '91%',
          change: '+3.1%',
          changeType: 'increase',
          trend: 'up'
        }
      ]
    }

    return baseStats
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const userData = await getProfile()
        setUser(userData)
        
        // Generate quick stats based on user role
        const stats = generateQuickStats(userData.role)
        setQuickStats(stats)
      } catch (error) {
        console.error('Failed to load analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
      case 'down':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-red-500 rotate-180" />
      default:
        return <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full" />
    }
  }

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600 dark:text-green-400'
      case 'decrease':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-500 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <Card variant="accent" className="text-center">
        <CardContent className="p-8">
          <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mx-auto mb-4">
            <ChartBarIcon className="w-8 h-8 text-primary-700 dark:text-primary-300" />
          </div>
          <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-2">
            Welcome to Analytics Hub
          </h2>
          <p className="text-primary-700 dark:text-primary-300 mb-6">
            Get comprehensive insights into your business performance, client behavior, and revenue trends.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/analytics/overview">
              <Button size="lg" className="w-full sm:w-auto">
                <ChartBarIcon className="w-5 h-5 mr-2" />
                View Overview
              </Button>
            </Link>
            <Link href="/analytics/revenue">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                Revenue Analysis
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index} variant="default" className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </span>
                {getTrendIcon(stat.trend)}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </div>
              <div className={`text-sm ${getChangeColor(stat.changeType)}`}>
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Navigation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link href="/analytics/overview">
          <Card variant="default" className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                  <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Overview Dashboard</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Comprehensive view of all metrics
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  <span>Six Figure Barber analytics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  <span>Real-time performance tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  <span>Goal progress monitoring</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics/revenue">
          <Card variant="default" className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                  <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Revenue Deep-Dive</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Detailed revenue analysis and trends
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Daily, weekly, monthly trends</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Service performance breakdown</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Pricing optimization insights</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics/clients">
          <Card variant="default" className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                  <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Client Analytics</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Client behavior and relationship insights
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>Client lifetime value</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>Retention and churn analysis</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>Booking patterns and preferences</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics/performance">
          <Card variant="default" className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-800/40 transition-colors">
                  <TrophyIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Operational efficiency and goals
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>Utilization rates and efficiency</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>Appointment completion rates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>Six Figure Barber goal tracking</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClockIcon className="w-5 h-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Export Data</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Download analytics reports
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Schedule Report</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Set up automated reports
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Set Goals</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Configure performance targets
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
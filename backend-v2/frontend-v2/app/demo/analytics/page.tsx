'use client'

import { useMemo } from 'react'
import { useDemoMode } from '@/components/demo/DemoModeProvider'
import DemoWrapper from '@/components/demo/DemoWrapper'
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

export default function DemoAnalyticsPage() {
  const { mockData, user } = useDemoMode()

  // Calculate realistic demo stats from mock data
  const demoStats = useMemo(() => {
    const today = new Date()
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeek = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Today's appointments and revenue
    const todayAppointments = mockData.appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === today.toDateString()
    })

    const todayRevenue = todayAppointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + apt.price, 0)

    // This week's stats
    const thisWeekAppointments = mockData.appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= thisWeek
    })

    const thisWeekRevenue = thisWeekAppointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + apt.price, 0)

    // Last week's stats for comparison
    const lastWeekAppointments = mockData.appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= lastWeek && aptDate < thisWeek
    })

    const lastWeekRevenue = lastWeekAppointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + apt.price, 0)

    // Calculate growth percentages
    const revenueGrowth = lastWeekRevenue > 0 
      ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100).toFixed(1)
      : '100'

    // Client metrics
    const activeClients = mockData.clients.length
    const avgClientValue = activeClients > 0 ? (thisWeekRevenue / activeClients).toFixed(0) : '0'

    return {
      todayRevenue,
      todayAppointments: todayAppointments.length,
      thisWeekRevenue,
      revenueGrowth: parseFloat(revenueGrowth),
      activeClients,
      avgClientValue: parseFloat(avgClientValue),
      completionRate: thisWeekAppointments.length > 0 
        ? ((thisWeekAppointments.filter(apt => apt.status === 'completed').length / thisWeekAppointments.length) * 100).toFixed(1)
        : '0'
    }
  }, [mockData])

  // Generate quick stats
  const quickStats: QuickStat[] = [
    {
      label: 'Today\'s Revenue',
      value: `$${demoStats.todayRevenue}`,
      change: `+${demoStats.revenueGrowth}% vs last week`,
      changeType: demoStats.revenueGrowth > 0 ? 'increase' : 'decrease',
      trend: demoStats.revenueGrowth > 0 ? 'up' : 'down'
    },
    {
      label: 'Active Clients',
      value: demoStats.activeClients.toString(),
      change: '+12% this month',
      changeType: 'increase',
      trend: 'up'
    },
    {
      label: 'Today\'s Appointments',
      value: demoStats.todayAppointments.toString(),
      change: `${demoStats.todayAppointments > 5 ? 'Busy day!' : 'Moderate pace'}`,
      changeType: 'neutral',
      trend: 'neutral'
    },
    {
      label: 'Completion Rate',
      value: `${demoStats.completionRate}%`,
      change: '+2.1% this week',
      changeType: 'increase',
      trend: 'up'
    }
  ]

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

  const demoFeatures = [
    'View real-time business metrics calculated from your demo data',
    'See Six Figure Barber methodology in action',
    'Explore revenue trends and client analytics',
    'Track progress toward your income goals'
  ]

  return (
    <DemoWrapper
      title="Analytics Dashboard"
      description="Comprehensive business insights with Six Figure Barber metrics"
      demoFeatures={demoFeatures}
    >
      <div className="space-y-8">
        {/* Welcome Section */}
        <Card variant="accent" className="text-center">
          <CardContent className="p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mx-auto mb-4">
              <ChartBarIcon className="w-8 h-8 text-primary-700 dark:text-primary-300" />
            </div>
            <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-2">
              Welcome to Your Analytics Dashboard, {user.first_name}!
            </h2>
            <p className="text-primary-700 dark:text-primary-300 mb-6">
              Here's your business performance based on real demo data. These metrics update as you interact with the calendar and booking system.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <div className="text-2xl font-bold">${demoStats.thisWeekRevenue}</div>
                <div className="text-sm text-primary-200">This Week</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <div className="text-2xl font-bold">{demoStats.activeClients}</div>
                <div className="text-sm text-primary-200">Active Clients</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <div className="text-2xl font-bold">${demoStats.avgClientValue}</div>
                <div className="text-sm text-primary-200">Avg. Client Value</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <div className="text-2xl font-bold">{demoStats.completionRate}%</div>
                <div className="text-sm text-primary-200">Completion Rate</div>
              </div>
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
          <Card variant="default" className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                  <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Six Figure Barber Metrics</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Track your progress toward six-figure income
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700 dark:text-green-400">Annual Goal Progress</span>
                    <span className="text-lg font-semibold text-green-800 dark:text-green-300">
                      {((demoStats.thisWeekRevenue * 52 / 100000) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((demoStats.thisWeekRevenue * 52 / 100000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    <span>Revenue optimization strategies</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    <span>Client retention analysis</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    <span>Service performance insights</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card variant="default" className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                  <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Client Analytics</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Deep insights into client behavior and loyalty
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-purple-800 dark:text-purple-300">
                      ${(demoStats.thisWeekRevenue / demoStats.activeClients).toFixed(0)}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Avg. Client Value</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-purple-800 dark:text-purple-300">
                      89%
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Retention Rate</div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    <span>Lifetime value tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    <span>Booking pattern analysis</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    <span>Service preference insights</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
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
              <Link href="/demo/calendar">
                <Button variant="outline" className="justify-start h-auto p-4 w-full">
                  <div className="text-left">
                    <div className="font-medium">View Calendar</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      See today's appointments and metrics
                    </div>
                  </div>
                </Button>
              </Link>
              <Link href="/demo/book">
                <Button variant="outline" className="justify-start h-auto p-4 w-full">
                  <div className="text-left">
                    <div className="font-medium">New Booking</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Add appointment to see impact
                    </div>
                  </div>
                </Button>
              </Link>
              <Link href="/demo/recurring">
                <Button variant="outline" className="justify-start h-auto p-4 w-full">
                  <div className="text-left">
                    <div className="font-medium">Recurring Patterns</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Set up predictable revenue streams
                    </div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DemoWrapper>
  )
}
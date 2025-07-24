'use client'

import React from 'react'
import { AnalyticsCardGrid } from '../shared/AnalyticsCard'
import { 
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UsersIcon,
  StarIcon,
  TrophyIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BarberAnalyticsViewProps {
  data: {
    revenue: {
      total: number
      thisMonth: number
      lastMonth: number
      average: number
    }
    appointments: {
      total: number
      completed: number
      cancelled: number
      noShow: number
    }
    clients: {
      total: number
      returning: number
      new: number
      retentionRate: number
    }
    performance: {
      averageRating: number
      completionRate: number
      punctualityRate: number
      rebookingRate: number
    }
  }
  loading?: boolean
}

export function BarberAnalyticsView({ data, loading = false }: BarberAnalyticsViewProps) {
  const revenueGrowth = data.revenue.lastMonth > 0 
    ? ((data.revenue.thisMonth - data.revenue.lastMonth) / data.revenue.lastMonth * 100)
    : 0

  const metrics = [
    {
      title: 'Total Revenue',
      value: `$${data.revenue.total.toLocaleString()}`,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />,
      change: revenueGrowth,
      trend: (revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Appointments',
      value: data.appointments.total,
      icon: <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      change: Math.round(data.performance.completionRate),
      changeLabel: 'completion',
      trend: 'neutral' as const
    },
    {
      title: 'Active Clients',
      value: data.clients.total,
      icon: <UsersIcon className="w-5 h-5 text-green-600 dark:text-green-400" />,
      change: data.clients.retentionRate,
      changeLabel: 'retention',
      trend: (data.clients.retentionRate > 80 ? 'up' : 'down') as 'up' | 'down'
    },
    {
      title: 'Average Rating',
      value: data.performance.averageRating.toFixed(1),
      icon: <StarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
      trend: (data.performance.averageRating >= 4.5 ? 'up' : 'neutral') as 'up' | 'neutral'
    }
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <AnalyticsCardGrid metrics={metrics} loading={loading} />

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Completion Rate
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {data.performance.completionRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${data.performance.completionRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Punctuality Rate
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {data.performance.punctualityRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${data.performance.punctualityRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Client Rebooking
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {data.performance.rebookingRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${data.performance.rebookingRate}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">This Month</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  ${data.revenue.thisMonth.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <TrophyIcon className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium">Average per Service</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  ${data.revenue.average.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <ClockIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Last Month</span>
                </div>
                <span className="text-lg font-bold text-gray-600 dark:text-gray-400">
                  ${data.revenue.lastMonth.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              View Detailed Reports
            </Button>
            <Button variant="outline" className="justify-start">
              Export Analytics Data
            </Button>
            <Button variant="outline" className="justify-start">
              Set Performance Goals
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
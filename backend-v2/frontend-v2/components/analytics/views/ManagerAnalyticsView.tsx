'use client'

import React from 'react'
import { AnalyticsCardGrid } from '../shared/AnalyticsCard'
import { 
  CurrencyDollarIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface ManagerAnalyticsViewProps {
  data: {
    location: {
      name: string
      revenue: number
      revenueGrowth: number
      appointments: number
      utilization: number
    }
    team: {
      totalBarbers: number
      activeBarbers: number
      averagePerformance: number
      topPerformer: string
    }
    clients: {
      total: number
      new: number
      returning: number
      satisfaction: number
    }
    alerts: {
      type: 'warning' | 'info' | 'error'
      message: string
    }[]
  }
  loading?: boolean
}

export function ManagerAnalyticsView({ data, loading = false }: ManagerAnalyticsViewProps) {
  const metrics = [
    {
      title: 'Location Revenue',
      value: `$${data.location.revenue.toLocaleString()}`,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />,
      change: data.location.revenueGrowth,
      trend: (data.location.revenueGrowth > 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Chair Utilization',
      value: `${data.location.utilization}%`,
      icon: <BuildingStorefrontIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      trend: (data.location.utilization > 75 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Active Team',
      value: `${data.team.activeBarbers}/${data.team.totalBarbers}`,
      icon: <UserGroupIcon className="w-5 h-5 text-green-600 dark:text-green-400" />,
      change: data.team.averagePerformance,
      changeLabel: 'avg performance',
      trend: 'neutral' as 'up' | 'down' | 'neutral'
    },
    {
      title: 'Customer Satisfaction',
      value: `${data.clients.satisfaction}%`,
      icon: <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      trend: (data.clients.satisfaction > 90 ? 'up' : 'neutral') as 'up' | 'down' | 'neutral'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Location Header */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-2">
            {data.location.name}
          </h2>
          <div className="flex items-center space-x-4 text-sm text-primary-700 dark:text-primary-300">
            <span>{data.location.appointments} appointments this month</span>
            <span>•</span>
            <span>{data.clients.total} active clients</span>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-3">
          {data.alerts.map((alert, index) => (
            <Card
              key={index}
              className={`border-l-4 ${alert.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-gray-400'}`}
            >
              <CardContent className="flex items-center space-x-3 py-3">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{alert.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <AnalyticsCardGrid metrics={metrics} loading={loading} />

      {/* Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Team Performance</CardTitle>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mock barber performance data */}
              {[
                { name: data.team.topPerformer, revenue: 15420, appointments: 127, rating: 4.9 },
                { name: 'Sarah Johnson', revenue: 12890, appointments: 98, rating: 4.8 },
                { name: 'Mike Chen', revenue: 11560, appointments: 92, rating: 4.7 }
              ].map((barber, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{barber.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {barber.appointments} appointments • ★ {barber.rating}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      ${barber.revenue.toLocaleString()}
                    </p>
                    {index === 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400">Top Performer</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Client Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Client Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Client Distribution</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data.clients.new}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">New</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {data.clients.returning}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Returning</p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {Math.round((data.clients.returning / data.clients.total) * 100)}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Retention</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Growth Trend</p>
                <div className="flex items-end justify-between h-20 space-x-1">
                  {[40, 60, 45, 70, 85, 75, 90].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary-500 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Mon</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Management Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              <UserGroupIcon className="w-4 h-4 mr-2" />
              Manage Team
            </Button>
            <Button variant="outline" className="justify-start">
              <BuildingStorefrontIcon className="w-4 h-4 mr-2" />
              Location Settings
            </Button>
            <Button variant="outline" className="justify-start">
              <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
              Set Goals
            </Button>
            <Button variant="outline" className="justify-start">
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Export Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
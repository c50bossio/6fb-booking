'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { AnalyticsCardGrid } from '../shared/AnalyticsCard'
import { 
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface LocationData {
  id: number
  name: string
  revenue: number
  growth: number
  appointments: number
  utilization: number
  rating: number
  barbers: number
}

interface EnterpriseAnalyticsViewProps {
  data: {
    summary: {
      totalRevenue: number
      revenueGrowth: number
      totalLocations: number
      totalBarbers: number
      totalClients: number
      averageUtilization: number
    }
    locations: LocationData[]
    topPerformers: {
      id: number
      name: string
      location: string
      revenue: number
      rating: number
    }[]
  }
  loading?: boolean
}

export function EnterpriseAnalyticsView({ data, loading = false }: EnterpriseAnalyticsViewProps) {
  const router = useRouter()

  const metrics = [
    {
      title: 'Total Revenue',
      value: `$${data.summary.totalRevenue.toLocaleString()}`,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />,
      change: data.summary.revenueGrowth,
      trend: data.summary.revenueGrowth > 0 ? 'up' : 'down'
    },
    {
      title: 'Locations',
      value: data.summary.totalLocations,
      icon: <BuildingStorefrontIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      trend: 'neutral'
    },
    {
      title: 'Total Team',
      value: data.summary.totalBarbers,
      icon: <UserGroupIcon className="w-5 h-5 text-green-600 dark:text-green-400" />,
      change: data.summary.averageUtilization,
      changeLabel: 'utilization',
      trend: data.summary.averageUtilization > 75 ? 'up' : 'down'
    },
    {
      title: 'Active Clients',
      value: data.summary.totalClients.toLocaleString(),
      icon: <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      trend: 'up'
    }
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <AnalyticsCardGrid metrics={metrics} loading={loading} />

      {/* Location Performance Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Location Performance</CardTitle>
            <Button
              onClick={() => router.push('/locations')}
              variant="ghost"
              size="sm"
            >
              Manage Locations
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Revenue
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Growth
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Appointments
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Utilization
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rating
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Team
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.locations.map((location) => (
                  <tr
                    key={location.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {location.name}
                      </p>
                    </td>
                    <td className="text-right py-4 px-4">
                      <p className="font-medium">${location.revenue.toLocaleString()}</p>
                    </td>
                    <td className="text-right py-4 px-4">
                      <span
                        className={`inline-flex items-center text-sm font-medium ${
                          location.growth > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {location.growth > 0 ? <TrendingUpIcon className="w-4 h-4 mr-1" /> : <TrendingDownIcon className="w-4 h-4 mr-1" />}
                        {Math.abs(location.growth)}%
                      </span>
                    </td>
                    <td className="text-right py-4 px-4">
                      <p>{location.appointments.toLocaleString()}</p>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className="flex items-center justify-end">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              location.utilization > 75
                                ? 'bg-green-500'
                                : location.utilization > 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${location.utilization}%` }}
                          />
                        </div>
                        <span className="text-sm">{location.utilization}%</span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className="flex items-center justify-end">
                        <span className="text-yellow-500 mr-1">★</span>
                        <span>{location.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <p>{location.barbers}</p>
                    </td>
                    <td className="text-right py-4 px-4">
                      <Button
                        onClick={() => router.push(`/barbershop/${location.id}/dashboard`)}
                        variant="ghost"
                        size="sm"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Trend and Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {/* Placeholder chart bars */}
              {Array.from({ length: 30 }, (_, i) => {
                const height = Math.random() * 80 + 20
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary-500 dark:bg-primary-600 rounded-t hover:bg-primary-600 dark:hover:bg-primary-500 transition-colors"
                    style={{ height: `${height}%` }}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-4 text-xs text-gray-600 dark:text-gray-400">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topPerformers.map((performer, index) => (
                <div key={performer.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{performer.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {performer.location} • ★ {performer.rating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    ${performer.revenue.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              <BuildingStorefrontIcon className="w-4 h-4 mr-2" />
              Add Location
            </Button>
            <Button variant="outline" className="justify-start">
              <UserGroupIcon className="w-4 h-4 mr-2" />
              Team Overview
            </Button>
            <Button variant="outline" className="justify-start">
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Generate Reports
            </Button>
            <Button variant="outline" className="justify-start">
              <CurrencyDollarIcon className="w-4 h-4 mr-2" />
              Financial Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
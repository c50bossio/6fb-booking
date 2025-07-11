'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessibleButton } from '@/lib/accessibility-helpers'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

// Mock analytics data
const mockAnalytics = {
  revenue: {
    total: 12450,
    thisMonth: 2340,
    lastMonth: 2180,
    growth: 7.3,
    dailyAverage: 78
  },
  appointments: {
    total: 387,
    thisMonth: 65,
    lastMonth: 58,
    growth: 12.1,
    completionRate: 92
  },
  clients: {
    total: 156,
    new: 12,
    returning: 44,
    retention: 85,
    averageSpent: 42
  },
  performance: {
    averageServiceTime: 45,
    utilizationRate: 78,
    popularServices: [
      { name: 'Classic Haircut', count: 28, revenue: 980 },
      { name: 'Beard Trim', count: 15, revenue: 375 },
      { name: 'Full Service', count: 12, revenue: 780 },
      { name: 'Styling', count: 8, revenue: 200 }
    ]
  },
  sixFigureProgress: {
    monthlyTarget: 8333,
    currentMonth: 2340,
    ytdRevenue: 28080,
    ytdTarget: 100000,
    onTrackForSixFigures: true
  }
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('month')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getGrowthIcon = (growth: number) => {
    return growth > 0 ? (
      <ArrowUpIcon className="w-4 h-4 text-green-500" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-red-500" />
    )
  }

  const getGrowthColor = (growth: number) => {
    return growth > 0 ? 'text-green-600' : 'text-red-600'
  }

  const sixFigureProgress = (mockAnalytics.sixFigureProgress.currentMonth / mockAnalytics.sixFigureProgress.monthlyTarget) * 100
  const ytdProgress = (mockAnalytics.sixFigureProgress.ytdRevenue / mockAnalytics.sixFigureProgress.ytdTarget) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="w-7 h-7 mr-3 text-green-500" />
                Business Analytics
              </h1>
              <p className="text-gray-600 mt-1">
                Track your progress toward six-figure success
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              
              <AccessibleButton variant="secondary">
                Export Report
              </AccessibleButton>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Six Figure Progress Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Six Figure Barber Progress</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Revenue Target</CardTitle>
                <p className="text-sm text-gray-600">Track your path to $8,333/month</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(mockAnalytics.sixFigureProgress.currentMonth)}
                    </span>
                    <span className="text-sm text-gray-600">
                      of {formatCurrency(mockAnalytics.sixFigureProgress.monthlyTarget)}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(sixFigureProgress, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{sixFigureProgress.toFixed(1)}% complete</span>
                    <span className={sixFigureProgress >= 100 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                      {sixFigureProgress >= 100 ? 'Target exceeded!' : `${formatCurrency(mockAnalytics.sixFigureProgress.monthlyTarget - mockAnalytics.sixFigureProgress.currentMonth)} remaining`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Year-to-Date Progress</CardTitle>
                <p className="text-sm text-gray-600">On track for $100K annual goal</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(mockAnalytics.sixFigureProgress.ytdRevenue)}
                    </span>
                    <span className="text-sm text-gray-600">
                      of {formatCurrency(mockAnalytics.sixFigureProgress.ytdTarget)}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(ytdProgress, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{ytdProgress.toFixed(1)}% complete</span>
                    <span className={mockAnalytics.sixFigureProgress.onTrackForSixFigures ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                      {mockAnalytics.sixFigureProgress.onTrackForSixFigures ? 'On track!' : 'Needs attention'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Revenue */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(mockAnalytics.revenue.thisMonth)}
                  </p>
                </div>
                <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
              </div>
              <div className="flex items-center mt-2">
                {getGrowthIcon(mockAnalytics.revenue.growth)}
                <span className={`ml-1 text-sm font-medium ${getGrowthColor(mockAnalytics.revenue.growth)}`}>
                  {formatPercentage(mockAnalytics.revenue.growth)}
                </span>
                <span className="ml-1 text-sm text-gray-600">vs last month</span>
              </div>
            </CardHeader>
          </Card>

          {/* Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mockAnalytics.appointments.thisMonth}
                  </p>
                </div>
                <CalendarDaysIcon className="w-8 h-8 text-blue-500" />
              </div>
              <div className="flex items-center mt-2">
                {getGrowthIcon(mockAnalytics.appointments.growth)}
                <span className={`ml-1 text-sm font-medium ${getGrowthColor(mockAnalytics.appointments.growth)}`}>
                  {formatPercentage(mockAnalytics.appointments.growth)}
                </span>
                <span className="ml-1 text-sm text-gray-600">vs last month</span>
              </div>
            </CardHeader>
          </Card>

          {/* New Clients */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Clients</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mockAnalytics.clients.new}
                  </p>
                </div>
                <UserGroupIcon className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">
                  {mockAnalytics.clients.retention}% retention rate
                </span>
              </div>
            </CardHeader>
          </Card>

          {/* Average per Client */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg per Client</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(mockAnalytics.clients.averageSpent)}
                  </p>
                </div>
                <ClockIcon className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">
                  {mockAnalytics.performance.averageServiceTime} min avg service
                </span>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Popular Services */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Services</CardTitle>
              <p className="text-sm text-gray-600">Top performing services this month</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAnalytics.performance.popularServices.map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{service.name}</span>
                        <span className="text-sm text-gray-600">{service.count} bookings</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${(service.count / mockAnalytics.performance.popularServices[0].count) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="font-medium text-gray-900">{formatCurrency(service.revenue)}</div>
                      <div className="text-sm text-gray-600">revenue</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <p className="text-sm text-gray-600">Key business efficiency metrics</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Completion Rate</span>
                    <span className="text-sm font-bold text-gray-900">
                      {mockAnalytics.appointments.completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${mockAnalytics.appointments.completionRate}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Utilization Rate</span>
                    <span className="text-sm font-bold text-gray-900">
                      {mockAnalytics.performance.utilizationRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${mockAnalytics.performance.utilizationRate}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Client Retention</span>
                    <span className="text-sm font-bold text-gray-900">
                      {mockAnalytics.clients.retention}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${mockAnalytics.clients.retention}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">Quick Stats</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Daily Average:</span>
                      <div className="font-medium">{formatCurrency(mockAnalytics.revenue.dailyAverage)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Clients:</span>
                      <div className="font-medium">{mockAnalytics.clients.total}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Returning:</span>
                      <div className="font-medium">{mockAnalytics.clients.returning}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Service Time:</span>
                      <div className="font-medium">{mockAnalytics.performance.averageServiceTime}m</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Six Figure Barber Recommendations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2 text-yellow-500" />
              Six Figure Barber Recommendations
            </CardTitle>
            <p className="text-sm text-gray-600">Insights to accelerate your journey to six figures</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">Revenue Growth Opportunity</h4>
                <p className="text-sm text-yellow-700">
                  Your average service price is strong. Consider introducing premium packages to increase client value.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Client Retention Success</h4>
                <p className="text-sm text-green-700">
                  Excellent retention rate! Your client relationships are building strong recurring revenue.
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Utilization Optimization</h4>
                <p className="text-sm text-blue-700">
                  Consider booking optimization to increase your {mockAnalytics.performance.utilizationRate}% utilization rate during peak hours.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-800 mb-2">New Client Acquisition</h4>
                <p className="text-sm text-purple-700">
                  {mockAnalytics.clients.new} new clients this month is solid. Focus on converting them to regulars.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
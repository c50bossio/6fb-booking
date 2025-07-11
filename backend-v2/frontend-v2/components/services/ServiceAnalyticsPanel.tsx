'use client'

import { useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Percent,
  Filter,
  Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { type Service } from '@/lib/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from '@/lib/recharts'

interface ServiceAnalyticsPanelProps {
  services: Service[]
  metrics: any
  dateRange: string
  onDateRangeChange: (range: string) => void
}

export default function ServiceAnalyticsPanel({
  services,
  metrics,
  dateRange,
  onDateRangeChange
}: ServiceAnalyticsPanelProps) {
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'bookings' | 'utilization'>('revenue')
  const [comparisonPeriod, setComparisonPeriod] = useState('previous')

  // Mock data for charts - in real implementation, this would come from API
  const revenueData = [
    { date: 'Mon', current: 1200, previous: 1000 },
    { date: 'Tue', current: 1400, previous: 1100 },
    { date: 'Wed', current: 1300, previous: 1200 },
    { date: 'Thu', current: 1600, previous: 1300 },
    { date: 'Fri', current: 1800, previous: 1500 },
    { date: 'Sat', current: 2000, previous: 1700 },
    { date: 'Sun', current: 1500, previous: 1400 }
  ]

  const categoryData = [
    { name: 'Haircuts', value: 45, revenue: 5400 },
    { name: 'Beard Services', value: 25, revenue: 2500 },
    { name: 'Premium Services', value: 20, revenue: 3000 },
    { name: 'Packages', value: 10, revenue: 2000 }
  ]

  const utilizationData = services.map(service => ({
    name: service.name,
    utilization: Math.random() * 100, // Mock data
    capacity: 100
  }))

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const getTopPerformers = () => {
    return services
      .map(service => ({
        ...service,
        revenue: (service.booking_count || 0) * service.base_price,
        growth: Math.random() * 50 - 10 // Mock growth data
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }

  const getServiceHealth = (service: any) => {
    const utilization = Math.random() * 100 // Mock data
    if (utilization > 80) return { status: 'excellent', color: 'green' }
    if (utilization > 60) return { status: 'good', color: 'blue' }
    if (utilization > 40) return { status: 'moderate', color: 'yellow' }
    return { status: 'needs attention', color: 'red' }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-3">
          <Select
            value={dateRange}
            onValueChange={onDateRangeChange}
            className="w-40"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </Select>
          <Select
            value={comparisonPeriod}
            onValueChange={setComparisonPeriod}
            className="w-40"
          >
            <option value="previous">Previous Period</option>
            <option value="year">Last Year</option>
          </Select>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold">${metrics?.totalRevenue || 0}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+15.3%</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold">{metrics?.totalBookings || 0}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+8.7%</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Service Duration
                </p>
                <p className="text-2xl font-bold">45 min</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">-5.2%</span>
                </div>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Utilization Rate
                </p>
                <p className="text-2xl font-bold">72%</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+3.1%</span>
                </div>
              </div>
              <Percent className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="#3B82F6" 
                name="Current Period"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="previous" 
                stroke="#9CA3AF" 
                name="Previous Period"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Category Details */}
            <div className="mt-4 space-y-2">
              {categoryData.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <span className="text-sm font-semibold">${category.revenue}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Services */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getTopPerformers().map((service, index) => {
                const health = getServiceHealth(service)
                return (
                  <div key={service.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ${service.base_price} • {service.booking_count || 0} bookings
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={health.color as any}>
                        {health.status}
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold">${service.revenue}</p>
                        <p className={`text-sm flex items-center ${
                          service.growth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {service.growth > 0 ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {Math.abs(service.growth).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Service Utilization Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilizationData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="utilization" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { Card } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { Scissors, Clock, DollarSign, TrendingUp } from 'lucide-react'

interface ServiceAnalyticsProps {
  data: any[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function ServiceAnalytics({ data }: ServiceAnalyticsProps) {
  // Calculate totals and averages
  const totalBookings = data.reduce((sum, service) => sum + service.bookings, 0)
  const totalRevenue = data.reduce((sum, service) => sum + service.revenue, 0)
  const avgDuration = data.reduce((sum, service) => sum + service.avg_duration * service.bookings, 0) / totalBookings || 0
  const avgPrice = totalRevenue / totalBookings || 0

  // Prepare data for charts
  const revenueData = data.map(service => ({
    name: service.name,
    value: service.revenue,
    percentage: (service.revenue / totalRevenue * 100).toFixed(1)
  }))

  const popularityData = data.map(service => ({
    name: service.name,
    bookings: service.bookings,
    revenue: service.revenue,
    avg_price: service.revenue / service.bookings || 0
  }))

  const durationData = data.map(service => ({
    name: service.name,
    duration: service.avg_duration,
    efficiency: service.revenue / service.avg_duration || 0
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.name === 'revenue' || entry.name === 'avg_price' || entry.name === 'efficiency'
                  ? `$${entry.value.toFixed(2)}`
                  : entry.value
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Services</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
            <Scissors className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Duration</p>
              <p className="text-2xl font-bold">{avgDuration.toFixed(0)} min</p>
            </div>
            <Clock className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Price</p>
              <p className="text-2xl font-bold">${avgPrice.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Top Service</p>
              <p className="text-lg font-bold truncate">
                {data.length > 0 ? data.sort((a, b) => b.revenue - a.revenue)[0].name : 'N/A'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Service Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Service Popularity Bar Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Service Popularity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={popularityData}
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
                stroke="#6b7280"
              />
              <YAxis fontSize={12} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="bookings" fill="#3b82f6" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Service Efficiency Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Service Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-medium text-gray-700">Service</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Bookings</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Revenue</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Avg Price</th>
                <th className="pb-3 font-medium text-gray-700 text-right">Duration</th>
                <th className="pb-3 font-medium text-gray-700 text-right">$/Min</th>
              </tr>
            </thead>
            <tbody>
              {data.sort((a, b) => b.revenue - a.revenue).map((service, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-medium">{service.name}</td>
                  <td className="py-3 text-right">{service.bookings}</td>
                  <td className="py-3 text-right">${service.revenue.toLocaleString()}</td>
                  <td className="py-3 text-right">
                    ${(service.revenue / service.bookings || 0).toFixed(2)}
                  </td>
                  <td className="py-3 text-right">{service.avg_duration} min</td>
                  <td className="py-3 text-right font-medium text-green-600">
                    ${(service.revenue / service.avg_duration / service.bookings || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

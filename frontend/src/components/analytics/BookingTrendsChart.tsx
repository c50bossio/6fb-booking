'use client'

import { Card } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { format } from 'date-fns'

interface BookingTrendsChartProps {
  data: any[]
  dateRange: { from: Date; to: Date }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export function BookingTrendsChart({ data, dateRange }: BookingTrendsChartProps) {
  const formatXAxis = (tickItem: string) => {
    const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 7) return format(new Date(tickItem), 'EEE')
    if (days <= 31) return format(new Date(tickItem), 'dd')
    return format(new Date(tickItem), 'MMM dd')
  }

  // Calculate statistics
  const totalBookings = data.reduce((sum, item) => sum + item.total, 0)
  const completedBookings = data.reduce((sum, item) => sum + item.completed, 0)
  const cancelledBookings = data.reduce((sum, item) => sum + item.cancelled, 0)
  const noShowBookings = data.reduce((sum, item) => sum + item.no_show, 0)

  const completionRate = totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(1) : 0
  const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings * 100).toFixed(1) : 0
  const noShowRate = totalBookings > 0 ? (noShowBookings / totalBookings * 100).toFixed(1) : 0

  const statusBreakdown = [
    { name: 'Completed', value: completedBookings, color: '#10b981' },
    { name: 'Cancelled', value: cancelledBookings, color: '#f59e0b' },
    { name: 'No-Show', value: noShowBookings, color: '#ef4444' },
    { name: 'Pending', value: totalBookings - completedBookings - cancelledBookings - noShowBookings, color: '#3b82f6' }
  ]

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold">{totalBookings}</p>
        </Card>
        
        <Card className="p-4 border-green-200 bg-green-50">
          <p className="text-sm text-green-600">Completion Rate</p>
          <p className="text-2xl font-bold text-green-700">{completionRate}%</p>
        </Card>
        
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-600">Cancellation Rate</p>
          <p className="text-2xl font-bold text-yellow-700">{cancellationRate}%</p>
        </Card>
        
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-600">No-Show Rate</p>
          <p className="text-2xl font-bold text-red-700">{noShowRate}%</p>
        </Card>
      </div>

      {/* Bookings by Status Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Booking Status Trends</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip 
              labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
            <Bar dataKey="cancelled" stackId="a" fill="#f59e0b" name="Cancelled" />
            <Bar dataKey="no_show" stackId="a" fill="#ef4444" name="No-Show" />
            <Bar dataKey="pending" stackId="a" fill="#3b82f6" name="Pending" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Status Breakdown Pie Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Status Distribution</h3>
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="w-full md:w-1/2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={statusBreakdown} 
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString()}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value">
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 space-y-3 mt-4 md:mt-0 md:pl-8">
            {statusBreakdown.map((status) => (
              <div key={status.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded mr-3"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm font-medium">{status.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{status.value.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({totalBookings > 0 ? (status.value / totalBookings * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
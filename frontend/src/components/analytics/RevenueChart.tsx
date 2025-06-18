'use client'

import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

interface RevenueChartProps {
  data: any[]
  dateRange: { from: Date; to: Date }
}

export function RevenueChart({ data, dateRange }: RevenueChartProps) {
  // Validate data
  if (!Array.isArray(data)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Invalid revenue data format</AlertDescription>
      </Alert>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No revenue data available for the selected period</p>
        </div>
      </Card>
    )
  }

  // Calculate trend
  const calculateTrend = () => {
    if (data.length < 2) return { value: 0, direction: 'neutral' }
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2))
    const secondHalf = data.slice(Math.floor(data.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, item) => sum + (item.revenue || 0), 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, item) => sum + (item.revenue || 0), 0) / secondHalf.length
    
    const percentChange = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
    
    return {
      value: Math.abs(percentChange).toFixed(1),
      direction: percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'neutral'
    }
  }

  const trend = calculateTrend()
  const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0)
  const avgDailyRevenue = data.length > 0 ? totalRevenue / data.length : 0

  const formatXAxis = (tickItem: string) => {
    try {
      const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      if (days <= 7) return format(new Date(tickItem), 'EEE')
      if (days <= 31) return format(new Date(tickItem), 'dd')
      return format(new Date(tickItem), 'MMM dd')
    } catch (error) {
      console.error('Error formatting date:', error)
      return tickItem
    }
  }

  const formatTooltipValue = (value: number) => `$${value.toLocaleString()}`

  const formatTooltipLabel = (label: string) => {
    try {
      return format(new Date(label), 'MMM dd, yyyy')
    } catch (error) {
      return label
    }
  }

  // Find best day safely
  const maxRevenue = Math.max(...data.map(d => d.revenue || 0))
  const bestDay = data.find(d => d.revenue === maxRevenue)

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
          <div className="flex items-center mt-2">
            {trend.direction === 'up' && <TrendingUp className="h-4 w-4 text-green-500 mr-1" />}
            {trend.direction === 'down' && <TrendingDown className="h-4 w-4 text-red-500 mr-1" />}
            {trend.direction === 'neutral' && <Minus className="h-4 w-4 text-gray-500 mr-1" />}
            <span className={`text-sm ${
              trend.direction === 'up' ? 'text-green-600' : 
              trend.direction === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend.value}% trend
            </span>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-gray-600">Daily Average</p>
          <p className="text-2xl font-bold">${avgDailyRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-2">Per day</p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-gray-600">Best Day</p>
          <p className="text-2xl font-bold">
            ${maxRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {bestDay && bestDay.date ? format(new Date(bestDay.date), 'MMM dd') : 'N/A'}
          </p>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={(value) => `$${value}`}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={formatTooltipLabel}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorRevenue)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Revenue by Service */}
      {data.some(d => d.services || d.products || d.tips) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => `$${value}`}
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={formatTooltipLabel}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="services" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Services"
              />
              <Line 
                type="monotone" 
                dataKey="products" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
                name="Products"
              />
              <Line 
                type="monotone" 
                dataKey="tips" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={false}
                name="Tips"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
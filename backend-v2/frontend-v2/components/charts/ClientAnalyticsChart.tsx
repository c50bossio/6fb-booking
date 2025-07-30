'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/lib/recharts-dynamic'

interface ClientAnalyticsData {
  retention_metrics: {
    total_clients: number
    returning_clients: number
    new_clients: number
    retention_rate_percent: number
  }
  booking_patterns: {
    average_visits_per_client: number
    frequency_distribution: {
      weekly: number
      bi_weekly: number
      monthly: number
      occasional: number
    }
    rebooking_rate: number
  }
  client_lifetime_value: {
    distribution: {
      high_value: number
      medium_value: number
      low_value: number
      new_clients: number
    }
    average_ltv: number
  }
}

interface ClientAnalyticsChartProps {
  data: ClientAnalyticsData
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function ClientAnalyticsChart({ data }: ClientAnalyticsChartProps) {
  if (!data) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No client data available
      </div>
    )
  }

  // Prepare retention data for pie chart
  const retentionData = [
    { name: 'Returning Clients', value: data.retention_metrics.returning_clients, color: COLORS[0] },
    { name: 'New Clients', value: data.retention_metrics.new_clients, color: COLORS[1] }
  ]

  // Prepare frequency distribution for bar chart
  const frequencyData = [
    { name: 'Weekly', value: data.booking_patterns.frequency_distribution.weekly, fill: COLORS[0] },
    { name: 'Bi-weekly', value: data.booking_patterns.frequency_distribution.bi_weekly, fill: COLORS[1] },
    { name: 'Monthly', value: data.booking_patterns.frequency_distribution.monthly, fill: COLORS[2] },
    { name: 'Occasional', value: data.booking_patterns.frequency_distribution.occasional, fill: COLORS[3] }
  ]

  // Prepare LTV distribution
  const ltvData = [
    { name: 'High Value ($500+)', value: data.client_lifetime_value.distribution.high_value, color: COLORS[0] },
    { name: 'Medium Value ($200-499)', value: data.client_lifetime_value.distribution.medium_value, color: COLORS[1] },
    { name: 'Low Value (<$200)', value: data.client_lifetime_value.distribution.low_value, color: COLORS[2] },
    { name: 'New Clients', value: data.client_lifetime_value.distribution.new_clients, color: COLORS[3] }
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            Count: {payload[0].value}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Client Retention Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Client Retention</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={retentionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {retentionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [value, name]}
                  labelFormatter={() => ''}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <p className="text-2xl font-bold text-blue-600">
              {data.retention_metrics.retention_rate_percent.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">Retention Rate</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Visit Frequency</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={11}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Client Value Distribution */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Client Value Distribution</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ltvData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {ltvData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: any) => [value, name]}
                labelFormatter={() => ''}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">Average Client Lifetime Value</p>
          <p className="text-2xl font-bold text-green-600">
            ${data.client_lifetime_value.average_ltv.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{data.retention_metrics.total_clients}</p>
          <p className="text-xs text-gray-600">Total Clients</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {data.booking_patterns.average_visits_per_client.toFixed(1)}
          </p>
          <p className="text-xs text-gray-600">Avg Visits</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {data.booking_patterns.rebooking_rate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600">Rebook Rate</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-600">
            {data.retention_metrics.new_clients}
          </p>
          <p className="text-xs text-gray-600">New Clients</p>
        </div>
      </div>
    </div>
  )
}
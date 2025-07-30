'use client'

import React from 'react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { ClientMetrics } from '@/services/analytics_service'

interface ClientMetricsChartProps {
  metrics: ClientMetrics
  type?: 'doughnut' | 'bar'
  height?: number
  theme?: 'light' | 'dark'
}

export default function ClientMetricsChart({
  metrics,
  type = 'doughnut',
  height = 300,
  theme = 'light'
}: ClientMetricsChartProps) {

  const colors = {
    light: {
      primary: '#22c55e', // green-500
      secondary: '#3b82f6', // blue-500
      accent: '#a855f7', // purple-500
      warning: '#f59e0b', // amber-500
      danger: '#ef4444', // red-500
      text: '#374151', // gray-700
      grid: 'rgba(55, 65, 81, 0.1)'
    },
    dark: {
      primary: '#22c55e',
      secondary: '#3b82f6',
      accent: '#a855f7',
      warning: '#f59e0b',
      danger: '#ef4444',
      text: '#d1d5db', // gray-300
      grid: 'rgba(209, 213, 219, 0.1)'
    }
  }

  const currentColors = colors[theme]

  if (type === 'doughnut') {
    // Client composition pie chart data
    const pieData = [
      { 
        name: 'New Clients', 
        value: metrics.newClients, 
        color: currentColors.secondary 
      },
      { 
        name: 'Returning Clients', 
        value: metrics.returningClients, 
        color: currentColors.primary 
      },
      { 
        name: 'VIP Clients', 
        value: metrics.vipClients, 
        color: currentColors.accent 
      }
    ]

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0]
        const total = metrics.totalClients
        const percentage = ((data.value / total) * 100).toFixed(1)
        
        return (
          <div 
            className={`p-3 rounded-lg border shadow-lg ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-gray-300' 
                : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            <p className="font-medium">{data.name}</p>
            <p className="text-sm">
              {data.value} ({percentage}%)
            </p>
            {data.name === 'VIP Clients' && (
              <p className="text-xs text-gray-500 mt-1">
                LTV: ${metrics.averageLifetimeValue.toFixed(0)}
              </p>
            )}
          </div>
        )
      }
      return null
    }

    return (
      <div style={{ height: `${height}px`, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={height * 0.18} // 60% of radius for doughnut effect
              outerRadius={height * 0.3}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              wrapperStyle={{ 
                fontSize: '12px', 
                color: currentColors.text,
                fontWeight: '500'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center text showing total clients */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
          className="text-center"
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.totalClients}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Clients
          </div>
        </div>
      </div>
    )
  }

  // Bar chart for client metrics comparison
  const barData = [
    { name: 'New Clients', value: metrics.newClients, color: currentColors.secondary },
    { name: 'Returning', value: metrics.returningClients, color: currentColors.primary },
    { name: 'VIP Clients', value: metrics.vipClients, color: currentColors.accent },
    { name: 'Retention Rate', value: metrics.retentionRate, color: currentColors.warning }
  ]

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      
      return (
        <div 
          className={`p-3 rounded-lg border shadow-lg ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700 text-gray-300' 
              : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            {label === 'Retention Rate' 
              ? `${data.value.toFixed(1)}%` 
              : data.value
            }
          </p>
          {label === 'VIP Clients' && (
            <p className="text-xs text-gray-500 mt-1">
              Average LTV: ${metrics.averageLifetimeValue.toFixed(0)}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={currentColors.grid} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11, fill: currentColors.text }}
            axisLine={{ stroke: currentColors.grid }}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: currentColors.text }}
            axisLine={{ stroke: currentColors.grid }}
            tickFormatter={(value, index) => {
              // Different formatting for retention rate
              if (barData[index] && barData[index].name === 'Retention Rate') {
                return `${value.toFixed(0)}%`
              }
              return value.toFixed(0)
            }}
          />
          <Tooltip content={<CustomBarTooltip />} />
          <Bar 
            dataKey="value" 
            fill={(entry: any) => entry.color}
            radius={[6, 6, 0, 0]}
          >
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
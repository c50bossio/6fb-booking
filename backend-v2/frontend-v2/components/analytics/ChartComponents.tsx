'use client'

import { useMemo } from 'react'

interface BaseChartProps {
  data: any
  options?: any
  className?: string
  height?: number
}

interface SimpleDataPoint {
  label: string
  value: number
  color?: string
}

// Simple Line Chart using SVG
export function LineChart({ data, options = {}, className = '', height = 300 }: BaseChartProps) {
  const chartData = useMemo(() => {
    if (!data?.datasets?.[0]?.data || !data?.labels) return { points: [], maxValue: 0 }
    
    const values = data.datasets[0].data as number[]
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const range = maxValue - minValue || 1
    
    const points = values.map((value, index) => ({
      x: (index / (values.length - 1)) * 100,
      y: 100 - ((value - minValue) / range) * 100,
      value
    }))
    
    return { points, maxValue, minValue, labels: data.labels }
  }, [data])

  const pathData = chartData.points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="w-full h-full bg-white rounded-lg border p-4">
        <div className="text-sm font-medium text-gray-700 mb-2">
          {data?.datasets?.[0]?.label || 'Chart'}
        </div>
        <div className="relative w-full" style={{ height: height - 60 }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(y => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="0.5"
              />
            ))}
            
            {/* Chart line */}
            <path
              d={pathData}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            
            {/* Area fill */}
            <path
              d={`${pathData} L 100 100 L 0 100 Z`}
              fill="rgba(59, 130, 246, 0.1)"
            />
            
            {/* Data points */}
            {chartData.points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="1"
                fill="#3b82f6"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          
          {/* Value labels */}
          <div className="absolute inset-0 pointer-events-none">
            {chartData.points.map((point, index) => (
              <div
                key={index}
                className="absolute text-xs text-gray-600 transform -translate-x-1/2 -translate-y-6"
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`
                }}
                title={`${chartData.labels?.[index] || index}: ${point.value}`}
              >
                ${point.value.toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple Bar Chart using CSS
export function BarChart({ data, options = {}, className = '', height = 300 }: BaseChartProps) {
  const chartData = useMemo(() => {
    if (!data?.datasets?.[0]?.data || !data?.labels) return []
    
    const values = data.datasets[0].data as number[]
    const maxValue = Math.max(...values)
    
    return values.map((value, index) => ({
      label: data.labels[index],
      value,
      percentage: (value / maxValue) * 100,
      color: data.datasets[0].backgroundColor || '#3b82f6'
    }))
  }, [data])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="w-full h-full bg-white rounded-lg border p-4">
        <div className="text-sm font-medium text-gray-700 mb-4">
          {data?.datasets?.[0]?.label || 'Chart'}
        </div>
        <div className="space-y-3" style={{ height: height - 80 }}>
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-16 text-xs text-gray-600 truncate" title={item.label}>
                {item.label}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div
                  className="h-6 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: typeof item.color === 'string' ? item.color : '#3b82f6'
                  }}
                >
                  <span className="text-xs text-white font-medium">
                    {item.value}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Simple Doughnut Chart using CSS
export function DoughnutChart({ data, options = {}, className = '', height = 300 }: BaseChartProps) {
  const chartData = useMemo(() => {
    if (!data?.datasets?.[0]?.data || !data?.labels) return []
    
    const values = data.datasets[0].data as number[]
    const total = values.reduce((sum, value) => sum + value, 0)
    
    let cumulativePercentage = 0
    
    return values.map((value, index) => {
      const percentage = (value / total) * 100
      const startAngle = cumulativePercentage * 3.6 // Convert to degrees
      cumulativePercentage += percentage
      
      return {
        label: data.labels[index],
        value,
        percentage,
        startAngle,
        color: data.datasets[0].backgroundColor?.[index] || `hsl(${index * 60}, 70%, 50%)`
      }
    })
  }, [data])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="w-full h-full bg-white rounded-lg border p-4">
        <div className="text-sm font-medium text-gray-700 mb-4">
          {data?.datasets?.[0]?.label || 'Chart'}
        </div>
        <div className="flex items-center justify-center" style={{ height: height - 100 }}>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke="#f3f4f6"
                strokeWidth="3"
              />
              {chartData.map((segment, index) => {
                const strokeDasharray = `${segment.percentage} ${100 - segment.percentage}`
                const strokeDashoffset = 100 - chartData.slice(0, index).reduce((sum, s) => sum + s.percentage, 0)
                
                return (
                  <circle
                    key={index}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth="3"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                )
              })}
            </svg>
          </div>
          
          {/* Legend */}
          <div className="ml-6 space-y-2">
            {chartData.map((segment, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-xs text-gray-600">
                  {segment.label}: {segment.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple Pie Chart (alias for Doughnut)
export const PieChart = DoughnutChart

// Simple Gauge Chart
export function GaugeChart({ 
  value, 
  max = 100, 
  title = '', 
  className = '', 
  height = 250,
  colors = {
    good: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444'
  }
}: {
  value: number
  max?: number
  title?: string
  className?: string
  height?: number
  colors?: {
    good: string
    warning: string
    danger: string
  }
}) {
  const percentage = (value / max) * 100
  let color = colors.danger
  if (percentage >= 80) color = colors.good
  else if (percentage >= 60) color = colors.warning

  const circumference = 2 * Math.PI * 45
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="w-full h-full bg-white rounded-lg border p-4 flex flex-col items-center justify-center">
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">
              {value.toFixed(1)}%
            </span>
            {title && (
              <span className="text-sm text-gray-600 mt-1">
                {title}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Chart data transformation utilities (simplified)
export const chartUtils = {
  // Transform revenue data for line chart
  transformRevenueData: (data: Array<{period: string, revenue: number}>) => ({
    labels: data.map(d => new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Revenue',
      data: data.map(d => d.revenue),
    }]
  }),

  // Transform service revenue data for doughnut chart
  transformServiceData: (data: Array<{service_name: string, revenue: number, percentage: number}>) => ({
    labels: data.map(d => d.service_name),
    datasets: [{
      data: data.map(d => d.revenue),
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
      ],
    }]
  }),

  // Transform appointment data for bar chart
  transformAppointmentData: (data: Array<{period: string, appointments: number}>) => ({
    labels: data.map(d => new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Appointments',
      data: data.map(d => d.appointments),
      backgroundColor: '#10B981',
    }]
  }),

  // Chart color palettes
  colors: {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    cyan: '#06B6D4',
    pink: '#EC4899',
    indigo: '#6366F1',
  },

  // Common chart options (simplified)
  defaultOptions: {
    revenue: {},
    percentage: {}
  }
}
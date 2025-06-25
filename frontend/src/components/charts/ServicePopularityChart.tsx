'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import ChartWrapper, { useChartTheme } from './ChartWrapper'

interface ServiceData {
  name: string
  bookings: number
  revenue: number
  averagePrice: number
  growth: number
}

interface ServicePopularityChartProps {
  data: ServiceData[]
  title?: string
  subtitle?: string
  sortBy?: 'bookings' | 'revenue'
  height?: number
  loading?: boolean
  className?: string
}

export default function ServicePopularityChart({
  data,
  title = "Service Popularity",
  subtitle = "Top performing services by bookings and revenue",
  sortBy = 'bookings',
  height = 350,
  loading = false,
  className = ''
}: ServicePopularityChartProps) {
  const { colors, gridColor, textColor, accent } = useChartTheme()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Sort data by selected metric
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'revenue') {
      return b.revenue - a.revenue
    }
    return b.bookings - a.bookings
  })

  const maxValue = Math.max(...sortedData.map(item => sortBy === 'revenue' ? item.revenue : item.bookings))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const truncateText = (text: string, maxLength: number = 15) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getBarColor = (index: number) => {
    if (hoveredIndex === index) {
      return accent
    }
    return colors[index % colors.length]
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg min-w-[200px]"
      >
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {data.name}
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Bookings:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {data.bookings.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Revenue:</span>
            <span className="text-sm font-medium text-green-600">
              {formatCurrency(data.revenue)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Avg Price:</span>
            <span className="text-sm font-medium text-blue-600">
              {formatCurrency(data.averagePrice)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Growth:</span>
            <span
              className={`text-sm font-medium ${
                data.growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  const CustomBar = (props: any) => {
    const { index, ...rest } = props

    return (
      <motion.g
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        style={{ transformOrigin: 'bottom' }}
      >
        <Bar
          {...rest}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        />
      </motion.g>
    )
  }

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      height={height}
      loading={loading}
      className={className}
    >
      <BarChart
        data={sortedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={gridColor}
          opacity={0.3}
        />
        <XAxis
          dataKey="name"
          stroke={textColor}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          angle={-45}
          textAnchor="end"
          height={80}
          tickFormatter={(value) => truncateText(value, 12)}
        />
        <YAxis
          stroke={textColor}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) =>
            sortBy === 'revenue'
              ? `$${(value / 1000).toFixed(0)}k`
              : value.toString()
          }
        />
        <Tooltip content={<CustomTooltip />} />

        <Bar
          dataKey={sortBy === 'revenue' ? 'revenue' : 'bookings'}
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
          onMouseEnter={(data, index) => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {sortedData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(index)}
              style={{
                filter: hoveredIndex === index ? 'brightness(1.1)' : 'none',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  )
}

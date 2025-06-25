'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts'
import { format, parseISO } from 'date-fns'
import ChartWrapper, { useChartTheme } from './ChartWrapper'

interface RevenueDataPoint {
  date: string
  revenue: number
  target?: number
  services: number
  products: number
  tips: number
}

interface RevenueTrendChartProps {
  data: RevenueDataPoint[]
  title?: string
  subtitle?: string
  showTarget?: boolean
  showBreakdown?: boolean
  height?: number
  loading?: boolean
  className?: string
}

export default function RevenueTrendChart({
  data,
  title = "Revenue Trends",
  subtitle = "Daily revenue performance over time",
  showTarget = true,
  showBreakdown = false,
  height = 400,
  loading = false,
  className = ''
}: RevenueTrendChartProps) {
  const { colors, gridColor, textColor, accent } = useChartTheme()
  const [animationComplete, setAnimationComplete] = useState(false)
  const [hoveredData, setHoveredData] = useState<RevenueDataPoint | null>(null)

  // Calculate totals and trends
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0
  const trend = data.length > 1
    ? ((data[data.length - 1].revenue - data[0].revenue) / data[0].revenue) * 100
    : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd')
    } catch {
      return dateStr
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg"
      >
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          {formatDate(label)}
        </p>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue:</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatCurrency(data.revenue)}
            </span>
          </div>

          {showBreakdown && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Services:</span>
                <span className="text-sm text-green-600">{formatCurrency(data.services)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Products:</span>
                <span className="text-sm text-blue-600">{formatCurrency(data.products)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tips:</span>
                <span className="text-sm text-purple-600">{formatCurrency(data.tips)}</span>
              </div>
            </>
          )}

          {data.target && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Target:</span>
              <span className="text-sm text-orange-600">{formatCurrency(data.target)}</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!hoveredData || hoveredData.date !== payload.date) return null

    return (
      <motion.circle
        initial={{ r: 0 }}
        animate={{ r: 6 }}
        cx={cx}
        cy={cy}
        fill={accent}
        stroke="#fff"
        strokeWidth={2}
      />
    )
  }

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      height={height}
      loading={loading}
      className={className}
    >
      {!showBreakdown ? (
        <LineChart
          data={data}
          onMouseMove={(state: any) => {
            if (state.activePayload && state.activePayload[0]) {
              setHoveredData(state.activePayload[0].payload)
            }
          }}
          onMouseLeave={() => setHoveredData(null)}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            opacity={0.3}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke={textColor}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            stroke={textColor}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Target line */}
          {showTarget && avgRevenue > 0 && (
            <ReferenceLine
              y={avgRevenue}
              stroke={colors[2]}
              strokeDasharray="5 5"
              strokeOpacity={0.7}
              label={{ value: "Target", position: "topRight" } as any}
            />
          )}

          <Line
            type="monotone"
            dataKey="revenue"
            stroke={accent}
            strokeWidth={3}
            dot={<CustomDot />}
            activeDot={{ r: 6, stroke: accent, strokeWidth: 2, fill: '#fff' }}
            animationDuration={2000}
            animationBegin={0}
          />
        </LineChart>
      ) : (
        <AreaChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            opacity={0.3}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke={textColor}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            stroke={textColor}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="services"
            stackId="1"
            stroke={colors[1]}
            fill={colors[1]}
            fillOpacity={0.6}
            animationDuration={2000}
          />
          <Area
            type="monotone"
            dataKey="products"
            stackId="1"
            stroke={colors[0]}
            fill={colors[0]}
            fillOpacity={0.6}
            animationDuration={2000}
            animationBegin={200}
          />
          <Area
            type="monotone"
            dataKey="tips"
            stackId="1"
            stroke={colors[4]}
            fill={colors[4]}
            fillOpacity={0.6}
            animationDuration={2000}
            animationBegin={400}
          />
        </AreaChart>
      )}
    </ChartWrapper>
  )
}

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import ChartWrapper, { useChartTheme } from './ChartWrapper'

interface AppointmentData {
  status: string
  count: number
  percentage: number
  color?: string
}

interface AppointmentDistributionChartProps {
  data: AppointmentData[]
  title?: string
  subtitle?: string
  height?: number
  loading?: boolean
  className?: string
}

export default function AppointmentDistributionChart({
  data,
  title = "Appointment Distribution",
  subtitle = "Breakdown of appointment statuses",
  height = 350,
  loading = false,
  className = ''
}: AppointmentDistributionChartProps) {
  const { colors, gridColor, textColor, accent } = useChartTheme()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null)

  // Assign colors to data if not provided
  const coloredData = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length]
  }))

  const total = data.reduce((sum, item) => sum + item.count, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg"
      >
        <div className="flex items-center space-x-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {data.status}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Count:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {data.count.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Percentage:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {data.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  const CustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    // Only show label if percentage is greater than 5%
    if (percent < 0.05) return null

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
    setHoveredSlice(index)
  }

  const onPieLeave = () => {
    setActiveIndex(null)
    setHoveredSlice(null)
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center space-x-2 cursor-pointer ${
              hoveredSlice === index ? 'opacity-100' : 'opacity-80'
            }`}
            onMouseEnter={() => setHoveredSlice(index)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {entry.value}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({entry.payload.count})
            </span>
          </motion.div>
        ))}
      </div>
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
      <div className="flex flex-col h-full">
        {/* Center Stats */}
        <div className="relative flex-1">
          <PieChart>
            <Pie
              data={coloredData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomizedLabel}
              outerRadius={100}
              innerRadius={40}
              fill="#8884d8"
              dataKey="count"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationBegin={0}
              animationDuration={1000}
            >
              {coloredData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={hoveredSlice === index ? '#fff' : 'none'}
                  strokeWidth={hoveredSlice === index ? 2 : 0}
                  style={{
                    filter: hoveredSlice === index ? 'brightness(1.1)' : 'none',
                    transform: hoveredSlice === index ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>

          {/* Center Total */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {total.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Appointments
              </p>
            </div>
          </motion.div>
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <CustomLegend payload={coloredData.map((item, index) => ({
            value: item.status,
            color: item.color,
            payload: item
          }))} />
        </motion.div>
      </div>
    </ChartWrapper>
  )
}

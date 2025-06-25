'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import ChartWrapper, { useChartTheme } from './ChartWrapper'

interface HeatmapData {
  day: string
  hour: number
  bookings: number
  revenue: number
}

interface PeakHoursHeatmapProps {
  data: HeatmapData[]
  title?: string
  subtitle?: string
  metric?: 'bookings' | 'revenue'
  height?: number
  loading?: boolean
  className?: string
}

export default function PeakHoursHeatmap({
  data,
  title = "Peak Hours Analysis",
  subtitle = "Busiest times throughout the week",
  metric = 'bookings',
  height = 400,
  loading = false,
  className = ''
}: PeakHoursHeatmapProps) {
  const { colors, gridColor, textColor, accent } = useChartTheme()
  const [hoveredCell, setHoveredCell] = useState<HeatmapData | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<'bookings' | 'revenue'>(metric)

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const hours = Array.from({ length: 12 }, (_, i) => i + 9) // 9 AM to 8 PM

  // Create a matrix of the data
  const matrix: Array<Array<HeatmapData | null>> = days.map(day =>
    hours.map(hour => {
      const found = data.find(d => d.day === day && d.hour === hour)
      return found || null
    })
  )

  // Calculate min/max values for color scaling
  const values = data.map(d => selectedMetric === 'bookings' ? d.bookings : d.revenue).filter(v => v > 0)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  const getIntensity = (value: number) => {
    if (value === 0) return 0
    return ((value - minValue) / (maxValue - minValue))
  }

  const getColor = (intensity: number) => {
    if (intensity === 0) return 'rgba(156, 163, 175, 0.1)' // gray-400 with low opacity

    // Create gradient from accent color
    const r = parseInt(accent.slice(1, 3), 16)
    const g = parseInt(accent.slice(3, 5), 16)
    const b = parseInt(accent.slice(5, 7), 16)

    return `rgba(${r}, ${g}, ${b}, ${0.1 + intensity * 0.8})`
  }

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour
    return `${displayHour}${period}`
  }

  const formatValue = (value: number, type: 'bookings' | 'revenue') => {
    if (type === 'revenue') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value)
    }
    return value.toString()
  }

  const CustomTooltip = ({ data }: { data: HeatmapData }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg"
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
        {data.day} at {formatHour(data.hour)}
      </p>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Bookings:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {data.bookings}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Revenue:</span>
          <span className="text-sm font-medium text-green-600">
            {formatValue(data.revenue, 'revenue')}
          </span>
        </div>
      </div>
    </motion.div>
  )

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      height={height}
      loading={loading}
      className={className}
    >
      <div className="flex flex-col h-full">
        {/* Metric Toggle */}
        <div className="flex justify-center mb-4">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setSelectedMetric('bookings')}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                selectedMetric === 'bookings'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Bookings
            </button>
            <button
              onClick={() => setSelectedMetric('revenue')}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                selectedMetric === 'revenue'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Revenue
            </button>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="flex-1 flex flex-col">
          <div className="flex">
            {/* Days header */}
            <div className="w-20"></div>
            <div className="flex-1 grid grid-cols-12 gap-1">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="text-xs text-gray-600 dark:text-gray-400 text-center py-1"
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap Body */}
          <div className="flex-1">
            {matrix.map((row, dayIndex) => (
              <motion.div
                key={days[dayIndex]}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: dayIndex * 0.1 }}
                className="flex items-center mb-1"
              >
                {/* Day label */}
                <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right pr-2">
                  {days[dayIndex].slice(0, 3)}
                </div>

                {/* Hour cells */}
                <div className="flex-1 grid grid-cols-12 gap-1">
                  {row.map((cell, hourIndex) => {
                    const value = cell ? (selectedMetric === 'bookings' ? cell.bookings : cell.revenue) : 0
                    const intensity = getIntensity(value)

                    return (
                      <motion.div
                        key={hourIndex}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: (dayIndex * 12 + hourIndex) * 0.01 }}
                        className="relative aspect-square rounded cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all"
                        style={{
                          backgroundColor: getColor(intensity),
                          ringColor: accent
                        }}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {value > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-900 dark:text-white">
                              {selectedMetric === 'bookings' ? value : Math.round(value / 100)}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Color Scale Legend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center mt-4 space-x-2"
          >
            <span className="text-xs text-gray-600 dark:text-gray-400">Less</span>
            <div className="flex space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getColor(i / 4) }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">More</span>
          </motion.div>
        </div>

        {/* Tooltip */}
        {hoveredCell && (
          <div className="absolute z-10 pointer-events-none">
            <CustomTooltip data={hoveredCell} />
          </div>
        )}
      </div>
    </ChartWrapper>
  )
}

'use client'

import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { useTheme } from '@/contexts/ThemeContext'
import { getAccentColor } from '@/lib/theme-utils'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface KPICardProps {
  title: string
  value: number
  previousValue?: number
  prefix?: string
  suffix?: string
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number
  trendData?: Array<{ value: number }>
  onClick?: () => void
  loading?: boolean
  className?: string
}

export default function AnimatedKPICard({
  title,
  value,
  previousValue,
  prefix = '',
  suffix = '',
  icon,
  color,
  trend = 'neutral',
  trendValue,
  trendData,
  onClick,
  loading = false,
  className = ''
}: KPICardProps) {
  const { theme } = useTheme()

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#10b981' // Green
      case 'down':
        return '#ef4444' // Red
      default:
        return '#6b7280' // Gray
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↗'
      case 'down':
        return '↘'
      default:
        return '→'
    }
  }

  const formatTrendValue = (val: number) => {
    if (val > 0) return `+${val.toFixed(1)}%`
    return `${val.toFixed(1)}%`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-xl p-6 cursor-pointer group
        hover:border-opacity-50 transition-all duration-300 shadow-sm hover:shadow-lg
        ${className}
      `}
      style={{
        '--hover-border-color': color
      } as React.CSSProperties}
    >
      {loading ? (
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="p-3 rounded-xl shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}dd)`
              }}
            >
              <div className="text-white text-xl">
                {icon}
              </div>
            </motion.div>

            {trendValue !== undefined && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-right"
              >
                <div
                  className="text-xs font-medium px-2 py-1 rounded-full flex items-center space-x-1"
                  style={{
                    color: getTrendColor(),
                    backgroundColor: `${getTrendColor()}20`
                  }}
                >
                  <span>{getTrendIcon()}</span>
                  <span>{formatTrendValue(trendValue)}</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div>
            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
              {title}
            </p>

            <div className="flex items-end justify-between">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1"
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {prefix}
                  <CountUp
                    end={value}
                    duration={1.5}
                    separator=","
                    decimals={prefix === '$' ? 0 : 1}
                    decimal="."
                  />
                  {suffix}
                </p>

                {previousValue !== undefined && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    vs {prefix}{previousValue.toLocaleString()}{suffix} last period
                  </motion.p>
                )}
              </motion.div>

              {/* Mini Trend Chart */}
              {trendData && trendData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="w-20 h-12 ml-4"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="0"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>
          </div>

          {/* Animated Progress Bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.5, duration: 1 }}
            className="mt-4 h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: `${color}20` }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ delay: 0.7, duration: 1.2, type: "spring" }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${color}, ${color}aa)`
              }}
            />
          </motion.div>
        </>
      )}
    </motion.div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { ResponsiveContainer } from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import { getAccentColor } from '@/lib/theme-utils'

interface ChartWrapperProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  className?: string
  height?: number
  loading?: boolean
  error?: string
}

export default function ChartWrapper({
  children,
  title,
  subtitle,
  className = '',
  height = 300,
  loading = false,
  error
}: ChartWrapperProps) {
  const { theme } = useTheme()

  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          background: '#ffffff',
          cardBackground: '#f8fafc',
          textPrimary: '#1f2937',
          textSecondary: '#6b7280',
          border: '#e5e7eb',
          gridColor: '#f3f4f6'
        }
      case 'soft-light':
        return {
          background: '#f5f5f0',
          cardBackground: '#faf9f6',
          textPrimary: '#3a3a3a',
          textSecondary: '#6b6b6b',
          border: '#e0e0d9',
          gridColor: '#f0f0eb'
        }
      case 'dark':
        return {
          background: '#111827',
          cardBackground: '#1f2937',
          textPrimary: '#f9fafb',
          textSecondary: '#d1d5db',
          border: '#374151',
          gridColor: '#374151'
        }
      case 'charcoal':
        return {
          background: '#1a1a1a',
          cardBackground: '#242424',
          textPrimary: '#ffffff',
          textSecondary: '#a8a8a8',
          border: '#2a2a2a',
          gridColor: '#2a2a2a'
        }
      default:
        return {
          background: '#ffffff',
          cardBackground: '#f8fafc',
          textPrimary: '#1f2937',
          textSecondary: '#6b7280',
          border: '#e5e7eb',
          gridColor: '#f3f4f6'
        }
    }
  }

  const colors = getThemeColors()
  const accent = getAccentColor(theme)

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 ${className}`}
      >
        <div className="text-center py-8">
          <div className="text-red-500 text-sm">Error loading chart: {error}</div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-lg transition-all duration-300 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      ) : (
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

export const useChartTheme = () => {
  const { theme } = useTheme()

  const getChartColors = () => {
    const baseColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
      '#06b6d4', '#84cc16', '#a855f7', '#f43f5e'
    ]

    switch (theme) {
      case 'soft-light':
        return [
          '#7c9885', '#22c55e', '#f59e0b', '#ef4444',
          '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
          '#06b6d4', '#84cc16', '#a855f7', '#f43f5e'
        ]
      case 'dark':
        return [
          '#0d9488', '#10b981', '#f59e0b', '#ef4444',
          '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
          '#06b6d4', '#84cc16', '#a855f7', '#f43f5e'
        ]
      case 'charcoal':
        return [
          '#6b7280', '#10b981', '#f59e0b', '#ef4444',
          '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
          '#06b6d4', '#84cc16', '#a855f7', '#f43f5e'
        ]
      default:
        return baseColors
    }
  }

  const getGridColor = () => {
    switch (theme) {
      case 'dark':
        return '#374151'
      case 'charcoal':
        return '#2a2a2a'
      case 'soft-light':
        return '#e0e0d9'
      default:
        return '#e5e7eb'
    }
  }

  const getTextColor = () => {
    switch (theme) {
      case 'dark':
      case 'charcoal':
        return '#9ca3af'
      case 'soft-light':
        return '#6b6b6b'
      default:
        return '#6b7280'
    }
  }

  return {
    colors: getChartColors(),
    gridColor: getGridColor(),
    textColor: getTextColor(),
    accent: getAccentColor(theme)
  }
}

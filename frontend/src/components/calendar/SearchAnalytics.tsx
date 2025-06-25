'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  CursorArrowClickIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { searchService } from '@/services/searchService'
import { exportService } from '@/services/exportService'
import { useTheme } from '@/contexts/ThemeContext'

// ===== TYPES =====

interface SearchAnalyticsProps {
  isOpen: boolean
  onClose: () => void
}

interface AnalyticsMetric {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  trend?: number
}

// ===== COMPONENT =====

export default function SearchAnalytics({ isOpen, onClose }: SearchAnalyticsProps) {
  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  const [analytics, setAnalytics] = useState<any>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // ===== EFFECTS =====

  useEffect(() => {
    if (isOpen) {
      loadAnalytics()
      // Refresh analytics every 10 seconds
      const interval = setInterval(loadAnalytics, 10000)
      setRefreshInterval(interval)
    } else if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [isOpen])

  // ===== HELPERS =====

  const loadAnalytics = () => {
    const data = searchService.getSearchAnalytics()
    setAnalytics(data)
  }

  const exportAnalytics = (format: 'csv' | 'json') => {
    if (analytics) {
      exportService.exportAnalytics(analytics, format)
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`
    }
    return num.toString()
  }

  // ===== RENDER =====

  if (!isOpen || !analytics) return null

  const metrics: AnalyticsMetric[] = [
    {
      label: 'Total Searches',
      value: formatNumber(analytics.totalSearches),
      icon: MagnifyingGlassIcon,
      color: 'text-violet-600',
      trend: 12 // Example trend percentage
    },
    {
      label: 'Avg Search Time',
      value: `${analytics.averageSearchTime.toFixed(0)}ms`,
      icon: ClockIcon,
      color: 'text-blue-600',
      trend: -8 // Negative is good for time
    },
    {
      label: 'Avg Results',
      value: analytics.averageResultCount.toFixed(1),
      icon: ChartBarIcon,
      color: 'text-green-600'
    },
    {
      label: 'Click Rate',
      value: `${analytics.clickThroughRate.toFixed(1)}%`,
      icon: CursorArrowClickIcon,
      color: 'text-orange-600',
      trend: 5
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
                  Search Analytics
                </h2>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Performance metrics and insights
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="h-5 w-5" style={{ color: colors.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border"
                  style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                        {metric.label}
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${metric.color}`}>
                        {metric.value}
                      </p>
                      {metric.trend !== undefined && (
                        <div className="flex items-center mt-2">
                          <ArrowTrendingUpIcon
                            className={`h-4 w-4 ${metric.trend > 0 ? 'text-green-500' : 'text-red-500'} ${
                              metric.trend < 0 && metric.label.includes('Time') ? 'text-green-500' : ''
                            }`}
                          />
                          <span className={`text-xs ml-1 ${
                            metric.trend > 0 ? 'text-green-600' : 'text-red-600'
                          } ${metric.trend < 0 && metric.label.includes('Time') ? 'text-green-600' : ''}`}>
                            {Math.abs(metric.trend)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <Icon className={`h-8 w-8 ${metric.color} opacity-20`} />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Popular Searches */}
          <div className="rounded-lg border" style={{ borderColor: colors.border }}>
            <div className="p-4 border-b" style={{ borderColor: colors.border }}>
              <h3 className="font-medium" style={{ color: colors.textPrimary }}>
                Popular Searches
              </h3>
            </div>
            <div className="p-4">
              {analytics.popularQueries.length > 0 ? (
                <div className="space-y-3">
                  {analytics.popularQueries.map((query: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: colors.background }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                          #{index + 1}
                        </span>
                        <span style={{ color: colors.textPrimary }}>
                          {query.query}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm" style={{ color: colors.textSecondary }}>
                          {query.count} searches
                        </span>
                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-600 rounded-full"
                            style={{
                              width: `${(query.count / analytics.totalSearches) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8" style={{ color: colors.textSecondary }}>
                  No search data available yet
                </p>
              )}
            </div>
          </div>

          {/* Performance Tips */}
          <div className="rounded-lg border" style={{ borderColor: colors.border }}>
            <div className="p-4 border-b" style={{ borderColor: colors.border }}>
              <h3 className="font-medium" style={{ color: colors.textPrimary }}>
                Performance Insights
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {analytics.averageSearchTime < 50 && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <p className="text-sm" style={{ color: colors.textPrimary }}>
                    Excellent search performance! Average search time is under 50ms.
                  </p>
                </div>
              )}

              {analytics.clickThroughRate > 70 && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <p className="text-sm" style={{ color: colors.textPrimary }}>
                    High engagement rate! Users are finding relevant results.
                  </p>
                </div>
              )}

              {analytics.averageResultCount < 5 && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5" />
                  <p className="text-sm" style={{ color: colors.textPrimary }}>
                    Consider broadening search criteria to show more results.
                  </p>
                </div>
              )}

              {analytics.totalSearches > 100 && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <p className="text-sm" style={{ color: colors.textPrimary }}>
                    Search feature is being actively used. Consider adding more filter presets.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: colors.border }}>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Auto-refreshing every 10 seconds
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportAnalytics('json')}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center space-x-2"
              style={{ borderColor: colors.border }}
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => exportAnalytics('csv')}
              className="px-3 py-1.5 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center space-x-2"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

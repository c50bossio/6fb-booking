'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  TrophyIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  MapPinIcon,
  PhoneIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  CalendarIcon,
  GlobeAltIcon,
  UserGroupIcon,
  StarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { seoAnalyticsAPI, SEOAnalytics } from '@/lib/api/local-seo'

interface SEOAnalyticsDashboardProps {
  analytics: SEOAnalytics | null
  onAnalyticsUpdate: () => void
}

export default function SEOAnalyticsDashboard({ analytics, onAnalyticsUpdate }: SEOAnalyticsDashboardProps) {
  const [selectedDateRange, setSelectedDateRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('impressions')
  const [loading, setLoading] = useState(false)

  const handleDateRangeChange = async (range: string) => {
    setSelectedDateRange(range)
    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()

      switch (range) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      const response = await seoAnalyticsAPI.getAnalytics({
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      })

      if (response.success) {
        onAnalyticsUpdate()
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUpIcon className="h-4 w-4 text-green-500" />
    if (current < previous) return <ArrowDownIcon className="h-4 w-4 text-red-500" />
    return <MinusIcon className="h-4 w-4 text-gray-400" />
  }

  const getTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous * 100).toFixed(1)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(1)}%`
  }

  if (!analytics) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
        <div className="text-center">
          <ChartBarIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Analytics Data Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Connect your Google Search Console and Google Analytics to view detailed SEO performance metrics.
          </p>
          <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg">
            <GlobeAltIcon className="h-5 w-5 mr-2" />
            Connect Analytics
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SEO Performance Analytics</h2>
        <div className="flex items-center space-x-3">
          <select
            value={selectedDateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <EyeIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon(analytics.overview.total_impressions, analytics.overview.total_impressions * 0.9)}
              <span className="text-gray-600 dark:text-gray-400">
                {getTrendPercentage(analytics.overview.total_impressions, analytics.overview.total_impressions * 0.9)}%
              </span>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Total Impressions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(analytics.overview.total_impressions)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <CursorArrowRaysIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon(analytics.overview.total_clicks, analytics.overview.total_clicks * 0.85)}
              <span className="text-gray-600 dark:text-gray-400">
                {getTrendPercentage(analytics.overview.total_clicks, analytics.overview.total_clicks * 0.85)}%
              </span>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Total Clicks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(analytics.overview.total_clicks)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
              <TrophyIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon(1/analytics.overview.average_position, 1/(analytics.overview.average_position * 1.1))}
              <span className="text-gray-600 dark:text-gray-400">
                {getTrendPercentage(1/analytics.overview.average_position, 1/(analytics.overview.average_position * 1.1))}%
              </span>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Avg. Position</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.overview.average_position.toFixed(1)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon(analytics.overview.click_through_rate, analytics.overview.click_through_rate * 0.95)}
              <span className="text-gray-600 dark:text-gray-400">
                {getTrendPercentage(analytics.overview.click_through_rate, analytics.overview.click_through_rate * 0.95)}%
              </span>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Click Through Rate</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPercentage(analytics.overview.click_through_rate)}
          </p>
        </div>
      </div>

      {/* Local Pack Performance */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Local Pack Performance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <MapPinIcon className="h-6 w-6 text-teal-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatNumber(analytics.local_pack_performance.appearances)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Local Pack Appearances</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <CursorArrowRaysIcon className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatNumber(analytics.local_pack_performance.clicks)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Local Pack Clicks</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <PhoneIcon className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatNumber(analytics.local_pack_performance.calls)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Phone Calls</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <MapPinIcon className="h-6 w-6 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatNumber(analytics.local_pack_performance.direction_requests)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Directions</p>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Trends</h3>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          >
            <option value="impressions">Impressions</option>
            <option value="clicks">Clicks</option>
            <option value="position">Average Position</option>
          </select>
        </div>

        {/* Simple chart visualization */}
        <div className="space-y-3">
          {analytics.time_series.slice(-14).map((data, index) => {
            const value = selectedMetric === 'impressions' ? data.impressions :
                         selectedMetric === 'clicks' ? data.clicks : data.position
            const maxValue = Math.max(...analytics.time_series.map(d =>
              selectedMetric === 'impressions' ? d.impressions :
              selectedMetric === 'clicks' ? d.clicks : d.position
            ))
            const percentage = selectedMetric === 'position' ?
              (maxValue - value) / maxValue * 100 : // Invert for position (lower is better)
              (value / maxValue) * 100

            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-16 text-xs text-gray-600 dark:text-gray-400">
                  {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-16 text-xs text-gray-900 dark:text-white font-medium text-right">
                  {selectedMetric === 'position' ? value.toFixed(1) : formatNumber(value)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Performing Keywords</h3>
          <div className="space-y-4">
            {analytics.keyword_performance.slice(0, 5).map((keyword, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{keyword.keyword}</h4>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span>Position: {keyword.position.toFixed(1)}</span>
                    <span>CTR: {formatPercentage(keyword.ctr)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{formatNumber(keyword.clicks)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">clicks</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Competitor Analysis</h3>
          <div className="space-y-4">
            {analytics.competitor_analysis.slice(0, 5).map((competitor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{competitor.competitor_name}</h4>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span>Keywords: {competitor.ranking_keywords}</span>
                    <span>Avg. Position: {competitor.average_position.toFixed(1)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full"
                        style={{ width: `${competitor.visibility_score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                      {competitor.visibility_score}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">visibility</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

interface ChartData {
  date: string
  emailsSent: number
  smsSent: number
  openRate: number
  clickRate: number
}

interface UsageChartProps {
  data?: ChartData[]
  height?: number
  showLegend?: boolean
}

export default function UsageChart({ 
  data: propData, 
  height = 300,
  showLegend = true 
}: UsageChartProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  
  // Mock data if none provided
  const mockData: ChartData[] = [
    { date: '2024-12-01', emailsSent: 120, smsSent: 45, openRate: 68, clickRate: 12 },
    { date: '2024-12-05', emailsSent: 200, smsSent: 80, openRate: 72, clickRate: 15 },
    { date: '2024-12-10', emailsSent: 150, smsSent: 60, openRate: 70, clickRate: 14 },
    { date: '2024-12-15', emailsSent: 380, smsSent: 120, openRate: 65, clickRate: 13 },
    { date: '2024-12-20', emailsSent: 450, smsSent: 127, openRate: 72, clickRate: 16 },
    { date: '2024-12-22', emailsSent: 0, smsSent: 215, openRate: 0, clickRate: 0 },
    { date: '2024-12-25', emailsSent: 100, smsSent: 40, openRate: 69, clickRate: 11 },
    { date: '2024-12-28', emailsSent: 523, smsSent: 0, openRate: 73, clickRate: 18 }
  ]

  const data = propData || mockData

  // Calculate max values for scaling
  const maxMessages = Math.max(...data.map(d => d.emailsSent + d.smsSent))
  const maxRate = 100

  // Calculate trends
  const latestData = data[data.length - 1]
  const previousData = data[data.length - 2]
  const openRateTrend = latestData.openRate > previousData.openRate ? 'up' : 'down'
  const clickRateTrend = latestData.clickRate > previousData.clickRate ? 'up' : 'down'

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-500" />
          <div className="flex gap-1">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7 days
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30 days
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              90 days
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <Card>
        <CardContent className="p-6">
          <div style={{ height }} className="relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{maxMessages}</span>
              <span>{Math.round(maxMessages * 0.75)}</span>
              <span>{Math.round(maxMessages * 0.5)}</span>
              <span>{Math.round(maxMessages * 0.25)}</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-14 h-full relative">
              {/* Grid lines */}
              <div className="absolute inset-0">
                {[0, 25, 50, 75, 100].map(percent => (
                  <div
                    key={percent}
                    className="absolute w-full border-t border-gray-200 dark:border-gray-700"
                    style={{ top: `${percent}%` }}
                  />
                ))}
              </div>

              {/* Bars */}
              <div className="relative h-full flex items-end justify-between gap-2 px-2">
                {data.map((item, index) => {
                  const emailHeight = (item.emailsSent / maxMessages) * 100
                  const smsHeight = (item.smsSent / maxMessages) * 100
                  const totalHeight = emailHeight + smsHeight

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex items-end gap-1" style={{ height: '90%' }}>
                        <div className="flex-1 relative">
                          <div
                            className="absolute bottom-0 w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all duration-300 hover:bg-blue-600 dark:hover:bg-blue-500"
                            style={{ height: `${emailHeight}%` }}
                            title={`Email: ${item.emailsSent}`}
                          />
                        </div>
                        <div className="flex-1 relative">
                          <div
                            className="absolute bottom-0 w-full bg-green-500 dark:bg-green-600 rounded-t transition-all duration-300 hover:bg-green-600 dark:hover:bg-green-500"
                            style={{ height: `${smsHeight}%` }}
                            title={`SMS: ${item.smsSent}`}
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 transform -rotate-45 origin-left whitespace-nowrap">
                        {formatDate(item.date)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="mt-6 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 dark:bg-blue-600 rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">SMS</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average Open Rate
              </h4>
              {openRateTrend === 'up' ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.reduce((sum, d) => sum + d.openRate, 0) / data.filter(d => d.openRate > 0).length || 0}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {openRateTrend === 'up' ? '+' : '-'}
              {Math.abs(latestData.openRate - previousData.openRate).toFixed(1)}% from previous
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average Click Rate
              </h4>
              {clickRateTrend === 'up' ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.reduce((sum, d) => sum + d.clickRate, 0) / data.filter(d => d.clickRate > 0).length || 0}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {clickRateTrend === 'up' ? '+' : '-'}
              {Math.abs(latestData.clickRate - previousData.clickRate).toFixed(1)}% from previous
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
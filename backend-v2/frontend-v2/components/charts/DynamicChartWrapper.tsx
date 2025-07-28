'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

interface ChartLoadingProps {
  height?: number
  message?: string
}

const ChartLoading = ({ height = 400, message = "Loading chart..." }: ChartLoadingProps) => (
  <div 
    className="flex items-center justify-center bg-gray-50 rounded-lg border"
    style={{ height: `${height}px` }}
  >
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  </div>
)

// Dynamically import chart components to reduce initial bundle size
export const DynamicRevenueChart = dynamic(
  () => import('./RevenueChart'),
  {
    loading: () => <ChartLoading message="Loading revenue chart..." />,
    ssr: false
  }
)

export const DynamicClientMetricsChart = dynamic(
  () => import('./ClientMetricsChart'),
  {
    loading: () => <ChartLoading message="Loading client metrics..." />,
    ssr: false
  }
)

export const DynamicServicePerformanceChart = dynamic(
  () => import('./ServicePerformanceChart'),
  {
    loading: () => <ChartLoading message="Loading service performance..." />,
    ssr: false
  }
)

export const DynamicSixFBScoreChart = dynamic(
  () => import('./SixFBScoreChart'),
  {
    loading: () => <ChartLoading message="Loading Six FB score..." />,
    ssr: false
  }
)

export const DynamicPerformanceChart = dynamic(
  () => import('./PerformanceChart'),
  {
    loading: () => <ChartLoading message="Loading performance analytics..." />,
    ssr: false
  }
)

export const DynamicClientAnalyticsChart = dynamic(
  () => import('./ClientAnalyticsChart'),
  {
    loading: () => <ChartLoading message="Loading client analytics..." />,
    ssr: false
  }
)

// Wrapper component for all charts to provide consistent loading and error handling
interface DynamicChartWrapperProps {
  type: 'revenue' | 'clientMetrics' | 'servicePerformance' | 'sixFBScore' | 'performance' | 'clientAnalytics'
  height?: number
  [key: string]: any
}

export default function DynamicChartWrapper({ type, height = 400, ...props }: DynamicChartWrapperProps) {
  const ChartComponent = {
    revenue: DynamicRevenueChart,
    clientMetrics: DynamicClientMetricsChart,
    servicePerformance: DynamicServicePerformanceChart,
    sixFBScore: DynamicSixFBScoreChart,
    performance: DynamicPerformanceChart,
    clientAnalytics: DynamicClientAnalyticsChart
  }[type]

  if (!ChartComponent) {
    return (
      <div className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200 p-4">
        <p className="text-red-600">Unknown chart type: {type}</p>
      </div>
    )
  }

  return (
    <Suspense fallback={<ChartLoading height={height} message={`Loading ${type} chart...`} />}>
      <ChartComponent {...props} />
    </Suspense>
  )
}
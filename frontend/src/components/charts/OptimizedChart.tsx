'use client'

import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Dynamic import for chart library - using only recharts for consistency
const Chart = lazy(() => import('recharts').then(module => ({
  default: module.ResponsiveContainer
})))

const LineChart = lazy(() => import('recharts').then(module => ({
  default: module.LineChart
})))

const BarChart = lazy(() => import('recharts').then(module => ({
  default: module.BarChart
})))

const PieChart = lazy(() => import('recharts').then(module => ({
  default: module.PieChart
})))

// Chart components that will be loaded dynamically
export const OptimizedLineChart = ({ children, ...props }: any) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Chart>
      <LineChart {...props}>
        {children}
      </LineChart>
    </Chart>
  </Suspense>
)

export const OptimizedBarChart = ({ children, ...props }: any) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Chart>
      <BarChart {...props}>
        {children}
      </BarChart>
    </Chart>
  </Suspense>
)

export const OptimizedPieChart = ({ children, ...props }: any) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Chart>
      <PieChart {...props}>
        {children}
      </PieChart>
    </Chart>
  </Suspense>
)

// Export all chart components that were previously using chart.js
export { OptimizedLineChart as LineChart, OptimizedBarChart as BarChart, OptimizedPieChart as PieChart }
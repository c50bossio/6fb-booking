// Lightweight Chart utilities without external dependencies
// Provides simple chart components for performance

import { lazy } from 'react'

// Dynamic imports for our lightweight chart components
export const Line = lazy(() => import('@/components/analytics/ChartComponents').then(module => ({ default: module.LineChart })))
export const Bar = lazy(() => import('@/components/analytics/ChartComponents').then(module => ({ default: module.BarChart })))
export const Pie = lazy(() => import('@/components/analytics/ChartComponents').then(module => ({ default: module.PieChart })))
export const Doughnut = lazy(() => import('@/components/analytics/ChartComponents').then(module => ({ default: module.DoughnutChart })))

// Re-export chart components directly (no registration needed)
export { 
  LineChart as LineChartDirect, 
  BarChart as BarChartDirect, 
  PieChart as PieChartDirect, 
  DoughnutChart as DoughnutChartDirect,
  GaugeChart,
  chartUtils
} from '@/components/analytics/ChartComponents'

// No-op registration function for compatibility
export const registerChartComponents = async () => {
  // No registration needed for lightweight components
  return Promise.resolve()
}

// Default chart options for consistent styling (simplified)
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
}
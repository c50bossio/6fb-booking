// Lightweight Chart utilities without external dependencies
// Provides simple chart components for performance

// Direct imports for our lightweight chart components (no lazy loading)
export { 
  LineChart as Line,
  BarChart as Bar, 
  PieChart as Pie,
  DoughnutChart as Doughnut
} from '@/components/analytics/ChartComponents'

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
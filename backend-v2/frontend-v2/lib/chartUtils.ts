// Optimized Chart.js utilities with dynamic imports
// Only load chart components when needed

import { lazy } from 'react'

// Dynamic imports for Chart.js components
export const Line = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Line })))
export const Bar = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Bar })))
export const Pie = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Pie })))
export const Doughnut = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Doughnut })))

// Chart.js registration - only register what's needed
export const registerChartComponents = async () => {
  const { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } = await import('chart.js')
  
  Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
  )
}

// Default chart options for consistent styling
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
}
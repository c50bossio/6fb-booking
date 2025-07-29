'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from '@/lib/chartjs-dynamic'
import { Doughnut, Bar } from 'react-chartjs-2'
import { ClientMetrics } from '@/services/analytics_service'

if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
  )
}

interface ClientMetricsChartProps {
  metrics: ClientMetrics
  type?: 'doughnut' | 'bar'
  height?: number
  theme?: 'light' | 'dark'
}

export default function ClientMetricsChart({
  metrics,
  type = 'doughnut',
  height = 300,
  theme = 'light'
}: ClientMetricsChartProps) {

  const colors = {
    light: {
      primary: 'rgb(34, 197, 94)', // green-500
      secondary: 'rgb(59, 130, 246)', // blue-500
      accent: 'rgb(168, 85, 247)', // purple-500
      warning: 'rgb(245, 158, 11)', // amber-500
      danger: 'rgb(239, 68, 68)', // red-500
      text: 'rgb(55, 65, 81)', // gray-700
      grid: 'rgba(55, 65, 81, 0.1)'
    },
    dark: {
      primary: 'rgb(34, 197, 94)',
      secondary: 'rgb(59, 130, 246)',
      accent: 'rgb(168, 85, 247)',
      warning: 'rgb(245, 158, 11)',
      danger: 'rgb(239, 68, 68)',
      text: 'rgb(209, 213, 219)', // gray-300
      grid: 'rgba(209, 213, 219, 0.1)'
    }
  }

  const currentColors = colors[theme]

  if (type === 'doughnut') {
    // Client composition doughnut chart
    const doughnutData = {
      labels: ['New Clients', 'Returning Clients', 'VIP Clients'],
      datasets: [
        {
          label: 'Client Distribution',
          data: [
            metrics.newClients,
            metrics.returningClients,
            metrics.vipClients
          ],
          backgroundColor: [
            currentColors.secondary,
            currentColors.primary,
            currentColors.accent
          ],
          borderColor: [
            currentColors.secondary,
            currentColors.primary,
            currentColors.accent
          ],
          borderWidth: 2,
          hoverOffset: 10
        }
      ]
    }

    const doughnutOptions: ChartOptions<'doughnut'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: currentColors.text,
            font: {
              size: 12,
              weight: '500'
            },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: currentColors.text,
          bodyColor: currentColors.text,
          borderColor: currentColors.grid,
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const label = context.label || ''
              const value = context.parsed
              const total = context.dataset.data.reduce((sum: number, val: any) => sum + val, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return `${label}: ${value} (${percentage}%)`
            },
            afterLabel: function(context) {
              if (context.label === 'VIP Clients') {
                return `LTV: $${metrics.averageLifetimeValue.toFixed(0)}`
              }
              return ''
            }
          }
        }
      },
      cutout: '60%',
      animation: {
        animateScale: true,
        duration: 1000
      }
    }

    return (
      <div style={{ height: `${height}px`, position: 'relative' }}>
        <Doughnut data={doughnutData} options={doughnutOptions} />
        {/* Center text showing total clients */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
          className="text-center"
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.totalClients}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Clients
          </div>
        </div>
      </div>
    )
  }

  // Bar chart for client metrics comparison
  const barData = {
    labels: ['New Clients', 'Returning', 'VIP Clients', 'Retention Rate'],
    datasets: [
      {
        label: 'Client Metrics',
        data: [
          metrics.newClients,
          metrics.returningClients,
          metrics.vipClients,
          metrics.retentionRate
        ],
        backgroundColor: [
          currentColors.secondary,
          currentColors.primary,
          currentColors.accent,
          currentColors.warning
        ],
        borderColor: [
          currentColors.secondary,
          currentColors.primary,
          currentColors.accent,
          currentColors.warning
        ],
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  }

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: currentColors.text,
        bodyColor: currentColors.text,
        borderColor: currentColors.grid,
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed.y
            
            if (label === 'Retention Rate') {
              return `${label}: ${value.toFixed(1)}%`
            }
            return `${label}: ${value}`
          },
          afterLabel: function(context) {
            const label = context.label || ''
            if (label === 'VIP Clients') {
              return [`Average LTV: $${metrics.averageLifetimeValue.toFixed(0)}`]
            }
            return []
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: currentColors.grid
        },
        ticks: {
          color: currentColors.text,
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: currentColors.grid
        },
        ticks: {
          color: currentColors.text,
          font: {
            size: 11
          },
          callback: function(value, index) {
            // Different formatting for retention rate
            const labels = ['New Clients', 'Returning', 'VIP Clients', 'Retention Rate']
            if (labels[index] === 'Retention Rate') {
              return Number(value).toFixed(0) + '%'
            }
            return Number(value).toFixed(0)
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  }

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <Bar data={barData} options={barOptions} />
    </div>
  )
}
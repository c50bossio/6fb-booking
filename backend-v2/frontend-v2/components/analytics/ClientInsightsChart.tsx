'use client'

import React from 'react'
import { LineChart, BarChart, PieChart } from './ChartComponents'

interface ClientInsightsChartProps {
  data: any
  view: 'retention' | 'segments' | 'lifetime'
  height?: number
}

export default function ClientInsightsChart({ data, view, height = 400 }: ClientInsightsChartProps) {
  const renderRetentionChart = () => {
    const retentionData = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Month 2', 'Month 3', 'Month 6'],
      datasets: [{
        label: 'Client Retention %',
        data: [100, 85, 72, 68, 58, 52, 45],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      }]
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return `Retention: ${context.parsed.y}%`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value: any) {
              return value + '%'
            }
          }
        }
      }
    }

    return <LineChart data={retentionData} options={options} height={height} />
  }

  const renderSegmentsChart = () => {
    const segmentsData = {
      labels: ['VIP', 'Regular', 'New', 'At Risk', 'Dormant'],
      datasets: [{
        data: [127, 312, 89, 45, 23],
        backgroundColor: [
          '#10B981', // Green for VIP
          '#3B82F6', // Blue for Regular  
          '#8B5CF6', // Purple for New
          '#F59E0B', // Amber for At Risk
          '#EF4444'  // Red for Dormant
        ],
        borderWidth: 0
      }]
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const percentage = ((context.parsed / total) * 100).toFixed(1)
              return `${context.label}: ${context.parsed} (${percentage}%)`
            }
          }
        }
      }
    }

    return <PieChart data={segmentsData} options={options} height={height} />
  }

  const renderLifetimeChart = () => {
    const lifetimeData = {
      labels: ['0-3 months', '3-6 months', '6-12 months', '1-2 years', '2+ years'],
      datasets: [{
        label: 'Lifetime Value',
        data: [180, 450, 890, 1650, 2800],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: '#22C55E',
        borderWidth: 2
      }]
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return `Avg LTV: $${context.parsed.y}`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value: any) {
              return '$' + value
            }
          }
        }
      }
    }

    return <BarChart data={lifetimeData} options={options} height={height} />
  }

  return (
    <div style={{ height }}>
      {view === 'retention' && renderRetentionChart()}
      {view === 'segments' && renderSegmentsChart()}
      {view === 'lifetime' && renderLifetimeChart()}
    </div>
  )
}
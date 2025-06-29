'use client'

import { useEffect, useRef } from 'react'
import { Chart, ChartConfiguration, registerables } from 'chart.js'

// Register Chart.js components
Chart.register(...registerables)

interface BaseChartProps {
  data: any
  options?: any
  className?: string
  height?: number
}

export function LineChart({ data, options = {}, className = '', height = 300 }: BaseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const config: ChartConfiguration = {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
        ...options,
      },
    }

    chartRef.current = new Chart(ctx, config)

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data, options])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

export function BarChart({ data, options = {}, className = '', height = 300 }: BaseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const config: ChartConfiguration = {
      type: 'bar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
        },
        ...options,
      },
    }

    chartRef.current = new Chart(ctx, config)

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data, options])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

export function DoughnutChart({ data, options = {}, className = '', height = 300 }: BaseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const config: ChartConfiguration = {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
        ...options,
      },
    }

    chartRef.current = new Chart(ctx, config)

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data, options])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

export function GaugeChart({ 
  value, 
  max = 100, 
  title = '', 
  className = '', 
  height = 250,
  colors = {
    good: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444'
  }
}: {
  value: number
  max?: number
  title?: string
  className?: string
  height?: number
  colors?: {
    good: string
    warning: string
    danger: string
  }
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const percentage = (value / max) * 100
    let color = colors.danger
    if (percentage >= 80) color = colors.good
    else if (percentage >= 60) color = colors.warning

    const data = {
      datasets: [{
        data: [value, max - value],
        backgroundColor: [color, '#E5E7EB'],
        borderWidth: 0,
        cutout: '75%',
      }]
    }

    const config: ChartConfiguration = {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        rotation: 270,
        circumference: 180,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
      plugins: [{
        id: 'gaugeText',
        beforeDraw: function(chart) {
          const ctx = chart.ctx
          const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2
          const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2

          ctx.save()
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          
          // Value text
          ctx.font = 'bold 24px sans-serif'
          ctx.fillStyle = '#1F2937'
          ctx.fillText(`${value.toFixed(1)}%`, centerX, centerY - 10)
          
          // Title text
          if (title) {
            ctx.font = '14px sans-serif'
            ctx.fillStyle = '#6B7280'
            ctx.fillText(title, centerX, centerY + 15)
          }
          
          ctx.restore()
        }
      }]
    }

    chartRef.current = new Chart(ctx, config)

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [value, max, title, colors])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

// Chart data transformation utilities
export const chartUtils = {
  // Transform revenue data for line chart
  transformRevenueData: (data: Array<{period: string, revenue: number}>) => ({
    labels: data.map(d => new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Revenue',
      data: data.map(d => d.revenue),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  }),

  // Transform service revenue data for doughnut chart
  transformServiceData: (data: Array<{service_name: string, revenue: number, percentage: number}>) => ({
    labels: data.map(d => d.service_name),
    datasets: [{
      data: data.map(d => d.revenue),
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
      ],
      borderWidth: 2,
      borderColor: '#FFFFFF',
    }]
  }),

  // Transform appointment data for bar chart
  transformAppointmentData: (data: Array<{period: string, appointments: number}>) => ({
    labels: data.map(d => new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Appointments',
      data: data.map(d => d.appointments),
      backgroundColor: '#10B981',
      borderColor: '#059669',
      borderWidth: 1,
    }]
  }),

  // Chart color palettes
  colors: {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    cyan: '#06B6D4',
    pink: '#EC4899',
    indigo: '#6366F1',
  },

  // Common chart options
  defaultOptions: {
    revenue: {
      scales: {
        y: {
          ticks: {
            callback: function(value: any) {
              return '$' + value.toLocaleString()
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return context.dataset.label + ': $' + context.parsed.y.toLocaleString()
            }
          }
        }
      }
    },
    percentage: {
      scales: {
        y: {
          max: 100,
          ticks: {
            callback: function(value: any) {
              return value + '%'
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context: any) {
              return context.dataset.label + ': ' + context.parsed.y + '%'
            }
          }
        }
      }
    }
  }
}
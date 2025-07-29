'use client'

import React, { useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
  Line,
  Bar
} from '@/lib/chartjs-dynamic'
import { RevenueDataPoint } from '@/services/analytics_service'

// Register Chart.js components
if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
  )
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
  type?: 'line' | 'bar'
  height?: number
  showAppointments?: boolean
  showTips?: boolean
  theme?: 'light' | 'dark'
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

export default function RevenueChart({
  data,
  type = 'line',
  height = 300,
  showAppointments = false,
  showTips = true,
  theme = 'light',
  period = 'week'
}: RevenueChartProps) {
  const chartRef = useRef<any>(null)

  // Chart colors based on theme
  const colors = {
    light: {
      primary: 'rgb(34, 197, 94)', // green-500
      secondary: 'rgb(59, 130, 246)', // blue-500
      accent: 'rgb(168, 85, 247)', // purple-500
      tips: 'rgb(245, 158, 11)', // amber-500
      background: 'rgba(34, 197, 94, 0.1)',
      text: 'rgb(55, 65, 81)', // gray-700
      grid: 'rgba(55, 65, 81, 0.1)'
    },
    dark: {
      primary: 'rgb(34, 197, 94)',
      secondary: 'rgb(59, 130, 246)',
      accent: 'rgb(168, 85, 247)',
      tips: 'rgb(245, 158, 11)',
      background: 'rgba(34, 197, 94, 0.2)',
      text: 'rgb(209, 213, 219)', // gray-300
      grid: 'rgba(209, 213, 219, 0.1)'
    }
  }

  const currentColors = colors[theme]

  // Prepare chart data
  const chartData: ChartData<'line' | 'bar'> = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Revenue',
        data: data.map(d => d.revenue),
        borderColor: currentColors.primary,
        backgroundColor: type === 'bar' ? currentColors.primary : currentColors.background,
        borderWidth: 3,
        fill: type === 'line',
        tension: 0.4,
        pointBackgroundColor: currentColors.primary,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      }
    ]
  }

  // Add tips dataset if enabled
  if (showTips) {
    chartData.datasets.push({
      label: 'Tips',
      data: data.map(d => d.tips),
      borderColor: currentColors.tips,
      backgroundColor: type === 'bar' ? currentColors.tips : `${currentColors.tips}20`,
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointBackgroundColor: currentColors.tips,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    })
  }

  // Add appointments dataset if enabled (on secondary y-axis)
  if (showAppointments) {
    chartData.datasets.push({
      label: 'Appointments',
      data: data.map(d => d.appointments),
      borderColor: currentColors.secondary,
      backgroundColor: type === 'bar' ? currentColors.secondary : `${currentColors.secondary}20`,
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointBackgroundColor: currentColors.secondary,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      yAxisID: 'y1',
    })
  }

  // Chart options
  const options: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: currentColors.text,
          font: {
            size: 12,
            weight: '500'
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: currentColors.text,
        bodyColor: currentColors.text,
        borderColor: currentColors.grid,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(context) {
            return `${context[0].label}`
          },
          label: function(context) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            
            if (label === 'Revenue' || label === 'Tips') {
              return `${label}: $${value.toFixed(2)}`
            } else if (label === 'Appointments') {
              return `${label}: ${value}`
            }
            return `${label}: ${value}`
          },
          afterBody: function(context) {
            if (context.length > 0) {
              const dataIndex = context[0].dataIndex
              const dataPoint = data[dataIndex]
              return [
                '',
                `Total Revenue: $${dataPoint.totalRevenue.toFixed(2)}`,
                `Average Ticket: $${dataPoint.averageTicket.toFixed(2)}`
              ]
            }
            return []
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: getPeriodLabel(period),
          color: currentColors.text,
          font: {
            size: 12,
            weight: '600'
          }
        },
        grid: {
          color: currentColors.grid,
          lineWidth: 1
        },
        ticks: {
          color: currentColors.text,
          font: {
            size: 11
          },
          maxRotation: period === 'month' ? 45 : 0
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Revenue ($)',
          color: currentColors.text,
          font: {
            size: 12,
            weight: '600'
          }
        },
        grid: {
          color: currentColors.grid,
          lineWidth: 1
        },
        ticks: {
          color: currentColors.text,
          font: {
            size: 11
          },
          callback: function(value) {
            return '$' + Number(value).toFixed(0)
          }
        }
      },
      ...(showAppointments && {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Appointments',
            color: currentColors.text,
            font: {
              size: 12,
              weight: '600'
            }
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: currentColors.text,
            font: {
              size: 11
            }
          }
        }
      })
    },
    elements: {
      point: {
        hoverBackgroundColor: '#fff',
        hoverBorderWidth: 3
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  }

  // Animation on mount
  useEffect(() => {
    const chart = chartRef.current
    if (chart) {
      chart.update('none')
      setTimeout(() => {
        chart.update('active')
      }, 100)
    }
  }, [data])

  function getPeriodLabel(period: string): string {
    switch (period) {
      case 'day':
        return 'Time of Day'
      case 'week':
        return 'Days of Week'
      case 'month':
        return 'Days of Month'
      case 'quarter':
        return 'Weeks of Quarter'
      case 'year':
        return 'Months of Year'
      default:
        return 'Time Period'
    }
  }

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      {type === 'line' ? (
        <Line ref={chartRef} data={chartData} options={options} />
      ) : (
        <Bar ref={chartRef} data={chartData} options={options} />
      )}
    </div>
  )
}
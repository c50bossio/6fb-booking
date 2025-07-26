'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { ServiceMetrics } from '@/services/analytics_service'
import { StarIcon } from '@heroicons/react/24/solid'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface ServicePerformanceChartProps {
  services: ServiceMetrics[]
  metric?: 'revenue' | 'bookings' | 'averagePrice' | 'profitMargin'
  height?: number
  theme?: 'light' | 'dark'
  showPremiumIndicator?: boolean
}

export default function ServicePerformanceChart({
  services,
  metric = 'revenue',
  height = 300,
  theme = 'light',
  showPremiumIndicator = true
}: ServicePerformanceChartProps) {

  const colors = {
    light: {
      premium: 'rgb(168, 85, 247)', // purple-500
      standard: 'rgb(34, 197, 94)', // green-500
      accent: 'rgb(59, 130, 246)', // blue-500
      text: 'rgb(55, 65, 81)', // gray-700
      grid: 'rgba(55, 65, 81, 0.1)'
    },
    dark: {
      premium: 'rgb(168, 85, 247)',
      standard: 'rgb(34, 197, 94)',
      accent: 'rgb(59, 130, 246)',
      text: 'rgb(209, 213, 219)', // gray-300
      grid: 'rgba(209, 213, 219, 0.1)'
    }
  }

  const currentColors = colors[theme]

  // Sort services by the selected metric
  const sortedServices = [...services].sort((a, b) => {
    switch (metric) {
      case 'revenue':
        return b.revenue - a.revenue
      case 'bookings':
        return b.bookings - a.bookings
      case 'averagePrice':
        return b.averagePrice - a.averagePrice
      case 'profitMargin':
        return b.profitMargin - a.profitMargin
      default:
        return b.revenue - a.revenue
    }
  }).slice(0, 8) // Show top 8 services

  // Get metric values
  const getMetricValue = (service: ServiceMetrics): number => {
    switch (metric) {
      case 'revenue':
        return service.revenue
      case 'bookings':
        return service.bookings
      case 'averagePrice':
        return service.averagePrice
      case 'profitMargin':
        return service.profitMargin
      default:
        return service.revenue
    }
  }

  // Get metric label
  const getMetricLabel = (): string => {
    switch (metric) {
      case 'revenue':
        return 'Revenue ($)'
      case 'bookings':
        return 'Number of Bookings'
      case 'averagePrice':
        return 'Average Price ($)'
      case 'profitMargin':
        return 'Profit Margin (%)'
      default:
        return 'Revenue ($)'
    }
  }

  // Format metric value for display
  const formatMetricValue = (value: number): string => {
    switch (metric) {
      case 'revenue':
      case 'averagePrice':
        return '$' + value.toFixed(2)
      case 'bookings':
        return value.toString()
      case 'profitMargin':
        return value.toFixed(1) + '%'
      default:
        return value.toString()
    }
  }

  const chartData = {
    labels: sortedServices.map(service => {
      // Truncate long service names
      const name = service.serviceName.length > 15 
        ? service.serviceName.substring(0, 15) + '...'
        : service.serviceName
      return showPremiumIndicator && service.isPremium ? `★ ${name}` : name
    }),
    datasets: [
      {
        label: getMetricLabel(),
        data: sortedServices.map(service => getMetricValue(service)),
        backgroundColor: sortedServices.map(service => 
          service.isPremium ? currentColors.premium : currentColors.standard
        ),
        borderColor: sortedServices.map(service => 
          service.isPremium ? currentColors.premium : currentColors.standard
        ),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: sortedServices.map(service => 
          service.isPremium ? `${currentColors.premium}CC` : `${currentColors.standard}CC`
        )
      }
    ]
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
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
          title: function(context) {
            const service = sortedServices[context[0].dataIndex]
            return service.serviceName
          },
          label: function(context) {
            const value = context.parsed.x
            const service = sortedServices[context.dataIndex]
            
            return [
              `${getMetricLabel()}: ${formatMetricValue(value)}`,
              `Type: ${service.isPremium ? 'Premium' : 'Standard'}`,
              `Popularity Rank: #${service.popularityRank}`
            ]
          },
          afterBody: function(context) {
            if (context.length > 0) {
              const service = sortedServices[context[0].dataIndex]
              return [
                '',
                `Total Revenue: $${service.revenue.toFixed(2)}`,
                `Total Bookings: ${service.bookings}`,
                `Avg Price: $${service.averagePrice.toFixed(2)}`,
                `Profit Margin: ${service.profitMargin.toFixed(1)}%`
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
          text: getMetricLabel(),
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
            return formatMetricValue(Number(value))
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: currentColors.grid,
          lineWidth: 1
        },
        ticks: {
          color: currentColors.text,
          font: {
            size: 11
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
    <div className="w-full">
      {/* Chart legend for premium vs standard services */}
      {showPremiumIndicator && (
        <div className="flex items-center justify-center mb-4 space-x-6">
          <div className="flex items-center">
            <div 
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: currentColors.premium }}
            />
            <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Premium Services
            </span>
          </div>
          <div className="flex items-center">
            <div 
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: currentColors.standard }}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Standard Services
            </span>
          </div>
        </div>
      )}
      
      <div style={{ height: `${height}px`, position: 'relative' }}>
        <Bar data={chartData} options={options} />
      </div>
      
      {/* Service performance insights */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Performance Insights:</strong>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {sortedServices.length > 0 && (
            <>
              Top performer: <strong>{sortedServices[0].serviceName}</strong> ({formatMetricValue(getMetricValue(sortedServices[0]))})
              {sortedServices.filter(s => s.isPremium).length > 0 && (
                <> • Premium services: {sortedServices.filter(s => s.isPremium).length}/{sortedServices.length}</>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { analyticsAPI, RevenueAnalytics } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { DoughnutChart } from './ChartComponents'
import { formatters } from '@/lib/formatters'

interface ServiceRevenueChartProps {
  userId?: number
  startDate?: string
  endDate?: string
  className?: string
  height?: number
  showHeader?: boolean
  onServiceSelect?: (serviceName: string | null) => void
}

interface ServiceData {
  service_name: string
  revenue: number
  percentage: number
}

export default function ServiceRevenueChart({ 
  userId, 
  startDate, 
  endDate, 
  className = '',
  height = 350,
  showHeader = true,
  onServiceSelect
}: ServiceRevenueChartProps) {
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await analyticsAPI.revenue({
        userId,
        startDate,
        endDate,
        groupBy: 'month'
      })
      
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to fetch service revenue analytics:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load service revenue data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [userId, startDate, endDate])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleServiceClick = useCallback((serviceName: string) => {
    const newSelection = selectedService === serviceName ? null : serviceName
    setSelectedService(newSelection)
    onServiceSelect?.(newSelection)
  }, [selectedService, onServiceSelect])

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>Service Revenue Breakdown</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <PageLoading message="Loading service data..." />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>Service Revenue Breakdown</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <ErrorDisplay 
            message={error} 
            onRetry={fetchAnalytics} 
          />
        </CardContent>
      </Card>
    )
  }

  if (!analytics || !analytics.revenue_by_service || analytics.revenue_by_service.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>Service Revenue Breakdown</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No service data available for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  // Color palette for services
  const colors = [
    '#0891b2', // Teal
    '#059669', // Emerald  
    '#0d9488', // Teal-600
    '#0f766e', // Teal-700
    '#134e4a', // Teal-800
    '#065f46', // Emerald-800
    '#064e3b', // Emerald-900
    '#14b8a6', // Teal-500
    '#10b981', // Emerald-500
    '#06b6d4', // Cyan-500
  ]

  // Transform data for chart
  const chartData = {
    labels: analytics.revenue_by_service.map(service => service.service_name),
    datasets: [{
      data: analytics.revenue_by_service.map(service => service.revenue),
      backgroundColor: analytics.revenue_by_service.map((_, index) => {
        const color = colors[index % colors.length]
        return selectedService && selectedService !== analytics.revenue_by_service[index].service_name
          ? color + '40' // Add transparency to non-selected items
          : color
      }),
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverBorderWidth: 4,
      hoverOffset: 8,
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll create a custom legend
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#0891b2',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const service = analytics.revenue_by_service[context.dataIndex]
            return [
              `${service.service_name}`,
              `Revenue: ${formatters.currency(service.revenue)}`,
              `Percentage: ${formatters.percentage(service.percentage)}`
            ]
          }
        }
      }
    },
    onHover: (event: any, elements: any[]) => {
      setHoveredIndex(elements.length > 0 ? elements[0].index : null)
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index
        const serviceName = analytics.revenue_by_service[index].service_name
        handleServiceClick(serviceName)
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    }
  }

  // Calculate metrics
  const totalRevenue = analytics.revenue_by_service.reduce((sum, service) => sum + service.revenue, 0)
  const topService = analytics.revenue_by_service[0]
  const serviceCount = analytics.revenue_by_service.length

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Service Revenue Breakdown</span>
            <span className="text-sm font-normal text-gray-600">
              {serviceCount} Services
            </span>
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
              <div className="text-xl font-bold text-teal-700">
                {formatters.currency(totalRevenue, { showCents: false })}
              </div>
              <div className="text-sm text-teal-600 font-medium">Total Revenue</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
              <div className="text-xl font-bold text-emerald-700">
                {topService ? formatters.percentage(topService.percentage) : '0%'}
              </div>
              <div className="text-sm text-emerald-600 font-medium">Top Service Share</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="relative">
              <div style={{ height }}>
                <DoughnutChart
                  data={chartData}
                  options={chartOptions}
                  height={height}
                />
              </div>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {serviceCount}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    Services
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Legend */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 mb-3">Services</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {analytics.revenue_by_service.map((service, index) => (
                  <div
                    key={service.service_name}
                    onClick={() => handleServiceClick(service.service_name)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedService === service.service_name
                        ? 'bg-teal-50 border-2 border-teal-200 shadow-sm'
                        : hoveredIndex === index
                        ? 'bg-gray-50 border border-gray-200'
                        : 'bg-gray-50 border border-transparent hover:border-gray-200'
                    }`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${service.service_name} service`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleServiceClick(service.service_name)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: colors[index % colors.length],
                          opacity: selectedService && selectedService !== service.service_name ? 0.4 : 1
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {service.service_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatters.percentage(service.percentage)} of total
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-gray-900">
                        {formatters.currency(service.revenue)}
                      </div>
                      {index === 0 && (
                        <div className="text-xs text-emerald-600 font-medium">
                          Top Service
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <span className="text-blue-600">💡</span>
              Service Insights
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              {topService && (
                <div>
                  <strong>{topService.service_name}</strong> is your top revenue generator at{' '}
                  <strong>{formatters.percentage(topService.percentage)}</strong> of total revenue
                </div>
              )}
              
              {analytics.revenue_by_service.length > 1 && (
                <div>
                  Your service portfolio has <strong>{analytics.revenue_by_service.length} services</strong>{' '}
                  {analytics.revenue_by_service.length >= 3 
                    ? 'providing good diversification' 
                    : '- consider expanding your service offerings'
                  }
                </div>
              )}
              
              {analytics.revenue_by_service.length >= 2 && (
                <div>
                  Top 2 services represent{' '}
                  <strong>
                    {formatters.percentage(
                      analytics.revenue_by_service.slice(0, 2).reduce((sum, s) => sum + s.percentage, 0)
                    )}
                  </strong>{' '}
                  of your revenue
                </div>
              )}
            </div>
          </div>

          {selectedService && (
            <div className="text-center text-sm text-gray-600">
              Click on <strong>{selectedService}</strong> again to deselect, or click another service to compare
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
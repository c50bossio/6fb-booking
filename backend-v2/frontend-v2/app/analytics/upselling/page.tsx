'use client'

import React, { useState, useEffect } from 'react'
import { AnalyticsLayout, AnalyticsSectionLayout } from '@/components/analytics/AnalyticsLayout'
import { DateRangeSelector } from '@/components/analytics/shared/DateRangeSelector'
import { AnalyticsCard } from '@/components/analytics/shared/AnalyticsCard'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  SparklesIcon, 
  CurrencyDollarIcon, 
  ArrowTrendingUpIcon, 
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'
// Use simple fetch for API calls to avoid module import issues

interface UpsellingSummary {
  total_attempts: number
  implemented_attempts: number
  total_conversions: number
  implementation_rate: number
  conversion_rate: number
  overall_success_rate: number
}

interface UpsellingRevenue {
  potential_revenue: number
  actual_revenue: number
  revenue_realization_rate: number
  avg_potential_revenue: number
  avg_actual_revenue: number
}

interface UpsellingPerformance {
  avg_time_to_conversion_hours: number
  top_services: Array<{
    service: string
    conversions: number
    revenue: number
  }>
}

interface UpsellingOverview {
  date_range: {
    start: string
    end: string
  }
  summary: UpsellingSummary
  revenue: UpsellingRevenue
  performance: UpsellingPerformance
  barber_id?: number
  generated_at: string
}

interface PerformanceData {
  group_name: string
  group_id: string
  metrics: {
    total_attempts: number
    implemented_attempts: number
    conversions: number
    implementation_rate: number
    conversion_rate: number
    overall_success_rate: number
  }
  revenue: {
    potential_revenue: number
    actual_revenue: number
    revenue_realization_rate: number
    avg_potential: number
    avg_actual: number
  }
}

export default function UpsellingAnalyticsPage() {
  const [overviewData, setOverviewData] = useState<UpsellingOverview | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  })
  const [groupBy, setGroupBy] = useState<'barber' | 'service' | 'channel'>('barber')
  
  const { error: showError } = useToast()

  const fetchUpsellingData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]
      
      // Simple fetch wrapper with error handling
      const apiGet = async (url: string) => {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add auth header if available
            ...(typeof window !== 'undefined' && localStorage.getItem('token') ? {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            } : {})
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return response.json()
      }
      
      // Fetch overview data
      const overviewData = await apiGet(`/api/v2/upselling/overview?start_date=${startDate}&end_date=${endDate}`)
      setOverviewData(overviewData)
      
      // Fetch performance data
      const performanceData = await apiGet(`/api/v2/upselling/performance?start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}`)
      setPerformanceData(performanceData.performance_data || [])
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load upselling analytics'
      setError(errorMessage)
      showError('Error loading analytics', {
        description: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUpsellingData()
  }, [dateRange, groupBy])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getTrendIcon = (value: number, threshold: number = 50) => {
    if (value >= threshold) {
      return <ArrowUpIcon className="w-4 h-4 text-green-500" />
    }
    return <ArrowDownIcon className="w-4 h-4 text-red-500" />
  }

  const getTrendColor = (value: number, threshold: number = 50) => {
    if (value >= threshold) {
      return 'text-green-600'
    }
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <AnalyticsLayout title="Upselling Analytics" description="Revenue optimization and conversion tracking">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AnalyticsLayout>
    )
  }

  if (error || !overviewData) {
    return (
      <AnalyticsLayout title="Upselling Analytics" description="Revenue optimization and conversion tracking">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {error ? 'Failed to Load Analytics' : 'No Data Available'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {error || 'No upselling data found for the selected period.'}
            </p>
            <Button onClick={fetchUpsellingData} variant="primary">
              Retry
            </Button>
          </div>
        </div>
      </AnalyticsLayout>
    )
  }

  return (
    <AnalyticsLayout 
      title="Upselling Analytics" 
      description="Revenue optimization and conversion tracking based on Six Figure Barber methodology"
    >
      <AnalyticsSectionLayout
        sectionTitle="Upselling Performance Dashboard"
        sectionDescription="Track conversion rates, revenue impact, and optimization opportunities"
        filters={
          <div className="flex flex-col sm:flex-row gap-4">
            <DateRangeSelector
              startDate={dateRange.start}
              endDate={dateRange.end}
              onChange={(start, end) => setDateRange({ start, end })}
            />
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Group by:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'barber' | 'service' | 'channel')}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="barber">Barber</option>
                <option value="service">Service</option>
                <option value="channel">Channel</option>
              </select>
            </div>
          </div>
        }
      >
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="Total Attempts"
            value={overviewData.summary.total_attempts.toString()}
            icon={<SparklesIcon className="w-5 h-5" />}
            trend={{
              value: overviewData.summary.implementation_rate,
              label: `${formatPercentage(overviewData.summary.implementation_rate)} implemented`
            }}
            color="blue"
          />
          
          <AnalyticsCard
            title="Conversion Rate"
            value={formatPercentage(overviewData.summary.overall_success_rate)}
            icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
            trend={{
              value: overviewData.summary.conversion_rate,
              label: `${formatPercentage(overviewData.summary.conversion_rate)} of implementations`
            }}
            color={overviewData.summary.overall_success_rate >= 25 ? "green" : "red"}
          />
          
          <AnalyticsCard
            title="Revenue Generated"
            value={formatCurrency(overviewData.revenue.actual_revenue)}
            icon={<CurrencyDollarIcon className="w-5 h-5" />}
            trend={{
              value: overviewData.revenue.revenue_realization_rate,
              label: `${formatPercentage(overviewData.revenue.revenue_realization_rate)} of potential`
            }}
            color="green"
          />
          
          <AnalyticsCard
            title="Avg. Time to Convert"
            value={`${overviewData.performance.avg_time_to_conversion_hours.toFixed(1)}h`}
            icon={<ClockIcon className="w-5 h-5" />}
            trend={{
              value: overviewData.summary.total_conversions,
              label: `${overviewData.summary.total_conversions} total conversions`
            }}
            color="purple"
          />
        </div>

        {/* Detailed Revenue Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                Revenue Impact Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Potential Revenue</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(overviewData.revenue.potential_revenue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600">Avg. per Attempt</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(overviewData.revenue.avg_potential_revenue)}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Actual Revenue</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrency(overviewData.revenue.actual_revenue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600">Avg. per Conversion</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrency(overviewData.revenue.avg_actual_revenue)}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Revenue Realization Rate</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(overviewData.revenue.revenue_realization_rate, 75)}
                    <span className={`font-bold ${getTrendColor(overviewData.revenue.revenue_realization_rate, 75)}`}>
                      {formatPercentage(overviewData.revenue.revenue_realization_rate)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
                Top Performing Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overviewData.performance.top_services.slice(0, 5).map((service, index) => (
                  <div key={service.service} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{service.service}</p>
                        <p className="text-sm text-gray-500">{service.conversions} conversions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(service.revenue)}</p>
                    </div>
                  </div>
                ))}
                
                {overviewData.performance.top_services.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No conversions yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-blue-600" />
              Performance by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">{groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Attempts</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Conversions</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Success Rate</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Revenue</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Avg. Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((item, index) => (
                    <tr key={item.group_id} className="border-b border-gray-100">
                      <td className="py-3 px-2">
                        <div className="font-medium text-gray-900">{item.group_name}</div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="font-medium">{item.metrics.total_attempts}</div>
                        <div className="text-xs text-gray-500">
                          {item.metrics.implemented_attempts} implemented
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="font-medium">{item.metrics.conversions}</div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className={`font-medium flex items-center justify-center gap-1 ${getTrendColor(item.metrics.overall_success_rate, 25)}`}>
                          {getTrendIcon(item.metrics.overall_success_rate, 25)}
                          {formatPercentage(item.metrics.overall_success_rate)}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="font-medium text-green-600">
                          {formatCurrency(item.revenue.actual_revenue)}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="font-medium">
                          {formatCurrency(item.revenue.avg_actual)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {performanceData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No performance data available</p>
                  <p className="text-sm">Try adjusting your date range or filters</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </AnalyticsSectionLayout>
    </AnalyticsLayout>
  )
}
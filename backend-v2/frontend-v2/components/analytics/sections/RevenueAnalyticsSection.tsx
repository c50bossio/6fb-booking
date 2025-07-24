import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnalyticsCardGrid } from '@/components/analytics/shared/AnalyticsCard'
import RevenueChart from '@/components/analytics/RevenueChart'
import { 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface RevenueAnalyticsSectionProps {
  data: any
  userRole?: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function RevenueAnalyticsSection({ data, userRole, dateRange }: RevenueAnalyticsSectionProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [revenueData, setRevenueData] = useState<any>(null)

  useEffect(() => {
    // Transform data for revenue analytics
    if (data) {
      const transformedData = {
        summary: data.revenue_summary || {},
        services: data.services_revenue || [],
        trends: data.revenue_trends || [],
        comparisons: data.revenue_comparisons || {}
      }
      setRevenueData(transformedData)
    }
  }, [data])

  if (!revenueData) {
    return <div>Loading revenue analytics...</div>
  }

  const metrics = [
    {
      title: 'Total Revenue',
      value: `$${revenueData.summary.total_revenue?.toLocaleString() || '0'}`,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-green-600" />,
      trend: (revenueData.summary.revenue_growth > 0 ? 'up' : 'down') as 'up' | 'down',
      change: Math.abs(revenueData.summary.revenue_growth || 0),
      changeLabel: 'vs last period'
    },
    {
      title: 'Average Ticket',
      value: `$${revenueData.summary.average_ticket_price?.toFixed(2) || '0'}`,
      icon: <ChartBarIcon className="w-5 h-5 text-blue-600" />,
      trend: (revenueData.summary.ticket_growth > 0 ? 'up' : 'down') as 'up' | 'down',
      change: Math.abs(revenueData.summary.ticket_growth || 0)
    },
    {
      title: 'Monthly Recurring',
      value: `$${revenueData.summary.recurring_revenue?.toLocaleString() || '0'}`,
      icon: <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" />,
      trend: 'up' as const,
      change: 15.3
    },
    {
      title: 'Projected Revenue',
      value: `$${revenueData.summary.projected_revenue?.toLocaleString() || '0'}`,
      icon: <ArrowTrendingUpIcon className="w-5 h-5 text-orange-600" />,
      description: 'End of month'
    }
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <AnalyticsCardGrid metrics={metrics} loading={false} />

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue Trends</CardTitle>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RevenueChart 
            height={400}
            showHeader={false}
          />
        </CardContent>
      </Card>

      {/* Service Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Revenue Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueData.services.slice(0, 5).map((service: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{service.count} bookings</span>
                      <span>${service.average_price.toFixed(2)} avg</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${service.total_revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{service.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span>Services</span>
                <span className="font-bold">${revenueData.summary.services_revenue?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span>Products</span>
                <span className="font-bold">${revenueData.summary.products_revenue?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span>Gift Certificates</span>
                <span className="font-bold">${revenueData.summary.gift_certificates_revenue?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span>Tips</span>
                <span className="font-bold">${revenueData.summary.tips_revenue?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              Export Revenue Report
            </Button>
            <Button variant="outline" className="justify-start">
              View Transactions
            </Button>
            <Button variant="outline" className="justify-start">
              Price Optimization
            </Button>
            <Button variant="outline" className="justify-start">
              Revenue Forecast
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
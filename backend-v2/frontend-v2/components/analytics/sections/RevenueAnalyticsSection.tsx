import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsCardGrid } from '@/components/analytics/shared/AnalyticsCard'
import RevenueChart from '@/components/analytics/RevenueChart'
import CommissionOptimizationPanel from '@/components/analytics/CommissionOptimizationPanel'
import { 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  SparklesIcon,
  CalculatorIcon
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
  const [activeTab, setActiveTab] = useState('overview')

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
      trend: revenueData.summary.revenue_growth > 0 ? 'up' : 'down',
      change: Math.abs(revenueData.summary.revenue_growth || 0),
      changeLabel: 'vs last period'
    },
    {
      title: 'Average Ticket',
      value: `$${revenueData.summary.average_ticket_price?.toFixed(2) || '0'}`,
      icon: <ChartBarIcon className="w-5 h-5 text-blue-600" />,
      trend: revenueData.summary.ticket_growth > 0 ? 'up' : 'down',
      change: Math.abs(revenueData.summary.ticket_growth || 0)
    },
    {
      title: 'Monthly Recurring',
      value: `$${revenueData.summary.recurring_revenue?.toLocaleString() || '0'}`,
      icon: <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" />,
      trend: 'up',
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

      {/* Enhanced Commission Optimization Banner */}
      {(userRole === 'barber' || userRole === 'admin' || userRole === 'location_manager') && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                    Commission Optimization Available
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    AI-powered insights to maximize your earnings with optimized commission rates
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                  +$559 potential
                </Badge>
                <Button 
                  size="sm" 
                  onClick={() => setActiveTab('commissions')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <CalculatorIcon className="w-4 h-4 mr-2" />
                  Optimize Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
          <TabsTrigger value="analysis">Service Analysis</TabsTrigger>
          {(userRole === 'barber' || userRole === 'admin' || userRole === 'location_manager') && (
            <TabsTrigger value="commissions" className="relative">
              Commission Optimization
              <Badge className="ml-2 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                New
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                data={revenueData.trends} 
                period={selectedPeriod}
                height={400}
              />
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
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
                <CardTitle>Service Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Services</span>
                    <span className="font-semibold">{revenueData.services.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Service Price</span>
                    <span className="font-semibold">
                      ${(revenueData.services.reduce((sum: number, s: any) => sum + s.average_price, 0) / revenueData.services.length).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Most Popular Service</span>
                    <span className="font-semibold text-sm">
                      {revenueData.services.sort((a: any, b: any) => b.count - a.count)[0]?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Highest Revenue Service</span>
                    <span className="font-semibold text-sm">
                      {revenueData.services.sort((a: any, b: any) => b.total_revenue - a.total_revenue)[0]?.name || 'N/A'}
                    </span>
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
        </TabsContent>

        {(userRole === 'barber' || userRole === 'admin' || userRole === 'location_manager') && (
          <TabsContent value="commissions" className="space-y-6">
            <CommissionOptimizationPanel 
              userRole={userRole}
              dateRange={dateRange}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
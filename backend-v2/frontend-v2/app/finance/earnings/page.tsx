'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  BanknotesIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline'

interface EarningsData {
  total_monthly_earnings: number
  total_yearly_earnings: number
  pending_earnings: number
  available_for_payout: number
  commission_rate: number
  services_completed: number
  average_service_value: number
  month_over_month_growth: number
  weekly_breakdown: {
    week: string
    earnings: number
    services: number
  }[]
  monthly_breakdown: {
    month: string
    earnings: number
    services: number
    growth_rate: number
  }[]
  top_services: {
    service_name: string
    revenue: number
    count: number
    percentage: number
  }[]
}

interface EarningsGoal {
  monthly_target: number
  yearly_target: number
  current_progress: number
  days_remaining: number
}

export default function EarningsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [earningsGoal, setEarningsGoal] = useState<EarningsGoal | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }

        setUser(userData)

        // Mock earnings data
        const mockEarningsData: EarningsData = {
          total_monthly_earnings: 8420.50,
          total_yearly_earnings: 84350.25,
          pending_earnings: 1245.75,
          available_for_payout: 7174.75,
          commission_rate: 65,
          services_completed: 142,
          average_service_value: 78.50,
          month_over_month_growth: 15.3,
          weekly_breakdown: [
            { week: 'Week 1', earnings: 2100.50, services: 35 },
            { week: 'Week 2', earnings: 1950.25, services: 32 },
            { week: 'Week 3', earnings: 2180.00, services: 38 },
            { week: 'Week 4', earnings: 2189.75, services: 37 }
          ],
          monthly_breakdown: [
            { month: 'Oct 2024', earnings: 7320.50, services: 128, growth_rate: 8.2 },
            { month: 'Nov 2024', earnings: 7890.25, services: 135, growth_rate: 7.8 },
            { month: 'Dec 2024', earnings: 8150.75, services: 140, growth_rate: 3.3 },
            { month: 'Jan 2025', earnings: 8420.50, services: 142, growth_rate: 15.3 }
          ],
          top_services: [
            { service_name: 'Premium Cut & Style', revenue: 3250.00, count: 52, percentage: 38.6 },
            { service_name: 'Luxury Shave Experience', revenue: 2180.50, count: 23, percentage: 25.9 },
            { service_name: 'Beard Trim + Hot Towel', revenue: 1560.25, count: 31, percentage: 18.5 },
            { service_name: 'Classic Haircut', revenue: 1429.75, count: 47, percentage: 17.0 }
          ]
        }

        const mockGoalData: EarningsGoal = {
          monthly_target: 10000,
          yearly_target: 120000,
          current_progress: 84.2,
          days_remaining: 8
        }

        setEarningsData(mockEarningsData)
        setEarningsGoal(mockGoalData)

      } catch (err) {
        console.error('Failed to load earnings data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return <PageLoading message="Loading earnings dashboard..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user || !earningsData || !earningsGoal) {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return <TrendingUpIcon className="w-4 h-4 text-green-600" />
    } else if (growth < 0) {
      return <TrendingDownIcon className="w-4 h-4 text-red-600" />
    }
    return null
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/finance')}
                variant="ghost"
                size="sm"
              >
                ← Financial Center
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Earnings Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Track your income and commission details
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                leftIcon={<ChartBarIcon className="w-5 h-5" />}
                onClick={() => router.push('/analytics/revenue')}
              >
                Revenue Analytics
              </Button>
              <Button
                variant="primary"
                leftIcon={<ArrowDownTrayIcon className="w-5 h-5" />}
              >
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" animated>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                <div className="flex items-center text-green-600">
                  {getGrowthIcon(earningsData.month_over_month_growth)}
                  <span className="text-sm font-medium ml-1">
                    {earningsData.month_over_month_growth}%
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(earningsData.total_monthly_earnings)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Monthly Earnings
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={100}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <BanknotesIcon className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(earningsData.available_for_payout)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Available for Payout
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={200}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(earningsData.pending_earnings)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Pending Earnings
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <ReceiptPercentIcon className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {earningsData.commission_rate}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Commission Rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Goals Progress */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Six Figure Barber Goals Progress</CardTitle>
                <CardDescription>Track your progress toward 6FB income targets</CardDescription>
              </div>
              <Badge variant={earningsGoal.current_progress >= 80 ? 'default' : 'secondary'}>
                {earningsGoal.days_remaining} days left
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Monthly Goal Progress
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {earningsGoal.current_progress}%
                  </span>
                </div>
                <Progress value={earningsGoal.current_progress} className="h-3 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatCurrency(earningsData.total_monthly_earnings)} of {formatCurrency(earningsGoal.monthly_target)}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Yearly Goal Progress
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {((earningsData.total_yearly_earnings / earningsGoal.yearly_target) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={(earningsData.total_yearly_earnings / earningsGoal.yearly_target) * 100} 
                  className="h-3 mb-2" 
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatCurrency(earningsData.total_yearly_earnings)} of {formatCurrency(earningsGoal.yearly_target)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Performance Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Time Breakdown</TabsTrigger>
            <TabsTrigger value="services">Service Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-lg">Services Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {earningsData.services_completed}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This month
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-lg">Average Service Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600 mb-2">
                      {formatCurrency(earningsData.average_service_value)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Per service
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {getGrowthIcon(earningsData.month_over_month_growth)}
                      <p className="text-3xl font-bold text-green-600 ml-2">
                        {earningsData.month_over_month_growth}%
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      From last month
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Breakdown */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Weekly Breakdown</CardTitle>
                  <CardDescription>Earnings by week this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {earningsData.weekly_breakdown.map((week, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{week.week}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{week.services} services</p>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(week.earnings)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Breakdown */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                  <CardDescription>Last 4 months performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {earningsData.monthly_breakdown.map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{month.month}</p>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{month.services} services</p>
                            <div className="flex items-center">
                              {getGrowthIcon(month.growth_rate)}
                              <span className={`text-xs font-medium ml-1 ${
                                month.growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {month.growth_rate}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(month.earnings)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Top Performing Services</CardTitle>
                <CardDescription>Revenue breakdown by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {earningsData.top_services.map((service, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {service.service_name}
                        </h3>
                        <Badge variant="secondary">{service.percentage}%</Badge>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {service.count} services completed
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(service.revenue)}
                        </span>
                      </div>
                      <Progress value={service.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
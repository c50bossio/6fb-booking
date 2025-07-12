'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { SkeletonCard, SkeletonStats } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  BanknotesIcon,
  CreditCardIcon,
  ReceiptPercentIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface FinancialMetrics {
  totalRevenue: number
  revenueGrowth: number
  totalTransactions: number
  transactionGrowth: number
  averageOrderValue: number
  aovGrowth: number
  totalPayouts: number
  payoutGrowth: number
  netProfit: number
  profitMargin: number
  activeClients: number
  clientGrowth: number
}

interface RevenueData {
  month: string
  revenue: number
  transactions: number
  profit: number
}

interface TopService {
  name: string
  revenue: number
  count: number
  growth: number
}

const mockFinancialData: FinancialMetrics = {
  totalRevenue: 125650,
  revenueGrowth: 18.5,
  totalTransactions: 1847,
  transactionGrowth: 12.3,
  averageOrderValue: 68.10,
  aovGrowth: 5.2,
  totalPayouts: 75390,
  payoutGrowth: 15.7,
  netProfit: 37695,
  profitMargin: 30.0,
  activeClients: 892,
  clientGrowth: 8.9
}

const mockRevenueData: RevenueData[] = [
  { month: 'Jan', revenue: 95000, transactions: 1200, profit: 28500 },
  { month: 'Feb', revenue: 88000, transactions: 1150, profit: 26400 },
  { month: 'Mar', revenue: 102000, transactions: 1320, profit: 30600 },
  { month: 'Apr', revenue: 110000, transactions: 1450, profit: 33000 },
  { month: 'May', revenue: 118000, transactions: 1580, profit: 35400 },
  { month: 'Jun', revenue: 125650, transactions: 1650, profit: 37695 }
]

const mockTopServices: TopService[] = [
  { name: 'Premium Haircut & Style', revenue: 42850, count: 785, growth: 15.2 },
  { name: 'Beard Trim & Shape', revenue: 28640, count: 1143, growth: 22.1 },
  { name: 'Color & Highlights', revenue: 31200, count: 156, growth: 8.7 },
  { name: 'Hot Towel Shave', revenue: 18900, count: 378, growth: 12.5 },
  { name: 'Hair Wash & Treatment', revenue: 8950, count: 447, growth: -2.3 }
]

export default function FinancialAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('6months')
  const [refreshing, setRefreshing] = useState(false)

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

        // In a real app, you would fetch financial analytics data here
        // const analytics = await getFinancialAnalytics(dateRange)
        // setFinancialData(analytics)

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800))

      } catch (err) {
        console.error('Failed to load financial analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, dateRange])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
    )
  }

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Button
                onClick={() => router.push('/finance')}
                variant="ghost"
                size="sm"
              >
                ← Finance Hub
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Financial Analytics
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Comprehensive insights into your business performance
                </p>
              </div>
            </div>
          </div>
          
          <SkeletonStats />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ErrorMessage
            title="Failed to Load Analytics"
            message={error}
            onRetry={handleRefresh}
          />
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/finance')}
                variant="ghost"
                size="sm"
              >
                ← Finance Hub
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Financial Analytics
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Comprehensive insights into your business performance
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm w-full sm:w-auto"
              >
                <option value="1month">Last Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>
              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  leftIcon={refreshing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ArrowPathIcon className="w-5 h-5" />}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex-1 sm:flex-none"
                >
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<ArrowDownTrayIcon className="w-5 h-5" />}
                  className="flex-1 sm:flex-none"
                >
                  Export Report
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" animated>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                <div className="flex items-center space-x-1">
                  {getGrowthIcon(mockFinancialData.revenueGrowth)}
                  <span className={`text-sm font-medium ${getGrowthColor(mockFinancialData.revenueGrowth)}`}>
                    {formatPercentage(mockFinancialData.revenueGrowth)}
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(mockFinancialData.totalRevenue)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Revenue
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={100}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <CreditCardIcon className="w-5 h-5 text-blue-600" />
                <div className="flex items-center space-x-1">
                  {getGrowthIcon(mockFinancialData.transactionGrowth)}
                  <span className={`text-sm font-medium ${getGrowthColor(mockFinancialData.transactionGrowth)}`}>
                    {formatPercentage(mockFinancialData.transactionGrowth)}
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockFinancialData.totalTransactions.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Transactions
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={200}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <ReceiptPercentIcon className="w-5 h-5 text-purple-600" />
                <div className="flex items-center space-x-1">
                  {getGrowthIcon(mockFinancialData.aovGrowth)}
                  <span className={`text-sm font-medium ${getGrowthColor(mockFinancialData.aovGrowth)}`}>
                    {formatPercentage(mockFinancialData.aovGrowth)}
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(mockFinancialData.averageOrderValue)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Average Order Value
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <BanknotesIcon className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {mockFinancialData.profitMargin.toFixed(1)}% margin
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(mockFinancialData.netProfit)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Net Profit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRevenueData.map((data, index) => (
                  <div key={data.month} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {data.month}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                            style={{ width: `${(data.revenue / Math.max(...mockRevenueData.map(d => d.revenue))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(data.revenue)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {data.transactions} transactions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Services */}
          <Card>
            <CardHeader>
              <CardTitle>Top Services by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTopServices.map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {service.name}
                        </h4>
                        <div className="flex items-center space-x-1">
                          {getGrowthIcon(service.growth)}
                          <span className={`text-xs ${getGrowthColor(service.growth)}`}>
                            {formatPercentage(service.growth)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {service.count} bookings
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(service.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                          style={{ width: `${(service.revenue / Math.max(...mockTopServices.map(s => s.revenue))) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {mockFinancialData.activeClients}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Active Clients
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  {getGrowthIcon(mockFinancialData.clientGrowth)}
                  <span className={`text-sm font-medium ${getGrowthColor(mockFinancialData.clientGrowth)}`}>
                    {formatPercentage(mockFinancialData.clientGrowth)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">New clients this period</span>
                  <span className="font-medium">78</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Returning clients</span>
                  <span className="font-medium">814</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Retention rate</span>
                  <span className="font-medium text-green-600">91.2%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(mockFinancialData.totalPayouts)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Payouts
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  {getGrowthIcon(mockFinancialData.payoutGrowth)}
                  <span className={`text-sm font-medium ${getGrowthColor(mockFinancialData.payoutGrowth)}`}>
                    {formatPercentage(mockFinancialData.payoutGrowth)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Next payout</span>
                  <span className="font-medium">Tomorrow</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Pending amount</span>
                  <span className="font-medium">{formatCurrency(4250)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Commission rate</span>
                  <span className="font-medium">60%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Revenue Growth
                    </span>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    18.5% increase vs last period
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Peak Days
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Fridays and Saturdays perform best
                  </p>
                </div>
                
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <ReceiptPercentIcon className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Opportunity
                    </span>
                  </div>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Upsell premium services more
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
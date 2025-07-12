'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, fetchAPI, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { DateRangeSelector, DateRangePreset } from '@/components/analytics/shared/DateRangeSelector'
import { 
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  GiftIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ArrowArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

// Lazy load financial sections
const TransactionsSection = React.lazy(() => import('@/components/finance/sections/TransactionsSection'))
const EarningsSection = React.lazy(() => import('@/components/finance/sections/EarningsSection'))
const PayoutsSection = React.lazy(() => import('@/components/finance/sections/PayoutsSection'))
const CommissionsSection = React.lazy(() => import('@/components/finance/sections/CommissionsSection'))
const GiftCertificatesSection = React.lazy(() => import('@/components/finance/sections/GiftCertificatesSection'))
const BillingSection = React.lazy(() => import('@/components/finance/sections/BillingSection'))

interface FinanceTab {
  id: string
  label: string
  icon: React.ReactNode
  roles: string[]
  description: string
}

const financeTabs: FinanceTab[] = [
  { 
    id: 'overview', 
    label: 'Overview', 
    icon: <ChartBarIcon className="w-4 h-4" />,
    roles: ['all'],
    description: 'Financial summary and insights'
  },
  { 
    id: 'transactions', 
    label: 'Transactions', 
    icon: <CreditCardIcon className="w-4 h-4" />,
    roles: ['all'],
    description: 'Payment history and details'
  },
  { 
    id: 'earnings', 
    label: 'Earnings', 
    icon: <CurrencyDollarIcon className="w-4 h-4" />,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Your earnings and commission'
  },
  { 
    id: 'payouts', 
    label: 'Payouts', 
    icon: <BanknotesIcon className="w-4 h-4" />,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Payout schedule and history'
  },
  { 
    id: 'commissions', 
    label: 'Commissions', 
    icon: <ReceiptPercentIcon className="w-4 h-4" />,
    roles: ['admin', 'super_admin'],
    description: 'Commission rates and settings'
  },
  { 
    id: 'gift-certificates', 
    label: 'Gift Certificates', 
    icon: <GiftIcon className="w-4 h-4" />,
    roles: ['all'],
    description: 'Manage gift certificates'
  },
  { 
    id: 'billing', 
    label: 'Billing', 
    icon: <ArrowDownTrayIcon className="w-4 h-4" />,
    roles: ['admin', 'super_admin'],
    description: 'Platform billing and subscriptions'
  }
]

function UnifiedFinanceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    monthlyGrowth: 0,
    pendingPayouts: 0,
    activeTransactions: 0,
    totalEarnings: 0,
    nextPayout: null,
    giftCertificateBalance: 0
  })
  
  // Date range state
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Initialize date range
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [])

  // Update URL when tab changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('tab', activeTab)
    router.push(`/finance/unified?${newParams.toString()}`, { scroll: false })
  }, [activeTab, router, searchParams])

  // Load user and financial data
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

        // Load financial summary based on user role
        try {
          const [paymentsResponse, earningsResponse] = await Promise.all([
            fetchAPI(`/api/v1/payments/reports`, {
              method: 'POST',
              body: JSON.stringify({ start_date: startDate, end_date: endDate })
            }),
            userData.role !== 'client' ? fetchAPI(`/api/v1/payments/earnings?start_date=${startDate}&end_date=${endDate}`) : null
          ])

          setFinancialSummary({
            totalRevenue: paymentsResponse.revenue?.total || 0,
            monthlyGrowth: paymentsResponse.revenue?.growth_percentage || 0,
            pendingPayouts: earningsResponse?.pending_amount || 0,
            activeTransactions: paymentsResponse.transactions?.total || 0,
            totalEarnings: earningsResponse?.total_earnings || 0,
            nextPayout: earningsResponse?.next_payout_date || null,
            giftCertificateBalance: paymentsResponse.revenue?.gift_certificates_used || 0
          })
        } catch (err) {
          console.error('Failed to load financial summary:', err)
        }
      } catch (err) {
        console.error('Failed to load financial data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    if (startDate && endDate) {
      loadData()
    }
  }, [startDate, endDate, router])

  // Filter tabs based on user role
  const availableTabs = financeTabs.filter(tab => 
    tab.roles.includes('all') || tab.roles.includes(user?.role || '')
  )

  if (loading) {
    return <PageLoading message="Loading financial center..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user) {
    return null
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <FinancialOverview summary={financialSummary} userRole={user.role} />
      case 'transactions':
        return (
          <Suspense fallback={<PageLoading message="Loading transactions..." />}>
            <TransactionsSection userRole={user.role} dateRange={{ startDate, endDate }} />
          </Suspense>
        )
      case 'earnings':
        return (
          <Suspense fallback={<PageLoading message="Loading earnings..." />}>
            <EarningsSection userRole={user.role} dateRange={{ startDate, endDate }} />
          </Suspense>
        )
      case 'payouts':
        return (
          <Suspense fallback={<PageLoading message="Loading payouts..." />}>
            <PayoutsSection userRole={user.role} dateRange={{ startDate, endDate }} />
          </Suspense>
        )
      case 'commissions':
        return (
          <Suspense fallback={<PageLoading message="Loading commissions..." />}>
            <CommissionsSection userRole={user.role} />
          </Suspense>
        )
      case 'gift-certificates':
        return (
          <Suspense fallback={<PageLoading message="Loading gift certificates..." />}>
            <GiftCertificatesSection userRole={user.role} />
          </Suspense>
        )
      case 'billing':
        return (
          <Suspense fallback={<PageLoading message="Loading billing..." />}>
            <BillingSection userRole={user.role} />
          </Suspense>
        )
      default:
        return <div>Invalid tab selected</div>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
              >
                ← Dashboard
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Financial Center
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Comprehensive financial management
                  </p>
                </div>
              </div>
            </div>
            <DateRangeSelector
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              preset={datePreset}
              onPresetChange={setDatePreset}
            />
          </div>
        </div>

        {/* Tabbed Financial Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-auto gap-2">
            {availableTabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            {renderTabContent()}
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// Financial Overview Component
function FinancialOverview({ summary, userRole }: { summary: any; userRole?: string }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" animated>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600 flex items-center">
                <ArrowArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                {summary.monthlyGrowth}%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${summary.totalRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Revenue (MTD)
            </p>
          </CardContent>
        </Card>

        {userRole !== 'client' && (
          <>
            <Card variant="elevated" animated animationDelay={100}>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <BanknotesIcon className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${summary.pendingPayouts.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Pending Payouts
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated" animated animationDelay={200}>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <CreditCardIcon className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.activeTransactions}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Transactions Today
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <Card variant="elevated" animated animationDelay={300}>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <GiftIcon className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${summary.giftCertificateBalance.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Gift Certificates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              <CreditCardIcon className="w-4 h-4 mr-2" />
              Process Refund
            </Button>
            <Button variant="outline" className="justify-start">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Download Statement
            </Button>
            {userRole !== 'client' && (
              <>
                <Button variant="outline" className="justify-start">
                  <BanknotesIcon className="w-4 h-4 mr-2" />
                  Request Payout
                </Button>
                <Button variant="outline" className="justify-start">
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  Financial Report
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Financial Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Select a specific tab to view detailed financial data
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnifiedFinancePage() {
  return (
    <Suspense fallback={<PageLoading message="Loading financial center..." />}>
      <UnifiedFinanceContent />
    </Suspense>
  )
}
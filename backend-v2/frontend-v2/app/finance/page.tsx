'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CurrencyDollarIcon,
  CreditCardIcon,
  ArrowDownTrayIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  GiftIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

interface FinanceHubSection {
  id: string
  title: string
  description: string
  href: string
  icon: React.ReactNode
  roleRequired?: string[]
  stats?: {
    label: string
    value: string | number
  }[]
}

const financeSections: FinanceHubSection[] = [
  {
    id: 'transactions',
    title: 'Transactions',
    description: 'View and manage all payment transactions',
    href: '/finance/transactions',
    icon: <CreditCardIcon className="w-6 h-6" />,
    stats: [
      { label: 'Total Today', value: '$1,245' },
      { label: 'Transactions', value: 18 }
    ]
  },
  {
    id: 'earnings',
    title: 'Earnings',
    description: 'Track your earnings and commission details',
    href: '/finance/earnings',
    icon: <CurrencyDollarIcon className="w-6 h-6" />,
    roleRequired: ['barber', 'admin'],
    stats: [
      { label: 'This Month', value: '$8,420' },
      { label: 'Pending', value: '$1,200' }
    ]
  },
  {
    id: 'payouts',
    title: 'Payouts',
    description: 'Manage payout schedules and history',
    href: '/finance/payouts',
    icon: <BanknotesIcon className="w-6 h-6" />,
    roleRequired: ['barber', 'admin'],
    stats: [
      { label: 'Next Payout', value: 'Tomorrow' },
      { label: 'Amount', value: '$1,200' }
    ]
  },
  {
    id: 'commissions',
    title: 'Commissions',
    description: 'Configure commission rates and structures',
    href: '/finance/commissions',
    icon: <ReceiptPercentIcon className="w-6 h-6" />,
    roleRequired: ['admin', 'super_admin'],
    stats: [
      { label: 'Average Rate', value: '60%' },
      { label: 'Total Barbers', value: 8 }
    ]
  },
  {
    id: 'gift-certificates',
    title: 'Gift Certificates',
    description: 'Manage gift certificates and vouchers',
    href: '/finance/gift-certificates',
    icon: <GiftIcon className="w-6 h-6" />,
    stats: [
      { label: 'Active', value: 23 },
      { label: 'Value', value: '$1,850' }
    ]
  },
  {
    id: 'billing',
    title: 'Billing & Subscriptions',
    description: 'Manage platform billing and subscriptions',
    href: '/finance/billing',
    icon: <ArrowDownTrayIcon className="w-6 h-6" />,
    roleRequired: ['admin', 'super_admin'],
    stats: [
      { label: 'Plan', value: 'Professional' },
      { label: 'Next Bill', value: 'Jan 15' }
    ]
  }
]

export default function FinanceHubPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 45680,
    monthlyGrowth: 15.3,
    pendingPayouts: 3420,
    activeTransactions: 127
  })

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

        // Load financial summary data (mock for now)
        // const summary = await getFinancialSummary()
        // setFinancialSummary(summary)
      } catch (err) {
        console.error('Failed to load financial data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return <PageLoading message="Loading financial center..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user) {
    return null
  }

  // Filter sections based on user role
  const availableSections = financeSections.filter(section => {
    if (!section.roleRequired) return true
    return section.roleRequired.includes(user.role || '')
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
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
                    Manage all financial aspects of your business
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
                Export Financial Report
              </Button>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" animated>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-600 flex items-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                  {financialSummary.monthlyGrowth}%
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${financialSummary.totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Revenue (MTD)
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={100}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <BanknotesIcon className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${financialSummary.pendingPayouts.toLocaleString()}
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
                {financialSummary.activeTransactions}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Transactions Today
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <GiftIcon className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                $1,850
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gift Certificates
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableSections.map((section) => (
            <Card
              key={section.id}
              variant="elevated"
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(section.href)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {section.icon}
                  </div>
                  {section.stats && (
                    <div className="text-right">
                      {section.stats.map((stat, index) => (
                        <div key={index} className="mb-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {stat.label}
                          </p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {section.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {section.description}
                </p>
                <div className="mt-4 flex items-center text-primary-600 dark:text-primary-400">
                  <span className="text-sm font-medium">Manage</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
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
              <Button variant="outline" className="justify-start">
                <BanknotesIcon className="w-4 h-4 mr-2" />
                Request Payout
              </Button>
              <Button variant="outline" className="justify-start">
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Financial Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
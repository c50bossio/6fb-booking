'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, fetchAPI, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  GiftIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

// Lazy load financial sections  
const TransactionsSection = React.lazy(() => import('@/components/finance/sections/TransactionsSection'))
const EarningsSection = React.lazy(() => import('@/components/finance/sections/EarningsSection'))
const PayoutsSection = React.lazy(() => import('@/components/finance/sections/PayoutsSection'))
const CommissionsSection = React.lazy(() => import('@/components/finance/sections/CommissionsSection'))
const GiftCertificatesSection = React.lazy(() => import('@/components/finance/sections/GiftCertificatesSection'))

interface FinancialCenterSection {
  id: string
  title: string
  description: string
  href: string
  icon: React.ReactNode
  component: React.ComponentType<any>
  stats?: {
    primary: string
    secondary: string
  }
}

function FinancialCenterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 45680.00,
    monthlyGrowth: 15.3,
    pendingPayouts: 3420.00,
    transactionsToday: 18,
    giftCertificates: 1850.00,
    nextPayout: 1200.00
  })

  // Financial sections matching the screenshot layout
  const financialSections: FinancialCenterSection[] = [
    {
      id: 'transaction-management',
      title: 'Transaction Management',
      description: 'Advanced transaction search, refunds, and daily reporting',
      href: '#transaction-management',
      icon: <CreditCardIcon className="w-6 h-6" />,
      component: TransactionsSection,
      stats: {
        primary: '$1,245',
        secondary: 'Today'
      }
    },
    {
      id: 'simple-transactions',
      title: 'Simple Transactions',
      description: 'Basic payment transaction view',
      href: '#simple-transactions',
      icon: <ArrowRightIcon className="w-6 h-6" />,
      component: TransactionsSection,
      stats: {
        primary: 'Fast',
        secondary: 'View'
      }
    },
    {
      id: 'earnings',
      title: 'Earnings',
      description: 'Track your earnings and commission details',
      href: '#earnings',
      icon: <CurrencyDollarIcon className="w-6 h-6" />,
      component: EarningsSection,
      stats: {
        primary: '$8,420',
        secondary: 'Month'
      }
    },
    {
      id: 'payouts',
      title: 'Payouts',
      description: 'Manage payout schedules and history',
      href: '#payouts',
      icon: <BanknotesIcon className="w-6 h-6" />,
      component: PayoutsSection,
      stats: {
        primary: 'Tomorrow',
        secondary: '$1,200'
      }
    },
    {
      id: 'commissions',
      title: 'Commissions',
      description: 'Configure commission rates and structures',
      href: '#commissions',
      icon: <ReceiptPercentIcon className="w-6 h-6" />,
      component: CommissionsSection,
      stats: {
        primary: '60%',
        secondary: 'Rate'
      }
    },
    {
      id: 'gift-certificates',
      title: 'Gift Certificates',
      description: 'Manage gift certificates and vouchers',
      href: '#gift-certificates',
      icon: <GiftIcon className="w-6 h-6" />,
      component: GiftCertificatesSection,
      stats: {
        primary: '23',
        secondary: 'Active'
      }
    }
  ]

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

        // Load real financial summary
        try {
          const paymentsResponse = await fetchAPI(`/api/v1/payments/reports`, {
            method: 'POST',
            body: JSON.stringify({ 
              start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
              end_date: new Date().toISOString()
            })
          })

          setFinancialSummary(prev => ({
            ...prev,
            totalRevenue: paymentsResponse.revenue?.total || 45680.00,
            monthlyGrowth: paymentsResponse.revenue?.growth_percentage || 15.3,
            transactionsToday: paymentsResponse.transactions?.total || 18
          }))
        } catch (err) {
          console.warn('Using default financial data:', err)
        }
      } catch (err) {
        console.error('Failed to load financial data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // Handle section click
  const handleSectionClick = (sectionId: string) => {
    setSelectedSection(selectedSection === sectionId ? null : sectionId)
  }

  // Check URL fragment for section
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash && financialSections.find(s => s.id === hash)) {
      setSelectedSection(hash)
    }
  }, [])

  if (loading) {
    return <PageLoading message="Loading financial center..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user) {
    return null
  }

  // Render selected section
  if (selectedSection) {
    const section = financialSections.find(s => s.id === selectedSection)
    if (section) {
      const SectionComponent = section.component
      return (
        <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => setSelectedSection(null)}
                    variant="ghost"
                    size="sm"
                  >
                    ← Back to Financial Center
                  </Button>
                  <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      {section.icon}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {section.title}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Content */}
            <Suspense fallback={<PageLoading message={`Loading ${section.title.toLowerCase()}...`} />}>
              <SectionComponent 
                userRole={user.role} 
                dateRange={{ 
                  startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0]
                }} 
              />
            </Suspense>
          </div>
        </div>
      )
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

        {/* Financial Summary Cards - Matching Screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" animated>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${financialSummary.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Month Revenue (MTD)</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-1">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <span className="text-xs text-green-600 font-medium flex items-center">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                    {financialSummary.monthlyGrowth}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={100}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Payouts</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${financialSummary.pendingPayouts.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Pending Payouts</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={200}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transactions Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {financialSummary.transactionsToday}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Transactions Today</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gift Certificates</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${financialSummary.giftCertificates.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Gift Certificates</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mb-1">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Management Sections Grid - Matching Screenshot Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {financialSections.map((section) => (
            <Card
              key={section.id}
              variant="elevated"
              className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => handleSectionClick(section.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-primary/10 transition-colors">
                    {section.icon}
                  </div>
                  {section.stats && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Next Payout
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {section.stats.primary}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {section.stats.secondary}
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {section.description}
                </p>
                <div className="flex items-center text-primary-600 dark:text-primary-400 group-hover:text-primary-700 transition-colors">
                  <span className="text-sm font-medium">Manage</span>
                  <ArrowRightIcon className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Statistics Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-900 dark:text-white">Payment received</span>
                  </div>
                  <span className="text-sm text-gray-500">2 min ago</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-900 dark:text-white">Payout processed</span>
                  </div>
                  <span className="text-sm text-gray-500">1 hour ago</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-900 dark:text-white">Gift certificate redeemed</span>
                  </div>
                  <span className="text-sm text-gray-500">3 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCardIcon className="w-4 h-4 mr-2" />
                  Process Refund
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Download Statement  
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BanknotesIcon className="w-4 h-4 mr-2" />
                  Request Payout
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  Financial Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function FinancialCenterPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading financial center..." />}>
      <FinancialCenterContent />
    </Suspense>
  )
}
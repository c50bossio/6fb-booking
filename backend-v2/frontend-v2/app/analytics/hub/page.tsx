'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { AnalyticsLayout } from '@/components/analytics/AnalyticsLayout'
import { AnalyticsNavigation } from '@/components/analytics/shared/AnalyticsNavigation'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ChartBarIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  UsersIcon,
  TrophyIcon,
  EnvelopeOpenIcon,
  StarIcon,
  ArrowRightIcon,
  LightBulbIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

interface AnalyticsHubContentProps {}

interface AnalyticsCard {
  id: string
  title: string
  description: string
  href: string
  icon: React.ReactNode
  features: string[]
  isAdvanced?: boolean
  isPremium?: boolean
  roles?: string[]
}

function AnalyticsHubContent({}: AnalyticsHubContentProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load user data
  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true)
        setError(null)

        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        setUser(userData)
      } catch (err) {
        console.error('Failed to load user:', err)
        setError(err instanceof Error ? err.message : 'Failed to load user data')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  const analyticsCards: AnalyticsCard[] = [
    {
      id: 'overview',
      title: 'Analytics Overview',
      description: 'Comprehensive dashboard with role-based insights, tabbed interface, and AI-powered analysis.',
      href: '/analytics',
      icon: <ChartBarIcon className="w-8 h-8 text-blue-600" />,
      features: [
        'Role-based dashboard views',
        'AI Insights Panel integration',
        'Tabbed analytics interface',
        'Real-time data updates'
      ]
    },
    {
      id: 'enhanced',
      title: 'Enhanced Analytics',
      description: 'Advanced analytics dashboard with AI insights, performance metrics, and sophisticated visualizations.',
      href: '/analytics/enhanced',
      icon: <RocketLaunchIcon className="w-8 h-8 text-purple-600" />,
      isAdvanced: true,
      features: [
        'AI-powered insights and recommendations',
        'Industry benchmark comparisons',
        'Advanced performance scoring',
        'Interactive chart components',
        'Real-time metrics tracking'
      ]
    },
    {
      id: 'sixfigure',
      title: 'Six Figure Analytics',
      description: 'Track your progress toward six-figure income with Six Figure Barber methodology-aligned insights.',
      href: '/analytics/sixfigure',
      icon: <AcademicCapIcon className="w-8 h-8 text-green-600" />,
      isPremium: true,
      features: [
        'Six Figure Barber methodology alignment',
        'Income target tracking and progress',
        'AI coaching recommendations',
        'Price optimization suggestions',
        'Client acquisition insights'
      ]
    },
    {
      id: 'revenue',
      title: 'Revenue Analytics',
      description: 'Deep dive into financial performance with detailed revenue tracking and trend analysis.',
      href: '/analytics/revenue',
      icon: <CurrencyDollarIcon className="w-8 h-8 text-green-600" />,
      roles: ['admin', 'super_admin'],
      features: [
        'Revenue trend analysis',
        'Financial performance metrics',
        'Profit margin tracking',
        'Payment method insights'
      ]
    },
    {
      id: 'clients',
      title: 'Client Analytics',
      description: 'Understand client behavior, retention patterns, and segment performance.',
      href: '/analytics/clients',
      icon: <UsersIcon className="w-8 h-8 text-blue-600" />,
      features: [
        'Client retention analysis',
        'Segmentation insights',
        'Lifetime value tracking',
        'Behavioral patterns'
      ]
    },
    {
      id: 'marketing',
      title: 'Marketing Analytics',
      description: 'Campaign performance, ROI analysis, and marketing attribution insights.',
      href: '/analytics/marketing',
      icon: <EnvelopeOpenIcon className="w-8 h-8 text-orange-600" />,
      roles: ['admin', 'super_admin'],
      features: [
        'Campaign performance tracking',
        'ROI and attribution analysis',
        'Channel effectiveness',
        'Marketing funnel insights'
      ]
    }
  ]

  // Filter cards based on user role
  const getAvailableCards = (): AnalyticsCard[] => {
    if (!user) return []
    
    return analyticsCards.filter(card => {
      if (!card.roles) return true
      return card.roles.includes(user.role)
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Analytics Hub</h1>
          <p className="text-gray-600">Loading comprehensive business intelligence...</p>
        </div>
        <PageLoading message="Loading Analytics Hub..." />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <ErrorDisplay 
          error={error || 'User data not available'}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const availableCards = getAvailableCards()

  return (
    <AnalyticsLayout
      title="Analytics Hub"
      description="Comprehensive business intelligence and analytics suite powered by the Six Figure Barber methodology"
      userRole={user.role}
      showNavigation={true}
    >
      {/* Hero Section */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            <ChartBarIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Analytics Hub
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Comprehensive business intelligence suite featuring advanced AI insights, 
          Six Figure Barber methodology tracking, and sophisticated analytics dashboards.
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BoltIcon className="w-5 h-5 text-purple-500" />
              Quick Analytics Navigation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsNavigation 
              userRole={user.role}
              variant="cards"
            />
          </CardContent>
        </Card>
      </div>

      {/* Featured Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {availableCards.map((card) => (
          <Card 
            key={card.id} 
            className={`relative transition-all duration-200 hover:shadow-lg border-2 ${
              card.isAdvanced 
                ? 'border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20' 
                : card.isPremium
                ? 'border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            {(card.isAdvanced || card.isPremium) && (
              <div className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded-full ${
                card.isAdvanced 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300'
              }`}>
                {card.isAdvanced ? 'Advanced' : '6FB Premium'}
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {card.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {card.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                    <LightBulbIcon className="w-4 h-4 text-yellow-500" />
                    Key Features
                  </h4>
                  <ul className="space-y-1">
                    {card.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button 
                  onClick={() => router.push(card.href)}
                  className="w-full mt-4"
                  variant={card.isAdvanced || card.isPremium ? 'default' : 'outline'}
                >
                  Open {card.title}
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Information */}
      <Card className="border-l-4 border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BoltIcon className="w-5 h-5 text-blue-500" />
            Advanced Analytics Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Insights</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Machine learning algorithms analyze your business data to provide actionable recommendations and predictions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Six Figure Methodology</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Track your progress toward six-figure income with methodology-aligned metrics and coaching insights.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Real-Time Updates</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Live data synchronization ensures you always have the most current business intelligence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnalyticsLayout>
  )
}

export default function AnalyticsHubPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading Analytics Hub..." />}>
      <AnalyticsHubContent />
    </Suspense>
  )
}
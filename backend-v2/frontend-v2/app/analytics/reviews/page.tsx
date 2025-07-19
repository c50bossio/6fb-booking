'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { AnalyticsLayout, AnalyticsSectionLayout } from '@/components/analytics/AnalyticsLayout'
import { AnalyticsCardGrid } from '@/components/analytics/shared/AnalyticsCard'
import { DateRangeSelector, DateRangePreset } from '@/components/analytics/shared/DateRangeSelector'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { 
  StarIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

interface ReviewAnalyticsData {
  summary: {
    totalReviews: number
    averageRating: number
    responseRate: number
    averageResponseTime: string
  }
  ratings: {
    distribution: { stars: number; count: number; percentage: number }[]
    trend: { date: string; rating: number }[]
  }
  sentiment: {
    positive: number
    neutral: number
    negative: number
  }
  keywords: {
    positive: { word: string; count: number }[]
    negative: { word: string; count: number }[]
  }
  sources: {
    google: { count: number; rating: number }
    facebook: { count: number; rating: number }
    yelp: { count: number; rating: number }
    internal: { count: number; rating: number }
  }
  topReviewers: {
    name: string
    reviews: number
    averageRating: number
    isVip: boolean
  }[]
}

export default function ReviewsAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [analyticsData, setAnalyticsData] = useState<ReviewAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Initialize dates
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [])

  // Load data
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

        // Check permissions
        if (!['admin', 'super_admin', 'location_manager'].includes(userData.role || '')) {
          router.push('/analytics')
          return
        }

        setUser(userData)

        // Mock data - would be replaced with actual API call
        const mockData: ReviewAnalyticsData = {
          summary: {
            totalReviews: 342,
            averageRating: 4.7,
            responseRate: 87,
            averageResponseTime: '2.5 hours'
          },
          ratings: {
            distribution: [
              { stars: 5, count: 245, percentage: 71.6 },
              { stars: 4, count: 62, percentage: 18.1 },
              { stars: 3, count: 20, percentage: 5.8 },
              { stars: 2, count: 10, percentage: 2.9 },
              { stars: 1, count: 5, percentage: 1.5 }
            ],
            trend: Array.from({ length: 30 }, (_, i) => ({
              date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
              rating: 4.5 + Math.random() * 0.5
            }))
          },
          sentiment: {
            positive: 78,
            neutral: 15,
            negative: 7
          },
          keywords: {
            positive: [
              { word: 'professional', count: 89 },
              { word: 'friendly', count: 76 },
              { word: 'clean', count: 64 },
              { word: 'skilled', count: 58 },
              { word: 'punctual', count: 45 }
            ],
            negative: [
              { word: 'wait', count: 12 },
              { word: 'expensive', count: 8 },
              { word: 'parking', count: 6 },
              { word: 'rushed', count: 4 },
              { word: 'appointment', count: 3 }
            ]
          },
          sources: {
            google: { count: 185, rating: 4.8 },
            facebook: { count: 89, rating: 4.6 },
            yelp: { count: 42, rating: 4.5 },
            internal: { count: 26, rating: 4.9 }
          },
          topReviewers: [
            { name: 'John Smith', reviews: 12, averageRating: 5.0, isVip: true },
            { name: 'Sarah Johnson', reviews: 8, averageRating: 4.8, isVip: true },
            { name: 'Mike Davis', reviews: 6, averageRating: 4.7, isVip: false },
            { name: 'Lisa Chen', reviews: 5, averageRating: 5.0, isVip: false }
          ]
        }

        setAnalyticsData(mockData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [startDate, endDate, router])

  if (loading) {
    return <PageLoading message="Loading review analytics..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user || !analyticsData) {
    return null
  }

  const ratingTrend = analyticsData.ratings.trend[analyticsData.ratings.trend.length - 1].rating > analyticsData.ratings.trend[0].rating

  const metrics = [
    {
      title: 'Average Rating',
      value: analyticsData.summary.averageRating.toFixed(1),
      icon: <StarIcon className="w-5 h-5 text-yellow-600" />,
      trend: (ratingTrend ? 'up' : 'down') as 'up' | 'down',
      change: ratingTrend ? 2.1 : -1.5
    },
    {
      title: 'Total Reviews',
      value: analyticsData.summary.totalReviews,
      icon: <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-600" />,
      trend: 'up' as 'up',
      change: 15.3,
      changeLabel: 'vs last period'
    },
    {
      title: 'Response Rate',
      value: `${analyticsData.summary.responseRate}%`,
      icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
      trend: (analyticsData.summary.responseRate > 80 ? 'up' : 'down') as 'up' | 'down'
    },
    {
      title: 'Response Time',
      value: analyticsData.summary.averageResponseTime,
      icon: <ExclamationCircleIcon className="w-5 h-5 text-orange-600" />,
      trend: 'neutral' as 'neutral'
    }
  ]

  const handleExport = () => {
    }

  return (
    <AnalyticsLayout
      title="Review Analytics"
      description="Monitor customer satisfaction and feedback trends"
      userRole={user.role}
      showNavigation={true}
      navigationVariant="tabs"
    >
      <AnalyticsSectionLayout
        sectionTitle="Review Performance"
        sectionDescription="Track and analyze customer reviews across all platforms"
        filters={
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            preset={datePreset}
            onPresetChange={setDatePreset}
          />
        }
        actions={
          <Button variant="secondary" onClick={handleExport}>
            Export Report
          </Button>
        }
      >
        <div className="space-y-6">
          {/* KPI Cards */}
          <AnalyticsCardGrid metrics={metrics} loading={loading} />

          {/* Rating Distribution and Sentiment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.ratings.distribution.map((rating) => (
                    <div key={rating.stars} className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1 w-20">
                        <span className="text-sm font-medium">{rating.stars}</span>
                        <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${rating.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-sm font-medium">{rating.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sentiment Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-48">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-green-600">{analyticsData.sentiment.positive}%</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Positive Sentiment</p>
                    </div>
                  </div>
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${analyticsData.sentiment.positive * 5.03} 503`}
                      strokeDashoffset="0"
                      className="text-green-500"
                    />
                  </svg>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{analyticsData.sentiment.positive}%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Positive</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-600">{analyticsData.sentiment.neutral}%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Neutral</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{analyticsData.sentiment.negative}%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Negative</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Keywords Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Positive Keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                  <span>Top Positive Keywords</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.keywords.positive.map((keyword, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{keyword.word}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${(keyword.count / analyticsData.keywords.positive[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                          {keyword.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Negative Keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
                  <span>Areas for Improvement</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.keywords.negative.map((keyword, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{keyword.word}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${(keyword.count / analyticsData.keywords.negative[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                          {keyword.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Review Sources and Top Reviewers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Review Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Review Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analyticsData.sources).map(([source, data]) => (
                    <div key={source} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{source}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {data.count} reviews
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="font-bold">{data.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Reviewers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Reviewers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.topReviewers.map((reviewer, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold">
                          {reviewer.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium">{reviewer.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {reviewer.reviews} reviews {reviewer.isVip && '• VIP'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{reviewer.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Review Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/reviews')}
                >
                  View All Reviews
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/reviews/templates')}
                >
                  Response Templates
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/settings/integrations')}
                >
                  Connect Platforms
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                >
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AnalyticsSectionLayout>
    </AnalyticsLayout>
  )
}
import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { AnalyticsCardGrid } from '@/components/analytics/shared/AnalyticsCard'
import { 
  StarIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

interface ReviewsAnalyticsSectionProps {
  userRole?: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function ReviewsAnalyticsSection({ userRole, dateRange }: ReviewsAnalyticsSectionProps) {
  const [reviewData, setReviewData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState<'all' | 'google' | 'internal'>('all')

  useEffect(() => {
    async function loadReviewData() {
      try {
        setLoading(true)
        // Mock data - would be replaced with actual API call
        const mockData = {
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
            ]
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
          }
        }
        setReviewData(mockData)
      } catch (error) {
        console.error('Failed to load review data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReviewData()
  }, [dateRange])

  if (loading || !reviewData) {
    return <div>Loading review analytics...</div>
  }

  const metrics = [
    {
      title: 'Average Rating',
      value: reviewData.summary.averageRating.toFixed(1),
      icon: <StarIcon className="w-5 h-5 text-yellow-600" />,
      trend: 'up',
      change: 2.1
    },
    {
      title: 'Total Reviews',
      value: reviewData.summary.totalReviews,
      icon: <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-600" />,
      trend: 'up',
      change: 15.3,
      changeLabel: 'vs last period'
    },
    {
      title: 'Response Rate',
      value: `${reviewData.summary.responseRate}%`,
      icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
      trend: reviewData.summary.responseRate > 80 ? 'up' : 'down'
    },
    {
      title: 'Response Time',
      value: reviewData.summary.averageResponseTime,
      icon: <ExclamationCircleIcon className="w-5 h-5 text-orange-600" />,
      trend: 'neutral'
    }
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <AnalyticsCardGrid metrics={metrics} loading={false} />

      {/* Rating Distribution and Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviewData.ratings.distribution.map((rating: any) => (
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
                  <p className="text-4xl font-bold text-green-600">{reviewData.sentiment.positive}%</p>
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
                  strokeDasharray={`${reviewData.sentiment.positive * 5.03} 503`}
                  strokeDashoffset="0"
                  className="text-green-500"
                />
              </svg>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{reviewData.sentiment.positive}%</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Positive</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{reviewData.sentiment.neutral}%</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Neutral</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{reviewData.sentiment.negative}%</p>
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
              {reviewData.keywords.positive.map((keyword: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{keyword.word}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(keyword.count / reviewData.keywords.positive[0].count) * 100}%` }}
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
              {reviewData.keywords.negative.map((keyword: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{keyword.word}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${(keyword.count / reviewData.keywords.negative[0].count) * 100}%` }}
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

      {/* Review Sources */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Review Sources</CardTitle>
            <div className="flex gap-2">
              {(['all', 'google', 'internal'] as const).map((source) => (
                <Button
                  key={source}
                  variant={selectedSource === source ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSource(source)}
                >
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(reviewData.sources)
              .filter(([source]) => selectedSource === 'all' || source === selectedSource)
              .map(([source, data]: [string, any]) => (
                <div key={source} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{source}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {data.count} reviews
                    </p>
                  </div>
                  <div className="mt-2 flex items-center space-x-1">
                    <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-bold">{data.rating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Review Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              View All Reviews
            </Button>
            <Button variant="outline" className="justify-start">
              Response Templates
            </Button>
            <Button variant="outline" className="justify-start">
              Connect Platforms
            </Button>
            <Button variant="outline" className="justify-start">
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ChartBarIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  TagIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import { reviewsAPI } from '@/lib/api/reviews'
import { ReviewAnalytics, ReviewPlatform } from '@/types/review'

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
  description?: string
}

function MetricCard({ title, value, change, changeType, icon, description }: MetricCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600 dark:text-green-400'
      case 'decrease':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-500 dark:text-gray-400'
    }
  }

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <ArrowTrendingUpIcon className="w-4 h-4" />
      case 'decrease':
        return <ArrowTrendingDownIcon className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </CardTitle>
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </div>
          {change && (
            <div className={`flex items-center space-x-1 text-sm ${getChangeColor()}`}>
              {getChangeIcon()}
              <span>{change}</span>
            </div>
          )}
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface RatingDistributionProps {
  distribution: Record<number, number>
  totalReviews: number
}

function RatingDistribution({ distribution, totalReviews }: RatingDistributionProps) {
  const maxCount = Math.max(...Object.values(distribution))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating Distribution</CardTitle>
        <CardDescription>
          Breakdown of reviews by star rating
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating] || 0
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0

            return (
              <div key={rating} className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 w-20">
                  <span className="text-sm font-medium">{rating}</span>
                  <StarIconSolid className="w-4 h-4 text-yellow-400" />
                </div>
                
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative">
                  <div
                    className="bg-primary-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                
                <div className="flex items-center space-x-2 w-20 text-sm">
                  <span className="font-medium">{count}</span>
                  <span className="text-gray-500">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface PlatformBreakdownProps {
  platformData: Record<string, Record<string, any>>
}

function PlatformBreakdown({ platformData }: PlatformBreakdownProps) {
  const platforms = Object.entries(platformData).map(([platform, data]) => ({
    platform,
    count: data.count || 0,
    averageRating: data.average_rating || 0,
    responseRate: data.response_rate || 0
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Performance</CardTitle>
        <CardDescription>
          Review metrics by platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        {platforms.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No platform data available
          </p>
        ) : (
          <div className="space-y-4">
            {platforms.map(({ platform, count, averageRating, responseRate }) => (
              <div key={platform} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">
                    {reviewsAPI.getPlatformDisplay(platform)}
                  </h4>
                  <Badge variant="outline">
                    {count} reviews
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Average Rating:</span>
                    <div className="flex items-center space-x-1 mt-1">
                      <StarIconSolid className="w-4 h-4 text-yellow-400" />
                      <span className="font-medium">{averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">Response Rate:</span>
                    <div className="font-medium mt-1">
                      {Math.round(responseRate * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TopKeywordsProps {
  keywords: Array<{ keyword: string; count: number; sentiment: string }>
}

function TopKeywords({ keywords }: TopKeywordsProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'negative':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'neutral':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Keywords</CardTitle>
        <CardDescription>
          Most mentioned keywords in reviews
        </CardDescription>
      </CardHeader>
      <CardContent>
        {keywords.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No keyword data available
          </p>
        ) : (
          <div className="space-y-3">
            {keywords.slice(0, 10).map(({ keyword, count, sentiment }, index) => (
              <div key={keyword} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500 w-6">
                    #{index + 1}
                  </span>
                  <span className="font-medium">{keyword}</span>
                  <Badge className={getSentimentColor(sentiment)}>
                    {sentiment}
                  </Badge>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ServicesProps {
  services: Array<{ service: string; count: number; rating: number }>
}

function ServicesMentioned({ services }: ServicesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Services Performance</CardTitle>
        <CardDescription>
          Most mentioned services and their ratings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No service data available
          </p>
        ) : (
          <div className="space-y-3">
            {services.slice(0, 10).map(({ service, count, rating }, index) => (
              <div key={service} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{service}</span>
                  <Badge variant="outline">
                    {count} mentions
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <StarIconSolid className="w-4 h-4 text-yellow-400" />
                    <span className="ml-1 text-sm font-medium">
                      {rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    average rating
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ReviewAnalyticsPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState('30')
  const [selectedBusinessId, setSelectedBusinessId] = useState('')

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - parseInt(dateRange))
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    }
  }

  // Fetch analytics data
  const { 
    data: analytics, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['review-analytics', dateRange, selectedBusinessId],
    queryFn: () => reviewsAPI.getAnalytics({
      ...getDateRange(),
      business_id: selectedBusinessId || undefined
    })
  })

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (!analytics) return null

    const responseTimeDisplay = analytics.avg_response_time_hours < 24 
      ? `${Math.round(analytics.avg_response_time_hours)}h`
      : `${Math.round(analytics.avg_response_time_hours / 24)}d`

    const monthChange = analytics.reviews_last_month > 0
      ? ((analytics.reviews_this_month - analytics.reviews_last_month) / analytics.reviews_last_month) * 100
      : 0

    return {
      responseTimeDisplay,
      monthChange: monthChange.toFixed(1),
      monthChangeType: monthChange > 0 ? 'increase' : monthChange < 0 ? 'decrease' : 'neutral'
    }
  }, [analytics])

  if (error) {
    return (
      <div className="container max-w-7xl py-8">
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load analytics data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Reviews
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold">Review Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive insights into your review performance
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select
            value={dateRange}
            onValueChange={setDateRange}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {/* Loading skeleton for metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Loading skeleton for charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : !analytics ? (
        <div className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No data available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Analytics data will appear here once you have reviews to analyze.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Reviews"
              value={analytics.total_reviews.toLocaleString()}
              change={derivedMetrics ? `${derivedMetrics.monthChange}% vs last month` : undefined}
              changeType={derivedMetrics?.monthChangeType as any}
              icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />}
              description="All reviews across platforms"
            />
            
            <MetricCard
              title="Average Rating"
              value={`${analytics.average_rating.toFixed(1)} ⭐`}
              icon={<StarIcon className="w-5 h-5" />}
              description={`${analytics.positive_percentage.toFixed(1)}% positive reviews`}
            />
            
            <MetricCard
              title="Response Rate"
              value={`${Math.round(analytics.response_rate * 100)}%`}
              icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />}
              description="Percentage of reviews with responses"
            />
            
            <MetricCard
              title="Avg Response Time"
              value={derivedMetrics?.responseTimeDisplay || '0h'}
              icon={<ClockIcon className="w-5 h-5" />}
              description={`${Math.round(analytics.auto_response_percentage)}% auto-generated`}
            />
          </div>

          {/* Charts and Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RatingDistribution 
              distribution={analytics.rating_distribution}
              totalReviews={analytics.total_reviews}
            />
            
            <PlatformBreakdown 
              platformData={analytics.platform_breakdown}
            />
            
            <TopKeywords 
              keywords={analytics.top_keywords}
            />
            
            <ServicesMentioned 
              services={analytics.services_mentioned}
            />
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserGroupIcon className="w-5 h-5 mr-2" />
                  Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Verified Reviews:</span>
                  <span className="font-medium">{analytics.verified_reviews_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flagged Reviews:</span>
                  <span className="font-medium text-orange-600">{analytics.flagged_reviews_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Helpful Reviews:</span>
                  <span className="font-medium">{analytics.helpful_reviews_count}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 mr-2" />
                  Monthly Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">This Month:</span>
                  <span className="font-medium">{analytics.reviews_this_month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Month:</span>
                  <span className="font-medium">{analytics.reviews_last_month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Change:</span>
                  <span className={`font-medium ${
                    analytics.month_over_month_change > 0 
                      ? 'text-green-600' 
                      : analytics.month_over_month_change < 0 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`}>
                    {analytics.month_over_month_change > 0 ? '+' : ''}
                    {analytics.month_over_month_change.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BuildingStorefrontIcon className="w-5 h-5 mr-2" />
                  Sentiment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analytics.sentiment_breakdown).map(([sentiment, count]) => (
                  <div key={sentiment} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{sentiment}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Competitor Mentions */}
          {analytics.competitor_mentions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                  Competitor Mentions
                </CardTitle>
                <CardDescription>
                  Reviews that mention competitor businesses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analytics.competitor_mentions.map((competitor, index) => (
                    <Badge key={index} variant="outline" className="text-orange-600">
                      {competitor}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
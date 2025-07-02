'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { 
  StarIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  FunnelIcon,
  ArrowPathIcon,
  PlusIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { reviewsAPI } from '@/lib/api/reviews'
import { 
  Review, 
  ReviewFilters, 
  ReviewPlatform, 
  ReviewSentiment, 
  ReviewResponseStatus,
  ReviewSyncRequest
} from '@/types/review'

interface ReviewCardProps {
  review: Review
  onRespond: (reviewId: number) => void
  onView: (reviewId: number) => void
}

function ReviewCard({ review, onRespond, onView }: ReviewCardProps) {
  const getSentimentColor = (sentiment: ReviewSentiment) => {
    switch (sentiment) {
      case ReviewSentiment.POSITIVE:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case ReviewSentiment.NEGATIVE:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case ReviewSentiment.NEUTRAL:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getResponseStatusColor = (status: ReviewResponseStatus) => {
    switch (status) {
      case ReviewResponseStatus.SENT:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case ReviewResponseStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case ReviewResponseStatus.FAILED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case ReviewResponseStatus.DRAFT:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIconSolid
            key={star}
            className={`w-4 h-4 ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {rating.toFixed(1)}
        </span>
      </div>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {reviewsAPI.getPlatformDisplay(review.platform)}
              </Badge>
              <Badge className={getSentimentColor(review.sentiment)}>
                {review.sentiment}
              </Badge>
              {review.is_verified && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Verified
                </Badge>
              )}
              {review.is_flagged && (
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                  Flagged
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {review.reviewer_name || 'Anonymous'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {reviewsAPI.formatDate(review.review_date)}
                </p>
              </div>
              {renderStars(review.rating)}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {review.review_text && (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {review.review_text}
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge className={getResponseStatusColor(review.response_status)}>
                <span className="flex items-center space-x-1">
                  {review.response_status === ReviewResponseStatus.SENT && (
                    <CheckCircleIcon className="w-3 h-3" />
                  )}
                  {review.response_status === ReviewResponseStatus.PENDING && (
                    <ClockIcon className="w-3 h-3" />
                  )}
                  {review.response_status === ReviewResponseStatus.FAILED && (
                    <XCircleIcon className="w-3 h-3" />
                  )}
                  <span className="capitalize">{review.response_status.replace('_', ' ')}</span>
                </span>
              </Badge>
              
              {review.auto_response_generated && (
                <Badge variant="outline" className="text-xs">
                  Auto-Generated
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(review.id)}
              >
                <EyeIcon className="w-4 h-4 mr-1" />
                View
              </Button>
              
              {review.can_respond && review.response_status !== ReviewResponseStatus.SENT && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onRespond(review.id)}
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />
                  Respond
                </Button>
              )}
            </div>
          </div>
          
          {review.keywords_mentioned.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {review.keywords_mentioned.slice(0, 3).map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {review.keywords_mentioned.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{review.keywords_mentioned.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReviewsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State for filters and pagination
  const [filters, setFilters] = useState<ReviewFilters>({})
  const [currentTab, setCurrentTab] = useState('all')
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const limit = 20

  // Fetch reviews with filters
  const { 
    data: reviewsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['reviews', filters, page, searchQuery],
    queryFn: () => reviewsAPI.getReviews({
      ...filters,
      search_query: searchQuery || undefined,
      skip: page * limit,
      limit,
      sort_by: 'review_date',
      sort_order: 'desc'
    }),
    keepPreviousData: true
  })

  // Sync reviews mutation
  const syncMutation = useMutation({
    mutationFn: (syncRequest: ReviewSyncRequest) => reviewsAPI.syncReviews(syncRequest),
    onSuccess: (data) => {
      toast({
        title: 'Sync Complete',
        description: data.message
      })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
    onError: (error: any) => {
      toast({
        title: 'Sync Failed',
        description: error.response?.data?.detail || 'Failed to sync reviews',
        variant: 'destructive'
      })
    }
  })

  // Filter options
  const filterOptions = reviewsAPI.getFilterOptions()

  // Apply tab filters
  const applyTabFilter = (tab: string) => {
    setCurrentTab(tab)
    setPage(0)
    
    switch (tab) {
      case 'needs_response':
        setFilters({ has_response: false })
        break
      case 'positive':
        setFilters({ sentiment: ReviewSentiment.POSITIVE })
        break
      case 'negative':
        setFilters({ sentiment: ReviewSentiment.NEGATIVE })
        break
      case 'flagged':
        setFilters({ is_flagged: true })
        break
      case 'recent':
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        setFilters({ start_date: sevenDaysAgo.toISOString().split('T')[0] })
        break
      default:
        setFilters({})
    }
  }

  // Handle review actions
  const handleViewReview = (reviewId: number) => {
    window.open(`/reviews/${reviewId}`, '_blank')
  }

  const handleRespondToReview = (reviewId: number) => {
    window.open(`/reviews/${reviewId}`, '_blank')
  }

  const handleSyncReviews = () => {
    syncMutation.mutate({
      platform: ReviewPlatform.GOOGLE,
      sync_responses: true,
      date_range_days: 30
    })
  }

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!reviewsData?.reviews) return null
    
    const reviews = reviewsData.reviews
    const total = reviews.length
    const needsResponse = reviews.filter(r => !r.response_text && r.can_respond).length
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / total
    const positiveCount = reviews.filter(r => r.sentiment === ReviewSentiment.POSITIVE).length
    
    return {
      total: reviewsData.total,
      needsResponse,
      avgRating: avgRating.toFixed(1),
      positivePercentage: Math.round((positiveCount / total) * 100)
    }
  }, [reviewsData])

  if (error) {
    return (
      <div className="container max-w-7xl py-8">
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load reviews. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage and respond to customer reviews across all platforms
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleSyncReviews}
            disabled={syncMutation.isPending}
            variant="outline"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Reviews
          </Button>
          
          <Link href="/reviews/templates">
            <Button variant="outline">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              Templates
            </Button>
          </Link>
          
          <Link href="/reviews/analytics">
            <Button variant="outline">
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Need Response</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summaryStats.needsResponse}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold mr-2">{summaryStats.avgRating}</div>
                <StarIconSolid className="w-5 h-5 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Positive Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summaryStats.positivePercentage}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search reviews by text, reviewer name, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
          
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  placeholder="Platform"
                  value={filters.platform || ''}
                  onValueChange={(value) => setFilters({ ...filters, platform: value as ReviewPlatform })}
                >
                  {filterOptions.platforms.map((platform) => (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  ))}
                </Select>
                
                <Select
                  placeholder="Sentiment"
                  value={filters.sentiment || ''}
                  onValueChange={(value) => setFilters({ ...filters, sentiment: value as ReviewSentiment })}
                >
                  {filterOptions.sentiments.map((sentiment) => (
                    <option key={sentiment.value} value={sentiment.value}>
                      {sentiment.label}
                    </option>
                  ))}
                </Select>
                
                <Select
                  placeholder="Response Status"
                  value={filters.response_status || ''}
                  onValueChange={(value) => setFilters({ ...filters, response_status: value as ReviewResponseStatus })}
                >
                  {filterOptions.responseStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
                
                <Select
                  placeholder="Min Rating"
                  value={filters.min_rating?.toString() || ''}
                  onValueChange={(value) => setFilters({ ...filters, min_rating: value ? Number(value) : undefined })}
                >
                  {filterOptions.ratings.map((rating) => (
                    <option key={rating.value} value={rating.value}>
                      {rating.label}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div className="flex items-center space-x-4 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({})
                    setSearchQuery('')
                    setCurrentTab('all')
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Tabs */}
      <Tabs value={currentTab} onValueChange={applyTabFilter}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Reviews</TabsTrigger>
          <TabsTrigger value="needs_response">Needs Response</TabsTrigger>
          <TabsTrigger value="positive">Positive</TabsTrigger>
          <TabsTrigger value="negative">Negative</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value={currentTab} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : reviewsData?.reviews.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No reviews found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {currentTab === 'all' 
                    ? "You don't have any reviews yet. Try syncing with your platforms."
                    : "No reviews match the current filter criteria."
                  }
                </p>
                {currentTab === 'all' && (
                  <Button onClick={handleSyncReviews} disabled={syncMutation.isPending}>
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Sync Reviews
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviewsData?.reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onRespond={handleRespondToReview}
                    onView={handleViewReview}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              {reviewsData && reviewsData.has_more && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={isLoading}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
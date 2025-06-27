'use client'

import { useState } from 'react'
import {
  StarIcon,
  ChatBubbleLeftRightIcon,
  FlagIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  HeartIcon,
  HandThumbUpIcon,
  HandThumbDownIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { reviewManagementAPI, ReviewData, REVIEW_PLATFORMS, REVIEW_STATUSES } from '@/lib/api/local-seo'

interface ReviewManagerProps {
  reviews: ReviewData[]
  onReviewsUpdate: () => void
}

export default function ReviewManager({ reviews, onReviewsUpdate }: ReviewManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [responding, setResponding] = useState<Set<string>>(new Set())
  const [responseText, setResponseText] = useState<Record<string, string>>({})
  const [syncing, setSyncing] = useState(false)

  const handleSyncReviews = async () => {
    setSyncing(true)
    try {
      await reviewManagementAPI.syncReviews()
      onReviewsUpdate()
    } catch (error) {
      console.error('Error syncing reviews:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleRespondToReview = async (reviewId: string) => {
    const response = responseText[reviewId]
    if (!response?.trim()) return

    try {
      await reviewManagementAPI.respondToReview(reviewId, response)
      setResponseText({ ...responseText, [reviewId]: '' })
      setResponding(prev => {
        const newSet = new Set(prev)
        newSet.delete(reviewId)
        return newSet
      })
      onReviewsUpdate()
    } catch (error) {
      console.error('Error responding to review:', error)
    }
  }

  const handleFlagReview = async (reviewId: string, reason: string) => {
    try {
      await reviewManagementAPI.flagReview(reviewId, reason)
      onReviewsUpdate()
    } catch (error) {
      console.error('Error flagging review:', error)
    }
  }

  const startResponding = (reviewId: string) => {
    setResponding(prev => new Set(prev).add(reviewId))
  }

  const cancelResponding = (reviewId: string) => {
    setResponding(prev => {
      const newSet = new Set(prev)
      newSet.delete(reviewId)
      return newSet
    })
    setResponseText({ ...responseText, [reviewId]: '' })
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.review_text.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlatform = platformFilter === 'all' || review.platform === platformFilter
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter
    const matchesRating = ratingFilter === 'all' ||
                         (ratingFilter === 'positive' && review.rating >= 4) ||
                         (ratingFilter === 'neutral' && review.rating === 3) ||
                         (ratingFilter === 'negative' && review.rating <= 2)

    return matchesSearch && matchesPlatform && matchesStatus && matchesRating
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google':
        return '🔍'
      case 'yelp':
        return '🍴'
      case 'facebook':
        return '📘'
      default:
        return '⭐'
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'google':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'yelp':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      case 'facebook':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      responded: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      flagged: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      ignored: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status === 'new' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
        {status === 'responded' && <ChatBubbleLeftRightIcon className="h-3 w-3 mr-1" />}
        {status === 'flagged' && <FlagIcon className="h-3 w-3 mr-1" />}
        {status === 'ignored' && <EyeSlashIcon className="h-3 w-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getSentimentIcon = (sentiment: string, rating: number) => {
    if (rating >= 4) return <HeartIcon className="h-5 w-5 text-green-500" />
    if (rating === 3) return <HandThumbUpIcon className="h-5 w-5 text-yellow-500" />
    return <HandThumbDownIcon className="h-5 w-5 text-red-500" />
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIconSolid
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const getReviewStats = () => {
    const totalReviews = reviews.length
    const averageRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0
    const newReviews = reviews.filter(r => r.status === 'new').length
    const responseRate = totalReviews > 0 ? (reviews.filter(r => r.response).length / totalReviews) * 100 : 0

    return {
      totalReviews,
      averageRating: averageRating.toFixed(1),
      newReviews,
      responseRate: responseRate.toFixed(1)
    }
  }

  const stats = getReviewStats()

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
              <StarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Average Rating</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageRating}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalReviews}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">New Reviews</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.newReviews}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <HeartIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Response Rate</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.responseRate}%</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Platforms</option>
              {Object.entries(REVIEW_PLATFORMS).map(([key, value]) => (
                <option key={value} value={value}>
                  {key.charAt(0) + key.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {Object.entries(REVIEW_STATUSES).map(([key, value]) => (
                <option key={value} value={value}>
                  {key.charAt(0) + key.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Ratings</option>
              <option value="positive">Positive (4-5 ⭐)</option>
              <option value="neutral">Neutral (3 ⭐)</option>
              <option value="negative">Negative (1-2 ⭐)</option>
            </select>

            <button
              onClick={handleSyncReviews}
              disabled={syncing}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
            <div className="text-center">
              <StarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No reviews found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No reviews match your current filters.
              </p>
            </div>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {review.reviewer_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{review.reviewer_name}</h4>
                      {renderStars(review.rating)}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(review.platform)}`}>
                        <span className="mr-1">{getPlatformIcon(review.platform)}</span>
                        {review.platform}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {formatDate(review.review_date)}
                      </span>
                      {getSentimentIcon(review.sentiment, review.rating)}
                      <span className="capitalize">{review.sentiment}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(review.status)}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {review.review_text}
                </p>
                {review.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {review.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {review.response && (
                <div className="mb-4 p-4 bg-teal-50 dark:bg-teal-900/20 border-l-4 border-teal-500 rounded-r-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Your Response</span>
                    {review.response_date && (
                      <span className="text-xs text-teal-600 dark:text-teal-400">
                        {formatDate(review.response_date)}
                      </span>
                    )}
                  </div>
                  <p className="text-teal-800 dark:text-teal-200">{review.response}</p>
                </div>
              )}

              {responding.has(review.id) ? (
                <div className="space-y-3">
                  <textarea
                    value={responseText[review.id] || ''}
                    onChange={(e) => setResponseText({ ...responseText, [review.id]: e.target.value })}
                    placeholder="Write your response..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => cancelResponding(review.id)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRespondToReview(review.id)}
                      disabled={!responseText[review.id]?.trim()}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      Send Response
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {review.platform_url && (
                      <a
                        href={review.platform_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 dark:text-teal-400 text-sm hover:underline"
                      >
                        View on {review.platform}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!review.response && review.status !== 'responded' && (
                      <button
                        onClick={() => startResponding(review.id)}
                        className="flex items-center space-x-1 px-3 py-1 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                      >
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        <span className="text-sm">Respond</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleFlagReview(review.id, 'inappropriate')}
                      className="flex items-center space-x-1 px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <FlagIcon className="h-4 w-4" />
                      <span className="text-sm">Flag</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Star, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  Search,
  Filter,
  Plus,
  Send,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Meh,
  Frown,
  Building2,
  Calendar,
  BarChart3,
  Download,
  RefreshCw,
  Eye,
  Reply,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Review {
  id: string
  platform: 'google' | 'yelp' | 'facebook' | 'booking'
  reviewer_name: string
  reviewer_photo?: string
  rating: number
  review_text: string
  review_date: string
  business_location: string
  sentiment: 'positive' | 'negative' | 'neutral'
  has_response: boolean
  response_text?: string
  response_date?: string
  is_flagged: boolean
  tags: string[]
}

interface ReviewStats {
  total_reviews: number
  average_rating: number
  new_reviews_this_week: number
  response_rate: number
  positive_reviews: number
  negative_reviews: number
  neutral_reviews: number
  platforms: {
    google: number
    yelp: number
    facebook: number
    booking: number
  }
}

export default function ReviewsManagementPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const locationParam = searchParams.get('location')
  
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [responseText, setResponseText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadReviewsData()
  }, [locationParam])

  const loadReviewsData = async () => {
    setIsLoading(true)
    try {
      // Mock data for demonstration
      const mockReviews: Review[] = [
        {
          id: '1',
          platform: 'google',
          reviewer_name: 'John Smith',
          reviewer_photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
          rating: 5,
          review_text: 'Absolutely fantastic service! Mike gave me the best haircut I\'ve had in years. The attention to detail is incredible, and the atmosphere is very professional. Highly recommend this place to anyone looking for a quality cut.',
          review_date: '2024-07-20T10:30:00Z',
          business_location: 'Downtown Barbershop',
          sentiment: 'positive',
          has_response: true,
          response_text: 'Thank you so much John! We really appreciate your kind words and look forward to seeing you again soon. - Mike',
          response_date: '2024-07-20T14:15:00Z',
          is_flagged: false,
          tags: ['quality', 'professional', 'detailed']
        },
        {
          id: '2',
          platform: 'google',
          reviewer_name: 'Sarah Johnson',
          rating: 2,
          review_text: 'Had to wait 45 minutes past my appointment time. The cut was okay but nothing special for the price. Staff seemed rushed and didn\'t really listen to what I wanted.',
          review_date: '2024-07-19T16:45:00Z',
          business_location: 'Downtown Barbershop',
          sentiment: 'negative',
          has_response: false,
          is_flagged: true,
          tags: ['wait_time', 'communication', 'pricing']
        },
        {
          id: '3',
          platform: 'yelp',
          reviewer_name: 'Alex Chen',
          rating: 4,
          review_text: 'Good haircut and friendly service. The place is clean and modern. Only downside is parking can be difficult in this area.',
          review_date: '2024-07-18T12:20:00Z',
          business_location: 'Downtown Barbershop',
          sentiment: 'positive',
          has_response: false,
          is_flagged: false,
          tags: ['clean', 'modern', 'parking']
        },
        {
          id: '4',
          platform: 'facebook',
          reviewer_name: 'Emma Davis',
          rating: 5,
          review_text: 'Love this place! The barbers are all skilled and take their time. Great atmosphere and reasonable prices.',
          review_date: '2024-07-17T14:10:00Z',
          business_location: 'Uptown Hair Studio',
          sentiment: 'positive',
          has_response: true,
          response_text: 'Thank you Emma! We\'re so glad you love coming in. See you next time! 💇‍♀️',
          response_date: '2024-07-17T18:30:00Z',
          is_flagged: false,
          tags: ['skilled', 'atmosphere', 'pricing']
        }
      ]

      const mockStats: ReviewStats = {
        total_reviews: 247,
        average_rating: 4.6,
        new_reviews_this_week: 12,
        response_rate: 78,
        positive_reviews: 192,
        negative_reviews: 28,
        neutral_reviews: 27,
        platforms: {
          google: 156,
          yelp: 45,
          facebook: 32,
          booking: 14
        }
      }

      setReviews(mockReviews)
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load reviews:', error)
      toast({
        title: 'Error',
        description: 'Failed to load reviews. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendResponse = async (reviewId: string) => {
    if (!responseText.trim()) return

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update the review with response
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              has_response: true, 
              response_text: responseText,
              response_date: new Date().toISOString()
            }
          : review
      ))

      setResponseText('')
      setSelectedReview(null)
      
      toast({
        title: 'Response Sent',
        description: 'Your response has been posted successfully.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send response. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google': return '🔍'
      case 'yelp': return '🟡'
      case 'facebook': return '📘'
      case 'booking': return '📅'
      default: return '⭐'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-4 h-4 text-green-500" />
      case 'negative': return <Frown className="w-4 h-4 text-red-500" />
      case 'neutral': return <Meh className="w-4 h-4 text-yellow-500" />
      default: return <Meh className="w-4 h-4 text-gray-500" />
    }
  }

  const getStarRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating 
            ? 'text-yellow-400 fill-yellow-400' 
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ))
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.review_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.reviewer_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = platformFilter === 'all' || review.platform === platformFilter
    const matchesSentiment = sentimentFilter === 'all' || review.sentiment === sentimentFilter
    const matchesRating = ratingFilter === 'all' || 
                         (ratingFilter === '5' && review.rating === 5) ||
                         (ratingFilter === '4' && review.rating === 4) ||
                         (ratingFilter === '3' && review.rating === 3) ||
                         (ratingFilter === '1-2' && review.rating <= 2)
    
    return matchesSearch && matchesPlatform && matchesSentiment && matchesRating
  })

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-lg text-muted-foreground">Loading reviews...</span>
        </div>
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
            Monitor, respond to, and analyze customer reviews across all platforms
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadReviewsData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Reviews
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_reviews}</p>
                  <p className="text-xs text-muted-foreground">Total Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.average_rating}</p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.new_reviews_this_week}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Reply className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.response_rate}%</p>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ThumbsUp className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.positive_reviews}</p>
                  <p className="text-xs text-muted-foreground">Positive</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ThumbsDown className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.negative_reviews}</p>
                  <p className="text-xs text-muted-foreground">Negative</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Meh className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.neutral_reviews}</p>
                  <p className="text-xs text-muted-foreground">Neutral</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[300px]">
              <Label htmlFor="search">Search Reviews</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by reviewer name or review text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="min-w-[120px]">
              <Label>Platform</Label>
              <Select 
                value={platformFilter} 
                onChange={setPlatformFilter}
                options={[
                  { value: 'all', label: 'All Platforms' },
                  { value: 'google', label: 'Google' },
                  { value: 'yelp', label: 'Yelp' },
                  { value: 'facebook', label: 'Facebook' },
                  { value: 'booking', label: 'Booking' }
                ]}
              />
            </div>

            <div className="min-w-[120px]">
              <Label>Sentiment</Label>
              <Select 
                value={sentimentFilter} 
                onChange={setSentimentFilter}
                options={[
                  { value: 'all', label: 'All Sentiments' },
                  { value: 'positive', label: 'Positive' },
                  { value: 'neutral', label: 'Neutral' },
                  { value: 'negative', label: 'Negative' }
                ]}
              />
            </div>

            <div className="min-w-[120px]">
              <Label>Rating</Label>
              <Select 
                value={ratingFilter} 
                onChange={setRatingFilter}
                options={[
                  { value: 'all', label: 'All Ratings' },
                  { value: '5', label: '5 Stars' },
                  { value: '4', label: '4 Stars' },
                  { value: '3', label: '3 Stars' },
                  { value: '1-2', label: '1-2 Stars' }
                ]}
              />
            </div>

            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Reviews ({filteredReviews.length})
            </h2>
            <Select 
              value="newest" 
              onChange={() => {}}
              className="w-[180px]"
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'rating-high', label: 'Highest Rating' },
                { value: 'rating-low', label: 'Lowest Rating' },
                { value: 'no-response', label: 'Needs Response' }
              ]}
            />
          </div>

          <div className="space-y-4 max-h-[800px] overflow-y-auto">
            {filteredReviews.map((review) => (
              <Card 
                key={review.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedReview?.id === review.id ? 'border-primary bg-muted/30' : ''
                } ${review.is_flagged ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20' : ''}`}
                onClick={() => setSelectedReview(review)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {review.reviewer_photo ? (
                          <img 
                            src={review.reviewer_photo} 
                            alt={review.reviewer_name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {review.reviewer_name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{review.reviewer_name}</p>
                            <span className="text-lg">{getPlatformIcon(review.platform)}</span>
                            {review.is_flagged && (
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.review_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getSentimentIcon(review.sentiment)}
                        <div className="flex">
                          {getStarRating(review.rating)}
                        </div>
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className="text-sm leading-relaxed">
                      {review.review_text}
                    </p>

                    {/* Tags */}
                    {review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {review.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Response Status */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {review.business_location}
                        </span>
                      </div>
                      
                      {review.has_response ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Responded
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          Needs Response
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Review Detail & Response Panel */}
        <div className="lg:sticky lg:top-8">
          {selectedReview ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Review Details</span>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Original
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Full Review */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    {selectedReview.reviewer_photo ? (
                      <img 
                        src={selectedReview.reviewer_photo} 
                        alt={selectedReview.reviewer_name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <span className="font-medium">
                          {selectedReview.reviewer_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{selectedReview.reviewer_name}</h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {getStarRating(selectedReview.rating)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(selectedReview.review_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm leading-relaxed mb-4">
                    {selectedReview.review_text}
                  </p>
                </div>

                {/* Existing Response */}
                {selectedReview.has_response && selectedReview.response_text && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Reply className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Your Response</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedReview.response_date && new Date(selectedReview.response_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {selectedReview.response_text}
                    </p>
                  </div>
                )}

                {/* Response Form */}
                {!selectedReview.has_response && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="response">Write Your Response</Label>
                      <Textarea
                        id="response"
                        placeholder="Thank you for your feedback..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {responseText.length}/500 characters
                      </p>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm">
                        Use Template
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleSendResponse(selectedReview.id)}
                        disabled={!responseText.trim()}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Response
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      🏷️ Add Tags
                    </Button>
                    <Button variant="outline" size="sm">
                      🚩 Flag Review
                    </Button>
                    <Button variant="outline" size="sm">
                      📊 View Analytics
                    </Button>
                    <Button variant="outline" size="sm">
                      🔗 Share Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a review to view details and respond
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
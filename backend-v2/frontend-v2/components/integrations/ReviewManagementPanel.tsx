import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { 
  Star, 
  MessageSquare,
  Settings,
  Plus,
  Edit,
  Trash2,
  Send,
  RefreshCw,
  User,
  Calendar,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Minus,
  TrendingUp,
  Eye,
  Zap
} from 'lucide-react'
import { reviewsApi } from '@/lib/api/integrations'
import type { Review, ReviewTemplate } from '@/lib/api/integrations'
import { useToast } from '@/hooks/use-toast'

interface ReviewManagementPanelProps {
  className?: string
}

export const ReviewManagementPanel: React.FC<ReviewManagementPanelProps> = ({
  className = ''
}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [templates, setTemplates] = useState<ReviewTemplate[]>([])
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [responseText, setResponseText] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReviewsData()
  }, [])

  const loadReviewsData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [reviewsData, templatesData] = await Promise.all([
        reviewsApi.getReviews(),
        reviewsApi.getReviewTemplates()
      ])

      setReviews(reviewsData)
      setTemplates(templatesData)
    } catch (err) {
      console.error('Failed to load reviews data:', err)
      setError('Failed to load reviews data')
      toast({
        title: 'Error',
        description: 'Failed to load reviews data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRespondToReview = async (reviewId: string, response: string) => {
    try {
      setIsResponding(true)
      await reviewsApi.respondToReview(reviewId, response)
      
      toast({
        title: 'Response Sent',
        description: 'Your response has been published successfully'
      })

      // Update the review in the list
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, response: { text: response, created_at: new Date().toISOString() } }
          : review
      ))

      setSelectedReview(null)
      setResponseText('')
    } catch (err) {
      console.error('Failed to respond to review:', err)
      toast({
        title: 'Response Failed',
        description: 'Failed to send your response',
        variant: 'destructive'
      })
    } finally {
      setIsResponding(false)
    }
  }

  const handleGenerateAutoResponse = async (reviewId: string) => {
    try {
      const result = await reviewsApi.generateAutoResponse(reviewId)
      setResponseText(result.suggested_response)
      
      toast({
        title: 'Response Generated',
        description: `AI suggested response (${result.confidence}% confidence)`
      })
    } catch (err) {
      console.error('Failed to generate auto response:', err)
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate automatic response',
        variant: 'destructive'
      })
    }
  }

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ))
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="h-4 w-4 text-green-500" />
      case 'negative': return <ThumbsDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTemplateForRating = (rating: number): ReviewTemplate | undefined => {
    if (rating >= 4) return templates.find(t => t.template_type === 'positive')
    if (rating <= 2) return templates.find(t => t.template_type === 'negative')
    return templates.find(t => t.template_type === 'neutral')
  }

  const unrespondedReviews = reviews.filter(r => !r.response)
  const positiveReviews = reviews.filter(r => r.sentiment === 'positive')
  const negativeReviews = reviews.filter(r => r.sentiment === 'negative')
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Review Management
            </CardTitle>
            <CardDescription>
              Monitor and respond to customer reviews across platforms
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={loadReviewsData}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Reviews</p>
            <p className="text-2xl font-bold">{reviews.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Average Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
              <div className="flex">
                {getRatingStars(Math.round(avgRating))}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Needs Response</p>
            <p className="text-2xl font-bold text-orange-600">{unrespondedReviews.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Positive Reviews</p>
            <p className="text-2xl font-bold text-green-600">{positiveReviews.length}</p>
          </div>
        </div>

        <Tabs defaultValue="reviews" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {unrespondedReviews.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-orange-700 dark:text-orange-400">
                      Needs Response ({unrespondedReviews.length})
                    </h4>
                    {unrespondedReviews.slice(0, 3).map((review) => (
                      <Card key={review.id} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <h5 className="font-medium">{review.reviewer_name}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex">
                                    {getRatingStars(review.rating)}
                                  </div>
                                  <Badge className={getSentimentColor(review.sentiment)}>
                                    {review.sentiment}
                                  </Badge>
                                  <Badge variant="outline">
                                    {review.platform}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          <p className="text-sm mb-4">{review.text}</p>

                          {selectedReview?.id === review.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder="Write your response..."
                                className="w-full p-3 border rounded-lg resize-none"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleRespondToReview(review.id, responseText)}
                                  disabled={!responseText.trim() || isResponding}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  {isResponding ? 'Sending...' : 'Send Response'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGenerateAutoResponse(review.id)}
                                >
                                  <Zap className="h-3 w-3 mr-1" />
                                  AI Suggest
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedReview(null)
                                    setResponseText('')
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedReview(review)
                                  const template = getTemplateForRating(review.rating)
                                  setResponseText(template?.template_text || '')
                                }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Respond
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateAutoResponse(review.id)}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Auto-Generate
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* All Reviews */}
                <div className="space-y-3">
                  <h4 className="font-medium">All Reviews</h4>
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <h5 className="font-medium text-sm">{review.reviewer_name}</h5>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {getRatingStars(review.rating)}
                                </div>
                                <Badge size="sm" className={getSentimentColor(review.sentiment)}>
                                  {review.sentiment}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <p className="text-sm mb-2">{review.text}</p>

                        {review.response && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">Your Response</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.response.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs">{review.response.text}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading reviews...</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No reviews available</p>
                <p className="text-sm text-muted-foreground">
                  Connect Google My Business to start managing reviews
                </p>
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Response Templates</h4>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </Button>
            </div>

            {templates.length > 0 ? (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-sm">
                              {template.template_type.charAt(0).toUpperCase() + template.template_type.slice(1)} Reviews
                            </h5>
                            <Badge size="sm" variant={template.active ? "default" : "secondary"}>
                              {template.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Used {template.usage_count} times • Rating range: {template.rating_range}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm mb-3">{template.template_text}</p>

                      {template.seo_keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.seo_keywords.map((keyword, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No templates configured</p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Review Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Positive</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{positiveReviews.length}</span>
                        <Badge className="bg-green-100 text-green-800">
                          {reviews.length > 0 ? Math.round((positiveReviews.length / reviews.length) * 100) : 0}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Negative</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{negativeReviews.length}</span>
                        <Badge className="bg-red-100 text-red-800">
                          {reviews.length > 0 ? Math.round((negativeReviews.length / reviews.length) * 100) : 0}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Neutral</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {reviews.length - positiveReviews.length - negativeReviews.length}
                        </span>
                        <Badge className="bg-gray-100 text-gray-800">
                          {reviews.length > 0 ? Math.round(((reviews.length - positiveReviews.length - negativeReviews.length) / reviews.length) * 100) : 0}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Response Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">
                      {reviews.length > 0 ? Math.round(((reviews.length - unrespondedReviews.length) / reviews.length) * 100) : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {reviews.length - unrespondedReviews.length} of {reviews.length} reviews responded
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
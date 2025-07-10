'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { 
  StarIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowLeftIcon,
  LinkIcon,
  SparklesIcon,
  EyeIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { reviewsAPI } from '@/lib/api/reviews'
import { 
  Review, 
  ReviewResponse,
  ReviewTemplate,
  ReviewResponseCreate,
  ReviewResponseUpdate,
  TemplateGenerateRequest
} from '@/types/review'

interface ResponseEditorProps {
  review: Review
  template?: ReviewTemplate
  onSave: (response: ReviewResponseCreate) => void
  onSend: (responseId: number) => void
  isLoading?: boolean
}

function ResponseEditor({ review, template, onSave, onSend, isLoading }: ResponseEditorProps) {
  const [responseText, setResponseText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [businessName, setBusinessName] = useState('')
  const [isDraft, setIsDraft] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['review-templates'],
    queryFn: () => reviewsAPI.getTemplates({ is_active: true })
  })

  // Generate response from template
  const generateMutation = useMutation({
    mutationFn: ({ templateId, reviewId, request }: { 
      templateId: number, 
      reviewId: number, 
      request?: TemplateGenerateRequest 
    }) => reviewsAPI.generateResponseFromTemplate(templateId, reviewId, request),
    onSuccess: (data) => {
      setResponseText(data.response_text)
      setIsGenerating(false)
    },
    onError: () => {
      setIsGenerating(false)
    }
  })

  const handleGenerateResponse = () => {
    if (!selectedTemplate) return
    
    setIsGenerating(true)
    generateMutation.mutate({
      templateId: Number(selectedTemplate),
      reviewId: review.id,
      request: {
        template_id: Number(selectedTemplate),
        business_name: businessName || undefined,
        custom_placeholders: {}
      }
    })
  }

  const handleSave = () => {
    if (!responseText.trim()) return
    
    onSave({
      response_text: responseText,
      template_id: selectedTemplate || undefined,
      keywords_used: [],
      cta_included: responseText.toLowerCase().includes('book') || responseText.toLowerCase().includes('visit'),
      business_name_mentioned: businessName ? responseText.toLowerCase().includes(businessName.toLowerCase()) : false
    })
  }

  const characterCount = responseText.length
  const maxCharacters = 4096
  const isOverLimit = characterCount > maxCharacters

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
          Response Editor
        </CardTitle>
        <CardDescription>
          Create a professional response to this review
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Use Template (Optional)
            </label>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
              placeholder="Select a template..."
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id.toString()}>
                  {template.name} ({template.category})
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Business Name (Optional)
            </label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business name"
            />
          </div>
        </div>
        
        {selectedTemplate && (
          <Button
            onClick={handleGenerateResponse}
            disabled={isGenerating}
            variant="outline"
            className="w-full"
          >
            <SparklesIcon className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Generate Response from Template
          </Button>
        )}
        
        {/* Response Text Area */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Response Text
          </label>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            className={`w-full min-h-[200px] p-3 border rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              isOverLimit 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
            placeholder="Write your response here..."
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-500">
              <span className={isOverLimit ? 'text-red-500' : 'text-gray-500'}>
                {characterCount.toLocaleString()}
              </span>
              <span className="text-gray-400"> / {maxCharacters.toLocaleString()} characters</span>
            </div>
            
            {responseText && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {responseText.toLowerCase().includes('book') && (
                  <Badge variant="outline" className="text-xs">
                    Includes CTA
                  </Badge>
                )}
                {businessName && responseText.toLowerCase().includes(businessName.toLowerCase()) && (
                  <Badge variant="outline" className="text-xs">
                    Business Name
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSave}
              disabled={!responseText.trim() || isOverLimit || isLoading}
              variant="outline"
            >
              <BookmarkIcon className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
          </div>
          
          <Button
            onClick={handleSave}
            disabled={!responseText.trim() || isOverLimit || isLoading}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <PaperAirplaneIcon className="w-4 h-4 mr-2" />
            Save & Send Response
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReviewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const reviewId = Number(params.id)

  // Fetch review details
  const { 
    data: review, 
    isLoading: reviewLoading, 
    error: reviewError 
  } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => reviewsAPI.getReview(reviewId),
    enabled: !!reviewId
  })

  // Create response mutation
  const createResponseMutation = useMutation({
    mutationFn: (responseData: ReviewResponseCreate) => 
      reviewsAPI.createResponse(reviewId, responseData),
    onSuccess: (data) => {
      toast({
        title: 'Response Created',
        description: 'Your response has been saved successfully.'
      })
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create Response',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      })
    }
  })

  // Send response mutation
  const sendResponseMutation = useMutation({
    mutationFn: (responseId: number) => reviewsAPI.sendResponse(responseId),
    onSuccess: (data) => {
      toast({
        title: 'Response Sent',
        description: 'Your response has been published to the platform.'
      })
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Send Response',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      })
    }
  })

  const handleSaveResponse = (responseData: ReviewResponseCreate) => {
    createResponseMutation.mutate(responseData)
  }

  const handleSendResponse = (responseId: number) => {
    sendResponseMutation.mutate(responseId)
  }

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

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIconSolid
            key={star}
            className={`w-5 h-5 ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
        <span className="ml-2 text-lg font-medium">
          {rating.toFixed(1)}
        </span>
      </div>
    )
  }

  if (reviewError) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load review details. The review may not exist or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (reviewLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-8 h-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert>
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Review Not Found</AlertTitle>
          <AlertDescription>
            The review you're looking for doesn't exist or has been removed.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Reviews
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold">Review Details</h1>
          <p className="text-muted-foreground">
            Manage this review and create responses
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{review.reviewer_name || 'Anonymous'}</span>
                    {review.is_verified && (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        Verified
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {reviewsAPI.formatDate(review.review_date)} • {reviewsAPI.getPlatformDisplay(review.platform)}
                  </CardDescription>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  {renderStars(review.rating)}
                  <Badge className={getSentimentColor(review.sentiment)}>
                    {review.sentiment}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {review.review_text && (
                <div>
                  <h4 className="font-medium mb-2">Review Text</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {review.review_text}
                  </p>
                </div>
              )}
              
              {review.review_url && (
                <div>
                  <a
                    href={review.review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary-600 hover:text-primary-700"
                  >
                    <LinkIcon className="w-4 h-4 mr-1" />
                    View on {reviewsAPI.getPlatformDisplay(review.platform)}
                  </a>
                </div>
              )}
              
              {review.keywords_mentioned.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Keywords Mentioned</h4>
                  <div className="flex flex-wrap gap-2">
                    {review.keywords_mentioned.map((keyword, index) => (
                      <Badge key={index} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {review.services_mentioned.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Services Mentioned</h4>
                  <div className="flex flex-wrap gap-2">
                    {review.services_mentioned.map((service, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {review.is_flagged && (
                <Alert>
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <AlertTitle>Flagged for Review</AlertTitle>
                  <AlertDescription>
                    {review.flag_reason || 'This review has been flagged and requires attention.'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          {/* Existing Response */}
          {review.response_text && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  <span>Your Response</span>
                  {review.response_status === 'sent' && (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  {review.response_date && `Sent on ${reviewsAPI.formatDate(review.response_date)}`}
                  {review.auto_response_generated && ' • Auto-generated'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {review.response_text}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Response Editor */}
        <div>
          {review.can_respond && !review.response_text ? (
            <ResponseEditor
              review={review}
              onSave={handleSaveResponse}
              onSend={handleSendResponse}
              isLoading={createResponseMutation.isPending || sendResponseMutation.isPending}
            />
          ) : !review.can_respond ? (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Cannot Respond
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  This review cannot be responded to, either due to platform restrictions 
                  or because too much time has passed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Response Already Sent
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  You have already responded to this review. The response has been 
                  published to the platform.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
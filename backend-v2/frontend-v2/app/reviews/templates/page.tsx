'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
// Temporary Modal replacement for build testing  
const TemplateModal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { 
  PlusIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  EyeIcon,
  TagIcon,
  SparklesIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { reviewsAPI } from '@/lib/api/reviews'
import { 
  ReviewTemplate,
  ReviewTemplateCreate,
  ReviewTemplateUpdate,
  ReviewPlatform,
  ReviewSentiment
} from '@/types/review'

interface TemplateFormProps {
  template?: ReviewTemplate
  isOpen: boolean
  onClose: () => void
  onSave: (templateData: ReviewTemplateCreate | ReviewTemplateUpdate) => void
  isLoading?: boolean
}

function TemplateForm({ template, isOpen, onClose, onSave, isLoading }: TemplateFormProps) {
  const [formData, setFormData] = useState<ReviewTemplateCreate>({
    name: '',
    description: '',
    category: 'positive',
    template_text: '',
    placeholders: [],
    seo_keywords: [],
    include_business_name: true,
    include_cta: true,
    is_active: true,
    priority: 0
  })

  const [newPlaceholder, setNewPlaceholder] = useState('')
  const [newKeyword, setNewKeyword] = useState('')

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        category: template.category,
        platform: template.platform,
        template_text: template.template_text,
        placeholders: template.placeholders,
        min_rating: template.min_rating,
        max_rating: template.max_rating,
        keywords_trigger: template.keywords_trigger,
        sentiment_trigger: template.sentiment_trigger,
        seo_keywords: template.seo_keywords,
        include_business_name: template.include_business_name,
        include_cta: template.include_cta,
        cta_text: template.cta_text,
        is_active: template.is_active,
        is_default: template.is_default,
        priority: template.priority
      })
    } else {
      // Reset form for new template
      setFormData({
        name: '',
        description: '',
        category: 'positive',
        template_text: '',
        placeholders: [],
        seo_keywords: [],
        include_business_name: true,
        include_cta: true,
        is_active: true,
        priority: 0
      })
    }
  }, [template, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addPlaceholder = () => {
    if (newPlaceholder.trim() && !formData.placeholders?.includes(newPlaceholder.trim())) {
      setFormData({
        ...formData,
        placeholders: [...(formData.placeholders || []), newPlaceholder.trim()]
      })
      setNewPlaceholder('')
    }
  }

  const removePlaceholder = (placeholder: string) => {
    setFormData({
      ...formData,
      placeholders: formData.placeholders?.filter(p => p !== placeholder) || []
    })
  }

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.seo_keywords?.includes(newKeyword.trim())) {
      setFormData({
        ...formData,
        seo_keywords: [...(formData.seo_keywords || []), newKeyword.trim()]
      })
      setNewKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      seo_keywords: formData.seo_keywords?.filter(k => k !== keyword) || []
    })
  }

  const renderStars = (rating: number, onRatingChange: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="hover:scale-110 transition-transform"
          >
            <StarIconSolid
              className={`w-5 h-5 ${
                star <= rating 
                  ? 'text-yellow-400' 
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{template ? 'Edit Template' : 'Create Template'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Template Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Positive Response - Service Appreciation"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <Select
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value as string })}
              options={[
                { value: 'positive', label: 'Positive' },
                { value: 'negative', label: 'Negative' },
                { value: 'neutral', label: 'Neutral' }
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description (Optional)</label>
          <Input
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of when to use this template"
          />
        </div>

        {/* Platform and Triggers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Platform (Optional)</label>
            <Select
              value={formData.platform || ''}
              onChange={(value) => setFormData({ ...formData, platform: value as ReviewPlatform })}
              placeholder="Any platform"
              options={[
                { value: '', label: 'Any Platform' },
                { value: 'google', label: 'Google' },
                { value: 'yelp', label: 'Yelp' },
                { value: 'facebook', label: 'Facebook' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'booksy', label: 'Booksy' },
                { value: 'fresha', label: 'Fresha' },
                { value: 'styleseat', label: 'StyleSeat' }
              ]}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Sentiment Trigger</label>
            <Select
              value={formData.sentiment_trigger || ''}
              onChange={(value) => setFormData({ ...formData, sentiment_trigger: value as ReviewSentiment })}
              placeholder="Any sentiment"
              options={[
                { value: '', label: 'Any Sentiment' },
                { value: ReviewSentiment.POSITIVE, label: 'Positive' },
                { value: ReviewSentiment.NEUTRAL, label: 'Neutral' },
                { value: ReviewSentiment.NEGATIVE, label: 'Negative' }
              ]}
            />
          </div>
        </div>

        {/* Rating Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Rating</label>
            <div className="flex items-center space-x-2">
              {renderStars(formData.min_rating || 0, (rating) => 
                setFormData({ ...formData, min_rating: rating })
              )}
              <span className="text-sm text-gray-500">
                {formData.min_rating || 'None'}
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Maximum Rating</label>
            <div className="flex items-center space-x-2">
              {renderStars(formData.max_rating || 0, (rating) => 
                setFormData({ ...formData, max_rating: rating })
              )}
              <span className="text-sm text-gray-500">
                {formData.max_rating || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Template Text */}
        <div>
          <label className="block text-sm font-medium mb-2">Template Text</label>
          <textarea
            value={formData.template_text}
            onChange={(e) => setFormData({ ...formData, template_text: e.target.value })}
            className="w-full min-h-[120px] p-3 border rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Thank you for your wonderful review, {{reviewer_name}}! We're thrilled to hear about your experience with {{service_mentioned}}. We look forward to serving you again soon!"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Use placeholders like {`{{reviewer_name}}`} or {`{{business_name}}`} for dynamic content.
          </p>
        </div>

        {/* Placeholders */}
        <div>
          <label className="block text-sm font-medium mb-2">Custom Placeholders</label>
          <div className="flex items-center space-x-2 mb-2">
            <Input
              value={newPlaceholder}
              onChange={(e) => setNewPlaceholder(e.target.value)}
              placeholder="Add placeholder (e.g., service_name)"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPlaceholder())}
            />
            <Button type="button" onClick={addPlaceholder} size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.placeholders?.map((placeholder, index) => (
              <button
                key={index}
                type="button"
                onClick={() => removePlaceholder(placeholder)}
                className="cursor-pointer hover:bg-red-50 hover:text-red-700"
              >
                <Badge variant="outline">
                  {placeholder} ×
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* SEO Keywords */}
        <div>
          <label className="block text-sm font-medium mb-2">SEO Keywords</label>
          <div className="flex items-center space-x-2 mb-2">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Add SEO keyword"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            />
            <Button type="button" onClick={addKeyword} size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.seo_keywords?.map((keyword, index) => (
              <button
                key={index}
                type="button"
                onClick={() => removeKeyword(keyword)}
                className="cursor-pointer hover:bg-red-50 hover:text-red-700"
              >
                <Badge variant="outline">
                  {keyword} ×
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Include Business Name</label>
              <Switch
                checked={formData.include_business_name}
                onCheckedChange={(checked) => setFormData({ ...formData, include_business_name: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Include Call-to-Action</label>
              <Switch
                checked={formData.include_cta}
                onCheckedChange={(checked) => setFormData({ ...formData, include_cta: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Active</label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            {formData.include_cta && (
              <div>
                <label className="block text-sm font-medium mb-2">CTA Text (Optional)</label>
                <Input
                  value={formData.cta_text || ''}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  placeholder="Book your next appointment today!"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Higher numbers = higher priority</p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}

interface TemplateCardProps {
  template: ReviewTemplate
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

function TemplateCard({ template, onEdit, onDelete, onToggleActive }: TemplateCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
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
    <Card className={`hover:shadow-lg transition-shadow ${!template.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <span>{template.name}</span>
              {template.is_default && (
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                  Default
                </Badge>
              )}
            </CardTitle>
            {template.description && (
              <CardDescription className="mt-1">
                {template.description}
              </CardDescription>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Badge className={getCategoryColor(template.category)}>
              {template.category}
            </Badge>
            <Switch
              checked={template.is_active}
              onCheckedChange={onToggleActive}
              size="sm"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            {template.template_text}
          </p>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            {template.platform && (
              <span>📱 {reviewsAPI.getPlatformDisplay(template.platform)}</span>
            )}
            {template.min_rating && template.max_rating && (
              <span>⭐ {template.min_rating}-{template.max_rating} stars</span>
            )}
            <span>🎯 Priority {template.priority}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span>Used {template.use_count} times</span>
            {template.success_rate > 0 && (
              <span>• {Math.round(template.success_rate * 100)}% success</span>
            )}
          </div>
        </div>
        
        {template.seo_keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.seo_keywords.slice(0, 3).map((keyword, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
            {template.seo_keywords.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.seo_keywords.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-gray-500">
            Created {reviewsAPI.formatDate(template.created_at)}
            {template.last_used_at && (
              <> • Last used {reviewsAPI.formatDate(template.last_used_at)}</>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <PencilIcon className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReviewTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReviewTemplate | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')
  const [showInactive, setShowInactive] = useState(false)

  // Fetch templates
  const { 
    data: templates = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['review-templates', filterCategory, filterPlatform, showInactive],
    queryFn: () => reviewsAPI.getTemplates({
      category: filterCategory || undefined,
      platform: filterPlatform || undefined,
      is_active: showInactive ? undefined : true
    })
  })

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: (templateData: ReviewTemplateCreate) => reviewsAPI.createTemplate(templateData),
    onSuccess: () => {
      toast({
        title: 'Template Created',
        description: 'Your review template has been created successfully.'
      })
      setIsCreateModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['review-templates'] })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create Template',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      })
    }
  })

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: ReviewTemplateUpdate }) => 
      reviewsAPI.updateTemplate(id, data),
    onSuccess: () => {
      toast({
        title: 'Template Updated',
        description: 'Your review template has been updated successfully.'
      })
      setEditingTemplate(null)
      queryClient.invalidateQueries({ queryKey: ['review-templates'] })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update Template',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      })
    }
  })

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (templateId: number) => reviewsAPI.deleteTemplate(templateId),
    onSuccess: () => {
      toast({
        title: 'Template Deleted',
        description: 'The template has been deleted successfully.'
      })
      queryClient.invalidateQueries({ queryKey: ['review-templates'] })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Delete Template',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      })
    }
  })

  const handleCreateTemplate = (templateData: ReviewTemplateCreate | ReviewTemplateUpdate) => {
    createMutation.mutate(templateData as ReviewTemplateCreate)
  }

  const handleUpdateTemplate = (templateData: ReviewTemplateCreate | ReviewTemplateUpdate) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: templateData as ReviewTemplateUpdate })
    }
  }

  const handleDeleteTemplate = (templateId: number) => {
    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      deleteMutation.mutate(templateId)
    }
  }

  const handleToggleActive = (template: ReviewTemplate) => {
    updateMutation.mutate({
      id: template.id,
      data: { is_active: !template.is_active }
    })
  }

  if (error) {
    return (
      <div className="container max-w-7xl py-8">
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load templates. Please try again later.
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
            <h1 className="text-3xl font-bold">Review Templates</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage response templates for efficient review management
            </p>
          </div>
        </div>
        
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Select
              value={filterCategory}
              onChange={(value) => setFilterCategory(value as string)}
              placeholder="All Categories"
              options={[
                { value: '', label: 'All Categories' },
                { value: 'positive', label: 'Positive' },
                { value: 'negative', label: 'Negative' },
                { value: 'neutral', label: 'Neutral' }
              ]}
            />
            
            <Select
              value={filterPlatform}
              onChange={(value) => setFilterPlatform(value as string)}
              placeholder="All Platforms"
              options={[
                { value: '', label: 'All Platforms' },
                { value: 'google', label: 'Google' },
                { value: 'yelp', label: 'Yelp' },
                { value: 'facebook', label: 'Facebook' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'booksy', label: 'Booksy' },
                { value: 'fresha', label: 'Fresha' },
                { value: 'styleseat', label: 'StyleSeat' }
              ]}
            />
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <label className="text-sm">Show inactive templates</label>
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                setFilterCategory('')
                setFilterPlatform('')
                setShowInactive(false)
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 mb-4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No templates found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first review response template to streamline your review management process.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => handleDeleteTemplate(template.id)}
              onToggleActive={() => handleToggleActive(template)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <TemplateForm
        template={editingTemplate || undefined}
        isOpen={isCreateModalOpen || !!editingTemplate}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingTemplate(null)
        }}
        onSave={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
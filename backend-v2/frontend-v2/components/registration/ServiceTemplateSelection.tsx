'use client'

import React, { useState, useEffect } from 'react'
import { Star, ArrowRight, SkipForward, CheckCircle, Sparkles, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ServiceTemplateSelector } from '@/components/onboarding/ServiceTemplateSelector'
import { ServiceTemplate } from '@/lib/types/service-templates'
import { BusinessType } from './BusinessTypeSelection'
import { toast } from '@/hooks/use-toast'

interface ServiceTemplateSelectionProps {
  businessType: BusinessType
  businessName: string
  selectedTemplates: ServiceTemplate[]
  onUpdate: (templates: ServiceTemplate[]) => void
  onNext: () => void
  onBack: () => void
}

interface OnboardingStats {
  totalTemplates: number
  avgRevenueIncrease: number
  setupTimeReduction: number
  successRate: number
}

export function ServiceTemplateSelection({
  businessType,
  businessName,
  selectedTemplates,
  onUpdate,
  onNext,
  onBack
}: ServiceTemplateSelectionProps) {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [onboardingStats, setOnboardingStats] = useState<OnboardingStats | null>(null)
  const [loading, setLoading] = useState(false)

  // Mock stats for demonstration - in production, fetch from API
  useEffect(() => {
    const loadStats = async () => {
      // Simulate API call
      setTimeout(() => {
        setOnboardingStats({
          totalTemplates: 47,
          avgRevenueIncrease: 32,
          setupTimeReduction: 75,
          successRate: 89
        })
      }, 500)
    }
    loadStats()
  }, [])

  const handleTemplateSelect = (templates: ServiceTemplate[]) => {
    onUpdate(templates)
    console.log('[ServiceTemplateSelection] Templates selected:', templates)
    
    // Track analytics for template selection
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'template_selection', {
        event_category: 'onboarding',
        event_label: 'service_templates',
        value: templates.length,
        custom_parameters: {
          business_type: businessType,
          template_count: templates.length,
          template_tiers: templates.map(t => t.six_fb_tier).join(','),
          template_categories: templates.map(t => t.category).join(',')
        }
      })
    }
  }

  const handleSkip = () => {
    setIsSkipping(true)
    setLoading(true)
    
    // Clear any selected templates
    onUpdate([])
    
    // Track analytics for skip action
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'template_skip', {
        event_category: 'onboarding',
        event_label: 'service_templates',
        custom_parameters: {
          business_type: businessType,
          had_previous_selections: selectedTemplates.length > 0
        }
      })
    }
    
    // Show confirmation toast
    toast({
      title: 'Template selection skipped',
      description: 'You can always add service templates later from your dashboard.',
      variant: 'default'
    })
    
    // Simulate processing delay
    setTimeout(() => {
      setLoading(false)
      onNext()
    }, 1000)
  }

  const handleContinue = () => {
    setLoading(true)
    
    if (selectedTemplates.length > 0) {
      toast({
        title: 'Templates selected successfully!',
        description: `${selectedTemplates.length} template${selectedTemplates.length === 1 ? '' : 's'} will be added to your services.`,
        variant: 'default'
      })
    }
    
    // Simulate processing delay
    setTimeout(() => {
      setLoading(false)
      onNext()
    }, 1000)
  }

  const getBusinessTypeDisplayName = (type: BusinessType): string => {
    switch (type) {
      case 'individual':
        return 'Independent Barber'
      case 'shop':
        return 'Barbershop'
      case 'multi_location':
        return 'Multi-Location Business'
      default:
        return 'Business'
    }
  }

  const getRecommendedTierForBusinessType = (type: BusinessType): string[] => {
    switch (type) {
      case 'individual':
        return ['starter', 'professional']
      case 'shop':
        return ['professional', 'premium']
      case 'multi_location':
        return ['premium', 'luxury']
      default:
        return ['starter', 'professional']
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 dark:border-primary-800"></div>
          <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary-600 dark:border-t-primary-400"></div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {isSkipping ? 'Processing your preferences...' : 'Setting up your services...'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isSkipping ? 'Almost done!' : 'Adding selected templates to your account'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary-100 dark:bg-primary-900/20 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Jumpstart Your Services
        </h1>
        
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Choose from our Six Figure Barber methodology-aligned service templates to get started quickly. 
          Perfect for <strong>{getBusinessTypeDisplayName(businessType)}</strong> businesses like {businessName}.
        </p>
      </div>

      {/* Stats Cards */}
      {onboardingStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {onboardingStats.totalTemplates}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Templates Available
                </div>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  +{onboardingStats.avgRevenueIncrease}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Revenue Increase
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {onboardingStats.setupTimeReduction}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Setup Time Saved
                </div>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {onboardingStats.successRate}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Success Rate
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            Why Use Service Templates?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Six Figure Methodology</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pre-built services aligned with proven revenue strategies
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Optimized Pricing</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Research-backed pricing strategies for maximum profitability
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Quick Setup</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get your services menu ready in minutes, not hours
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Proven Success</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Templates based on successful barbershop operations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Selection */}
      {showTemplateSelector ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Select Your Templates
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose up to 5 templates to get started
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowTemplateSelector(false)}
            >
              Back to Overview
            </Button>
          </div>

          <ServiceTemplateSelector
            onTemplatesSelect={handleTemplateSelect}
            selectedTemplates={selectedTemplates}
            maxSelections={5}
            allowMultiSelect={true}
            filterByTier={getRecommendedTierForBusinessType(businessType)}
            showFeaturedOnly={false}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Selection */}
          {selectedTemplates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Selected Templates ({selectedTemplates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {template.display_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {template.display_name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            ${template.suggested_base_price}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {template.six_fb_tier}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => setShowTemplateSelector(true)}
              className="flex-1"
              variant="primary"
            >
              <Star className="w-4 h-4 mr-2" />
              Browse Templates
            </Button>
            
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Skip for Now
            </Button>
          </div>

          {/* Notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Optional Step</p>
              <p>
                Service templates are completely optional. You can skip this step and add services manually later, 
                or browse templates from your dashboard anytime.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
        >
          Back
        </Button>
        
        <div className="flex items-center gap-3">
          {!showTemplateSelector && (
            <Button
              onClick={handleContinue}
              disabled={loading}
              className="flex items-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ServiceTemplateSelection
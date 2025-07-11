'use client'

import React, { useState } from 'react'
import { 
  X, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Star, 
  Users, 
  Target, 
  Award, 
  CheckCircle, 
  PlayCircle,
  BookOpen,
  Settings,
  ArrowRight,
  Info
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ServiceTemplate, ServiceTemplatePreviewProps } from '@/lib/types/service-templates'
import { formatTemplatePrice, getTierColor, getTierIcon, getMethodologyScoreColor } from '@/lib/api/service-templates'

/**
 * Service template preview modal component
 * 
 * Provides a detailed view of a service template including:
 * - Complete template information
 * - Six Figure Barber methodology details
 * - Pricing strategy breakdown
 * - Business rules and positioning
 * - Success metrics and usage statistics
 * - Apply/customize functionality
 */
export const ServiceTemplatePreview: React.FC<ServiceTemplatePreviewProps> = ({
  template,
  isOpen,
  onClose,
  onApply
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [applyLoading, setApplyLoading] = useState(false)

  const handleApply = async () => {
    setApplyLoading(true)
    try {
      await onApply(template)
      onClose()
    } catch (error) {
      console.error('Error applying template:', error)
    } finally {
      setApplyLoading(false)
    }
  }

  const tierColor = getTierColor(template.six_fb_tier)
  const tierIcon = getTierIcon(template.six_fb_tier)
  const methodologyColor = getMethodologyScoreColor(template.methodology_score)
  const priceDisplay = formatTemplatePrice(template)

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{tierIcon}</span>
                <Badge className={`${tierColor} text-sm font-medium`}>
                  {template.six_fb_tier.toUpperCase()}
                </Badge>
                {template.is_six_fb_certified && (
                  <Badge variant="success" className="text-sm">
                    <Award className="w-3 h-3 mr-1" />
                    6FB Certified
                  </Badge>
                )}
                {template.is_featured && (
                  <Badge variant="warning" className="text-sm">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {template.display_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {template.description}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="methodology">6FB Methodology</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Strategy</TabsTrigger>
              <TabsTrigger value="business">Business Rules</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Key Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Base Price</span>
                      <span className="font-semibold text-green-600">{priceDisplay}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Duration</span>
                      <span className="font-semibold">{template.duration_minutes} minutes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">6FB Score</span>
                      <span className={`font-semibold ${methodologyColor}`}>
                        {template.methodology_score}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Revenue Impact</span>
                      <Badge variant={template.revenue_impact === 'high' ? 'destructive' : 
                                   template.revenue_impact === 'medium' ? 'warning' : 'success'}>
                        {template.revenue_impact}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Success Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Success Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Uses</span>
                      <span className="font-semibold">{template.usage_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="font-semibold text-green-600">
                        {Math.round(template.success_rate * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Popularity</span>
                      <span className="font-semibold">
                        {Math.round(template.popularity_score)}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Category</span>
                      <Badge variant="secondary">{template.category}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Target Market */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Target Market & Positioning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Target Market</h4>
                        <p className="text-sm text-gray-600">{template.target_market}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Business Positioning</h4>
                        <p className="text-sm text-gray-600">{template.business_positioning}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Methodology Tab */}
            <TabsContent value="methodology" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Six Figure Barber Methodology Alignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${methodologyColor} bg-current bg-opacity-10`}>
                        {template.methodology_score}
                      </div>
                      <div>
                        <h4 className="font-semibold">Methodology Score</h4>
                        <p className="text-sm text-gray-600">
                          {template.methodology_score >= 90 ? 'Excellent' : 
                           template.methodology_score >= 80 ? 'Very Good' :
                           template.methodology_score >= 70 ? 'Good' :
                           template.methodology_score >= 60 ? 'Fair' : 'Needs Improvement'} 
                          6FB alignment
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Client Relationship Impact</h4>
                      <Badge variant={template.client_relationship_impact === 'high' ? 'destructive' : 
                                   template.client_relationship_impact === 'medium' ? 'warning' : 'success'}>
                        {template.client_relationship_impact} Impact
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Client Value Tier</h4>
                      <Badge variant="secondary">{template.client_value_tier}</Badge>
                    </div>
                  </div>

                  {template.success_metrics && (
                    <div>
                      <h4 className="font-semibold mb-3">Success Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(template.success_metrics).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Pricing Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <h4 className="font-semibold text-green-800 dark:text-green-200">Base Price</h4>
                      <p className="text-2xl font-bold text-green-600">${template.suggested_base_price}</p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200">Minimum Price</h4>
                      <p className="text-2xl font-bold text-blue-600">${template.suggested_min_price}</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <h4 className="font-semibold text-purple-800 dark:text-purple-200">Maximum Price</h4>
                      <p className="text-2xl font-bold text-purple-600">${template.suggested_max_price}</p>
                    </div>
                  </div>

                  {template.pricing_strategy && (
                    <div>
                      <h4 className="font-semibold mb-3">Pricing Strategy Details</h4>
                      <div className="space-y-3">
                        {Object.entries(template.pricing_strategy).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                              <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                              <p className="text-sm text-gray-600 mt-1">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <div>
                      <span className="font-medium">Duration: {template.duration_minutes} minutes</span>
                      {template.buffer_time_minutes > 0 && (
                        <span className="text-sm text-gray-600 ml-2">
                          (+ {template.buffer_time_minutes} min buffer)
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Rules Tab */}
            <TabsContent value="business" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Business Rules & Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold mb-2">Consultation Required</h4>
                      <div className="flex items-center gap-2">
                        {template.requires_consultation ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                        <span>{template.requires_consultation ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold mb-2">Service Category</h4>
                      <Badge variant="secondary">{template.category}</Badge>
                    </div>
                  </div>

                  {template.business_rules && (
                    <div>
                      <h4 className="font-semibold mb-3">Business Rules</h4>
                      <div className="space-y-3">
                        {Object.entries(template.business_rules).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <Settings className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                              <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                              <p className="text-sm text-gray-600 mt-1">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {template.template_tags && template.template_tags.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Template Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {template.template_tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Created {new Date(template.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleApply}
                loading={applyLoading}
                className="flex items-center gap-2"
              >
                Apply Template
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ServiceTemplatePreview
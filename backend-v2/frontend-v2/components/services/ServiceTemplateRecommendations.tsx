'use client'

import { useState, useEffect } from 'react'
import { 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Star, 
  ChevronRight,
  Plus,
  Info
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { type Service } from '@/lib/api'
import { getServiceTemplates, applyServiceTemplate } from '@/lib/api/service-templates'
import { type ServiceTemplate } from '@/lib/types/service-templates'

interface ServiceTemplateRecommendationsProps {
  currentServices: Service[]
  onApplyTemplate: () => void
}

export default function ServiceTemplateRecommendations({
  currentServices,
  onApplyTemplate
}: ServiceTemplateRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<ServiceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<number | null>(null)

  useEffect(() => {
    loadRecommendations()
  }, [currentServices])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      
      // Get featured templates
      const response = await getServiceTemplates({ is_featured: true }, 1, 6)
      
      // Filter recommendations based on current services
      const currentCategories = new Set(currentServices.map(s => s.category))
      const currentPriceRange = {
        min: Math.min(...currentServices.map(s => s.base_price)),
        max: Math.max(...currentServices.map(s => s.base_price))
      }
      
      // Prioritize templates that complement existing services
      const filtered = response.templates.filter(template => {
        // Don't recommend templates for categories already well-covered
        const categoryCoverage = currentServices.filter(s => s.category === template.category).length
        return categoryCoverage < 3
      })
      
      setRecommendations(filtered.slice(0, 4))
    } catch (error) {
      } finally {
      setLoading(false)
    }
  }

  const handleApplyTemplate = async (template: ServiceTemplate) => {
    try {
      setApplying(template.id)
      await applyServiceTemplate(template.id)
      await onApplyTemplate()
    } catch (error) {
      } finally {
      setApplying(null)
    }
  }

  const getRevenueImpactColor = (impact: string) => {
    switch (impact) {
      case 'very_high': return 'text-green-600 bg-green-50'
      case 'high': return 'text-blue-600 bg-blue-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'elite': return 'success'
      case 'growth': return 'warning'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Recommended Service Templates
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Based on your current services and Six Figure Barber methodology
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{template.display_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getTierBadgeVariant(template.six_fb_tier)}>
                        {template.six_fb_tier.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {template.category.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${template.base_price}</p>
                    <p className="text-xs text-gray-500">{template.duration_minutes}min</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Revenue Impact */}
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-3 ${
                  getRevenueImpactColor(template.revenue_impact)
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  {template.revenue_impact.replace(/_/g, ' ').toUpperCase()} Revenue Impact
                </div>

                {/* Template Benefits */}
                {template.template_benefits && template.template_benefits.length > 0 && (
                  <ul className="space-y-1 mb-3">
                    {template.template_benefits.slice(0, 2).map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-1 text-xs text-gray-600">
                        <ChevronRight className="w-3 h-3 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Methodology Score */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">
                      {template.methodology_score}% 6FB Score
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApplyTemplate(template)}
                    disabled={applying === template.id}
                  >
                    {applying === template.id ? (
                      'Applying...'
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        Apply
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View All Link */}
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/services/templates'}
          >
            View All Templates
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            These templates are pre-configured with Six Figure Barber best practices including optimal pricing, 
            duration, and service structure to maximize your revenue potential.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
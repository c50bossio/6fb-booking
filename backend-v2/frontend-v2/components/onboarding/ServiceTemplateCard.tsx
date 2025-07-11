'use client'

import React from 'react'
import { Check, Eye, Star, TrendingUp, Clock, Users, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ServiceTemplate, ServiceTemplateCardProps } from '@/lib/types/service-templates'
import { formatTemplatePrice, getTierColor, getTierIcon, getMethodologyScoreColor } from '@/lib/api/service-templates'

/**
 * Individual service template card component
 * 
 * Displays a single service template with key information including:
 * - Template name and description
 * - Six Figure Barber tier and methodology score
 * - Pricing information
 * - Revenue impact and success metrics
 * - Selection and preview controls
 */
export const ServiceTemplateCard: React.FC<ServiceTemplateCardProps> = ({
  template,
  selected,
  onSelect,
  onPreview,
  showPrice = true,
  showMethodologyScore = true,
  compact = false
}) => {
  const handleSelect = () => {
    onSelect(template.id)
  }

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPreview(template)
  }

  const tierColor = getTierColor(template.six_fb_tier)
  const tierIcon = getTierIcon(template.six_fb_tier)
  const methodologyColor = getMethodologyScoreColor(template.methodology_score)
  const priceDisplay = formatTemplatePrice(template)

  return (
    <Card
      variant={selected ? 'accent' : 'default'}
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-lg
        ${selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
        ${compact ? 'p-4' : ''}
      `}
      onClick={handleSelect}
      interactive
    >
      <CardHeader className={compact ? 'pb-2' : ''}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{tierIcon}</span>
              <Badge className={`${tierColor} text-xs font-medium`}>
                {template.six_fb_tier.toUpperCase()}
              </Badge>
              {template.is_six_fb_certified && (
                <Badge variant="success" className="text-xs">
                  6FB Certified
                </Badge>
              )}
              {template.is_featured && (
                <Badge variant="warning" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
            <CardTitle className={compact ? 'text-base' : 'text-lg'}>
              {template.display_name}
            </CardTitle>
            {!compact && template.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePreview}
              className="text-gray-500 hover:text-gray-700"
            >
              <Eye className="w-4 h-4" />
            </Button>
            {selected && (
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={compact ? 'pt-0' : ''}>
        <div className="space-y-3">
          {/* Pricing Information */}
          {showPrice && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-lg text-green-600">
                  {priceDisplay}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{template.duration_minutes}min</span>
              </div>
            </div>
          )}

          {/* Methodology Score */}
          {showMethodologyScore && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">6FB Methodology Score</span>
              </div>
              <div className={`font-semibold ${methodologyColor}`}>
                {template.methodology_score}/100
              </div>
            </div>
          )}

          {/* Revenue Impact */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`
                w-3 h-3 rounded-full
                ${template.revenue_impact === 'high' ? 'bg-red-500' : 
                  template.revenue_impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}
              `} />
              <span className="text-sm text-gray-600">Revenue Impact</span>
            </div>
            <span className="text-sm font-medium capitalize">
              {template.revenue_impact}
            </span>
          </div>

          {/* Usage Statistics */}
          {!compact && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {template.usage_count} uses
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-gray-500">
                  {Math.round(template.success_rate * 100)}% success
                </span>
              </div>
            </div>
          )}

          {/* Template Tags */}
          {!compact && template.template_tags && template.template_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {template.template_tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2 py-1">
                  {tag}
                </Badge>
              ))}
              {template.template_tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  +{template.template_tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ServiceTemplateCard
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Star, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Plus,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LoadingStates } from '@/components/ui/LoadingStates'
import { EmptyState } from '@/components/ui/EmptyState'
import ServiceTemplateCard from './ServiceTemplateCard'
import ServiceTemplatePreview from './ServiceTemplatePreview'
import { 
  ServiceTemplate, 
  ServiceTemplateFilters, 
  ServiceTemplateSelectorProps,
  SIX_FB_TIERS,
  REVENUE_IMPACT_LEVELS,
  SERVICE_CATEGORIES
} from '@/lib/types/service-templates'
import { 
  getServiceTemplates, 
  getFeaturedServiceTemplates, 
  getSixFBTierSummary,
  applyServiceTemplate
} from '@/lib/api/service-templates'

/**
 * Main service template selector component
 * 
 * Comprehensive template selection interface for the onboarding flow:
 * - Fetches and displays service templates from the API
 * - Provides filtering by tier, category, pricing, and methodology
 * - Supports both single and multi-selection modes
 * - Includes search functionality
 * - Responsive design for mobile devices
 * - Loading states and error handling
 * - Template preview functionality
 * - Apply templates to user's services
 */
export const ServiceTemplateSelector: React.FC<ServiceTemplateSelectorProps> = ({
  onTemplatesSelect,
  selectedTemplates = [],
  maxSelections = 5,
  showFeaturedOnly = false,
  allowMultiSelect = true,
  filterByTier = [],
  onApply
}) => {
  // State management
  const [templates, setTemplates] = useState<ServiceTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<ServiceTemplate[]>([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<number>>(new Set())
  const [previewTemplate, setPreviewTemplate] = useState<ServiceTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [applyingTemplate, setApplyingTemplate] = useState<number | null>(null)

  // Filters state
  const [filters, setFilters] = useState<ServiceTemplateFilters>({
    six_fb_tier: filterByTier.length > 0 ? filterByTier[0] : '',
    is_featured: showFeaturedOnly,
    search_query: ''
  })

  // Tier summary state
  const [tierSummary, setTierSummary] = useState<any>(null)

  // Initialize selected templates
  useEffect(() => {
    if (selectedTemplates.length > 0) {
      setSelectedTemplateIds(new Set(selectedTemplates.map(t => t.id)))
    }
  }, [selectedTemplates])

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let fetchedTemplates: ServiceTemplate[]
      
      if (showFeaturedOnly) {
        fetchedTemplates = await getFeaturedServiceTemplates(50)
      } else {
        const response = await getServiceTemplates(filters, 1, 50)
        fetchedTemplates = response.templates
      }

      // Apply tier filter if specified
      if (filterByTier.length > 0) {
        fetchedTemplates = fetchedTemplates.filter(template => 
          filterByTier.includes(template.six_fb_tier)
        )
      }

      setTemplates(fetchedTemplates)
      setFilteredTemplates(fetchedTemplates)
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Failed to load service templates. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters, showFeaturedOnly, filterByTier])

  // Fetch tier summary
  const fetchTierSummary = useCallback(async () => {
    try {
      const summary = await getSixFBTierSummary()
      setTierSummary(summary)
    } catch (err) {
      console.error('Error fetching tier summary:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchTemplates()
    fetchTierSummary()
  }, [fetchTemplates, fetchTierSummary])

  // Apply search and filters
  useEffect(() => {
    let filtered = templates

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template =>
        template.display_name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.template_tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, searchQuery])

  // Handle template selection
  const handleTemplateSelect = (templateId: number) => {
    const newSelected = new Set(selectedTemplateIds)
    
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId)
    } else {
      if (allowMultiSelect) {
        if (newSelected.size >= maxSelections) {
          // Remove oldest selection if at max
          const templatesArray = Array.from(newSelected)
          newSelected.delete(templatesArray[0])
        }
        newSelected.add(templateId)
      } else {
        newSelected.clear()
        newSelected.add(templateId)
      }
    }

    setSelectedTemplateIds(newSelected)
    
    // Notify parent of selection
    const selectedTemplatesArray = templates.filter(t => newSelected.has(t.id))
    onTemplatesSelect(selectedTemplatesArray)
  }

  // Handle template preview
  const handleTemplatePreview = (template: ServiceTemplate) => {
    setPreviewTemplate(template)
  }

  // Handle template apply
  const handleTemplateApply = async (template: ServiceTemplate) => {
    if (!onApply) return

    try {
      setApplyingTemplate(template.id)
      await onApply([template])
      setPreviewTemplate(null)
    } catch (err) {
      console.error('Error applying template:', err)
    } finally {
      setApplyingTemplate(null)
    }
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof ServiceTemplateFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      is_featured: showFeaturedOnly
    })
    setSearchQuery('')
  }

  // Apply templates action
  const handleApplySelected = async () => {
    if (!onApply || selectedTemplateIds.size === 0) return

    const selectedTemplatesArray = templates.filter(t => selectedTemplateIds.has(t.id))
    await onApply(selectedTemplatesArray)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <LoadingStates key={i} variant="card" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Templates</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchTemplates} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Choose Service Templates
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Select from Six Figure Barber methodology-aligned templates to jumpstart your services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.six_fb_tier || ''}
                onValueChange={(value) => handleFilterChange('six_fb_tier', value)}
                placeholder="All Tiers"
              >
                <option value="">All Tiers</option>
                {SIX_FB_TIERS.map(tier => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </Select>
              <Select
                value={filters.category || ''}
                onValueChange={(value) => handleFilterChange('category', value)}
                placeholder="All Categories"
              >
                <option value="">All Categories</option>
                {SERVICE_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Select>
              <Select
                value={filters.revenue_impact || ''}
                onValueChange={(value) => handleFilterChange('revenue_impact', value)}
                placeholder="Revenue Impact"
              >
                <option value="">All Impacts</option>
                {REVENUE_IMPACT_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Filter Summary */}
        {tierSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(tierSummary.tiers).map(([tierKey, tierData]: [string, any]) => (
              <Card key={tierKey} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium capitalize">{tierKey}</div>
                    <div className="text-2xl font-bold">{tierData.count}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Avg Score</div>
                    <div className="text-sm font-semibold">
                      {Math.round(tierData.avg_methodology_score)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {selectedTemplateIds.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">
                  {selectedTemplateIds.size} template{selectedTemplateIds.size !== 1 ? 's' : ''} selected
                </span>
                {maxSelections && (
                  <span className="text-sm text-gray-500">
                    (max {maxSelections})
                  </span>
                )}
              </div>
              {onApply && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApplySelected}
                  disabled={selectedTemplateIds.size === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Apply Selected
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No templates found"
          description="Try adjusting your search or filters to find templates."
          action={
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className={`
          ${viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }
        `}>
          {filteredTemplates.map((template) => (
            <ServiceTemplateCard
              key={template.id}
              template={template}
              selected={selectedTemplateIds.has(template.id)}
              onSelect={handleTemplateSelect}
              onPreview={handleTemplatePreview}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <ServiceTemplatePreview
          template={previewTemplate}
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onApply={handleTemplateApply}
        />
      )}
    </div>
  )
}

export default ServiceTemplateSelector
/**
 * Service Template Types
 * 
 * TypeScript interfaces for the Six Figure Barber service template system.
 * These types align with the backend schemas and API responses.
 */

export interface ServiceTemplate {
  id: number
  name: string
  display_name: string
  description: string | null
  category: string
  six_fb_tier: 'starter' | 'professional' | 'premium' | 'luxury'
  methodology_score: number
  revenue_impact: 'high' | 'medium' | 'low'
  client_relationship_impact: 'high' | 'medium' | 'low'
  suggested_base_price: number
  suggested_min_price: number
  suggested_max_price: number
  duration_minutes: number
  buffer_time_minutes: number
  requires_consultation: boolean
  client_value_tier: string
  target_market: string
  business_positioning: string
  success_metrics: Record<string, any>
  service_details: Record<string, any>
  pricing_strategy: Record<string, any>
  business_rules: Record<string, any>
  template_tags: string[]
  template_image_url: string | null
  demo_images: string[]
  popularity_score: number
  success_rate: number
  usage_count: number
  is_active: boolean
  is_featured: boolean
  is_six_fb_certified: boolean
  created_at: string
  updated_at: string
  created_by_id: number | null
  // Computed properties
  pricing_range_display?: string
  is_six_figure_aligned?: boolean
}

export interface ServiceTemplateListResponse {
  templates: ServiceTemplate[]
  total: number
  page: number
  page_size: number
  has_next: boolean
  has_previous: boolean
}

export interface ServiceTemplateFilters {
  category?: string
  six_fb_tier?: string
  revenue_impact?: string
  client_relationship_impact?: string
  min_price?: number
  max_price?: number
  requires_consultation?: boolean
  target_market?: string
  is_six_fb_certified?: boolean
  is_featured?: boolean
  search_query?: string
}

export interface ServiceTemplateApplyRequest {
  template_id: number
  custom_price?: number
  custom_name?: string
  custom_description?: string
  apply_business_rules?: boolean
  apply_pricing_rules?: boolean
}

export interface ServiceTemplateApplyResponse {
  service_id: number
  template_id: number
  applied_price: number
  customizations_applied: Record<string, any>
  business_rules_created: number[]
  message: string
}

export interface ServiceTemplateTierSummary {
  tier: string
  count: number
  avg_methodology_score: number
  avg_price: number
  price_range: {
    min: number
    max: number
  }
  categories: string[]
  templates: Array<{
    id: number
    name: string
    price: number
    methodology_score: number
  }>
}

export interface ServiceTemplateTierSummaryResponse {
  tiers: Record<string, ServiceTemplateTierSummary>
  total_templates: number
  six_fb_methodology_info: Record<string, string>
}

export interface AppliedTemplate {
  id: number
  template_id: number
  template_name: string
  template_tier: string
  service_id: number
  service_name: string | null
  applied_price: number
  applied_at: string
  last_used_at: string | null
  customizations: Record<string, any>
  revenue_generated: number
  bookings_count: number
  client_satisfaction_avg: number
  template_methodology_score: number
  is_six_figure_aligned: boolean
}

// UI component props types
export interface ServiceTemplateCardProps {
  template: ServiceTemplate
  selected: boolean
  onSelect: (templateId: number) => void
  onPreview: (template: ServiceTemplate) => void
  showPrice?: boolean
  showMethodologyScore?: boolean
  compact?: boolean
}

export interface ServiceTemplatePreviewProps {
  template: ServiceTemplate
  isOpen: boolean
  onClose: () => void
  onApply: (template: ServiceTemplate) => void
}

export interface ServiceTemplateSelectorProps {
  onTemplatesSelect: (templates: ServiceTemplate[]) => void
  selectedTemplates?: ServiceTemplate[]
  maxSelections?: number
  showFeaturedOnly?: boolean
  allowMultiSelect?: boolean
  filterByTier?: string[]
  onApply?: (templates: ServiceTemplate[]) => void
}

export interface ServiceTemplateFilterProps {
  filters: ServiceTemplateFilters
  onFiltersChange: (filters: ServiceTemplateFilters) => void
  tiers: string[]
  categories: string[]
  showAdvanced?: boolean
}

// Constants for the component
export const SIX_FB_TIERS = [
  { value: 'starter', label: 'Starter', description: 'Foundation services for new 6FB practitioners' },
  { value: 'professional', label: 'Professional', description: 'Enhanced services for established practitioners' },
  { value: 'premium', label: 'Premium', description: 'High-value services for experienced practitioners' },
  { value: 'luxury', label: 'Luxury', description: 'Ultimate services for master-level practitioners' }
] as const

export const REVENUE_IMPACT_LEVELS = [
  { value: 'high', label: 'High Impact', description: 'Significant revenue potential' },
  { value: 'medium', label: 'Medium Impact', description: 'Moderate revenue potential' },
  { value: 'low', label: 'Low Impact', description: 'Supporting revenue stream' }
] as const

export const SERVICE_CATEGORIES = [
  { value: 'haircut', label: 'Haircuts', icon: '✂️' },
  { value: 'styling', label: 'Styling', icon: '💫' },
  { value: 'grooming', label: 'Grooming', icon: '🪒' },
  { value: 'coloring', label: 'Coloring', icon: '🎨' },
  { value: 'treatment', label: 'Treatment', icon: '💆' },
  { value: 'consultation', label: 'Consultation', icon: '💬' },
  { value: 'package', label: 'Package', icon: '📦' }
] as const

export type SixFBTier = typeof SIX_FB_TIERS[number]['value']
export type RevenueImpactLevel = typeof REVENUE_IMPACT_LEVELS[number]['value']
export type ServiceCategory = typeof SERVICE_CATEGORIES[number]['value']
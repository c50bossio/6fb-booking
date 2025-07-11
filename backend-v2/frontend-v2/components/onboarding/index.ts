/**
 * Onboarding Components Export Index
 * 
 * Central export file for all onboarding-related components.
 * This provides a clean import interface for other parts of the application.
 */

export { default as ServiceTemplateSelector } from './ServiceTemplateSelector'
export { default as ServiceTemplateCard } from './ServiceTemplateCard'
export { default as ServiceTemplatePreview } from './ServiceTemplatePreview'

// Re-export types for convenience
export type {
  ServiceTemplate,
  ServiceTemplateFilters,
  ServiceTemplateSelectorProps,
  ServiceTemplateCardProps,
  ServiceTemplatePreviewProps,
  ServiceTemplateApplyRequest,
  ServiceTemplateApplyResponse,
  SixFBTier,
  RevenueImpactLevel,
  ServiceCategory
} from '@/lib/types/service-templates'

// Re-export API functions for convenience
export {
  getServiceTemplates,
  getFeaturedServiceTemplates,
  getServiceTemplate,
  applyServiceTemplate,
  getUserAppliedTemplates,
  getSixFBTierSummary,
  formatTemplatePrice,
  getTierColor,
  getTierIcon,
  getMethodologyScoreColor
} from '@/lib/api/service-templates'

// Constants for easy access
export {
  SIX_FB_TIERS,
  REVENUE_IMPACT_LEVELS,
  SERVICE_CATEGORIES
} from '@/lib/types/service-templates'
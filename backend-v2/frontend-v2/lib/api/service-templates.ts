/**
 * Service Templates API Client
 * 
 * API client functions for the Six Figure Barber service template system.
 * Handles all communication with the backend service templates endpoints.
 */

import { 
  ServiceTemplate, 
  ServiceTemplateListResponse, 
  ServiceTemplateFilters,
  ServiceTemplateApplyRequest,
  ServiceTemplateApplyResponse,
  ServiceTemplateTierSummaryResponse,
  AppliedTemplate
} from '../types/service-templates'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Enhanced fetch wrapper with error handling and authentication
 */
async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    throw error
  }
}

/**
 * Get service templates with optional filtering and pagination
 */
export async function getServiceTemplates(
  filters?: ServiceTemplateFilters,
  page: number = 1,
  pageSize: number = 50
): Promise<ServiceTemplateListResponse> {
  const searchParams = new URLSearchParams()
  
  // Add pagination parameters
  searchParams.append('page', page.toString())
  searchParams.append('page_size', pageSize.toString())
  
  // Add filter parameters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })
  }
  
  const queryString = searchParams.toString()
  const endpoint = `/api/v1/service-templates/${queryString ? `?${queryString}` : ''}`
  
  return await fetchAPI(endpoint)
}

/**
 * Get featured service templates for onboarding
 */
export async function getFeaturedServiceTemplates(limit: number = 6): Promise<ServiceTemplate[]> {
  const endpoint = `/api/v1/service-templates/featured?limit=${limit}`
  return await fetchAPI(endpoint)
}

/**
 * Get a specific service template by ID
 */
export async function getServiceTemplate(templateId: number): Promise<ServiceTemplate> {
  const endpoint = `/api/v1/service-templates/${templateId}`
  return await fetchAPI(endpoint)
}

/**
 * Apply a service template to create a new service
 */
export async function applyServiceTemplate(
  applyRequest: ServiceTemplateApplyRequest
): Promise<ServiceTemplateApplyResponse> {
  const endpoint = '/api/v1/service-templates/apply'
  
  return await fetchAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify(applyRequest),
  })
}

/**
 * Get service templates that the current user has applied
 */
export async function getUserAppliedTemplates(): Promise<AppliedTemplate[]> {
  const endpoint = '/api/v1/service-templates/user/applied'
  return await fetchAPI(endpoint)
}

/**
 * Get Six Figure Barber tier summary with template counts and metrics
 */
export async function getSixFBTierSummary(): Promise<ServiceTemplateTierSummaryResponse> {
  const endpoint = '/api/v1/service-templates/tiers/summary'
  return await fetchAPI(endpoint)
}

/**
 * Populate database with Six Figure Barber preset templates
 * Note: This is typically an admin-only operation
 */
export async function populateSixFBPresets(): Promise<{ message: string; templates_created: any[] }> {
  const endpoint = '/api/v1/service-templates/populate-presets'
  
  return await fetchAPI(endpoint, {
    method: 'POST',
  })
}

/**
 * Create a new custom service template
 */
export async function createServiceTemplate(
  templateData: Omit<ServiceTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by_id' | 'usage_count' | 'popularity_score' | 'success_rate'>
): Promise<ServiceTemplate> {
  const endpoint = '/api/v1/service-templates'
  
  return await fetchAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify(templateData),
  })
}

/**
 * Search service templates by query string
 */
export async function searchServiceTemplates(
  query: string,
  filters?: ServiceTemplateFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceTemplateListResponse> {
  const searchFilters = {
    ...filters,
    search_query: query,
  }
  
  return await getServiceTemplates(searchFilters, page, pageSize)
}

/**
 * Get templates by specific Six Figure Barber tier
 */
export async function getTemplatesByTier(
  tier: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceTemplateListResponse> {
  const filters: ServiceTemplateFilters = {
    six_fb_tier: tier,
  }
  
  return await getServiceTemplates(filters, page, pageSize)
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(
  category: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceTemplateListResponse> {
  const filters: ServiceTemplateFilters = {
    category: category,
  }
  
  return await getServiceTemplates(filters, page, pageSize)
}

/**
 * Get templates with high methodology scores (6FB aligned)
 */
export async function getSixFBAlignedTemplates(
  minScore: number = 80,
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceTemplateListResponse> {
  const filters: ServiceTemplateFilters = {
    is_six_fb_certified: true,
  }
  
  return await getServiceTemplates(filters, page, pageSize)
}

/**
 * Get templates within a specific price range
 */
export async function getTemplatesByPriceRange(
  minPrice: number,
  maxPrice: number,
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceTemplateListResponse> {
  const filters: ServiceTemplateFilters = {
    min_price: minPrice,
    max_price: maxPrice,
  }
  
  return await getServiceTemplates(filters, page, pageSize)
}

/**
 * Get templates for specific target market
 */
export async function getTemplatesByTargetMarket(
  targetMarket: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceTemplateListResponse> {
  const filters: ServiceTemplateFilters = {
    target_market: targetMarket,
  }
  
  return await getServiceTemplates(filters, page, pageSize)
}

/**
 * Utility function to format template price for display
 */
export function formatTemplatePrice(template: ServiceTemplate): string {
  if (template.suggested_min_price === template.suggested_max_price) {
    return `$${template.suggested_base_price}`
  }
  
  return `$${template.suggested_min_price} - $${template.suggested_max_price}`
}

/**
 * Utility function to get methodology score color
 */
export function getMethodologyScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 80) return 'text-blue-600'
  if (score >= 70) return 'text-yellow-600'
  if (score >= 60) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Utility function to get tier color
 */
export function getTierColor(tier: string): string {
  switch (tier) {
    case 'starter': return 'bg-green-100 text-green-800'
    case 'professional': return 'bg-blue-100 text-blue-800'
    case 'premium': return 'bg-purple-100 text-purple-800'
    case 'luxury': return 'bg-amber-100 text-amber-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Utility function to get tier icon
 */
export function getTierIcon(tier: string): string {
  switch (tier) {
    case 'starter': return '🌱'
    case 'professional': return '⭐'
    case 'premium': return '💎'
    case 'luxury': return '👑'
    default: return '📋'
  }
}

export default {
  getServiceTemplates,
  getFeaturedServiceTemplates,
  getServiceTemplate,
  applyServiceTemplate,
  getUserAppliedTemplates,
  getSixFBTierSummary,
  populateSixFBPresets,
  createServiceTemplate,
  searchServiceTemplates,
  getTemplatesByTier,
  getTemplatesByCategory,
  getSixFBAlignedTemplates,
  getTemplatesByPriceRange,
  getTemplatesByTargetMarket,
  formatTemplatePrice,
  getMethodologyScoreColor,
  getTierColor,
  getTierIcon,
}
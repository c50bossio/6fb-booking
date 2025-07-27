/**
 * Six Figure Barber Methodology API Client
 * 
 * This module provides API client functions for the Six Figure Barber methodology
 * backend endpoints, supporting all five core principles with comprehensive
 * error handling and type safety.
 */

import { validateAPIRequest, validateAPIResponse, APIPerformanceMonitor, retryOperation } from './apiUtils'
import { toast } from '@/hooks/use-toast'
import { getEnhancedErrorMessage, formatErrorForToast, ErrorContext } from './error-messages'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RevenueMetrics {
  daily_revenue: number
  target_revenue: number
  variance_amount: number
  variance_percentage: number
  service_count: number
  client_count: number
  average_ticket: number
  upsell_revenue: number
  premium_service_percentage: number
  insights: Array<{ [key: string]: any }>
  optimization_opportunities: Array<{ [key: string]: any }>
}

export interface RevenueGoalProgress {
  goals_progress: Array<{ [key: string]: any }>
  overall_pace: number
  recommendations: Array<{ [key: string]: any }>
}

export interface RevenueGoalCreateRequest {
  goal_name: string
  target_annual_revenue: number
  start_date: string
  target_date: string
  sfb_principle_focus: string
}

export interface ClientValueProfile {
  client_id: number
  client_name: string
  value_tier: string
  lifetime_value: number
  total_visits: number
  average_ticket: number
  visit_frequency_days: number | null
  relationship_score: number
  loyalty_score: number
  churn_risk_score: number
  premium_service_adoption: number
  brand_alignment_score: number
  growth_potential: number
  insights: Array<{ [key: string]: any }>
  opportunities: Array<{ [key: string]: any }>
  recommended_actions: Array<{ [key: string]: any }>
}

export interface ClientJourney {
  client_id: number
  current_stage: string
  days_in_stage: number
  stage_entry_date: string
  journey_history: Array<{ [key: string]: any }>
  relationship_building_score: number
  next_milestone: { [key: string]: any }
  stage_recommendations: Array<{ [key: string]: any }>
}

export interface ClientValueTiers {
  tier_distribution: Array<{
    tier: string
    count: number
    average_value: number
  }>
  total_clients: number
  methodology_insights: string[]
}

export interface ServiceExcellenceRequest {
  appointment_id: number
  excellence_scores: { [key: string]: number }
}

export interface ServiceExcellenceResponse {
  appointment_id: number
  overall_excellence_score: number
  area_scores: Array<{ [key: string]: any }>
  meets_six_fb_standards: boolean
  improvement_recommendations: Array<{ [key: string]: any }>
  coaching_focus_areas: string[]
}

export interface ServiceExcellenceStandards {
  standards: Array<{
    id: number
    standard_name: string
    excellence_area: string
    minimum_score: number
    target_score: number
    excellence_score: number
    current_average_score: number
    compliance_rate: number
    trend_direction: string
    methodology_principle: string
  }>
  overall_compliance: number
  six_fb_methodology_adherence: number
}

export interface EfficiencyMetrics {
  date: string
  metrics: { [key: string]: { [key: string]: any } }
  overall_efficiency_score: number
  insights: Array<{ [key: string]: any }>
  opportunities: Array<{ [key: string]: any }>
  recommended_actions: Array<{ [key: string]: any }>
}

export interface EfficiencyTrends {
  period_start: string
  period_end: string
  trends: { [key: string]: Array<{ date: string; value: number; target?: number }> }
  overall_performance: { [key: string]: { 
    current_average: number
    trend_direction: string
    improvement_rate: number
  }}
  six_fb_insights: string[]
}

export interface GrowthMetrics {
  overall_growth_score: number
  monthly_revenue_growth: number
  client_base_growth: number
  active_development_plans: number
  growth_insights: Array<{ [key: string]: any }>
  development_recommendations: Array<{ [key: string]: any }>
  milestone_progress: { [key: string]: any }
}

export interface DevelopmentPlans {
  active_plans: Array<{
    id: number
    plan_name: string
    description: string
    methodology_focus: string
    start_date: string
    target_completion_date: string
    completion_percentage: number
    current_phase: string
    primary_goals: any
    milestones_achieved: any
    next_milestone: any
  }>
  overall_development_score: number
  six_fb_alignment: number
}

export interface MethodologyDashboard {
  overall_score: number
  revenue_optimization_score: number
  client_value_score: number
  service_excellence_score: number
  business_efficiency_score: number
  professional_growth_score: number
  key_insights: Array<{
    principle: string
    title: string
    description: string
    impact_score: number
    actionable: boolean
    priority: string
    estimated_revenue_impact: number | null
    implementation_effort: string | null
    timeline_days: number | null
  }>
  top_opportunities: Array<{ [key: string]: any }>
  critical_actions: Array<{ [key: string]: any }>
}

// ============================================================================
// API HELPER FUNCTIONS
// ============================================================================

async function getAuthHeaders(): Promise<HeadersInit> {
  // Check for token in the same way as the main auth system
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

async function handleApiRequest<T>(
  url: string,
  options: RequestInit = {},
  context: ErrorContext = {}
): Promise<T> {
  const endTiming = APIPerformanceMonitor.startTiming(url)
  
  try {
    const headers = await getAuthHeaders()
    const response = await retryOperation(
      () => fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers }
      }),
      { maxRetries: 3, baseDelay: 1000 }
    )

    endTiming()

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      const errorMessage = getEnhancedErrorMessage(response.status, errorData.detail, context)
      
      toast({
        variant: "destructive",
        ...formatErrorForToast(errorMessage, context)
      })
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    validateAPIResponse(data, url)
    return data

  } catch (error) {
    endTiming()
    APIPerformanceMonitor.recordError(url)
    
    if (error instanceof Error) {
      const errorMessage = getEnhancedErrorMessage(500, error.message, context)
      toast({
        variant: "destructive",
        ...formatErrorForToast(errorMessage, context)
      })
      throw error
    }
    
    throw new Error('An unexpected error occurred')
  }
}

// ============================================================================
// REVENUE OPTIMIZATION API FUNCTIONS
// ============================================================================

export async function getRevenueMetrics(targetDate?: string): Promise<RevenueMetrics> {
  const queryParams = targetDate ? `?target_date=${targetDate}` : ''
  return handleApiRequest<RevenueMetrics>(
    `${API_URL}/api/v2/six-figure-barber/revenue/metrics${queryParams}`,
    { method: 'GET' },
    { feature: 'Revenue Metrics', action: 'Get Daily Metrics' }
  )
}

export async function getRevenueGoalProgress(): Promise<RevenueGoalProgress> {
  return handleApiRequest<RevenueGoalProgress>(
    `${API_URL}/api/v2/six-figure-barber/revenue/goals/progress`,
    { method: 'GET' },
    { feature: 'Revenue Goals', action: 'Get Progress' }
  )
}

export async function createRevenueGoal(goalData: RevenueGoalCreateRequest): Promise<{ message: string; goal_id: number }> {
  validateAPIRequest(goalData, 'createRevenueGoal')
  
  return handleApiRequest<{ message: string; goal_id: number }>(
    `${API_URL}/api/v2/six-figure-barber/revenue/goals`,
    {
      method: 'POST',
      body: JSON.stringify(goalData)
    },
    { feature: 'Revenue Goals', action: 'Create Goal' }
  )
}

// ============================================================================
// CLIENT VALUE MAXIMIZATION API FUNCTIONS
// ============================================================================

export async function getClientValueProfile(clientId: number): Promise<ClientValueProfile> {
  return handleApiRequest<ClientValueProfile>(
    `${API_URL}/api/v2/six-figure-barber/clients/${clientId}/value-profile`,
    { method: 'GET' },
    { feature: 'Client Value', action: 'Get Profile', clientId }
  )
}

export async function getClientJourney(clientId: number): Promise<ClientJourney> {
  return handleApiRequest<ClientJourney>(
    `${API_URL}/api/v2/six-figure-barber/clients/${clientId}/journey`,
    { method: 'GET' },
    { feature: 'Client Journey', action: 'Get Journey', clientId }
  )
}

export async function getClientValueTiers(): Promise<ClientValueTiers> {
  return handleApiRequest<ClientValueTiers>(
    `${API_URL}/api/v2/six-figure-barber/clients/value-tiers`,
    { method: 'GET' },
    { feature: 'Client Value Tiers', action: 'Get Distribution' }
  )
}

// ============================================================================
// SERVICE EXCELLENCE API FUNCTIONS
// ============================================================================

export async function trackServiceExcellence(excellenceData: ServiceExcellenceRequest): Promise<ServiceExcellenceResponse> {
  validateAPIRequest(excellenceData, 'trackServiceExcellence')
  
  return handleApiRequest<ServiceExcellenceResponse>(
    `${API_URL}/api/v2/six-figure-barber/service-excellence/track`,
    {
      method: 'POST',
      body: JSON.stringify(excellenceData)
    },
    { feature: 'Service Excellence', action: 'Track Performance' }
  )
}

export async function getServiceExcellenceStandards(): Promise<ServiceExcellenceStandards> {
  return handleApiRequest<ServiceExcellenceStandards>(
    `${API_URL}/api/v2/six-figure-barber/service-excellence/standards`,
    { method: 'GET' },
    { feature: 'Service Excellence', action: 'Get Standards' }
  )
}

// ============================================================================
// BUSINESS EFFICIENCY API FUNCTIONS
// ============================================================================

export async function getEfficiencyMetrics(targetDate?: string): Promise<EfficiencyMetrics> {
  const queryParams = targetDate ? `?target_date=${targetDate}` : ''
  return handleApiRequest<EfficiencyMetrics>(
    `${API_URL}/api/v2/six-figure-barber/efficiency/metrics${queryParams}`,
    { method: 'GET' },
    { feature: 'Efficiency Metrics', action: 'Get Daily Metrics' }
  )
}

export async function getEfficiencyTrends(days: number = 30): Promise<EfficiencyTrends> {
  return handleApiRequest<EfficiencyTrends>(
    `${API_URL}/api/v2/six-figure-barber/efficiency/trends?days=${days}`,
    { method: 'GET' },
    { feature: 'Efficiency Trends', action: 'Get Trend Analysis' }
  )
}

// ============================================================================
// PROFESSIONAL GROWTH API FUNCTIONS
// ============================================================================

export async function getGrowthMetrics(): Promise<GrowthMetrics> {
  return handleApiRequest<GrowthMetrics>(
    `${API_URL}/api/v2/six-figure-barber/growth/metrics`,
    { method: 'GET' },
    { feature: 'Growth Metrics', action: 'Get Progress' }
  )
}

export async function getDevelopmentPlans(): Promise<DevelopmentPlans> {
  return handleApiRequest<DevelopmentPlans>(
    `${API_URL}/api/v2/six-figure-barber/growth/development-plans`,
    { method: 'GET' },
    { feature: 'Development Plans', action: 'Get Active Plans' }
  )
}

// ============================================================================
// COMPREHENSIVE DASHBOARD API FUNCTION
// ============================================================================

export async function getMethodologyDashboard(): Promise<MethodologyDashboard> {
  return handleApiRequest<MethodologyDashboard>(
    `${API_URL}/api/v2/six-figure-barber/dashboard`,
    { method: 'GET' },
    { feature: 'Six Figure Barber Dashboard', action: 'Get Complete Overview' }
  )
}

// ============================================================================
// HEALTH CHECK API FUNCTION
// ============================================================================

export async function getSixFigureBarberHealth(): Promise<{
  status: string
  service: string
  version: string
  principles_supported: string[]
  features: string[]
}> {
  return handleApiRequest(
    `${API_URL}/api/v2/six-figure-barber/health`,
    { method: 'GET' },
    { feature: 'Health Check', action: 'Service Status' }
  )
}
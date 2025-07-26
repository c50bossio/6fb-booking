/**
 * Franchise Network Management API Client
 * 
 * This module provides type-safe API client functions for franchise network operations,
 * supporting the hierarchical structure of Networks > Regions > Groups > Locations.
 */

import type { 
  FranchiseNetwork, 
  FranchiseRegion, 
  FranchiseGroup, 
  FranchiseLocation 
} from '@/components/navigation/FranchiseHierarchySelector'

// Base API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v2'

// API Response types
export interface FranchiseAPIResponse<T> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_next: boolean
  has_prev: boolean
}

// Dashboard data types
export interface FranchiseNetworkDashboard {
  network_summary: {
    network_id: number
    total_regions: number
    total_groups: number
    total_locations: number
    network_revenue_ytd: number
    target_vs_actual_locations: {
      target: number
      actual: number
      percentage: number
    }
    compliance_status: {
      overall_score: number
      critical_issues: number
      pending_reviews: number
    }
    growth_metrics: {
      revenue_growth: number
      location_growth: number
      market_penetration: number
    }
  }
  regional_performance: Array<{
    region_id: number
    name: string
    code: string
    performance_score: number
    revenue: number
    locations_count: number
    compliance_score: number
    growth_rate: number
    alerts_count: number
  }>
  alerts: Array<{
    id: string
    type: 'compliance' | 'performance' | 'operational' | 'financial'
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    message: string
    entity_type: 'network' | 'region' | 'group' | 'location'
    entity_id: number
    entity_name: string
    created_at: string
    requires_action: boolean
  }>
  real_time_metrics: {
    active_bookings: number
    staff_online: number
    revenue_today: number
    customer_satisfaction: number
  }
  forecasts?: {
    revenue_forecast_6m: number[]
    location_expansion_timeline: { date: string; count: number }[]
    market_opportunities: { region: string; potential: number }[]
  }
  last_updated: string
}

export interface FranchiseRegionDashboard {
  region_summary: {
    region_id: number
    total_groups: number
    total_locations: number
    current_vs_target_locations: {
      current: number
      target: number
      percentage: number
    }
    revenue_ytd: number
    revenue_growth: number
    market_penetration: number
    compliance_score: number
    development_timeline: {
      planned_openings: number
      under_construction: number
      in_planning: number
    }
  }
  market_analysis: {
    primary_markets: string[]
    demographics: {
      population: number
      median_income: number
      target_demographic_percentage: number
    }
    competition: {
      direct_competitors: number
      market_share_estimate: number
      competitive_advantage_score: number
    }
    market_opportunities: {
      underserved_areas: number
      expansion_potential: number
      recommended_locations: number
    }
  }
  group_performance: Array<{
    group_id: number
    name: string
    code: string
    group_type: string
    locations_count: number
    revenue: number
    performance_score: number
    compliance_score: number
    growth_rate: number
    development_stage: 'operational' | 'developing' | 'planning'
    key_metrics: {
      average_revenue_per_location: number
      client_satisfaction: number
      staff_retention: number
    }
  }>
  compliance_tracking: {
    overall_score: number
    jurisdiction_compliance: Array<{
      jurisdiction: string
      score: number
      issues_count: number
      last_audit: string
    }>
    critical_requirements: Array<{
      requirement: string
      status: 'compliant' | 'non_compliant' | 'pending'
      due_date?: string
    }>
    upcoming_audits: Array<{
      audit_type: string
      scheduled_date: string
      locations_affected: number
    }>
  }
  development_pipeline: {
    pipeline_locations: Array<{
      name: string
      stage: string
      expected_opening: string
      investment: number
    }>
    quarterly_targets: Array<{
      quarter: string
      target_openings: number
      projected_revenue: number
    }>
  }
  regional_training: {
    programs_active: number
    completion_rate: number
    next_session: string
  }
}

// Utility function for making API requests
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  const response = await fetch(url, { ...defaultOptions, ...options })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

// Franchise Networks API
export const franchiseNetworksAPI = {
  /**
   * List all franchise networks
   */
  async list(params?: {
    status?: string
    network_type?: string
    include_metrics?: boolean
  }): Promise<FranchiseNetwork[]> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    return apiRequest<FranchiseNetwork[]>(
      `/franchise/networks?${searchParams.toString()}`
    )
  },

  /**
   * Get a specific franchise network
   */
  async get(networkId: number, includeHierarchy = false): Promise<FranchiseNetwork> {
    return apiRequest<FranchiseNetwork>(
      `/franchise/networks/${networkId}?include_hierarchy=${includeHierarchy}`
    )
  },

  /**
   * Create a new franchise network (super admin only)
   */
  async create(networkData: Omit<FranchiseNetwork, 'id'>): Promise<FranchiseNetwork> {
    return apiRequest<FranchiseNetwork>('/franchise/networks', {
      method: 'POST',
      body: JSON.stringify(networkData),
    })
  },

  /**
   * Update a franchise network
   */
  async update(networkId: number, updates: Partial<FranchiseNetwork>): Promise<FranchiseNetwork> {
    return apiRequest<FranchiseNetwork>(`/franchise/networks/${networkId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Get franchise network dashboard
   */
  async getDashboard(
    networkId: number, 
    params?: {
      date_range_days?: number
      include_forecasts?: boolean
    }
  ): Promise<FranchiseNetworkDashboard> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    return apiRequest<FranchiseNetworkDashboard>(
      `/franchise/networks/${networkId}/dashboard?${searchParams.toString()}`
    )
  }
}

// Franchise Regions API
export const franchiseRegionsAPI = {
  /**
   * List regions for a network
   */
  async list(
    networkId: number,
    params?: {
      status?: string
      include_metrics?: boolean
    }
  ): Promise<FranchiseRegion[]> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    return apiRequest<FranchiseRegion[]>(
      `/franchise/networks/${networkId}/regions?${searchParams.toString()}`
    )
  },

  /**
   * Create a new region
   */
  async create(
    networkId: number, 
    regionData: Omit<FranchiseRegion, 'id' | 'network_id'>
  ): Promise<FranchiseRegion> {
    return apiRequest<FranchiseRegion>(`/franchise/networks/${networkId}/regions`, {
      method: 'POST',
      body: JSON.stringify(regionData),
    })
  },

  /**
   * Get region dashboard
   */
  async getDashboard(
    regionId: number,
    params?: {
      date_range_days?: number
      include_market_analysis?: boolean
      include_compliance?: boolean
    }
  ): Promise<FranchiseRegionDashboard> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    return apiRequest<FranchiseRegionDashboard>(
      `/franchise/regions/${regionId}/dashboard?${searchParams.toString()}`
    )
  }
}

// Franchise Groups API
export const franchiseGroupsAPI = {
  /**
   * List groups for a region
   */
  async list(
    regionId: number,
    params?: {
      status?: string
      group_type?: string
      include_metrics?: boolean
    }
  ): Promise<FranchiseGroup[]> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    
    return apiRequest<FranchiseGroup[]>(
      `/franchise/regions/${regionId}/groups?${searchParams.toString()}`
    )
  },

  /**
   * Create a new group
   */
  async create(
    regionId: number, 
    groupData: Omit<FranchiseGroup, 'id' | 'region_id'>
  ): Promise<FranchiseGroup> {
    return apiRequest<FranchiseGroup>(`/franchise/regions/${regionId}/groups`, {
      method: 'POST',
      body: JSON.stringify(groupData),
    })
  }
}

// Analytics and Reporting API
export const franchiseAnalyticsAPI = {
  /**
   * Query franchise analytics with flexible filtering
   */
  async query(filter: {
    entity_type?: 'network' | 'region' | 'group' | 'location'
    entity_ids?: number[]
    period_type?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    date_range_start?: string
    date_range_end?: string
    include_benchmarks?: boolean
  }): Promise<any[]> {
    return apiRequest('/franchise/analytics/query', {
      method: 'POST',
      body: JSON.stringify(filter),
    })
  },

  /**
   * Perform benchmarking analysis
   */
  async benchmarking(request: {
    primary_entity_type: 'network' | 'region' | 'group' | 'location'
    primary_entity_id: number
    comparison_entity_ids?: number[]
    benchmark_type: 'peer' | 'industry' | 'historical'
    metrics: string[]
    time_period: string
    normalize_by_size?: boolean
  }): Promise<any> {
    return apiRequest('/franchise/benchmarking', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  /**
   * Get cross-network performance comparison
   */
  async crossNetworkPerformance(params?: {
    network_ids?: number[]
    metrics?: string[]
    date_range_days?: number
  }): Promise<Record<string, any>> {
    const searchParams = new URLSearchParams()
    if (params) {
      if (params.network_ids) {
        params.network_ids.forEach(id => searchParams.append('network_ids', String(id)))
      }
      if (params.metrics) {
        params.metrics.forEach(metric => searchParams.append('metrics', metric))
      }
      if (params.date_range_days) {
        searchParams.append('date_range_days', String(params.date_range_days))
      }
    }
    
    return apiRequest<Record<string, any>>(
      `/franchise/cross-network/performance?${searchParams.toString()}`
    )
  }
}

// Health and Status API
export const franchiseHealthAPI = {
  /**
   * Check franchise API health
   */
  async health(): Promise<{
    status: string
    timestamp: string
    database_connected: boolean
    franchise_networks_count: number
    api_version: string
    features: string[]
  }> {
    return apiRequest('/franchise/health')
  }
}

// WebSocket connection for real-time updates
export class FranchiseWebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(
    private url: string,
    private onMessage: (data: any) => void,
    private onError?: (error: Event) => void
  ) {}

  connect(): void {
    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('🔗 Franchise WebSocket connected')
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.onMessage(data)
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('🔌 Franchise WebSocket disconnected')
        this.reconnect()
      }

      this.ws.onerror = (error) => {
        console.error('❌ Franchise WebSocket error:', error)
        this.onError?.(error)
      }
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error)
      this.reconnect()
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error('❌ Max WebSocket reconnection attempts reached')
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message')
    }
  }
}

// Convenience function to create WebSocket connections
export function createFranchiseWebSocket(
  type: 'hierarchy' | 'network' | 'region' | 'group',
  entityId?: number,
  onMessage?: (data: any) => void,
  onError?: (error: Event) => void
): FranchiseWebSocketClient {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
  
  let endpoint = ''
  switch (type) {
    case 'hierarchy':
      endpoint = '/ws/franchise/hierarchy'
      break
    case 'network':
      endpoint = `/ws/franchise/network/${entityId}/dashboard`
      break
    case 'region':
      endpoint = `/ws/franchise/region/${entityId}/dashboard`
      break
    case 'group':
      endpoint = `/ws/franchise/group/${entityId}/dashboard`
      break
  }

  return new FranchiseWebSocketClient(
    `${wsUrl}${endpoint}`,
    onMessage || (() => {}),
    onError
  )
}

// Error handling utilities
export class FranchiseAPIError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'FranchiseAPIError'
  }
}

export function handleFranchiseAPIError(error: unknown): FranchiseAPIError {
  if (error instanceof FranchiseAPIError) {
    return error
  }
  
  if (error instanceof Error) {
    return new FranchiseAPIError(error.message)
  }
  
  return new FranchiseAPIError('An unknown error occurred')
}

// Type guards for runtime type checking
export function isFranchiseNetwork(obj: any): obj is FranchiseNetwork {
  return obj && typeof obj.id === 'number' && typeof obj.name === 'string' && typeof obj.brand === 'string'
}

export function isFranchiseRegion(obj: any): obj is FranchiseRegion {
  return obj && typeof obj.id === 'number' && typeof obj.network_id === 'number' && typeof obj.name === 'string'
}

export function isFranchiseGroup(obj: any): obj is FranchiseGroup {
  return obj && typeof obj.id === 'number' && typeof obj.region_id === 'number' && typeof obj.name === 'string'
}

export function isFranchiseLocation(obj: any): obj is FranchiseLocation {
  return obj && typeof obj.id === 'number' && typeof obj.name === 'string'
}
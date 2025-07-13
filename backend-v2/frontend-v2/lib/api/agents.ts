/**
 * AI Agents API Client
 * 
 * Provides comprehensive AI agent management functionality including:
 * - Agent template management
 * - Agent instance creation and lifecycle management
 * - Agent conversation handling
 * - Agent analytics and monitoring
 * - AI provider integration and cost estimation
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ===============================
// TypeScript Interfaces
// ===============================

export type AgentType = 
  | 'booking_assistant'
  | 'customer_service'
  | 'marketing_assistant'
  | 'analytics_assistant'
  | 'sales_assistant'
  | 'retention_specialist'

export type AgentStatus = 
  | 'active'
  | 'paused'
  | 'stopped'
  | 'error'
  | 'maintenance'

export type ConversationStatus = 
  | 'active'
  | 'paused'
  | 'completed'
  | 'error'

export interface AgentTemplate {
  agent_type: AgentType
  name: string
  description: string
  capabilities: string[]
  configuration: Record<string, any>
  required_permissions: string[]
  estimated_cost_per_month: number
}

export interface AgentCreate {
  name: string
  agent_type: AgentType
  description?: string
  configuration?: Record<string, any>
  is_active?: boolean
}

export interface Agent {
  id: number
  name: string
  agent_type: AgentType
  description?: string
  configuration: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
  created_by_id: number
}

export interface AgentResponse {
  agent: Agent
  message?: string
}

export interface AgentInstanceCreate {
  agent_id: number
  name: string
  configuration?: Record<string, any>
  auto_start?: boolean
}

export interface AgentInstanceUpdate {
  name?: string
  configuration?: Record<string, any>
  status?: AgentStatus
}

export interface AgentInstance {
  id: number
  agent_id: number
  name: string
  status: AgentStatus
  configuration: Record<string, any>
  last_activity?: string
  total_conversations: number
  total_messages: number
  uptime_percentage: number
  created_at: string
  updated_at: string
  user_id: number
}

export interface AgentInstanceResponse {
  instance: AgentInstance
  message?: string
}

export interface Conversation {
  id: string
  instance_id: number
  status: ConversationStatus
  participant_type: string
  participant_id?: number
  context: Record<string, any>
  message_count: number
  started_at: string
  last_message_at?: string
  ended_at?: string
}

export interface ConversationResponse {
  conversation: Conversation
  messages?: ConversationMessage[]
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_type: 'user' | 'agent' | 'system'
  sender_id?: number
  content: string
  metadata?: Record<string, any>
  timestamp: string
}

export interface SendMessageRequest {
  content: string
  message_type?: string
  metadata?: Record<string, any>
}

// Enhanced interfaces for business intelligence analytics
export interface OptimizationRecommendation {
  type: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  potential_impact: string
}

export interface CompetitiveBenchmarks {
  industry_averages: {
    success_rate: number
    avg_response_time: number
    roi: number
    engagement_rate: number
  }
  top_quartile: {
    success_rate: number
    avg_response_time: number
    roi: number
    engagement_rate: number
  }
  your_performance_vs_industry: string
}

export interface CurrentPeriodPerformance {
  today_conversations: number
  today_revenue: number
  active_conversations: number
  agents_running: number
}

export interface ConversationTrend {
  date: string
  conversations: number
  revenue: number
  conversion_rate: number
}

export interface TopPerformingAgent {
  name: string
  revenue: number
  conversion_rate: number
  conversations?: number
  agent_type?: AgentType
  performance_score?: number
}

export interface AgentAnalytics {
  // Core metrics
  total_agents: number
  active_instances: number
  total_conversations: number
  total_messages: number
  average_response_time: number
  success_rate: number
  total_revenue: number
  roi: number
  
  // Enhanced business intelligence
  optimization_recommendations: OptimizationRecommendation[]
  competitive_benchmarks: CompetitiveBenchmarks
  current_period_performance: CurrentPeriodPerformance
  revenue_by_agent_type: Record<string, number>
  conversation_trends: ConversationTrend[]
  top_performing_agents: TopPerformingAgent[]
  
  // Cost analysis
  cost_summary: {
    total_cost: number
    cost_by_provider: Record<string, number>
    cost_by_agent_type: Record<string, number>
  }
  
  // Legacy usage trends (maintained for backward compatibility)
  usage_trends: Array<{
    date: string
    conversations: number
    messages: number
    cost: number
  }>
  
  // Metadata
  date_range: {
    start: string
    end: string
    days: number
  }
  last_updated: string
}

export interface InstanceAnalytics {
  instance: AgentInstance
  performance_metrics: {
    total_conversations: number
    total_messages: number
    average_response_time: number
    success_rate: number
    uptime_percentage: number
  }
  cost_metrics: {
    total_cost: number
    average_cost_per_conversation: number
    cost_breakdown: Record<string, number>
  }
  usage_patterns: Array<{
    hour: number
    conversation_count: number
    message_count: number
  }>
}

export interface SubscriptionCreate {
  plan: string
  billing_cycle: 'monthly' | 'yearly'
  max_agents?: number
  max_conversations_per_month?: number
}

export interface SubscriptionUpdate {
  plan?: string
  billing_cycle?: 'monthly' | 'yearly'
  max_agents?: number
  max_conversations_per_month?: number
  auto_renew?: boolean
}

export interface Subscription {
  id: number
  user_id: number
  plan: string
  billing_cycle: string
  max_agents: number
  max_conversations_per_month: number
  current_usage: {
    agents_count: number
    conversations_this_month: number
  }
  is_active: boolean
  auto_renew: boolean
  next_billing_date: string
  created_at: string
  updated_at: string
}

export interface SubscriptionResponse {
  subscription: Subscription
  message?: string
}

export interface AIProvider {
  name: string
  models: string[]
  capabilities: string[]
  pricing: Record<string, number>
  is_available: boolean
}

export interface CostEstimateRequest {
  agent_type: AgentType
  expected_conversations_per_month: number
  average_messages_per_conversation: number
  provider?: string
  model?: string
}

export interface CostEstimate {
  estimated_monthly_cost: number
  cost_breakdown: {
    input_tokens: number
    output_tokens: number
    function_calls: number
    total: number
  }
  provider: string
  model: string
  assumptions: string[]
}

export interface AgentFilters {
  is_active?: boolean
  agent_type?: AgentType
  limit?: number
  offset?: number
}

export interface InstanceFilters {
  status?: AgentStatus
  agent_id?: number
  limit?: number
  offset?: number
}

export interface ConversationFilters {
  instance_id?: number
  status?: ConversationStatus
  participant_type?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

// ===============================
// Utility Functions
// ===============================

/**
 * Get authorization headers with current JWT token
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

/**
 * Handle API response and extract data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(errorData.detail || `Request failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : ''
}

// ===============================
// AI Agents API Client
// ===============================

export const agentsApi = {
  // ===============================
  // Agent Templates
  // ===============================

  /**
   * Get all available agent templates
   */
  async getAgentTemplates(): Promise<AgentTemplate[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/templates`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Get specific agent template by type
   */
  async getAgentTemplate(agentType: AgentType): Promise<AgentTemplate> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/templates/${agentType}`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Agent Management
  // ===============================

  /**
   * Create a new agent
   */
  async createAgent(agentData: AgentCreate): Promise<AgentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(agentData)
    })

    return handleResponse(response)
  },

  /**
   * Get list of agents with optional filtering
   */
  async getAgents(filters: AgentFilters = {}): Promise<Agent[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/agents/${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get specific agent by ID
   */
  async getAgent(agentId: number): Promise<AgentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/${agentId}`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Agent Instances (The actual running agents)
  // ===============================

  /**
   * Create and potentially start an agent instance
   */
  async createAgentInstance(instanceData: AgentInstanceCreate): Promise<AgentInstanceResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/instances`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(instanceData)
    })

    return handleResponse(response)
  },

  /**
   * Get list of agent instances with optional filtering
   */
  async getAgentInstances(filters: InstanceFilters = {}): Promise<AgentInstance[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/agents/instances${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get specific agent instance by ID
   */
  async getAgentInstance(instanceId: number): Promise<AgentInstanceResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/instances/${instanceId}`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Update agent instance configuration
   */
  async updateAgentInstance(
    instanceId: number, 
    updates: AgentInstanceUpdate
  ): Promise<AgentInstanceResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/instances/${instanceId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    })

    return handleResponse(response)
  },

  /**
   * Activate/start an agent instance
   */
  async activateAgentInstance(instanceId: number): Promise<AgentInstanceResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/agents/instances/${instanceId}/activate`,
      {
        method: 'POST',
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Pause an agent instance
   */
  async pauseAgentInstance(instanceId: number): Promise<AgentInstanceResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/agents/instances/${instanceId}/pause`,
      {
        method: 'POST',
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Delete an agent instance
   */
  async deleteAgentInstance(instanceId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/instances/${instanceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Conversations
  // ===============================

  /**
   * Get list of conversations with optional filtering
   */
  async getConversations(filters: ConversationFilters = {}): Promise<Conversation[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/agents/conversations${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get specific conversation with messages
   */
  async getConversation(conversationId: string): Promise<ConversationResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/agents/conversations/${conversationId}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Send a message to a conversation
   */
  async sendConversationMessage(
    conversationId: string, 
    message: SendMessageRequest
  ): Promise<ConversationMessage> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/agents/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(message)
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Analytics
  // ===============================

  /**
   * Get comprehensive agent analytics with business intelligence
   */
  async getAgentAnalytics(
    startDate?: string, 
    endDate?: string
  ): Promise<AgentAnalytics> {
    try {
      const params = {
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/agents/analytics${buildQueryString(params)}`,
        {
          headers: getAuthHeaders()
        }
      )

      if (!response.ok) {
        throw new Error(`Analytics API failed with status ${response.status}`)
      }

      const data = await response.json()
      
      // Validate that we have the expected structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid analytics data received from API')
      }

      // Ensure all required fields have fallback values for type safety
      const analytics: AgentAnalytics = {
        // Core metrics with defaults
        total_agents: data.total_agents ?? 0,
        active_instances: data.active_instances ?? 0,
        total_conversations: data.total_conversations ?? 0,
        total_messages: data.total_messages ?? 0,
        average_response_time: data.average_response_time ?? data.avg_response_time ?? 0,
        success_rate: data.success_rate ?? 0,
        total_revenue: data.total_revenue ?? 0,
        roi: data.roi ?? 0,
        
        // Business intelligence with fallbacks
        optimization_recommendations: data.optimization_recommendations ?? [],
        competitive_benchmarks: data.competitive_benchmarks ?? {
          industry_averages: { success_rate: 0, avg_response_time: 0, roi: 0, engagement_rate: 0 },
          top_quartile: { success_rate: 0, avg_response_time: 0, roi: 0, engagement_rate: 0 },
          your_performance_vs_industry: 'unknown'
        },
        current_period_performance: data.current_period_performance ?? {
          today_conversations: 0,
          today_revenue: 0,
          active_conversations: 0,
          agents_running: 0
        },
        revenue_by_agent_type: data.revenue_by_agent_type ?? {},
        conversation_trends: data.conversation_trends ?? [],
        top_performing_agents: data.top_performing_agents ?? [],
        
        // Cost analysis
        cost_summary: data.cost_summary ?? {
          total_cost: 0,
          cost_by_provider: {},
          cost_by_agent_type: {}
        },
        
        // Legacy compatibility
        usage_trends: data.usage_trends ?? [],
        
        // Metadata
        date_range: data.date_range ?? {
          start: startDate ?? '',
          end: endDate ?? '',
          days: 0
        },
        last_updated: data.last_updated ?? new Date().toISOString()
      }

      return analytics
      
    } catch (error) {
      console.error('Error fetching agent analytics:', error)
      
      // Return fallback analytics to prevent UI breakage
      return {
        total_agents: 0,
        active_instances: 0,
        total_conversations: 0,
        total_messages: 0,
        average_response_time: 0,
        success_rate: 0,
        total_revenue: 0,
        roi: 0,
        optimization_recommendations: [],
        competitive_benchmarks: {
          industry_averages: { success_rate: 0, avg_response_time: 0, roi: 0, engagement_rate: 0 },
          top_quartile: { success_rate: 0, avg_response_time: 0, roi: 0, engagement_rate: 0 },
          your_performance_vs_industry: 'unknown'
        },
        current_period_performance: {
          today_conversations: 0,
          today_revenue: 0,
          active_conversations: 0,
          agents_running: 0
        },
        revenue_by_agent_type: {},
        conversation_trends: [],
        top_performing_agents: [],
        cost_summary: {
          total_cost: 0,
          cost_by_provider: {},
          cost_by_agent_type: {}
        },
        usage_trends: [],
        date_range: {
          start: startDate ?? '',
          end: endDate ?? '',
          days: 0
        },
        last_updated: new Date().toISOString()
      }
    }
  },

  /**
   * Get analytics for specific agent instance
   */
  async getInstanceAnalytics(
    instanceId: number,
    startDate?: string,
    endDate?: string
  ): Promise<InstanceAnalytics> {
    const params = {
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate })
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/agents/instances/${instanceId}/analytics${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Subscription Management
  // ===============================

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<SubscriptionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/subscription`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Create or update subscription
   */
  async createSubscription(subscriptionData: SubscriptionCreate): Promise<SubscriptionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/subscription`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(subscriptionData)
    })

    return handleResponse(response)
  },

  // ===============================
  // AI Providers
  // ===============================

  /**
   * Get available AI providers and their capabilities
   */
  async getAIProviders(): Promise<AIProvider[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/providers`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Estimate cost for agent configuration
   */
  async estimateCost(request: CostEstimateRequest): Promise<CostEstimate> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/providers/estimate-cost`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request)
    })

    return handleResponse(response)
  },

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Get status display text for agent instances
   */
  getStatusDisplay(status: AgentStatus): string {
    const statusMap: Record<AgentStatus, string> = {
      'active': 'Active',
      'paused': 'Paused', 
      'stopped': 'Stopped',
      'error': 'Error',
      'maintenance': 'Maintenance'
    }
    
    return statusMap[status] || status
  },

  /**
   * Get status color for UI display
   */
  getStatusColor(status: AgentStatus): string {
    const colorMap: Record<AgentStatus, string> = {
      'active': 'green',
      'paused': 'yellow',
      'stopped': 'gray',
      'error': 'red',
      'maintenance': 'blue'
    }
    
    return colorMap[status] || 'gray'
  },

  /**
   * Check if agent instance can be activated
   */
  canActivate(instance: AgentInstance): boolean {
    return ['paused', 'stopped'].includes(instance.status)
  },

  /**
   * Check if agent instance can be paused
   */
  canPause(instance: AgentInstance): boolean {
    return instance.status === 'active'
  },

  /**
   * Check if agent instance can be deleted
   */
  canDelete(instance: AgentInstance): boolean {
    return ['stopped', 'error'].includes(instance.status)
  },

  /**
   * Format uptime percentage for display
   */
  formatUptime(uptimePercentage: number): string {
    return `${uptimePercentage.toFixed(1)}%`
  },

  /**
   * Calculate estimated monthly cost based on usage
   */
  calculateMonthlyCost(
    conversationsPerMonth: number,
    avgMessagesPerConversation: number,
    costPerMessage: number
  ): number {
    return conversationsPerMonth * avgMessagesPerConversation * costPerMessage
  },

  /**
   * Get agent type display name
   */
  getAgentTypeDisplay(agentType: AgentType): string {
    const typeMap: Record<AgentType, string> = {
      'booking_assistant': 'Booking Assistant',
      'customer_service': 'Customer Service',
      'marketing_assistant': 'Marketing Assistant',
      'analytics_assistant': 'Analytics Assistant',
      'sales_assistant': 'Sales Assistant',
      'retention_specialist': 'Retention Specialist'
    }
    
    return typeMap[agentType] || agentType
  },

  /**
   * Quick agent template picker for common use cases
   */
  getRecommendedTemplate(useCase: string): AgentType {
    const useCaseMap: Record<string, AgentType> = {
      'handle_bookings': 'booking_assistant',
      'answer_questions': 'customer_service',
      'promote_services': 'marketing_assistant',
      'analyze_data': 'analytics_assistant',
      'increase_sales': 'sales_assistant',
      'retain_clients': 'retention_specialist'
    }
    
    return useCaseMap[useCase] || 'customer_service'
  },

  // ===============================
  // Business Intelligence Utilities
  // ===============================

  /**
   * Get priority color for optimization recommendations
   */
  getRecommendationPriorityColor(priority: OptimizationRecommendation['priority']): string {
    const colorMap = {
      'high': 'red',
      'medium': 'yellow',
      'low': 'blue'
    }
    return colorMap[priority] || 'gray'
  },

  /**
   * Format revenue for display
   */
  formatRevenue(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  },

  /**
   * Format percentage for display
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
  },

  /**
   * Format response time for display
   */
  formatResponseTime(timeInSeconds: number): string {
    if (timeInSeconds < 60) {
      return `${timeInSeconds.toFixed(1)}s`
    }
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = timeInSeconds % 60
    return `${minutes}m ${seconds.toFixed(0)}s`
  },

  /**
   * Get performance indicator for benchmarking
   */
  getPerformanceIndicator(
    yourValue: number, 
    industryAverage: number, 
    topQuartile: number
  ): 'excellent' | 'above_average' | 'average' | 'below_average' {
    if (yourValue >= topQuartile) return 'excellent'
    if (yourValue >= industryAverage) return 'above_average'
    if (yourValue >= industryAverage * 0.8) return 'average'
    return 'below_average'
  },

  /**
   * Calculate total revenue from revenue breakdown
   */
  calculateTotalRevenue(revenueByType: Record<string, number>): number {
    return Object.values(revenueByType).reduce((sum, value) => sum + value, 0)
  },

  /**
   * Get top performing agent types
   */
  getTopPerformingTypes(
    revenueByType: Record<string, number>, 
    limit: number = 3
  ): Array<{type: string, revenue: number, percentage: number}> {
    const total = this.calculateTotalRevenue(revenueByType)
    if (total === 0) return []

    return Object.entries(revenueByType)
      .map(([type, revenue]) => ({
        type,
        revenue,
        percentage: (revenue / total) * 100
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
  },

  /**
   * Validate analytics data structure
   */
  validateAnalyticsData(data: any): boolean {
    try {
      // Check required top-level fields
      const requiredFields = [
        'total_agents', 'total_conversations', 'success_rate',
        'optimization_recommendations', 'competitive_benchmarks',
        'current_period_performance'
      ]
      
      for (const field of requiredFields) {
        if (!(field in data)) {
          console.warn(`Missing required field: ${field}`)
          return false
        }
      }

      // Validate array fields
      if (!Array.isArray(data.optimization_recommendations)) {
        console.warn('optimization_recommendations is not an array')
        return false
      }

      if (!Array.isArray(data.conversation_trends)) {
        console.warn('conversation_trends is not an array')
        return false
      }

      if (!Array.isArray(data.top_performing_agents)) {
        console.warn('top_performing_agents is not an array')
        return false
      }

      // Validate nested objects
      if (!data.competitive_benchmarks.industry_averages || !data.competitive_benchmarks.top_quartile) {
        console.warn('Invalid competitive_benchmarks structure')
        return false
      }

      return true
    } catch (error) {
      console.error('Error validating analytics data:', error)
      return false
    }
  },

  /**
   * Get analytics summary for quick overview
   */
  getAnalyticsSummary(analytics: AgentAnalytics): {
    totalRevenue: string
    conversionRate: string
    responseTime: string
    agentCount: number
    activeConversations: number
    performanceStatus: string
  } {
    const industryAvg = analytics.competitive_benchmarks.industry_averages
    const performanceStatus = this.getPerformanceIndicator(
      analytics.success_rate,
      industryAvg.success_rate,
      analytics.competitive_benchmarks.top_quartile.success_rate
    )

    return {
      totalRevenue: this.formatRevenue(analytics.total_revenue),
      conversionRate: this.formatPercentage(analytics.success_rate),
      responseTime: this.formatResponseTime(analytics.average_response_time),
      agentCount: analytics.total_agents,
      activeConversations: analytics.current_period_performance.active_conversations,
      performanceStatus
    }
  }
}

export default agentsApi
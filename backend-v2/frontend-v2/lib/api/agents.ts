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

export interface AgentAnalytics {
  total_agents: number
  active_instances: number
  total_conversations: number
  total_messages: number
  average_response_time: number
  success_rate: number
  cost_summary: {
    total_cost: number
    cost_by_provider: Record<string, number>
    cost_by_agent_type: Record<string, number>
  }
  usage_trends: Array<{
    date: string
    conversations: number
    messages: number
    cost: number
  }>
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
   * Get overall agent analytics
   */
  async getAgentAnalytics(
    startDate?: string, 
    endDate?: string
  ): Promise<AgentAnalytics> {
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

    return handleResponse(response)
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
  }
}

export default agentsApi
/**
 * Six Figure Barber CRM API Client
 * 
 * TypeScript client for interacting with the Six Figure Barber CRM API.
 * Provides type-safe methods for all CRM operations including:
 * - Client scoring and analytics
 * - Communication tracking
 * - Journey management
 * - Automated workflows
 * - Retention campaigns
 */

// Base API configuration
const API_BASE_URL = '/api/v2/six-figure-barber/crm';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API request failed: ${response.status}`);
  }

  return response.json();
}

// Types
export interface ClientScore {
  client_id: number;
  relationship_score: number;
  engagement_score: number;
  value_score: number;
  consistency_score: number;
  growth_potential: number;
  overall_score: number;
  score_updated_at: string;
}

export interface TierProgression {
  client_id: number;
  current_tier: string;
  recommended_tier: string;
  progression_score: number;
  requirements_met: string[];
  requirements_missing: string[];
  estimated_timeline_days: number | null;
}

export interface ChurnRisk {
  client_id: number;
  risk_score: number;
  risk_level: string;
  contributing_factors: string[];
  recommended_interventions: string[];
  intervention_priority: string;
}

export interface ClientJourney {
  client_id: number;
  current_stage: string;
  stage_entry_date: string;
  days_in_current_stage: number;
  previous_stage: string | null;
  progression_score: number;
  relationship_quality_score: number;
  premium_positioning_readiness: number;
  value_tier_alignment: string | null;
  last_calculated: string;
}

export interface Communication {
  id: number;
  communication_type: string;
  subject: string | null;
  sent_at: string;
  status: string;
  responded_at: string | null;
  engagement_score: number;
  touchpoint_type: string | null;
}

export interface Engagement {
  id: number;
  engagement_type: string;
  engagement_date: string;
  engagement_value: number;
  quality_score: number;
  relationship_contribution: number;
  revenue_impact: number | null;
}

export interface Workflow {
  id: number;
  workflow_name: string;
  workflow_type: string;
  trigger_event: string;
  is_active: boolean;
  total_executions: number;
  successful_executions: number;
  average_success_rate: number;
  total_revenue_generated: number;
  created_at: string;
}

export interface WorkflowExecution {
  execution_id: string;
  workflow_id: number;
  client_id: number;
  status: string;
  started_at: string;
  completed_at?: string;
  current_step: number;
  total_steps: number;
  revenue_generated: number;
}

export interface TouchpointPlan {
  id: number;
  client_id: number;
  touchpoint_type: string;
  touchpoint_name: string;
  planned_date: string;
  executed_date?: string;
  status: string;
  effectiveness_score?: number;
  relationship_building_objective?: string;
}

export interface CRMAnalytics {
  summary_date: string;
  period: string;
  client_metrics: {
    total_clients: number;
    new_clients_acquired: number;
    clients_retained: number;
    clients_lost: number;
    client_growth_rate: number;
  };
  tier_distribution: {
    premium_vip: number;
    core_regular: number;
    developing: number;
    occasional: number;
    at_risk: number;
  };
  relationship_metrics: {
    average_relationship_score: number;
    average_engagement_score: number;
    communication_response_rate: number;
    relationship_improvement_rate: number;
  };
  financial_metrics: {
    total_client_lifetime_value: number;
    average_client_lifetime_value: number;
    revenue_per_client: number;
  };
  retention_metrics: {
    retention_rate: number;
    churn_rate: number;
    average_churn_risk_score: number;
    clients_at_high_churn_risk: number;
  };
  automation_metrics: {
    automated_workflows_executed: number;
    automation_success_rate: number;
    time_saved_hours: number;
  };
  six_figure_barber_alignment: {
    premium_positioning_score: number;
    relationship_building_effectiveness: number;
    value_creation_success_rate: number;
    methodology_alignment_score: number;
  };
}

export interface ClientDistribution {
  tier_distribution: Record<string, number>;
  stage_distribution: Record<string, number>;
  total_clients_analyzed: number;
}

export interface CommunicationEffectiveness {
  analysis_period_days: number;
  communication_effectiveness: Array<{
    communication_type: string;
    total_sent: number;
    total_responded: number;
    response_rate: number;
    average_engagement_score: number;
  }>;
  touchpoint_effectiveness: Array<{
    touchpoint_type: string;
    total_sent: number;
    total_responded: number;
    response_rate: number;
    average_engagement_score: number;
  }>;
}

// Request types
export interface CommunicationRequest {
  client_id: number;
  communication_type: string;
  subject?: string;
  message_content?: string;
  touchpoint_type?: string;
  automation_triggered?: boolean;
}

export interface EngagementRequest {
  client_id: number;
  engagement_type: string;
  engagement_value?: number;
  appointment_id?: number;
  source_type?: string;
}

export interface WorkflowRequest {
  workflow_name: string;
  workflow_description?: string;
  workflow_type: string;
  trigger_event: string;
  workflow_steps: Array<{
    type: string;
    name: string;
    configuration: Record<string, any>;
    delay_hours?: number;
  }>;
  methodology_principle: string;
  target_client_criteria?: Record<string, any>;
  is_active?: boolean;
}

export interface TouchpointRequest {
  client_id: number;
  touchpoint_type: string;
  touchpoint_name: string;
  touchpoint_description?: string;
  planned_date: string;
  communication_channels?: string[];
  relationship_building_objective?: string;
}

export interface ClientJourneyUpdateRequest {
  client_id: number;
  force_recalculation?: boolean;
}

// API Client Class
export class SixFigureBarberCRMAPI {
  
  // ============================================================================
  // CLIENT SCORING AND ANALYSIS
  // ============================================================================
  
  /**
   * Get comprehensive client score components
   */
  static async getClientScore(clientId: number): Promise<ClientScore> {
    return apiRequest<ClientScore>(`/clients/${clientId}/score`);
  }

  /**
   * Get scores for multiple clients
   */
  static async getBatchClientScores(clientIds: number[]): Promise<{scores: ClientScore[], total_processed: number}> {
    const params = clientIds.map(id => `client_ids=${id}`).join('&');
    return apiRequest<{scores: ClientScore[], total_processed: number}>(`/clients/scores/batch?${params}`);
  }

  /**
   * Analyze client tier progression potential
   */
  static async analyzeTierProgression(clientId: number): Promise<TierProgression> {
    return apiRequest<TierProgression>(`/clients/${clientId}/tier-progression`);
  }

  /**
   * Assess client churn risk
   */
  static async assessChurnRisk(clientId: number): Promise<ChurnRisk> {
    return apiRequest<ChurnRisk>(`/clients/${clientId}/churn-risk`);
  }

  // ============================================================================
  // COMMUNICATION AND ENGAGEMENT
  // ============================================================================

  /**
   * Record a client communication
   */
  static async recordCommunication(request: CommunicationRequest): Promise<{communication_id: number, message: string, sent_at: string}> {
    return apiRequest<{communication_id: number, message: string, sent_at: string}>('/communications', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Record a client engagement activity
   */
  static async recordEngagement(request: EngagementRequest): Promise<{engagement_id: number, message: string, engagement_date: string}> {
    return apiRequest<{engagement_id: number, message: string, engagement_date: string}>('/engagements', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get client communication history
   */
  static async getClientCommunications(
    clientId: number, 
    options: {
      limit?: number;
      offset?: number;
      communication_type?: string;
    } = {}
  ): Promise<{communications: Communication[], total: number, limit: number, offset: number}> {
    const params = new URLSearchParams({
      limit: (options.limit || 50).toString(),
      offset: (options.offset || 0).toString(),
      ...(options.communication_type && { communication_type: options.communication_type }),
    });
    
    return apiRequest<{communications: Communication[], total: number, limit: number, offset: number}>(
      `/clients/${clientId}/communications?${params}`
    );
  }

  /**
   * Get client engagement history
   */
  static async getClientEngagements(
    clientId: number,
    options: {
      limit?: number;
      offset?: number;
      engagement_type?: string;
    } = {}
  ): Promise<{engagements: Engagement[], total: number, limit: number, offset: number}> {
    const params = new URLSearchParams({
      limit: (options.limit || 50).toString(),
      offset: (options.offset || 0).toString(),
      ...(options.engagement_type && { engagement_type: options.engagement_type }),
    });
    
    return apiRequest<{engagements: Engagement[], total: number, limit: number, offset: number}>(
      `/clients/${clientId}/engagements?${params}`
    );
  }

  // ============================================================================
  // CLIENT JOURNEY MANAGEMENT
  // ============================================================================

  /**
   * Get client journey information
   */
  static async getClientJourney(clientId: number): Promise<ClientJourney> {
    return apiRequest<ClientJourney>(`/clients/${clientId}/journey`);
  }

  /**
   * Update client journey stage
   */
  static async updateClientJourney(request: ClientJourneyUpdateRequest): Promise<{client_id: number, updated_stage: string, stage_entry_date: string, progression_score: number, message: string}> {
    return apiRequest<{client_id: number, updated_stage: string, stage_entry_date: string, progression_score: number, message: string}>('/clients/journey/update', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  // ============================================================================
  // TOUCHPOINTS AND WORKFLOWS
  // ============================================================================

  /**
   * Create a touchpoint plan
   */
  static async createTouchpointPlan(request: TouchpointRequest): Promise<{touchpoint_id: number, message: string, planned_date: string}> {
    return apiRequest<{touchpoint_id: number, message: string, planned_date: string}>('/touchpoints', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get touchpoint plans
   */
  static async getTouchpointPlans(options: {
    status?: string;
    client_id?: number;
    touchpoint_type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{touchpoints: TouchpointPlan[], total: number, limit: number, offset: number}> {
    const params = new URLSearchParams({
      limit: (options.limit || 50).toString(),
      offset: (options.offset || 0).toString(),
      ...(options.status && { status: options.status }),
      ...(options.client_id && { client_id: options.client_id.toString() }),
      ...(options.touchpoint_type && { touchpoint_type: options.touchpoint_type }),
    });
    
    return apiRequest<{touchpoints: TouchpointPlan[], total: number, limit: number, offset: number}>(
      `/touchpoints?${params}`
    );
  }

  /**
   * Create an automated workflow
   */
  static async createWorkflow(request: WorkflowRequest): Promise<{workflow_id: number, message: string, workflow_name: string, is_active: boolean}> {
    return apiRequest<{workflow_id: number, message: string, workflow_name: string, is_active: boolean}>('/workflows', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Execute a workflow
   */
  static async executeWorkflow(workflowId: number, clientId?: number, triggerData?: Record<string, any>): Promise<{execution_id?: string, executions_started?: number, message: string}> {
    return apiRequest<{execution_id?: string, executions_started?: number, message: string}>('/workflows/execute', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: workflowId,
        ...(clientId && { client_id: clientId }),
        ...(triggerData && { trigger_data: triggerData }),
      }),
    });
  }

  /**
   * Get all workflows
   */
  static async getWorkflows(options: {
    is_active?: boolean;
    workflow_type?: string;
  } = {}): Promise<{workflows: Workflow[], total: number}> {
    const params = new URLSearchParams();
    if (options.is_active !== undefined) params.append('is_active', options.is_active.toString());
    if (options.workflow_type) params.append('workflow_type', options.workflow_type);
    
    return apiRequest<{workflows: Workflow[], total: number}>(`/workflows?${params}`);
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Get comprehensive CRM analytics summary
   */
  static async getCRMAnalytics(options: {
    period?: string;
    summary_date?: string;
  } = {}): Promise<CRMAnalytics> {
    const params = new URLSearchParams({
      period: options.period || 'daily',
      ...(options.summary_date && { summary_date: options.summary_date }),
    });
    
    return apiRequest<CRMAnalytics>(`/analytics/summary?${params}`);
  }

  /**
   * Get client distribution analytics
   */
  static async getClientDistribution(): Promise<ClientDistribution> {
    return apiRequest<ClientDistribution>('/analytics/client-distribution');
  }

  /**
   * Get communication effectiveness analytics
   */
  static async getCommunicationEffectiveness(daysBack: number = 30): Promise<CommunicationEffectiveness> {
    return apiRequest<CommunicationEffectiveness>(`/analytics/communication-effectiveness?days_back=${daysBack}`);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get available enum values for dropdowns and validation
   */
  static async getEnums(): Promise<{
    communication_types: string[];
    engagement_types: string[];
    client_stages: string[];
    touchpoint_types: string[];
    workflow_triggers: string[];
    client_value_tiers: string[];
    six_fb_principles: string[];
  }> {
    return apiRequest<{
      communication_types: string[];
      engagement_types: string[];
      client_stages: string[];
      touchpoint_types: string[];
      workflow_triggers: string[];
      client_value_tiers: string[];
      six_fb_principles: string[];
    }>('/enums');
  }

  /**
   * Manually trigger a CRM event
   */
  static async triggerEvent(
    triggerEvent: string,
    clientId?: number,
    eventData?: Record<string, any>
  ): Promise<{trigger_event: string, executions_triggered: number, execution_ids: string[], message: string}> {
    return apiRequest<{trigger_event: string, executions_triggered: number, execution_ids: string[], message: string}>('/trigger-event', {
      method: 'POST',
      body: JSON.stringify({
        trigger_event: triggerEvent,
        ...(clientId && { client_id: clientId }),
        ...(eventData && { event_data: eventData }),
      }),
    });
  }
}

// Export default instance
export default SixFigureBarberCRMAPI;
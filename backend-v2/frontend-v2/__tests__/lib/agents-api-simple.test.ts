/**
 * Simple test for enhanced agents API structure
 */

import { AgentAnalytics, OptimizationRecommendation, CompetitiveBenchmarks } from '../../lib/api/agents'

describe('Enhanced Agents API Types', () => {
  it('should have proper TypeScript interfaces for business intelligence', () => {
    // Test OptimizationRecommendation interface
    const recommendation: OptimizationRecommendation = {
      type: 'scaling',
      priority: 'high',
      title: 'Scale Booking Assistant',
      description: 'High demand detected',
      action: 'Deploy additional instances',
      potential_impact: '25-35% revenue increase'
    }

    expect(recommendation.priority).toBe('high')
    expect(recommendation.type).toBe('scaling')

    // Test CompetitiveBenchmarks interface  
    const benchmarks: CompetitiveBenchmarks = {
      industry_averages: {
        success_rate: 65.0,
        avg_response_time: 45.0,
        roi: 3.2,
        engagement_rate: 58.0
      },
      top_quartile: {
        success_rate: 85.0,
        avg_response_time: 20.0,
        roi: 6.5,
        engagement_rate: 78.0
      },
      your_performance_vs_industry: 'above_average'
    }

    expect(benchmarks.industry_averages.success_rate).toBe(65.0)
    expect(benchmarks.your_performance_vs_industry).toBe('above_average')

    // Test comprehensive AgentAnalytics interface
    const analytics: AgentAnalytics = {
      // Core metrics
      total_agents: 5,
      active_instances: 3,
      total_conversations: 125,
      total_messages: 850,
      average_response_time: 32.5,
      success_rate: 87.3,
      total_revenue: 4250.0,
      roi: 5.2,
      
      // Business intelligence
      optimization_recommendations: [recommendation],
      competitive_benchmarks: benchmarks,
      current_period_performance: {
        today_conversations: 8,
        today_revenue: 520.0,
        active_conversations: 3,
        agents_running: 6
      },
      revenue_by_agent_type: {
        booking_assistant: 2550.0,
        customer_service: 1020.0
      },
      conversation_trends: [
        {
          date: '2025-07-13',
          conversations: 15,
          revenue: 850.0,
          conversion_rate: 82.5
        }
      ],
      top_performing_agents: [
        {
          name: 'Smart Booking Agent',
          revenue: 2550.0,
          conversion_rate: 84.3,
          conversations: 75,
          agent_type: 'booking_assistant'
        }
      ],
      
      // Cost analysis
      cost_summary: {
        total_cost: 156.75,
        cost_by_provider: {
          openai: 120.50
        },
        cost_by_agent_type: {
          booking_assistant: 95.20
        }
      },
      
      // Legacy compatibility
      usage_trends: [],
      
      // Metadata
      date_range: {
        start: '2025-07-06T00:00:00Z',
        end: '2025-07-13T23:59:59Z',
        days: 7
      },
      last_updated: '2025-07-13T10:30:00Z'
    }

    // Verify the analytics object has all expected properties
    expect(analytics.total_revenue).toBe(4250.0)
    expect(analytics.roi).toBe(5.2)
    expect(analytics.optimization_recommendations).toHaveLength(1)
    expect(analytics.competitive_benchmarks.industry_averages.success_rate).toBe(65.0)
    expect(analytics.current_period_performance.today_revenue).toBe(520.0)
    expect(analytics.revenue_by_agent_type.booking_assistant).toBe(2550.0)
    expect(analytics.conversation_trends).toHaveLength(1)
    expect(analytics.top_performing_agents).toHaveLength(1)
    expect(analytics.cost_summary.total_cost).toBe(156.75)
  })

  it('should support optional fields in interfaces', () => {
    // Test that optional fields work correctly
    const minimalAgent = {
      name: 'Basic Agent',
      revenue: 1000.0,
      conversion_rate: 75.0
      // Optional fields like conversations, agent_type, performance_score are omitted
    }

    expect(minimalAgent.name).toBe('Basic Agent')
    expect(minimalAgent.revenue).toBe(1000.0)
    
    // Test with optional fields included
    const detailedAgent = {
      name: 'Detailed Agent',
      revenue: 2000.0,
      conversion_rate: 85.0,
      conversations: 50,
      agent_type: 'customer_service' as const,
      performance_score: 92.5
    }

    expect(detailedAgent.conversations).toBe(50)
    expect(detailedAgent.agent_type).toBe('customer_service')
    expect(detailedAgent.performance_score).toBe(92.5)
  })

  it('should validate priority enum values', () => {
    const validPriorities: Array<OptimizationRecommendation['priority']> = ['high', 'medium', 'low']
    
    validPriorities.forEach(priority => {
      const recommendation: OptimizationRecommendation = {
        type: 'optimization',
        priority,
        title: `${priority} priority recommendation`,
        description: 'Test description',
        action: 'Test action',
        potential_impact: 'Test impact'
      }
      
      expect(['high', 'medium', 'low']).toContain(recommendation.priority)
    })
  })
})
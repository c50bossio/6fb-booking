/**
 * Test suite for enhanced agents API with business intelligence support
 */

import { agentsApi, AgentAnalytics } from '../../lib/api/agents'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Enhanced Agents API', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })
  })

  describe('getAgentAnalytics', () => {
    it('should return comprehensive analytics with business intelligence', async () => {
      const mockAnalyticsData = {
        total_agents: 5,
        active_instances: 3,
        total_conversations: 125,
        total_messages: 850,
        avg_response_time: 32.5,
        success_rate: 87.3,
        total_revenue: 4250.0,
        roi: 5.2,
        optimization_recommendations: [
          {
            type: 'scaling',
            priority: 'high' as const,
            title: 'Scale Booking Assistant',
            description: 'High demand detected for booking services',
            action: 'Deploy additional booking agent instances',
            potential_impact: '25-35% revenue increase'
          }
        ],
        competitive_benchmarks: {
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
        },
        current_period_performance: {
          today_conversations: 8,
          today_revenue: 520.0,
          active_conversations: 3,
          agents_running: 6
        },
        revenue_by_agent_type: {
          booking_assistant: 2550.0,
          customer_service: 1020.0,
          marketing_assistant: 680.0
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
            conversations: 75
          }
        ],
        cost_summary: {
          total_cost: 156.75,
          cost_by_provider: {
            openai: 120.50,
            anthropic: 36.25
          },
          cost_by_agent_type: {
            booking_assistant: 95.20,
            customer_service: 61.55
          }
        },
        usage_trends: [],
        date_range: {
          start: '2025-07-06T00:00:00Z',
          end: '2025-07-13T23:59:59Z',
          days: 7
        },
        last_updated: '2025-07-13T10:30:00Z'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsData,
      })

      const result = await agentsApi.getAgentAnalytics('2025-07-06', '2025-07-13')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/agents/analytics?start_date=2025-07-06&end_date=2025-07-13',
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
        }
      )

      expect(result).toEqual(expect.objectContaining({
        total_revenue: 4250.0,
        roi: 5.2,
        optimization_recommendations: expect.arrayContaining([
          expect.objectContaining({
            priority: 'high',
            title: 'Scale Booking Assistant'
          })
        ]),
        competitive_benchmarks: expect.objectContaining({
          industry_averages: expect.objectContaining({
            success_rate: 65.0
          })
        }),
        current_period_performance: expect.objectContaining({
          today_conversations: 8,
          today_revenue: 520.0
        })
      }))
    })

    it('should handle API errors gracefully with fallback data', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await agentsApi.getAgentAnalytics()

      expect(result).toEqual(expect.objectContaining({
        total_agents: 0,
        total_revenue: 0,
        optimization_recommendations: [],
        competitive_benchmarks: expect.objectContaining({
          industry_averages: expect.any(Object),
          top_quartile: expect.any(Object)
        })
      }))
    })

    it('should handle missing fields with appropriate defaults', async () => {
      const incompleteData = {
        total_agents: 2,
        // Missing many required fields
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => incompleteData,
      })

      const result = await agentsApi.getAgentAnalytics()

      expect(result.total_agents).toBe(2)
      expect(result.total_revenue).toBe(0)
      expect(result.optimization_recommendations).toEqual([])
      expect(result.competitive_benchmarks).toEqual(expect.objectContaining({
        your_performance_vs_industry: 'unknown'
      }))
    })
  })

  describe('Utility Functions', () => {
    const mockAnalytics: AgentAnalytics = {
      total_agents: 5,
      active_instances: 3,
      total_conversations: 125,
      total_messages: 850,
      average_response_time: 32.5,
      success_rate: 87.3,
      total_revenue: 4250.0,
      roi: 5.2,
      optimization_recommendations: [],
      competitive_benchmarks: {
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
      },
      current_period_performance: {
        today_conversations: 8,
        today_revenue: 520.0,
        active_conversations: 3,
        agents_running: 6
      },
      revenue_by_agent_type: {
        booking_assistant: 2550.0,
        customer_service: 1020.0,
        marketing_assistant: 680.0
      },
      conversation_trends: [],
      top_performing_agents: [],
      cost_summary: {
        total_cost: 156.75,
        cost_by_provider: {},
        cost_by_agent_type: {}
      },
      usage_trends: [],
      date_range: {
        start: '2025-07-06T00:00:00Z',
        end: '2025-07-13T23:59:59Z',
        days: 7
      },
      last_updated: '2025-07-13T10:30:00Z'
    }

    describe('formatRevenue', () => {
      it('should format revenue correctly', () => {
        expect(agentsApi.formatRevenue(4250)).toBe('$4,250')
        expect(agentsApi.formatRevenue(0)).toBe('$0')
        expect(agentsApi.formatRevenue(99.99)).toBe('$100')
      })
    })

    describe('formatPercentage', () => {
      it('should format percentages correctly', () => {
        expect(agentsApi.formatPercentage(87.3)).toBe('87.3%')
        expect(agentsApi.formatPercentage(0)).toBe('0.0%')
        expect(agentsApi.formatPercentage(100)).toBe('100.0%')
      })
    })

    describe('formatResponseTime', () => {
      it('should format response time correctly', () => {
        expect(agentsApi.formatResponseTime(32.5)).toBe('32.5s')
        expect(agentsApi.formatResponseTime(75)).toBe('1m 15s')
        expect(agentsApi.formatResponseTime(120)).toBe('2m 0s')
      })
    })

    describe('getPerformanceIndicator', () => {
      it('should categorize performance correctly', () => {
        expect(agentsApi.getPerformanceIndicator(90, 65, 85)).toBe('excellent')
        expect(agentsApi.getPerformanceIndicator(75, 65, 85)).toBe('above_average')
        expect(agentsApi.getPerformanceIndicator(60, 65, 85)).toBe('average')
        expect(agentsApi.getPerformanceIndicator(40, 65, 85)).toBe('below_average')
      })
    })

    describe('calculateTotalRevenue', () => {
      it('should calculate total revenue correctly', () => {
        const revenueByType = {
          booking_assistant: 2550.0,
          customer_service: 1020.0,
          marketing_assistant: 680.0
        }
        expect(agentsApi.calculateTotalRevenue(revenueByType)).toBe(4250.0)
        expect(agentsApi.calculateTotalRevenue({})).toBe(0)
      })
    })

    describe('getTopPerformingTypes', () => {
      it('should return top performing agent types', () => {
        const revenueByType = {
          booking_assistant: 2550.0,
          customer_service: 1020.0,
          marketing_assistant: 680.0
        }
        const result = agentsApi.getTopPerformingTypes(revenueByType, 2)

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
          type: 'booking_assistant',
          revenue: 2550.0,
          percentage: 60.0
        })
        expect(result[1]).toEqual({
          type: 'customer_service',
          revenue: 1020.0,
          percentage: 24.0
        })
      })
    })

    describe('getAnalyticsSummary', () => {
      it('should generate comprehensive summary', () => {
        const summary = agentsApi.getAnalyticsSummary(mockAnalytics)

        expect(summary).toEqual({
          totalRevenue: '$4,250',
          conversionRate: '87.3%',
          responseTime: '32.5s',
          agentCount: 5,
          activeConversations: 3,
          performanceStatus: 'excellent'
        })
      })
    })

    describe('validateAnalyticsData', () => {
      it('should validate complete data structure', () => {
        expect(agentsApi.validateAnalyticsData(mockAnalytics)).toBe(true)
      })

      it('should detect missing required fields', () => {
        const incompleteData = {
          total_agents: 5,
          // Missing other required fields
        }
        expect(agentsApi.validateAnalyticsData(incompleteData)).toBe(false)
      })

      it('should detect invalid array fields', () => {
        const invalidData = {
          ...mockAnalytics,
          optimization_recommendations: 'not-an-array'
        }
        expect(agentsApi.validateAnalyticsData(invalidData)).toBe(false)
      })
    })
  })

  describe('Type Safety', () => {
    it('should ensure type-safe interfaces', () => {
      // This test ensures our interfaces compile correctly
      const mockRecommendation = {
        type: 'scaling',
        priority: 'high' as const,
        title: 'Test',
        description: 'Test description',
        action: 'Test action',
        potential_impact: 'Test impact'
      }

      const mockBenchmarks = {
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

      expect(mockRecommendation.priority).toBe('high')
      expect(mockBenchmarks.industry_averages.success_rate).toBe(65.0)
    })
  })
})
'use client'

import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Zap,
  Crown,
  Award,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  ShoppingBag,
  Scissors,
  Briefcase,
  Globe,
  Smartphone,
  Eye,
  MousePointer
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Progress } from '@/components/ui/Progress'
import { type AgentAnalytics } from '@/lib/api/agents'

interface BusinessMetrics {
  revenue_forecast: {
    current_month: number
    next_month: number
    next_quarter: number
    growth_rate: number
    confidence: number
  }
  customer_analytics: {
    lifetime_value: number
    acquisition_cost: number
    retention_rate: number
    churn_rate: number
    repeat_booking_rate: number
  }
  market_position: {
    local_ranking: number
    competitor_analysis: {
      market_share: number
      pricing_position: 'above' | 'at' | 'below'
      service_gap_opportunities: string[]
    }
    growth_opportunities: string[]
  }
  operational_insights: {
    peak_hours: string[]
    capacity_utilization: number
    staff_efficiency: number
    service_popularity: Record<string, number>
  }
  marketing_performance: {
    channel_effectiveness: Record<string, number>
    conversion_funnel: {
      awareness: number
      consideration: number
      booking: number
      retention: number
    }
    roi_by_channel: Record<string, number>
  }
}

interface StrategicRecommendation {
  id: string
  type: 'revenue' | 'customer' | 'marketing' | 'operational'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  effort: 'low' | 'medium' | 'high'
  timeline: string
  expected_roi: number
  action_items: string[]
}

interface StrategicInsightsDashboardProps {
  data: AgentAnalytics
  dateRange: string
}

export function StrategicInsightsDashboard({ data, dateRange }: StrategicInsightsDashboardProps) {
  const [loading, setLoading] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<'overview' | 'revenue' | 'customers' | 'marketing' | 'operations'>('overview')
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [recommendations, setRecommendations] = useState<StrategicRecommendation[]>([])

  useEffect(() => {
    loadBusinessIntelligence()
  }, [data, dateRange])

  const loadBusinessIntelligence = async () => {
    try {
      setLoading(true)
      
      // Mock sophisticated business intelligence data
      const mockMetrics: BusinessMetrics = {
        revenue_forecast: {
          current_month: 28500,
          next_month: 31200,
          next_quarter: 95000,
          growth_rate: 18.5,
          confidence: 87.2
        },
        customer_analytics: {
          lifetime_value: 485,
          acquisition_cost: 45,
          retention_rate: 73.5,
          churn_rate: 12.8,
          repeat_booking_rate: 68.2
        },
        market_position: {
          local_ranking: 3,
          competitor_analysis: {
            market_share: 12.4,
            pricing_position: 'above',
            service_gap_opportunities: [
              'Premium beard care services',
              'Mobile barber services',
              'Corporate partnerships'
            ]
          },
          growth_opportunities: [
            'Expand evening hours (18% demand increase)',
            'Add premium services (+$125 avg transaction)',
            'Target corporate clients (42% market gap)'
          ]
        },
        operational_insights: {
          peak_hours: ['10:00-12:00', '14:00-16:00', '18:00-20:00'],
          capacity_utilization: 76.8,
          staff_efficiency: 88.3,
          service_popularity: {
            'Classic Cut': 45,
            'Beard Trim': 28,
            'Full Service': 18,
            'Premium Cut': 9
          }
        },
        marketing_performance: {
          channel_effectiveness: {
            'AI Agents': 34.2,
            'Social Media': 28.7,
            'Word of Mouth': 22.1,
            'Google Ads': 15.0
          },
          conversion_funnel: {
            awareness: 1000,
            consideration: 420,
            booking: 185,
            retention: 126
          },
          roi_by_channel: {
            'AI Agents': 4.2,
            'Social Media': 2.8,
            'Word of Mouth': 8.5,
            'Google Ads': 3.1
          }
        }
      }

      const mockRecommendations: StrategicRecommendation[] = [
        {
          id: '1',
          type: 'revenue',
          priority: 'critical',
          title: 'Implement Dynamic Pricing Strategy',
          description: 'Peak hour pricing could increase revenue by 23% during high-demand periods',
          impact: '+$6,500/month',
          effort: 'medium',
          timeline: '2-3 weeks',
          expected_roi: 340,
          action_items: [
            'Implement time-based pricing in booking system',
            'Create premium time slot pricing (+20%)',
            'Test weekend premium pricing (+15%)',
            'Monitor customer response and adjust'
          ]
        },
        {
          id: '2',
          type: 'customer',
          priority: 'high',
          title: 'Launch VIP Membership Program',
          description: 'Target high-value customers with exclusive benefits to increase retention',
          impact: '+$3,200/month',
          effort: 'medium',
          timeline: '3-4 weeks',
          expected_roi: 280,
          action_items: [
            'Design tiered membership structure',
            'Create exclusive booking windows',
            'Implement loyalty point system',
            'Launch to top 20% of customers first'
          ]
        },
        {
          id: '3',
          type: 'marketing',
          priority: 'high',
          title: 'Optimize AI Agent Message Timing',
          description: 'Send rebooking messages 3 days earlier to capture 18% more appointments',
          impact: '+$2,850/month',
          effort: 'low',
          timeline: '1 week',
          expected_roi: 420,
          action_items: [
            'Adjust AI agent timing from 7 to 4 days before',
            'A/B test different message times',
            'Personalize timing based on customer behavior',
            'Monitor booking conversion rates'
          ]
        },
        {
          id: '4',
          type: 'operational',
          priority: 'medium',
          title: 'Expand Corporate Service Offerings',
          description: 'Tap into underserved corporate market with on-site services',
          impact: '+$4,100/month',
          effort: 'high',
          timeline: '6-8 weeks',
          expected_roi: 190,
          action_items: [
            'Research local corporate needs',
            'Develop mobile service packages',
            'Create corporate pricing structure',
            'Build B2B sales process'
          ]
        }
      ]

      setBusinessMetrics(mockMetrics)
      setRecommendations(mockRecommendations)
    } catch (error) {
      console.error('Failed to load business intelligence:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'high':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Revenue Forecast */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Revenue Forecast
          </h3>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            {businessMetrics?.revenue_forecast.confidence.toFixed(1)}% confidence
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(businessMetrics?.revenue_forecast.current_month || 0)}
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Next Month</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(businessMetrics?.revenue_forecast.next_month || 0)}
            </p>
            <p className="text-sm text-green-600">
              +{formatPercentage(businessMetrics?.revenue_forecast.growth_rate || 0)} growth
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Next Quarter</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(businessMetrics?.revenue_forecast.next_quarter || 0)}
            </p>
          </div>
        </div>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer LTV</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(businessMetrics?.customer_analytics.lifetime_value || 0)}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">+12.5% vs last month</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Market Ranking</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                #{businessMetrics?.market_position.local_ranking || 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            <TrendingUp className="w-4 h-4 text-blue-600 mr-1" />
            <span className="text-sm text-blue-600">in local area</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Capacity Utilized</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatPercentage(businessMetrics?.operational_insights.capacity_utilization || 0)}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            <Clock className="w-4 h-4 text-orange-600 mr-1" />
            <span className="text-sm text-orange-600">23% growth potential</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Retention Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatPercentage(businessMetrics?.customer_analytics.retention_rate || 0)}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">Above industry avg</span>
          </div>
        </Card>
      </div>

      {/* Strategic Recommendations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Strategic Recommendations
            </h3>
          </div>
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            {recommendations.length} opportunities
          </Badge>
        </div>

        <div className="space-y-4">
          {recommendations.slice(0, 3).map((recommendation) => (
            <div key={recommendation.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {recommendation.title}
                    </h4>
                    <Badge className={getPriorityColor(recommendation.priority)}>
                      {recommendation.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {recommendation.description}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-green-600">
                    {recommendation.impact}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {recommendation.expected_roi}% ROI
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 dark:text-gray-400">
                    Timeline: {recommendation.timeline}
                  </span>
                  <span className={`font-medium ${getEffortColor(recommendation.effort)}`}>
                    {recommendation.effort} effort
                  </span>
                </div>
                <Button size="sm" variant="outline">
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => setSelectedInsight('revenue')}>
            View All Recommendations
          </Button>
        </div>
      </Card>
    </div>
  )

  const renderChannelPerformance = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Marketing Channel Performance
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Effectiveness */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Conversion Rate by Channel
          </h4>
          <div className="space-y-3">
            {Object.entries(businessMetrics?.marketing_performance.channel_effectiveness || {}).map(([channel, rate]) => (
              <div key={channel} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{channel}</span>
                <div className="flex items-center space-x-2">
                  <Progress value={rate} className="w-24" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatPercentage(rate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI by Channel */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            ROI by Channel
          </h4>
          <div className="space-y-3">
            {Object.entries(businessMetrics?.marketing_performance.roi_by_channel || {}).map(([channel, roi]) => (
              <div key={channel} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{channel}</span>
                <span className={`text-sm font-medium ${roi > 3 ? 'text-green-600' : roi > 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {roi.toFixed(1)}x
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Strategic Business Intelligence
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered insights, forecasting, and strategic recommendations
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={selectedInsight} onValueChange={(value) => setSelectedInsight(value as any)}>
            <option value="overview">Overview</option>
            <option value="revenue">Revenue Analysis</option>
            <option value="customers">Customer Insights</option>
            <option value="marketing">Marketing Performance</option>
            <option value="operations">Operations</option>
          </Select>
        </div>
      </div>

      {/* Content */}
      {selectedInsight === 'overview' && renderOverview()}
      {selectedInsight === 'marketing' && renderChannelPerformance()}
      
      {/* Other views would be implemented here */}
      {selectedInsight !== 'overview' && selectedInsight !== 'marketing' && (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {selectedInsight.charAt(0).toUpperCase() + selectedInsight.slice(1)} Analysis
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Advanced {selectedInsight} insights coming soon
          </p>
        </div>
      )}
    </div>
  )
}
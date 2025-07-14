'use client'

import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  MapPin,
  Star,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Zap,
  Crown,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MousePointer,
  Phone,
  Mail,
  MessageSquare,
  Scissors,
  ShoppingBag,
  Globe,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Progress } from '@/components/ui/progress'
import { type AgentAnalytics } from '@/lib/api/agents'

interface CustomerSegment {
  id: string
  name: string
  count: number
  percentage: number
  avg_lifetime_value: number
  avg_visit_frequency: number
  characteristics: string[]
  growth_trend: 'up' | 'down' | 'stable'
  revenue_contribution: number
}

interface MarketAnalysis {
  local_competition: {
    total_competitors: number
    direct_competitors: number
    market_saturation: number
    price_comparison: {
      our_avg: number
      market_avg: number
      position: 'premium' | 'competitive' | 'value'
    }
  }
  demographic_insights: {
    age_distribution: Record<string, number>
    income_levels: Record<string, number>
    service_preferences: Record<string, number>
  }
  seasonal_patterns: {
    peak_seasons: string[]
    slow_periods: string[]
    growth_opportunities: string[]
  }
  expansion_opportunities: {
    underserved_areas: string[]
    emerging_trends: string[]
    service_gaps: string[]
  }
}

interface GrowthPrediction {
  time_horizon: '3_months' | '6_months' | '1_year' | '2_years'
  revenue_forecast: {
    conservative: number
    realistic: number
    optimistic: number
    confidence_interval: number
  }
  customer_growth: {
    new_customers: number
    retention_rate: number
    churn_prediction: number
  }
  market_share_projection: {
    current: number
    projected: number
    factors: string[]
  }
  investment_recommendations: {
    priority_areas: string[]
    expected_roi: Record<string, number>
    timeline: Record<string, string>
  }
}

interface AdvancedAnalyticsFeaturesProps {
  data: AgentAnalytics
  dateRange: string
}

export function AdvancedAnalyticsFeatures({ data, dateRange }: AdvancedAnalyticsFeaturesProps) {
  const [loading, setLoading] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<'customers' | 'market' | 'growth' | 'predictions'>('customers')
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([])
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null)
  const [growthPredictions, setGrowthPredictions] = useState<GrowthPrediction | null>(null)

  useEffect(() => {
    loadAdvancedAnalytics()
  }, [data, dateRange])

  const loadAdvancedAnalytics = async () => {
    try {
      setLoading(true)
      
      // Mock advanced analytics data
      const mockCustomerSegments: CustomerSegment[] = [
        {
          id: 'vip',
          name: 'VIP Customers',
          count: 127,
          percentage: 8.5,
          avg_lifetime_value: 850,
          avg_visit_frequency: 2.3,
          characteristics: ['High spenders', 'Premium services', 'Loyal', 'Referral generators'],
          growth_trend: 'up',
          revenue_contribution: 34.2
        },
        {
          id: 'regular',
          name: 'Regular Customers',
          count: 543,
          percentage: 36.4,
          avg_lifetime_value: 425,
          avg_visit_frequency: 1.8,
          characteristics: ['Consistent bookings', 'Standard services', 'Price conscious'],
          growth_trend: 'stable',
          revenue_contribution: 48.7
        },
        {
          id: 'occasional',
          name: 'Occasional Visitors',
          count: 623,
          percentage: 41.7,
          avg_lifetime_value: 185,
          avg_visit_frequency: 0.8,
          characteristics: ['Infrequent visits', 'Basic services', 'Price sensitive'],
          growth_trend: 'down',
          revenue_contribution: 12.3
        },
        {
          id: 'new',
          name: 'New Customers',
          count: 198,
          percentage: 13.4,
          avg_lifetime_value: 95,
          avg_visit_frequency: 0.3,
          characteristics: ['First-time visitors', 'Exploring services', 'Potential growth'],
          growth_trend: 'up',
          revenue_contribution: 4.8
        }
      ]

      const mockMarketAnalysis: MarketAnalysis = {
        local_competition: {
          total_competitors: 23,
          direct_competitors: 8,
          market_saturation: 67.3,
          price_comparison: {
            our_avg: 45,
            market_avg: 38,
            position: 'premium'
          }
        },
        demographic_insights: {
          age_distribution: {
            '18-25': 18.5,
            '26-35': 34.2,
            '36-45': 28.7,
            '46-55': 15.1,
            '55+': 3.5
          },
          income_levels: {
            'Under $50k': 22.1,
            '$50k-$75k': 31.4,
            '$75k-$100k': 28.9,
            'Over $100k': 17.6
          },
          service_preferences: {
            'Quick Cut': 42.3,
            'Full Service': 28.1,
            'Premium Treatment': 19.7,
            'Beard Services': 9.9
          }
        },
        seasonal_patterns: {
          peak_seasons: ['Holiday season', 'Back-to-school', 'Wedding season'],
          slow_periods: ['January-February', 'Mid-summer'],
          growth_opportunities: ['Corporate events', 'Father\'s Day promotions', 'Graduation season']
        },
        expansion_opportunities: {
          underserved_areas: ['Downtown district', 'Suburban north', 'Corporate centers'],
          emerging_trends: ['Mobile barber services', 'Premium grooming packages', 'Subscription models'],
          service_gaps: ['Late evening hours', 'Weekend premium slots', 'Corporate partnerships']
        }
      }

      const mockGrowthPredictions: GrowthPrediction = {
        time_horizon: '1_year',
        revenue_forecast: {
          conservative: 420000,
          realistic: 485000,
          optimistic: 550000,
          confidence_interval: 82.4
        },
        customer_growth: {
          new_customers: 850,
          retention_rate: 78.5,
          churn_prediction: 15.2
        },
        market_share_projection: {
          current: 12.4,
          projected: 16.8,
          factors: ['AI agent optimization', 'Service expansion', 'Market growth']
        },
        investment_recommendations: {
          priority_areas: ['AI agent enhancement', 'Staff training', 'Premium services', 'Marketing automation'],
          expected_roi: {
            'AI agents': 340,
            'Staff training': 220,
            'Premium services': 280,
            'Marketing': 190
          },
          timeline: {
            'AI agents': '2-3 months',
            'Staff training': '1-2 months',
            'Premium services': '3-4 months',
            'Marketing': '1-2 months'
          }
        }
      }

      setCustomerSegments(mockCustomerSegments)
      setMarketAnalysis(mockMarketAnalysis)
      setGrowthPredictions(mockGrowthPredictions)
    } catch (error) {
      console.error('Failed to load advanced analytics:', error)
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />
      case 'down':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-blue-600" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  const renderCustomerAnalysis = () => (
    <div className="space-y-6">
      {/* Customer Segmentation Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Customer Segmentation Analysis
          </h3>
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            {customerSegments.length} segments identified
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {customerSegments.map((segment) => (
            <Card key={segment.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {segment.name}
                </h4>
                {getTrendIcon(segment.growth_trend)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Customers</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {segment.count.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg LTV</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(segment.avg_lifetime_value)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Revenue %</span>
                  <span className="font-medium text-purple-600">
                    {formatPercentage(segment.revenue_contribution)}
                  </span>
                </div>

                <div className="mt-3">
                  <Progress value={segment.percentage} className="h-2" />
                  <span className="text-xs text-gray-500 mt-1">
                    {formatPercentage(segment.percentage)} of customer base
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-1">
                  {segment.characteristics.slice(0, 2).map((char, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {char}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Customer Lifecycle Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Customer Lifecycle Metrics
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Acquisition Rate</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">124/month</p>
                <p className="text-xs text-green-600">+18% vs last period</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Retention Rate</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">73.5%</p>
                <p className="text-xs text-blue-600">Above industry avg</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Churn Rate</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">12.8%</p>
                <p className="text-xs text-orange-600">Needs attention</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Crown className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Customer LTV</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">$485</p>
                <p className="text-xs text-purple-600">+$67 vs last year</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Service Preference Analysis
          </h3>

          <div className="space-y-4">
            {marketAnalysis?.demographic_insights.service_preferences && 
             Object.entries(marketAnalysis.demographic_insights.service_preferences).map(([service, percentage]) => (
              <div key={service} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{service}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPercentage(percentage)}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Optimization Opportunity
              </span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Premium services show 19.7% adoption but generate 45% higher margins. 
              Consider targeted upselling campaigns for regular customers.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )

  const renderMarketAnalysis = () => (
    <div className="space-y-6">
      {/* Competitive Landscape */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Competitive Market Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-8 h-8 text-red-600" />
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Local Competition</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {marketAnalysis?.local_competition.total_competitors || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total competitors ({marketAnalysis?.local_competition.direct_competitors || 0} direct)
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Target className="w-8 h-8 text-yellow-600" />
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Market Saturation</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatPercentage(marketAnalysis?.local_competition.market_saturation || 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Room for growth
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Price Position</h4>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(marketAnalysis?.local_competition.price_comparison.our_avg || 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              vs {formatCurrency(marketAnalysis?.local_competition.price_comparison.market_avg || 0)} market avg
            </p>
            <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Premium positioning
            </Badge>
          </div>
        </div>
      </Card>

      {/* Market Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Expansion Opportunities
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Underserved Areas
              </h4>
              <div className="space-y-2">
                {marketAnalysis?.expansion_opportunities.underserved_areas.map((area, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{area}</span>
                    <Badge variant="outline" className="text-xs">High potential</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Service Gaps
              </h4>
              <div className="space-y-2">
                {marketAnalysis?.expansion_opportunities.service_gaps.map((gap, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{gap}</span>
                    <Badge variant="outline" className="text-xs">Opportunity</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Emerging Trends
          </h3>

          <div className="space-y-4">
            {marketAnalysis?.expansion_opportunities.emerging_trends.map((trend, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mt-0.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                      {trend}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Growing demand in local market
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        +28% interest
                      </Badge>
                      <span className="text-xs text-gray-500">vs last year</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )

  const renderGrowthPredictions = () => (
    <div className="space-y-6">
      {/* Revenue Forecast */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            12-Month Revenue Forecast
          </h3>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            {formatPercentage(growthPredictions?.revenue_forecast.confidence_interval || 0)} confidence
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">Conservative</h4>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(growthPredictions?.revenue_forecast.conservative || 0)}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Worst-case scenario
            </p>
          </div>

          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Realistic</h4>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(growthPredictions?.revenue_forecast.realistic || 0)}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Most likely outcome
            </p>
          </div>

          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">Optimistic</h4>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(growthPredictions?.revenue_forecast.optimistic || 0)}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Best-case scenario
            </p>
          </div>
        </div>
      </Card>

      {/* Investment Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Investment Recommendations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {growthPredictions?.investment_recommendations.priority_areas.map((area, index) => {
            const roi = growthPredictions.investment_recommendations.expected_roi[area] || 0
            const timeline = growthPredictions.investment_recommendations.timeline[area] || ''
            
            return (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">{area}</h4>
                  <Badge className={`${roi > 300 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                                      roi > 200 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 
                                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                    {roi}% ROI
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Timeline:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{timeline}</span>
                </div>

                <div className="mt-3">
                  <Progress value={Math.min(roi / 5, 100)} className="h-2" />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Market Share Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Market Share Projection
          </h3>

          <div className="text-center mb-4">
            <div className="flex items-center justify-center space-x-8">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(growthPredictions?.market_share_projection.current || 0)}
                </p>
              </div>
              <div className="flex items-center">
                <ArrowUpRight className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Projected</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPercentage(growthPredictions?.market_share_projection.projected || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white">Growth Factors:</h4>
            {growthPredictions?.market_share_projection.factors.map((factor, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{factor}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Customer Growth Prediction
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">New Customers</span>
              <div className="text-right">
                <p className="font-bold text-green-600">
                  +{growthPredictions?.customer_growth.new_customers || 0}
                </p>
                <p className="text-xs text-gray-500">next 12 months</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Retention Rate</span>
              <div className="text-right">
                <p className="font-bold text-blue-600">
                  {formatPercentage(growthPredictions?.customer_growth.retention_rate || 0)}
                </p>
                <p className="text-xs text-gray-500">projected</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Churn Prediction</span>
              <div className="text-right">
                <p className="font-bold text-orange-600">
                  {formatPercentage(growthPredictions?.customer_growth.churn_prediction || 0)}
                </p>
                <p className="text-xs text-gray-500">expected churn</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
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
            Advanced Analytics & Market Intelligence
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Deep insights into customer behavior, market trends, and growth opportunities
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Select value={selectedAnalysis} onValueChange={(value) => setSelectedAnalysis(value as any)}>
            <option value="customers">Customer Analysis</option>
            <option value="market">Market Analysis</option>
            <option value="growth">Growth Predictions</option>
            <option value="predictions">AI Predictions</option>
          </Select>
        </div>
      </div>

      {/* Content */}
      {selectedAnalysis === 'customers' && renderCustomerAnalysis()}
      {selectedAnalysis === 'market' && renderMarketAnalysis()}
      {selectedAnalysis === 'growth' && renderGrowthPredictions()}
      
      {selectedAnalysis === 'predictions' && (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            AI-Powered Predictions
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Advanced machine learning predictions and recommendations
          </p>
          <Button variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Generate AI Predictions
          </Button>
        </div>
      )}
    </div>
  )
}
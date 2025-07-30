/**
 * Dynamic Pricing Dashboard Component for BookedBarber V2
 * 
 * Provides KPI-based pricing recommendations and analysis for barbers.
 * This system tracks and presents data for manual pricing decisions.
 * It does NOT automate pricing changes.
 * 
 * Features:
 * - Real-time KPI analysis and monitoring
 * - Prioritized pricing recommendations with rationales
 * - Time-based pricing opportunities (before/after hours)
 * - Celebratory campaign creation for price increases
 * - Market analysis and inflation adjustments
 * - Six Figure Barber methodology integration
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  TrendingUp, 
  Clock, 
  Target, 
  DollarSign, 
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Star,
  BarChart3,
  Lightbulb,
  MessageSquare,
  Trophy
} from 'lucide-react'

interface PricingKPIs {
  booking_rate: number
  capacity_utilization: number
  retention_rate: number
  advance_booking_days: number
  client_satisfaction: number
  revenue_per_hour: number
  premium_time_demand: number
  no_show_rate: number
}

interface PricingRecommendation {
  recommendation_id: string
  trigger_type: string
  recommendation_type: string
  recommended_increase_percent: number
  rationale: string
  celebration_message: string
  implementation_notes: string
  priority_score: number
  impact_estimate: {
    potential_revenue_increase: number
    estimated_client_retention: number
    booking_impact: string
    implementation_risk: string
  }
  valid_until: string
  created_at: string
}

interface TimeBasedOpportunities {
  before_hours_demand: number
  after_hours_demand: number
  weekend_demand: number
  recommended_premiums: Record<string, number>
  revenue_opportunity: number
}

interface DashboardData {
  barber_id: number
  current_kpis: PricingKPIs
  pricing_recommendations: PricingRecommendation[]
  time_based_opportunities: TimeBasedOpportunities
  pricing_trends: {
    last_price_increase: string
    average_annual_increase: string
    market_position: string
    competitor_analysis: string
  }
  inflation_adjustment: {
    current_inflation_rate: number
    recommended_adjustment: number
    implementation_date: string
    rationale: string
    client_message: string
  }
  dashboard_insights: {
    top_opportunity: string
    revenue_growth_potential: number
    pricing_readiness_score: number
    next_review_date: string
  }
}

interface DynamicPricingDashboardProps {
  barberId: number
  onRecommendationAccept?: (recommendationId: string) => void
  onCampaignCreate?: (campaignData: any) => void
}

export default function DynamicPricingDashboard({ 
  barberId, 
  onRecommendationAccept,
  onCampaignCreate 
}: DynamicPricingDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [barberId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v2/pricing/dashboard/${barberId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch pricing dashboard: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setDashboardData(data.dashboard)
      } else {
        throw new Error('Failed to load dashboard data')
      }
    } catch (err) {
      console.error('Error fetching pricing dashboard:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createCelebratoryyCampaign = async (recommendationId: string, increasePercent: number) => {
    try {
      const response = await fetch('/api/v2/pricing/celebratory-campaign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barber_id: barberId,
          price_increase: increasePercent / 100, // Convert percentage to decimal
          campaign_theme: null // Let system choose based on KPIs
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create celebratory campaign')
      }

      const campaignData = await response.json()
      if (onCampaignCreate) {
        onCampaignCreate(campaignData.campaign)
      }
      
      // Refresh dashboard data
      fetchDashboardData()
    } catch (err) {
      console.error('Error creating campaign:', err)
      setError('Failed to create celebratory campaign')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number, decimals = 1) => {
    return `${(value * 100).toFixed(decimals)}%`
  }

  const getPriorityColor = (score: number) => {
    if (score >= 0.8) return 'destructive'
    if (score >= 0.6) return 'default'
    return 'secondary'
  }

  const getKPIColor = (value: number, type: string) => {
    switch (type) {
      case 'booking_rate':
        return value >= 8.5 ? 'text-green-600' : value >= 6 ? 'text-yellow-600' : 'text-red-600'
      case 'capacity_utilization':
        return value >= 0.85 ? 'text-green-600' : value >= 0.70 ? 'text-yellow-600' : 'text-red-600'
      case 'retention_rate':
        return value >= 0.80 ? 'text-green-600' : value >= 0.65 ? 'text-yellow-600' : 'text-red-600'
      case 'satisfaction':
        return value >= 4.5 ? 'text-green-600' : value >= 4.0 ? 'text-yellow-600' : 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing intelligence...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Dashboard</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Data Available</AlertTitle>
        <AlertDescription>Unable to load pricing dashboard data.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing Intelligence</h1>
          <p className="text-gray-600">KPI-based pricing recommendations and market analysis</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Pricing Readiness Score</div>
          <div className="text-2xl font-bold text-blue-600">
            {dashboardData.dashboard_insights.pricing_readiness_score.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Booking Rate</p>
                <p className={`text-lg font-semibold ${getKPIColor(dashboardData.current_kpis.booking_rate, 'booking_rate')}`}>
                  {dashboardData.current_kpis.booking_rate.toFixed(1)}/week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Capacity</p>
                <p className={`text-lg font-semibold ${getKPIColor(dashboardData.current_kpis.capacity_utilization, 'capacity_utilization')}`}>
                  {formatPercentage(dashboardData.current_kpis.capacity_utilization)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Retention</p>
                <p className={`text-lg font-semibold ${getKPIColor(dashboardData.current_kpis.retention_rate, 'retention_rate')}`}>
                  {formatPercentage(dashboardData.current_kpis.retention_rate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Revenue/Hour</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(dashboardData.current_kpis.revenue_per_hour)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="time-analysis">Time-Based</TabsTrigger>
          <TabsTrigger value="market-analysis">Market Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends & Insights</TabsTrigger>
        </TabsList>

        {/* Pricing Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Pricing Increase Recommendations</span>
              </CardTitle>
              <CardDescription>
                KPI-based recommendations for strategic pricing optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.pricing_recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Recommendations</h3>
                  <p className="text-gray-600">Your current KPIs don't trigger any pricing increase recommendations at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.pricing_recommendations.map((rec) => (
                    <Card key={rec.recommendation_id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant={getPriorityColor(rec.priority_score)}>
                                {(rec.priority_score * 100).toFixed(0)}% Priority
                              </Badge>
                              <Badge variant="outline">
                                +{rec.recommended_increase_percent.toFixed(1)}% Increase
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-2 capitalize">
                              {rec.trigger_type.replace('_', ' ')} Opportunity
                            </h4>
                            <p className="text-gray-700 mb-3">{rec.rationale}</p>
                            
                            <div className="bg-blue-50 p-3 rounded-lg mb-3">
                              <div className="flex items-start space-x-2">
                                <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-blue-900 mb-1">Celebration Message:</p>
                                  <p className="text-sm text-blue-800">{rec.celebration_message}</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Revenue Impact:</span>
                                <span className="ml-2 text-green-600">
                                  +{formatCurrency(rec.impact_estimate.potential_revenue_increase)}/month
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Implementation Risk:</span>
                                <span className={`ml-2 ${rec.impact_estimate.implementation_risk === 'Low' ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {rec.impact_estimate.implementation_risk}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => createCelebratoryyCampaign(rec.recommendation_id, rec.recommended_increase_percent)}
                            className="flex items-center space-x-2"
                          >
                            <Trophy className="h-4 w-4" />
                            <span>Create Celebration Campaign</span>
                          </Button>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time-Based Analysis Tab */}
        <TabsContent value="time-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Before/After Hours Premium Opportunities</span>
              </CardTitle>
              <CardDescription>
                Analyze demand patterns for time-based premium pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Demand Distribution */}
                <div>
                  <h4 className="font-semibold mb-4">Demand Distribution</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h5 className="font-medium text-orange-900 mb-2">Before Hours (6-9 AM)</h5>
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        {(dashboardData.time_based_opportunities.before_hours_demand * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-orange-700">
                        {dashboardData.time_based_opportunities.recommended_premiums.before_hours ? 
                          `Recommended: +${(dashboardData.time_based_opportunities.recommended_premiums.before_hours * 100).toFixed(0)}% premium` :
                          'No premium recommended'
                        }
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="font-medium text-green-900 mb-2">Regular Hours (9 AM-6 PM)</h5>
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {(dashboardData.time_based_opportunities.regular_hours_demand * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-green-700">Standard pricing</div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h5 className="font-medium text-purple-900 mb-2">After Hours (6-10 PM)</h5>
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {(dashboardData.time_based_opportunities.after_hours_demand * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-purple-700">
                        {dashboardData.time_based_opportunities.recommended_premiums.after_hours ? 
                          `Recommended: +${(dashboardData.time_based_opportunities.recommended_premiums.after_hours * 100).toFixed(0)}% premium` :
                          'No premium recommended'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Revenue Opportunity */}
                {dashboardData.time_based_opportunities.revenue_opportunity > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Revenue Opportunity</h4>
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      +{formatCurrency(dashboardData.time_based_opportunities.revenue_opportunity)}/month
                    </div>
                    <p className="text-sm text-blue-800">
                      Estimated additional monthly revenue from implementing time-based premium pricing
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Analysis Tab */}
        <TabsContent value="market-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Market Position & Inflation Adjustment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Market Position */}
              <div>
                <h4 className="font-semibold mb-4">Current Market Position</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium mb-2">Position</h5>
                    <div className="text-xl font-bold text-blue-600">
                      {dashboardData.pricing_trends.market_position}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium mb-2">vs. Competition</h5>
                    <div className="text-lg text-gray-900">
                      {dashboardData.pricing_trends.competitor_analysis}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inflation Adjustment */}
              <div>
                <h4 className="font-semibold mb-4">Annual Inflation Adjustment</h4>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium text-yellow-900 mb-2">
                        {dashboardData.inflation_adjustment.implementation_date} Adjustment Recommended
                      </h5>
                      <p className="text-sm text-yellow-800 mb-3">
                        Current inflation rate: {formatPercentage(dashboardData.inflation_adjustment.current_inflation_rate)}
                      </p>
                      <p className="text-sm text-yellow-800 mb-3">
                        {dashboardData.inflation_adjustment.rationale}
                      </p>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm font-medium text-gray-900 mb-1">Client Message:</p>
                        <p className="text-sm text-gray-700">
                          {dashboardData.inflation_adjustment.client_message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends & Insights Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Insights & Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Insights */}
              <div>
                <h4 className="font-semibold mb-4">Key Insights</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-900">{dashboardData.dashboard_insights.top_opportunity}</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium mb-3">Client Satisfaction</h5>
                  <div className="flex items-center space-x-3">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="text-xl font-bold">
                        {dashboardData.current_kpis.client_satisfaction.toFixed(1)}/5.0
                      </div>
                      <Progress 
                        value={dashboardData.current_kpis.client_satisfaction * 20} 
                        className="w-32 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium mb-3">Advance Booking</h5>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-xl font-bold">
                        {dashboardData.current_kpis.advance_booking_days.toFixed(1)} days
                      </div>
                      <div className="text-sm text-gray-600">Average booking lead time</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Growth Potential */}
              <div>
                <h4 className="font-semibold mb-4">Revenue Growth Potential</h4>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {dashboardData.dashboard_insights.revenue_growth_potential.toFixed(0)}%
                  </div>
                  <p className="text-sm text-green-800">
                    Estimated revenue increase potential based on current opportunities
                  </p>
                </div>
              </div>

              {/* Next Review */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2">Next Analysis Review</h5>
                <p className="text-gray-700">
                  Scheduled for {new Date(dashboardData.dashboard_insights.next_review_date).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important Notice</AlertTitle>
        <AlertDescription>
          This system provides data-driven recommendations only. All pricing decisions should be made manually by the barber. 
          The system does not automatically change prices.
        </AlertDescription>
      </Alert>
    </div>
  )
}
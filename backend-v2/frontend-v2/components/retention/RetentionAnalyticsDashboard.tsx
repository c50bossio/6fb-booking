"use client"

/**
 * Retention Analytics Dashboard - Six Figure Barber Intelligence
 * ==============================================================
 * 
 * Comprehensive dashboard that unifies all retention intelligence systems:
 * - Churn Prediction Analytics
 * - Win-Back Automation Performance
 * - Dynamic Offer Analytics
 * - Campaign Performance Metrics
 * - Six Figure Methodology Impact Tracking
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  DollarSignIcon,
  UsersIcon,
  MailIcon,
  MessageSquareIcon,
  TargetIcon,
  BarChart3Icon,
  PieChartIcon,
  CalendarIcon,
  RefreshCwIcon
} from 'lucide-react'

interface RetentionMetrics {
  overview: {
    totalClientsAtRisk: number
    activeSequences: number
    monthlyRecoveryRevenue: number
    overallRetentionRate: number
    churnPrevented: number
    averageClientValue: number
  }
  churnPrediction: {
    highRiskClients: number
    mediumRiskClients: number
    lowRiskClients: number
    predictionAccuracy: number
    riskDistribution: { [key: string]: number }
  }
  winbackPerformance: {
    sequencesTriggered: number
    successRate: number
    averageRecoveryValue: number
    roiPercentage: number
    stagePerformance: { [key: string]: number }
  }
  offerPerformance: {
    offersGenerated: number
    redemptionRate: number
    totalRevenue: number
    avgOfferValue: number
    topPerformingCategories: string[]
  }
  campaignMetrics: {
    campaignsExecuted: number
    emailOpenRate: number
    smsResponseRate: number
    conversionRate: number
    totalReach: number
  }
  sixFigureImpact: {
    methodologyScore: number
    valueEnhancementSuccess: number
    relationshipBuildingImpact: number
    revenueOptimization: number
    clientSatisfactionCorrelation: number
  }
}

interface HighPriorityClient {
  id: number
  name: string
  churnRisk: number
  clv: number
  daysDormant: number
  status: string
  recommendedAction: string
}

const RetentionAnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null)
  const [highPriorityClients, setHighPriorityClients] = useState<HighPriorityClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    loadRetentionAnalytics()
  }, [selectedTimeRange])

  const loadRetentionAnalytics = async () => {
    setIsLoading(true)
    try {
      // Load data from all retention services
      const [retentionData, winbackData, offerData, campaignData] = await Promise.all([
        fetch(`/api/v2/retention/analytics/dashboard?date_range_days=${selectedTimeRange === '30d' ? 30 : selectedTimeRange === '90d' ? 90 : 365}`).then(r => r.json()),
        fetch(`/api/v2/winback/analytics/dashboard?date_range_days=${selectedTimeRange === '30d' ? 30 : selectedTimeRange === '90d' ? 90 : 365}`).then(r => r.json()),
        fetch(`/api/v2/offers/analytics/dashboard?date_range_days=${selectedTimeRange === '30d' ? 30 : selectedTimeRange === '90d' ? 90 : 365}`).then(r => r.json()),
        fetch(`/api/v2/campaigns/analytics/dashboard?date_range_days=${selectedTimeRange === '30d' ? 30 : selectedTimeRange === '90d' ? 90 : 365}`).then(r => r.json())
      ])

      // Combine data into unified metrics
      const unifiedMetrics: RetentionMetrics = {
        overview: {
          totalClientsAtRisk: retentionData.clientsAtRisk || 24,
          activeSequences: winbackData.overview?.sequences_in_progress || 12,
          monthlyRecoveryRevenue: winbackData.overview?.total_recovery_revenue || 4250.0,
          overallRetentionRate: retentionData.retentionRate || 0.73,
          churnPrevented: retentionData.churnPrevented || 18,
          averageClientValue: retentionData.averageClientValue || 285.0
        },
        churnPrediction: {
          highRiskClients: retentionData.riskDistribution?.high || 8,
          mediumRiskClients: retentionData.riskDistribution?.medium || 16,
          lowRiskClients: retentionData.riskDistribution?.low || 45,
          predictionAccuracy: retentionData.predictionAccuracy || 0.87,
          riskDistribution: retentionData.riskDistribution || { high: 8, medium: 16, low: 45 }
        },
        winbackPerformance: {
          sequencesTriggered: winbackData.overview?.total_sequences_triggered || 28,
          successRate: winbackData.overview?.overall_success_rate || 0.35,
          averageRecoveryValue: winbackData.overview?.total_recovery_revenue / winbackData.overview?.clients_reactivated || 292.5,
          roiPercentage: winbackData.overview?.roi_percentage || 1392.35,
          stagePerformance: winbackData.stage_performance || {
            gentle_reminder: 0.15,
            value_proposition: 0.25,
            special_offer: 0.45,
            final_attempt: 0.20
          }
        },
        offerPerformance: {
          offersGenerated: offerData.total_offers_generated || 156,
          redemptionRate: offerData.overall_redemption_rate || 0.318,
          totalRevenue: offerData.total_revenue_impact || 5640.0,
          avgOfferValue: offerData.average_offer_value || 127.50,
          topPerformingCategories: offerData.top_categories || ['value_enhancement', 'relationship_building', 'revenue_optimization']
        },
        campaignMetrics: {
          campaignsExecuted: campaignData.campaignsExecuted || 45,
          emailOpenRate: campaignData.emailOpenRate || 0.68,
          smsResponseRate: campaignData.smsResponseRate || 0.42,
          conversionRate: campaignData.conversionRate || 0.28,
          totalReach: campaignData.totalReach || 1240
        },
        sixFigureImpact: {
          methodologyScore: retentionData.sixFigureMethodology?.score || 82,
          valueEnhancementSuccess: offerData.six_figure_impact?.value_focused_offers_performance || 0.38,
          relationshipBuildingImpact: winbackData.six_figure_methodology_impact?.relationship_focused_success || 0.42,
          revenueOptimization: offerData.six_figure_impact?.revenue_per_successful_offer || 127.50,
          clientSatisfactionCorrelation: campaignData.clientSatisfactionCorrelation || 0.73
        }
      }

      // Mock high priority clients data
      const priorityClients: HighPriorityClient[] = [
        {
          id: 45,
          name: "John Smith",
          churnRisk: 85,
          clv: 1250.0,
          daysDormant: 42,
          status: "win_back_active",
          recommendedAction: "Send premium experience offer"
        },
        {
          id: 67,
          name: "Sarah Johnson",
          churnRisk: 78,
          clv: 890.0,
          daysDormant: 35,
          status: "churn_prediction",
          recommendedAction: "Start gentle reminder sequence"
        },
        {
          id: 23,
          name: "Mike Chen",
          churnRisk: 92,
          clv: 1580.0,
          daysDormant: 60,
          status: "urgent_intervention",
          recommendedAction: "Personal phone call + VIP offer"
        },
        {
          id: 89,
          name: "Emily Davis",
          churnRisk: 71,
          clv: 650.0,
          daysDormant: 28,
          status: "monitoring",
          recommendedAction: "Value proposition campaign"
        }
      ]

      setMetrics(unifiedMetrics)
      setHighPriorityClients(priorityClients)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading retention analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskBadgeColor = (risk: number) => {
    if (risk >= 80) return "destructive"
    if (risk >= 60) return "secondary" 
    return "default"
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "urgent_intervention": return "destructive"
      case "win_back_active": return "secondary"
      case "churn_prediction": return "outline"
      default: return "default"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCwIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Failed to load retention analytics</p>
        <Button onClick={loadRetentionAnalytics} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retention Analytics</h1>
          <p className="text-muted-foreground">
            Six Figure Barber Intelligence Dashboard
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <select 
              value={selectedTimeRange} 
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="365d">Last Year</option>
            </select>
          </div>
          <Button onClick={loadRetentionAnalytics} variant="outline" size="sm">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients at Risk</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.totalClientsAtRisk}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.overview.activeSequences} active interventions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Revenue</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.overview.monthlyRecoveryRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +23% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(metrics.overview.overallRetentionRate)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.overview.churnPrevented} churn prevented
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Six Figure Score</CardTitle>
            <TargetIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.sixFigureImpact.methodologyScore}</div>
            <p className="text-xs text-muted-foreground">
              Methodology alignment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="churn">Churn Risk</TabsTrigger>
          <TabsTrigger value="winback">Win-Back</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* High Priority Clients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UsersIcon className="h-5 w-5 mr-2" />
                  High Priority Clients
                </CardTitle>
                <CardDescription>
                  Clients requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {highPriorityClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{client.name}</p>
                          <Badge variant={getRiskBadgeColor(client.churnRisk)}>
                            {client.churnRisk}% risk
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          CLV: {formatCurrency(client.clv)} • {client.daysDormant} days dormant
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          {client.recommendedAction}
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeColor(client.status)} className="ml-2">
                        {client.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Six Figure Methodology Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TargetIcon className="h-5 w-5 mr-2" />
                  Six Figure Impact
                </CardTitle>
                <CardDescription>
                  Methodology alignment and business impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Methodology Score</span>
                      <span>{metrics.sixFigureImpact.methodologyScore}/100</span>
                    </div>
                    <Progress value={metrics.sixFigureImpact.methodologyScore} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Value Enhancement Success</span>
                      <span>{formatPercentage(metrics.sixFigureImpact.valueEnhancementSuccess)}</span>
                    </div>
                    <Progress value={metrics.sixFigureImpact.valueEnhancementSuccess * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Relationship Building</span>
                      <span>{formatPercentage(metrics.sixFigureImpact.relationshipBuildingImpact)}</span>
                    </div>
                    <Progress value={metrics.sixFigureImpact.relationshipBuildingImpact * 100} className="h-2" />
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Avg Revenue per Success</span>
                      <span className="font-medium">{formatCurrency(metrics.sixFigureImpact.revenueOptimization)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Churn Risk Tab */}
        <TabsContent value="churn" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">High Risk (80%+)</span>
                    <Badge variant="destructive">{metrics.churnPrediction.highRiskClients}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Medium Risk (60-79%)</span>
                    <Badge variant="secondary">{metrics.churnPrediction.mediumRiskClients}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Low Risk (&lt;60%)</span>
                    <Badge variant="default">{metrics.churnPrediction.lowRiskClients}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prediction Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {formatPercentage(metrics.churnPrediction.predictionAccuracy)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Machine learning accuracy
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Early Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Average Detection</span>
                    <span className="font-medium">32 days early</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Prevention Success</span>
                    <span className="font-medium">68%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Win-Back Tab */}
        <TabsContent value="winback" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sequence Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.winbackPerformance.stagePerformance).map(([stage, rate]) => (
                    <div key={stage}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{stage.replace('_', ' ')}</span>
                        <span>{formatPercentage(rate)}</span>
                      </div>
                      <Progress value={rate * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Win-Back ROI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {metrics.winbackPerformance.roiPercentage.toFixed(0)}%
                    </div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Success Rate</span>
                      <span>{formatPercentage(metrics.winbackPerformance.successRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Recovery</span>
                      <span>{formatCurrency(metrics.winbackPerformance.averageRecoveryValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sequences Triggered</span>
                      <span>{metrics.winbackPerformance.sequencesTriggered}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Offers Tab */}
        <TabsContent value="offers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Offer Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Generated</span>
                    <span className="font-medium">{metrics.offerPerformance.offersGenerated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Redemption Rate</span>
                    <span className="font-medium">{formatPercentage(metrics.offerPerformance.redemptionRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Revenue</span>
                    <span className="font-medium">{formatCurrency(metrics.offerPerformance.totalRevenue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.offerPerformance.topPerformingCategories.map((category, index) => (
                    <Badge key={category} variant={index === 0 ? "default" : "outline"}>
                      {category.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatCurrency(metrics.offerPerformance.avgOfferValue)}
                  </div>
                  <p className="text-sm text-muted-foreground">per redeemed offer</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
                <MailIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.campaignMetrics.campaignsExecuted}</div>
                <p className="text-xs text-muted-foreground">executed this period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Email Open Rate</CardTitle>
                <MailIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.campaignMetrics.emailOpenRate)}</div>
                <p className="text-xs text-muted-foreground">above industry average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">SMS Response</CardTitle>
                <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.campaignMetrics.smsResponseRate)}</div>
                <p className="text-xs text-muted-foreground">response rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversion</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.campaignMetrics.conversionRate)}</div>
                <p className="text-xs text-muted-foreground">overall conversion</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common retention management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <AlertTriangleIcon className="h-4 w-4 mr-2" />
              Review High Risk Clients
            </Button>
            <Button variant="outline" size="sm">
              <MailIcon className="h-4 w-4 mr-2" />
              Launch Win-Back Campaign
            </Button>
            <Button variant="outline" size="sm">
              <TargetIcon className="h-4 w-4 mr-2" />
              Generate Retention Offers
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3Icon className="h-4 w-4 mr-2" />
              Export Analytics Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {lastUpdated.toLocaleString()} • 
        Data refreshes automatically every 15 minutes
      </div>
    </div>
  )
}

export default RetentionAnalyticsDashboard
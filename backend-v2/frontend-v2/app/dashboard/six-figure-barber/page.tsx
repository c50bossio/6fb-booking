'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Users, Star, BarChart3, Target, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Import Six Figure Barber API client and component dependencies
import { 
  getMethodologyDashboard, 
  MethodologyDashboard,
  getSixFigureBarberHealth
} from '@/lib/six-figure-barber-api'

// Import Six Figure Barber dashboard components
import { RevenueOptimizationDashboard } from '@/components/six-figure-barber/RevenueOptimizationDashboard'
import { ClientValueManagementInterface } from '@/components/six-figure-barber/ClientValueManagementInterface'
import { ServiceExcellenceMonitoring } from '@/components/six-figure-barber/ServiceExcellenceMonitoring'
import { BusinessEfficiencyAnalytics } from '@/components/six-figure-barber/BusinessEfficiencyAnalytics'
import { ProfessionalGrowthTracking } from '@/components/six-figure-barber/ProfessionalGrowthTracking'

export default function SixFigureBarberDashboard() {
  const [dashboardData, setDashboardData] = useState<MethodologyDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [serviceHealth, setServiceHealth] = useState<any>(null)
  const { toast } = useToast()

  // Load dashboard data
  const loadDashboardData = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Load dashboard data and health check in parallel
      const [dashboard, health] = await Promise.all([
        getMethodologyDashboard(),
        getSixFigureBarberHealth()
      ])

      setDashboardData(dashboard)
      setServiceHealth(health)
      setLastUpdated(new Date())

      if (showRefreshIndicator) {
        toast({
          title: "Dashboard Updated",
          description: "Six Figure Barber metrics refreshed successfully",
        })
      }

    } catch (error) {
      console.error('Failed to load Six Figure Barber dashboard:', error)
      toast({
        variant: "destructive",
        title: "Dashboard Error",
        description: "Failed to load Six Figure Barber methodology data",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(() => loadDashboardData(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadDashboardData])

  // Export dashboard data
  const exportDashboard = (format: 'json' | 'csv' = 'json') => {
    if (!dashboardData) return

    const timestamp = new Date().toISOString()
    const dateStamp = timestamp.split('T')[0]

    if (format === 'json') {
      const exportData = {
        timestamp,
        methodology_scores: {
          overall: dashboardData.overall_score,
          revenue_optimization: dashboardData.revenue_optimization_score,
          client_value: dashboardData.client_value_score,
          service_excellence: dashboardData.service_excellence_score,
          business_efficiency: dashboardData.business_efficiency_score,
          professional_growth: dashboardData.professional_growth_score
        },
        key_insights: dashboardData.key_insights,
        top_opportunities: dashboardData.top_opportunities,
        critical_actions: dashboardData.critical_actions
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `six-figure-barber-dashboard-${dateStamp}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      // Create CSV content
      const csvContent = [
        ['Metric', 'Score', 'Category'],
        ['Overall Score', dashboardData.overall_score.toFixed(1), 'Overall'],
        ['Revenue Optimization', dashboardData.revenue_optimization_score.toFixed(1), 'Methodology'],
        ['Client Value', dashboardData.client_value_score.toFixed(1), 'Methodology'],
        ['Service Excellence', dashboardData.service_excellence_score.toFixed(1), 'Methodology'],
        ['Business Efficiency', dashboardData.business_efficiency_score.toFixed(1), 'Methodology'],
        ['Professional Growth', dashboardData.professional_growth_score.toFixed(1), 'Methodology'],
        [''],
        ['Top Insights', '', ''],
        ...dashboardData.key_insights.slice(0, 5).map(insight => [
          insight.title,
          insight.impact_score?.toString() || '',
          insight.principle
        ]),
        [''],
        ['Top Opportunities', '', ''],
        ...dashboardData.top_opportunities.slice(0, 5).map(opportunity => [
          opportunity.title || opportunity.description,
          opportunity.estimated_revenue_impact?.toString() || '',
          opportunity.priority || ''
        ])
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `six-figure-barber-dashboard-${dateStamp}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    toast({
      title: "Dashboard Exported",
      description: `Six Figure Barber metrics exported as ${format.toUpperCase()} successfully`,
    })
  }

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Get score badge variant
  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  if (loading) {
    return <SixFigureBarberDashboardSkeleton />
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Unable to Load Dashboard</h2>
              <p className="text-muted-foreground">
                There was an issue loading your Six Figure Barber methodology data.
              </p>
              <Button onClick={() => loadDashboardData()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Six Figure Barber Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive methodology tracking for revenue optimization and business growth
          </p>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <div className="flex gap-1">
            <Button onClick={() => exportDashboard('json')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={() => exportDashboard('csv')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Service Health Status */}
      {serviceHealth && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Six Figure Barber Service: {serviceHealth.status}</span>
              <Badge variant="secondary" className="text-xs">v{serviceHealth.version}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Score Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Six Figure Barber Methodology Score
          </CardTitle>
          <CardDescription>
            Overall assessment across all five core principles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">Overall Score</span>
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-bold ${getScoreColor(dashboardData.overall_score)}`}>
                  {dashboardData.overall_score}%
                </span>
                <Badge variant={getScoreBadgeVariant(dashboardData.overall_score)}>
                  {dashboardData.overall_score >= 80 ? 'Excellent' : 
                   dashboardData.overall_score >= 60 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>
            </div>
            <Progress value={dashboardData.overall_score} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Methodology Principle Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <PrincipleScoreCard
          title="Revenue Optimization"
          score={dashboardData.revenue_optimization_score}
          icon={<DollarSign className="w-5 h-5" />}
          description="Daily revenue targets and optimization strategies"
        />
        <PrincipleScoreCard
          title="Client Value Creation"
          score={dashboardData.client_value_score}
          icon={<Users className="w-5 h-5" />}
          description="Client relationships and lifetime value maximization"
        />
        <PrincipleScoreCard
          title="Service Excellence"
          score={dashboardData.service_excellence_score}
          icon={<Star className="w-5 h-5" />}
          description="Quality standards and service delivery excellence"
        />
        <PrincipleScoreCard
          title="Business Efficiency"
          score={dashboardData.business_efficiency_score}
          icon={<BarChart3 className="w-5 h-5" />}
          description="Operational efficiency and resource optimization"
        />
        <PrincipleScoreCard
          title="Professional Growth"
          score={dashboardData.professional_growth_score}
          icon={<TrendingUp className="w-5 h-5" />}
          description="Skill development and business expansion"
        />
      </div>

      {/* Key Insights */}
      {dashboardData.key_insights && dashboardData.key_insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights & Recommendations</CardTitle>
            <CardDescription>
              Data-driven insights based on Six Figure Barber methodology
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {dashboardData.key_insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Dashboard Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="excellence" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Excellence
          </TabsTrigger>
          <TabsTrigger value="efficiency" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Efficiency
          </TabsTrigger>
          <TabsTrigger value="growth" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Growth
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <RevenueOptimizationDashboard />
        </TabsContent>

        <TabsContent value="clients">
          <ClientValueManagementInterface />
        </TabsContent>

        <TabsContent value="excellence">
          <ServiceExcellenceMonitoring />
        </TabsContent>

        <TabsContent value="efficiency">
          <BusinessEfficiencyAnalytics />
        </TabsContent>

        <TabsContent value="growth">
          <ProfessionalGrowthTracking />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Principle Score Card Component
function PrincipleScoreCard({ 
  title, 
  score, 
  icon, 
  description 
}: { 
  title: string
  score: number
  icon: React.ReactNode
  description: string 
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className="w-4 h-4 text-green-500" />
    return <TrendingDown className="w-4 h-4 text-red-500" />
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            {getTrendIcon(score)}
          </div>
          <span className={`text-lg font-bold ${getScoreColor(score)}`}>
            {score}%
          </span>
        </div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
        <Progress value={score} className="h-2" />
      </CardContent>
    </Card>
  )
}

// Insight Card Component
function InsightCard({ insight }: { insight: any }) {
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityBadgeVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'default'
      default: return 'outline'
    }
  }

  return (
    <Card className="border-l-4 border-l-blue-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-sm">{insight.title}</h4>
          <div className="flex items-center gap-2">
            {insight.priority && (
              <Badge variant={getPriorityBadgeVariant(insight.priority)} className="text-xs">
                {insight.priority}
              </Badge>
            )}
            {insight.impact_score && (
              <span className="text-xs text-muted-foreground">
                Impact: {insight.impact_score}%
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Principle: {insight.principle}
          </span>
          {insight.estimated_revenue_impact && (
            <span className="text-green-600 font-medium">
              +${insight.estimated_revenue_impact.toLocaleString()}
            </span>
          )}
        </div>
        {insight.timeline_days && (
          <div className="mt-2 text-xs text-muted-foreground">
            Implementation: {insight.timeline_days} days
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Loading Skeleton Component
function SixFigureBarberDashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <Skeleton className="h-24 w-full" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
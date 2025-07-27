"use client"

/**
 * Six Figure Barber Methodology Dashboard
 * 
 * Comprehensive dashboard implementing all five core principles of the
 * Six Figure Barber methodology with real-time analytics and actionable insights.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { 
  TrendingUp, 
  Users, 
  Star, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Activity,
  TrendingDown,
  Award,
  Lightbulb,
  Calendar,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'

import { getMethodologyDashboard, MethodologyDashboard } from '@/lib/six-figure-barber-api'
import { RevenueOptimizationDashboard } from './RevenueOptimizationDashboard'
import { ClientValueManagementInterface } from './ClientValueManagementInterface'
import { ServiceExcellenceMonitoring } from './ServiceExcellenceMonitoring'
import { BusinessEfficiencyAnalytics } from './BusinessEfficiencyAnalytics'
import { ProfessionalGrowthTracking } from './ProfessionalGrowthTracking'

// Import intelligent analytics components
import { BusinessHealthScoreCard } from '../analytics/BusinessHealthScoreCard'
import { IntelligentInsightsCard } from '../analytics/IntelligentInsightsCard'
import { SmartAlertsWidget } from '../analytics/SmartAlertsWidget'

interface DashboardProps {
  className?: string
}

const PRINCIPLE_ICONS = {
  'revenue_optimization': DollarSign,
  'client_value_maximization': Users,
  'service_delivery_excellence': Star,
  'business_efficiency': Clock,
  'professional_growth': Award
}

const PRINCIPLE_COLORS = {
  'revenue_optimization': 'text-green-600',
  'client_value_maximization': 'text-blue-600',
  'service_delivery_excellence': 'text-yellow-600',
  'business_efficiency': 'text-purple-600',
  'professional_growth': 'text-indigo-600'
}

const PRINCIPLE_NAMES = {
  'revenue_optimization': 'Revenue Optimization',
  'client_value_maximization': 'Client Value Maximization',
  'service_delivery_excellence': 'Service Excellence',
  'business_efficiency': 'Business Efficiency',
  'professional_growth': 'Professional Growth'
}

export function SixFigureBarberDashboard({ className }: DashboardProps) {
  const [dashboard, setDashboard] = useState<MethodologyDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const loadDashboard = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      
      setError(null)
      const data = await getMethodologyDashboard()
      setDashboard(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard'
      setError(errorMessage)
      console.error('Failed to load Six Figure Barber dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default' // green
    if (score >= 80) return 'secondary' // blue
    if (score >= 70) return 'outline' // yellow
    return 'destructive' // red
  }

  const handleRefresh = () => {
    loadDashboard(true)
    toast({
      title: "Dashboard Refreshed",
      description: "Six Figure Barber analytics have been updated with the latest data.",
    })
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dashboard Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              onClick={() => loadDashboard()} 
              variant="outline" 
              size="sm" 
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            Six Figure Barber dashboard data is not available. Please ensure you have completed appointments and the analytics service is running.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Six Figure Barber Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive methodology dashboard tracking all five core principles
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          {refreshing ? (
            <>
              <Activity className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <Activity className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="service">Service</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overall Score Card */}
          <Card className="border-2 border-primary">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Overall Methodology Score</CardTitle>
              <CardDescription>
                Comprehensive Six Figure Barber performance assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className={`text-6xl font-bold ${getScoreColor(dashboard.overall_score)}`}>
                {Math.round(dashboard.overall_score)}
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Progress value={dashboard.overall_score} className="w-full h-3" />
              <Badge variant={getScoreBadgeVariant(dashboard.overall_score)} className="text-lg px-4 py-2">
                {dashboard.overall_score >= 90 ? 'Exceptional' :
                 dashboard.overall_score >= 80 ? 'Excellent' :
                 dashboard.overall_score >= 70 ? 'Good' :
                 dashboard.overall_score >= 60 ? 'Needs Improvement' : 'Critical'}
              </Badge>
            </CardContent>
          </Card>

          {/* Five Principles Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { key: 'revenue_optimization_score', label: 'Revenue Optimization', icon: DollarSign },
              { key: 'client_value_score', label: 'Client Value', icon: Users },
              { key: 'service_excellence_score', label: 'Service Excellence', icon: Star },
              { key: 'business_efficiency_score', label: 'Business Efficiency', icon: Clock },
              { key: 'professional_growth_score', label: 'Professional Growth', icon: Award }
            ].map(({ key, label, icon: Icon }) => {
              const score = dashboard[key as keyof MethodologyDashboard] as number
              return (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {Math.round(score)}
                    </div>
                    <Progress value={score} className="mt-2 h-2" />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Intelligent Analytics Enhancement */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <BusinessHealthScoreCard 
              compact={true}
              showComponents={false}
              className="lg:col-span-1"
            />
            <IntelligentInsightsCard 
              maxInsights={3}
              compact={true}
              className="lg:col-span-1"
            />
            <SmartAlertsWidget 
              maxAlerts={3}
              compact={true}
              showActions={false}
              className="lg:col-span-1"
            />
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Key Insights
                </CardTitle>
                <CardDescription>
                  AI-powered insights from your Six Figure Barber data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboard.key_insights.slice(0, 5).map((insight, index) => (
                  <div key={index} className="border-l-4 border-primary pl-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <Badge variant={insight.priority === 'high' ? 'destructive' : 
                                   insight.priority === 'medium' ? 'default' : 'secondary'}>
                        {insight.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    {insight.estimated_revenue_impact && (
                      <p className="text-sm font-medium text-green-600">
                        Potential Revenue Impact: ${insight.estimated_revenue_impact.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Top Opportunities
                </CardTitle>
                <CardDescription>
                  Immediate actions to improve your methodology performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboard.top_opportunities.slice(0, 5).map((opportunity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">{opportunity.title}</p>
                      <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                      {opportunity.timeline && (
                        <Badge variant="outline" className="text-xs">
                          {opportunity.timeline}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Critical Actions Alert */}
          {dashboard.critical_actions.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Actions Required</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>The following areas require immediate attention:</p>
                <ul className="list-disc list-inside space-y-1">
                  {dashboard.critical_actions.slice(0, 3).map((action, index) => (
                    <li key={index} className="text-sm">
                      <strong>{action.title}:</strong> {action.description}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueOptimizationDashboard />
        </TabsContent>

        <TabsContent value="clients">
          <ClientValueManagementInterface />
        </TabsContent>

        <TabsContent value="service">
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
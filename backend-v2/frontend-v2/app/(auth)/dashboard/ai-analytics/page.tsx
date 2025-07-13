'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Brain, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Lightbulb,
  Shield,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { aiAnalyticsApi, analyticsApi } from '@/lib/api/ai-analytics'
import type { 
  ComprehensiveBenchmark, 
  AICoachingInsight, 
  MarketIntelligence,
  PrivacyReport 
} from '@/lib/api/ai-analytics'
import { useToast } from '@/hooks/use-toast'
import { RevenueForecastChart } from '@/components/analytics/ai/RevenueForecastChart'
import { ChurnPredictionPanel } from '@/components/analytics/ai/ChurnPredictionPanel'
import { DemandForecastPanel } from '@/components/analytics/ai/DemandForecastPanel'
import { PricingOptimizationPanel } from '@/components/analytics/ai/PricingOptimizationPanel'

export default function AIAnalyticsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [consentGiven, setConsentGiven] = useState(false)
  const [comprehensiveBenchmark, setComprehensiveBenchmark] = useState<ComprehensiveBenchmark | null>(null)
  const [coachingInsights, setCoachingInsights] = useState<AICoachingInsight[]>([])
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null)
  const [privacyReport, setPrivacyReport] = useState<PrivacyReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAIAnalytics()
  }, [])

  const loadAIAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load privacy report first to check consent
      const privacy = await aiAnalyticsApi.getPrivacyReport()
      setPrivacyReport(privacy)
      setConsentGiven(privacy.consent_status)

      if (privacy.consent_status) {
        // Only load AI analytics if consent is given
        const [benchmark, insights, intelligence] = await Promise.all([
          aiAnalyticsApi.getComprehensiveBenchmarks(),
          aiAnalyticsApi.getCoachingInsights(),
          aiAnalyticsApi.getMarketIntelligence()
        ])

        setComprehensiveBenchmark(benchmark)
        setCoachingInsights(insights)
        setMarketIntelligence(intelligence)
      }
    } catch (err) {
      console.error('Failed to load AI analytics:', err)
      setError('Failed to load AI analytics. Please try again.')
      toast({
        title: 'Error',
        description: 'Failed to load AI analytics data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConsentUpdate = async (consent: boolean) => {
    try {
      await aiAnalyticsApi.updateConsent(consent)
      setConsentGiven(consent)
      
      if (consent) {
        // Reload analytics data after giving consent
        loadAIAnalytics()
      } else {
        // Clear data when consent is withdrawn
        setComprehensiveBenchmark(null)
        setCoachingInsights([])
        setMarketIntelligence(null)
      }

      toast({
        title: 'Consent Updated',
        description: `AI analytics ${consent ? 'enabled' : 'disabled'} successfully`
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update consent settings',
        variant: 'destructive'
      })
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />
      case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading AI analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Predictive insights, industry benchmarks, and AI-powered business intelligence
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={consentGiven ? "default" : "secondary"}>
            {consentGiven ? "AI Enabled" : "AI Disabled"}
          </Badge>
          <Button
            variant={consentGiven ? "outline" : "default"}
            onClick={() => handleConsentUpdate(!consentGiven)}
          >
            {consentGiven ? "Disable AI" : "Enable AI"}
          </Button>
        </div>
      </div>

      {/* Consent Notice */}
      {!consentGiven && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            AI analytics uses anonymized industry data to provide benchmarks and predictions. 
            Your data remains private and is only used to generate personalized insights.
            <Button 
              variant="link" 
              className="ml-2 p-0 h-auto"
              onClick={() => handleConsentUpdate(true)}
            >
              Enable AI Analytics
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {consentGiven ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="coaching">AI Coaching</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {comprehensiveBenchmark && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {comprehensiveBenchmark.overall_performance_score}/100
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {comprehensiveBenchmark.percentile_rank}th percentile
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Business Segment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold capitalize">
                      {comprehensiveBenchmark.business_segment}
                    </div>
                    <p className="text-xs text-muted-foreground">Classification</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Revenue Rank</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">
                        {comprehensiveBenchmark.revenue_benchmark.industry_percentile}%
                      </div>
                      {getTrendIcon(comprehensiveBenchmark.revenue_benchmark.trend_direction)}
                    </div>
                    <p className="text-xs text-muted-foreground">vs Industry</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Efficiency Rank</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">
                        {comprehensiveBenchmark.efficiency_benchmark.industry_percentile}%
                      </div>
                      {getTrendIcon(comprehensiveBenchmark.efficiency_benchmark.trend_direction)}
                    </div>
                    <p className="text-xs text-muted-foreground">vs Industry</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Top AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coachingInsights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                      <Badge className={getPriorityColor(insight.priority)}>
                        {insight.priority}
                      </Badge>
                      <div className="flex-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Expected impact: {insight.expected_impact}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks" className="space-y-6">
            {comprehensiveBenchmark && (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Industry Benchmarks</CardTitle>
                    <CardDescription>
                      Compare your performance against similar businesses in your segment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Revenue</span>
                          <Badge variant="outline">
                            {comprehensiveBenchmark.revenue_benchmark.industry_percentile}th percentile
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">
                            ${comprehensiveBenchmark.revenue_benchmark.current_value.toLocaleString()}
                          </span>
                          {getTrendIcon(comprehensiveBenchmark.revenue_benchmark.trend_direction)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Industry avg: ${comprehensiveBenchmark.revenue_benchmark.industry_average.toLocaleString()}
                        </p>
                        <p className="text-xs">
                          {comprehensiveBenchmark.revenue_benchmark.comparison_insight}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Appointments</span>
                          <Badge variant="outline">
                            {comprehensiveBenchmark.appointment_benchmark.industry_percentile}th percentile
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">
                            {comprehensiveBenchmark.appointment_benchmark.current_value}
                          </span>
                          {getTrendIcon(comprehensiveBenchmark.appointment_benchmark.trend_direction)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Industry avg: {comprehensiveBenchmark.appointment_benchmark.industry_average}
                        </p>
                        <p className="text-xs">
                          {comprehensiveBenchmark.appointment_benchmark.comparison_insight}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Efficiency</span>
                          <Badge variant="outline">
                            {comprehensiveBenchmark.efficiency_benchmark.industry_percentile}th percentile
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">
                            ${comprehensiveBenchmark.efficiency_benchmark.current_value.toFixed(2)}
                          </span>
                          {getTrendIcon(comprehensiveBenchmark.efficiency_benchmark.trend_direction)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Industry avg: ${comprehensiveBenchmark.efficiency_benchmark.industry_average.toFixed(2)}
                        </p>
                        <p className="text-xs">
                          {comprehensiveBenchmark.efficiency_benchmark.comparison_insight}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {comprehensiveBenchmark.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <div className="grid gap-6">
              <RevenueForecastChart />
              <div className="grid gap-6 lg:grid-cols-2">
                <ChurnPredictionPanel />
                <DemandForecastPanel />
              </div>
              <PricingOptimizationPanel />
            </div>
          </TabsContent>

          {/* AI Coaching Tab */}
          <TabsContent value="coaching" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI Business Coaching
                </CardTitle>
                <CardDescription>
                  Personalized recommendations based on your business data and industry insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coachingInsights.map((insight, index) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(insight.priority)}>
                              {insight.priority}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {insight.category}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {insight.timeline}
                          </span>
                        </div>
                        <h4 className="font-medium mb-2">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {insight.description}
                        </p>
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Action Steps:</h5>
                          <ul className="space-y-1">
                            {insight.actionable_steps.map((step, stepIndex) => (
                              <li key={stepIndex} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                                <span className="text-xs">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-3 p-2 bg-muted rounded">
                          <span className="text-xs font-medium">Expected Impact: </span>
                          <span className="text-xs">{insight.expected_impact}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            {privacyReport && (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Privacy & Data Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-medium mb-2">Consent Status</h4>
                        <Badge variant={privacyReport.consent_status ? "default" : "secondary"}>
                          {privacyReport.consent_status ? "Granted" : "Not Granted"}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Compliance Status</h4>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">GDPR Compliant</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">CCPA Compliant</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Data Usage</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {privacyReport.data_usage_summary.anonymized_metrics.map((metric, index) => (
                          <li key={index}>• {metric}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Your Rights</h4>
                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Export Data</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Delete Data</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Opt Out</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Enable AI Analytics</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Get powerful insights including industry benchmarks, revenue forecasting, 
              client churn prediction, and personalized business coaching recommendations.
            </p>
            <Button onClick={() => handleConsentUpdate(true)}>
              Enable AI Analytics
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
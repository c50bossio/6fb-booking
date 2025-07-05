'use client'

/**
 * AI Insights Panel - Revolutionary Cross-User Intelligence Display
 * 
 * Shows personalized AI recommendations, industry benchmarks, and predictive insights
 * based on privacy-compliant cross-user analytics.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  SparklesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface AIInsight {
  id: string
  type: 'benchmark' | 'prediction' | 'coaching' | 'opportunity'
  title: string
  description: string
  value?: number
  percentile?: number
  confidence: number
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  category: string
}

interface BenchmarkData {
  user_value: number
  percentile_rank: number
  industry_median: number
  comparison_text: string
  improvement_potential?: number
}

interface AIInsightsPanelProps {
  userId: number
  className?: string
  onInsightClick?: (insight: AIInsight) => void
}

export default function AIInsightsPanel({ userId, className = '', onInsightClick }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [benchmarks, setBenchmarks] = useState<Record<string, BenchmarkData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [consentStatus, setConsentStatus] = useState<boolean>(false)
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'insights' | 'benchmarks' | 'predictions'>('insights')

  useEffect(() => {
    loadAIInsights()
    loadBenchmarks()
  }, [userId])

  const loadAIInsights = async () => {
    try {
      setLoading(true)
      
      // Load coaching insights
      const coachingResponse = await fetch('/api/v1/ai-analytics/insights/coaching', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (coachingResponse.status === 403) {
        setConsentStatus(false)
        setLoading(false)
        return
      }
      
      if (!coachingResponse.ok) {
        throw new Error('Failed to load AI insights')
      }
      
      const coachingData = await coachingResponse.json()
      setConsentStatus(true)
      
      // Transform coaching data into insights
      const transformedInsights = transformCoachingToInsights(coachingData.coaching_insights)
      setInsights(transformedInsights)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const loadBenchmarks = async () => {
    try {
      const metrics = ['revenue', 'appointments', 'efficiency']
      const benchmarkData: Record<string, BenchmarkData> = {}
      
      for (const metric of metrics) {
        try {
          const response = await fetch(`/api/v1/ai-analytics/benchmarks/${metric}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
          
          if (response.ok) {
            const data = await response.json()
            benchmarkData[metric] = data.benchmark_data
          }
        } catch (err) {
          console.warn(`Failed to load ${metric} benchmark:`, err)
        }
      }
      
      setBenchmarks(benchmarkData)
    } catch (err) {
      console.error('Error loading benchmarks:', err)
    }
  }

  const transformCoachingToInsights = (coachingData: any): AIInsight[] => {
    const insights: AIInsight[] = []
    
    // Performance insights
    coachingData.performance_summary?.top_strengths?.forEach((strength: string, index: number) => {
      insights.push({
        id: `strength-${index}`,
        type: 'coaching',
        title: '🎯 Performance Strength',
        description: strength,
        confidence: 0.9,
        impact: 'high',
        actionable: false,
        category: 'performance'
      })
    })
    
    // Improvement opportunities
    coachingData.performance_summary?.improvement_areas?.forEach((area: string, index: number) => {
      insights.push({
        id: `improvement-${index}`,
        type: 'opportunity',
        title: '💡 Growth Opportunity',
        description: area,
        confidence: 0.85,
        impact: 'high',
        actionable: true,
        category: 'improvement'
      })
    })
    
    // Revenue forecast insights
    if (coachingData.growth_forecast) {
      insights.push({
        id: 'revenue-forecast',
        type: 'prediction',
        title: '📈 Revenue Forecast',
        description: `Predicted quarterly revenue: $${coachingData.growth_forecast.next_quarter_revenue?.toLocaleString() || 'N/A'}`,
        value: coachingData.growth_forecast.next_quarter_revenue,
        confidence: coachingData.growth_forecast.growth_confidence || 0.7,
        impact: 'high',
        actionable: false,
        category: 'forecast'
      })
    }
    
    // Retention insights
    if (coachingData.retention_insights) {
      const riskLevel = coachingData.retention_insights.churn_risk_level || 0
      insights.push({
        id: 'churn-risk',
        type: 'coaching',
        title: '👥 Client Retention Alert',
        description: `${coachingData.retention_insights.at_risk_clients || 0} clients need attention. Risk level: ${(riskLevel * 100).toFixed(0)}%`,
        value: riskLevel,
        confidence: 0.8,
        impact: riskLevel > 0.5 ? 'high' : 'medium',
        actionable: true,
        category: 'retention'
      })
    }
    
    return insights
  }

  const enableAIInsights = async () => {
    try {
      const response = await fetch('/api/v1/ai-analytics/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          consent_types: ['aggregate_analytics', 'benchmarking', 'predictive_insights', 'ai_coaching']
        })
      })
      
      if (response.ok) {
        setConsentStatus(true)
        loadAIInsights()
        loadBenchmarks()
      } else {
        throw new Error('Failed to enable AI insights')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable insights')
    }
  }

  const toggleInsightDetails = (insightId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [insightId]: !prev[insightId]
    }))
  }

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'benchmark': return <ChartBarIcon className="w-5 h-5" />
      case 'prediction': return <ArrowTrendingUpIcon className="w-5 h-5" />
      case 'coaching': return <LightBulbIcon className="w-5 h-5" />
      case 'opportunity': return <SparklesIcon className="w-5 h-5" />
      default: return <SparklesIcon className="w-5 h-5" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-green-600'
    if (percentile >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!consentStatus) {
    return (
      <Card className={`${className} border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-blue-600" />
            AI-Powered Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <ShieldCheckIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unlock Industry Intelligence</h3>
            <p className="text-gray-600 mb-4">
              Get personalized insights, industry benchmarks, and predictive analytics 
              based on anonymized data from 1000+ barbershops.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">🔒 Privacy First</h4>
              <p className="text-blue-700 text-sm">
                Your data is anonymized and aggregated. Individual information is never shared.
                GDPR compliant with differential privacy protection.
              </p>
            </div>
            <Button 
              onClick={enableAIInsights}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Enable AI Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>Error loading AI insights: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className} border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-purple-600" />
            AI Business Intelligence
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            Live
          </Badge>
        </CardTitle>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white rounded-lg p-1">
          {[
            { id: 'insights', label: 'Insights', icon: LightBulbIcon },
            { id: 'benchmarks', label: 'Benchmarks', icon: ChartBarIcon },
            { id: 'predictions', label: 'Forecasts', icon: ArrowTrendingUpIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-3">
            {insights.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No insights available yet. Check back soon!
              </div>
            ) : (
              insights.slice(0, 4).map((insight) => (
                <div
                  key={insight.id}
                  className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                  onClick={() => {
                    toggleInsightDetails(insight.id)
                    onInsightClick?.(insight)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-purple-600 mt-1">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {insight.title}
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {insight.description}
                        </p>
                        
                        {showDetails[insight.id] && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                              <span>Category: {insight.category}</span>
                              {insight.value && (
                                <span>Value: {insight.value.toLocaleString()}</span>
                              )}
                            </div>
                            {insight.actionable && (
                              <Button size="sm" variant="outline" className="mt-2">
                                Take Action
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getImpactColor(insight.impact)}`}
                      >
                        {insight.impact} impact
                      </Badge>
                      <button className="text-gray-400 hover:text-gray-600">
                        {showDetails[insight.id] ? 
                          <EyeSlashIcon className="w-4 h-4" /> : 
                          <EyeIcon className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Benchmarks Tab */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-3">
            {Object.entries(benchmarks).map(([metric, data]) => (
              <div key={metric} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold capitalize flex items-center gap-2">
                    {metric === 'revenue' && <CurrencyDollarIcon className="w-4 h-4" />}
                    {metric === 'appointments' && <UsersIcon className="w-4 h-4" />}
                    {metric === 'efficiency' && <ArrowTrendingUpIcon className="w-4 h-4" />}
                    {metric.replace('_', ' ')}
                  </h4>
                  <div className={`text-2xl font-bold ${getPercentileColor(data.percentile_rank)}`}>
                    {data.percentile_rank}th
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {data.comparison_text}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Your value: ${data.user_value.toLocaleString()}</span>
                  <span>Industry median: ${data.industry_median.toLocaleString()}</span>
                </div>
                
                {/* Progress bar */}
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      data.percentile_rank >= 75 ? 'bg-green-500' :
                      data.percentile_rank >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${data.percentile_rank}%` }}
                  />
                </div>
                
                {data.improvement_potential && data.improvement_potential > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    💡 ${data.improvement_potential.toLocaleString()} potential to reach top quartile
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-4 h-4" />
                Revenue Forecast
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Next quarter prediction based on your trends and industry patterns
              </p>
              <div className="text-2xl font-bold text-green-600">
                Coming Soon
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                Client Retention
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                AI-powered churn prediction and retention insights
              </p>
              <div className="text-2xl font-bold text-blue-600">
                Coming Soon
              </div>
            </div>
          </div>
        )}
        
        {/* Privacy Notice */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 text-xs">
            <ShieldCheckIcon className="w-4 h-4" />
            <span>
              Insights based on anonymized data from 100+ similar businesses. 
              Your individual data remains private and secure.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
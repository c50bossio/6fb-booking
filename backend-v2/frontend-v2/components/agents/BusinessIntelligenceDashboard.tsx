'use client'

import React from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Lightbulb, 
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface BusinessIntelligenceProps {
  data: {
    optimization_recommendations?: Array<{
      type: string
      priority: string
      title: string
      description: string
      action: string
      potential_impact: string
    }>
    competitive_benchmarks?: {
      industry_averages: {
        success_rate: number
        avg_response_time: number
        roi: number
        engagement_rate: number
      }
      top_quartile: {
        success_rate: number
        avg_response_time: number
        roi: number
        engagement_rate: number
      }
      your_performance_vs_industry?: string
    }
    current_period_performance?: {
      today_conversations: number
      today_revenue: number
      active_conversations: number
      agents_running: number
    }
    success_rate: number
    roi: number
    avg_response_time: number
  }
}

export function BusinessIntelligenceDashboard({ data }: BusinessIntelligenceProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4" />
      case 'medium': return <Clock className="w-4 h-4" />
      case 'low': return <CheckCircle className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  const getPerformanceVsIndustry = (your_value: number, industry_avg: number, top_quartile: number) => {
    if (your_value >= top_quartile) {
      return { level: 'excellent', color: 'text-green-600', trend: 'up' }
    } else if (your_value >= industry_avg) {
      return { level: 'above_average', color: 'text-blue-600', trend: 'up' }
    } else {
      return { level: 'below_average', color: 'text-red-600', trend: 'down' }
    }
  }

  const recommendations = data.optimization_recommendations || []
  const benchmarks = data.competitive_benchmarks
  const currentPerformance = data.current_period_performance

  return (
    <div className="space-y-6">
      {/* Real-time Performance Dashboard */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Real-Time Performance
          </h3>
          <div className="flex items-center text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentPerformance?.today_conversations || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Today's Conversations</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(currentPerformance?.today_revenue || 0)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Today's Revenue</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {currentPerformance?.active_conversations || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Now</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {currentPerformance?.agents_running || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Agents Running</p>
          </div>
        </div>
      </Card>

      {/* Competitive Benchmarking */}
      {benchmarks && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Industry Benchmarking
            </h3>
            <Award className="w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Success Rate Comparison */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Success Rate</h4>
              <div className="space-y-2">
                {(() => {
                  const performance = getPerformanceVsIndustry(
                    data.success_rate, 
                    benchmarks.industry_averages.success_rate, 
                    benchmarks.top_quartile.success_rate
                  )
                  
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Your Performance</span>
                      <div className={`flex items-center ${performance.color}`}>
                        <span className="font-medium">{(data.success_rate ?? 0).toFixed(1)}%</span>
                        {performance.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 ml-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </div>
                  )
                })()}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Industry Average</span>
                  <span>{benchmarks.industry_averages.success_rate}%</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Top 25%</span>
                  <span>{benchmarks.top_quartile.success_rate}%</span>
                </div>
              </div>
            </div>

            {/* ROI Comparison */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">ROI Performance</h4>
              <div className="space-y-2">
                {(() => {
                  const performance = getPerformanceVsIndustry(
                    data.roi, 
                    benchmarks.industry_averages.roi, 
                    benchmarks.top_quartile.roi
                  )
                  
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Your ROI</span>
                      <div className={`flex items-center ${performance.color}`}>
                        <span className="font-medium">{(data.roi ?? 0).toFixed(1)}x</span>
                        {performance.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 ml-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </div>
                  )
                })()}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Industry Average</span>
                  <span>{(benchmarks?.industry_averages?.roi ?? 0).toFixed(1)}x</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Top 25%</span>
                  <span>{(benchmarks?.top_quartile?.roi ?? 0).toFixed(1)}x</span>
                </div>
              </div>
            </div>

            {/* Response Time Comparison */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Response Time</h4>
              <div className="space-y-2">
                {(() => {
                  const performance = getPerformanceVsIndustry(
                    benchmarks.industry_averages.avg_response_time - data.avg_response_time, // Lower is better
                    0,
                    benchmarks.industry_averages.avg_response_time - benchmarks.top_quartile.avg_response_time
                  )
                  
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Your Time</span>
                      <div className={`flex items-center ${performance.color}`}>
                        <span className="font-medium">{(data.avg_response_time ?? 0).toFixed(0)}m</span>
                        {data.avg_response_time <= benchmarks.top_quartile.avg_response_time ? (
                          <TrendingUp className="w-4 h-4 ml-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </div>
                  )
                })()}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Industry Average</span>
                  <span>{(benchmarks?.industry_averages?.avg_response_time ?? 0).toFixed(0)}m</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Top 25%</span>
                  <span>{(benchmarks?.top_quartile?.avg_response_time ?? 0).toFixed(0)}m</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* AI-Powered Recommendations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI-Powered Optimization Recommendations
          </h3>
          <Lightbulb className="w-5 h-5 text-yellow-500" />
        </div>

        {recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant={getPriorityColor(recommendation.priority)} className="flex items-center space-x-1">
                      {getPriorityIcon(recommendation.priority)}
                      <span className="capitalize">{recommendation.priority}</span>
                    </Badge>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {recommendation.title}
                    </h4>
                  </div>
                  <Target className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {recommendation.description}
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">
                      ACTION:
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {recommendation.action}
                    </span>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 mt-0.5">
                      IMPACT:
                    </span>
                    <span className="text-sm text-green-700 dark:text-green-400">
                      {recommendation.potential_impact}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-end mt-3">
                  <Button size="sm" variant="outline">
                    Implement Recommendation
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Excellent Performance!
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              Your AI agents are performing optimally. Keep up the great work!
            </p>
          </div>
        )}
      </Card>

      {/* Performance Summary */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Summary
          </h3>
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Key Strengths
            </h4>
            <div className="space-y-2">
              {data.success_rate > 75 && (
                <div className="flex items-center text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  High success rate ({(data.success_rate ?? 0).toFixed(1)}%)
                </div>
              )}
              {data.roi > 4 && (
                <div className="flex items-center text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Excellent ROI ({(data.roi ?? 0).toFixed(1)}x)
                </div>
              )}
              {benchmarks && data.avg_response_time <= benchmarks.top_quartile.avg_response_time && (
                <div className="flex items-center text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Fast response times ({(data.avg_response_time ?? 0).toFixed(0)}m)
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Growth Opportunities
            </h4>
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="flex items-center text-sm text-blue-700 dark:text-blue-400">
                  <Target className="w-4 h-4 mr-2" />
                  {rec.title}
                </div>
              ))}
              {recommendations.length === 0 && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  All systems optimized
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
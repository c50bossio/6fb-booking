'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Lightbulb
} from 'lucide-react'
import { 
  AgentAnalytics, 
  agentsApi 
} from '@/lib/api/agents'

interface BusinessIntelligenceProps {
  data: AgentAnalytics
}

export function BusinessIntelligenceDashboard({ data }: BusinessIntelligenceProps) {
  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount ?? 0
    return agentsApi.formatRevenue(value)
  }

  const formatPercentage = (value: number | undefined | null) => {
    const safeValue = value ?? 0
    return agentsApi.formatPercentage(safeValue)
  }

  const getPriorityColor = (priority: string) => {
    return agentsApi.getRecommendationPriorityColor(priority as any)
  }

  const getPriorityColorLegacy = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getPerformanceIcon = (performance: string) => {
    switch (performance?.toLowerCase()) {
      case 'above average':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'below average':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Target className="w-4 h-4 text-blue-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Today's Performance */}
      {data.current_period_performance && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Today's Performance
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Conversations</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.current_period_performance.today_conversations}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.current_period_performance.today_revenue)}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Chats</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.current_period_performance.active_conversations}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Running Agents</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.current_period_performance.agents_running}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          AI Performance Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900 dark:text-blue-200">
                Revenue Generation
              </span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Your AI agents have generated {formatCurrency(data.total_revenue)} in total revenue. 
              This represents significant automation value for your barbershop business.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-900 dark:text-green-200">
                Operational Efficiency
              </span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              With {data.total_conversations?.toLocaleString()} automated conversations, your team can focus 
              on high-value client interactions while agents handle routine bookings and inquiries.
            </p>
          </div>
        </div>
      </Card>

      {/* Success Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Success Metrics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatPercentage(data.success_rate)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Success Rate
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Goal completion rate
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {(data.roi ?? 0).toFixed(1)}x
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Return on Investment
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Revenue vs. costs
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {data.total_conversations?.toLocaleString() ?? '0'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Conversations
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Automated interactions
            </p>
          </div>
        </div>
      </Card>

      {/* Optimization Recommendations */}
      {data.optimization_recommendations && data.optimization_recommendations.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI-Powered Recommendations
            </h3>
          </div>
          
          <div className="space-y-4">
            {data.optimization_recommendations.map((recommendation, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Badge className={getPriorityColor(recommendation.priority)}>
                      {recommendation.priority}
                    </Badge>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {recommendation.title}
                    </h4>
                  </div>
                  {recommendation.type === 'revenue' && (
                    <DollarSign className="w-4 h-4 text-green-600" />
                  )}
                  {recommendation.type === 'efficiency' && (
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  )}
                  {recommendation.type === 'quality' && (
                    <Target className="w-4 h-4 text-purple-600" />
                  )}
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {recommendation.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Potential Impact: {recommendation.potential_impact}
                    </span>
                  </div>
                  
                  <Button size="sm" variant="outline">
                    {recommendation.action}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, MessageSquare, Users, Bot } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from "@/components/ui/Card"
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { AgentAnalytics } from '@/components/agents/AgentAnalytics'
import { BusinessIntelligenceDashboard } from '@/components/agents/BusinessIntelligenceDashboard'
import { RealTimePerformanceTracker } from '@/components/agents/RealTimePerformanceTracker'
import { CompetitiveBenchmarkingPanel } from '@/components/agents/CompetitiveBenchmarkingPanel'
import { StrategicInsightsDashboard } from '@/components/agents/StrategicInsightsDashboard'
import { AdvancedAnalyticsFeatures } from '@/components/agents/AdvancedAnalyticsFeatures'
import { agentsApi, type AgentAnalytics as AgentAnalyticsType } from '@/lib/api/agents'

// Using the AgentAnalytics type from the API
type AnalyticsData = AgentAnalyticsType

export default function AgentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const router = useRouter()

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
        default:
          startDate.setDate(endDate.getDate() - 30)
      }

      const analytics = await agentsApi.getAgentAnalytics(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      
      setAnalytics(analytics)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount ?? 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value: number | undefined | null) => {
    const safeValue = value ?? 0
    return `${safeValue.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/agents')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI Agent Intelligence Hub
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time performance monitoring, competitive benchmarking, and business intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </Select>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Agents</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analytics.total_agents}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-blue-600 mr-1" />
                <span className="text-sm text-blue-600">Active: {analytics.active_instances}</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Conversations</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analytics.total_conversations.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600">Messages: {analytics.total_messages.toLocaleString()}</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatPercentage(analytics.success_rate)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-purple-600 mr-1" />
                <span className="text-sm text-purple-600">Avg response: {analytics.average_response_time.toFixed(1)}s</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(analytics.cost_summary.total_cost)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-orange-600 mr-1" />
                <span className="text-sm text-orange-600">AI provider costs</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Instances</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analytics.active_instances}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-red-600 mr-1" />
                <span className="text-sm text-red-600">Running instances</span>
              </div>
            </Card>
          </div>

          {/* Top Performing Agents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Performing Agents
              </h3>
              <div className="space-y-4">
                {analytics.top_performing_agents.length > 0 ? (
                  analytics.top_performing_agents.map((agent, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {agent.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatPercentage(agent.conversion_rate)} conversion rate
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {formatCurrency(agent.revenue)}
                        </p>
                        <Badge variant="secondary">
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No agent performance data yet
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Revenue by Agent Type */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue by Agent Type
              </h3>
              <div className="space-y-4">
                {Object.entries(analytics.revenue_by_agent_type).length > 0 ? (
                  Object.entries(analytics.revenue_by_agent_type).map(([type, revenue]) => {
                    const percentage = analytics.total_revenue > 0 
                      ? (revenue / analytics.total_revenue) * 100 
                      : 0

                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize text-gray-600 dark:text-gray-400">
                            {type.replace('_', ' ')}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(revenue)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No revenue data yet
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Real-Time Performance Monitoring */}
          <RealTimePerformanceTracker initialData={analytics} />

          {/* Competitive Benchmarking */}
          <CompetitiveBenchmarkingPanel data={analytics} />

          {/* Strategic Insights Dashboard */}
          <StrategicInsightsDashboard 
            data={analytics}
            dateRange={dateRange}
          />

          {/* Advanced Analytics Features */}
          <AdvancedAnalyticsFeatures 
            data={analytics}
            dateRange={dateRange}
          />

          {/* Business Intelligence Dashboard */}
          <BusinessIntelligenceDashboard data={analytics} />

          {/* Detailed Analytics Component */}
          <AgentAnalytics 
            data={analytics}
            dateRange={dateRange}
          />
        </>
      )}
    </div>
  )
}
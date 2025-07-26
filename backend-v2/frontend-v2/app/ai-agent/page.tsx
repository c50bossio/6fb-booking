"use client"

import React, { useState, useEffect } from 'react'
import { Brain, TrendingUp, Zap, Eye, Settings, Activity, Clock, Target, BarChart3, AlertCircle, CreditCard } from 'lucide-react'
import AIAgentPricingDisplay from '@/components/ai/AIAgentPricingDisplay'
import { useToast } from '@/components/ui/use-toast'

/**
 * 🤖 AI Agent Dashboard - Real-time AI monitoring and control
 * 
 * Features:
 * - Live AI performance monitoring
 * - Opportunity detection and execution
 * - Learning analytics and insights
 * - AI configuration and settings
 * - Memory and pattern visualization
 */

interface AIOpportunity {
  client_id: number
  client_name: string
  current_service: string
  suggested_service: string
  confidence_score: number
  potential_revenue: number
  optimal_timing: string
  recommended_channel: string
  personalized_message: string
  reasoning: string
  client_personality: string
  historical_success_rate: number
}

interface AIInsights {
  total_opportunities_identified: number
  high_confidence_opportunities: number
  predicted_revenue_potential: number
  optimal_timing_insights: Record<string, any>
  personality_distribution: Record<string, number>
  channel_recommendations: Record<string, number>
  success_predictions: Record<string, number>
}

interface AIStatus {
  ai_agent_active: boolean
  opportunities_identified: number
  learning_records: number
  confidence_threshold: number
  daily_limit: number
  learning_window_days: number
  capabilities: string[]
  current_models: Record<string, string>
}

export default function AIAgentDashboard() {
  const { toast } = useToast()
  const [opportunities, setOpportunities] = useState<AIOpportunity[]>([])
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'opportunities' | 'insights' | 'memory' | 'settings' | 'pricing'>('opportunities')
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set())

  // Simple fetch wrapper (avoiding import issues)
  const apiGet = async (url: string) => {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {})
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return response.json()
  }

  const apiPost = async (url: string, data: any) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {})
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return response.json()
  }

  const fetchAIData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch all AI data in parallel
      const [statusData, opportunitiesData, insightsData] = await Promise.all([
        apiGet('/api/v2/ai-upselling/status'),
        apiGet('/api/v2/ai-upselling/opportunities?limit=20&min_confidence=0.5'),
        apiGet('/api/v2/ai-upselling/insights')
      ])

      setStatus(statusData)
      setOpportunities(opportunitiesData)
      setInsights(insightsData)

    } catch (err: any) {
      setError(err.message || 'Failed to load AI Agent data')
      console.error('AI Dashboard error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const executeOpportunity = async (opportunity: AIOpportunity) => {
    try {
      const opportunityId = `${opportunity.client_id}_${opportunity.suggested_service}_${Math.round(opportunity.confidence_score * 100)}`
      
      setExecutingIds(prev => new Set(prev).add(opportunityId))

      const result = await apiPost('/api/v2/ai-upselling/execute', {
        opportunity_id: opportunityId,
        execute_immediately: true
      })

      // Refresh opportunities after execution
      await fetchAIData()

      toast({
        title: "✅ AI Executed Opportunity",
        description: `Successfully executed opportunity for ${opportunity.client_name}. Service: ${opportunity.suggested_service}, Confidence: ${(opportunity.confidence_score * 100).toFixed()}%`,
        variant: "default",
      })

    } catch (err: any) {
      toast({
        title: "❌ Execution Failed",
        description: `Failed to execute opportunity: ${err.message}`,
        variant: "destructive",
      })
    } finally {
      setExecutingIds(prev => {
        const next = new Set(prev)
        const opportunityId = `${opportunity.client_id}_${opportunity.suggested_service}_${Math.round(opportunity.confidence_score * 100)}`
        next.delete(opportunityId)
        return next
      })
    }
  }

  const autoExecuteOpportunities = async () => {
    try {
      setIsLoading(true)
      
      const result = await apiPost('/api/v2/ai-upselling/auto-execute', {
        max_executions: 5,
        min_confidence: 0.8
      })

      await fetchAIData()

      toast({
        title: "🤖 AI Auto-Execution Complete",
        description: `Scanned: ${result.opportunities_scanned}, Executed: ${result.executed_count}, Potential revenue: $${result.total_potential_revenue?.toFixed(2) || 0}`,
        variant: "default",
      })

    } catch (err: any) {
      toast({
        title: "❌ Auto-execution Failed",
        description: `Auto-execution failed: ${err.message}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAIData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAIData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading && !status) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
          <h1 className="text-3xl font-bold">AI Agent Dashboard</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI Agent...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold">AI Agent Dashboard</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">AI Agent Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAIData}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">AI Agent Dashboard</h1>
            <p className="text-gray-600">Intelligent revenue optimization & continuous learning</p>
          </div>
        </div>
        
        {status?.ai_agent_active && (
          <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="font-medium">AI Agent Active</span>
          </div>
        )}
      </div>

      {/* AI Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Opportunities Found</p>
              <p className="text-2xl font-bold text-blue-600">{status?.opportunities_identified || 0}</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Learning Records</p>
              <p className="text-2xl font-bold text-green-600">{status?.learning_records || 0}</p>
            </div>
            <Brain className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Confidence Threshold</p>
              <p className="text-2xl font-bold text-purple-600">{((status?.confidence_threshold || 0) * 100).toFixed()}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue Potential</p>
              <p className="text-2xl font-bold text-orange-600">${(insights?.predicted_revenue_potential || 0).toFixed(2)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'opportunities', label: 'Opportunities', icon: Target },
            { id: 'insights', label: 'AI Insights', icon: TrendingUp },
            { id: 'memory', label: 'AI Memory', icon: Brain },
            { id: 'pricing', label: 'Pricing', icon: CreditCard },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as 'opportunities' | 'insights' | 'memory' | 'settings' | 'pricing')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'opportunities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">AI-Identified Opportunities</h2>
            <div className="flex space-x-3">
              <button
                onClick={fetchAIData}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Scan for New</span>
              </button>
              <button
                onClick={autoExecuteOpportunities}
                disabled={isLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Auto-Execute</span>
              </button>
            </div>
          </div>

          {opportunities.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Opportunities Found</h3>
              <p className="text-gray-500">The AI is scanning for new upselling opportunities...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {opportunities.map((opp, index) => {
                const opportunityId = `${opp.client_id}_${opp.suggested_service}_${Math.round(opp.confidence_score * 100)}`
                const isExecuting = executingIds.has(opportunityId)
                
                return (
                  <div key={index} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{opp.client_name}</h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            {opp.client_personality.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            opp.confidence_score >= 0.8 ? 'bg-green-100 text-green-800' :
                            opp.confidence_score >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {(opp.confidence_score * 100).toFixed()}% confidence
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Service Upgrade</p>
                            <p className="font-medium">{opp.current_service} → {opp.suggested_service}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Revenue Potential</p>
                            <p className="font-medium text-green-600">${opp.potential_revenue.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Optimal Channel</p>
                            <p className="font-medium">{opp.recommended_channel.toUpperCase()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Success Rate</p>
                            <p className="font-medium">{(opp.historical_success_rate * 100).toFixed()}%</p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">AI-Generated Message</p>
                          <div className="bg-gray-50 rounded p-3 text-sm italic">
                            "{opp.personalized_message}"
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          <strong>AI Reasoning:</strong> {opp.reasoning}
                        </div>
                      </div>
                      
                      <div className="ml-6 flex flex-col space-y-2">
                        <button
                          onClick={() => executeOpportunity(opp)}
                          disabled={isExecuting}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
                        >
                          {isExecuting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Executing...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              <span>Execute</span>
                            </>
                          )}
                        </button>
                        
                        <div className="text-xs text-gray-500 text-center">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(opp.optimal_timing).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectedTab === 'insights' && insights && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">AI Insights & Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Opportunities</span>
                  <span className="font-semibold">{insights.total_opportunities_identified}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">High Confidence</span>
                  <span className="font-semibold text-green-600">{insights.high_confidence_opportunities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue Potential</span>
                  <span className="font-semibold text-green-600">${insights.predicted_revenue_potential.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Client Personalities</h3>
              <div className="space-y-2">
                {Object.entries(insights.personality_distribution).map(([personality, count]) => (
                  <div key={personality} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{personality.replace('_', &apos; &apos;)}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(count / Math.max(...Object.values(insights.personality_distribution))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Channel Performance</h3>
              <div className="space-y-2">
                {Object.entries(insights.channel_recommendations).map(([channel, score]) => (
                  <div key={channel} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{channel.toUpperCase()}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${score * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{(score * 100).toFixed()}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'memory' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">AI Memory & Learning</h2>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Learning Capabilities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Active Models</h4>
                <div className="space-y-2">
                  {status?.current_models && Object.entries(status.current_models).map(([model, status]) => (
                    <div key={model} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{model.replace('_', &apos; &apos;)}</span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        status === '✅ Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">AI Capabilities</h4>
                <div className="space-y-2">
                  {status?.capabilities?.map((capability, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">{capability}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Memory Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{status?.learning_records || 0}</div>
                <div className="text-sm text-gray-600">Learning Records</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{status?.learning_window_days || 0}</div>
                <div className="text-sm text-gray-600">Learning Window (Days)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">v2.0</div>
                <div className="text-sm text-gray-600">AI Version</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'pricing' && (
        <div className="space-y-6">
          <AIAgentPricingDisplay
            currentTier="starter"
            onUpgrade={(tier) => {
              // TODO: Implement upgrade flow
              toast({
                title: "Upgrade Plan",
                description: `Upgrading to ${tier} plan - Feature coming soon!`,
                variant: "default",
              })
            }}
            showComparison={true}
          />
        </div>
      )}

      {selectedTab === 'settings' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">AI Agent Settings</h2>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Threshold
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.1"
                  value={status?.confidence_threshold || 0.6}
                  className="w-full"
                  readOnly
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Conservative (30%)</span>
                  <span>Current: {((status?.confidence_threshold || 0) * 100).toFixed()}%</span>
                  <span>Aggressive (100%)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Opportunity Limit
                </label>
                <input
                  type="number"
                  value={status?.daily_limit || 10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Maximum opportunities to identify per day</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ AI Agent Settings</h3>
            <p className="text-yellow-700 mb-4">
              AI Agent settings are currently read-only. The AI is continuously learning and adapting its parameters automatically based on performance data.
            </p>
            <div className="text-sm text-yellow-600">
              <strong>Next Update:</strong> Settings modification will be available in v2.1 with advanced configuration options.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
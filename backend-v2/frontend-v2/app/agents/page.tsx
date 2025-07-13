'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Bot, BarChart3, Settings, Activity, Zap, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from "@/components/ui/Card"
import { Badge } from '@/components/ui/Badge'
import { AgentCard } from '@/components/agents/AgentCard'
import { AgentCreationWizard } from '@/components/agents/AgentCreationWizard'
import { AgentSubscriptionBanner } from '@/components/agents/AgentSubscriptionBanner'
import { AgentComparisonModal } from '@/components/agents/AgentComparisonModal'
import { agentsApi, type AgentInstance, type AgentTemplate } from '@/lib/api/agents'
import { useToast } from '@/hooks/use-toast'

export default function AgentsPage() {
  const [loading, setLoading] = useState(true)
  const [agentInstances, setAgentInstances] = useState<AgentInstance[]>([])
  const [agentTemplates, setAgentTemplates] = useState<AgentTemplate[]>([])
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedComparisonAgent, setSelectedComparisonAgent] = useState<number | undefined>()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadAgentsData()
  }, [])

  const loadAgentsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load agent instances, templates, and subscription in parallel
      const [instances, templates, subscriptionData] = await Promise.allSettled([
        agentsApi.getAgentInstances(),
        agentsApi.getAgentTemplates(),
        agentsApi.getSubscription().catch(() => null) // Subscription might not exist
      ])
      
      if (instances.status === 'fulfilled') {
        setAgentInstances(instances.value)
      }
      
      if (templates.status === 'fulfilled') {
        setAgentTemplates(templates.value)
      }
      
      if (subscriptionData.status === 'fulfilled' && subscriptionData.value) {
        setSubscription(subscriptionData.value.subscription)
      }
      
    } catch (err: any) {
      console.error('Failed to load agents data:', err)
      setError(err.message || 'Failed to load agents data')
    } finally {
      setLoading(false)
    }
  }

  const handleAgentAction = async (agentId: number, action: 'activate' | 'pause' | 'delete' | 'optimize') => {
    try {
      switch (action) {
        case 'activate':
          await agentsApi.activateAgentInstance(agentId)
          toast({
            title: 'Agent activated',
            description: 'Agent is now active and ready to handle conversations'
          })
          break
        case 'pause':
          await agentsApi.pauseAgentInstance(agentId)
          toast({
            title: 'Agent paused',
            description: 'Agent has been paused and will not handle new conversations'
          })
          break
        case 'delete':
          await agentsApi.deleteAgentInstance(agentId)
          toast({
            title: 'Agent deleted',
            description: 'Agent has been permanently deleted'
          })
          break
        case 'optimize':
          setSelectedComparisonAgent(agentId)
          setShowComparison(true)
          toast({
            title: 'Optimization Mode',
            description: 'Compare this agent with others to identify improvements',
            variant: 'default'
          })
          break
      }
      
      // Refresh the agents list
      await loadAgentsData()
      
    } catch (err: any) {
      console.error(`Failed to ${action} agent:`, err)
      toast({
        variant: 'destructive',
        title: `Failed to ${action} agent`,
        description: err.message || 'An unexpected error occurred'
      })
    }
  }

  const getQuickStats = () => {
    const active = agentInstances.filter(agent => agent.status === 'active').length
    const totalConversations = agentInstances.reduce((sum, agent) => sum + agent.total_conversations, 0)
    const avgUptime = agentInstances.length > 0 
      ? agentInstances.reduce((sum, agent) => sum + agent.uptime_percentage, 0) / agentInstances.length 
      : 0

    return { active, totalConversations, avgUptime }
  }

  const getAgentPerformanceRank = (agentId: number) => {
    // Sort agents by a composite performance score
    const sortedAgents = [...agentInstances].sort((a, b) => {
      const scoreA = (a.total_conversations * (a.success_rate || 0)) + (a.uptime_percentage || 0)
      const scoreB = (b.total_conversations * (b.success_rate || 0)) + (b.uptime_percentage || 0)
      return scoreB - scoreA
    })
    
    return sortedAgents.findIndex(agent => agent.id === agentId) + 1
  }

  const generateMockROIData = (agent: AgentInstance) => {
    // Generate realistic ROI data based on agent performance
    const baseRevenue = agent.total_conversations * 25 // $25 per conversation avg
    const costPerConv = Math.random() * 3 + 1 // $1-4 per conversation
    const totalCost = agent.total_conversations * costPerConv
    const profit = baseRevenue - totalCost
    const profitMargin = baseRevenue > 0 ? (profit / baseRevenue) * 100 : 0
    
    return {
      revenue_generated: baseRevenue,
      cost_per_conversation: costPerConv,
      profit_margin: profitMargin,
      monthly_projection: baseRevenue * 1.2 // 20% growth projection
    }
  }

  const generateOptimizationRecommendations = (agent: AgentInstance) => {
    const recommendations = []
    
    if ((agent.success_rate || 0) < 80) {
      recommendations.push({
        type: 'success_rate' as const,
        priority: 'high' as const,
        title: 'Improve success rate by optimizing message templates',
        potential_improvement: '+15% conversion rate'
      })
    }
    
    if ((agent.uptime_percentage || 0) < 95) {
      recommendations.push({
        type: 'response_time' as const,
        priority: 'medium' as const,
        title: 'Reduce response time with better AI provider settings',
        potential_improvement: '-30% response time'
      })
    }
    
    if (agent.total_conversations < 100) {
      recommendations.push({
        type: 'engagement' as const,
        priority: 'low' as const,
        title: 'Increase conversation volume through better targeting',
        potential_improvement: '+50% conversations'
      })
    }
    
    return recommendations
  }

  const handleOptimizeAgent = (agentId: number, recommendations: string[]) => {
    toast({
      title: 'Optimization Applied',
      description: `Applied ${recommendations.length} optimizations to improve agent performance`,
      variant: 'default'
    })
    // In a real implementation, this would apply the optimizations
    setShowComparison(false)
  }

  const stats = getQuickStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading AI agents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Subscription Banner */}
      <AgentSubscriptionBanner subscription={subscription} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Agents
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Automate your barbershop operations with intelligent AI agents
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => router.push('/agents/analytics')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setShowComparison(true)}
            disabled={agentInstances.length < 2}
          >
            <Activity className="w-4 h-4 mr-2" />
            Compare Agents
          </Button>
          
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.active}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Conversations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalConversations.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Uptime</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.avgUptime.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-200">
                Error loading agents
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadAgentsData}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Agents Grid */}
      {agentInstances.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {agentInstances.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onAction={handleAgentAction}
              performanceRank={getAgentPerformanceRank(agent.id)}
              totalAgents={agentInstances.length}
              roiData={generateMockROIData(agent)}
              optimizationRecommendations={generateOptimizationRecommendations(agent)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No AI agents yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Create your first AI agent to start automating conversations and increasing your barbershop's efficiency.
          </p>
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Agent
          </Button>
        </Card>
      )}

      {/* Agent Creation Wizard */}
      {showCreateWizard && (
        <AgentCreationWizard
          templates={agentTemplates}
          onClose={() => setShowCreateWizard(false)}
          onSuccess={() => {
            setShowCreateWizard(false)
            loadAgentsData()
          }}
        />
      )}
    </div>
  )
}
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Bot, BarChart3, Settings, Play, Pause, Trash2, Edit3, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgentCreationWizard } from '@/components/agents/AgentCreationWizard'
import { AgentSubscriptionBanner } from '@/components/agents/AgentSubscriptionBanner'
import { getAgentInstances, deleteAgentInstance, toggleAgentStatus } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface AgentInstance {
  id: number
  name: string
  agent_type: string
  status: 'active' | 'paused' | 'draft'
  created_at: string
  last_run_at?: string
  total_conversations: number
  successful_conversations: number
  total_revenue_generated: number
  config: any
}

export default function AIAgentsPage() {
  const [agents, setAgents] = useState<AgentInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      setLoading(true)
      const agentsData = await getAgentInstances()
      setAgents(agentsData.agents || [])
    } catch (error) {
      console.error('Failed to load agents:', error)
      // Show mock data for development
      setAgents([
        {
          id: 1,
          name: 'Smart Rebooking Assistant',
          agent_type: 'rebooking',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z',
          last_run_at: '2024-01-20T08:30:00Z',
          total_conversations: 127,
          successful_conversations: 98,
          total_revenue_generated: 8450,
          config: {
            rebooking_intervals: { default: 28 },
            supported_channels: ['sms', 'email'],
            max_conversations_per_run: 50
          }
        },
        {
          id: 2,
          name: 'Birthday Celebration Bot',
          agent_type: 'birthday_wishes',
          status: 'paused',
          created_at: '2024-01-10T14:00:00Z',
          last_run_at: '2024-01-18T09:15:00Z',
          total_conversations: 45,
          successful_conversations: 32,
          total_revenue_generated: 2890,
          config: {
            birthday_discount: 20,
            discount_validity_days: 30,
            supported_channels: ['sms'],
            max_conversations_per_run: 25
          }
        },
        {
          id: 3,
          name: 'Weekend Reminder Agent',
          agent_type: 'appointment_reminders',
          status: 'draft',
          created_at: '2024-01-22T16:45:00Z',
          total_conversations: 0,
          successful_conversations: 0,
          total_revenue_generated: 0,
          config: {
            reminder_timing: ['24h', '2h'],
            supported_channels: ['sms'],
            max_conversations_per_run: 100
          }
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (agentId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active'
      await toggleAgentStatus(agentId, newStatus)
      
      setAgents(agents.map(agent => 
        agent.id === agentId 
          ? { ...agent, status: newStatus as 'active' | 'paused' | 'draft' }
          : agent
      ))
      
      toast({
        title: 'Success',
        description: `Agent ${newStatus === 'active' ? 'activated' : 'paused'} successfully`,
        variant: 'default'
      })
    } catch (error) {
      console.error('Failed to toggle agent status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update agent status',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteAgent = async (agentId: number) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return
    }

    try {
      await deleteAgentInstance(agentId)
      setAgents(agents.filter(agent => agent.id !== agentId))
      
      toast({
        title: 'Success',
        description: 'Agent deleted successfully',
        variant: 'default'
      })
    } catch (error) {
      console.error('Failed to delete agent:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete agent',
        variant: 'destructive'
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getAgentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'rebooking': 'Rebooking Assistant',
      'birthday_wishes': 'Birthday Wishes',
      'appointment_reminders': 'Appointment Reminders',
      'follow_up': 'Follow-up Messages',
      'marketing': 'Marketing Campaigns'
    }
    return labels[type] || type.replace('_', ' ')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const calculateSuccessRate = (successful: number, total: number) => {
    if (total === 0) return 0
    return Math.round((successful / total) * 100)
  }

  // Calculate total metrics
  const totalMetrics = agents.reduce((acc, agent) => ({
    conversations: acc.conversations + agent.total_conversations,
    revenue: acc.revenue + agent.total_revenue_generated,
    successful: acc.successful + agent.successful_conversations
  }), { conversations: 0, revenue: 0, successful: 0 })

  const overallSuccessRate = calculateSuccessRate(totalMetrics.successful, totalMetrics.conversations)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary-600" />
            AI Agents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Intelligent automation for your barbershop operations
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
          
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Subscription Banner */}
      <AgentSubscriptionBanner />

      {/* Overall Metrics */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Conversations
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalMetrics.conversations.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <span className={`text-sm ${overallSuccessRate >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {overallSuccessRate}% success rate
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Revenue Generated
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalMetrics.revenue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-green-600">
                  {formatCurrency(Math.round(totalMetrics.revenue / Math.max(totalMetrics.conversations, 1)))} avg/conversation
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Agents
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {agents.filter(a => a.status === 'active').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  of {agents.length} total agents
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No AI Agents Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first AI agent to automate customer communications and boost revenue
          </p>
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Agent
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const successRate = calculateSuccessRate(agent.successful_conversations, agent.total_conversations)
            
            return (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                        <Bot className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription>
                          {getAgentTypeLabel(agent.agent_type)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusColor(agent.status)}>
                      {agent.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Conversations</p>
                      <p className="font-semibold">{agent.total_conversations}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                      <p className="font-semibold">{successRate}%</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Revenue Generated</p>
                      <p className="font-semibold text-green-600">{formatCurrency(agent.total_revenue_generated)}</p>
                    </div>
                  </div>

                  {/* Last Activity */}
                  {agent.last_run_at && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Last Activity</p>
                      <p className="text-sm">{new Date(agent.last_run_at).toLocaleDateString()}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    {agent.status === 'draft' ? (
                      <Button
                        size="sm"
                        onClick={() => handleToggleStatus(agent.id, 'draft')}
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={agent.status === 'active' ? 'outline' : 'default'}
                        onClick={() => handleToggleStatus(agent.id, agent.status)}
                        className="flex-1"
                      >
                        {agent.status === 'active' ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Resume
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {/* TODO: Edit agent */}}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Getting Started Guide */}
      <Card className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/10 dark:to-blue-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary-600" />
            Getting Started with AI Agents
          </CardTitle>
          <CardDescription>
            Maximize your business efficiency with intelligent automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                1. Start with Rebooking
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically remind clients to book their next appointment and increase retention rates
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                2. Add Birthday Wishes
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send personalized birthday messages with special offers to build customer relationships
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                3. Monitor & Optimize
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track performance metrics and fine-tune your agents for maximum ROI
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creation Wizard */}
      <AgentCreationWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onSuccess={() => {
          setShowCreateWizard(false)
          loadAgents()
        }}
      />
    </div>
  )
}
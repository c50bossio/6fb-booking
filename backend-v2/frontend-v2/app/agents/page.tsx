'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Bot, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAgentInstances } from '@/lib/api'
import type { AgentInstance } from '@/types/agent'

export default function AgentsPage() {
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<AgentInstance[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAgentInstances()
      setAgents(data)
    } catch (err) {
      console.error('Failed to fetch agents:', err)
      setError('Failed to load agents. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
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
          
          <Button onClick={() => router.push('/agents/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchAgents}>Try Again</Button>
        </div>
      ) : agents.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No AI Agents Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first AI agent to start automating your barbershop operations
          </p>
          <Button onClick={() => router.push('/agents/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Agent
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{agent.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{agent.template_type}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  agent.status === 'active' ? 'bg-green-100 text-green-800' : 
                  agent.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {agent.status}
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Conversations</span>
                  <span className="font-medium">{agent.total_conversations || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="font-medium">
                    {agent.total_conversations > 0 
                      ? Math.round((agent.successful_conversations / agent.total_conversations) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue Generated</span>
                  <span className="font-medium text-green-600">
                    ${(agent.total_revenue_generated || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {agent.status === 'active' ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => console.log('Pause agent', agent.id)}
                  >
                    Pause
                  </Button>
                ) : (
                  <Button 
                    size="sm"
                    onClick={() => console.log('Activate agent', agent.id)}
                  >
                    Activate
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push(`/agents/${agent.id}/settings`)}
                >
                  Settings
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push(`/agents/${agent.id}/analytics`)}
                >
                  Analytics
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
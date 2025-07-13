'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Trophy,
  Target,
  Zap,
  DollarSign,
  MessageSquare,
  Activity,
  Star,
  Copy,
  Settings,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { 
  type AgentInstance, 
  agentsApi 
} from '@/lib/api/agents'

interface AgentComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  agents: AgentInstance[]
  selectedAgentId?: number
  onOptimize?: (agentId: number, recommendations: string[]) => void
}

interface ComparisonMetric {
  name: string
  icon: React.ReactNode
  getValue: (agent: AgentInstance) => number | string
  format: 'number' | 'currency' | 'percentage' | 'time' | 'string'
  higherIsBetter: boolean
  unit?: string
}

const COMPARISON_METRICS: ComparisonMetric[] = [
  {
    name: 'Total Conversations',
    icon: <MessageSquare className="w-4 h-4" />,
    getValue: (agent) => agent.total_conversations,
    format: 'number',
    higherIsBetter: true
  },
  {
    name: 'Success Rate',
    icon: <Target className="w-4 h-4" />,
    getValue: (agent) => agent.success_rate || 0,
    format: 'percentage',
    higherIsBetter: true
  },
  {
    name: 'Uptime',
    icon: <Activity className="w-4 h-4" />,
    getValue: (agent) => agent.uptime_percentage || 0,
    format: 'percentage',
    higherIsBetter: true
  },
  {
    name: 'Total Messages',
    icon: <Zap className="w-4 h-4" />,
    getValue: (agent) => agent.total_messages,
    format: 'number',
    higherIsBetter: true
  },
  {
    name: 'Revenue per Conversation',
    icon: <DollarSign className="w-4 h-4" />,
    getValue: (agent) => agent.revenue_per_conversation || 0,
    format: 'currency',
    higherIsBetter: true
  },
  {
    name: 'Response Time',
    icon: <Zap className="w-4 h-4" />,
    getValue: (agent) => agent.avg_response_time || 0,
    format: 'time',
    higherIsBetter: false,
    unit: 's'
  }
]

export function AgentComparisonModal({ 
  isOpen, 
  onClose, 
  agents, 
  selectedAgentId,
  onOptimize 
}: AgentComparisonModalProps) {
  const [selectedAgents, setSelectedAgents] = useState<number[]>([])
  const [comparisonView, setComparisonView] = useState<'table' | 'cards'>('table')

  useEffect(() => {
    if (selectedAgentId && agents.find(a => a.id === selectedAgentId)) {
      setSelectedAgents([selectedAgentId])
    }
  }, [selectedAgentId, agents])

  const handleAgentToggle = (agentId: number) => {
    setSelectedAgents(prev => {
      if (prev.includes(agentId)) {
        return prev.filter(id => id !== agentId)
      } else if (prev.length < 4) { // Max 4 agents for comparison
        return [...prev, agentId]
      }
      return prev
    })
  }

  const formatValue = (value: number | string, format: string, unit?: string): string => {
    if (typeof value === 'string') return value

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
        return value.toLocaleString()
      case 'time':
        return `${value.toFixed(1)}${unit || ''}`
      default:
        return value.toString()
    }
  }

  const getPerformanceComparison = (agents: AgentInstance[], metric: ComparisonMetric) => {
    const values = agents.map(agent => ({
      agentId: agent.id,
      value: metric.getValue(agent) as number
    }))

    const sortedValues = [...values].sort((a, b) => 
      metric.higherIsBetter ? b.value - a.value : a.value - b.value
    )

    return values.map(({ agentId, value }) => {
      const rank = sortedValues.findIndex(v => v.agentId === agentId) + 1
      const isWinner = rank === 1
      const isLoser = rank === values.length && values.length > 1

      return {
        agentId,
        value,
        rank,
        isWinner,
        isLoser
      }
    })
  }

  const generateOptimizationRecommendations = (selectedAgents: AgentInstance[]) => {
    const recommendations: Record<number, string[]> = {}

    selectedAgents.forEach(agent => {
      const agentRecommendations: string[] = []

      // Find best performing agent for each metric
      COMPARISON_METRICS.forEach(metric => {
        const comparison = getPerformanceComparison(selectedAgents, metric)
        const agentPerformance = comparison.find(c => c.agentId === agent.id)
        const winner = comparison.find(c => c.isWinner)

        if (agentPerformance && winner && agentPerformance.agentId !== winner.agentId) {
          const winnerAgent = selectedAgents.find(a => a.id === winner.agentId)
          if (winnerAgent) {
            agentRecommendations.push(
              `Improve ${metric.name}: Target ${formatValue(winner.value, metric.format, metric.unit)} (like ${winnerAgent.name})`
            )
          }
        }
      })

      if (agentRecommendations.length > 0) {
        recommendations[agent.id] = agentRecommendations.slice(0, 3) // Top 3 recommendations
      }
    })

    return recommendations
  }

  const selectedAgentInstances = agents.filter(agent => selectedAgents.includes(agent.id))
  const optimizationRecommendations = generateOptimizationRecommendations(selectedAgentInstances)

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="p-6 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Agent Performance Comparison
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Compare agents side-by-side to identify optimization opportunities
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={comparisonView} onValueChange={(value) => setComparisonView(value as 'table' | 'cards')}>
              <option value="table">Table View</option>
              <option value="cards">Card View</option>
            </Select>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Agent Selection */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-3">Select Agents to Compare (up to 4)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {agents.map(agent => (
              <div
                key={agent.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedAgents.includes(agent.id)
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleAgentToggle(agent.id)}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {agent.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {agentsApi.getAgentTypeDisplay(agent.agent_type || 'customer_service')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {selectedAgentInstances.length >= 2 && (
          <>
            {/* Comparison Table/Cards */}
            {comparisonView === 'table' ? (
              <Card className="p-6 mb-6">
                <h3 className="font-semibold mb-4">Performance Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                          Metric
                        </th>
                        {selectedAgentInstances.map(agent => (
                          <th key={agent.id} className="text-center py-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {agent.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON_METRICS.map(metric => {
                        const comparison = getPerformanceComparison(selectedAgentInstances, metric)
                        
                        return (
                          <tr key={metric.name} className="border-b">
                            <td className="py-3">
                              <div className="flex items-center space-x-2">
                                {metric.icon}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {metric.name}
                                </span>
                              </div>
                            </td>
                            {selectedAgentInstances.map(agent => {
                              const agentComparison = comparison.find(c => c.agentId === agent.id)!
                              return (
                                <td key={agent.id} className="py-3 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <span className={`text-sm font-medium ${
                                      agentComparison.isWinner 
                                        ? 'text-green-600' 
                                        : agentComparison.isLoser 
                                        ? 'text-red-600' 
                                        : 'text-gray-900 dark:text-white'
                                    }`}>
                                      {formatValue(agentComparison.value, metric.format, metric.unit)}
                                    </span>
                                    {agentComparison.isWinner && (
                                      <Trophy className="w-3 h-3 text-yellow-500" />
                                    )}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {selectedAgentInstances.map(agent => (
                  <Card key={agent.id} className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {agent.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {agentsApi.getAgentTypeDisplay(agent.agent_type || 'customer_service')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {COMPARISON_METRICS.map(metric => {
                        const comparison = getPerformanceComparison(selectedAgentInstances, metric)
                        const agentComparison = comparison.find(c => c.agentId === agent.id)!
                        
                        return (
                          <div key={metric.name} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {metric.icon}
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {metric.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={`text-sm font-medium ${
                                agentComparison.isWinner 
                                  ? 'text-green-600' 
                                  : agentComparison.isLoser 
                                  ? 'text-red-600' 
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {formatValue(agentComparison.value, metric.format, metric.unit)}
                              </span>
                              {agentComparison.isWinner && (
                                <Trophy className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Optimization Recommendations */}
            {Object.keys(optimizationRecommendations).length > 0 && (
              <Card className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Optimization Recommendations
                  </h3>
                </div>

                <div className="space-y-4">
                  {Object.entries(optimizationRecommendations).map(([agentId, recommendations]) => {
                    const agent = selectedAgentInstances.find(a => a.id === parseInt(agentId))!
                    
                    return (
                      <div key={agentId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {agent.name} - Improvement Opportunities
                          </h4>
                          {onOptimize && (
                            <Button
                              size="sm"
                              onClick={() => onOptimize(agent.id, recommendations)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Settings className="w-3 h-3 mr-1" />
                              Apply Optimizations
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {recommendations.map((recommendation, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mt-0.5">
                                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {recommendation}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        {selectedAgentInstances.length < 2 && (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Select at least 2 agents to start comparing performance
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
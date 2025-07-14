'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { 
  Bot, 
  Play, 
  Pause, 
  Settings, 
  Trash2, 
  MessageSquare, 
  TrendingUp,
  Clock,
  MoreVertical,
  Activity,
  CheckCircle,
  AlertCircle,
  Zap,
  DollarSign,
  Award,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sliders,
  TrendingDown,
  Star,
  Medal,
  TestTube
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  type AgentInstance, 
  agentsApi 
} from '@/lib/api/agents'

interface AgentCardProps {
  agent: AgentInstance
  onAction: (agentId: number, action: 'activate' | 'pause' | 'delete' | 'optimize') => Promise<void>
  onTestMessages?: (agent: AgentInstance) => void
  isLoading?: boolean
  performanceRank?: number
  totalAgents?: number
  roiData?: {
    revenue_generated: number
    cost_per_conversation: number
    profit_margin: number
    monthly_projection: number
  }
  optimizationRecommendations?: Array<{
    type: 'success_rate' | 'response_time' | 'cost_efficiency' | 'engagement'
    priority: 'high' | 'medium' | 'low'
    title: string
    potential_improvement: string
  }>
}

export function AgentCard({ 
  agent, 
  onAction, 
  onTestMessages,
  isLoading = false, 
  performanceRank,
  totalAgents,
  roiData,
  optimizationRecommendations 
}: AgentCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const router = useRouter()

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Bot className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = () => {
    switch (agent.status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'stopped':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    }
  }

  const getAgentTypeIcon = () => {
    // Return appropriate icon based on agent type or use Bot as default
    return <Bot className="w-6 h-6 text-blue-600" />
  }

  const formatLastActivity = () => {
    if (!agent.last_activity) return 'No activity'
    try {
      return `Active ${formatDistanceToNow(new Date(agent.last_activity))} ago`
    } catch {
      return 'Activity unknown'
    }
  }

  const handleDelete = () => {
    if (showConfirmDelete) {
      onAction(agent.id, 'delete')
      setShowConfirmDelete(false)
    } else {
      setShowConfirmDelete(true)
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowConfirmDelete(false), 3000)
    }
  }

  const canActivate = agentsApi.canActivate(agent)
  const canPause = agentsApi.canPause(agent)
  const canDelete = agentsApi.canDelete(agent)

  // Enhanced helper functions
  const getPerformanceBadge = () => {
    if (!performanceRank || !totalAgents) return null
    
    const percentile = ((totalAgents - performanceRank + 1) / totalAgents) * 100
    
    if (percentile >= 90) {
      return { 
        icon: <Award className="w-3 h-3" />, 
        text: "Top Performer", 
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" 
      }
    } else if (percentile >= 75) {
      return { 
        icon: <Medal className="w-3 h-3" />, 
        text: "High Performer", 
        color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
      }
    } else if (percentile >= 50) {
      return { 
        icon: <Target className="w-3 h-3" />, 
        text: "Average", 
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400" 
      }
    } else {
      return { 
        icon: <TrendingUp className="w-3 h-3" />, 
        text: "Needs Optimization", 
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400" 
      }
    }
  }

  const getROITrend = () => {
    if (!roiData) return null
    
    // Calculate trend based on profit margin
    const profitMargin = roiData.profit_margin
    
    if (profitMargin > 70) {
      return { icon: <ArrowUpRight className="w-3 h-3 text-green-600" />, color: "text-green-600" }
    } else if (profitMargin > 40) {
      return { icon: <Minus className="w-3 h-3 text-blue-600" />, color: "text-blue-600" }
    } else {
      return { icon: <ArrowDownRight className="w-3 h-3 text-red-600" />, color: "text-red-600" }
    }
  }

  const getTopRecommendation = () => {
    if (!optimizationRecommendations?.length) return null
    
    // Get highest priority recommendation
    const highPriority = optimizationRecommendations.find(r => r.priority === 'high')
    return highPriority || optimizationRecommendations[0]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const performanceBadge = getPerformanceBadge()
  const roiTrend = getROITrend()
  const topRecommendation = getTopRecommendation()

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            {getAgentTypeIcon()}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {agent.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {agentsApi.getAgentTypeDisplay(agent.agent_type || 'customer_service')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-1">{agentsApi.getStatusDisplay(agent.status)}</span>
          </Badge>
          
          {performanceBadge && (
            <Badge className={performanceBadge.color}>
              {performanceBadge.icon}
              <span className="ml-1">{performanceBadge.text}</span>
            </Badge>
          )}
          
          {performanceRank && totalAgents && (
            <Badge variant="outline" className="text-xs">
              #{performanceRank} of {totalAgents}
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/agents/${agent.id}`)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/agents/${agent.id}/conversations`)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Conversations
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                className={showConfirmDelete ? "bg-red-50 text-red-700" : ""}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {showConfirmDelete ? "Confirm Delete" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced Metrics */}
      <div className="space-y-4 mb-4">
        {/* ROI Metrics Row */}
        {roiData && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 p-3 rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Revenue</span>
                  {roiTrend && roiTrend.icon}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(roiData.revenue_generated)}
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Per Conv</span>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  ${roiData.cost_per_conversation.toFixed(2)}
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Profit</span>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {roiData.profit_margin.toFixed(0)}%
                </p>
              </div>
            </div>
            
            <div className="mt-2 text-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Monthly projection: 
              </span>
              <span className="text-xs font-medium text-green-600 ml-1">
                {formatCurrency(roiData.monthly_projection)}
              </span>
            </div>
          </div>
        )}

        {/* Standard Metrics Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Conversations</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {agent.total_conversations.toLocaleString()}
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {agentsApi.formatUptime(agent.uptime_percentage)}
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Messages</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {agent.total_messages.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Optimization Recommendation */}
      {topRecommendation && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-2">
            <Zap className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Quick Optimization
                </span>
                <Badge 
                  className={
                    topRecommendation.priority === 'high' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : topRecommendation.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  }
                >
                  {topRecommendation.priority}
                </Badge>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                {topRecommendation.title}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Potential: {topRecommendation.potential_improvement}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction(agent.id, 'optimize')}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20 h-6 px-2 text-xs"
                >
                  <Sliders className="w-3 h-3 mr-1" />
                  Optimize
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Activity */}
      <div className="flex items-center space-x-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatLastActivity()}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {canActivate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(agent.id, 'activate')}
              className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></div>
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              {isLoading ? 'Activating...' : 'Activate'}
            </Button>
          )}

          {canPause && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(agent.id, 'pause')}
              className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-900/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>
              ) : (
                <Pause className="w-4 h-4 mr-1" />
              )}
              {isLoading ? 'Pausing...' : 'Pause'}
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/agents/${agent.id}/analytics`)}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Analytics
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/agents/compare?selected=${agent.id}`)}
            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
          >
            <Target className="w-4 h-4 mr-1" />
            Compare
          </Button>

          {onTestMessages && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onTestMessages(agent)}
              className="text-purple-600 hover:text-purple-900 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
            >
              <TestTube className="w-4 h-4 mr-1" />
              A/B Test
            </Button>
          )}

          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAction(agent.id, 'delete')}
              className="text-red-600 hover:text-red-900 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bot, 
  Play, 
  Pause, 
  Settings, 
  Trash2, 
  MessageSquare, 
  TrendingUp,
  Clock,
  MoreVertical
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

interface AgentCardProps {
  agent: {
    id: number
    name: string
    status: 'draft' | 'active' | 'paused' | 'inactive' | 'error'
    total_conversations: number
    successful_conversations: number
    total_revenue_generated: number
    last_run_at: string | null
    next_run_at: string | null
    agent: {
      name: string
      agent_type: string
      description: string
    }
  }
  onAction: (agentId: number, action: 'activate' | 'pause' | 'delete') => void
  isLoading?: boolean
}

export function AgentCard({ agent, onAction, isLoading = false }: AgentCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'rebooking': return '🔄'
      case 'no_show_fee': return '💳'
      case 'birthday_wishes': return '🎂'
      case 'holiday_greetings': return '🎄'
      case 'review_request': return '⭐'
      case 'retention': return '💝'
      case 'upsell': return '⬆️'
      case 'appointment_reminder': return '⏰'
      default: return '🤖'
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const calculateSuccessRate = () => {
    if (agent.total_conversations === 0) return 0
    return Math.round((agent.successful_conversations / agent.total_conversations) * 100)
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

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center text-lg">
            {getAgentTypeIcon(agent.agent.agent_type)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {agent.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {agent.agent.name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(agent.status)}>
            {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
          </Badge>

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

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {agent.agent.description}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {agent.total_conversations}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Conversations
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {calculateSuccessRate()}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Success Rate
          </div>
        </div>

        <div className="text-center col-span-2">
          <div className="text-lg font-semibold text-green-600">
            ${agent.total_revenue_generated.toFixed(0)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Revenue Generated
          </div>
        </div>
      </div>

      {/* Timing Info */}
      {agent.status === 'active' && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Last run: {formatDateTime(agent.last_run_at)}
            </div>
          </div>
          {agent.next_run_at && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Next run: {formatDateTime(agent.next_run_at)}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {agent.status === 'draft' || agent.status === 'paused' ? (
            <Button 
              size="sm"
              onClick={() => onAction(agent.id, 'activate')}
              className="bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
              ) : (
                <Play className="w-3 h-3 mr-1" />
              )}
              {isLoading ? 'Activating...' : 'Activate'}
            </Button>
          ) : agent.status === 'active' ? (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction(agent.id, 'pause')}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
              ) : (
                <Pause className="w-3 h-3 mr-1" />
              )}
              {isLoading ? 'Pausing...' : 'Pause'}
            </Button>
          ) : null}
        </div>

        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => router.push(`/agents/${agent.id}/analytics`)}
        >
          <TrendingUp className="w-3 h-3 mr-1" />
          View Analytics
        </Button>
      </div>
    </Card>
  )
}
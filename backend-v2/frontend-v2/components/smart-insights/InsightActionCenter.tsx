'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BoltIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

/**
 * Types for Action Center
 */
interface InsightAction {
  type: string
  label: string
  description: string
  endpoint?: string
  params?: Record<string, any>
  icon?: string
}

interface ConsolidatedInsight {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'revenue' | 'retention' | 'efficiency' | 'growth' | 'quality' | 'opportunity' | 'risk'
  actions: InsightAction[]
  tags: string[]
  impact_score: number
  urgency_score: number
}

interface QuickActionsResponse {
  quick_actions: InsightAction[]
  total_actions: number
  action_types: string[]
  last_updated: string
}

/**
 * Props for InsightActionCenter
 */
interface InsightActionCenterProps {
  userId?: number
  className?: string
  maxActions?: number
  showHeader?: boolean
  variant?: 'compact' | 'full'
  onActionExecuted?: (action: InsightAction, result: any) => void
  autoRefresh?: boolean
}

/**
 * Insight Action Center - Displays prioritized actions derived from smart insights
 * 
 * Features:
 * - Quick action buttons with one-click execution
 * - Action categorization and visual icons
 * - Real-time action execution with feedback
 * - Loading states and error handling
 * - Compact and full variants for different layouts
 * - Integration with insights API for action execution
 */
export function InsightActionCenter({
  userId,
  className = '',
  maxActions = 6,
  showHeader = true,
  variant = 'full',
  onActionExecuted,
  autoRefresh = true
}: InsightActionCenterProps) {
  const [actionsData, setActionsData] = useState<QuickActionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set())
  const [executedActions, setExecutedActions] = useState<Set<string>>(new Set())
  const router = useRouter()

  // Fetch quick actions
  const fetchQuickActions = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (userId) params.append('user_id', userId.toString())
      
      const response = await fetch(`/api/v2/smart-insights/actions?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setActionsData(data)
    } catch (err) {
      console.error('Error fetching quick actions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load actions')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Initial load
  useEffect(() => {
    fetchQuickActions()
  }, [userId, fetchQuickActions])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchQuickActions, 300000) // 5 minutes
    return () => clearInterval(interval)
  }, [autoRefresh, userId, fetchQuickActions])

  // Get action icon
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'adjust_pricing':
        return CurrencyDollarIcon
      case 'contact_client':
        return UserGroupIcon
      case 'schedule_client':
        return CalendarIcon
      case 'send_message':
        return ChatBubbleLeftIcon
      case 'view_analytics':
        return ChartBarIcon
      case 'optimize_schedule':
        return CalendarIcon
      case 'implement_strategy':
        return CogIcon
      default:
        return BoltIcon
    }
  }

  // Get action priority styling
  const getActionStyling = (actionType: string) => {
    switch (actionType) {
      case 'adjust_pricing':
        return {
          bgClass: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
          iconClass: 'text-green-600 dark:text-green-400',
          buttonClass: 'bg-green-600 hover:bg-green-700 text-white'
        }
      case 'contact_client':
        return {
          bgClass: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
          iconClass: 'text-purple-600 dark:text-purple-400',
          buttonClass: 'bg-purple-600 hover:bg-purple-700 text-white'
        }
      case 'schedule_client':
        return {
          bgClass: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
          iconClass: 'text-blue-600 dark:text-blue-400',
          buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
      case 'view_analytics':
        return {
          bgClass: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
          iconClass: 'text-amber-600 dark:text-amber-400',
          buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white'
        }
      default:
        return {
          bgClass: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700',
          iconClass: 'text-gray-600 dark:text-gray-400',
          buttonClass: 'bg-gray-600 hover:bg-gray-700 text-white'
        }
    }
  }

  // Execute action
  const executeAction = async (action: InsightAction) => {
    const actionKey = `${action.type}_${action.endpoint || 'default'}`
    
    try {
      setExecutingActions(prev => new Set([...prev, actionKey]))
      
      // For navigation actions, just navigate
      if (action.type === 'view_analytics' && action.endpoint) {
        router.push(action.endpoint)
        toast({
          title: "Navigation",
          description: `Navigating to ${action.label}`,
        })
        setExecutedActions(prev => new Set([...prev, actionKey]))
        return
      }

      // For other actions, call the API
      const response = await fetch(`/api/v2/smart-insights/action/${action.type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          params: action.params || {},
          endpoint: action.endpoint
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Show success message
      toast({
        title: "Success",
        description: `${action.label} completed successfully`,
      })
      
      // Mark as executed
      setExecutedActions(prev => new Set([...prev, actionKey]))
      
      // Call callback if provided
      if (onActionExecuted) {
        onActionExecuted(action, result)
      }
      
      // Handle specific action results
      if (result.redirect_url) {
        router.push(result.redirect_url)
      }
      
    } catch (err) {
      console.error('Error executing action:', err)
      toast({
        title: "Error",
        description: `Failed to execute ${action.label}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setExecutingActions(prev => {
        const next = new Set(prev)
        next.delete(actionKey)
        return next
      })
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card className={`${className}`} variant="default">
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
        )}
        <CardContent className={showHeader ? 'pt-0' : 'pt-6'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 ${className}`} variant="default">
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-red-900 dark:text-red-100">
              Quick Actions
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={showHeader ? 'pt-0' : 'pt-6'}>
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-700 dark:text-red-300">
                Unable to load actions: {error}
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={fetchQuickActions}
                className="mt-2 text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900"
              >
                <ArrowPathIcon className="w-4 h-4 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No actions state
  if (!actionsData?.quick_actions.length) {
    return (
      <Card className={`${className}`} variant="default">
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
        )}
        <CardContent className={showHeader ? 'pt-0' : 'pt-6'}>
          <div className="text-center py-8">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No immediate actions needed. Your business is running smoothly!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const actions = actionsData.quick_actions.slice(0, maxActions)

  return (
    <Card className={`${className}`} variant="default">
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {actionsData.total_actions} available
            </Badge>
          </div>
          {variant === 'full' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Prioritized actions based on your business insights
            </p>
          )}
        </CardHeader>
      )}
      
      <CardContent className={showHeader ? 'pt-0' : 'pt-6'}>
        <div className={`grid gap-3 ${
          variant === 'compact' 
            ? 'grid-cols-2' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {actions.map((action, index) => {
            const actionKey = `${action.type}_${action.endpoint || 'default'}`
            const isExecuting = executingActions.has(actionKey)
            const isExecuted = executedActions.has(actionKey)
            const ActionIcon = getActionIcon(action.type)
            const styling = getActionStyling(action.type)
            
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${styling.bgClass} ${
                  variant === 'compact' ? 'min-h-[80px]' : 'min-h-[120px]'
                }`}
              >
                <div className="flex items-start space-x-3 h-full">
                  <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${
                    isExecuted ? 'opacity-60' : ''
                  }`}>
                    {isExecuted ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <ActionIcon className={`w-5 h-5 ${styling.iconClass}`} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm leading-tight mb-1 ${
                      isExecuted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {action.label}
                    </h4>
                    
                    {variant === 'full' && (
                      <p className={`text-xs mb-3 leading-relaxed ${
                        isExecuted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'
                      }`}>
                        {action.description}
                      </p>
                    )}
                    
                    <Button
                      size="sm"
                      className={`w-full text-xs ${styling.buttonClass} ${
                        isExecuted ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      onClick={() => executeAction(action)}
                      disabled={isExecuting || isExecuted}
                    >
                      {isExecuting ? (
                        <div className="flex items-center space-x-1">
                          <ArrowPathIcon className="w-3 h-3 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : isExecuted ? (
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="w-3 h-3" />
                          <span>Completed</span>
                        </div>
                      ) : (
                        action.label
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Footer info */}
        {variant === 'full' && actionsData.total_actions > maxActions && (
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                Showing {actions.length} of {actionsData.total_actions} actions
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/analytics/insights')}
                className="text-xs"
              >
                View All
              </Button>
            </div>
          </div>
        )}
        
        {/* Last updated */}
        <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
          Last updated: {new Date(actionsData.last_updated).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}

export default InsightActionCenter
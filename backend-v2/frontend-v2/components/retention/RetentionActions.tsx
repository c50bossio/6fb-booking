"use client"

/**
 * Retention Actions Component
 * ===========================
 * 
 * Quick action buttons and workflows for retention management.
 * Allows barbers to quickly trigger retention interventions.
 */

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  AlertTriangleIcon,
  MailIcon,
  MessageSquareIcon,
  TargetIcon,
  TrendingUpIcon,
  UserPlusIcon,
  RefreshCwIcon,
  CheckCircleIcon
} from 'lucide-react'
import { RetentionAnalyticsAPI } from '@/lib/api/retention-analytics'

interface RetentionActionsProps {
  highRiskClientCount?: number
  onActionComplete?: () => void
}

const RetentionActions: React.FC<RetentionActionsProps> = ({ 
  highRiskClientCount = 0,
  onActionComplete 
}) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAction = async (actionType: string, actionFn: () => Promise<any>) => {
    setIsProcessing(actionType)
    
    try {
      await actionFn()
      
      toast({
        title: "Action Completed",
        description: getActionSuccessMessage(actionType),
        variant: "default",
      })
      
      if (onActionComplete) {
        onActionComplete()
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      })
      console.error(`Error executing ${actionType}:`, error)
    } finally {
      setIsProcessing(null)
    }
  }

  const getActionSuccessMessage = (actionType: string): string => {
    switch (actionType) {
      case 'detect_triggers':
        return 'Win-back triggers detected and sequences initiated.'
      case 'generate_offers':
        return 'Personalized retention offers generated successfully.'
      case 'launch_campaign':
        return 'Retention campaign launched for high-risk clients.'
      case 'run_analysis':
        return 'Churn risk analysis completed and updated.'
      default:
        return 'Action completed successfully.'
    }
  }

  const detectWinBackTriggers = async () => {
    const sequences = await RetentionAnalyticsAPI.triggerWinBackDetection()
    console.log(`Triggered ${sequences.length} win-back sequences`)
  }

  const generateRetentionOffers = async () => {
    const offers = await RetentionAnalyticsAPI.generateBatchOffers(70, 15)
    console.log(`Generated ${offers.length} retention offers`)
  }

  const launchRetentionCampaign = async () => {
    // Get high-risk clients first
    const highRiskClients = await RetentionAnalyticsAPI.getHighPriorityClients()
    const clientIds = highRiskClients.slice(0, 10).map(client => client.client_id)
    
    if (clientIds.length > 0) {
      const result = await RetentionAnalyticsAPI.executeRetentionCampaign(clientIds, 'retention_email')
      console.log('Campaign executed:', result)
    }
  }

  const runChurnAnalysis = async () => {
    // This would trigger a fresh churn analysis
    const predictions = await RetentionAnalyticsAPI.getChurnPredictions(60)
    console.log(`Analyzed ${predictions.length} clients for churn risk`)
  }

  const retentionActions = [
    {
      id: 'detect_triggers',
      title: 'Detect Win-Back Triggers',
      description: 'Analyze client behavior and trigger automated win-back sequences',
      icon: AlertTriangleIcon,
      variant: 'default' as const,
      action: detectWinBackTriggers,
      priority: 'high'
    },
    {
      id: 'generate_offers',
      title: 'Generate Retention Offers',
      description: 'Create personalized offers for high-risk clients',
      icon: TargetIcon,
      variant: 'outline' as const,
      action: generateRetentionOffers,
      priority: 'medium'
    },
    {
      id: 'launch_campaign',
      title: 'Launch Retention Campaign',
      description: 'Send targeted retention emails to at-risk clients',
      icon: MailIcon,
      variant: 'outline' as const,
      action: launchRetentionCampaign,
      priority: 'medium'
    },
    {
      id: 'run_analysis',
      title: 'Run Churn Analysis',
      description: 'Update churn risk predictions for all clients',
      icon: TrendingUpIcon,
      variant: 'outline' as const,
      action: runChurnAnalysis,
      priority: 'low'
    }
  ]

  const quickStats = [
    {
      label: 'High Risk Clients',
      value: highRiskClientCount,
      color: 'destructive' as const,
      icon: AlertTriangleIcon
    },
    {
      label: 'Active Sequences',
      value: 12,
      color: 'secondary' as const,
      icon: RefreshCwIcon
    },
    {
      label: 'This Month Saved',
      value: 18,
      color: 'default' as const,
      icon: CheckCircleIcon
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Retention Actions
        </CardTitle>
        <CardDescription>
          Quick interventions to prevent client churn
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex items-center justify-center mb-1">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Available Actions
          </div>
          
          {retentionActions.map((action) => (
            <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <action.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {action.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">
                    Priority
                  </Badge>
                )}
                
                <Button
                  variant={action.variant}
                  size="sm"
                  disabled={isProcessing !== null}
                  onClick={() => handleAction(action.id, action.action)}
                >
                  {isProcessing === action.id ? (
                    <RefreshCwIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    'Execute'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Automation Status */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <RefreshCwIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Automation Status</span>
          </div>
          <div className="text-xs text-blue-700">
            Win-back detection runs automatically every 24 hours. 
            Churn analysis updates every 6 hours.
          </div>
        </div>

        {/* Emergency Actions */}
        {highRiskClientCount > 15 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangleIcon className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">High Risk Alert</span>
            </div>
            <div className="text-xs text-red-700 mb-2">
              {highRiskClientCount} clients are at high risk of churning. Consider immediate intervention.
            </div>
            <Button 
              size="sm" 
              variant="destructive"
              disabled={isProcessing !== null}
              onClick={() => handleAction('emergency_campaign', async () => {
                // Emergency campaign for all high-risk clients
                await Promise.all([
                  detectWinBackTriggers(),
                  generateRetentionOffers(),
                  launchRetentionCampaign()
                ])
              })}
            >
              {isProcessing === 'emergency_campaign' ? (
                <RefreshCwIcon className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertTriangleIcon className="h-4 w-4 mr-2" />
              )}
              Emergency Intervention
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RetentionActions
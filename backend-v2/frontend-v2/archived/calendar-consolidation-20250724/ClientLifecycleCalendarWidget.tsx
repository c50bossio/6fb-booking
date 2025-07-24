'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  UserIcon,
  CalendarIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  ClockIcon,
  StarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

interface Appointment {
  id: number
  client_name: string
  client_id?: number
  service_name: string
  service_price: number
  start_time: string
  client_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
  customer_type?: 'new' | 'returning' | 'vip' | 'at_risk'
}

interface ClientMilestone {
  client_id: number
  client_name: string
  milestone_type: 'first_visit' | 'loyalty_milestone' | 'spending_milestone' | 'at_risk' | 'vip_upgrade'
  milestone_description: string
  priority: 'high' | 'medium' | 'low'
  six_fb_principle: string
  action_required: string
  follow_up_date?: string
}

interface ClientLifecycleCalendarWidgetProps {
  appointments: Appointment[]
  currentDate: Date
  view: 'day' | 'week' | 'month'
  onClientMilestoneAction?: (milestone: ClientMilestone) => void
  className?: string
}

// Six Figure Barber client tier indicators
const CLIENT_TIER_CONFIG = {
  platinum: { icon: '👑', color: '#9333EA', bg: '#F3E8FF', label: 'Platinum VIP' },
  gold: { icon: '🏆', color: '#F59E0B', bg: '#FFFBEB', label: 'Gold Member' },
  silver: { icon: '🥈', color: '#6B7280', bg: '#F9FAFB', label: 'Silver Client' },
  bronze: { icon: '🥉', color: '#EA580C', bg: '#FFF7ED', label: 'Bronze Client' }
}

const CUSTOMER_TYPE_CONFIG = {
  vip: { icon: '⭐', color: '#9333EA', priority: 'high' },
  at_risk: { icon: '⚠️', color: '#DC2626', priority: 'high' },
  returning: { icon: '🔄', color: '#059669', priority: 'medium' },
  new: { icon: '🆕', color: '#2563EB', priority: 'medium' }
}

export default function ClientLifecycleCalendarWidget({
  appointments = [],
  currentDate,
  view,
  onClientMilestoneAction,
  className = ""
}: ClientLifecycleCalendarWidgetProps) {
  const { toast } = useToast()
  const [clientMilestones, setClientMilestones] = useState<ClientMilestone[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Analyze appointments for client lifecycle insights
  const clientLifecycleAnalysis = useMemo(() => {
    const clientStats = new Map()
    const today = new Date()
    const viewStart = new Date(currentDate)
    const viewEnd = new Date(currentDate)

    // Adjust date range based on view
    if (view === 'week') {
      viewStart.setDate(currentDate.getDate() - currentDate.getDay())
      viewEnd.setDate(viewStart.getDate() + 6)
    } else if (view === 'month') {
      viewStart.setDate(1)
      viewEnd.setMonth(viewEnd.getMonth() + 1, 0)
    }

    // Analyze appointments in view range
    appointments.forEach(apt => {
      const aptDate = new Date(apt.start_time)
      if (aptDate >= viewStart && aptDate <= viewEnd) {
        const clientKey = apt.client_name
        
        if (!clientStats.has(clientKey)) {
          clientStats.set(clientKey, {
            client_id: apt.client_id,
            client_name: apt.client_name,
            appointments: [],
            total_spent: 0,
            client_tier: apt.client_tier || 'bronze',
            customer_type: apt.customer_type || 'new',
            last_visit: null,
            is_new_client: apt.customer_type === 'new'
          })
        }

        const clientData = clientStats.get(clientKey)
        clientData.appointments.push(apt)
        clientData.total_spent += apt.service_price || 0
        
        if (!clientData.last_visit || new Date(apt.start_time) > new Date(clientData.last_visit)) {
          clientData.last_visit = apt.start_time
        }
      }
    })

    return Array.from(clientStats.values())
  }, [appointments, currentDate, view])

  // Generate client milestones based on Six Figure Barber methodology
  const generateClientMilestones = useMemo(() => {
    const milestones: ClientMilestone[] = []

    clientLifecycleAnalysis.forEach(client => {
      // First visit milestone
      if (client.is_new_client) {
        milestones.push({
          client_id: client.client_id || 0,
          client_name: client.client_name,
          milestone_type: 'first_visit',
          milestone_description: `${client.client_name}'s first visit - Make a lasting impression!`,
          priority: 'high',
          six_fb_principle: "First impressions determine lifetime value. Exceptional first visits create loyal clients who refer others.",
          action_required: "Provide premium experience, collect contact preferences, schedule follow-up"
        })
      }

      // VIP upgrade opportunity
      if (client.client_tier === 'silver' && client.total_spent >= 200) {
        milestones.push({
          client_id: client.client_id || 0,
          client_name: client.client_name,
          milestone_type: 'vip_upgrade',
          milestone_description: `${client.client_name} qualifies for Gold tier upgrade`,
          priority: 'medium',
          six_fb_principle: "Recognize and reward loyalty to strengthen client relationships and increase lifetime value.",
          action_required: "Offer Gold tier benefits, premium service options, exclusive booking times"
        })
      }

      // Spending milestone
      if (client.total_spent >= 500) {
        milestones.push({
          client_id: client.client_id || 0,
          client_name: client.client_name,
          milestone_type: 'spending_milestone',
          milestone_description: `${client.client_name} has invested $${client.total_spent.toFixed(0)} - Celebrate their loyalty!`,
          priority: 'medium',
          six_fb_principle: "High-value clients deserve recognition and exclusive treatment to maintain their investment.",
          action_required: "Send personalized thank you, offer loyalty rewards, ask for referrals"
        })
      }

      // At-risk client detection
      if (client.customer_type === 'at_risk') {
        milestones.push({
          client_id: client.client_id || 0,
          client_name: client.client_name,
          milestone_type: 'at_risk',
          milestone_description: `${client.client_name} is at risk of churning - Re-engagement needed`,
          priority: 'high',
          six_fb_principle: "Proactive client retention is more valuable than new client acquisition. Address concerns before they leave.",
          action_required: "Personal outreach, service feedback review, special offer to re-engage"
        })
      }

      // Loyalty milestone (multiple visits)
      if (client.appointments.length >= 3 && client.customer_type === 'returning') {
        milestones.push({
          client_id: client.client_id || 0,
          client_name: client.client_name,
          milestone_type: 'loyalty_milestone',
          milestone_description: `${client.client_name} is a loyal returning client (${client.appointments.length} visits)`,
          priority: 'medium',
          six_fb_principle: "Loyal clients are the foundation of six-figure success. They provide consistent revenue and referrals.",
          action_required: "Show appreciation, offer referral incentives, consider VIP upgrade"
        })
      }
    })

    // Sort by priority
    return milestones.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }, [clientLifecycleAnalysis])

  // Handle milestone action
  const handleMilestoneAction = async (milestone: ClientMilestone) => {
    if (onClientMilestoneAction) {
      onClientMilestoneAction(milestone)
    } else {
      // Default action: show toast with suggestion
      toast({
        title: "Client Milestone Action",
        description: `${milestone.action_required} for ${milestone.client_name}`,
        variant: "default"
      })
    }
  }

  // Get milestone icon
  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'first_visit': return <UserIcon className="w-4 h-4" />
      case 'loyalty_milestone': return <HeartIcon className="w-4 h-4" />
      case 'spending_milestone': return <TrophyIcon className="w-4 h-4" />
      case 'at_risk': return <ExclamationTriangleIcon className="w-4 h-4" />
      case 'vip_upgrade': return <StarIcon className="w-4 h-4" />
      default: return <CalendarIcon className="w-4 h-4" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <Card className={`client-lifecycle-calendar ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600" />
          Client Lifecycle Insights
          <Badge variant="outline" className="text-xs ml-2">
            {generateClientMilestones.length} opportunities
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client Statistics Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {clientLifecycleAnalysis.length}
            </div>
            <div className="text-xs text-blue-700">Active Clients</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {clientLifecycleAnalysis.filter(c => c.customer_type === 'vip').length}
            </div>
            <div className="text-xs text-green-700">VIP Clients</div>
          </div>
        </div>

        {/* Client Tier Distribution */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Client Tier Distribution</h4>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(CLIENT_TIER_CONFIG).map(([tier, config]) => {
              const count = clientLifecycleAnalysis.filter(c => c.client_tier === tier).length
              return count > 0 ? (
                <Badge 
                  key={tier} 
                  variant="outline" 
                  className="text-xs"
                  style={{ borderColor: config.color, color: config.color }}
                >
                  {config.icon} {count} {config.label}
                </Badge>
              ) : null
            })}
          </div>
        </div>

        {/* Client Milestones */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Milestone Opportunities</h4>
          {generateClientMilestones.length === 0 ? (
            <Alert>
              <CalendarIcon className="w-4 h-4" />
              <AlertDescription className="text-sm">
                No client milestones for this {view}. Client relationships are strongest when nurtured consistently.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {generateClientMilestones.slice(0, 8).map((milestone, index) => (
                <div 
                  key={`${milestone.client_id}-${milestone.milestone_type}-${index}`}
                  className={`p-3 rounded-lg border ${getPriorityColor(milestone.priority)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getMilestoneIcon(milestone.milestone_type)}
                      <h5 className="font-medium text-sm">
                        {milestone.milestone_description}
                      </h5>
                    </div>
                    <Badge 
                      variant={milestone.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {milestone.priority}
                    </Badge>
                  </div>
                  
                  <Alert className="border-blue-200 bg-blue-50 mb-2">
                    <StarIcon className="w-4 h-4" />
                    <AlertDescription className="text-xs text-blue-800">
                      <strong>6FB Principle:</strong> {milestone.six_fb_principle}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="text-xs text-gray-600 mb-2 font-medium">
                    Action: {milestone.action_required}
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleMilestoneAction(milestone)}
                    className="text-xs h-7"
                  >
                    Take Action
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Six Figure Barber Coaching Tip */}
        <Alert className="border-purple-200 bg-purple-50">
          <HeartIcon className="w-4 h-4" />
          <AlertDescription className="text-xs text-purple-800">
            <strong>6FB Insight:</strong> Client relationships drive six-figure success. Each milestone is an opportunity to strengthen loyalty, increase lifetime value, and generate referrals.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

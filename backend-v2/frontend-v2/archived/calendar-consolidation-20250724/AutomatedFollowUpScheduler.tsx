'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  CalendarDaysIcon,
  ClockIcon,
  BellIcon,
  EnvelopeIcon,
  PhoneIcon,
  HeartIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  StarIcon
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
  status: string
}

interface FollowUpAction {
  id: string
  client_id: number
  client_name: string
  action_type: 'thank_you_message' | 'feedback_request' | 'next_appointment' | 'loyalty_reward' | 'referral_request' | 'check_in_call'
  trigger_type: 'post_appointment' | 'milestone' | 'time_based' | 'at_risk'
  scheduled_date: string
  message_template: string
  six_fb_principle: string
  priority: 'high' | 'medium' | 'low'
  status: 'scheduled' | 'sent' | 'completed' | 'failed'
  expected_outcome: string
  deadline?: string
}

interface AutomatedFollowUpSchedulerProps {
  appointments: Appointment[]
  currentDate: Date
  onFollowUpScheduled?: (action: FollowUpAction) => void
  onFollowUpExecuted?: (actionId: string) => void
  className?: string
}

// Six Figure Barber follow-up templates
const FOLLOW_UP_TEMPLATES = {
  thank_you_message: {
    post_appointment: "Hi {client_name}! Thank you for your visit today. I hope you love your new look! 💫",
    milestone: "Congratulations {client_name}! You've been an amazing client. Thank you for your continued trust! 🙏",
    principle: "Gratitude strengthens relationships and shows you value their business beyond the transaction."
  },
  feedback_request: {
    template: "Hi {client_name}! How are you loving your haircut? Your feedback helps me provide even better service! ⭐",
    principle: "Client feedback creates opportunities for improvement and shows you care about their experience."
  },
  next_appointment: {
    regular: "Hi {client_name}! Ready for your next appointment? I have some great times available that would work perfectly for you! 📅",
    vip: "Hi {client_name}! Your VIP appointment slot is ready. Shall I reserve your preferred time? 👑",
    principle: "Proactive booking prevents client loss and ensures consistent revenue streams."
  },
  loyalty_reward: {
    template: "Special thank you {client_name}! As a valued client, you've earned a loyalty reward. Your next visit includes a complimentary upgrade! 🎁",
    principle: "Loyalty rewards encourage retention and show appreciation for consistent patronage."
  },
  referral_request: {
    template: "Hi {client_name}! You always look amazing after your visits. Know anyone who'd love the same great experience? 🌟",
    principle: "Happy clients are your best marketing. Personal referrals have the highest conversion rates."
  },
  check_in_call: {
    template: "Hi {client_name}, I noticed it's been a while since your last visit. How are you doing? I'd love to catch up! 📞",
    principle: "Personal outreach shows you care about clients as people, not just revenue sources."
  }
}

// Follow-up timing rules based on Six Figure Barber methodology
const FOLLOW_UP_TIMING = {
  thank_you_message: { hours: 4, max_hours: 24 }, // Same day
  feedback_request: { days: 2, max_days: 7 }, // 2-7 days after
  next_appointment: { 
    new: { days: 14, max_days: 21 }, // 2-3 weeks for new clients
    returning: { days: 21, max_days: 35 }, // 3-5 weeks for returning
    vip: { days: 18, max_days: 25 } // 2.5-3.5 weeks for VIP
  },
  loyalty_reward: { visits: 5 }, // Every 5th visit
  referral_request: { visits: 3, tier: ['gold', 'platinum'] }, // 3+ visits, premium tiers
  check_in_call: { days: 45, max_days: 90 } // 45-90 days absence
}

export default function AutomatedFollowUpScheduler({
  appointments = [],
  currentDate,
  onFollowUpScheduled,
  onFollowUpExecuted,
  className = ""
}: AutomatedFollowUpSchedulerProps) {
  const { toast } = useToast()
  const [followUpActions, setFollowUpActions] = useState<FollowUpAction[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate automated follow-up actions based on Six Figure Barber methodology
  const generateFollowUpActions = useMemo(() => {
    const actions: FollowUpAction[] = []
    const today = new Date()
    const clientHistory = new Map()

    // Build client history
    appointments.forEach(apt => {
      const clientKey = apt.client_name
      if (!clientHistory.has(clientKey)) {
        clientHistory.set(clientKey, {
          client_id: apt.client_id || 0,
          client_name: apt.client_name,
          appointments: [],
          last_visit: null,
          visit_count: 0,
          client_tier: apt.client_tier || 'bronze',
          customer_type: apt.customer_type || 'new'
        })
      }
      
      const history = clientHistory.get(clientKey)
      history.appointments.push(apt)
      history.visit_count += 1
      
      if (!history.last_visit || new Date(apt.start_time) > new Date(history.last_visit)) {
        history.last_visit = apt.start_time
      }
    })

    // Generate follow-up actions for each client
    clientHistory.forEach((history, clientName) => {
      const lastVisit = new Date(history.last_visit)
      const daysSinceLastVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      const hoursSinceLastVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60))

      // Thank you message (same day as appointment)
      if (hoursSinceLastVisit >= FOLLOW_UP_TIMING.thank_you_message.hours && 
          hoursSinceLastVisit <= FOLLOW_UP_TIMING.thank_you_message.max_hours) {
        actions.push({
          id: `thank-you-${history.client_id}-${Date.now()}`,
          client_id: history.client_id,
          client_name: clientName,
          action_type: 'thank_you_message',
          trigger_type: 'post_appointment',
          scheduled_date: new Date(today.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          message_template: FOLLOW_UP_TEMPLATES.thank_you_message.post_appointment.replace('{client_name}', clientName),
          six_fb_principle: FOLLOW_UP_TEMPLATES.thank_you_message.principle,
          priority: 'medium',
          status: 'scheduled',
          expected_outcome: 'Strengthen relationship and show appreciation'
        })
      }

      // Feedback request (2-7 days after appointment)
      if (daysSinceLastVisit >= FOLLOW_UP_TIMING.feedback_request.days && 
          daysSinceLastVisit <= FOLLOW_UP_TIMING.feedback_request.max_days) {
        actions.push({
          id: `feedback-${history.client_id}-${Date.now()}`,
          client_id: history.client_id,
          client_name: clientName,
          action_type: 'feedback_request',
          trigger_type: 'post_appointment',
          scheduled_date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          message_template: FOLLOW_UP_TEMPLATES.feedback_request.template.replace('{client_name}', clientName),
          six_fb_principle: FOLLOW_UP_TEMPLATES.feedback_request.principle,
          priority: 'high',
          status: 'scheduled',
          expected_outcome: 'Gather feedback and identify improvement opportunities'
        })
      }

      // Next appointment scheduling
      const nextAppointmentTiming = FOLLOW_UP_TIMING.next_appointment[history.customer_type] || FOLLOW_UP_TIMING.next_appointment.returning
      if (daysSinceLastVisit >= nextAppointmentTiming.days && 
          daysSinceLastVisit <= nextAppointmentTiming.max_days) {
        const isVIP = history.customer_type === 'vip' || history.client_tier === 'platinum'
        actions.push({
          id: `next-appt-${history.client_id}-${Date.now()}`,
          client_id: history.client_id,
          client_name: clientName,
          action_type: 'next_appointment',
          trigger_type: 'time_based',
          scheduled_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          message_template: (isVIP ? FOLLOW_UP_TEMPLATES.next_appointment.vip : FOLLOW_UP_TEMPLATES.next_appointment.regular).replace('{client_name}', clientName),
          six_fb_principle: FOLLOW_UP_TEMPLATES.next_appointment.principle,
          priority: 'high',
          status: 'scheduled',
          expected_outcome: 'Schedule next appointment and maintain regular cadence',
          deadline: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      }

      // Loyalty reward (every 5th visit)
      if (history.visit_count > 0 && history.visit_count % FOLLOW_UP_TIMING.loyalty_reward.visits === 0) {
        actions.push({
          id: `loyalty-${history.client_id}-${Date.now()}`,
          client_id: history.client_id,
          client_name: clientName,
          action_type: 'loyalty_reward',
          trigger_type: 'milestone',
          scheduled_date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          message_template: FOLLOW_UP_TEMPLATES.loyalty_reward.template.replace('{client_name}', clientName),
          six_fb_principle: FOLLOW_UP_TEMPLATES.loyalty_reward.principle,
          priority: 'medium',
          status: 'scheduled',
          expected_outcome: 'Reward loyalty and encourage continued visits'
        })
      }

      // Referral request (3+ visits, premium tiers)
      if (history.visit_count >= FOLLOW_UP_TIMING.referral_request.visits && 
          FOLLOW_UP_TIMING.referral_request.tier.includes(history.client_tier) &&
          daysSinceLastVisit >= 7 && daysSinceLastVisit <= 14) {
        actions.push({
          id: `referral-${history.client_id}-${Date.now()}`,
          client_id: history.client_id,
          client_name: clientName,
          action_type: 'referral_request',
          trigger_type: 'milestone',
          scheduled_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          message_template: FOLLOW_UP_TEMPLATES.referral_request.template.replace('{client_name}', clientName),
          six_fb_principle: FOLLOW_UP_TEMPLATES.referral_request.principle,
          priority: 'medium',
          status: 'scheduled',
          expected_outcome: 'Generate referrals from satisfied clients'
        })
      }

      // Check-in call for at-risk clients
      if (daysSinceLastVisit >= FOLLOW_UP_TIMING.check_in_call.days && 
          daysSinceLastVisit <= FOLLOW_UP_TIMING.check_in_call.max_days &&
          history.visit_count > 1) {
        actions.push({
          id: `checkin-${history.client_id}-${Date.now()}`,
          client_id: history.client_id,
          client_name: clientName,
          action_type: 'check_in_call',
          trigger_type: 'at_risk',
          scheduled_date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          message_template: FOLLOW_UP_TEMPLATES.check_in_call.template.replace('{client_name}', clientName),
          six_fb_principle: FOLLOW_UP_TEMPLATES.check_in_call.principle,
          priority: 'high',
          status: 'scheduled',
          expected_outcome: 'Re-engage at-risk client and prevent churn',
          deadline: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    })

    // Sort by priority and scheduled date
    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    })
  }, [appointments, currentDate])

  // Filter actions by status
  const filteredActions = useMemo(() => {
    if (selectedStatus === 'all') return generateFollowUpActions
    return generateFollowUpActions.filter(action => action.status === selectedStatus)
  }, [generateFollowUpActions, selectedStatus])

  // Execute follow-up action
  const handleExecuteAction = async (action: FollowUpAction) => {
    if (onFollowUpExecuted) {
      onFollowUpExecuted(action.id)
    }
    
    // Update action status
    setFollowUpActions(prev => prev.map(a => 
      a.id === action.id ? { ...a, status: 'sent' as const } : a
    ))
    
    toast({
      title: "Follow-up Executed",
      description: `${action.action_type.replace('_', ' ')} sent to ${action.client_name}`,
      variant: "default"
    })
  }

  // Schedule custom follow-up
  const handleScheduleCustom = (action: FollowUpAction) => {
    if (onFollowUpScheduled) {
      onFollowUpScheduled(action)
    }
    
    toast({
      title: "Follow-up Scheduled",
      description: `${action.action_type.replace('_', ' ')} scheduled for ${action.client_name}`,
      variant: "default"
    })
  }

  // Get action icon
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'thank_you_message': return <HeartIcon className="w-4 h-4" />
      case 'feedback_request': return <ChatBubbleLeftRightIcon className="w-4 h-4" />
      case 'next_appointment': return <CalendarDaysIcon className="w-4 h-4" />
      case 'loyalty_reward': return <StarIcon className="w-4 h-4" />
      case 'referral_request': return <EnvelopeIcon className="w-4 h-4" />
      case 'check_in_call': return <PhoneIcon className="w-4 h-4" />
      default: return <BellIcon className="w-4 h-4" />
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

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100'
      case 'sent': return 'text-green-600 bg-green-100'
      case 'completed': return 'text-green-800 bg-green-200'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Format scheduled date
  const formatScheduledDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffHours <= 0) return 'Now'
    if (diffHours < 24) return `In ${diffHours} hours`
    if (diffDays === 1) return 'Tomorrow'
    return `In ${diffDays} days`
  }

  return (
    <Card className={`automated-follow-up-scheduler ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellIcon className="w-5 h-5 text-green-600" />
            Automated Follow-up Scheduler
            <Badge variant="outline" className="text-xs ml-2">
              {filteredActions.length} actions
            </Badge>
          </CardTitle>
          
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredActions.length === 0 ? (
          <Alert>
            <CheckCircleIcon className="w-4 h-4" />
            <AlertDescription className="text-sm">
              No follow-up actions scheduled. System monitors client interactions for automated relationship management.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {filteredActions.slice(0, 12).map((action) => (
              <div 
                key={action.id}
                className={`p-4 rounded-lg border ${getPriorityColor(action.priority)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getActionIcon(action.action_type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <span>{action.client_name}</span>
                        <Badge 
                          className={`text-xs ${getStatusColor(action.status)}`}
                          variant="outline"
                        >
                          {action.status}
                        </Badge>
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {action.action_type.replace('_', ' ').toUpperCase()} • {formatScheduledDate(action.scheduled_date)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={action.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {action.priority}
                    </Badge>
                    {action.deadline && (
                      <Badge variant="outline" className="text-xs">
                        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                        deadline
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm text-gray-700 mb-2 font-medium bg-gray-50 p-2 rounded italic">
                    "{action.message_template}"
                  </p>
                  <p className="text-xs text-gray-600">Expected: {action.expected_outcome}</p>
                </div>
                
                <Alert className="border-green-200 bg-green-50 mb-3">
                  <HeartIcon className="w-4 h-4" />
                  <AlertDescription className="text-xs text-green-800">
                    <strong>6FB Principle:</strong> {action.six_fb_principle}
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                  >
                    {action.trigger_type.replace('_', ' ')}
                  </Badge>
                  
                  <div className="flex items-center gap-2">
                    {action.status === 'scheduled' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleExecuteAction(action)}
                        className="text-xs h-7"
                      >
                        Send Now
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleScheduleCustom(action)}
                      className="text-xs h-7"
                    >
                      Customize
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Six Figure Barber Automation Insight */}
        <Alert className="border-purple-200 bg-purple-50 mt-4">
          <BellIcon className="w-4 h-4" />
          <AlertDescription className="text-xs text-purple-800">
            <strong>6FB Automation:</strong> Automated follow-ups ensure no client falls through the cracks. Consistent communication builds relationships that drive six-figure success.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

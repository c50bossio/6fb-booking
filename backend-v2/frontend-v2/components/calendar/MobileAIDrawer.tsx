'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FreshaColors, 
  FreshaTypography,
  FreshaShadows
} from '@/lib/fresha-design-system'
import {
  SparklesIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowUpIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

// Import mobile interactions
import { useMobileInteractions } from '@/hooks/useMobileInteractions'

interface Appointment {
  id: number
  client_name: string
  client_id?: number
  service_name: string
  service_id?: number
  start_time: string
  duration_minutes: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  client_tier?: 'new' | 'regular' | 'vip' | 'platinum'
  barber_id: number
  notes?: string
  is_recurring?: boolean
  created_at?: string
}

interface BarberAvailability {
  barber_id: number
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

interface AIInsight {
  id: string
  type: 'optimization' | 'warning' | 'opportunity' | 'suggestion'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: 'revenue' | 'efficiency' | 'client_satisfaction' | 'growth'
  potential_value?: number
  action_required?: boolean
  suggested_actions?: string[]
  confidence_score?: number
}

interface MobileAIDrawerProps {
  appointments: Appointment[]
  availability: BarberAvailability[]
  selectedDate: Date
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onInsightAction?: (insight: AIInsight, action: string) => void
  className?: string
}

const MobileAIDrawer: React.FC<MobileAIDrawerProps> = ({
  appointments,
  availability,
  selectedDate,
  isOpen = false,
  onOpenChange,
  onInsightAction,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'analytics' | 'suggestions'>('insights')
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)
  
  const { 
    triggerHapticFeedback, 
    announceToScreenReader 
  } = useMobileInteractions()

  // Mock AI insights (in real app, these would come from AI engines)
  const aiInsights: AIInsight[] = [
    {
      id: '1',
      type: 'opportunity',
      priority: 'high',
      title: 'Revenue Optimization Opportunity',
      description: 'Book premium services in 2-4 PM slots to increase daily revenue by $180',
      impact: 'revenue',
      potential_value: 180,
      action_required: true,
      suggested_actions: ['Block time slots for premium services', 'Send targeted promotions'],
      confidence_score: 87
    },
    {
      id: '2',
      type: 'warning',
      priority: 'medium',
      title: 'Schedule Gap Detected',
      description: 'Large gap between 11 AM - 1 PM may indicate missed booking opportunities',
      impact: 'efficiency',
      action_required: true,
      suggested_actions: ['Offer lunch specials', 'Adjust availability'],
      confidence_score: 73
    },
    {
      id: '3',
      type: 'suggestion',
      priority: 'low',
      title: 'Client Retention Strategy',
      description: 'Send follow-up messages to recent clients to improve retention by 15%',
      impact: 'client_satisfaction',
      potential_value: 450,
      suggested_actions: ['Create automated follow-up sequence'],
      confidence_score: 65
    }
  ]

  // Handle insight interactions with haptic feedback
  const handleInsightClick = useCallback((insight: AIInsight) => {
    triggerHapticFeedback({ type: 'light' })
    setExpandedInsight(expandedInsight === insight.id ? null : insight.id)
    announceToScreenReader(`${expandedInsight === insight.id ? 'Collapsed' : 'Expanded'} insight: ${insight.title}`)
  }, [expandedInsight, triggerHapticFeedback, announceToScreenReader])

  const handleInsightAction = useCallback((insight: AIInsight, action: string) => {
    triggerHapticFeedback({ type: 'medium' })
    onInsightAction?.(insight, action)
    announceToScreenReader(`Applied action: ${action} for ${insight.title}`)
  }, [onInsightAction, triggerHapticFeedback, announceToScreenReader])

  // Get insight icon and colors
  const getInsightConfig = (insight: AIInsight) => {
    switch (insight.type) {
      case 'opportunity':
        return {
          icon: <ArrowTrendingUpIcon className="w-5 h-5" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600'
        }
      case 'warning':
        return {
          icon: <ExclamationTriangleIcon className="w-5 h-5" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200', 
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600'
        }
      case 'optimization':
        return {
          icon: <BoltIcon className="w-5 h-5" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        }
      case 'suggestion':
      default:
        return {
          icon: <LightBulbIcon className="w-5 h-5" />,
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-800',
          iconColor: 'text-purple-600'
        }
    }
  }

  // Get priority badge config
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { variant: 'destructive' as const, label: 'HIGH' }
      case 'medium':
        return { variant: 'default' as const, label: 'MED' }
      case 'low':
      default:
        return { variant: 'secondary' as const, label: 'LOW' }
    }
  }

  const renderInsightCard = (insight: AIInsight) => {
    const config = getInsightConfig(insight)
    const priorityConfig = getPriorityConfig(insight.priority)
    const isExpanded = expandedInsight === insight.id

    return (
      <Card 
        key={insight.id}
        className={`
          mb-3 cursor-pointer transition-all duration-200
          ${config.bgColor} ${config.borderColor} border
          ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}
          touch-manipulation
        `}
        onClick={() => handleInsightClick(insight)}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2 flex-1">
              <div className={config.iconColor}>
                {config.icon}
              </div>
              <h3 className={`font-semibold text-sm ${config.textColor} leading-tight`}>
                {insight.title}
              </h3>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Badge variant={priorityConfig.variant} className="text-xs">
                {priorityConfig.label}
              </Badge>
              {insight.confidence_score && (
                <span className="text-xs text-gray-500 ml-1">
                  {insight.confidence_score}%
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className={`text-sm ${config.textColor} opacity-90 mb-3`}>
            {insight.description}
          </p>

          {/* Impact and Value */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className={`${config.textColor} capitalize`}>
                {insight.impact.replace('_', ' ')}
              </span>
              {insight.potential_value && (
                <span className="font-semibold text-green-600">
                  +${insight.potential_value}
                </span>
              )}
            </div>
            {insight.action_required && (
              <Badge variant="outline" className="text-xs">
                Action Required
              </Badge>
            )}
          </div>

          {/* Expanded Content */}
          {isExpanded && insight.suggested_actions && (
            <div className="mt-4 pt-4 border-t border-current border-opacity-20">
              <h4 className={`font-medium text-sm ${config.textColor} mb-2`}>
                Suggested Actions:
              </h4>
              <div className="space-y-2">
                {insight.suggested_actions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleInsightAction(insight, action)
                    }}
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{action}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderAnalytics = () => {
    // Mock analytics data
    const analytics = {
      dailyRevenue: 1250,
      appointmentCount: 12,
      utilizationRate: 85,
      avgAppointmentValue: 104
    }

    return (
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <CurrencyDollarIcon className="w-6 h-6 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-800">
                ${analytics.dailyRevenue}
              </div>
              <div className="text-sm text-green-600">Daily Revenue</div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <ClockIcon className="w-6 h-6 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-800">
                {analytics.appointmentCount}
              </div>
              <div className="text-sm text-blue-600">Appointments</div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <ChartBarIcon className="w-6 h-6 mx-auto text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-purple-800">
                {analytics.utilizationRate}%
              </div>
              <div className="text-sm text-purple-600">Utilization</div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <ArrowTrendingUpIcon className="w-6 h-6 mx-auto text-amber-600 mb-2" />
              <div className="text-2xl font-bold text-amber-800">
                ${analytics.avgAppointmentValue}
              </div>
              <div className="text-sm text-amber-600">Avg Value</div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
              <div className="text-gray-500 text-sm">Chart visualization here</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSmartSuggestions = () => {
    const suggestions = [
      {
        title: 'Optimize 2 PM Slot',
        description: 'Book premium haircut to maximize revenue',
        value: '+$75',
        confidence: 92
      },
      {
        title: 'Follow-up Reminder',
        description: 'Send reminder to John Doe for next appointment',
        value: 'Retention',
        confidence: 78
      },
      {
        title: 'Upsell Opportunity',
        description: 'Suggest beard trim to current clients',
        value: '+$180',
        confidence: 65
      }
    ]

    return (
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm text-blue-900">
                  {suggestion.title}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {suggestion.confidence}%
                </Badge>
              </div>
              <p className="text-sm text-blue-800 opacity-90 mb-3">
                {suggestion.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-600">
                  {suggestion.value}
                </span>
                <Button size="sm" variant="outline" className="h-7">
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className={`h-[85vh] p-0 ${className}`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center space-x-2 text-white">
              <SparklesIcon className="w-5 h-5" />
              <span>AI Assistant</span>
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange?.(false)}
              className="text-white hover:bg-white/20 p-1"
            >
              <XMarkIcon className="w-5 h-5" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as any)}
            className="w-full mt-4"
          >
            <TabsList className="grid w-full grid-cols-3 bg-white/20">
              <TabsTrigger 
                value="insights" 
                className="text-white data-[state=active]:bg-white data-[state=active]:text-blue-600"
              >
                Insights
              </TabsTrigger>
              <TabsTrigger 
                value="analytics"
                className="text-white data-[state=active]:bg-white data-[state=active]:text-purple-600"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="suggestions"
                className="text-white data-[state=active]:bg-white data-[state=active]:text-green-600"
              >
                Suggestions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} className="h-full">
            <TabsContent value="insights" className="h-full m-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-1">
                  {aiInsights.map(insight => renderInsightCard(insight))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analytics" className="h-full m-0">
              <ScrollArea className="h-full p-4">
                {renderAnalytics()}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="suggestions" className="h-full m-0">
              <ScrollArea className="h-full p-4">
                {renderSmartSuggestions()}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Handle for easier dragging */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MobileAIDrawer
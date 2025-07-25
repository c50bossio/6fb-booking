'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, isToday, isTomorrow, isYesterday } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  SparklesIcon,
  ClockIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BoltIcon,
  StarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface CalendarUIEnhancementsProps {
  currentDate: Date
  view: 'day' | 'week' | 'month'
  appointments: any[]
  barbers: any[]
  metrics?: {
    todayRevenue?: number
    completedAppointments?: number
    utilization?: number
    efficiency?: number
  }
  showMetrics?: boolean
  showInsights?: boolean
  showQuickActions?: boolean
}

interface QuickInsight {
  id: string
  type: 'success' | 'warning' | 'info' | 'tip'
  icon: React.ComponentType<{ className?: string }>
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  onClick: () => void
  variant?: 'default' | 'secondary' | 'outline'
  disabled?: boolean
}

export function CalendarUIEnhancements({
  currentDate,
  view,
  appointments,
  barbers,
  metrics,
  showMetrics = true,
  showInsights = true,
  showQuickActions = true
}: CalendarUIEnhancementsProps) {
  const [activeInsight, setActiveInsight] = useState<QuickInsight | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)

  // Calculate date context
  const dateContext = {
    isToday: isToday(currentDate),
    isTomorrow: isTomorrow(currentDate),
    isYesterday: isYesterday(currentDate),
    formatted: format(currentDate, 'EEEE, MMMM d, yyyy')
  }

  // Generate dynamic insights based on calendar data
  const generateInsights = useCallback((): QuickInsight[] => {
    const insights: QuickInsight[] = []
    
    // Today's appointments analysis
    const todayAppointments = appointments.filter(apt => 
      format(new Date(apt.start_time), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    )

    if (dateContext.isToday && todayAppointments.length === 0) {
      insights.push({
        id: 'no-appointments-today',
        type: 'info',
        icon: CalendarIcon,
        title: 'Free Day Today',
        message: 'No appointments scheduled. Great time for walk-ins or marketing!',
        action: {
          label: 'Create Appointment',
          onClick: () => console.log('Create appointment')
        }
      })
    }

    // High utilization warning
    if (metrics?.utilization && metrics.utilization > 85) {
      insights.push({
        id: 'high-utilization',
        type: 'warning',
        icon: ExclamationTriangleIcon,
        title: 'High Utilization',
        message: `${metrics.utilization}% booked today. Consider breaks between appointments.`,
        action: {
          label: 'Smart Schedule',
          onClick: () => console.log('Open smart scheduling')
        }
      })
    }

    // Revenue milestone
    if (metrics?.todayRevenue && metrics.todayRevenue > 500) {
      insights.push({
        id: 'revenue-milestone',
        type: 'success',
        icon: TrophyIcon,
        title: 'Revenue Goal Hit!',
        message: `Excellent! You've earned $${metrics.todayRevenue} today.`,
      })
    }

    // Efficiency tip
    if (metrics?.efficiency && metrics.efficiency < 70) {
      insights.push({
        id: 'efficiency-tip',
        type: 'tip',
        icon: BoltIcon,
        title: 'Efficiency Opportunity',
        message: 'Consider using buffer times and smart scheduling to improve flow.',
        action: {
          label: 'View Tips',
          onClick: () => console.log('Show efficiency tips')
        }
      })
    }

    // Peak hours insight
    const currentHour = new Date().getHours()
    if (dateContext.isToday && currentHour >= 14 && currentHour <= 18) {
      insights.push({
        id: 'peak-hours',
        type: 'info',
        icon: ClockIcon,
        title: 'Peak Hours',
        message: 'Prime time for appointments. Make sure to optimize your schedule!',
      })
    }

    return insights
  }, [appointments, metrics, dateContext])

  // Quick actions based on current context
  const quickActions: QuickAction[] = [
    {
      id: 'new-appointment',
      label: 'New Appointment',
      icon: ClockIcon,
      shortcut: 'N',
      onClick: () => console.log('Create new appointment'),
      variant: 'default'
    },
    {
      id: 'smart-schedule',
      label: 'Smart Schedule',
      icon: SparklesIcon,
      shortcut: 'S',
      onClick: () => console.log('Open smart scheduling'),
      variant: 'secondary'
    },
    {
      id: 'quick-stats',
      label: 'Today\'s Stats',
      icon: ChartBarIcon,
      onClick: () => console.log('Show stats'),
      variant: 'outline'
    }
  ]

  // Rotate insights automatically
  useEffect(() => {
    const insights = generateInsights()
    if (insights.length > 0) {
      let currentIndex = 0
      setActiveInsight(insights[0])

      const interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % insights.length
        setShowAnimation(true)
        setTimeout(() => {
          setActiveInsight(insights[currentIndex])
          setShowAnimation(false)
        }, 150)
      }, 8000) // Rotate every 8 seconds

      return () => clearInterval(interval)
    }
  }, [generateInsights])

  const getInsightStyles = (type: QuickInsight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
      case 'tip':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200'
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Date Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {dateContext.formatted}
          </h2>
          <div className="flex items-center space-x-2 mt-1">
            {dateContext.isToday && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <span className="animate-pulse mr-1">●</span>
                Today
              </Badge>
            )}
            {dateContext.isTomorrow && (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                Tomorrow
              </Badge>
            )}
            {dateContext.isYesterday && (
              <Badge variant="outline" className="text-gray-600 border-gray-300">
                Yesterday
              </Badge>
            )}
          </div>
        </div>
        
        {/* Quick metrics display */}
        {showMetrics && metrics && (
          <div className="flex items-center space-x-4 text-sm">
            {metrics.completedAppointments !== undefined && (
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {metrics.completedAppointments}
                </div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
            )}
            {metrics.todayRevenue !== undefined && (
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  ${metrics.todayRevenue}
                </div>
                <div className="text-xs text-gray-600">Revenue</div>
              </div>
            )}
            {metrics.utilization !== undefined && (
              <div className="text-center min-w-[60px]">
                <div className="text-lg font-bold text-purple-600">
                  {metrics.utilization}%
                </div>
                <div className="text-xs text-gray-600">Utilization</div>
                <Progress 
                  value={metrics.utilization} 
                  className="w-12 h-1 mt-1"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Insights Banner */}
      {showInsights && activeInsight && (
        <div 
          className={`
            p-4 rounded-lg border transition-all duration-300 
            ${getInsightStyles(activeInsight.type)}
            ${showAnimation ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <activeInsight.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{activeInsight.title}</h4>
                <p className="text-sm mt-1 opacity-90">{activeInsight.message}</p>
              </div>
            </div>
            
            {activeInsight.action && (
              <Button
                size="sm"
                variant="ghost"
                onClick={activeInsight.action.onClick}
                className="ml-4 flex-shrink-0 text-xs"
              >
                {activeInsight.action.label}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {showQuickActions && (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <BoltIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Quick Actions
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                disabled={action.disabled}
                className="text-xs relative"
              >
                <action.icon className="h-3 w-3 mr-1" />
                {action.label}
                {action.shortcut && (
                  <span className="ml-2 text-xs opacity-60">
                    {action.shortcut}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* View-specific enhancements */}
      {view === 'day' && dateContext.isToday && (
        <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Live Day View
            </span>
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 text-xs">
              {format(new Date(), 'h:mm a')}
            </Badge>
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            Current time is highlighted. Perfect for managing today's schedule!
          </p>
        </div>
      )}

      {/* Barber performance preview */}
      {barbers.length > 1 && view !== 'month' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {barbers.slice(0, 3).map((barber, index) => {
            const barberAppointments = appointments.filter(apt => apt.barber_id === barber.id)
            const completedToday = barberAppointments.filter(apt => 
              apt.status === 'completed' && 
              format(new Date(apt.start_time), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
            ).length

            return (
              <div key={barber.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {(barber.name || barber.first_name || 'B').charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {barber.name || `${barber.first_name} ${barber.last_name}`.trim()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {completedToday} completed today
                      </div>
                    </div>
                  </div>
                  
                  {completedToday > 3 && (
                    <StarIcon className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Hook for managing UI enhancements
export function useCalendarUIEnhancements(appointments: any[], barbers: any[]) {
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    completedAppointments: 0,
    utilization: 0,
    efficiency: 0
  })

  // Calculate real-time metrics
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayAppointments = appointments.filter(apt => 
      format(new Date(apt.start_time), 'yyyy-MM-dd') === today
    )

    const completed = todayAppointments.filter(apt => apt.status === 'completed')
    const revenue = completed.reduce((sum, apt) => sum + (apt.price || 0), 0)
    const totalSlots = 12 * 60 / 30 // 12 hours of 30-min slots
    const bookedSlots = todayAppointments.length
    const utilization = Math.round((bookedSlots / totalSlots) * 100)
    
    // Simple efficiency calculation based on on-time completion
    const onTimeCompletions = completed.filter(apt => {
      const appointmentTime = new Date(apt.start_time)
      const completedTime = new Date(apt.completed_at || apt.start_time)
      return Math.abs(completedTime.getTime() - appointmentTime.getTime()) < 15 * 60 * 1000 // Within 15 minutes
    }).length
    
    const efficiency = completed.length > 0 ? Math.round((onTimeCompletions / completed.length) * 100) : 100

    setMetrics({
      todayRevenue: revenue,
      completedAppointments: completed.length,
      utilization: Math.min(utilization, 100),
      efficiency
    })
  }, [appointments])

  return { metrics }
}

export default CalendarUIEnhancements
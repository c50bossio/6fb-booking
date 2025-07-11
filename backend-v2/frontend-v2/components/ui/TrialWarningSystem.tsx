'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, X, Clock, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TrialStatus } from './TrialStatusBanner'

interface TrialWarningSystemProps {
  trialStatus: TrialStatus
  onUpgrade?: () => void
  onDismiss?: (warningId: string) => void
}

interface WarningConfig {
  id: string
  triggerDays: number
  title: string
  message: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  showOncePerDay?: boolean
  persistent?: boolean
}

const warningConfigs: WarningConfig[] = [
  {
    id: 'trial_expires_tomorrow',
    triggerDays: 1,
    title: 'Trial Expires Tomorrow!',
    message: 'Your free trial ends tomorrow. Upgrade now to avoid any interruption to your barbershop operations.',
    urgency: 'critical',
    persistent: true
  },
  {
    id: 'trial_expires_3_days',
    triggerDays: 3,
    title: '3 Days Left in Trial',
    message: 'Your trial expires in 3 days. Upgrade soon to ensure uninterrupted access to all premium features.',
    urgency: 'high',
    showOncePerDay: true
  },
  {
    id: 'trial_expires_7_days',
    triggerDays: 7,
    title: 'Trial Ends in a Week',
    message: 'You have 7 days left in your free trial. Consider upgrading to unlock unlimited bookings and advanced features.',
    urgency: 'medium',
    showOncePerDay: true
  },
  {
    id: 'trial_expired',
    triggerDays: 0,
    title: 'Trial Has Expired',
    message: 'Your free trial has ended. Upgrade now to restore access to all features and keep your business running.',
    urgency: 'critical',
    persistent: true
  }
]

export function TrialWarningSystem({ trialStatus, onUpgrade, onDismiss }: TrialWarningSystemProps) {
  const [dismissedWarnings, setDismissedWarnings] = useState<Record<string, number>>({})
  const [currentWarning, setCurrentWarning] = useState<WarningConfig | null>(null)

  useEffect(() => {
    // Load dismissed warnings from localStorage
    const stored = localStorage.getItem('trial_dismissed_warnings')
    if (stored) {
      try {
        setDismissedWarnings(JSON.parse(stored))
      } catch {
        setDismissedWarnings({})
      }
    }
  }, [])

  useEffect(() => {
    if (!trialStatus.is_trial_active && trialStatus.subscription_status !== 'trial') {
      // Not on trial, don't show warnings
      setCurrentWarning(null)
      return
    }

    const daysRemaining = trialStatus.trial_days_remaining

    // Find the most urgent applicable warning
    const applicableWarnings = warningConfigs.filter(config => {
      if (daysRemaining > config.triggerDays) return false
      if (daysRemaining === config.triggerDays || (config.triggerDays === 0 && daysRemaining <= 0)) {
        return true
      }
      return false
    })

    if (applicableWarnings.length === 0) {
      setCurrentWarning(null)
      return
    }

    // Sort by urgency and trigger days to get the most relevant warning
    const sortedWarnings = applicableWarnings.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
      if (urgencyDiff !== 0) return urgencyDiff
      return a.triggerDays - b.triggerDays
    })

    const warning = sortedWarnings[0]

    // Check if warning should be shown
    const now = Date.now()
    const dismissedTime = dismissedWarnings[warning.id]

    if (dismissedTime) {
      if (warning.persistent) {
        // Persistent warnings reappear after 4 hours
        if (now - dismissedTime < 4 * 60 * 60 * 1000) {
          setCurrentWarning(null)
          return
        }
      } else if (warning.showOncePerDay) {
        // Daily warnings reappear after 24 hours
        if (now - dismissedTime < 24 * 60 * 60 * 1000) {
          setCurrentWarning(null)
          return
        }
      } else {
        // Regular warnings don't reappear once dismissed
        setCurrentWarning(null)
        return
      }
    }

    setCurrentWarning(warning)
  }, [trialStatus, dismissedWarnings])

  const handleDismiss = (warningId: string) => {
    const now = Date.now()
    const newDismissed = { ...dismissedWarnings, [warningId]: now }
    setDismissedWarnings(newDismissed)
    localStorage.setItem('trial_dismissed_warnings', JSON.stringify(newDismissed))
    
    setCurrentWarning(null)
    onDismiss?.(warningId)
  }

  if (!currentWarning) {
    return null
  }

  const getWarningStyles = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
          titleColor: 'text-red-800 dark:text-red-300',
          textColor: 'text-red-700 dark:text-red-400'
        }
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          iconColor: 'text-orange-600 dark:text-orange-400',
          titleColor: 'text-orange-800 dark:text-orange-300',
          textColor: 'text-orange-700 dark:text-orange-400'
        }
      case 'medium':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          titleColor: 'text-yellow-800 dark:text-yellow-300',
          textColor: 'text-yellow-700 dark:text-yellow-400'
        }
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
          titleColor: 'text-blue-800 dark:text-blue-300',
          textColor: 'text-blue-700 dark:text-blue-400'
        }
    }
  }

  const styles = getWarningStyles(currentWarning.urgency)

  const getIcon = () => {
    if (currentWarning.urgency === 'critical' || currentWarning.urgency === 'high') {
      return <AlertTriangle className={`h-5 w-5 ${styles.iconColor}`} />
    }
    return <Clock className={`h-5 w-5 ${styles.iconColor}`} />
  }

  const getButtonText = () => {
    if (trialStatus.trial_days_remaining <= 1) {
      return 'Upgrade Now'
    }
    return 'View Plans'
  }

  return (
    <Card className={`${styles.bg} ${styles.border} shadow-lg animate-in slide-in-from-top-2 duration-300`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-semibold ${styles.titleColor} mb-1`}>
                {currentWarning.title}
              </h3>
              <p className={`text-sm ${styles.textColor}`}>
                {currentWarning.message}
              </p>
              
              {trialStatus.trial_expires_at && (
                <p className={`text-xs ${styles.textColor} opacity-75 mt-2`}>
                  Trial expires: {new Date(trialStatus.trial_expires_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <Button
              onClick={onUpgrade}
              variant={currentWarning.urgency === 'critical' ? 'primary' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              {getButtonText()}
            </Button>
            
            {!currentWarning.persistent && (
              <Button
                onClick={() => handleDismiss(currentWarning.id)}
                variant="ghost"
                size="sm"
                className={`${styles.textColor} hover:bg-black/5 dark:hover:bg-white/5`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TrialWarningSystem
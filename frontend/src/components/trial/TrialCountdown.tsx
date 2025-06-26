'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Crown,
  Zap
} from 'lucide-react'

export interface TrialCountdownProps {
  /** Trial end date */
  trialEndDate: Date
  /** Current subscription status */
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled'
  /** Callback when upgrade button is clicked */
  onUpgrade?: () => void
  /** Callback when trial info is clicked */
  onTrialInfoClick?: () => void
  /** Custom className for the component */
  className?: string
  /** Compact mode for smaller displays */
  compact?: boolean
  /** Show/hide upgrade button */
  showUpgradeButton?: boolean
}

export default function TrialCountdown({
  trialEndDate,
  subscriptionStatus = 'trial',
  onUpgrade,
  onTrialInfoClick,
  className,
  compact = false,
  showUpgradeButton = true
}: TrialCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number
    hours: number
    minutes: number
    expired: boolean
  }>({ days: 0, hours: 0, minutes: 0, expired: false })

  const calculateTimeRemaining = () => {
    const now = new Date()
    const endDate = new Date(trialEndDate)
    const difference = endDate.getTime() - now.getTime()

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, expired: true }
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

    return { days, hours, minutes, expired: false }
  }

  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(calculateTimeRemaining())
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [trialEndDate])

  const getTrialStatus = () => {
    if (subscriptionStatus === 'active') {
      return {
        status: 'active',
        color: 'success',
        icon: CheckCircle2,
        title: 'Premium Active',
        description: 'Enjoying full access',
        urgency: 'none' as const
      }
    }

    if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') {
      return {
        status: 'expired',
        color: 'destructive',
        icon: XCircle,
        title: 'Trial Expired',
        description: 'Upgrade to continue',
        urgency: 'critical' as const
      }
    }

    if (timeRemaining.expired) {
      return {
        status: 'expired',
        color: 'destructive',
        icon: XCircle,
        title: 'Trial Expired',
        description: 'Upgrade to continue',
        urgency: 'critical' as const
      }
    }

    if (timeRemaining.days === 0) {
      return {
        status: 'critical',
        color: 'destructive',
        icon: AlertTriangle,
        title: 'Trial Ending Today',
        description: 'Less than 24 hours left',
        urgency: 'critical' as const
      }
    }

    if (timeRemaining.days <= 3) {
      return {
        status: 'warning',
        color: 'warning',
        icon: AlertTriangle,
        title: `${timeRemaining.days} Days Left`,
        description: 'Trial ending soon',
        urgency: 'high' as const
      }
    }

    if (timeRemaining.days <= 7) {
      return {
        status: 'notice',
        color: 'warning',
        icon: Clock,
        title: `${timeRemaining.days} Days Left`,
        description: 'Consider upgrading',
        urgency: 'medium' as const
      }
    }

    return {
      status: 'active',
      color: 'info',
      icon: Calendar,
      title: `${timeRemaining.days} Days Left`,
      description: 'Trial in progress',
      urgency: 'low' as const
    }
  }

  const trialInfo = getTrialStatus()
  const StatusIcon = trialInfo.icon

  const formatEndDate = () => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(trialEndDate)
  }

  const getStatusColors = () => {
    switch (trialInfo.color) {
      case 'success':
        return {
          bg: 'bg-apple-success-50 dark:bg-apple-success-500/10',
          border: 'border-apple-success-200 dark:border-apple-success-500/20',
          text: 'text-apple-success-700 dark:text-apple-success-400',
          accent: 'text-apple-success-600 dark:text-apple-success-500'
        }
      case 'warning':
        return {
          bg: 'bg-apple-warning-50 dark:bg-apple-warning-500/10',
          border: 'border-apple-warning-200 dark:border-apple-warning-500/20',
          text: 'text-apple-warning-700 dark:text-apple-warning-400',
          accent: 'text-apple-warning-600 dark:text-apple-warning-500'
        }
      case 'destructive':
        return {
          bg: 'bg-apple-error-50 dark:bg-apple-error-500/10',
          border: 'border-apple-error-200 dark:border-apple-error-500/20',
          text: 'text-apple-error-700 dark:text-apple-error-400',
          accent: 'text-apple-error-600 dark:text-apple-error-500'
        }
      default:
        return {
          bg: 'bg-apple-info-50 dark:bg-apple-info-500/10',
          border: 'border-apple-info-200 dark:border-apple-info-500/20',
          text: 'text-apple-info-700 dark:text-apple-info-400',
          accent: 'text-apple-info-600 dark:text-apple-info-500'
        }
    }
  }

  const colors = getStatusColors()

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-apple-md transition-all duration-apple-normal",
          colors.bg,
          colors.border,
          "border cursor-pointer hover:shadow-apple-sm",
          className
        )}
        onClick={onTrialInfoClick}
      >
        <StatusIcon className={cn("h-4 w-4", colors.accent)} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium truncate", colors.text)}>
            {trialInfo.title}
          </p>
          {subscriptionStatus === 'trial' && !timeRemaining.expired && (
            <p className="text-xs text-muted-foreground">
              Until {formatEndDate()}
            </p>
          )}
        </div>
        {showUpgradeButton && subscriptionStatus !== 'active' && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onUpgrade?.()
            }}
            className="text-xs px-2 py-1 h-6"
          >
            Upgrade
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card
      className={cn(
        "transition-all duration-apple-normal hover:shadow-apple-md",
        colors.bg,
        colors.border,
        "border-2",
        trialInfo.urgency === 'critical' && "animate-pulse-glow",
        className
      )}
    >
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={onTrialInfoClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-5 w-5", colors.accent)} />
            <CardTitle className={cn("text-lg", colors.text)}>
              {trialInfo.title}
            </CardTitle>
          </div>
          <Badge
            variant={trialInfo.color === 'success' ? 'default' : 'secondary'}
            className={cn(
              "text-xs font-medium",
              trialInfo.color === 'success' && "bg-apple-success-100 text-apple-success-700 hover:bg-apple-success-100",
              trialInfo.color === 'warning' && "bg-apple-warning-100 text-apple-warning-700 hover:bg-apple-warning-100",
              trialInfo.color === 'destructive' && "bg-apple-error-100 text-apple-error-700 hover:bg-apple-error-100"
            )}
          >
            {subscriptionStatus === 'active' ? 'Premium' : 'Trial'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Trial Description */}
          <p className={cn("text-sm", colors.text)}>
            {trialInfo.description}
          </p>

          {/* Time Remaining Display */}
          {subscriptionStatus === 'trial' && !timeRemaining.expired && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                {timeRemaining.days > 0 && (
                  <div className="text-center">
                    <div className={cn("text-2xl font-bold", colors.accent)}>
                      {timeRemaining.days}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {timeRemaining.days === 1 ? 'Day' : 'Days'}
                    </div>
                  </div>
                )}
                {timeRemaining.days === 0 && (
                  <>
                    <div className="text-center">
                      <div className={cn("text-2xl font-bold", colors.accent)}>
                        {timeRemaining.hours}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {timeRemaining.hours === 1 ? 'Hour' : 'Hours'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={cn("text-2xl font-bold", colors.accent)}>
                        {timeRemaining.minutes}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {timeRemaining.minutes === 1 ? 'Min' : 'Mins'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Trial ends {formatEndDate()}
              </div>
            </div>
          )}

          {/* Upgrade Section */}
          {showUpgradeButton && subscriptionStatus !== 'active' && (
            <div className="space-y-3">
              {trialInfo.urgency === 'critical' ? (
                <Button
                  onClick={onUpgrade}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium shadow-apple-md"
                  size="lg"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade Now - Don't Lose Access!
                </Button>
              ) : trialInfo.urgency === 'high' ? (
                <Button
                  onClick={onUpgrade}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium shadow-apple-md"
                  size="lg"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade to Premium
                </Button>
              ) : (
                <Button
                  onClick={onUpgrade}
                  variant="outline"
                  className="w-full font-medium"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Premium
                </Button>
              )}

              <div className="text-xs text-muted-foreground text-center">
                Unlock all features and unlimited access
              </div>
            </div>
          )}

          {/* Premium Features Preview */}
          {subscriptionStatus !== 'active' && (
            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Premium includes:
              </div>
              <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-apple-success-500" />
                  Unlimited appointments
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-apple-success-500" />
                  Advanced analytics
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-apple-success-500" />
                  Priority support
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Export types for external use
export type { TrialCountdownProps }

// Helper function to calculate trial days remaining
export const calculateDaysRemaining = (trialEndDate: Date): number => {
  const now = new Date()
  const endDate = new Date(trialEndDate)
  const difference = endDate.getTime() - now.getTime()

  if (difference <= 0) return 0

  return Math.floor(difference / (1000 * 60 * 60 * 24))
}

// Helper function to check if trial is expired
export const isTrialExpired = (trialEndDate: Date): boolean => {
  return new Date() > new Date(trialEndDate)
}

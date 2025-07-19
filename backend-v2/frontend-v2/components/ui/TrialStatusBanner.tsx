'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTrialStatus, TrialStatus } from '@/lib/api'
import { AlertTriangle, Calendar, CreditCard, CheckCircle } from 'lucide-react'

interface TrialStatusBannerProps {
  organizationId: number
  className?: string
}

export function TrialStatusBanner({ organizationId, className = '' }: TrialStatusBannerProps) {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchTrialStatus = async () => {
      try {
        const status = await getTrialStatus(organizationId)
        setTrialStatus(status)
      } catch (err: any) {
        setError('Failed to load trial status')
        } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      fetchTrialStatus()
    }
  }, [organizationId])

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 h-16 rounded-lg ${className}`} />
    )
  }

  if (error || !trialStatus) {
    return null // Fail silently to not break the UI
  }

  // Don't show banner for active paid subscriptions
  if (trialStatus.subscription_status === 'active' && !trialStatus.trial_active) {
    return null
  }

  // Don't show if trial is not active and not expired
  if (!trialStatus.trial_active && trialStatus.subscription_status !== 'expired') {
    return null
  }

  const handleUpgradeClick = () => {
    // Redirect to checkout with organization-specific pricing
    if (trialStatus) {
      const params = new URLSearchParams({
        chairs: trialStatus.chairs_count.toString(),
        total: trialStatus.monthly_cost.toString(),
        organizationId: trialStatus.organization_id.toString()
      })
      router.push(`/billing/checkout?${params.toString()}`)
    } else {
      router.push('/billing/plans')
    }
  }

  const getBannerStyle = () => {
    if (trialStatus.subscription_status === 'expired') {
      return {
        bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        textColor: 'text-red-800 dark:text-red-200',
        icon: AlertTriangle,
        iconColor: 'text-red-600 dark:text-red-400'
      }
    } else if (trialStatus.days_remaining <= 1) {
      return {
        bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        textColor: 'text-orange-800 dark:text-orange-200',
        icon: AlertTriangle,
        iconColor: 'text-orange-600 dark:text-orange-400'
      }
    } else if (trialStatus.days_remaining <= 3) {
      return {
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        icon: Calendar,
        iconColor: 'text-yellow-600 dark:text-yellow-400'
      }
    } else {
      return {
        bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-800 dark:text-blue-200',
        icon: CheckCircle,
        iconColor: 'text-blue-600 dark:text-blue-400'
      }
    }
  }

  const bannerStyle = getBannerStyle()
  const IconComponent = bannerStyle.icon

  const getMessageText = () => {
    if (trialStatus.subscription_status === 'expired') {
      return {
        title: 'Trial Expired',
        message: `Your trial for ${trialStatus.organization_name} has expired. Add a payment method to reactivate your account.`,
        cta: 'Reactivate Account'
      }
    } else if (trialStatus.days_remaining === 0) {
      return {
        title: 'Trial Expires Today',
        message: `Your trial expires today! Add payment method to continue using ${trialStatus.organization_name}.`,
        cta: 'Add Payment Method'
      }
    } else if (trialStatus.days_remaining === 1) {
      return {
        title: 'Trial Expires Tomorrow',
        message: `Your trial expires tomorrow. Add payment method now to avoid service interruption.`,
        cta: 'Add Payment Method'
      }
    } else if (trialStatus.days_remaining <= 3) {
      return {
        title: `${trialStatus.days_remaining} Days Remaining`,
        message: `Your trial expires in ${trialStatus.days_remaining} days. Add payment method to continue seamlessly.`,
        cta: 'Add Payment Method'
      }
    } else {
      return {
        title: `${trialStatus.days_remaining} Days Left in Trial`,
        message: `You're using ${trialStatus.organization_name} free trial. Plan will be $${trialStatus.monthly_cost}/month after trial.`,
        cta: 'View Billing'
      }
    }
  }

  const messageContent = getMessageText()

  return (
    <div className={`border rounded-lg p-4 ${bannerStyle.bgColor} ${className}`}>
      <div className="flex items-start space-x-3">
        <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${bannerStyle.iconColor}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h3 className={`font-semibold text-sm ${bannerStyle.textColor}`}>
                {messageContent.title}
              </h3>
              <p className={`text-sm mt-1 ${bannerStyle.textColor} opacity-90`}>
                {messageContent.message}
              </p>
              {trialStatus.days_remaining > 3 && (
                <div className="mt-2 text-xs opacity-75">
                  <span className="font-medium">{trialStatus.chairs_count} chairs</span> • 
                  <span className="ml-1">Expires {new Date(trialStatus.trial_expires_at || '').toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            <div className="flex-shrink-0">
              <button
                onClick={handleUpgradeClick}
                className={`
                  inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${trialStatus.subscription_status === 'expired' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : trialStatus.days_remaining <= 1
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : trialStatus.days_remaining <= 3
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {messageContent.cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrialStatusBanner
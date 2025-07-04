'use client'

import React from 'react'
import { CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface SubscriptionBannerProps {
  subscription: {
    tier: string
    status: string
    conversations_used: number
    conversation_limit: number | null
    agents_used: number
    agent_limit: number
    trial_ends_at?: string
    monthly_price?: number
  }
}

export function AgentSubscriptionBanner({ subscription }: SubscriptionBannerProps) {
  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'trial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'starter': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'professional': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'enterprise': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'trial': return <Clock className="w-4 h-4 text-blue-600" />
      case 'past_due': return <AlertTriangle className="w-4 h-4 text-red-600" />
      default: return <CreditCard className="w-4 h-4 text-gray-600" />
    }
  }

  const calculateUsagePercentage = (used: number, limit: number | null) => {
    if (!limit) return 0
    return Math.round((used / limit) * 100)
  }

  const isNearLimit = (used: number, limit: number | null) => {
    if (!limit) return false
    return (used / limit) >= 0.8
  }

  const getTrialDaysLeft = () => {
    if (!subscription.trial_ends_at) return 0
    const trialEnd = new Date(subscription.trial_ends_at)
    const now = new Date()
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  return (
    <Card className="p-4 border-l-4 border-l-primary-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon(subscription.status)}
            <Badge className={getTierColor(subscription.tier)}>
              {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
            </Badge>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {/* Conversation Usage */}
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Conversations: </span>
              <span className={`font-medium ${
                isNearLimit(subscription.conversations_used, subscription.conversation_limit)
                  ? 'text-red-600'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {subscription.conversations_used}
                {subscription.conversation_limit ? ` / ${subscription.conversation_limit}` : ' (unlimited)'}
              </span>
            </div>

            {/* Agent Usage */}
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Agents: </span>
              <span className={`font-medium ${
                subscription.agents_used >= subscription.agent_limit
                  ? 'text-red-600'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {subscription.agents_used} / {subscription.agent_limit}
              </span>
            </div>

            {/* Trial Info */}
            {subscription.tier === 'trial' && subscription.trial_ends_at && (
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Trial ends in: </span>
                <span className="font-medium text-blue-600">
                  {getTrialDaysLeft()} days
                </span>
              </div>
            )}

            {/* Monthly Price */}
            {subscription.monthly_price && subscription.monthly_price > 0 && (
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Monthly: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${subscription.monthly_price}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Warning Messages */}
          {subscription.tier === 'trial' && getTrialDaysLeft() <= 3 && (
            <div className="hidden sm:block">
              <p className="text-sm text-orange-600">
                Trial expires soon - upgrade to continue using agents
              </p>
            </div>
          )}

          {isNearLimit(subscription.conversations_used, subscription.conversation_limit) && (
            <div className="hidden sm:block">
              <p className="text-sm text-red-600">
                Approaching conversation limit
              </p>
            </div>
          )}

          {subscription.agents_used >= subscription.agent_limit && (
            <div className="hidden sm:block">
              <p className="text-sm text-red-600">
                Agent limit reached
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {subscription.tier === 'trial' && (
            <Button size="sm" onClick={() => window.location.href = '/agents/subscription'}>
              Upgrade Plan
            </Button>
          )}

          {subscription.status === 'past_due' && (
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/agents/subscription'}>
              Update Payment
            </Button>
          )}

          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => window.location.href = '/agents/subscription'}
          >
            Manage
          </Button>
        </div>
      </div>

      {/* Mobile-friendly usage bars */}
      <div className="mt-4 md:hidden space-y-3">
        {/* Conversation Usage Bar */}
        {subscription.conversation_limit && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Conversations</span>
              <span className="font-medium">
                {subscription.conversations_used} / {subscription.conversation_limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  isNearLimit(subscription.conversations_used, subscription.conversation_limit)
                    ? 'bg-red-500'
                    : 'bg-primary-500'
                }`}
                style={{
                  width: `${Math.min(100, calculateUsagePercentage(subscription.conversations_used, subscription.conversation_limit))}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Agent Usage Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Agents</span>
            <span className="font-medium">
              {subscription.agents_used} / {subscription.agent_limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                subscription.agents_used >= subscription.agent_limit
                  ? 'bg-red-500'
                  : 'bg-primary-500'
              }`}
              style={{
                width: `${Math.min(100, (subscription.agents_used / subscription.agent_limit) * 100)}%`
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
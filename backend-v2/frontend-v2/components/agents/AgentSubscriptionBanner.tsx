'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, AlertTriangle, CheckCircle, Clock, Crown, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { type Subscription } from '@/lib/api/agents'

interface SubscriptionBannerProps {
  subscription: Subscription | null
}

export function AgentSubscriptionBanner({ subscription }: SubscriptionBannerProps) {
  const router = useRouter()

  // Show create subscription banner if no subscription exists
  if (!subscription) {
    return (
      <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-200">
                Get Started with AI Agents
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Create your first subscription to start using AI agents for your barbershop
              </p>
            </div>
          </div>
          <Button 
            onClick={() => router.push('/agents/subscription')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Crown className="w-4 h-4 mr-2" />
            Start Free Trial
          </Button>
        </div>
      </Card>
    )
  }

  const getTierColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'trial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'starter': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'professional': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'enterprise': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive 
      ? <CheckCircle className="w-4 h-4 text-green-600" />
      : <AlertTriangle className="w-4 h-4 text-red-600" />
  }

  const calculateUsagePercentage = (used: number, limit: number | null) => {
    if (!limit) return 0
    return Math.round((used / limit) * 100)
  }

  const isNearLimit = (used: number, limit: number | null) => {
    if (!limit) return false
    return (used / limit) >= 0.8
  }

  const getDaysUntilNextBilling = () => {
    const billingDate = new Date(subscription.next_billing_date)
    const now = new Date()
    const diffTime = billingDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const agentsUsed = subscription.current_usage.agents_count
  const conversationsUsed = subscription.current_usage.conversations_this_month

  return (
    <Card className="p-4 border-l-4 border-l-primary-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon(subscription.is_active)}
            <Badge className={getTierColor(subscription.plan)}>
              {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
            </Badge>
            {subscription.billing_cycle === 'yearly' && (
              <Badge variant="outline" className="text-xs">
                Yearly
              </Badge>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {/* Conversation Usage */}
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Conversations: </span>
              <span className={`font-medium ${
                isNearLimit(conversationsUsed, subscription.max_conversations_per_month)
                  ? 'text-red-600'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {conversationsUsed}
                {subscription.max_conversations_per_month ? ` / ${subscription.max_conversations_per_month}` : ' (unlimited)'}
              </span>
            </div>

            {/* Agent Usage */}
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Agents: </span>
              <span className={`font-medium ${
                agentsUsed >= subscription.max_agents
                  ? 'text-red-600'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {agentsUsed} / {subscription.max_agents}
              </span>
            </div>

            {/* Next Billing */}
            {subscription.is_active && subscription.auto_renew && (
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Next billing: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {getDaysUntilNextBilling()} days
                </span>
              </div>
            )}

            {/* Billing Cycle */}
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Plan: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {subscription.billing_cycle === 'yearly' ? 'Annual' : 'Monthly'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Warning Messages */}
          {!subscription.is_active && (
            <div className="hidden sm:block">
              <p className="text-sm text-red-600">
                Subscription inactive - reactivate to use agents
              </p>
            </div>
          )}

          {isNearLimit(conversationsUsed, subscription.max_conversations_per_month) && (
            <div className="hidden sm:block">
              <p className="text-sm text-red-600">
                Approaching conversation limit
              </p>
            </div>
          )}

          {agentsUsed >= subscription.max_agents && (
            <div className="hidden sm:block">
              <p className="text-sm text-red-600">
                Agent limit reached
              </p>
            </div>
          )}

          {getDaysUntilNextBilling() <= 3 && subscription.auto_renew && (
            <div className="hidden sm:block">
              <p className="text-sm text-orange-600">
                Billing date approaching
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {!subscription.is_active && (
            <Button size="sm" onClick={() => router.push('/agents/subscription')}>
              Reactivate
            </Button>
          )}

          {agentsUsed >= subscription.max_agents && (
            <Button size="sm" onClick={() => router.push('/agents/subscription')}>
              Upgrade Plan
            </Button>
          )}

          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => router.push('/agents/subscription')}
          >
            Manage
          </Button>
        </div>
      </div>

      {/* Mobile-friendly usage bars */}
      <div className="mt-4 md:hidden space-y-3">
        {/* Conversation Usage Bar */}
        {subscription.max_conversations_per_month && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Conversations</span>
              <span className="font-medium">
                {conversationsUsed} / {subscription.max_conversations_per_month}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  isNearLimit(conversationsUsed, subscription.max_conversations_per_month)
                    ? 'bg-red-500'
                    : 'bg-primary-500'
                }`}
                style={{
                  width: `${Math.min(100, calculateUsagePercentage(conversationsUsed, subscription.max_conversations_per_month))}%`
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
              {agentsUsed} / {subscription.max_agents}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                agentsUsed >= subscription.max_agents
                  ? 'bg-red-500'
                  : 'bg-primary-500'
              }`}
              style={{
                width: `${Math.min(100, (agentsUsed / subscription.max_agents) * 100)}%`
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
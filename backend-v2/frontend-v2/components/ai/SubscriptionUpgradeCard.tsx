'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  ArrowTrendingUpIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  BoltIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface SubscriptionUpgradeCardProps {
  currentPlan: 'starter' | 'professional' | 'business' | 'enterprise'
  monthlyTokenUsage: number
  estimatedMonthlyCost: number
  potentialSavings?: number
  onUpgrade?: () => void
  className?: string
}

const planDetails = {
  starter: {
    name: 'Starter',
    price: 10,
    tokens: 5000,
    agents: 1,
    nextTier: 'professional'
  },
  professional: {
    name: 'Professional', 
    price: 25,
    tokens: 15000,
    agents: 3,
    nextTier: 'business'
  },
  business: {
    name: 'Business',
    price: 50,
    tokens: 50000,
    agents: -1,
    nextTier: 'enterprise'
  },
  enterprise: {
    name: 'Enterprise',
    price: 0,
    tokens: 100000,
    agents: -1,
    nextTier: null
  }
}

export function SubscriptionUpgradeCard({
  currentPlan,
  monthlyTokenUsage,
  estimatedMonthlyCost,
  potentialSavings,
  onUpgrade,
  className
}: SubscriptionUpgradeCardProps) {
  const current = planDetails[currentPlan]
  const nextTier = current.nextTier ? planDetails[current.nextTier as keyof typeof planDetails] : null
  
  // Calculate if upgrade makes financial sense
  const isOverTokenLimit = monthlyTokenUsage > current.tokens
  const tokenOverage = Math.max(0, monthlyTokenUsage - current.tokens)
  
  // Calculate upgrade savings
  const calculateUpgradeSavings = () => {
    if (!nextTier) return 0
    
    // Current cost with overage
    const currentBaseCost = current.price
    const overageTokens = Math.max(0, monthlyTokenUsage - current.tokens)
    
    // Simplified calculation - first 25K at $0.0005
    const overageCost = overageTokens * 0.0005
    const currentTotal = currentBaseCost + overageCost
    
    // Next tier cost
    const nextTierOverage = Math.max(0, monthlyTokenUsage - nextTier.tokens)
    const nextTierOverageCost = nextTierOverage * 0.0005
    const nextTierTotal = nextTier.price + nextTierOverageCost
    
    return Math.max(0, currentTotal - nextTierTotal)
  }
  
  const upgradeSavings = calculateUpgradeSavings()
  const shouldRecommendUpgrade = upgradeSavings > 5 || tokenOverage > current.tokens * 0.5
  
  if (!nextTier || !shouldRecommendUpgrade) {
    return (
      <Card variant="secondary" className={cn("border-dashed border-2", className)}>
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Perfect Plan Match
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your current {current.name} plan is optimized for your usage. 
            Keep building and we'll recommend upgrades when beneficial.
          </p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card variant="elevated" borderAccent className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Smart Upgrade Recommendation</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Based on your usage patterns
              </p>
            </div>
          </div>
          <Badge variant="success" className="flex items-center space-x-1">
            <SparklesIcon className="w-3 h-3" />
            <span>Save ${upgradeSavings.toFixed(2)}/mo</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current vs Recommended */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Plan</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{current.name}</div>
            <div className="text-sm text-gray-600">${current.price}/month</div>
            <div className="text-xs text-gray-500 mt-1">
              {(current.tokens / 1000).toFixed(0)}K tokens included
            </div>
          </div>
          
          <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-2 border-primary-200">
            <div className="text-sm text-primary-600 mb-1">Recommended</div>
            <div className="text-lg font-bold text-primary-700">{nextTier.name}</div>
            <div className="text-sm text-primary-600">${nextTier.price}/month</div>
            <div className="text-xs text-primary-600 mt-1">
              {(nextTier.tokens / 1000).toFixed(0)}K tokens included
            </div>
          </div>
        </div>
        
        {/* Usage Analysis */}
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
            <BoltIcon className="w-4 h-4 mr-2 text-yellow-600" />
            Your Usage Analysis
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Token Usage:</span>
              <span className="font-medium">{(monthlyTokenUsage / 1000).toFixed(1)}K</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Overage:</span>
              <span className="font-medium text-orange-600">
                {tokenOverage > 0 ? `${(tokenOverage / 1000).toFixed(1)}K tokens` : 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Current Cost:</span>
              <span className="font-medium">${estimatedMonthlyCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Cost After Upgrade:</span>
              <span className="font-medium text-green-600">
                ${(estimatedMonthlyCost - upgradeSavings).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Upgrade Benefits */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-white">Upgrade Benefits:</h4>
          <div className="space-y-1">
            <div className="flex items-start space-x-2">
              <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Save ${upgradeSavings.toFixed(2)}/month on token overages
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {nextTier.agents === -1 ? 'Unlimited' : nextTier.agents} AI agents (vs {current.agents})
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {((nextTier.tokens - current.tokens) / 1000).toFixed(0)}K more free tokens monthly
              </span>
            </div>
            {nextTier.name === 'Professional' && (
              <div className="flex items-start space-x-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Priority support & advanced analytics
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* CTA */}
        <div className="pt-2">
          <Button
            onClick={onUpgrade}
            variant="primary"
            size="md"
            className="w-full flex items-center justify-center space-x-2"
          >
            <CurrencyDollarIcon className="w-4 h-4" />
            <span>Upgrade to {nextTier.name} Plan</span>
          </Button>
          <p className="text-xs text-center text-gray-500 mt-2">
            Annual savings: ${(upgradeSavings * 12).toFixed(2)} • No commitment required
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default SubscriptionUpgradeCard
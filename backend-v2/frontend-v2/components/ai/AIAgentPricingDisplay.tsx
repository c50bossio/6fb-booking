'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  CheckIcon, 
  CurrencyDollarIcon, 
  SparklesIcon,
  TrendingUpIcon,
  BoltIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface PricingTier {
  id: string
  name: string
  price: number
  description: string
  popular?: boolean
  features: string[]
  limits: {
    agents: number | 'unlimited'
    tokens: number
    support: string
  }
  tokenRates: {
    tier1: number  // 0-25K tokens
    tier2: number  // 25K-100K tokens  
    tier3: number  // 100K+ tokens
  }
}

interface AIAgentPricingDisplayProps {
  currentTier?: string
  onUpgrade?: (tier: string) => void
  showComparison?: boolean
  className?: string
}

const pricingTiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 10,
    description: 'Perfect for getting started with AI automation',
    features: [
      '1 AI agent',
      '5,000 free tokens/month',
      'Basic templates',
      'Email support',
      'Essential analytics'
    ],
    limits: {
      agents: 1,
      tokens: 5000,
      support: 'Email'
    },
    tokenRates: {
      tier1: 0.0005,
      tier2: 0.0004,
      tier3: 0.0003
    }
  },
  {
    id: 'professional',
    name: 'Professional', 
    price: 25,
    description: 'Advanced automation for growing barbershops',
    popular: true,
    features: [
      '3 AI agents',
      '15,000 free tokens/month',
      'Advanced templates + customization',
      'Priority support',
      'Full analytics dashboard',
      'A/B testing capabilities'
    ],
    limits: {
      agents: 3,
      tokens: 15000,
      support: 'Priority'
    },
    tokenRates: {
      tier1: 0.0005,
      tier2: 0.0004,
      tier3: 0.0003
    }
  },
  {
    id: 'business',
    name: 'Business',
    price: 50,
    description: 'Complete automation suite for established businesses',
    features: [
      'Unlimited AI agents',
      '50,000 free tokens/month',
      'Full automation suite',
      'White-label options',
      'Dedicated support',
      'Custom integrations',
      'Advanced reporting'
    ],
    limits: {
      agents: 'unlimited',
      tokens: 50000,
      support: 'Dedicated'
    },
    tokenRates: {
      tier1: 0.0005,
      tier2: 0.0004,
      tier3: 0.0003
    }
  }
]

const TokenPricingBreakdown: React.FC<{ tier: PricingTier }> = ({ tier }) => (
  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
      Token Pricing (after free allowance)
    </h5>
    <div className="space-y-1 text-xs">
      <div className="flex justify-between">
        <span className="text-gray-500">0-25K tokens:</span>
        <span className="font-medium">${tier.tokenRates.tier1.toFixed(4)}/token</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">25K-100K tokens:</span>
        <span className="font-medium">${tier.tokenRates.tier2.toFixed(4)}/token</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">100K+ tokens:</span>
        <span className="font-medium">${tier.tokenRates.tier3.toFixed(4)}/token</span>
      </div>
    </div>
  </div>
)

const UsageEstimator: React.FC = () => {
  const [estimatedTokens, setEstimatedTokens] = React.useState(10000)
  
  const calculateCost = (tier: PricingTier, tokens: number) => {
    const billableTokens = Math.max(0, tokens - tier.limits.tokens)
    
    if (billableTokens === 0) {
      return tier.price
    }
    
    let cost = tier.price
    let remaining = billableTokens
    
    // Tier 1: 0-25K
    if (remaining > 0) {
      const tier1Tokens = Math.min(remaining, 25000)
      cost += tier1Tokens * tier.tokenRates.tier1
      remaining -= tier1Tokens
    }
    
    // Tier 2: 25K-100K  
    if (remaining > 0) {
      const tier2Tokens = Math.min(remaining, 75000)
      cost += tier2Tokens * tier.tokenRates.tier2
      remaining -= tier2Tokens
    }
    
    // Tier 3: 100K+
    if (remaining > 0) {
      cost += remaining * tier.tokenRates.tier3
    }
    
    return cost
  }
  
  return (
    <Card variant="secondary" className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUpIcon className="w-5 h-5 text-primary-600" />
          Usage Cost Estimator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Estimated Monthly Tokens
            </label>
            <input
              type="range"
              min="1000"
              max="200000"
              step="1000"
              value={estimatedTokens}
              onChange={(e) => setEstimatedTokens(parseInt(e.target.value))}
              className="w-full mt-2"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1K</span>
              <span className="font-medium">{(estimatedTokens / 1000).toFixed(0)}K tokens</span>
              <span>200K</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {pricingTiers.map((tier) => {
              const monthlyCost = calculateCost(tier, estimatedTokens)
              const savings = tier.id === 'starter' ? 0 : 
                calculateCost(pricingTiers[0], estimatedTokens) - monthlyCost
                
              return (
                <div key={tier.id} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">{tier.name}</div>
                  <div className="text-lg font-bold text-primary-600">
                    ${monthlyCost.toFixed(2)}
                  </div>
                  {savings > 0 && (
                    <div className="text-xs text-green-600 font-medium">
                      Save ${savings.toFixed(2)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AIAgentPricingDisplay({ 
  currentTier, 
  onUpgrade, 
  showComparison = true,
  className 
}: AIAgentPricingDisplayProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Pricing Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center space-x-2">
          <SparklesIcon className="w-8 h-8 text-primary-600" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Agent Pricing
          </h2>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Affordable monthly plans with usage-based scaling. Pay less upfront, 
          scale with your success.
        </p>
        
        {/* Value Proposition */}
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <CheckIcon className="w-4 h-4 text-green-500" />
            <span>67% lower base cost</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUpIcon className="w-4 h-4 text-blue-500" />
            <span>Usage-based scaling</span>
          </div>
          <div className="flex items-center space-x-1">
            <BoltIcon className="w-4 h-4 text-yellow-500" />
            <span>30-day free trial</span>
          </div>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricingTiers.map((tier) => (
          <Card 
            key={tier.id}
            variant={tier.popular ? 'elevated' : 'default'}
            className={cn(
              'relative overflow-hidden transition-all duration-200 hover:shadow-lg',
              tier.popular && 'ring-2 ring-primary-200 ring-opacity-50 scale-105',
              currentTier === tier.id && 'border-primary-300 bg-primary-50/30'
            )}
          >
            {tier.popular && (
              <div className="absolute top-0 inset-x-0">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white text-center py-2">
                  <div className="flex items-center justify-center space-x-1">
                    <StarIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Most Popular</span>
                  </div>
                </div>
              </div>
            )}
            
            <CardHeader className={cn('text-center', tier.popular && 'pt-12')}>
              <div className="space-y-2">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <div className="space-y-1">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-4xl font-bold text-primary-600">
                      ${tier.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">/month</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tier.description}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Key Limits */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <div className="text-lg font-bold text-primary-600">
                    {typeof tier.limits.agents === 'number' ? tier.limits.agents : '∞'}
                  </div>
                  <div className="text-xs text-gray-600">Agent{tier.limits.agents !== 1 ? 's' : ''}</div>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {(tier.limits.tokens / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-gray-600">Free Tokens</div>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2">
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Token Pricing Breakdown */}
              <TokenPricingBreakdown tier={tier} />

              {/* CTA Button */}
              <div className="pt-2">
                {currentTier === tier.id ? (
                  <Badge variant="secondary" className="w-full justify-center py-2">
                    Current Plan
                  </Badge>
                ) : (
                  <Button
                    onClick={() => onUpgrade?.(tier.id)}
                    variant={tier.popular ? 'primary' : 'outline'}
                    size="md"
                    className="w-full"
                  >
                    {currentTier ? 'Upgrade' : 'Get Started'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Cost Estimator */}
      {showComparison && <UsageEstimator />}

      {/* Additional Benefits */}
      <Card variant="secondary" borderAccent>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Success-Based Fees</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Only 1.5% fee when AI agents generate actual revenue for your business
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto">
                <BoltIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">30-Day Free Trial</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Test all features risk-free with full access to AI agents and analytics
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto">
                <TrendingUpIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Volume Discounts</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatic token pricing tiers reward heavy users with better rates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AIAgentPricingDisplay
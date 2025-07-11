'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PricingCalculator } from '@/components/ui/PricingCalculator'
import { BusinessType } from './BusinessTypeSelection'
import { Check, Star, Zap, Shield, TrendingUp } from 'lucide-react'

interface PricingConfirmationProps {
  businessType: BusinessType
  chairCount: number
  businessName: string
  onConfirm: (chairs: number, monthlyTotal: number, tier: string) => void
  onNext: () => void
  onBack: () => void
}

const tierNames = {
  1: "Solo Barber",
  2: "Small Shop", 
  4: "Growing Shop",
  6: "Established Shop",
  10: "Large Shop",
  15: "Multi-Location"
}

const getTierName = (chairs: number): string => {
  const tiers = Object.keys(tierNames).map(Number).sort((a, b) => b - a)
  const tier = tiers.find(t => chairs >= t) || 1
  return tierNames[tier as keyof typeof tierNames]
}

const businessTypeFeatures = {
  solo: [
    "Personal booking calendar",
    "Client management & history", 
    "Payment processing with Stripe",
    "SMS & email notifications",
    "Mobile app access",
    "Basic analytics & reporting"
  ],
  single_location: [
    "Multi-chair management",
    "Staff scheduling & permissions",
    "Advanced business analytics",
    "Customer loyalty programs",
    "Marketing automation",
    "Location-based settings",
    "Team collaboration tools"
  ],
  multi_location: [
    "Multi-location dashboard",
    "Franchise management tools",
    "Enterprise reporting & insights",
    "Custom integrations",
    "Advanced user management",
    "API access",
    "Dedicated account manager",
    "Priority support"
  ]
}

export function PricingConfirmation({ 
  businessType, 
  chairCount, 
  businessName,
  onConfirm, 
  onNext, 
  onBack 
}: PricingConfirmationProps) {
  const [selectedChairs, setSelectedChairs] = useState(chairCount)
  const [monthlyTotal, setMonthlyTotal] = useState(0)

  const tierName = getTierName(selectedChairs)
  const features = businessTypeFeatures[businessType]

  const handleChairSelection = (chairs: number, total: number) => {
    setSelectedChairs(chairs)
    setMonthlyTotal(total)
  }

  const handleConfirm = () => {
    onConfirm(selectedChairs, monthlyTotal, tierName)
    onNext()
  }

  const getBusinessTypeTitle = () => {
    switch (businessType) {
      case 'solo':
        return 'Solo Barber Plan'
      case 'single_location':
        return 'Barbershop Owner Plan'
      case 'multi_location':
        return 'Enterprise Plan'
      default:
        return 'Your Plan'
    }
  }

  const getBusinessTypeDescription = () => {
    switch (businessType) {
      case 'solo':
        return 'Perfect for independent barbers managing their own appointments and growing their client base.'
      case 'single_location':
        return 'Comprehensive tools for barbershop owners to manage staff, optimize operations, and grow revenue.'
      case 'multi_location':
        return 'Enterprise-grade platform for managing multiple locations with advanced analytics and franchise tools.'
      default:
        return 'Tailored for your business needs'
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Confirm your pricing plan
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Review your plan details and confirm your selection
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pricing Calculator */}
        <div>
          <PricingCalculator
            onSelectChairs={handleChairSelection}
            initialChairs={chairCount}
            showComparison={true}
            className="h-full"
          />
        </div>

        {/* Plan Summary */}
        <div className="space-y-6">
          {/* Business Plan Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  businessType === 'solo' ? 'bg-blue-500' :
                  businessType === 'single_location' ? 'bg-green-500' :
                  'bg-purple-500'
                }`} />
                <CardTitle className="text-xl">
                  {getBusinessTypeTitle()}
                </CardTitle>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getBusinessTypeDescription()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Business Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {businessName}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Chairs:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {selectedChairs}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Tier:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {tierName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Monthly Total:</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${monthlyTotal}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedChairs} chairs × ${monthlyTotal / selectedChairs} each
                  </div>
                  
                  {/* Trial Banner */}
                  <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        14-Day Free Trial
                      </span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      No payment required until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Plan Features Header */}
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-2" />
                    What's Included
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features List - Always Visible */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Additional Benefits */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Plus these benefits:
                </h4>
                <div className="grid gap-3">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Bank-level security & encryption
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      No setup or cancellation fees
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      24/7 customer support
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        
        <Button 
          onClick={handleConfirm}
          size="lg"
          className="min-w-[200px]"
        >
          Confirm Plan & Continue
        </Button>
      </div>

      {/* Trust Indicators */}
      <div className="text-center pt-6 border-t">
        <div className="flex justify-center items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <Shield className="h-4 w-4" />
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center space-x-1">
            <Check className="h-4 w-4" />
            <span>No Hidden Fees</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4" />
            <span>Cancel Anytime</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingConfirmation
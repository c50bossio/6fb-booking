'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus, TrendingDown, TrendingUp, Zap } from 'lucide-react'

interface PricingBracket {
  start: number
  end: number | null
  price: number
  name: string
}

interface PricingCalculatorProps {
  onSelectChairs?: (chairs: number, monthlyTotal: number) => void
  initialChairs?: number
  showComparison?: boolean
  showBreakdown?: boolean
  className?: string
}

// Ultra-competitive pricing brackets - aggressive volume discounts
const pricingBrackets: PricingBracket[] = [
  { start: 1, end: 1, price: 19, name: "First Chair" },
  { start: 2, end: 3, price: 14, name: "Chairs 2-3" },
  { start: 4, end: 6, price: 12, name: "Chairs 4-6" },
  { start: 7, end: 10, price: 10, name: "Chairs 7-10" },
  { start: 11, end: 15, price: 8, name: "Chairs 11-15" },
  { start: 16, end: null, price: 6, name: "Chairs 16+" }
]

// Feature tiers based on total chairs
const featureTiers = [
  { minChairs: 1, maxChairs: 1, name: "Solo Barber", color: "blue" },
  { minChairs: 2, maxChairs: 5, name: "Small Studio", color: "green" },
  { minChairs: 6, maxChairs: 14, name: "Growing Business", color: "purple" },
  { minChairs: 15, maxChairs: null, name: "Enterprise", color: "indigo" }
]

const competitorPricing = {
  "Vagaro": (chairs: number) => chairs === 1 ? 24 : 24 + (chairs - 1) * 10,
  "Booksy": (chairs: number) => chairs === 1 ? 30 : 30 + (chairs - 1) * 20,
  "GlossGenius": (chairs: number) => chairs <= 9 ? 48 : 148
}

export function PricingCalculator({ 
  onSelectChairs, 
  initialChairs = 1, 
  showComparison = true,
  showBreakdown = false,
  className = '' 
}: PricingCalculatorProps) {
  const [chairs, setChairs] = useState(initialChairs)

  // Calculate total price using progressive brackets
  const calculateProgressivePrice = (chairCount: number): { total: number, breakdown: Array<{ bracket: string, chairs: number, price: number, subtotal: number }> } => {
    if (chairCount <= 0) return { total: 0, breakdown: [] }
    
    let total = 0
    const breakdown = []
    let chairsCounted = 0
    
    for (const bracket of pricingBrackets) {
      if (chairsCounted >= chairCount) break
      
      const start = bracket.start
      const end = bracket.end || chairCount
      
      if (chairCount >= start) {
        const bracketStart = Math.max(start, chairsCounted + 1)
        const bracketEnd = Math.min(end, chairCount)
        
        if (bracketStart <= bracketEnd) {
          const chairsInBracket = bracketEnd - bracketStart + 1
          const subtotal = chairsInBracket * bracket.price
          total += subtotal
          chairsCounted += chairsInBracket
          
          breakdown.push({
            bracket: bracket.name,
            chairs: chairsInBracket,
            price: bracket.price,
            subtotal
          })
        }
      }
    }
    
    return { total, breakdown }
  }

  const getCurrentFeatureTier = (chairCount: number) => {
    return featureTiers
      .slice()
      .reverse()
      .find(tier => chairCount >= tier.minChairs) || featureTiers[0]
  }

  const pricing = calculateProgressivePrice(chairs)
  const monthlyTotal = pricing.total
  const averagePerChair = chairs > 0 ? monthlyTotal / chairs : 0
  const currentTier = getCurrentFeatureTier(chairs)
  const nextBracket = pricingBrackets.find(bracket => bracket.start > chairs)

  const getCompetitorPrice = (competitor: string): number => {
    const pricingFn = competitorPricing[competitor as keyof typeof competitorPricing]
    return pricingFn ? pricingFn(chairs) : 0
  }

  const getSavingsVsCompetitor = (competitor: string): number => {
    return getCompetitorPrice(competitor) - monthlyTotal
  }

  const getBiggestSavings = (): { competitor: string, savings: number } => {
    const savings = Object.keys(competitorPricing).map(competitor => ({
      competitor,
      savings: getSavingsVsCompetitor(competitor)
    }))
    
    return savings.reduce((max, current) => 
      current.savings > max.savings ? current : max
    )
  }

  // ROI Calculation based on industry averages
  const calculateROI = (chairCount: number, monthlyPrice: number) => {
    // Industry averages: $50 per cut, 20 cuts per chair per week, 15% no-show rate without automation
    const avgCutPrice = 50
    const cutsPerChairPerWeek = 20
    const noShowRateWithoutAutomation = 0.15
    const noShowRateWithAutomation = 0.03 // BookedBarber reduces no-shows by 80%
    
    // Calculate monthly revenue
    const weeksPerMonth = 4.33
    const cutsPerChairPerMonth = cutsPerChairPerWeek * weeksPerMonth
    
    // Revenue without automation (with 15% no-shows)
    const revenueWithoutAutomation = chairCount * cutsPerChairPerMonth * avgCutPrice * (1 - noShowRateWithoutAutomation)
    
    // Revenue with automation (with 3% no-shows)
    const revenueWithAutomation = chairCount * cutsPerChairPerMonth * avgCutPrice * (1 - noShowRateWithAutomation)
    
    // Additional revenue from reduced no-shows
    const additionalRevenue = revenueWithAutomation - revenueWithoutAutomation
    
    // Net ROI (additional revenue minus subscription cost)
    const netROI = additionalRevenue - monthlyPrice
    
    // Number of appointments to break even
    const appointmentsToBreakEven = Math.ceil(monthlyPrice / avgCutPrice)
    
    return {
      additionalRevenue: Math.round(additionalRevenue),
      netROI: Math.round(netROI),
      appointmentsToBreakEven,
      roiPercentage: monthlyPrice > 0 ? Math.round((netROI / monthlyPrice) * 100) : 0
    }
  }

  const handleChairChange = (newChairs: number) => {
    const clampedChairs = Math.max(1, Math.min(50, newChairs))
    setChairs(clampedChairs)
    const newPricing = calculateProgressivePrice(clampedChairs)
    onSelectChairs?.(clampedChairs, newPricing.total)
  }

  const biggestSavings = getBiggestSavings()
  const roiData = calculateROI(chairs, monthlyTotal)

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-gray-900 dark:text-white">
          Always the Cheapest Pricing + AI Features
        </CardTitle>
        <p className="text-center text-gray-600 dark:text-gray-300">
          Ultra-competitive per chair pricing with AI features included. Beat every competitor.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Chair Counter */}
        <div className="text-center space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How many barber chairs do you have?
            </label>
            <div className="flex items-center justify-center space-x-4">
              <Button
                onClick={() => handleChairChange(chairs - 1)}
                variant="outline"
                size="sm"
                disabled={chairs <= 1}
                className="h-10 w-10 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {chairs}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {chairs === 1 ? 'Chair' : 'Chairs'}
                </div>
              </div>
              
              <Button
                onClick={() => handleChairChange(chairs + 1)}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mt-4">
              <input
                type="range"
                min="1"
                max="20"
                value={chairs}
                onChange={(e) => handleChairChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>1</span>
                <span>10</span>
                <span>20+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Tier Badge */}
        <div className="text-center">
          <Badge 
            variant="outline" 
            className={`bg-${currentTier.color}-50 text-${currentTier.color}-700 border-${currentTier.color}-200 px-4 py-1`}
          >
            {currentTier.name} Tier
          </Badge>
        </div>

        {/* Pricing Display */}
        <div className="text-center space-y-2">
          <div className="text-6xl font-bold text-gray-900 dark:text-white">
            ${monthlyTotal}
          </div>
          <div className="text-lg text-gray-600 dark:text-gray-300">
            per month
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {chairs} {chairs === 1 ? 'chair' : 'chairs'} • Average ${averagePerChair.toFixed(2)}/chair
          </div>
          
          {biggestSavings.savings > 0 && (
            <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">
                Save ${biggestSavings.savings}/month vs {biggestSavings.competitor}
              </span>
            </div>
          )}
        </div>

        {/* ROI Calculator */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                Return on Investment
              </h3>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              See how BookedBarber pays for itself by reducing no-shows
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                +${roiData.additionalRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Additional monthly revenue from 80% fewer no-shows
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${roiData.netROI.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Net profit after subscription cost
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {roiData.appointmentsToBreakEven}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Appointments to break even
              </div>
            </div>
          </div>
          
          {roiData.roiPercentage > 0 && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-full">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {roiData.roiPercentage}% ROI - Pays for itself in saved no-shows!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Breakdown (if enabled) */}
        {showBreakdown && pricing.breakdown.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Progressive Pricing Breakdown:
            </h3>
            <div className="space-y-2">
              {pricing.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {item.bracket} ({item.chairs} × ${item.price})
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    ${item.subtotal}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-gray-900 dark:text-white">${monthlyTotal}/month</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Volume Discount Info */}
        {nextBracket && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Next Price Break at {nextBracket.start} Chairs!</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              {nextBracket.start === chairs + 1 
                ? `Your next chair will cost only $${nextBracket.price}`
                : `Add ${nextBracket.start - chairs} more chair${nextBracket.start - chairs > 1 ? 's' : ''} to get $${nextBracket.price}/chair pricing`
              }
            </p>
          </div>
        )}

        {/* Competitor Comparison */}
        {showComparison && chairs > 1 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Compare with competitors:
            </h3>
            <div className="space-y-2">
              {Object.keys(competitorPricing).map(competitor => {
                const competitorPrice = getCompetitorPrice(competitor)
                const savings = getSavingsVsCompetitor(competitor)
                
                return (
                  <div key={competitor} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{competitor}:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900 dark:text-white font-medium">
                        ${competitorPrice}/month
                      </span>
                      {savings > 0 && (
                        <span className="text-green-600 dark:text-green-400 text-xs">
                          (+${savings})
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-blue-600 dark:text-blue-400">BookedBarber:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    ${monthlyTotal}/month
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Removed redundant Call to Action - handled in PricingConfirmation */}

        {/* AI Features Preview */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            AI features included (competitors don't have):
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['AI Customer Service', 'AI Marketing Manager', 'AI Business Coach', 'Payment processing', 'SMS automation', 'Analytics'].map((feature) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PricingCalculator
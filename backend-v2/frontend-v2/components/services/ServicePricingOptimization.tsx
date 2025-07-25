'use client'

import { useState } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Calculator,
  Target,
  Percent,
  ArrowUp,
  ArrowDown,
  Info,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { type Service } from '@/lib/api'

interface ServicePricingOptimizationProps {
  services: Service[]
  metrics: any
  onOptimize: () => void
}

export default function ServicePricingOptimization({
  services,
  metrics,
  onOptimize
}: ServicePricingOptimizationProps) {
  const [selectedServices, setSelectedServices] = useState<number[]>([])
  const [priceAdjustment, setPriceAdjustment] = useState(15) // percentage
  const [optimizationMode, setOptimizationMode] = useState<'revenue' | 'volume' | 'balanced'>('balanced')
  const [includePackages, setIncludePackages] = useState(true)
  const [showPreview, setShowPreview] = useState(false)

  // Calculate pricing insights
  const pricingInsights = calculatePricingInsights(services)
  
  function calculatePricingInsights(services: Service[]) {
    const avgPrice = services.reduce((sum, s) => sum + s.base_price, 0) / services.length
    const minPrice = Math.min(...services.map(s => s.base_price))
    const maxPrice = Math.max(...services.map(s => s.base_price))
    
    // Mock competitor data - in real implementation, this would come from API
    const marketAverage = avgPrice * 1.2
    const premiumThreshold = 75
    
    const underpriced = services.filter(s => s.base_price < marketAverage * 0.8)
    const premiumServices = services.filter(s => s.base_price >= premiumThreshold)
    
    return {
      avgPrice,
      minPrice,
      maxPrice,
      marketAverage,
      premiumThreshold,
      underpriced,
      premiumServices,
      priceSpread: maxPrice - minPrice,
      premiumRatio: premiumServices.length / services.length
    }
  }

  const calculateOptimizedPrice = (service: Service) => {
    const baseAdjustment = service.base_price * (priceAdjustment / 100)
    
    switch (optimizationMode) {
      case 'revenue':
        // Aggressive pricing for revenue maximization
        return service.base_price + baseAdjustment * 1.5
      case 'volume':
        // Conservative pricing to maintain volume
        return service.base_price + baseAdjustment * 0.5
      case 'balanced':
        // Balanced approach
        return service.base_price + baseAdjustment
    }
  }

  const calculateProjectedImpact = () => {
    const currentRevenue = services.reduce((sum, s) => 
      sum + (s.base_price * (s.booking_count || 0)), 0
    )
    
    const projectedRevenue = services.reduce((sum, s) => {
      const newPrice = calculateOptimizedPrice(s)
      // Estimate volume impact based on price elasticity
      const volumeImpact = optimizationMode === 'volume' ? 0.95 : 
                          optimizationMode === 'revenue' ? 0.85 : 0.9
      const projectedBookings = (s.booking_count || 0) * volumeImpact
      return sum + (newPrice * projectedBookings)
    }, 0)
    
    return {
      revenueIncrease: projectedRevenue - currentRevenue,
      percentageIncrease: ((projectedRevenue - currentRevenue) / currentRevenue) * 100
    }
  }

  const projectedImpact = calculateProjectedImpact()

  const applyOptimization = async () => {
    // Implement bulk price update
    await onOptimize()
  }

  return (
    <div className="space-y-6">
      {/* Pricing Insights Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Price</p>
                <p className="text-2xl font-bold">${pricingInsights.avgPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Market avg: ${pricingInsights.marketAverage.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Price Range</p>
                <p className="text-2xl font-bold">${pricingInsights.priceSpread}</p>
                <p className="text-xs text-gray-500 mt-1">
                  ${pricingInsights.minPrice} - ${pricingInsights.maxPrice}
                </p>
              </div>
              <Calculator className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Premium Services</p>
                <p className="text-2xl font-bold">
                  {(pricingInsights.premiumRatio * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {pricingInsights.premiumServices.length} of {services.length}
                </p>
              </div>
              <Target className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Underpriced</p>
                <p className="text-2xl font-bold text-orange-600">
                  {pricingInsights.underpriced.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Services below market
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Price Optimization Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Optimization Mode */}
          <div>
            <label className="text-sm font-medium mb-3 block">Optimization Strategy</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'revenue', label: 'Maximize Revenue', icon: TrendingUp },
                { value: 'volume', label: 'Maintain Volume', icon: Users },
                { value: 'balanced', label: 'Balanced Growth', icon: Target }
              ].map((mode) => {
                const Icon = mode.icon
                return (
                  <button
                    key={mode.value}
                    onClick={() => setOptimizationMode(mode.value as any)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      optimizationMode === mode.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-2" />
                    <p className="text-sm font-medium">{mode.label}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Price Adjustment Slider */}
          <div>
            <div className="flex justify-between mb-3">
              <label className="text-sm font-medium">Price Adjustment</label>
              <span className="text-sm font-bold text-blue-600">+{priceAdjustment}%</span>
            </div>
            <Slider
              value={[priceAdjustment]}
              onValueChange={(value) => setPriceAdjustment(value[0])}
              min={5}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Conservative (+5%)</span>
              <span>Aggressive (+50%)</span>
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Include Package Services</p>
              <p className="text-sm text-gray-600">Apply optimization to service packages</p>
            </div>
            <Switch
              checked={includePackages}
              onCheckedChange={setIncludePackages}
            />
          </div>

          {/* Projected Impact */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Projected Impact
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Revenue Increase</p>
                <p className="text-xl font-bold text-green-600">
                  +${projectedImpact.revenueIncrease.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Percentage Growth</p>
                <p className="text-xl font-bold text-green-600">
                  +{projectedImpact.percentageIncrease.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service-by-Service Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {services.slice(0, 10).map((service) => {
                const newPrice = calculateOptimizedPrice(service)
                const increase = newPrice - service.base_price
                const percentIncrease = (increase / service.base_price) * 100
                
                return (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-gray-600">
                        {service.category.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500 line-through">
                          ${service.base_price.toFixed(2)}
                        </p>
                        <p className="font-bold text-green-600">
                          ${newPrice.toFixed(2)}
                        </p>
                      </div>
                      <Badge variant="success">
                        <ArrowUp className="w-3 h-3 mr-1" />
                        +{percentIncrease.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant={showPreview ? 'outline' : 'primary'}
          onClick={() => setShowPreview(!showPreview)}
          className="flex-1"
        >
          {showPreview ? 'Hide Preview' : 'Preview Changes'}
        </Button>
        <Button
          variant="primary"
          onClick={applyOptimization}
          className="flex-1"
          disabled={!showPreview}
        >
          Apply Optimization
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            // Download optimization report
          }}
          className="flex-1"
        >
          Download Analysis
        </Button>
      </div>

      {/* Tips */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Pricing Optimization Tips
          </h4>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>• Start with conservative increases (10-15%) and monitor client response</li>
            <li>• Focus on underpriced services first for quick wins</li>
            <li>• Consider creating premium versions of popular services</li>
            <li>• Bundle services to increase perceived value</li>
            <li>• Communicate value clearly when implementing price changes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
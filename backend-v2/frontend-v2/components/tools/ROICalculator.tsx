'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  MessageSquare,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface ROIInputs {
  monthlyAppointments: number
  averageServicePrice: number
  currentNoShowRate: number
  planType: 'basic' | 'professional' | 'premium'
}

interface ROIResults {
  currentMonthlyRevenue: number
  currentNoShowLoss: number
  projectedNoShowReduction: number
  revenueProtected: number
  systemCost: number
  netBenefit: number
  roiMultiplier: number
  paybackPeriod: number
}

const PLAN_PRICING = {
  basic: { monthly: 19, smsIncluded: 500, emailIncluded: 1000 },
  professional: { monthly: 39, smsIncluded: 1500, emailIncluded: 3000 },
  premium: { monthly: 79, smsIncluded: 99999, emailIncluded: 99999 }
}

const NO_SHOW_REDUCTION_RATES = {
  basic: 0.15,      // 15% reduction
  professional: 0.20, // 20% reduction  
  premium: 0.25     // 25% reduction
}

export default function ROICalculator() {
  const [inputs, setInputs] = useState<ROIInputs>({
    monthlyAppointments: 200,
    averageServicePrice: 45,
    currentNoShowRate: 0.15, // 15%
    planType: 'professional'
  })

  const [results, setResults] = useState<ROIResults | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const calculateROI = () => {
    const { monthlyAppointments, averageServicePrice, currentNoShowRate, planType } = inputs
    
    // Current situation
    const currentMonthlyRevenue = monthlyAppointments * averageServicePrice
    const currentNoShowLoss = currentMonthlyRevenue * currentNoShowRate
    
    // With reminder system
    const projectedNoShowReduction = NO_SHOW_REDUCTION_RATES[planType]
    const revenueProtected = currentNoShowLoss * projectedNoShowReduction
    
    // System costs
    const planCost = PLAN_PRICING[planType].monthly
    const estimatedSMSCost = Math.max(0, (monthlyAppointments * 2) - PLAN_PRICING[planType].smsIncluded) * 0.025
    const estimatedEmailCost = Math.max(0, (monthlyAppointments * 1.5) - PLAN_PRICING[planType].emailIncluded) * 0.005
    const systemCost = planCost + estimatedSMSCost + estimatedEmailCost
    
    // ROI calculations
    const netBenefit = revenueProtected - systemCost
    const roiMultiplier = revenueProtected / systemCost
    const paybackPeriod = systemCost / revenueProtected // in months
    
    setResults({
      currentMonthlyRevenue,
      currentNoShowLoss,
      projectedNoShowReduction,
      revenueProtected,
      systemCost,
      netBenefit,
      roiMultiplier,
      paybackPeriod
    })
  }

  useEffect(() => {
    calculateROI()
  }, [inputs])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center text-2xl">
            <Calculator className="h-6 w-6 mr-2" />
            Appointment Reminder System ROI Calculator
          </CardTitle>
          <CardDescription>
            Calculate how much revenue you can protect with our reminder system
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Your Barbershop Details</CardTitle>
            <CardDescription>Enter your current business metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="appointments">Monthly Appointments</Label>
              <Input
                id="appointments"
                type="number"
                value={inputs.monthlyAppointments}
                onChange={(e) => setInputs({...inputs, monthlyAppointments: parseInt(e.target.value) || 0})}
                placeholder="200"
              />
            </div>
            
            <div>
              <Label htmlFor="price">Average Service Price</Label>
              <Input
                id="price"
                type="number"
                value={inputs.averageServicePrice}
                onChange={(e) => setInputs({...inputs, averageServicePrice: parseFloat(e.target.value) || 0})}
                placeholder="45.00"
              />
            </div>
            
            <div>
              <Label htmlFor="noshows">Current No-Show Rate (%)</Label>
              <Input
                id="noshows"
                type="number"
                value={inputs.currentNoShowRate * 100}
                onChange={(e) => setInputs({...inputs, currentNoShowRate: (parseFloat(e.target.value) || 0) / 100})}
                placeholder="15"
              />
            </div>
            
            <div>
              <Label>Reminder Plan</Label>
              <Tabs 
                value={inputs.planType} 
                onValueChange={(value) => setInputs({...inputs, planType: value as any})}
                className="mt-2"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                  <TabsTrigger value="premium">Premium</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="mt-2">
                  <div className="text-sm text-muted-foreground">
                    $19/month • 500 SMS • 1,000 emails • 15% no-show reduction
                  </div>
                </TabsContent>
                
                <TabsContent value="professional" className="mt-2">
                  <div className="text-sm text-muted-foreground">
                    $39/month • 1,500 SMS • 3,000 emails • 20% no-show reduction
                  </div>
                </TabsContent>
                
                <TabsContent value="premium" className="mt-2">
                  <div className="text-sm text-muted-foreground">
                    $79/month • Unlimited messages • 25% no-show reduction
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              ROI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results && (
              <div className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {results.roiMultiplier.toFixed(1)}x
                    </div>
                    <div className="text-sm text-muted-foreground">ROI Multiplier</div>
                  </div>
                  
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(results.netBenefit)}
                    </div>
                    <div className="text-sm text-muted-foreground">Net Monthly Benefit</div>
                  </div>
                </div>

                {/* Revenue Protection */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-semibold">Revenue Protected</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(results.revenueProtected)}/month
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatPercentage(results.projectedNoShowReduction)} reduction in no-shows
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current monthly revenue loss:</span>
                    <span className="text-red-600">{formatCurrency(results.currentNoShowLoss)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Reminder system cost:</span>
                    <span>{formatCurrency(results.systemCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Monthly savings:</span>
                    <span className="text-green-600">{formatCurrency(results.netBenefit)}</span>
                  </div>
                </div>

                {/* Payback Period */}
                {results.paybackPeriod < 1 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Immediate ROI:</strong> This system pays for itself in less than 1 month!
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Button */}
                <Button 
                  className="w-full"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                >
                  {showBreakdown ? 'Hide' : 'Show'} Detailed Breakdown
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      {showBreakdown && results && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Financial Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Current Situation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monthly appointments:</span>
                    <span>{inputs.monthlyAppointments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average service price:</span>
                    <span>{formatCurrency(inputs.averageServicePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current no-show rate:</span>
                    <span>{formatPercentage(inputs.currentNoShowRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly revenue:</span>
                    <span>{formatCurrency(results.currentMonthlyRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Revenue lost to no-shows:</span>
                    <span>{formatCurrency(results.currentNoShowLoss)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">With Reminder System</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Plan selected:</span>
                    <span className="capitalize">{inputs.planType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected no-show reduction:</span>
                    <span>{formatPercentage(results.projectedNoShowReduction)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Revenue protected:</span>
                    <span>{formatCurrency(results.revenueProtected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>System cost:</span>
                    <span>{formatCurrency(results.systemCost)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-600">
                    <span>Net monthly benefit:</span>
                    <span>{formatCurrency(results.netBenefit)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">Annual Impact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(results.revenueProtected * 12)}
                  </div>
                  <div className="text-sm text-muted-foreground">Revenue Protected</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(results.netBenefit * 12)}
                  </div>
                  <div className="text-sm text-muted-foreground">Net Savings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {(results.roiMultiplier * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Annual ROI</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call to Action */}
      <Card className="border-2 border-blue-200">
        <CardContent className="text-center p-6">
          <h3 className="text-xl font-semibold mb-2">Ready to Start Protecting Your Revenue?</h3>
          <p className="text-muted-foreground mb-4">
            Join our pilot program and get a 30-day free trial of the Professional plan
          </p>
          <Button size="lg" className="mr-4">
            Start Free Trial
          </Button>
          <Button size="lg" variant="outline">
            Schedule Demo
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
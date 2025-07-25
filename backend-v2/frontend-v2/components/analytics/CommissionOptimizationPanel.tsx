'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  DollarSign, 
  Calculator,
  Target,
  Users,
  BarChart3,
  Settings,
  Zap,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Crown,
  Trophy
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CommissionTier {
  name: string
  threshold: number
  rate: number
  bonuses?: string[]
}

interface ServiceCommission {
  service_id: string
  service_name: string
  base_price: number
  commission_rate: number
  volume_last_30_days: number
  revenue_last_30_days: number
  commission_earned: number
  optimization_score: number
  recommended_rate: number
  potential_increase: number
}

interface CommissionAnalytics {
  current_month_commissions: number
  projected_month_commissions: number
  commission_growth: number
  total_services: number
  top_earning_services: ServiceCommission[]
  performance_tiers: CommissionTier[]
  optimization_opportunities: {
    total_potential: number
    top_opportunities: Array<{
      service: string
      current_rate: number
      recommended_rate: number
      potential_increase: number
      reasoning: string
    }>
  }
}

interface CommissionOptimizationPanelProps {
  userRole?: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function CommissionOptimizationPanel({ userRole, dateRange }: CommissionOptimizationPanelProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [commissionData, setCommissionData] = useState<CommissionAnalytics | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceCommission | null>(null)
  const [newCommissionRate, setNewCommissionRate] = useState<number>(0)
  const [simulatedRevenue, setSimulatedRevenue] = useState<number>(0)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadCommissionData()
  }, [dateRange])

  const loadCommissionData = async () => {
    setIsLoading(true)
    try {
      // Mock commission data for demonstration
      const mockData: CommissionAnalytics = {
        current_month_commissions: 12450,
        projected_month_commissions: 15680,
        commission_growth: 23.5,
        total_services: 8,
        top_earning_services: [
          {
            service_id: '1',
            service_name: 'Premium Haircut & Style',
            base_price: 85,
            commission_rate: 60,
            volume_last_30_days: 45,
            revenue_last_30_days: 3825,
            commission_earned: 2295,
            optimization_score: 8.5,
            recommended_rate: 65,
            potential_increase: 191.25
          },
          {
            service_id: '2',
            service_name: 'Beard Trim & Grooming',
            base_price: 35,
            commission_rate: 50,
            volume_last_30_days: 38,
            revenue_last_30_days: 1330,
            commission_earned: 665,
            optimization_score: 7.2,
            recommended_rate: 55,
            potential_increase: 66.5
          },
          {
            service_id: '3',
            service_name: 'Luxury Shampoo & Treatment',
            base_price: 45,
            commission_rate: 40,
            volume_last_30_days: 28,
            revenue_last_30_days: 1260,
            commission_earned: 504,
            optimization_score: 6.8,
            recommended_rate: 50,
            potential_increase: 126
          },
          {
            service_id: '4',
            service_name: 'Hot Towel Shave',
            base_price: 55,
            commission_rate: 45,
            volume_last_30_days: 22,
            revenue_last_30_days: 1210,
            commission_earned: 544.5,
            optimization_score: 6.3,
            recommended_rate: 52,
            potential_increase: 84.7
          },
          {
            service_id: '5',
            service_name: 'Hair Wash & Scalp Massage',
            base_price: 25,
            commission_rate: 35,
            volume_last_30_days: 52,
            revenue_last_30_days: 1300,
            commission_earned: 455,
            optimization_score: 5.9,
            recommended_rate: 42,
            potential_increase: 91
          }
        ],
        performance_tiers: [
          {
            name: 'Bronze',
            threshold: 0,
            rate: 40,
            bonuses: ['Base commission rate']
          },
          {
            name: 'Silver',
            threshold: 5000,
            rate: 50,
            bonuses: ['Booking bonus', 'Client retention bonus']
          },
          {
            name: 'Gold',
            threshold: 8000,
            rate: 60,
            bonuses: ['Premium service bonus', 'Upselling bonus', 'Performance bonus']
          },
          {
            name: 'Platinum',
            threshold: 12000,
            rate: 65,
            bonuses: ['Elite commission rate', 'Leadership bonus', 'Mentoring bonus', 'Brand ambassador perks']
          }
        ],
        optimization_opportunities: {
          total_potential: 559.45,
          top_opportunities: [
            {
              service: 'Premium Haircut & Style',
              current_rate: 60,
              recommended_rate: 65,
              potential_increase: 191.25,
              reasoning: 'High volume and client satisfaction scores justify premium rate increase'
            },
            {
              service: 'Luxury Shampoo & Treatment',
              current_rate: 40,
              recommended_rate: 50,
              potential_increase: 126,
              reasoning: 'Excellent upselling opportunity with strong client retention metrics'
            },
            {
              service: 'Hair Wash & Scalp Massage',
              current_rate: 35,
              recommended_rate: 42,
              potential_increase: 91,
              reasoning: 'Consistent volume with room for margin optimization'
            }
          ]
        }
      }

      setCommissionData(mockData)
    } catch (error) {
      console.error('Failed to load commission data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load commission data. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRateChange = (service: ServiceCommission, newRate: number) => {
    setSelectedService(service)
    setNewCommissionRate(newRate)
    
    // Calculate simulated revenue impact
    const rateIncrease = newRate - service.commission_rate
    const potentialIncrease = (service.revenue_last_30_days * (rateIncrease / 100))
    setSimulatedRevenue(potentialIncrease)
  }

  const applyRateChange = async () => {
    if (!selectedService) return

    try {
      // Mock API call to update commission rate
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: 'Commission Rate Updated',
        description: `${selectedService.service_name} commission rate updated to ${newCommissionRate}%`
      })

      // Update local data
      setCommissionData(prev => {
        if (!prev) return prev
        
        return {
          ...prev,
          top_earning_services: prev.top_earning_services.map(service =>
            service.service_id === selectedService.service_id
              ? { ...service, commission_rate: newCommissionRate }
              : service
          )
        }
      })

      setSelectedService(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update commission rate. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const getTierIcon = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'bronze': return '🥉'
      case 'silver': return '🥈'
      case 'gold': return '🥇'
      case 'platinum': return <Crown className="w-4 h-4 text-purple-500" />
      default: return <Trophy className="w-4 h-4" />
    }
  }

  const getTierColor = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'bronze': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'silver': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'gold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'platinum': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Loading commission optimization...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!commissionData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">No commission data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Commission Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Commissions</p>
                <p className="text-2xl font-bold">${commissionData.current_month_commissions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projected Month</p>
                <p className="text-2xl font-bold">${commissionData.projected_month_commissions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Growth Rate</p>
                <p className="text-2xl font-bold flex items-center">
                  {commissionData.commission_growth.toFixed(1)}%
                  <ArrowUpRight className="w-4 h-4 ml-1 text-green-500" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Sparkles className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Optimization Potential</p>
                <p className="text-2xl font-bold text-orange-600">
                  +${commissionData.optimization_opportunities.total_potential.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Optimization Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Service Analysis</TabsTrigger>
          <TabsTrigger value="tiers">Performance Tiers</TabsTrigger>
          <TabsTrigger value="simulator">Rate Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Top Optimization Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Top Optimization Opportunities
              </CardTitle>
              <CardDescription>
                AI-powered recommendations to maximize your commission earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionData.optimization_opportunities.top_opportunities.map((opportunity, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          {opportunity.service}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {opportunity.reasoning}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          +${opportunity.potential_increase.toFixed(0)}/month
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span>Current: {opportunity.current_rate}%</span>
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                        <span className="font-medium">Recommended: {opportunity.recommended_rate}%</span>
                      </div>
                      <Button size="sm" variant="outline">
                        Apply Change
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Commission Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Services Tracked</span>
                    <span className="font-semibold">{commissionData.total_services}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Commission Rate</span>
                    <span className="font-semibold">
                      {(commissionData.top_earning_services.reduce((sum, s) => sum + s.commission_rate, 0) / commissionData.top_earning_services.length).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Monthly Volume</span>
                    <span className="font-semibold">
                      {commissionData.top_earning_services.reduce((sum, s) => sum + s.volume_last_30_days, 0)} bookings
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Optimization Score</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {(commissionData.top_earning_services.reduce((sum, s) => sum + s.optimization_score, 0) / commissionData.top_earning_services.length).toFixed(1)}/10
                      </span>
                      <Badge variant="secondary">Good</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {commissionData.top_earning_services.slice(0, 3).map((service, index) => (
                    <div key={service.service_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{service.service_name}</p>
                          <p className="text-xs text-muted-foreground">{service.commission_rate}% commission</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">${service.commission_earned.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">{service.volume_last_30_days} bookings</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Commission Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of commission earnings by service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionData.top_earning_services.map((service) => (
                  <div key={service.service_id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{service.service_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ${service.base_price} base price • {service.volume_last_30_days} bookings
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={`${service.optimization_score >= 8 ? 'bg-green-100 text-green-800' : service.optimization_score >= 6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          Score: {service.optimization_score}/10
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Commission Rate</p>
                        <p className="font-semibold">{service.commission_rate}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Revenue (30d)</p>
                        <p className="font-semibold">${service.revenue_last_30_days.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Commission Earned</p>
                        <p className="font-semibold text-green-600">${service.commission_earned.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Potential Increase</p>
                        <p className="font-semibold text-blue-600">+${service.potential_increase.toFixed(0)}</p>
                      </div>
                    </div>

                    {service.recommended_rate > service.commission_rate && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Consider increasing rate to {service.recommended_rate}% for an additional ${service.potential_increase.toFixed(0)}/month
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Tiers</CardTitle>
              <CardDescription>
                Commission rates based on monthly revenue thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {commissionData.performance_tiers.map((tier, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {getTierIcon(tier.name)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{tier.name} Tier</h4>
                          <p className="text-sm text-muted-foreground">
                            {tier.threshold === 0 ? 'Starting tier' : `$${tier.threshold.toLocaleString()}+ monthly`}
                          </p>
                        </div>
                      </div>
                      <Badge className={getTierColor(tier.name)}>
                        {tier.rate}% rate
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Benefits:</p>
                      <ul className="space-y-1">
                        {tier.bonuses?.map((bonus, bonusIndex) => (
                          <li key={bonusIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {bonus}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Commission Rate Simulator</CardTitle>
              <CardDescription>
                Test different commission rates to see potential earnings impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="service-select">Select Service</Label>
                    <Select onValueChange={(value) => {
                      const service = commissionData.top_earning_services.find(s => s.service_id === value)
                      if (service) {
                        setSelectedService(service)
                        setNewCommissionRate(service.commission_rate)
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a service to simulate" />
                      </SelectTrigger>
                      <SelectContent>
                        {commissionData.top_earning_services.map((service) => (
                          <SelectItem key={service.service_id} value={service.service_id}>
                            {service.service_name} ({service.commission_rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedService && (
                    <div>
                      <Label htmlFor="commission-slider">Commission Rate: {newCommissionRate}%</Label>
                      <div className="px-2 mt-2">
                        <Slider
                          value={[newCommissionRate]}
                          onValueChange={(value) => handleRateChange(selectedService, value[0])}
                          max={80}
                          min={20}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>20%</span>
                          <span>80%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {selectedService && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Current Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm">Monthly Revenue</span>
                            <span className="font-semibold">${selectedService.revenue_last_30_days.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Current Rate</span>
                            <span className="font-semibold">{selectedService.commission_rate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Current Commission</span>
                            <span className="font-semibold text-green-600">${selectedService.commission_earned.toFixed(0)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Simulated Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm">Monthly Revenue</span>
                            <span className="font-semibold">${selectedService.revenue_last_30_days.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">New Rate</span>
                            <span className="font-semibold">{newCommissionRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">New Commission</span>
                            <span className="font-semibold text-blue-600">
                              ${((selectedService.revenue_last_30_days * newCommissionRate) / 100).toFixed(0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium">Monthly Difference</span>
                            <span className={`font-bold ${simulatedRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {simulatedRevenue >= 0 ? '+' : ''}${simulatedRevenue.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedService && Math.abs(simulatedRevenue) > 0 && (
                  <div className="flex gap-3">
                    <Button onClick={applyRateChange} className="flex-1">
                      <Calculator className="w-4 h-4 mr-2" />
                      Apply Rate Change
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setSelectedService(null)
                      setNewCommissionRate(0)
                      setSimulatedRevenue(0)
                    }}>
                      Reset
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
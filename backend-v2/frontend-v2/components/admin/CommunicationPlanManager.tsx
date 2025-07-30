'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MessageSquare, 
  Mail, 
  Bell, 
  TrendingUp, 
  DollarSign, 
  Shield,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface PlanFeatures {
  monthly_fee: number
  sms_included: number
  email_included: number
  sms_overage: number
  email_overage: number
  features: string[]
}

interface PlanData {
  basic: PlanFeatures
  professional: PlanFeatures
  premium: PlanFeatures
}

interface UsageData {
  shop_id: number
  period: string
  sms_count: number
  email_count: number
  total_messages: number
  billing: {
    base_fee: number
    sms_overage_count: number
    sms_overage_cost: number
    email_overage_count: number
    email_overage_cost: number
    total_amount: number
  }
  plan: string
}

interface RevenueAnalytics {
  total_revenue_protected: number
  average_monthly_messages: number
  roi_analysis: {
    estimated_cost: number
    revenue_protected: number
    roi_multiplier: number
  }
}

export default function CommunicationPlanManager() {
  const [plans, setPlans] = useState<PlanData | null>(null)
  const [currentPlan, setCurrentPlan] = useState<{ current_plan: string; plan_details: PlanFeatures } | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load available plans
      const plansResponse = await fetch('/api/v2/reminders/billing/plans')
      const plansData = await plansResponse.json()
      setPlans(plansData.plans)

      // Load current plan
      const currentPlanResponse = await fetch('/api/v2/reminders/billing/current-plan')
      const currentPlanData = await currentPlanResponse.json()
      setCurrentPlan(currentPlanData)

      // Load current month usage
      const currentDate = new Date()
      const usageResponse = await fetch(
        `/api/v2/reminders/analytics/usage?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
      )
      const usageData = await usageResponse.json()
      setUsage(usageData)

      // Load revenue analytics
      const analyticsResponse = await fetch('/api/v2/reminders/analytics/revenue-protection?months=6')
      const analyticsData = await analyticsResponse.json()
      setAnalytics(analyticsData)

    } catch (error) {
      console.error('Failed to load communication plan data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load plan information',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const upgradePlan = async (newPlan: string) => {
    try {
      setUpgrading(true)

      const response = await fetch('/api/v2/reminders/billing/upgrade-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_plan: newPlan })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Plan Updated',
          description: `Successfully upgraded to ${newPlan} plan`
        })
        await loadData() // Refresh data
      } else {
        throw new Error(result.error)
      }

    } catch (error) {
      console.error('Plan upgrade failed:', error)
      toast({
        title: 'Upgrade Failed',
        description: 'Failed to upgrade plan. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setUpgrading(false)
    }
  }

  const calculateUsagePercentage = (used: number, included: number) => {
    if (included >= 99999) return 0 // "Unlimited"
    return Math.min((used / included) * 100, 100)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Communication Plans</h1>
          <p className="text-muted-foreground">
            Manage your appointment reminder system and billing
          </p>
        </div>
        <Badge variant={currentPlan?.current_plan === 'premium' ? 'default' : 'secondary'}>
          {currentPlan?.current_plan?.toUpperCase()} PLAN
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage & Billing</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="analytics">ROI Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month's Usage</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usage?.total_messages || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {usage?.sms_count || 0} SMS • {usage?.email_count || 0} Email
                </p>
              </CardContent>
            </Card>

            {/* Monthly Cost */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(usage?.billing?.total_amount || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Base: {formatCurrency(usage?.billing?.base_fee || 0)} + Overages
                </p>
              </CardContent>
            </Card>

            {/* Revenue Protected */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Protected</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analytics?.roi_analysis?.revenue_protected || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.roi_analysis?.roi_multiplier?.toFixed(1)}x ROI
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Progress */}
          {currentPlan && usage && (
            <Card>
              <CardHeader>
                <CardTitle>Usage Limits</CardTitle>
                <CardDescription>Current usage against your plan limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* SMS Usage */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">SMS Messages</span>
                    <span className="text-sm text-muted-foreground">
                      {usage.sms_count} / {currentPlan.plan_details.sms_included >= 99999 ? 'Unlimited' : currentPlan.plan_details.sms_included}
                    </span>
                  </div>
                  <Progress 
                    value={calculateUsagePercentage(usage.sms_count, currentPlan.plan_details.sms_included)} 
                    className="h-2"
                  />
                  {usage.billing.sms_overage_count > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      {usage.billing.sms_overage_count} overage messages • {formatCurrency(usage.billing.sms_overage_cost)}
                    </p>
                  )}
                </div>

                {/* Email Usage */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Email Messages</span>
                    <span className="text-sm text-muted-foreground">
                      {usage.email_count} / {currentPlan.plan_details.email_included >= 99999 ? 'Unlimited' : currentPlan.plan_details.email_included}
                    </span>
                  </div>
                  <Progress 
                    value={calculateUsagePercentage(usage.email_count, currentPlan.plan_details.email_included)} 
                    className="h-2"
                  />
                  {usage.billing.email_overage_count > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      {usage.billing.email_overage_count} overage messages • {formatCurrency(usage.billing.email_overage_cost)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Plans & Pricing Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans && Object.entries(plans).map(([planName, planDetails]) => (
              <Card 
                key={planName} 
                className={`relative ${currentPlan?.current_plan === planName ? 'ring-2 ring-blue-500' : ''}`}
              >
                {currentPlan?.current_plan === planName && (
                  <Badge className="absolute top-4 right-4">Current</Badge>
                )}
                
                <CardHeader>
                  <CardTitle className="capitalize">{planName}</CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold">{formatCurrency(planDetails.monthly_fee)}</span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Included Messages */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SMS Messages</span>
                      <span className="text-sm font-medium">
                        {planDetails.sms_included >= 99999 ? 'Unlimited' : planDetails.sms_included.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email Messages</span>
                      <span className="text-sm font-medium">
                        {planDetails.email_included >= 99999 ? 'Unlimited' : planDetails.email_included.toLocaleString()}
                      </span>
                    </div>
                    {planDetails.sms_overage > 0 && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs">SMS Overage</span>
                        <span className="text-xs">{formatCurrency(planDetails.sms_overage)} each</span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Features</h4>
                    <ul className="text-xs space-y-1">
                      {planDetails.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                          {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  {currentPlan?.current_plan !== planName && (
                    <Button 
                      className="w-full"
                      onClick={() => upgradePlan(planName)}
                      disabled={upgrading}
                    >
                      {upgrading ? 'Upgrading...' : `Upgrade to ${planName.charAt(0).toUpperCase() + planName.slice(1)}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ROI Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    ROI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Cost</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(analytics.roi_analysis.estimated_cost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue Protected</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(analytics.roi_analysis.revenue_protected)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ROI Multiplier</span>
                      <Badge variant="default" className="bg-green-600">
                        {analytics.roi_analysis.roi_multiplier.toFixed(1)}x
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      For every $1 spent, you protect ${analytics.roi_analysis.roi_multiplier.toFixed(2)} in revenue
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue Protected (6 months)</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(analytics.total_revenue_protected)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Average Monthly Messages</p>
                    <p className="text-lg font-semibold">
                      {Math.round(analytics.average_monthly_messages)}
                    </p>
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your reminder system is preventing an estimated{' '}
                      <strong>{Math.round(analytics.total_revenue_protected / 50)}</strong> no-shows 
                      per month, protecting your business revenue.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
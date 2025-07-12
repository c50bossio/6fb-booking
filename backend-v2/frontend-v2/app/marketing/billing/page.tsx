'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { 
  CreditCardIcon,
  ChartBarIcon,
  ArrowArrowTrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface UsageStats {
  emailsSent: number
  emailsRemaining: number
  emailsTotal: number
  smsSent: number
  smsRemaining: number
  smsTotal: number
  currentPlan: string
  billingCycle: string
  nextBillingDate: string
  monthlySpend: number
}

interface UsageHistory {
  id: string
  date: string
  type: 'email' | 'sms'
  campaign: string
  count: number
  cost: number
}

interface PricingPlan {
  id: string
  name: string
  emailCredits: number
  smsCredits: number
  price: number
  features: string[]
  isPopular?: boolean
}

export default function MarketingBillingPage() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([])
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    // Simulate loading billing data
    setTimeout(() => {
      setUsageStats({
        emailsSent: 3450,
        emailsRemaining: 1550,
        emailsTotal: 5000,
        smsSent: 820,
        smsRemaining: 180,
        smsTotal: 1000,
        currentPlan: 'Professional',
        billingCycle: 'Monthly',
        nextBillingDate: '2025-02-01',
        monthlySpend: 89
      })

      setUsageHistory([
        {
          id: '1',
          date: '2024-12-28',
          type: 'email',
          campaign: 'Holiday Special Promotion',
          count: 450,
          cost: 4.50
        },
        {
          id: '2',
          date: '2024-12-26',
          type: 'sms',
          campaign: 'Appointment Reminders',
          count: 127,
          cost: 6.35
        },
        {
          id: '3',
          date: '2024-12-22',
          type: 'email',
          campaign: 'New Year Services Update',
          count: 523,
          cost: 5.23
        },
        {
          id: '4',
          date: '2024-12-20',
          type: 'email',
          campaign: 'Service Update Notification',
          count: 380,
          cost: 3.80
        },
        {
          id: '5',
          date: '2024-12-15',
          type: 'sms',
          campaign: 'Flash Sale Alert',
          count: 215,
          cost: 10.75
        }
      ])

      setPricingPlans([
        {
          id: 'starter',
          name: 'Starter',
          emailCredits: 1000,
          smsCredits: 200,
          price: 29,
          features: [
            '1,000 email credits/month',
            '200 SMS credits/month',
            'Basic analytics',
            'Email support'
          ]
        },
        {
          id: 'professional',
          name: 'Professional',
          emailCredits: 5000,
          smsCredits: 1000,
          price: 89,
          features: [
            '5,000 email credits/month',
            '1,000 SMS credits/month',
            'Advanced analytics',
            'Priority support',
            'Custom templates'
          ],
          isPopular: true
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          emailCredits: 20000,
          smsCredits: 5000,
          price: 299,
          features: [
            '20,000 email credits/month',
            '5,000 SMS credits/month',
            'Premium analytics',
            'Dedicated support',
            'Custom branding',
            'API access'
          ]
        }
      ])

      setLoading(false)
    }, 1000)
  }, [])

  const calculateUsagePercentage = (used: number, total: number) => {
    return (used / total) * 100
  }

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500'
    if (percentage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usage & Billing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor your marketing credits and manage billing</p>
        </div>
        <Button variant="outline">
          <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
          Download Invoice
        </Button>
      </div>

      {/* Current Plan Info */}
      {usageStats && (
        <Card variant="accent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                  Current Plan: {usageStats.currentPlan}
                </h3>
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  ${usageStats.monthlySpend}/month • {usageStats.billingCycle} billing • Next bill: {new Date(usageStats.nextBillingDate).toLocaleDateString()}
                </p>
              </div>
              <Button onClick={() => setShowUpgradeModal(true)}>
                <SparklesIcon className="w-5 h-5 mr-2" />
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Overview */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Credits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                  Email Credits
                </span>
                {usageStats.emailsRemaining < 500 && (
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Used this month</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {usageStats.emailsSent.toLocaleString()} / {usageStats.emailsTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${getUsageColor(calculateUsagePercentage(usageStats.emailsSent, usageStats.emailsTotal))}`}
                      style={{ width: `${calculateUsagePercentage(usageStats.emailsSent, usageStats.emailsTotal)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {usageStats.emailsRemaining.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">credits remaining</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ${(usageStats.emailsSent * 0.01).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">estimated cost</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Credits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DevicePhoneMobileIcon className="w-5 h-5 text-green-600" />
                  SMS Credits
                </span>
                {usageStats.smsRemaining < 100 && (
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Used this month</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {usageStats.smsSent.toLocaleString()} / {usageStats.smsTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${getUsageColor(calculateUsagePercentage(usageStats.smsSent, usageStats.smsTotal))}`}
                      style={{ width: `${calculateUsagePercentage(usageStats.smsSent, usageStats.smsTotal)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {usageStats.smsRemaining.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">credits remaining</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ${(usageStats.smsSent * 0.05).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">estimated cost</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <ChartBarIcon className="w-12 h-12 mr-2" />
            Usage chart would be displayed here
          </div>
        </CardContent>
      </Card>

      {/* Recent Usage History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Usage</CardTitle>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Credits Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {usageHistory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {item.campaign}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.type === 'email' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {item.type === 'email' ? <EnvelopeIcon className="w-3 h-3" /> : <DevicePhoneMobileIcon className="w-3 h-3" />}
                        {item.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${item.cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Additional Credits */}
      <Card>
        <CardHeader>
          <CardTitle>Need More Credits?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="outlined">
              <CardContent className="p-4 text-center">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Quick Top-up
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Add credits instantly
                </p>
                <Button size="sm" className="w-full">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Credits
                </Button>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent className="p-4 text-center">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Auto-Recharge
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Never run out of credits
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  Set Up
                </Button>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent className="p-4 text-center">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Upgrade Plan
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Get more for less
                </p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setShowUpgradeModal(true)}>
                  <ArrowArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                  View Plans
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Choose Your Plan</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowUpgradeModal(false)}>
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pricingPlans.map(plan => (
                  <Card 
                    key={plan.id} 
                    variant={plan.isPopular ? 'accent' : 'outlined'}
                    className="relative"
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-teal-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {plan.name}
                      </h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                        <span className="text-gray-600 dark:text-gray-400">/month</span>
                      </div>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className="w-full" 
                        variant={plan.isPopular ? 'primary' : 'outline'}
                        onClick={() => setShowUpgradeModal(false)}
                      >
                        {plan.name === usageStats?.currentPlan ? 'Current Plan' : 'Select Plan'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Fix the missing import
import { EnvelopeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
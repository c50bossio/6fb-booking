'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { 
  ReceiptPercentIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface CommissionRule {
  id: number
  barber_id: number
  barber_name: string
  service_type: string
  commission_rate: number
  minimum_rate: number
  maximum_rate: number
  tier_level: string
  effective_date: string
  is_active: boolean
  monthly_revenue: number
  total_commissions_paid: number
}

interface CommissionTier {
  name: string
  min_monthly_revenue: number
  max_monthly_revenue: number
  base_rate: number
  bonus_rate: number
  color: string
}

const COMMISSION_TIERS: CommissionTier[] = [
  {
    name: 'Starter',
    min_monthly_revenue: 0,
    max_monthly_revenue: 2999,
    base_rate: 50,
    bonus_rate: 0,
    color: 'bg-gray-100 text-gray-600'
  },
  {
    name: 'Professional',
    min_monthly_revenue: 3000,
    max_monthly_revenue: 5999,
    base_rate: 60,
    bonus_rate: 2,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    name: 'Premium',
    min_monthly_revenue: 6000,
    max_monthly_revenue: 9999,
    base_rate: 65,
    bonus_rate: 5,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    name: 'Luxury',
    min_monthly_revenue: 10000,
    max_monthly_revenue: 999999,
    base_rate: 70,
    bonus_rate: 8,
    color: 'bg-green-100 text-green-600'
  }
]

export default function CommissionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([])
  const [activeTab, setActiveTab] = useState('rates')
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }

        // Check if user has admin permissions
        if (!['admin', 'super_admin'].includes(userData.role || '')) {
          setError('You do not have permission to access commission settings.')
          return
        }

        setUser(userData)

        // Mock commission rules data
        const mockCommissionRules: CommissionRule[] = [
          {
            id: 1,
            barber_id: 101,
            barber_name: 'John Thompson',
            service_type: 'All Services',
            commission_rate: 65,
            minimum_rate: 50,
            maximum_rate: 75,
            tier_level: 'Premium',
            effective_date: '2025-01-01',
            is_active: true,
            monthly_revenue: 8420,
            total_commissions_paid: 5473
          },
          {
            id: 2,
            barber_id: 102,
            barber_name: 'Mike Rodriguez',
            service_type: 'All Services',
            commission_rate: 60,
            minimum_rate: 50,
            maximum_rate: 70,
            tier_level: 'Professional',
            effective_date: '2025-01-01',
            is_active: true,
            monthly_revenue: 5280,
            total_commissions_paid: 3168
          },
          {
            id: 3,
            barber_id: 103,
            barber_name: 'David Chen',
            service_type: 'Premium Services',
            commission_rate: 70,
            minimum_rate: 60,
            maximum_rate: 75,
            tier_level: 'Luxury',
            effective_date: '2024-12-01',
            is_active: true,
            monthly_revenue: 12150,
            total_commissions_paid: 8505
          },
          {
            id: 4,
            barber_id: 104,
            barber_name: 'Sarah Williams',
            service_type: 'All Services',
            commission_rate: 55,
            minimum_rate: 50,
            maximum_rate: 65,
            tier_level: 'Starter',
            effective_date: '2024-11-15',
            is_active: false,
            monthly_revenue: 2150,
            total_commissions_paid: 1182.5
          }
        ]

        setCommissionRules(mockCommissionRules)

      } catch (err) {
        console.error('Failed to load commission data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return <PageLoading message="Loading commission settings..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user) {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTierInfo = (revenue: number) => {
    return COMMISSION_TIERS.find(tier => 
      revenue >= tier.min_monthly_revenue && revenue <= tier.max_monthly_revenue
    ) || COMMISSION_TIERS[0]
  }

  const getTierByName = (tierName: string) => {
    return COMMISSION_TIERS.find(tier => tier.name === tierName) || COMMISSION_TIERS[0]
  }

  const totalCommissionsPaid = commissionRules.reduce((sum, rule) => sum + rule.total_commissions_paid, 0)
  const averageCommissionRate = commissionRules.reduce((sum, rule) => sum + rule.commission_rate, 0) / commissionRules.length
  const activeBarbers = commissionRules.filter(rule => rule.is_active).length

  const handleToggleActive = (ruleId: number) => {
    setCommissionRules(prev => 
      prev.map(rule => 
        rule.id === ruleId ? { ...rule, is_active: !rule.is_active } : rule
      )
    )
  }

  const handleEditRule = (rule: CommissionRule) => {
    setEditingRule(rule)
    setIsCreating(false)
  }

  const handleCreateRule = () => {
    setEditingRule(null)
    setIsCreating(true)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/finance')}
                variant="ghost"
                size="sm"
              >
                ← Financial Center
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <ReceiptPercentIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Commission Management
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Configure commission rates and tier structures
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                leftIcon={<ChartBarIcon className="w-5 h-5" />}
                onClick={() => router.push('/analytics/commission')}
              >
                Commission Analytics
              </Button>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-5 h-5" />}
                onClick={handleCreateRule}
              >
                Add Commission Rule
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" animated>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <UserGroupIcon className="w-5 h-5 text-blue-600" />
                <Badge variant="secondary">{activeBarbers} active</Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {commissionRules.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Barbers
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={100}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <ReceiptPercentIcon className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {averageCommissionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Average Rate
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={200}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalCommissionsPaid)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Paid (MTD)
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <ChartBarIcon className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {COMMISSION_TIERS.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Active Tiers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rates">Commission Rates</TabsTrigger>
            <TabsTrigger value="tiers">6FB Tier System</TabsTrigger>
            <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="rates" className="space-y-6">
            <div className="space-y-4">
              {commissionRules.map((rule) => {
                const tierInfo = getTierByName(rule.tier_level)
                
                return (
                  <Card key={rule.id} variant="elevated" className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {rule.barber_name}
                            </h3>
                            <Badge className={tierInfo.color}>
                              {rule.tier_level}
                            </Badge>
                            {rule.is_active ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-600" />
                            ) : (
                              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {rule.service_type} • Effective {formatDate(rule.effective_date)}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <span className="text-sm font-medium text-gray-500">Commission Rate</span>
                              <p className="text-xl font-bold text-purple-600">{rule.commission_rate}%</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Monthly Revenue</span>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(rule.monthly_revenue)}
                              </p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Commissions Paid</span>
                              <p className="text-lg font-bold text-blue-600">
                                {formatCurrency(rule.total_commissions_paid)}
                              </p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Rate Range</span>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {rule.minimum_rate}% - {rule.maximum_rate}%
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="text-sm text-gray-600">Active</span>
                            <Switch 
                              checked={rule.is_active}
                              onCheckedChange={() => handleToggleActive(rule.id)}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<PencilIcon className="w-4 h-4" />}
                              onClick={() => handleEditRule(rule)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<TrashIcon className="w-4 h-4" />}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="tiers" className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Six Figure Barber Commission Tiers</CardTitle>
                <CardDescription>
                  Progressive commission structure based on monthly revenue performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {COMMISSION_TIERS.map((tier, index) => (
                    <Card key={index} variant="elevated" className="border-2">
                      <CardHeader className="text-center">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full ${tier.color} text-sm font-medium mb-2`}>
                          {tier.name}
                        </div>
                        <CardTitle className="text-2xl font-bold">
                          {tier.base_rate}%
                        </CardTitle>
                        {tier.bonus_rate > 0 && (
                          <p className="text-sm text-green-600 font-medium">
                            +{tier.bonus_rate}% bonus
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="text-center">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Revenue Range
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatCurrency(tier.min_monthly_revenue)} - {' '}
                            {tier.max_monthly_revenue === 999999 ? 
                              '∞' : 
                              formatCurrency(tier.max_monthly_revenue)
                            }
                          </p>
                          <div className="pt-3">
                            <p className="text-xs text-gray-500">
                              {commissionRules.filter(rule => rule.tier_level === tier.name).length} barbers
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tier Benefits */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Tier Benefits & Requirements</CardTitle>
                <CardDescription>
                  Additional benefits and requirements for each Six Figure Barber tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Performance Bonuses</h4>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li>• Premium & Luxury tiers receive monthly bonuses</li>
                        <li>• Additional commission for premium services</li>
                        <li>• Performance-based rate increases</li>
                        <li>• Quarterly tier advancement opportunities</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Requirements</h4>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li>• Maintain minimum monthly revenue</li>
                        <li>• Complete 6FB methodology training</li>
                        <li>• Client satisfaction rating ≥ 4.5</li>
                        <li>• Professional development participation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Commission Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed insights into commission structure performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Detailed commission analytics coming soon.
                  </p>
                  <Button 
                    variant="primary" 
                    className="mt-4"
                    leftIcon={<ArrowDownTrayIcon className="w-5 h-5" />}
                  >
                    Export Commission Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
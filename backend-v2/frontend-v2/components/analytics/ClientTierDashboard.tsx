'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/LoadingStates'
import { 
  getTierDashboardMetrics,
  bulkCalculateClientTiers,
  type TierDashboardMetrics,
  type BulkTierAnalysisResult
} from '@/lib/api'
import { 
  TrophyIcon,
  StarIcon,
  SparklesIcon,
  UserIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  UsersIcon,
  EyeIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/use-toast'

interface ClientTierDashboardProps {
  onClientSelect?: (clientId: number) => void
  showActions?: boolean
}

export default function ClientTierDashboard({ 
  onClientSelect, 
  showActions = true 
}: ClientTierDashboardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [metrics, setMetrics] = useState<TierDashboardMetrics | null>(null)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [showRevenueOpportunities, setShowRevenueOpportunities] = useState(true)

  // Load metrics on component mount
  useEffect(() => {
    loadDashboardMetrics()
  }, [])

  const loadDashboardMetrics = async () => {
    try {
      setLoading(true)
      const data = await getTierDashboardMetrics()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to load tier dashboard metrics:', error)
      toast({
        title: 'Error',
        description: 'Failed to load client tier analytics. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const recalculateTiers = async () => {
    try {
      setCalculating(true)
      const result: BulkTierAnalysisResult = await bulkCalculateClientTiers()
      
      // Reload metrics after recalculation
      await loadDashboardMetrics()
      
      toast({
        title: 'Success',
        description: `Recalculated tiers for ${result.total_processed} clients. ${result.successful_analyses} successful analyses.`,
      })
    } catch (error) {
      console.error('Failed to recalculate client tiers:', error)
      toast({
        title: 'Error',
        description: 'Failed to recalculate client tiers. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCalculating(false)
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum': return <TrophyIcon className="w-5 h-5" />
      case 'gold': return <StarIcon className="w-5 h-5" />
      case 'silver': return <SparklesIcon className="w-5 h-5" />
      case 'bronze': return <UserIcon className="w-5 h-5" />
      case 'new': return <SparklesIcon className="w-5 h-5" />
      default: return <UserIcon className="w-5 h-5" />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'gold': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'silver': return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-200'
      case 'bronze': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'
      case 'new': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getTierPercentage = (tierCount: number, total: number) => {
    return total > 0 ? ((tierCount / total) * 100).toFixed(1) : '0'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Client Tier Analytics</h2>
            <p className="text-gray-600 dark:text-gray-400">Six Figure Barber client segmentation and revenue optimization</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Client Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Start by adding clients to see tier analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Client Tier Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">Six Figure Barber client segmentation and revenue optimization</p>
        </div>
        {showActions && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={loadDashboardMetrics}
              disabled={loading}
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <LoadingButton
              loading={calculating}
              onClick={recalculateTiers}
              variant="outline"
            >
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Recalculate Tiers
            </LoadingButton>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.total_clients}</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {metrics.successful_analyses} analyzed
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High-Value Clients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.high_value_clients}</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {getTierPercentage(metrics.high_value_clients, metrics.total_clients)}% of total
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                <TrophyIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Clients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.new_clients}</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {getTierPercentage(metrics.new_clients, metrics.total_clients)}% of total
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Growth Opportunity</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(metrics.total_growth_opportunity)}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  Revenue potential
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.tier_distribution).map(([tier, count]) => (
                <div 
                  key={tier}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTier === tier 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getTierColor(tier)}`}>
                        {getTierIcon(tier)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white capitalize">
                          {tier} Tier
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getTierPercentage(count, metrics.total_clients)}% of clients
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">clients</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          tier === 'platinum' ? 'bg-yellow-500' :
                          tier === 'gold' ? 'bg-yellow-400' :
                          tier === 'silver' ? 'bg-gray-400' :
                          tier === 'bronze' ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${getTierPercentage(count, metrics.total_clients)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Confidence Score */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Analysis Confidence
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {(metrics.average_confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${metrics.average_confidence * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Based on client history and engagement patterns
                </p>
              </div>

              {/* Quality Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Math.round((metrics.high_value_clients / metrics.total_clients) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Premium Clients</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round((metrics.new_clients / metrics.total_clients) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Growth Potential</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Opportunities */}
      {showRevenueOpportunities && metrics.revenue_opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FireIcon className="w-5 h-5 text-orange-500" />
                Top Revenue Opportunities
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRevenueOpportunities(!showRevenueOpportunities)}
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.revenue_opportunities.slice(0, 5).map((opportunity, index) => (
                <div
                  key={opportunity.client_id}
                  className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                  onClick={() => onClientSelect && onClientSelect(opportunity.client_id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Client #{opportunity.client_id}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${getTierColor(opportunity.tier)}`}>
                          {opportunity.tier}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Current: {formatCurrency(opportunity.current_annual_value)} → 
                        Target: {formatCurrency(opportunity.potential_annual_value)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(opportunity.growth_opportunity)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">growth potential</p>
                  </div>
                </div>
              ))}
            </div>
            
            {metrics.revenue_opportunities.length > 5 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  View All {metrics.revenue_opportunities.length} Opportunities
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {showActions && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="justify-start">
                <TrophyIcon className="w-4 h-4 mr-2" />
                Tier Upgrade Campaign
              </Button>
              <Button variant="outline" className="justify-start">
                <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                Revenue Analysis
              </Button>
              <Button variant="outline" className="justify-start">
                <UsersIcon className="w-4 h-4 mr-2" />
                Client Retention Plan
              </Button>
              <Button variant="outline" className="justify-start">
                <FireIcon className="w-4 h-4 mr-2" />
                Growth Opportunities
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
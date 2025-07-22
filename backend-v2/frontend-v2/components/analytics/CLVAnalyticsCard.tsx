'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  getClientLifetimeValueAnalytics, 
  getClientTierAnalytics, 
  type CLVAnalysis, 
  type ClientTierAnalytics 
} from '@/lib/api'
import { formatters } from '@/lib/formatters'
import { 
  UserGroupIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  StarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface CLVAnalyticsCardProps {
  userId: number
  className?: string
  compact?: boolean
}

export default function CLVAnalyticsCard({ 
  userId, 
  className = '', 
  compact = false 
}: CLVAnalyticsCardProps) {
  const [clvData, setCLVData] = useState<CLVAnalysis | null>(null)
  const [tierData, setTierData] = useState<ClientTierAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setError(null)
      const [clvAnalysis, tierAnalysis] = await Promise.all([
        getClientLifetimeValueAnalytics(userId, 365),
        getClientTierAnalytics(userId, 180)
      ])
      setCLVData(clvAnalysis)
      setTierData(tierAnalysis)
    } catch (err) {
      console.error('Failed to fetch CLV analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load CLV data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm mb-4">{error}</p>
            <Button onClick={handleRefresh} size="sm" variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!clvData || !tierData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <UserGroupIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No client data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-sm">Client Lifetime Value</span>
            </div>
            <Button 
              onClick={handleRefresh} 
              size="sm" 
              variant="ghost" 
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Average CLV</p>
              <p className="font-bold text-lg">
                {formatters.currency(clvData.summary.average_clv, { showCents: false })}
              </p>
            </div>
            <div>
              <p className="text-gray-600">High Value Clients</p>
              <p className="font-bold text-lg">{clvData.summary.high_value_client_count}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Growth Opportunity</span>
              <span>{formatters.currency(clvData.summary.growth_opportunity_clv, { showCents: false })}</span>
            </div>
            <Progress 
              value={Math.min((clvData.summary.total_predicted_clv / (clvData.summary.total_predicted_clv + clvData.summary.growth_opportunity_clv)) * 100, 100)} 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate tier color scheme
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  // Top tier by count
  const topTier = Object.entries(tierData.tier_distribution.counts)
    .sort(([,a], [,b]) => b - a)[0]

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-800/30 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Client Lifetime Value Analytics</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Six Figure Barber methodology insights
              </p>
            </div>
          </div>
          <Button 
            onClick={handleRefresh} 
            size="sm" 
            variant="ghost" 
            disabled={refreshing}
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {clvData.summary.total_clients}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Clients</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatters.currency(clvData.summary.average_clv, { showCents: false })}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Average CLV</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <TrendingUpIcon className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatters.currency(clvData.summary.growth_opportunity_clv, { showCents: false })}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Growth Opportunity</div>
          </div>
        </div>

        {/* Client Tier Distribution */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center">
            <StarIcon className="w-4 h-4 mr-2" />
            Client Tier Distribution
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(tierData.tier_distribution.counts).map(([tier, count]) => (
              <div 
                key={tier} 
                className={`p-3 rounded-lg border ${getTierColor(tier)}`}
              >
                <div className="text-center">
                  <div className="font-bold text-lg">{count}</div>
                  <div className="text-xs capitalize">{tier}</div>
                  <div className="text-xs mt-1">
                    {tierData.tier_distribution.percentages[tier]?.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          {topTier && (
            <p className="text-sm text-gray-600 mt-2">
              Most clients are <Badge variant="secondary" className="capitalize">{topTier[0]}</Badge> tier 
              ({topTier[1]} clients)
            </p>
          )}
        </div>

        {/* Key Insights */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center">
            <ChartBarIcon className="w-4 h-4 mr-2" />
            Key Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <div className="font-medium text-blue-900 dark:text-blue-200">High-Value Clients</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {clvData.summary.high_value_client_count}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Clients worth $1,000+ each
              </div>
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <div className="font-medium text-red-900 dark:text-red-200">At-Risk Clients</div>
              <div className="text-2xl font-bold text-red-900 dark:text-red-200">
                {clvData.summary.at_risk_client_count}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                Clients at high churn risk
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations Preview */}
        {clvData.recommendations.retention.retention_strategies.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Top Recommendations</h4>
            <div className="space-y-2">
              {clvData.recommendations.retention.retention_strategies.slice(0, 3).map((strategy, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-sm">{strategy}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investment Recommendation */}
        {clvData.recommendations.retention.retention_investment_recommendation.monthly_budget > 0 && (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">
              Investment Recommendation
            </h4>
            <p className="text-sm text-green-800 dark:text-green-300">
              Invest <strong>{formatters.currency(clvData.recommendations.retention.retention_investment_recommendation.monthly_budget)}/month</strong> in retention efforts
            </p>
            <div className="mt-2">
              <p className="text-xs text-green-700 dark:text-green-400">
                Focus areas: {clvData.recommendations.retention.retention_investment_recommendation.focus_areas.join(', ')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  getServiceProfitabilityAnalytics, 
  getServiceOptimizationRecommendations,
  type ServiceProfitabilityAnalysis, 
  type ServiceOptimizationRecommendations 
} from '@/lib/api'
import { formatters } from '@/lib/formatters'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  StarIcon,
  ArrowPathIcon,
  LightBulbIcon,
  ShoppingBagIcon,
  TagIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

interface ServiceProfitabilityCardProps {
  userId: number
  className?: string
  compact?: boolean
}

export default function ServiceProfitabilityCard({ 
  userId, 
  className = '', 
  compact = false 
}: ServiceProfitabilityCardProps) {
  const [profitabilityData, setProfitabilityData] = useState<ServiceProfitabilityAnalysis | null>(null)
  const [optimizationData, setOptimizationData] = useState<ServiceOptimizationRecommendations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = async () => {
    try {
      setError(null)
      const [profitability, optimization] = await Promise.all([
        getServiceProfitabilityAnalytics(userId, 90),
        getServiceOptimizationRecommendations(userId, 'all')
      ])
      setProfitabilityData(profitability)
      setOptimizationData(optimization.recommendations)
    } catch (err) {
      console.error('Failed to fetch service profitability analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load service data')
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

  if (!profitabilityData || profitabilityData.summary.total_services === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <ChartBarIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No service data available</p>
            <p className="text-xs text-gray-400 mt-1">Start offering services to see profitability analytics</p>
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
              <ChartBarIcon className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-sm">Service Profitability</span>
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
              <p className="text-gray-600">Services</p>
              <p className="font-bold text-lg">{profitabilityData.summary.total_services}</p>
            </div>
            <div>
              <p className="text-gray-600">Avg Revenue/Hour</p>
              <p className="font-bold text-lg">
                {formatters.currency(profitabilityData.performance_benchmarks.average_revenue_per_hour || 0)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Premium Services</span>
              <span>{profitabilityData.six_figure_insights.premium_service_percentage.toFixed(1)}%</span>
            </div>
            <Progress 
              value={profitabilityData.six_figure_insights.premium_service_percentage} 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get category colors
  const getCategoryColor = (category: string) => {
    const colors = {
      haircut: 'bg-blue-100 text-blue-800',
      beard: 'bg-orange-100 text-orange-800',
      haircut_beard: 'bg-purple-100 text-purple-800',
      styling: 'bg-pink-100 text-pink-800',
      wash: 'bg-cyan-100 text-cyan-800',
      treatment: 'bg-green-100 text-green-800',
      consultation: 'bg-yellow-100 text-yellow-800',
      package: 'bg-indigo-100 text-indigo-800',
      addon: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Get performance color
  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Service Profitability Analysis</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Six Figure methodology optimization insights
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

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="optimization">Optimize</TabsTrigger>
            <TabsTrigger value="bundles">Bundles</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <ShoppingBagIcon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profitabilityData.summary.total_services}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Services</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatters.currency(profitabilityData.summary.total_revenue, { showCents: false })}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <ClockIcon className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatters.currency(profitabilityData.performance_benchmarks.average_revenue_per_hour || 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg $/Hour</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <StarIcon className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profitabilityData.six_figure_insights.six_figure_alignment_score.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">6FB Score</div>
              </div>
            </div>

            {/* Premium Service Progress */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center">
                <TrendingUpIcon className="w-4 h-4 mr-2" />
                Premium Service Progress (Target: 60%)
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Premium Revenue</span>
                  <span className={getPerformanceColor(profitabilityData.six_figure_insights.premium_service_percentage)}>
                    {profitabilityData.six_figure_insights.premium_service_percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={profitabilityData.six_figure_insights.premium_service_percentage} 
                  className="h-3"
                  indicatorClassName={
                    profitabilityData.six_figure_insights.premium_service_percentage >= 60 ? 'bg-green-500' :
                    profitabilityData.six_figure_insights.premium_service_percentage >= 40 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }
                />
                <div className="text-xs text-gray-600">
                  {profitabilityData.six_figure_insights.premium_target_gap > 0 ? 
                    `${profitabilityData.six_figure_insights.premium_target_gap.toFixed(1)}% gap to target` :
                    'Target achieved!'
                  }
                </div>
              </div>
            </div>

            {/* Six Figure Action Items */}
            {profitabilityData.six_figure_insights.six_figure_action_items.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center">
                  <LightBulbIcon className="w-4 h-4 mr-2" />
                  Six Figure Action Items
                </h4>
                <div className="space-y-2">
                  {profitabilityData.six_figure_insights.six_figure_action_items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <p className="text-sm">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            {/* Top Services */}
            <div>
              <h4 className="font-semibold mb-3">Service Performance</h4>
              <div className="space-y-3">
                {profitabilityData.service_metrics.slice(0, 5).map((service, index) => (
                  <div key={service.service_name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium">{service.service_name}</div>
                        <Badge className={getCategoryColor(service.category)} variant="secondary">
                          {service.category.replace('_', ' ')}
                        </Badge>
                        {service.premium_service && (
                          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                            Premium
                          </Badge>
                        )}
                      </div>
                      <div className={`font-bold ${getPerformanceColor(service.six_figure_score)}`}>
                        {service.six_figure_score.toFixed(0)}/100
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Revenue</p>
                        <p className="font-semibold">{formatters.currency(service.total_revenue, { showCents: false })}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Bookings</p>
                        <p className="font-semibold">{service.total_bookings}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Price</p>
                        <p className="font-semibold">{formatters.currency(service.average_price)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Rev/Hour</p>
                        <p className="font-semibold">{formatters.currency(service.revenue_per_hour)}</p>
                      </div>
                    </div>
                    
                    {service.recommendations.length > 0 && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                        <strong>Recommendation:</strong> {service.recommendations[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            {/* Pricing Recommendations */}
            {optimizationData?.pricing?.underpriced_services && optimizationData.pricing.underpriced_services.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center">
                  <TagIcon className="w-4 h-4 mr-2" />
                  Pricing Opportunities
                </h4>
                <div className="space-y-3">
                  {optimizationData.pricing.underpriced_services.map((service, index) => (
                    <div key={index} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{service.service_name}</div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {service.confidence} confidence
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Current</p>
                          <p className="font-semibold">{formatters.currency(service.current_price)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Recommended</p>
                          <p className="font-semibold">{formatters.currency(service.recommended_price)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Potential Revenue</p>
                          <p className="font-semibold text-green-600">
                            +{formatters.currency(service.potential_additional_revenue, { showCents: false })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Premium Conversion */}
            {optimizationData?.premium?.upgrade_opportunities && optimizationData.premium.upgrade_opportunities.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center">
                  <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
                  Premium Conversion Opportunities
                </h4>
                <div className="space-y-3">
                  {optimizationData.premium.upgrade_opportunities.map((service, index) => (
                    <div key={index} className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
                      <div className="font-medium mb-2">{service.service_name}</div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Current</p>
                          <p className="font-semibold">{formatters.currency(service.current_price)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Premium Target</p>
                          <p className="font-semibold">{formatters.currency(service.premium_threshold)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Revenue Potential</p>
                          <p className="font-semibold text-purple-600">
                            +{formatters.currency(service.potential_revenue_increase, { showCents: false })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bundles" className="space-y-4">
            {/* Bundling Opportunities */}
            {profitabilityData.bundling_opportunities.length > 0 ? (
              <div>
                <h4 className="font-semibold mb-3">Service Bundle Opportunities</h4>
                <div className="space-y-3">
                  {profitabilityData.bundling_opportunities.map((bundle, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">
                          {bundle.bundle_services.join(' + ')}
                        </div>
                        <Badge variant="secondary">
                          Score: {bundle.bundle_score.toFixed(0)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Frequency</p>
                          <p className="font-semibold">{bundle.frequency} times</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Current Value</p>
                          <p className="font-semibold">{formatters.currency(bundle.average_bundle_value)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Bundle Price</p>
                          <p className="font-semibold text-blue-600">
                            {formatters.currency(bundle.recommended_bundle_price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <ShoppingBagIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No bundling opportunities found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Clients need to book multiple services on the same day to identify bundles
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
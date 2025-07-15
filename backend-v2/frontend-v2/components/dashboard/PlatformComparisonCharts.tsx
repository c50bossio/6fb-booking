"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  UsersIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface PlatformMetrics {
  platform: string
  icon: string
  page_views: number
  bookings: number
  conversion_rate: number
  revenue: number
  cost_per_booking: number
  roi: number
  last_24h: {
    bookings: number
    revenue: number
    change_percent: number
  }
  last_7d: {
    bookings: number
    revenue: number
    change_percent: number
  }
  status: 'active' | 'warning' | 'error'
}

interface PlatformComparisonChartsProps {
  platforms: PlatformMetrics[]
  timeRange: '24h' | '7d' | '30d'
}

type MetricType = 'revenue' | 'bookings' | 'conversion_rate' | 'roi' | 'cost_efficiency' | 'page_views'

const metricConfigs = {
  revenue: {
    label: 'Revenue',
    icon: <CurrencyDollarIcon className="w-4 h-4" />,
    formatter: (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value),
    color: 'bg-green-500',
    description: 'Total revenue generated from conversions'
  },
  bookings: {
    label: 'Bookings',
    icon: <UsersIcon className="w-4 h-4" />,
    formatter: (value: number) => value.toString(),
    color: 'bg-blue-500',
    description: 'Number of completed bookings'
  },
  conversion_rate: {
    label: 'Conversion Rate',
    icon: <ArrowTrendingUpIcon className="w-4 h-4" />,
    formatter: (value: number) => `${value.toFixed(2)}%`,
    color: 'bg-purple-500',
    description: 'Percentage of visitors who complete a booking'
  },
  roi: {
    label: 'ROI',
    icon: <StarIcon className="w-4 h-4" />,
    formatter: (value: number) => value > 0 ? `${value.toFixed(0)}%` : 'N/A',
    color: 'bg-yellow-500',
    description: 'Return on investment for advertising spend'
  },
  cost_efficiency: {
    label: 'Cost Efficiency',
    icon: <ChartBarIcon className="w-4 h-4" />,
    formatter: (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value),
    color: 'bg-orange-500',
    description: 'Cost per booking (lower is better)'
  },
  page_views: {
    label: 'Page Views',
    icon: <EyeIcon className="w-4 h-4" />,
    formatter: (value: number) => value.toLocaleString(),
    color: 'bg-cyan-500',
    description: 'Number of page views tracked'
  }
}

export default function PlatformComparisonCharts({ platforms, timeRange }: PlatformComparisonChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('revenue')
  const [sortBy, setSortBy] = useState<'metric' | 'performance' | 'efficiency'>('metric')

  // Process platform data for comparison
  const comparisonData = useMemo(() => {
    const processedPlatforms = platforms.map(platform => {
      const performanceScore = (
        (platform.conversion_rate / 5 * 30) + // Conversion rate component (max 5%)
        (Math.min(platform.revenue / 10000, 1) * 40) + // Revenue component (max $10k)
        (platform.bookings / 50 * 30) // Bookings component (max 50 bookings)
      )

      const efficiencyScore = platform.cost_per_booking > 0 
        ? Math.max(0, (100 - platform.cost_per_booking) * 2) // Lower cost = higher efficiency
        : platform.revenue > 0 ? 80 : 0 // No cost data but generating revenue

      return {
        ...platform,
        performance_score: Math.round(performanceScore),
        efficiency_score: Math.round(efficiencyScore),
        metric_value: getMetricValue(platform, selectedMetric)
      }
    })

    // Sort platforms based on selected criteria
    return processedPlatforms.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.performance_score - a.performance_score
        case 'efficiency':
          return b.efficiency_score - a.efficiency_score
        case 'metric':
        default:
          return b.metric_value - a.metric_value
      }
    })
  }, [platforms, selectedMetric, sortBy])

  function getMetricValue(platform: PlatformMetrics, metric: MetricType): number {
    switch (metric) {
      case 'revenue': return platform.revenue
      case 'bookings': return platform.bookings
      case 'conversion_rate': return platform.conversion_rate
      case 'roi': return platform.roi
      case 'cost_efficiency': return platform.cost_per_booking
      case 'page_views': return platform.page_views
      default: return 0
    }
  }

  const maxValue = useMemo(() => {
    if (comparisonData.length === 0) return 1
    return Math.max(...comparisonData.map(p => p.metric_value))
  }, [comparisonData])

  const getBarWidth = (value: number) => {
    if (selectedMetric === 'cost_efficiency') {
      // For cost efficiency, invert the scale (lower cost = higher bar)
      const maxCost = Math.max(...comparisonData.map(p => p.cost_per_booking))
      return maxCost > 0 ? ((maxCost - value) / maxCost) * 100 : 0
    }
    return maxValue > 0 ? (value / maxValue) * 100 : 0
  }

  const getPerformanceBadge = (score: number) => {
    if (score >= 80) return { variant: 'success' as const, label: 'Excellent' }
    if (score >= 60) return { variant: 'default' as const, label: 'Good' }
    if (score >= 40) return { variant: 'secondary' as const, label: 'Fair' }
    return { variant: 'destructive' as const, label: 'Poor' }
  }

  const getTrendChange = (platform: PlatformMetrics) => {
    const change = timeRange === '24h' ? platform.last_24h.change_percent : platform.last_7d.change_percent
    return {
      value: Math.abs(change),
      isPositive: change > 0,
      color: change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
    }
  }

  if (platforms.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Platform Data</h3>
          <p className="text-gray-500">Configure tracking pixels to see platform comparisons.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Platform Performance Comparison</h3>
          <p className="text-sm text-gray-500">Compare metrics across your marketing platforms</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['revenue', 'bookings', 'conversion_rate'] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  selectedMetric === metric
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {metricConfigs[metric].label}
              </button>
            ))}
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {([
              { key: 'metric', label: 'Metric' },
              { key: 'performance', label: 'Performance' },
              { key: 'efficiency', label: 'Efficiency' }
            ] as const).map((sort) => (
              <button
                key={sort.key}
                onClick={() => setSortBy(sort.key)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  sortBy === sort.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {sort.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Description */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="py-3">
          <div className="flex items-center space-x-2">
            {metricConfigs[selectedMetric].icon}
            <span className="font-medium">{metricConfigs[selectedMetric].label}</span>
            <span className="text-sm text-gray-500">—</span>
            <span className="text-sm text-gray-600">{metricConfigs[selectedMetric].description}</span>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {metricConfigs[selectedMetric].label} Comparison
          </CardTitle>
          <CardDescription>
            Sorted by {sortBy === 'metric' ? metricConfigs[selectedMetric].label.toLowerCase() : sortBy}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {comparisonData.map((platform, index) => {
            const trend = getTrendChange(platform)
            const performanceBadge = getPerformanceBadge(platform.performance_score)
            
            return (
              <div key={platform.platform} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                      <span className="text-lg">{platform.icon}</span>
                    </div>
                    <div>
                      <div className="font-medium">{platform.platform}</div>
                      <div className="text-sm text-gray-500">
                        Rank #{index + 1} • {getPerformanceBadge(platform.performance_score).label}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {metricConfigs[selectedMetric].formatter(platform.metric_value)}
                    </div>
                    <div className={`text-sm flex items-center justify-end ${trend.color}`}>
                      {trend.isPositive ? (
                        <ArrowUpIcon className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownIcon className="w-3 h-3 mr-1" />
                      )}
                      {trend.value.toFixed(1)}% ({timeRange})
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{metricConfigs[selectedMetric].label}</span>
                    <span className="text-gray-500">
                      {((getBarWidth(platform.metric_value) / 100) * 100).toFixed(0)}% of top performer
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${metricConfigs[selectedMetric].color}`}
                      style={{ width: `${getBarWidth(platform.metric_value)}%` }}
                    />
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Performance:</span>
                    <Badge {...performanceBadge} className="ml-1 text-xs">
                      {platform.performance_score}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Efficiency:</span>
                    <span className="ml-1 font-medium">{platform.efficiency_score}/100</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Conv. Rate:</span>
                    <span className="ml-1 font-medium">{platform.conversion_rate.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <Badge 
                      variant={platform.status === 'active' ? 'success' : 'warning'} 
                      className="ml-1 text-xs"
                    >
                      {platform.status}
                    </Badge>
                  </div>
                </div>

                {index < comparisonData.length - 1 && (
                  <hr className="border-gray-200" />
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Performance Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Performance Matrix</CardTitle>
          <CardDescription>
            Compare performance vs efficiency across all platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Performance Scores</h4>
              <div className="space-y-3">
                {comparisonData.map((platform) => (
                  <div key={platform.platform} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{platform.icon}</span>
                      <span className="text-sm">{platform.platform}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${platform.performance_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">
                        {platform.performance_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Efficiency Scores</h4>
              <div className="space-y-3">
                {comparisonData.map((platform) => (
                  <div key={platform.platform} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{platform.icon}</span>
                      <span className="text-sm">{platform.platform}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${platform.efficiency_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">
                        {platform.efficiency_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparisonData.length > 1 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-1">Top Performer</div>
                <div className="text-sm text-blue-700">
                  <span className="mr-1">{comparisonData[0].icon}</span>
                  <strong>{comparisonData[0].platform}</strong> leads in {metricConfigs[selectedMetric].label.toLowerCase()} 
                  with {metricConfigs[selectedMetric].formatter(comparisonData[0].metric_value)}
                </div>
              </div>
            )}
            
            {comparisonData.find(p => p.efficiency_score < 50) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 mb-1">Optimization Opportunity</div>
                <div className="text-sm text-yellow-700">
                  Some platforms have efficiency scores below 50. Consider optimizing targeting, 
                  creative, or landing pages for better cost efficiency.
                </div>
              </div>
            )}
            
            {comparisonData.find(p => p.performance_score >= 80) && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-medium text-green-800 mb-1">Scale Opportunity</div>
                <div className="text-sm text-green-700">
                  You have high-performing platforms with excellent metrics. 
                  Consider increasing budget allocation to maximize returns.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
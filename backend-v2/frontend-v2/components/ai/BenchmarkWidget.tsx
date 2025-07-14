'use client'

/**
 * Benchmark Widget - Industry Performance Comparison Component
 * 
 * Displays real-time industry percentile rankings and competitive positioning
 * for key business metrics.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  InformationCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

interface BenchmarkData {
  user_value: number
  percentile_rank: number
  industry_median: number
  industry_mean: number
  sample_size: number
  comparison_text: string
  improvement_potential?: number
  top_quartile_threshold?: number
}

interface BenchmarkWidgetProps {
  metric: string
  label: string
  value: number
  unit?: string
  icon?: React.ReactNode
  className?: string
  showDetails?: boolean
  compactMode?: boolean
}

export default function BenchmarkWidget({ 
  metric, 
  label, 
  value, 
  unit = '', 
  icon,
  className = '',
  showDetails = false,
  compactMode = false
}: BenchmarkWidgetProps) {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadBenchmarkData()
  }, [metric])

  const loadBenchmarkData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/v1/ai-analytics/benchmarks/${metric}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.status === 403) {
        // User hasn't consented to benchmarking
        setLoading(false)
        return
      }
      
      if (!response.ok) {
        throw new Error('Failed to load benchmark data')
      }
      
      const data = await response.json()
      setBenchmarkData(data.benchmark_data)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load benchmark')
    } finally {
      setLoading(false)
    }
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return 'text-emerald-600'
    if (percentile >= 75) return 'text-green-600'
    if (percentile >= 50) return 'text-yellow-600'
    if (percentile >= 25) return 'text-orange-600'
    return 'text-red-600'
  }

  const getPercentileBgColor = (percentile: number) => {
    if (percentile >= 90) return 'bg-emerald-100'
    if (percentile >= 75) return 'bg-green-100'
    if (percentile >= 50) return 'bg-yellow-100'
    if (percentile >= 25) return 'bg-orange-100'
    return 'bg-red-100'
  }

  const getPerformanceIcon = (percentile: number) => {
    if (percentile >= 75) return <ArrowTrendingUpIcon className="w-4 h-4" />
    if (percentile >= 50) return <MinusIcon className="w-4 h-4" />
    return <ArrowTrendingDownIcon className="w-4 h-4" />
  }

  const getPerformanceText = (percentile: number) => {
    if (percentile >= 90) return 'Exceptional'
    if (percentile >= 75) return 'Excellent'
    if (percentile >= 50) return 'Above Average'
    if (percentile >= 25) return 'Below Average'
    return 'Needs Improvement'
  }

  const formatValue = (val: number) => {
    if (metric === 'revenue' || metric === 'efficiency') {
      return `$${val.toLocaleString()}`
    }
    return val.toLocaleString()
  }

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardContent className={compactMode ? 'p-3' : 'p-4'}>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !benchmarkData) {
    return (
      <Card className={`${className} border-gray-200`}>
        <CardContent className={compactMode ? 'p-3' : 'p-4'}>
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <div className="font-medium text-gray-900">{label}</div>
              <div className="text-lg font-bold">{formatValue(value)}{unit}</div>
              {error && <div className="text-xs text-red-500">{error}</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const percentile = benchmarkData.percentile_rank

  if (compactMode) {
    return (
      <Card className={`${className} border-gray-200 hover:border-blue-300 transition-colors`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <div className="text-sm font-medium text-gray-700">{label}</div>
                <div className="text-lg font-bold">{formatValue(value)}{unit}</div>
              </div>
            </div>
            
            <div className="text-right">
              <Badge className={`${getPercentileBgColor(percentile)} ${getPercentileColor(percentile)} border-none`}>
                {percentile}th
              </Badge>
              <div className="text-xs text-gray-500 mt-1">percentile</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className} border-gray-200 hover:border-blue-300 transition-colors`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-medium text-gray-900">{label}</span>
            </div>
            
            {showDetails && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Main Value and Percentile */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatValue(value)}{unit}
              </div>
              <div className="text-sm text-gray-500">Your current value</div>
            </div>
            
            <div className="text-right">
              <div className={`flex items-center gap-1 ${getPercentileColor(percentile)}`}>
                {getPerformanceIcon(percentile)}
                <span className="text-2xl font-bold">{percentile}th</span>
              </div>
              <div className="text-sm text-gray-500">percentile</div>
            </div>
          </div>

          {/* Performance Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>0th</span>
              <span>50th (median)</span>
              <span>100th</span>
            </div>
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              {/* Background segments */}
              <div className="absolute inset-0 flex">
                <div className="w-1/4 bg-red-200"></div>
                <div className="w-1/4 bg-orange-200"></div>
                <div className="w-1/4 bg-yellow-200"></div>
                <div className="w-1/4 bg-green-200"></div>
              </div>
              
              {/* User position indicator */}
              <div 
                className="absolute top-0 h-full w-1 bg-blue-600 shadow-lg"
                style={{ left: `${percentile}%` }}
              >
                <div className="absolute -top-1 -left-1 w-3 h-5 bg-blue-600 rounded-sm"></div>
              </div>
            </div>
          </div>

          {/* Performance Label */}
          <div className="text-center">
            <Badge 
              className={`${getPercentileBgColor(percentile)} ${getPercentileColor(percentile)} border-none`}
            >
              {getPerformanceText(percentile)}
            </Badge>
          </div>

          {/* Comparison Text */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            {benchmarkData.comparison_text}
          </div>

          {/* Improvement Potential */}
          {benchmarkData.improvement_potential && benchmarkData.improvement_potential > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <ArrowTrendingUpIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-blue-900">Growth Opportunity</div>
                  <div className="text-sm text-blue-700">
                    {formatValue(benchmarkData.improvement_potential)}{unit} potential to reach top quartile
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expanded Details */}
          {expanded && showDetails && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Industry Median</div>
                  <div className="font-medium">{formatValue(benchmarkData.industry_median)}{unit}</div>
                </div>
                <div>
                  <div className="text-gray-500">Industry Average</div>
                  <div className="font-medium">{formatValue(benchmarkData.industry_mean)}{unit}</div>
                </div>
                <div>
                  <div className="text-gray-500">Top Quartile</div>
                  <div className="font-medium">
                    {benchmarkData.top_quartile_threshold ? 
                      `${formatValue(benchmarkData.top_quartile_threshold)}${unit}` : 
                      'N/A'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Sample Size</div>
                  <div className="font-medium">{benchmarkData.sample_size} businesses</div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium">Privacy Notice</div>
                    <div>
                      Benchmarks based on anonymized data from similar businesses. 
                      Individual data is never shared or exposed.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { 
  FunnelIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  CreditCardIcon,
  CheckCircleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface FunnelStep {
  step: string
  visitors: number
  conversion_rate: number
  drop_off_rate: number
  icon?: React.ReactNode
  color?: string
  description?: string
}

interface FunnelInsight {
  type: 'bottleneck' | 'opportunity' | 'success'
  step: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  recommendation?: string
}

interface ConversionFunnelChartProps {
  funnel: FunnelStep[]
  timeRange: '24h' | '7d' | '30d'
  totalRevenue?: number
}

const stepIcons = {
  'Page Views': <EyeIcon className="w-5 h-5" />,
  'Booking Page': <CursorArrowRaysIcon className="w-5 h-5" />,
  'Service Selected': <UserGroupIcon className="w-5 h-5" />,
  'Payment Started': <CreditCardIcon className="w-5 h-5" />,
  'Booking Complete': <CheckCircleIcon className="w-5 h-5" />
}

const stepColors = {
  'Page Views': 'bg-blue-500',
  'Booking Page': 'bg-purple-500',
  'Service Selected': 'bg-orange-500',
  'Payment Started': 'bg-red-500',
  'Booking Complete': 'bg-green-500'
}

export default function ConversionFunnelChart({ 
  funnel, 
  timeRange,
  totalRevenue = 0 
}: ConversionFunnelChartProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'absolute' | 'percentage'>('absolute')

  // Calculate funnel insights
  const insights = useMemo(() => {
    const calculatedInsights: FunnelInsight[] = []
    
    // Find biggest drop-off points (bottlenecks)
    for (let i = 1; i < funnel.length; i++) {
      const dropOff = funnel[i-1].drop_off_rate
      if (dropOff > 60) {
        calculatedInsights.push({
          type: 'bottleneck',
          step: funnel[i-1].step,
          title: 'High Drop-off Detected',
          description: `${dropOff.toFixed(1)}% of visitors drop off at this step`,
          impact: dropOff > 80 ? 'high' : dropOff > 70 ? 'medium' : 'low',
          recommendation: getBottleneckRecommendation(funnel[i-1].step)
        })
      }
    }

    // Find optimization opportunities
    const paymentStep = funnel.find(step => step.step.includes('Payment'))
    if (paymentStep && paymentStep.drop_off_rate > 25) {
      calculatedInsights.push({
        type: 'opportunity',
        step: paymentStep.step,
        title: 'Payment Optimization Opportunity',
        description: 'High payment abandonment suggests friction in checkout process',
        impact: 'high',
        recommendation: 'Simplify payment form, add trust signals, offer multiple payment methods'
      })
    }

    // Identify successful steps
    const topStep = funnel.find(step => step.conversion_rate > 80)
    if (topStep && topStep.step !== 'Page Views') {
      calculatedInsights.push({
        type: 'success',
        step: topStep.step,
        title: 'High Performance Step',
        description: `${topStep.conversion_rate.toFixed(1)}% conversion rate indicates effective optimization`,
        impact: 'medium'
      })
    }

    return calculatedInsights
  }, [funnel])

  function getBottleneckRecommendation(step: string): string {
    const recommendations: Record<string, string> = {
      'Page Views': 'Improve page load speed, mobile optimization, and user experience',
      'Booking Page': 'Simplify booking interface, add clear value propositions, reduce form fields',
      'Service Selected': 'Improve service descriptions, add photos, clarify pricing',
      'Payment Started': 'Streamline payment process, add security badges, offer guest checkout',
      'Booking Complete': 'Fix technical issues, improve confirmation flow'
    }
    return recommendations[step] || 'Analyze user behavior and optimize step experience'
  }

  const maxVisitors = funnel.length > 0 ? funnel[0].visitors : 1
  const overallConversionRate = maxVisitors > 0 ? ((funnel[funnel.length - 1]?.visitors || 0) / maxVisitors) * 100 : 0

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const getStepWidth = (visitors: number) => {
    return Math.max((visitors / maxVisitors) * 100, 10) // Minimum 10% width for visibility
  }

  const getInsightIcon = (type: FunnelInsight['type']) => {
    switch (type) {
      case 'bottleneck': return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
      case 'opportunity': return <LightBulbIcon className="w-4 h-4 text-yellow-500" />
      case 'success': return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
    }
  }

  const getInsightColor = (type: FunnelInsight['type']) => {
    switch (type) {
      case 'bottleneck': return 'border-red-200 bg-red-50'
      case 'opportunity': return 'border-yellow-200 bg-yellow-50'
      case 'success': return 'border-green-200 bg-green-50'
    }
  }

  if (funnel.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FunnelIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Funnel Data</h3>
          <p className="text-gray-500">Conversion funnel data will appear once tracking is active.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls and Overview */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Conversion Funnel Analysis</h3>
          <p className="text-sm text-gray-500">
            Overall conversion rate: <span className="font-medium">{overallConversionRate.toFixed(2)}%</span>
            {totalRevenue > 0 && (
              <span className="ml-2">
                • Revenue: <span className="font-medium">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalRevenue)}
                </span>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('absolute')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'absolute'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Absolute
            </button>
            <button
              onClick={() => setViewMode('percentage')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'percentage'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Percentage
            </button>
          </div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Customer Journey Funnel</CardTitle>
          <CardDescription>
            Click on any step to see detailed breakdown and optimization suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnel.map((step, index) => {
              const isSelected = selectedStep === step.step
              const isLast = index === funnel.length - 1
              const stepIcon = stepIcons[step.step as keyof typeof stepIcons]
              const stepColor = stepColors[step.step as keyof typeof stepColors] || 'bg-gray-500'
              
              return (
                <div key={step.step} className="space-y-3">
                  {/* Step Block */}
                  <div 
                    className={`relative cursor-pointer transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedStep(isSelected ? null : step.step)}
                  >
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div className={`p-2 rounded-lg text-white ${stepColor}`}>
                        {stepIcon || <ChartBarIcon className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{step.step}</h4>
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {viewMode === 'absolute' 
                                ? formatNumber(step.visitors)
                                : `${step.conversion_rate.toFixed(1)}%`
                              }
                            </div>
                            <div className="text-xs text-gray-500">
                              {viewMode === 'absolute' ? 'visitors' : 'conversion rate'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full ${stepColor} transition-all duration-500`}
                              style={{ width: `${getStepWidth(step.visitors)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>
                              {step.conversion_rate.toFixed(1)}% of total traffic
                            </span>
                            {index > 0 && (
                              <span className="text-red-500">
                                {step.drop_off_rate.toFixed(1)}% drop-off
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Detailed View */}
                  {isSelected && (
                    <div className="ml-16 p-4 border border-gray-200 rounded-lg bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatNumber(step.visitors)}
                          </div>
                          <div className="text-sm text-gray-500">Total Visitors</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {step.conversion_rate.toFixed(2)}%
                          </div>
                          <div className="text-sm text-gray-500">Conversion Rate</div>
                        </div>
                        {index > 0 && (
                          <div>
                            <div className="text-2xl font-bold text-red-600">
                              {step.drop_off_rate.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-500">Drop-off Rate</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Step-specific insights */}
                      <div className="space-y-2">
                        <h5 className="font-medium">Optimization Suggestions:</h5>
                        <div className="text-sm text-gray-600">
                          {getBottleneckRecommendation(step.step)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Drop-off visualization between steps */}
                  {!isLast && (
                    <div className="flex items-center justify-center">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <ArrowTrendingDownIcon className="w-4 h-4" />
                        <span>
                          {formatNumber(funnel[index].visitors - funnel[index + 1].visitors)} visitors lost
                        </span>
                        <span className="text-red-500">
                          ({funnel[index + 1].drop_off_rate.toFixed(1)}% drop-off)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights Panel */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Funnel Insights & Recommendations</CardTitle>
            <CardDescription>
              AI-powered analysis of your conversion funnel performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className={`p-4 border rounded-lg ${getInsightColor(insight.type)}`}>
                  <div className="flex items-start space-x-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge 
                          variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {insight.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      {insight.recommendation && (
                        <div className="text-sm">
                          <span className="font-medium">Recommendation: </span>
                          <span className="text-gray-700">{insight.recommendation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funnel Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(funnel[0]?.visitors || 0)}
              </div>
              <div className="text-sm text-gray-500">Total Traffic</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(funnel[funnel.length - 1]?.visitors || 0)}
              </div>
              <div className="text-sm text-gray-500">Conversions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {overallConversionRate.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">Overall Conv. Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {funnel.length - 1}
              </div>
              <div className="text-sm text-gray-500">Funnel Steps</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
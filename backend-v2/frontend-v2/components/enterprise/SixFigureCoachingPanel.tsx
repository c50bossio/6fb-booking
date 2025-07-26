'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Six Figure Barber AI Coaching Panel Component
// Provides real-time coaching recommendations based on performance data

interface CoachingRecommendation {
  id: string
  type: 'revenue' | 'efficiency' | 'client_experience' | 'marketing' | 'pricing'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  impact: string
  timeframe: string
  metrics: {
    currentValue: number
    targetValue: number
    unit: string
  }
  location?: {
    id: number
    name: string
  }
}

interface SixFigureMetrics {
  revenueVelocity: number // Revenue growth rate
  clientLifetimeValue: number // Average CLV
  appointmentEfficiency: number // Time utilization
  pricingOptimization: number // Pricing vs market rate
  marketingROI: number // Marketing effectiveness
  staffProductivity: number // Revenue per staff member
}

interface CoachingPanelProps {
  organizationId?: number
  locationId?: number
  dateRange: string
  className?: string
}

const CoachingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const TrendUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
)

const TargetIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z" />
  </svg>
)

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'revenue': return <TrendUpIcon />
    case 'efficiency': return <TargetIcon />
    case 'client_experience': return <CoachingIcon />
    case 'marketing': return <AlertIcon />
    case 'pricing': return <TrendUpIcon />
    default: return <CoachingIcon />
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

export default function SixFigureCoachingPanel({ organizationId, locationId, dateRange, className }: CoachingPanelProps) {
  const [recommendations, setRecommendations] = useState<CoachingRecommendation[]>([])
  const [metrics, setMetrics] = useState<SixFigureMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  useEffect(() => {
    // Simulate AI coaching recommendations based on Six Figure Barber methodology
    async function loadCoachingData() {
      setLoading(true)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock Six Figure Barber metrics
      const mockMetrics: SixFigureMetrics = {
        revenueVelocity: 15.8, // 15.8% growth rate
        clientLifetimeValue: 1250, // $1,250 average CLV
        appointmentEfficiency: 78, // 78% time utilization
        pricingOptimization: 85, // 85% of optimal pricing
        marketingROI: 4.2, // 4.2x return on marketing spend
        staffProductivity: 89000, // $89k revenue per staff member
      }
      
      // Generate AI coaching recommendations based on Six Figure Barber methodology
      const mockRecommendations: CoachingRecommendation[] = [
        {
          id: '1',
          type: 'pricing',
          priority: 'high',
          title: 'Optimize Service Pricing Strategy',
          description: 'Your current pricing is 15% below optimal rate for your market segment. Six Figure Barber methodology suggests premium positioning.',
          action: 'Increase specialty services pricing by 12-18% and implement value-based packages',
          impact: 'Projected +$2,100/month revenue increase',
          timeframe: '2-3 weeks implementation',
          metrics: {
            currentValue: 85,
            targetValue: 95,
            unit: '% of optimal pricing'
          },
          location: locationId ? { id: locationId, name: 'Current Location' } : undefined
        },
        {
          id: '2',
          type: 'client_experience',
          priority: 'high',
          title: 'Implement Premium Client Journey',
          description: 'Client retention can be improved through enhanced experience touchpoints and follow-up automation.',
          action: 'Deploy automated follow-up sequences and introduce VIP client program',
          impact: 'Expected +22% client retention, +$1,800/month',
          timeframe: '1-2 weeks setup',
          metrics: {
            currentValue: 68,
            targetValue: 85,
            unit: '% client retention'
          }
        },
        {
          id: '3',
          type: 'efficiency',
          priority: 'medium',
          title: 'Optimize Schedule Density',
          description: 'Analysis shows 22% appointment gaps during peak hours. Six Figure methodology emphasizes maximizing high-value time slots.',
          action: 'Implement dynamic scheduling with premium time slot pricing',
          impact: 'Potential +$950/month with better utilization',
          timeframe: '1 week optimization',
          metrics: {
            currentValue: 78,
            targetValue: 88,
            unit: '% schedule efficiency'
          }
        },
        {
          id: '4',
          type: 'marketing',
          priority: 'medium',
          title: 'Enhance Digital Presence ROI',
          description: 'Your marketing ROI is strong but can be optimized further with targeted Six Figure Barber strategies.',
          action: 'Implement referral automation and social proof campaigns',
          impact: 'Projected 35% increase in qualified leads',
          timeframe: '2-3 weeks implementation',
          metrics: {
            currentValue: 4.2,
            targetValue: 5.8,
            unit: 'x marketing ROI'
          }
        },
        {
          id: '5',
          type: 'revenue',
          priority: 'low',
          title: 'Introduce Revenue Diversification',
          description: 'Consider product sales and advanced services to increase average ticket value per the Six Figure framework.',
          action: 'Launch curated product line with 40% margins',
          impact: 'Additional revenue stream: +$680/month',
          timeframe: '3-4 weeks setup',
          metrics: {
            currentValue: 1250,
            targetValue: 1450,
            unit: '$ average CLV'
          }
        }
      ]
      
      setMetrics(mockMetrics)
      setRecommendations(mockRecommendations)
      setLoading(false)
    }
    
    loadCoachingData()
  }, [organizationId, locationId, dateRange])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CoachingIcon />
            <span>Six Figure Barber AI Coach</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Six Figure Barber Metrics Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CoachingIcon />
            <span>Six Figure Barber Performance Metrics</span>
          </CardTitle>
          <CardDescription>
            Key performance indicators aligned with Six Figure Barber methodology
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatPercentage(metrics?.revenueVelocity || 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Revenue Velocity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(metrics?.clientLifetimeValue || 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Client LTV</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatPercentage(metrics?.appointmentEfficiency || 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatPercentage(metrics?.pricingOptimization || 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pricing Opt.</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {metrics?.marketingROI || 0}x
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Marketing ROI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(metrics?.staffProductivity || 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Staff Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Coaching Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CoachingIcon />
              <span>AI Coaching Recommendations</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {recommendations.length} recommendations
            </Badge>
          </CardTitle>
          <CardDescription>
            Personalized recommendations based on Six Figure Barber methodology and your performance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <Card 
                key={rec.id} 
                className={`border-l-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
                  rec.priority === 'high' ? 'border-l-red-500' : 
                  rec.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
                }`}
                onClick={() => setExpandedCard(expandedCard === rec.id ? null : rec.id)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        rec.type === 'revenue' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                        rec.type === 'efficiency' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' :
                        rec.type === 'client_experience' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400' :
                        rec.type === 'marketing' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400' :
                        'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
                      }`}>
                        {getTypeIcon(rec.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{rec.title}</h4>
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority}
                          </Badge>
                          {rec.location && (
                            <Badge variant="outline" className="text-xs">
                              {rec.location.name}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          {rec.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-green-600 dark:text-green-400">{rec.impact}</span>
                          <span>{rec.timeframe}</span>
                        </div>
                        
                        {expandedCard === rec.id && (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Recommended Action:</h5>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{rec.action}</p>
                            
                            <div className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded border">
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Current:</span>
                                <div className="font-semibold">{rec.metrics.currentValue}{rec.metrics.unit}</div>
                              </div>
                              <div className="text-gray-400">→</div>
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Target:</span>
                                <div className="font-semibold text-green-600 dark:text-green-400">
                                  {rec.metrics.targetValue}{rec.metrics.unit}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2 mt-3">
                              <Button size="sm" variant="default">
                                Implement Now
                              </Button>
                              <Button size="sm" variant="outline">
                                Schedule Later
                              </Button>
                              <Button size="sm" variant="ghost">
                                Learn More
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <Button variant="outline" className="w-full">
              View All Coaching Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
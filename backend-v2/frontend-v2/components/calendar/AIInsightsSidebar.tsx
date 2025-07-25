'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  FreshaColors, 
  FreshaTypography, 
  FreshaSpacing 
} from '@/lib/fresha-design-system'
import {
  SmartSchedulingEngine,
  SchedulingInsight,
  createSmartSchedulingEngine
} from '@/lib/ai-scheduling-engine'
import {
  ClientPreferenceLearningSystem,
  ClientInsight,
  createClientPreferenceLearningSystem
} from '@/lib/client-preference-learning'
import {
  RevenueOptimizationEngine,
  RevenueOptimizationInsight,
  RevenueMetrics,
  createRevenueOptimizationEngine
} from '@/lib/revenue-optimization'
import {
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  TrendingUpIcon,
  StarIcon,
  BoltIcon,
  FireIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'

interface AIInsightsSidebarProps {
  appointments: any[]
  availability: any[]
  selectedDate?: Date
  className?: string
  onInsightAction?: (insight: any, action: string) => void
}

interface InsightCardProps {
  insight: SchedulingInsight | ClientInsight | RevenueOptimizationInsight
  type: 'scheduling' | 'client' | 'revenue'
  onActionClick?: (action: string) => void
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, type, onActionClick }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getInsightIcon = () => {
    if ('type' in insight) {
      switch (insight.type) {
        case 'revenue_opportunity':
        case 'pricing':
          return <CurrencyDollarIcon className="h-5 w-5" />
        case 'efficiency_improvement':
        case 'scheduling':
          return <BoltIcon className="h-5 w-5" />
        case 'client_retention':
        case 'retention':
          return <UserGroupIcon className="h-5 w-5" />
        case 'peak_optimization':
          return <TrendingUpIcon className="h-5 w-5" />
        case 'retention_risk':
          return <ExclamationTriangleIcon className="h-5 w-5" />
        case 'upsell_opportunity':
        case 'upselling':
          return <ArrowTrendingUpIcon className="h-5 w-5" />
        case 'loyalty_milestone':
          return <StarIcon className="h-5 w-5" />
        case 'behavioral_change':
          return <ChartBarIcon className="h-5 w-5" />
        case 'service_mix':
          return <AcademicCapIcon className="h-5 w-5" />
        default:
          return <LightBulbIcon className="h-5 w-5" />
      }
    }
    return <LightBulbIcon className="h-5 w-5" />
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return FreshaColors.semantic.error
      case 'medium':
        return FreshaColors.premium.gold
      case 'low':
        return FreshaColors.primary[500]
      default:
        return FreshaColors.neutral[500]
    }
  }

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'immediate':
        return FreshaColors.semantic.error
      case 'within_week':
        return FreshaColors.premium.gold
      case 'within_month':
        return FreshaColors.primary[500]
      default:
        return FreshaColors.neutral[500]
    }
  }

  const formatImpact = (impact: number) => {
    if (impact >= 1000) {
      return `$${(impact / 1000).toFixed(1)}k`
    }
    return `$${Math.round(impact)}`
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return FreshaColors.neutral[400]
    if (confidence >= 85) return FreshaColors.semantic.success
    if (confidence >= 70) return FreshaColors.premium.gold
    if (confidence >= 50) return FreshaColors.primary[500]
    return FreshaColors.neutral[400]
  }

  const renderActionButtons = () => {
    const actions = 'actionable_steps' in insight ? insight.actionable_steps : 
                   'recommended_actions' in insight ? insight.recommended_actions : []
    
    if (actions.length === 0) return null

    return (
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Recommended Actions
        </h5>
        <div className="space-y-1">
          {actions.slice(0, isExpanded ? actions.length : 2).map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-8 px-3"
              onClick={() => onActionClick?.(action)}
            >
              <ChevronRightIcon className="h-3 w-3 mr-2" />
              {typeof action === 'string' ? action : action}
            </Button>
          ))}
          {actions.length > 2 && !isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-6 text-blue-600"
              onClick={() => setIsExpanded(true)}
            >
              +{actions.length - 2} more actions
            </Button>
          )}
        </div>
      </div>
    )
  }

  const priority = 'priority' in insight ? insight.priority : 'medium'
  const urgency = 'urgency' in insight ? insight.urgency : undefined
  const impact = 'potential_monthly_impact' in insight ? insight.potential_monthly_impact :
                'potential_revenue_impact' in insight ? insight.potential_revenue_impact : 0
  const confidence = 'confidence' in insight ? insight.confidence : undefined

  return (
    <Card className="mb-4 transition-all duration-200 hover:shadow-md border-l-4" 
          style={{ borderLeftColor: getPriorityColor(priority) }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: `${getPriorityColor(priority)}15`,
                color: getPriorityColor(priority)
              }}
            >
              {getInsightIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold text-gray-900 line-clamp-2">
                {insight.title}
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {insight.description}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-1 ml-2">
            <Badge 
              className="text-xs px-2 py-0.5"
              style={{ 
                backgroundColor: `${getPriorityColor(priority)}15`,
                color: getPriorityColor(priority),
                border: `1px solid ${getPriorityColor(priority)}30`
              }}
            >
              {priority.toUpperCase()}
            </Badge>
            {urgency && (
              <Badge 
                variant="outline"
                className="text-xs px-2 py-0.5"
                style={{ 
                  borderColor: getUrgencyColor(urgency),
                  color: getUrgencyColor(urgency)
                }}
              >
                {urgency.replace('_', ' ').toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Impact and Confidence Metrics */}
        <div className="flex items-center justify-between mb-4">
          {impact > 0 && (
            <div className="flex items-center space-x-1 text-sm">
              <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-700">
                {formatImpact(impact)}
              </span>
              <span className="text-gray-500 text-xs">impact</span>
            </div>
          )}
          
          {confidence && (
            <div className="flex items-center space-x-1 text-sm">
              <ShieldCheckIcon className="h-4 w-4" style={{ color: getConfidenceColor(confidence) }} />
              <span className="font-semibold" style={{ color: getConfidenceColor(confidence) }}>
                {confidence}%
              </span>
              <span className="text-gray-500 text-xs">confidence</span>
            </div>
          )}
        </div>

        {/* Six Figure Barber Alignment (if available) */}
        {'six_fb_methodology_alignment' in insight && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-600">Six Figure Barber Alignment</span>
              <span className="font-semibold text-amber-700">
                {Math.round(insight.six_fb_methodology_alignment)}%
              </span>
            </div>
            <Progress 
              value={insight.six_fb_methodology_alignment} 
              className="h-2"
            />
          </div>
        )}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Expand/Collapse Button */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-6 text-gray-600"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : 'Show Details'}
          </Button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            {'expected_roi' in insight && (
              <div className="text-xs">
                <span className="text-gray-600">Expected ROI: </span>
                <span className="font-semibold text-green-700">{insight.expected_roi}%</span>
              </div>
            )}
            
            {'implementation_effort' in insight && (
              <div className="text-xs">
                <span className="text-gray-600">Implementation: </span>
                <span className="font-semibold capitalize">{insight.implementation_effort} effort</span>
              </div>
            )}

            {'risk_factors' in insight && insight.risk_factors.length > 0 && (
              <div className="text-xs">
                <span className="text-gray-600 block mb-1">Risk Factors:</span>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  {insight.risk_factors.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {'metrics_to_track' in insight && insight.metrics_to_track.length > 0 && (
              <div className="text-xs">
                <span className="text-gray-600 block mb-1">Metrics to Track:</span>
                <div className="flex flex-wrap gap-1">
                  {insight.metrics_to_track.map((metric, index) => (
                    <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                      {metric}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: string
  subtitle?: string
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  color, 
  subtitle 
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000) {
        return `$${(val / 1000).toFixed(1)}k`
      }
      return val % 1 === 0 ? val.toString() : val.toFixed(1)
    }
    return val
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-1">
            {title}
          </p>
          <p className="text-lg font-bold text-gray-900">
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
          {change !== undefined && (
            <div className={`flex items-center space-x-1 mt-1 text-xs ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <ArrowTrendingUpIcon className={`h-3 w-3 ${change < 0 ? 'rotate-180' : ''}`} />
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}

export const AIInsightsSidebar: React.FC<AIInsightsSidebarProps> = ({
  appointments,
  availability,
  selectedDate,
  className = '',
  onInsightAction
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduling' | 'clients' | 'revenue'>('overview')
  const [refreshing, setRefreshing] = useState(false)

  // Initialize AI engines
  const { schedulingEngine, clientLearningSystem, revenueEngine } = useMemo(() => {
    const scheduling = createSmartSchedulingEngine(appointments, availability)
    const client = createClientPreferenceLearningSystem(appointments)
    const revenue = createRevenueOptimizationEngine(appointments)
    
    return {
      schedulingEngine: scheduling,
      clientLearningSystem: client,
      revenueEngine: revenue
    }
  }, [appointments, availability])

  // Generate insights
  const { schedulingInsights, clientInsights, revenueInsights, revenueMetrics } = useMemo(() => {
    return {
      schedulingInsights: schedulingEngine.generateSchedulingInsights(),
      clientInsights: clientLearningSystem.getInsights(),
      revenueInsights: revenueEngine.generateOptimizationInsights(),
      revenueMetrics: revenueEngine.calculateRevenueMetrics()
    }
  }, [schedulingEngine, clientLearningSystem, revenueEngine])

  // Combine and prioritize all insights
  const allInsights = useMemo(() => {
    const combined = [
      ...schedulingInsights.map(insight => ({ ...insight, source: 'scheduling' as const })),
      ...clientInsights.map(insight => ({ ...insight, source: 'client' as const })),
      ...revenueInsights.map(insight => ({ ...insight, source: 'revenue' as const }))
    ]

    return combined.sort((a, b) => {
      const priorityOrder = { immediate: 4, high: 3, medium: 2, low: 1, within_week: 3, within_month: 1 }
      const aPriority = ('urgency' in a ? priorityOrder[a.urgency as keyof typeof priorityOrder] : 0) || 
                      ('priority' in a ? priorityOrder[a.priority as keyof typeof priorityOrder] : 0) || 0
      const bPriority = ('urgency' in b ? priorityOrder[b.urgency as keyof typeof priorityOrder] : 0) || 
                      ('priority' in b ? priorityOrder[b.priority as keyof typeof priorityOrder] : 0) || 0
      return bPriority - aPriority
    })
  }, [schedulingInsights, clientInsights, revenueInsights])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          title="Revenue"
          value={revenueMetrics.total_revenue}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          color={FreshaColors.semantic.success}
          subtitle="This month"
        />
        <MetricCard
          title="Utilization"
          value={`${revenueMetrics.utilization_rate}%`}
          icon={<ClockIcon className="h-5 w-5" />}
          color={FreshaColors.primary[500]}
          subtitle="Schedule efficiency"
        />
        <MetricCard
          title="Retention"
          value={`${revenueMetrics.client_retention_rate}%`}
          icon={<UserGroupIcon className="h-5 w-5" />}
          color={FreshaColors.premium.gold}
          subtitle="Client loyalty"
        />
        <MetricCard
          title="Avg. Price"
          value={revenueMetrics.average_service_price}
          icon={<TrendingUpIcon className="h-5 w-5" />}
          color={FreshaColors.premium.bronze}
          subtitle="Per service"
        />
      </div>

      {/* Top Priority Insights */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <FireIcon className="h-4 w-4 mr-2 text-red-500" />
          Priority Actions
        </h4>
        <div className="space-y-3">
          {allInsights.slice(0, 3).map((insight, index) => (
            <InsightCard
              key={index}
              insight={insight}
              type={insight.source}
              onActionClick={(action) => onInsightAction?.(insight, action)}
            />
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-blue-100">
              <SparklesIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">AI Analysis Summary</h4>
              <p className="text-sm text-blue-800 mt-1">
                {allInsights.length} optimization opportunities identified with 
                ${Math.round(allInsights.reduce((sum, insight) => {
                  const impact = ('potential_monthly_impact' in insight ? insight.potential_monthly_impact : 0) ||
                               ('potential_revenue_impact' in insight ? insight.potential_revenue_impact : 0) || 0
                  return sum + impact
                }, 0))} potential monthly impact.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSchedulingInsights = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Scheduling Optimization</h4>
        <Badge variant="outline" className="text-xs">
          {schedulingInsights.length} insights
        </Badge>
      </div>
      
      {schedulingInsights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CalendarDaysIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No scheduling insights available</p>
        </div>
      ) : (
        schedulingInsights.map((insight, index) => (
          <InsightCard
            key={index}
            insight={insight}
            type="scheduling"
            onActionClick={(action) => onInsightAction?.(insight, action)}
          />
        ))
      )}
    </div>
  )

  const renderClientInsights = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Client Intelligence</h4>
        <Badge variant="outline" className="text-xs">
          {clientInsights.length} insights
        </Badge>
      </div>
      
      {clientInsights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <UserGroupIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No client insights available</p>
        </div>
      ) : (
        clientInsights.map((insight, index) => (
          <InsightCard
            key={index}
            insight={insight}
            type="client"
            onActionClick={(action) => onInsightAction?.(insight, action)}
          />
        ))
      )}
    </div>
  )

  const renderRevenueInsights = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Revenue Optimization</h4>
        <Badge variant="outline" className="text-xs">
          {revenueInsights.length} insights
        </Badge>
      </div>
      
      {revenueInsights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CurrencyDollarIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No revenue insights available</p>
        </div>
      ) : (
        revenueInsights.map((insight, index) => (
          <InsightCard
            key={index}
            insight={insight}
            type="revenue"
            onActionClick={(action) => onInsightAction?.(insight, action)}
          />
        ))
      )}
    </div>
  )

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <ChartBarIcon className="h-4 w-4" /> },
    { key: 'scheduling', label: 'Schedule', icon: <ClockIcon className="h-4 w-4" /> },
    { key: 'clients', label: 'Clients', icon: <UserGroupIcon className="h-4 w-4" /> },
    { key: 'revenue', label: 'Revenue', icon: <CurrencyDollarIcon className="h-4 w-4" /> }
  ]

  return (
    <div className={`w-80 bg-white border-l border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">AI Insights</h3>
              <p className="text-xs text-gray-600">Real-time optimization</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2"
          >
            <BoltIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`
                flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all
                ${activeTab === tab.key 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'scheduling' && renderSchedulingInsights()}
          {activeTab === 'clients' && renderClientInsights()}
          {activeTab === 'revenue' && renderRevenueInsights()}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center space-x-1 text-xs text-gray-600">
          <StarIcon className="h-3 w-3 text-amber-500" />
          <span>Powered by Six Figure Barber AI</span>
        </div>
      </div>
    </div>
  )
}

export default AIInsightsSidebar
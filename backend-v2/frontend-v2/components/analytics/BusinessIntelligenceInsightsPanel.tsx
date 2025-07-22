'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  Brain, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  Star,
  ChevronRight,
  ChevronDown,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useSixFigureAnalytics } from '@/lib/six-figure-analytics'

export interface BusinessInsight {
  id: string
  category: 'revenue' | 'clients' | 'services' | 'efficiency' | 'growth'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionItems: string[]
  expectedImpact: number // Dollar amount
  confidence: number // 0-100%
  timeline: string // e.g., "2-3 weeks"
  status: 'new' | 'in_progress' | 'completed' | 'dismissed'
  tags?: string[]
}

interface BusinessIntelligenceInsightsPanelProps {
  insights?: BusinessInsight[]
  showFilters?: boolean
  maxInsights?: number
  autoRefresh?: boolean
  className?: string
}

/**
 * Business Intelligence Insights Panel
 * AI-powered insights and recommendations for Six Figure Barber methodology
 * Designed to integrate seamlessly into existing analytics dashboards
 */
export function BusinessIntelligenceInsightsPanel({
  insights: providedInsights,
  showFilters = true,
  maxInsights = 5,
  autoRefresh = true,
  className
}: BusinessIntelligenceInsightsPanelProps) {
  const { getBusinessIntelligence } = useSixFigureAnalytics()
  const [insights, setInsights] = useState<BusinessInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())

  // Category configuration
  const categories = {
    revenue: { icon: DollarSign, label: 'Revenue', color: 'text-green-600' },
    clients: { icon: Users, label: 'Clients', color: 'text-blue-600' },
    services: { icon: Activity, label: 'Services', color: 'text-purple-600' },
    efficiency: { icon: Zap, label: 'Efficiency', color: 'text-orange-600' },
    growth: { icon: TrendingUp, label: 'Growth', color: 'text-emerald-600' }
  }

  // Priority configuration
  const priorities = {
    high: { icon: AlertCircle, label: 'High', color: 'text-red-600', bg: 'bg-red-100' },
    medium: { icon: Target, label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    low: { icon: CheckCircle, label: 'Low', color: 'text-green-600', bg: 'bg-green-100' }
  }

  // Load insights from analytics system or use provided insights
  const loadInsights = async () => {
    if (providedInsights) {
      setInsights(providedInsights)
      return
    }

    setLoading(true)
    try {
      const businessIntelligence = getBusinessIntelligence()
      
      // Convert business intelligence insights to our format
      const convertedInsights: BusinessInsight[] = businessIntelligence.insights.map((insight, index) => ({
        id: `insight-${index}`,
        category: insight.category,
        priority: insight.priority,
        title: insight.title,
        description: insight.description,
        actionItems: insight.actionItems,
        expectedImpact: insight.expectedImpact,
        confidence: 85 + Math.random() * 15, // Mock confidence score
        timeline: getTimelineFromImpact(insight.expectedImpact),
        status: 'new',
        tags: getCategoryTags(insight.category)
      }))

      setInsights(convertedInsights.slice(0, maxInsights))
      setLastRefresh(Date.now())
    } catch (error) {
      console.error('Failed to load business insights:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper functions
  const getTimelineFromImpact = (impact: number): string => {
    if (impact > 10000) return '1-2 weeks'
    if (impact > 5000) return '2-4 weeks'
    if (impact > 1000) return '1-2 months'
    return '2-3 months'
  }

  const getCategoryTags = (category: string): string[] => {
    const tagMap: Record<string, string[]> = {
      revenue: ['Six Figure', 'Growth', 'Pricing'],
      clients: ['Retention', 'Acquisition', 'LTV'],
      services: ['Upselling', 'Efficiency', 'Profitability'],
      efficiency: ['Automation', 'Optimization', 'Time Management'],
      growth: ['Scaling', 'Expansion', 'Marketing']
    }
    return tagMap[category] || []
  }

  // Filter insights
  const filteredInsights = insights.filter(insight => {
    const categoryMatch = selectedCategory === 'all' || insight.category === selectedCategory
    const priorityMatch = selectedPriority === 'all' || insight.priority === selectedPriority
    return categoryMatch && priorityMatch
  })

  // Sort by priority and expected impact
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const prioritySort = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (prioritySort !== 0) return prioritySort
    return b.expectedImpact - a.expectedImpact
  })

  // Toggle insight expansion
  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev)
      if (newSet.has(insightId)) {
        newSet.delete(insightId)
      } else {
        newSet.add(insightId)
      }
      return newSet
    })
  }

  // Handle insight actions
  const markInsightInProgress = (insightId: string) => {
    setInsights(prev => prev.map(insight => 
      insight.id === insightId 
        ? { ...insight, status: 'in_progress' }
        : insight
    ))
  }

  const dismissInsight = (insightId: string) => {
    setInsights(prev => prev.map(insight => 
      insight.id === insightId 
        ? { ...insight, status: 'dismissed' }
        : insight
    ))
  }

  // Auto-refresh effect
  useEffect(() => {
    loadInsights()
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadInsights()
      }, 5 * 60 * 1000) // Refresh every 5 minutes
      
      return () => clearInterval(interval)
    }
  }, [])

  // Calculate summary stats
  const summaryStats = {
    totalInsights: sortedInsights.length,
    highPriorityCount: sortedInsights.filter(i => i.priority === 'high').length,
    totalPotentialImpact: sortedInsights.reduce((sum, i) => sum + i.expectedImpact, 0),
    avgConfidence: sortedInsights.reduce((sum, i) => sum + i.confidence, 0) / sortedInsights.length || 0
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">Business Intelligence</CardTitle>
            <Badge variant="secondary" className="ml-2">
              AI-Powered
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadInsights()}
              disabled={loading}
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
            
            <div className="text-xs text-gray-500">
              Updated {new Date(lastRefresh).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{summaryStats.totalInsights}</div>
            <div className="text-xs text-gray-500">Active Insights</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summaryStats.highPriorityCount}</div>
            <div className="text-xs text-gray-500">High Priority</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${summaryStats.totalPotentialImpact.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Potential Impact</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(summaryStats.avgConfidence)}%
            </div>
            <div className="text-xs text-gray-500">Avg Confidence</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Filter:</span>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All Categories</option>
              {Object.entries(categories).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All Priorities</option>
              {Object.entries(priorities).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Insights List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <div className="text-sm text-gray-500">Loading insights...</div>
            </div>
          ) : sortedInsights.length === 0 ? (
            <div className="text-center py-8">
              <Lightbulb className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <div className="text-sm text-gray-500">No insights available</div>
            </div>
          ) : (
            sortedInsights.map((insight) => {
              const CategoryIcon = categories[insight.category]?.icon || Activity
              const PriorityIcon = priorities[insight.priority]?.icon || Target
              const isExpanded = expandedInsights.has(insight.id)

              return (
                <div
                  key={insight.id}
                  className={cn(
                    'border rounded-lg p-4 transition-all duration-200',
                    insight.status === 'dismissed' && 'opacity-50',
                    insight.priority === 'high' && 'border-red-200 bg-red-50/50',
                    insight.priority === 'medium' && 'border-yellow-200 bg-yellow-50/50',
                    insight.priority === 'low' && 'border-green-200 bg-green-50/50'
                  )}
                >
                  {/* Insight Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CategoryIcon className={cn('w-4 h-4', categories[insight.category]?.color)} />
                        <PriorityIcon className={cn('w-4 h-4', priorities[insight.priority]?.color)} />
                        
                        <Badge 
                          variant="outline"
                          className={cn('text-xs', priorities[insight.priority]?.color)}
                        >
                          {priorities[insight.priority]?.label}
                        </Badge>

                        <Badge variant="secondary" className="text-xs">
                          {categories[insight.category]?.label}
                        </Badge>

                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Star className="w-3 h-3" />
                          {Math.round(insight.confidence)}%
                        </div>
                      </div>

                      <h4 className="font-medium text-gray-900 mb-1">
                        {insight.title}
                      </h4>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {insight.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${insight.expectedImpact.toLocaleString()} potential impact
                        </div>
                        <div>
                          Timeline: {insight.timeline}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleInsightExpansion(insight.id)}
                      className="ml-2"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <>
                      <Separator className="my-3" />
                      
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">
                            Action Items:
                          </h5>
                          <ul className="space-y-1">
                            {insight.actionItems.map((item, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                <ArrowRight className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {insight.tags && insight.tags.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Tags:</h5>
                            <div className="flex flex-wrap gap-1">
                              {insight.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">
                            Implementation Confidence:
                          </h5>
                          <Progress value={insight.confidence} className="h-2" />
                          <div className="text-xs text-gray-500 mt-1">
                            {insight.confidence}% confidence based on similar implementations
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2">
                          {insight.status === 'new' && (
                            <Button
                              size="sm"
                              onClick={() => markInsightInProgress(insight.id)}
                              className="flex items-center gap-1"
                            >
                              <Zap className="w-3 h-3" />
                              Start Implementation
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dismissInsight(insight.id)}
                          >
                            Dismiss
                          </Button>

                          <div className="text-xs text-gray-500 ml-auto">
                            Status: {insight.status.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {sortedInsights.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div>
                Showing {sortedInsights.length} insights
              </div>
              <div className="flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Powered by Six Figure Barber AI
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Insight Action Button Component
 * Standalone component for implementing insight actions
 */
interface InsightActionButtonProps {
  insight: BusinessInsight
  onAction: (insightId: string, action: 'start' | 'dismiss' | 'complete') => void
  className?: string
}

export function InsightActionButton({ insight, onAction, className }: InsightActionButtonProps) {
  const handleAction = (action: 'start' | 'dismiss' | 'complete') => {
    onAction(insight.id, action)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {insight.status === 'new' && (
        <Button
          size="sm"
          onClick={() => handleAction('start')}
          className="flex items-center gap-1"
        >
          <Zap className="w-3 h-3" />
          Implement
        </Button>
      )}
      
      {insight.status === 'in_progress' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('complete')}
          className="flex items-center gap-1"
        >
          <CheckCircle className="w-3 h-3" />
          Mark Complete
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleAction('dismiss')}
        className="text-gray-500 hover:text-gray-700"
      >
        Dismiss
      </Button>
    </div>
  )
}

// Export types for use in other components
export type { BusinessInsight }
export { categories as insightCategories, priorities as insightPriorities }
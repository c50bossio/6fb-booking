/**
 * Analytics Integration Utility
 * Bridges new Six Figure analytics intelligence with existing dashboard components
 * Provides seamless integration without disrupting existing workflows
 */

import { KPIStatusData, KPIStatus, KPITrend } from '@/components/analytics/KPIStatusIndicator'
import { BusinessInsight } from '@/components/analytics/BusinessIntelligenceInsightsPanel'
import { sixFigureAnalytics } from '@/lib/six-figure-analytics'

/**
 * Enhanced Metric Configuration
 * Defines how existing metrics should be enhanced with KPI intelligence
 */
export interface MetricEnhancementConfig {
  metricName: string
  targetValue: number | ((data: any) => number)
  unit?: string
  formatValue?: (value: number) => string
  description?: string
  recommendation?: {
    excellent: string
    good: string
    warning: string
    critical: string
  }
  category: 'revenue' | 'clients' | 'services' | 'efficiency' | 'growth'
}

/**
 * Six Figure Barber Metric Configurations
 * Pre-configured enhancements for common Six Figure Barber metrics
 */
export const SIX_FIGURE_METRIC_CONFIGS: Record<string, MetricEnhancementConfig> = {
  // Revenue Metrics
  'monthly_revenue': {
    metricName: 'Monthly Revenue',
    targetValue: (data) => data.annualGoal / 12,
    unit: '',
    formatValue: (value) => `$${value.toLocaleString()}`,
    description: 'Monthly revenue progress toward six-figure goal',
    recommendation: {
      excellent: 'Revenue exceeding target! Consider expanding services or raising prices strategically.',
      good: 'On track for six-figure goal. Maintain current momentum.',
      warning: 'Revenue below target. Focus on premium service upselling and client retention.',
      critical: 'Significant revenue gap. Implement aggressive growth strategies immediately.'
    },
    category: 'revenue'
  },

  'average_revenue_per_client': {
    metricName: 'Average Revenue Per Client',
    targetValue: 500, // Six Figure Barber target
    unit: '',
    formatValue: (value) => `$${value.toLocaleString()}`,
    description: 'Client value optimization - key to six-figure success',
    recommendation: {
      excellent: 'Exceptional client value! Share your premium service strategies.',
      good: 'Good client value. Look for additional upselling opportunities.',
      warning: 'Client value needs improvement. Focus on service bundling and premium offerings.',
      critical: 'Low client value threatens six-figure goals. Urgent pricing and service optimization needed.'
    },
    category: 'clients'
  },

  'premium_service_percentage': {
    metricName: 'Premium Service Mix',
    targetValue: 0.4, // 40% of revenue from premium services
    unit: '%',
    formatValue: (value) => `${(value * 100).toFixed(1)}%`,
    description: 'Percentage of revenue from premium services - critical for profitability',
    recommendation: {
      excellent: 'Optimal premium service mix achieved! Maintain this balance.',
      good: 'Good premium service ratio. Consider slight increases.',
      warning: 'Premium service mix below optimal. Train staff and promote premium offerings.',
      critical: 'Insufficient premium services. Restructure service menu and pricing immediately.'
    },
    category: 'services'
  },

  'client_retention_rate': {
    metricName: 'Client Retention Rate',
    targetValue: 0.8, // 80% retention target
    unit: '%',
    formatValue: (value) => `${(value * 100).toFixed(1)}%`,
    description: 'Client loyalty and relationship strength indicator',
    recommendation: {
      excellent: 'Outstanding client loyalty! Your relationship building is working.',
      good: 'Solid retention. Continue nurturing client relationships.',
      warning: 'Retention needs attention. Implement follow-up programs and loyalty incentives.',
      critical: 'Poor retention hurts growth. Urgent client relationship and service quality improvements needed.'
    },
    category: 'clients'
  },

  'booking_utilization_rate': {
    metricName: 'Booking Utilization',
    targetValue: 0.75, // 75% utilization target
    unit: '%',
    formatValue: (value) => `${(value * 100).toFixed(1)}%`,
    description: 'Schedule efficiency and revenue maximization',
    recommendation: {
      excellent: 'Excellent utilization! Consider expanding availability or raising prices.',
      good: 'Good schedule efficiency. Look for optimization opportunities.',
      warning: 'Schedule gaps affecting revenue. Optimize booking processes and marketing.',
      critical: 'Low utilization limiting growth. Urgent scheduling and marketing improvements needed.'
    },
    category: 'efficiency'
  },

  'revenue_growth_rate': {
    metricName: 'Revenue Growth Rate',
    targetValue: 0.1, // 10% monthly growth
    unit: '%',
    formatValue: (value) => `${(value * 100).toFixed(1)}%`,
    description: 'Business growth trajectory toward six-figure goal',
    recommendation: {
      excellent: 'Exceptional growth! Prepare for scaling challenges.',
      good: 'Healthy growth rate. Maintain current strategies.',
      warning: 'Growth slowing. Implement new client acquisition and retention strategies.',
      critical: 'No growth threatens six-figure timeline. Major strategic changes required.'
    },
    category: 'growth'
  },

  'six_figure_progress': {
    metricName: 'Six Figure Progress',
    targetValue: 1.0, // 100% of annual goal
    unit: '%',
    formatValue: (value) => `${(value * 100).toFixed(1)}%`,
    description: 'Progress toward $100,000 annual revenue goal',
    recommendation: {
      excellent: 'Six-figure goal achieved! Time to set new targets.',
      good: 'On track for six-figure success. Maintain momentum.',
      warning: 'Behind six-figure pace. Accelerate growth strategies.',
      critical: 'Six-figure goal at risk. Implement emergency revenue strategies.'
    },
    category: 'revenue'
  }
}

/**
 * Analytics Integration Helper
 * Main utility class for integrating new analytics with existing systems
 */
export class AnalyticsIntegration {
  private metricConfigs: Map<string, MetricEnhancementConfig> = new Map()

  constructor() {
    // Load default Six Figure Barber configurations
    Object.entries(SIX_FIGURE_METRIC_CONFIGS).forEach(([key, config]) => {
      this.metricConfigs.set(key, config)
    })
  }

  /**
   * Enhance existing metric with KPI intelligence
   */
  enhanceMetric(
    metricKey: string, 
    currentValue: number, 
    additionalData?: any
  ): KPIStatusData | null {
    const config = this.metricConfigs.get(metricKey)
    if (!config) return null

    const targetValue = typeof config.targetValue === 'function' 
      ? config.targetValue(additionalData) 
      : config.targetValue

    const status = this.calculateKPIStatus(currentValue, targetValue)
    const trend = this.calculateTrend(metricKey, currentValue, additionalData)

    return {
      name: config.metricName,
      currentValue,
      targetValue,
      trend,
      status,
      unit: config.unit,
      formatValue: config.formatValue,
      description: config.description,
      recommendation: config.recommendation?.[status]
    }
  }

  /**
   * Get KPI data for multiple metrics
   */
  enhanceMultipleMetrics(
    metrics: Record<string, number>,
    additionalData?: any
  ): KPIStatusData[] {
    return Object.entries(metrics)
      .map(([key, value]) => this.enhanceMetric(key, value, additionalData))
      .filter((kpi): kpi is KPIStatusData => kpi !== null)
  }

  /**
   * Generate business insights for current metrics
   */
  generateInsights(
    metrics: Record<string, number>,
    additionalData?: any
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = []
    const businessIntelligence = sixFigureAnalytics.getBusinessIntelligence()
    
    // Convert business intelligence insights to our format
    businessIntelligence.insights.forEach((insight, index) => {
      insights.push({
        id: `insight-${Date.now()}-${index}`,
        category: insight.category,
        priority: insight.priority,
        title: insight.title,
        description: insight.description,
        actionItems: insight.actionItems,
        expectedImpact: insight.expectedImpact,
        confidence: 85 + Math.random() * 15, // Mock confidence
        timeline: this.getTimelineFromImpact(insight.expectedImpact),
        status: 'new',
        tags: this.getCategoryTags(insight.category)
      })
    })

    return insights
  }

  /**
   * Create dashboard summary for existing analytics pages
   */
  createDashboardSummary(
    metrics: Record<string, number>,
    additionalData?: any
  ) {
    const enhancedKPIs = this.enhanceMultipleMetrics(metrics, additionalData)
    const insights = this.generateInsights(metrics, additionalData)
    
    // Calculate overall health score
    const healthScore = this.calculateOverallHealthScore(enhancedKPIs)
    
    // Get priority insights
    const priorityInsights = insights
      .filter(insight => insight.priority === 'high')
      .slice(0, 3)

    // Get trending metrics
    const trendingUp = enhancedKPIs.filter(kpi => kpi.trend === 'up').length
    const trendingDown = enhancedKPIs.filter(kpi => kpi.trend === 'down').length

    return {
      healthScore,
      kpis: enhancedKPIs,
      insights: priorityInsights,
      summary: {
        totalMetrics: enhancedKPIs.length,
        excellentKPIs: enhancedKPIs.filter(kpi => kpi.status === 'excellent').length,
        criticalKPIs: enhancedKPIs.filter(kpi => kpi.status === 'critical').length,
        trendingUp,
        trendingDown,
        totalPotentialImpact: insights.reduce((sum, insight) => sum + insight.expectedImpact, 0)
      }
    }
  }

  /**
   * Integration hooks for existing analytics components
   */
  getMetricEnhancementProps(metricKey: string, currentValue: number, additionalData?: any) {
    const kpiData = this.enhanceMetric(metricKey, currentValue, additionalData)
    if (!kpiData) return null

    return {
      kpiData,
      statusClasses: this.getStatusClasses(kpiData.status),
      trendIcon: this.getTrendIcon(kpiData.trend),
      shouldHighlight: kpiData.status === 'critical' || kpiData.status === 'excellent'
    }
  }

  /**
   * Add custom metric configuration
   */
  addMetricConfig(key: string, config: MetricEnhancementConfig) {
    this.metricConfigs.set(key, config)
  }

  /**
   * Private helper methods
   */
  private calculateKPIStatus(current: number, target: number): KPIStatus {
    if (target === 0) return 'warning'
    
    const ratio = current / target
    if (ratio >= 1.1) return 'excellent'
    if (ratio >= 0.9) return 'good'
    if (ratio >= 0.7) return 'warning'
    return 'critical'
  }

  private calculateTrend(metricKey: string, currentValue: number, additionalData?: any): KPITrend {
    // In a real implementation, this would compare with historical data
    // For now, use mock trend calculation
    const hash = metricKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const trends: KPITrend[] = ['up', 'down', 'stable']
    return trends[hash % 3]
  }

  private getTimelineFromImpact(impact: number): string {
    if (impact > 10000) return '1-2 weeks'
    if (impact > 5000) return '2-4 weeks' 
    if (impact > 1000) return '1-2 months'
    return '2-3 months'
  }

  private getCategoryTags(category: string): string[] {
    const tagMap: Record<string, string[]> = {
      revenue: ['Six Figure', 'Growth', 'Pricing'],
      clients: ['Retention', 'Acquisition', 'LTV'],
      services: ['Upselling', 'Efficiency', 'Profitability'],
      efficiency: ['Automation', 'Optimization', 'Time Management'],
      growth: ['Scaling', 'Expansion', 'Marketing']
    }
    return tagMap[category] || []
  }

  private calculateOverallHealthScore(kpis: KPIStatusData[]): number {
    if (kpis.length === 0) return 0
    
    const statusScores = {
      excellent: 100,
      good: 80,
      warning: 50,
      critical: 20
    }
    
    const totalScore = kpis.reduce((sum, kpi) => sum + statusScores[kpi.status], 0)
    return Math.round(totalScore / kpis.length)
  }

  private getStatusClasses(status: KPIStatus): string {
    const classMap = {
      excellent: 'text-green-600 bg-green-100 border-green-300',
      good: 'text-blue-600 bg-blue-100 border-blue-300',
      warning: 'text-yellow-600 bg-yellow-100 border-yellow-300',
      critical: 'text-red-600 bg-red-100 border-red-300'
    }
    return classMap[status]
  }

  private getTrendIcon(trend: KPITrend): string {
    const iconMap = {
      up: 'trending-up',
      down: 'trending-down',
      stable: 'minus'
    }
    return iconMap[trend]
  }
}

/**
 * Singleton instance for global use
 */
export const analyticsIntegration = new AnalyticsIntegration()

/**
 * React hook for analytics integration
 */
export function useAnalyticsIntegration() {
  const enhanceMetric = (metricKey: string, currentValue: number, additionalData?: any) => {
    return analyticsIntegration.enhanceMetric(metricKey, currentValue, additionalData)
  }

  const enhanceMultipleMetrics = (metrics: Record<string, number>, additionalData?: any) => {
    return analyticsIntegration.enhanceMultipleMetrics(metrics, additionalData)
  }

  const generateInsights = (metrics: Record<string, number>, additionalData?: any) => {
    return analyticsIntegration.generateInsights(metrics, additionalData)
  }

  const createDashboardSummary = (metrics: Record<string, number>, additionalData?: any) => {
    return analyticsIntegration.createDashboardSummary(metrics, additionalData)
  }

  const getMetricEnhancementProps = (metricKey: string, currentValue: number, additionalData?: any) => {
    return analyticsIntegration.getMetricEnhancementProps(metricKey, currentValue, additionalData)
  }

  return {
    enhanceMetric,
    enhanceMultipleMetrics,
    generateInsights,
    createDashboardSummary,
    getMetricEnhancementProps
  }
}

/**
 * Utility functions for component integration
 */
export const AnalyticsIntegrationUtils = {
  /**
   * Wrap existing metric component with KPI enhancement
   */
  wrapWithKPI: (originalValue: number, metricKey: string, additionalData?: any) => {
    const enhancement = analyticsIntegration.getMetricEnhancementProps(metricKey, originalValue, additionalData)
    return enhancement
  },

  /**
   * Get dashboard health summary for header/summary components
   */
  getDashboardHealth: (metrics: Record<string, number>) => {
    const kpis = analyticsIntegration.enhanceMultipleMetrics(metrics)
    const healthScore = analyticsIntegration.calculateOverallHealthScore(kpis)
    
    return {
      score: healthScore,
      status: healthScore >= 80 ? 'excellent' : 
              healthScore >= 60 ? 'good' : 
              healthScore >= 40 ? 'warning' : 'critical',
      criticalCount: kpis.filter(kpi => kpi.status === 'critical').length,
      excellentCount: kpis.filter(kpi => kpi.status === 'excellent').length
    }
  },

  /**
   * Format metric value with KPI intelligence
   */
  formatMetricWithKPI: (value: number, metricKey: string, additionalData?: any) => {
    const kpiData = analyticsIntegration.enhanceMetric(metricKey, value, additionalData)
    if (!kpiData) return value.toLocaleString()
    
    return kpiData.formatValue ? kpiData.formatValue(value) : `${value.toLocaleString()}${kpiData.unit || ''}`
  }
}

export default analyticsIntegration
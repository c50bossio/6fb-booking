/**
 * Executive Dashboard - Enterprise KPI Visualization
 * Professional dashboard for barbershop owners and managers
 * Built for Six Figure Barber methodology with enterprise-grade analytics
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  dashboard, 
  professionalTypography, 
  enterpriseAnimations, 
  componentSpacing 
} from '@/lib/design-tokens'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star,
  Zap,
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'

interface KPIMetric {
  id: string
  title: string
  value: string | number
  previousValue?: string | number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  trend: 'up' | 'down' | 'stable'
  icon: React.ReactNode
  color: string
  bgColor: string
  format: 'currency' | 'percentage' | 'number' | 'time'
  target?: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  description: string
}

interface ExecutiveDashboardProps {
  className?: string
  timeRange?: '7d' | '30d' | '90d' | '1y'
  showTargets?: boolean
  realTimeUpdates?: boolean
  customMetrics?: KPIMetric[]
}

export function ExecutiveDashboard({
  className = '',
  timeRange = '30d',
  showTargets = true,
  realTimeUpdates = false,
  customMetrics
}: ExecutiveDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Executive KPI Metrics
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>(customMetrics || [
    {
      id: 'monthly-revenue',
      title: 'Monthly Revenue',
      value: 18750,
      previousValue: 16200,
      change: 15.7,
      changeType: 'increase',
      trend: 'up',
      icon: <DollarSign className="w-6 h-6" />,
      color: dashboard.analytics.revenue,
      bgColor: '#f0fdf4',
      format: 'currency',
      target: 20000,
      status: 'good',
      description: 'Total revenue generated this month from all services'
    },
    {
      id: 'client-retention',
      title: 'Client Retention',
      value: 87.4,
      previousValue: 82.1,
      change: 5.3,
      changeType: 'increase',
      trend: 'up',
      icon: <Users className="w-6 h-6" />,
      color: dashboard.analytics.clients,
      bgColor: '#eff6ff',
      format: 'percentage',
      target: 90,
      status: 'good',
      description: 'Percentage of clients who return within 6 weeks'
    },
    {
      id: 'booking-conversion',
      title: 'Booking Conversion',
      value: 73.2,
      previousValue: 68.9,
      change: 4.3,
      changeType: 'increase',
      trend: 'up',
      icon: <Target className="w-6 h-6" />,
      color: dashboard.analytics.conversion,
      bgColor: '#fdf4ff',
      format: 'percentage',
      target: 80,
      status: 'good',
      description: 'Percentage of inquiries that become bookings'
    },
    {
      id: 'average-service-value',
      title: 'Avg. Service Value',
      value: 67.50,
      previousValue: 62.25,
      change: 8.4,
      changeType: 'increase',
      trend: 'up',
      icon: <BarChart3 className="w-6 h-6" />,
      color: dashboard.analytics.bookings,
      bgColor: '#fffbeb',
      format: 'currency',
      target: 75,
      status: 'good',
      description: 'Average revenue per service appointment'
    },
    {
      id: 'utilization-rate',
      title: 'Chair Utilization',
      value: 78.5,
      previousValue: 74.2,
      change: 4.3,
      changeType: 'increase',
      trend: 'up',
      icon: <Clock className="w-6 h-6" />,
      color: dashboard.analytics.growth,
      bgColor: '#f0fdf4',
      format: 'percentage',
      target: 85,
      status: 'good',
      description: 'Percentage of available time slots that are booked'
    },
    {
      id: 'customer-satisfaction',
      title: 'Customer Satisfaction',
      value: 4.7,
      previousValue: 4.5,
      change: 4.4,
      changeType: 'increase',
      trend: 'up',
      icon: <Star className="w-6 h-6" />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      format: 'number',
      target: 4.8,
      status: 'excellent',
      description: 'Average rating from customer reviews (out of 5.0)'
    }
  ])

  useEffect(() => {
    if (realTimeUpdates) {
      const interval = setInterval(() => {
        setLastUpdated(new Date())
        // Simulate real-time updates
        setKpiMetrics(prev => prev.map(metric => ({
          ...metric,
          value: typeof metric.value === 'number' ? 
            metric.value + (Math.random() - 0.5) * 2 : 
            metric.value
        })))
      }, 30000) // Update every 30 seconds

      return () => clearInterval(interval)
    }
  }, [realTimeUpdates])

  const refreshData = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setIsLoading(false)
  }

  const formatValue = (value: string | number, format: string) => {
    if (typeof value === 'string') return value

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
        return value.toFixed(1)
      case 'time':
        return `${value}h`
      default:
        return value.toString()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'good':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getTargetProgress = (current: number, target?: number) => {
    if (!target) return null
    const progress = (current / target) * 100
    return Math.min(progress, 100)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="space-y-2">
          <h1 
            style={{ 
              fontSize: professionalTypography.executive.title[0],
              lineHeight: professionalTypography.executive.title[1].lineHeight,
              fontWeight: professionalTypography.executive.title[1].fontWeight,
            }}
            className="text-gray-900 dark:text-white"
          >
            Executive Dashboard
          </h1>
          <p 
            style={{
              fontSize: professionalTypography.executive.caption[0],
              lineHeight: professionalTypography.executive.caption[1].lineHeight,
            }}
            className="text-gray-600 dark:text-gray-300"
          >
            Six Figure Barber performance metrics and business intelligence
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <Button
                key={range}
                variant={selectedTimeRange === range ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setSelectedTimeRange(range as any)}
              >
                {range}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" className="h-9">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>

          <Button variant="outline" size="sm" className="h-9">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-9"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          {realTimeUpdates && (
            <Badge variant="success" className="text-xs">
              Live
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4" />
          <span>Viewing {selectedTimeRange} period</span>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {kpiMetrics.map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: parseFloat(enterpriseAnimations.duration.normal) / 1000,
                delay: index * 0.1 
              }}
              whileHover={{ y: -4 }}
            >
              <Card 
                className="h-full transition-all duration-200 hover:shadow-lg"
                style={{ backgroundColor: metric.bgColor }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: metric.color, color: 'white' }}
                    >
                      {metric.icon}
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(metric.status)}
                      <div 
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          metric.changeType === 'increase' 
                            ? 'bg-green-100 text-green-700' 
                            : metric.changeType === 'decrease'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {metric.changeType === 'increase' ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : metric.changeType === 'decrease' ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : null}
                        <span>{Math.abs(metric.change).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {metric.title}
                    </CardTitle>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatValue(metric.value, metric.format)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {metric.description}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Target Progress */}
                  {showTargets && metric.target && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Target: {formatValue(metric.target, metric.format)}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getTargetProgress(metric.value as number, metric.target)?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${getTargetProgress(metric.value as number, metric.target)}%`,
                            backgroundColor: metric.color,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Previous Period Comparison */}
                  {metric.previousValue && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Previous period
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {formatValue(metric.previousValue, metric.format)}
                      </span>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-7 flex-1"
                      style={{ color: metric.color }}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-7 flex-1"
                      style={{ color: metric.color }}
                    >
                      Analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* AI Insights Section */}
      <Card className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border-primary-200">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                AI-Powered Insights
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Intelligent recommendations from your AI agents
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="success" className="text-xs">
                  Revenue Opportunity
                </Badge>
                <span className="text-xs text-gray-500">High Priority</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Increase premium service pricing by 12% to reach $20K monthly target
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="info" className="text-xs">
                  Operational Insight
                </Badge>
                <span className="text-xs text-gray-500">Medium Priority</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Add 2 weekend slots to boost utilization to 85% target
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="warning" className="text-xs">
                  Growth Action
                </Badge>
                <span className="text-xs text-gray-500">Low Priority</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Client referral program could increase retention to 90%+
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button className="bg-gradient-to-r from-primary-500 to-purple-600 text-white">
              Talk to AI Coach for Detailed Strategy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExecutiveDashboard
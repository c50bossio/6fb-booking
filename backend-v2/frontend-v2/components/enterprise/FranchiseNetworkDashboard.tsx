'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { FranchiseHierarchyBreadcrumb, FranchiseHierarchy } from '@/components/navigation/FranchiseHierarchySelector'
import type { 
  FranchiseNetwork, 
  FranchiseRegion, 
  FranchiseGroup, 
  FranchiseLocation 
} from '@/components/navigation/FranchiseHierarchySelector'

// Enhanced icons for franchise dashboard
const GlobalIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const NetworkIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
)

const ComplianceIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
)

const GrowthIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const BuildingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const DollarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

// Franchise dashboard data interfaces
interface FranchiseNetworkSummary {
  network_id: number
  total_regions: number
  total_groups: number
  total_locations: number
  network_revenue_ytd: number
  target_vs_actual_locations: {
    target: number
    actual: number
    percentage: number
  }
  compliance_status: {
    overall_score: number
    critical_issues: number
    pending_reviews: number
  }
  growth_metrics: {
    revenue_growth: number
    location_growth: number
    market_penetration: number
  }
}

interface RegionalPerformance {
  region_id: number
  name: string
  code: string
  performance_score: number
  revenue: number
  locations_count: number
  compliance_score: number
  growth_rate: number
  alerts_count: number
}

interface FranchiseAlert {
  id: string
  type: 'compliance' | 'performance' | 'operational' | 'financial'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  entity_type: 'network' | 'region' | 'group' | 'location'
  entity_id: number
  entity_name: string
  created_at: string
  requires_action: boolean
}

interface FranchiseNetworkDashboardData {
  network_summary: FranchiseNetworkSummary
  regional_performance: RegionalPerformance[]
  alerts: FranchiseAlert[]
  real_time_metrics: {
    active_bookings: number
    staff_online: number
    revenue_today: number
    customer_satisfaction: number
  }
  forecasts?: {
    revenue_forecast_6m: number[]
    location_expansion_timeline: { date: string; count: number }[]
    market_opportunities: { region: string; potential: number }[]
  }
}

interface FranchiseNetworkDashboardProps {
  currentSelection: FranchiseHierarchy
  onSelectionChange: (selection: FranchiseHierarchy) => void
  networks: FranchiseNetwork[]
  regions: FranchiseRegion[]
  groups: FranchiseGroup[]
  locations: FranchiseLocation[]
  enableRealTime?: boolean
  enableForecasts?: boolean
}

export default function FranchiseNetworkDashboard({
  currentSelection,
  onSelectionChange,
  networks,
  regions,
  groups,
  locations,
  enableRealTime = true,
  enableForecasts = false
}: FranchiseNetworkDashboardProps) {
  const [dashboardData, setDashboardData] = useState<FranchiseNetworkDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30d')
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds

  // Fetch franchise network dashboard data
  const fetchDashboardData = async () => {
    if (!currentSelection.network) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      const response = await fetch(`/api/v2/franchise/networks/${currentSelection.network.id}/dashboard?` + new URLSearchParams({
        date_range_days: dateRange.replace('d', '').replace('y', '365'),
        include_forecasts: enableForecasts.toString()
      }), {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      console.error('Failed to load franchise network dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch and periodic updates
  useEffect(() => {
    fetchDashboardData()
    
    if (enableRealTime && refreshInterval > 0) {
      const interval = setInterval(fetchDashboardData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [currentSelection.network, dateRange, enableRealTime, refreshInterval])

  // WebSocket for real-time updates
  useEffect(() => {
    if (!enableRealTime || !currentSelection.network) return

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/franchise/network/${currentSelection.network.id}/dashboard`
    )

    ws.onopen = () => {
      console.log('🔗 Franchise network dashboard WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'dashboard_update') {
          setDashboardData(prev => ({
            ...prev!,
            ...data.payload
          }))
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      console.log('🔌 Franchise network dashboard WebSocket disconnected')
    }

    return () => {
      ws.close()
    }
  }, [enableRealTime, currentSelection.network])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number): string => {
    return `${Math.round(value)}%`
  }

  const getSeverityColor = (severity: FranchiseAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
    }
  }

  if (loading) {
    return <PageLoading />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchDashboardData} />
  }

  if (!currentSelection.network) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-16">
            <GlobalIcon />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Select a Franchise Network
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Choose a franchise network to view its comprehensive dashboard
            </p>
            <FranchiseHierarchyBreadcrumb
              networks={networks}
              regions={regions}
              groups={groups}
              locations={locations}
              currentSelection={currentSelection}
              onSelectionChange={onSelectionChange}
              enableRealTime={enableRealTime}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return <ErrorDisplay error="No dashboard data available" onRetry={fetchDashboardData} />
  }

  const { network_summary, regional_performance, alerts, real_time_metrics } = dashboardData

  // Calculate trend indicators
  const locationGrowthPositive = network_summary.growth_metrics.location_growth > 0
  const revenueGrowthPositive = network_summary.growth_metrics.revenue_growth > 0
  const complianceGood = network_summary.compliance_status.overall_score >= 85

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Hierarchy Navigation */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">
                Franchise Network Dashboard
              </h1>
              <p className="text-ios-body text-ios-gray-600 dark:text-zinc-300 mt-2">
                {currentSelection.network.name} • {currentSelection.network.brand}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={dateRange}
                onChange={(value) => setDateRange(value as string)}
                className="w-full sm:w-auto"
                options={[
                  { value: "7d", label: "Last 7 days" },
                  { value: "30d", label: "Last 30 days" },
                  { value: "90d", label: "Last 90 days" },
                  { value: "1y", label: "Last year" }
                ]}
              />
              
              <Button
                onClick={fetchDashboardData}
                variant="secondary"
                leftIcon={<NetworkIcon />}
              >
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Hierarchy Navigation */}
          <div className="mt-6 p-4 bg-white dark:bg-zinc-800 rounded-ios-xl shadow-sm border border-gray-200 dark:border-zinc-700">
            <FranchiseHierarchyBreadcrumb
              networks={networks}
              regions={regions}
              groups={groups}
              locations={locations}
              currentSelection={currentSelection}
              onSelectionChange={onSelectionChange}
              enableRealTime={enableRealTime}
            />
          </div>
        </div>

        {/* Critical Alerts */}
        {alerts.filter(alert => alert.severity === 'critical').length > 0 && (
          <div className="mb-6 space-y-3">
            {alerts.filter(alert => alert.severity === 'critical').map((alert) => (
              <Card
                key={alert.id}
                variant="default"
                className={`border-l-4 ${getSeverityColor(alert.severity)}`}
              >
                <CardContent className="flex items-center space-x-3 py-3">
                  <AlertIcon />
                  <div className="flex-1">
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {alert.entity_name} • {new Date(alert.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {alert.requires_action && (
                    <Button size="sm" variant="primary">
                      Take Action
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Network Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" animated>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-ios-lg">
                  <DollarIcon />
                </div>
                {revenueGrowthPositive ? (
                  <span className="text-success-600 dark:text-success-400 text-sm font-medium flex items-center">
                    <GrowthIcon />
                    {formatPercentage(network_summary.growth_metrics.revenue_growth)}
                  </span>
                ) : (
                  <span className="text-error-600 dark:text-error-400 text-sm font-medium flex items-center">
                    {formatPercentage(Math.abs(network_summary.growth_metrics.revenue_growth))}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {formatCurrency(network_summary.network_revenue_ytd)}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Network Revenue YTD
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={100}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-accent-100 dark:bg-accent-900 rounded-ios-lg">
                  <BuildingIcon />
                </div>
                <span className="text-ios-caption text-ios-gray-600 dark:text-zinc-400">
                  {formatPercentage(network_summary.target_vs_actual_locations.percentage)} of target
                </span>
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {network_summary.total_locations}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Total Locations • Target: {network_summary.target_vs_actual_locations.target}
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={200}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-success-100 dark:bg-success-900 rounded-ios-lg">
                  <NetworkIcon />
                </div>
                <span className="text-ios-caption text-ios-gray-600 dark:text-zinc-400">
                  {network_summary.total_groups} groups
                </span>
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {network_summary.total_regions}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Active Regions
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-warning-100 dark:bg-warning-900 rounded-ios-lg">
                  <ComplianceIcon />
                </div>
                <span className={`text-sm font-medium ${complianceGood ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'}`}>
                  {formatPercentage(network_summary.compliance_status.overall_score)}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {network_summary.compliance_status.critical_issues === 0 ? 'Compliant' : `${network_summary.compliance_status.critical_issues} Issues`}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Compliance Status
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Metrics Bar */}
        {enableRealTime && (
          <Card variant="outlined" className="mb-8">
            <CardContent>
              <div className="flex items-center justify-between">
                <h4 className="text-ios-subheadline font-medium text-gray-600 dark:text-gray-400">
                  Real-time Network Status
                </h4>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {real_time_metrics.active_bookings} active bookings
                    </span>
                  </div>
                  <div className="flex items-center">
                    <UsersIcon />
                    <span className="ml-1 text-gray-600 dark:text-gray-400">
                      {real_time_metrics.staff_online} staff online
                    </span>
                  </div>
                  <div className="flex items-center">
                    <DollarIcon />
                    <span className="ml-1 font-medium">
                      {formatCurrency(real_time_metrics.revenue_today)} today
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {real_time_metrics.customer_satisfaction.toFixed(1)} satisfaction
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Regional Performance Matrix */}
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Regional Performance</CardTitle>
              <Button
                onClick={() => onSelectionChange({ 
                  ...currentSelection, 
                  region: regional_performance[0] ? regions.find(r => r.id === regional_performance[0].region_id) : undefined 
                })}
                variant="ghost"
                size="sm"
                leftIcon={<NetworkIcon />}
              >
                View Regional Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ios-gray-200 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Region
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Performance Score
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Revenue
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Locations
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Compliance
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Growth
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Alerts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {regional_performance.map((region) => (
                    <tr
                      key={region.region_id}
                      className="border-b border-ios-gray-100 dark:border-zinc-800 hover:bg-ios-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      onClick={() => {
                        const regionData = regions.find(r => r.id === region.region_id)
                        if (regionData) {
                          onSelectionChange({
                            ...currentSelection,
                            region: regionData
                          })
                        }
                      }}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-accent-900 dark:text-white">{region.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{region.code}</p>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">
                        <div className="flex items-center justify-end">
                          <div className="w-24 bg-ios-gray-200 dark:bg-zinc-700 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                region.performance_score > 85
                                  ? 'bg-success-500'
                                  : region.performance_score > 70
                                  ? 'bg-warning-500'
                                  : 'bg-error-500'
                              }`}
                              style={{ width: `${region.performance_score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{formatPercentage(region.performance_score)}</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">
                        <p className="font-medium">{formatCurrency(region.revenue)}</p>
                      </td>
                      <td className="text-right py-4 px-4">
                        <p>{region.locations_count}</p>
                      </td>
                      <td className="text-right py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          region.compliance_score >= 90
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                            : region.compliance_score >= 80
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }`}>
                          {formatPercentage(region.compliance_score)}
                        </span>
                      </td>
                      <td className="text-right py-4 px-4">
                        <span
                          className={`inline-flex items-center text-sm font-medium ${
                            region.growth_rate > 0
                              ? 'text-success-600 dark:text-success-400'
                              : 'text-error-600 dark:text-error-400'
                          }`}
                        >
                          {region.growth_rate > 0 ? <GrowthIcon /> : null}
                          <span className="ml-1">{formatPercentage(Math.abs(region.growth_rate))}</span>
                        </span>
                      </td>
                      <td className="text-right py-4 px-4">
                        {region.alerts_count > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                            {region.alerts_count}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Additional Metrics and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Growth Metrics */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Growth Metrics</CardTitle>
              <CardDescription>Network expansion progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Market Penetration</span>
                    <span className="font-medium">{formatPercentage(network_summary.growth_metrics.market_penetration)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${network_summary.growth_metrics.market_penetration}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Location Growth</span>
                    <span className={`font-medium ${locationGrowthPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {locationGrowthPositive ? '+' : ''}{formatPercentage(network_summary.growth_metrics.location_growth)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Revenue Growth</span>
                    <span className={`font-medium ${revenueGrowthPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {revenueGrowthPositive ? '+' : ''}{formatPercentage(network_summary.growth_metrics.revenue_growth)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Status */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Compliance Overview</CardTitle>
              <CardDescription>Regulatory and brand compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent-900 dark:text-white">
                    {formatPercentage(network_summary.compliance_status.overall_score)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overall Score</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Critical Issues</span>
                    <span className={`font-medium ${network_summary.compliance_status.critical_issues === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {network_summary.compliance_status.critical_issues}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending Reviews</span>
                    <span className="font-medium text-yellow-600">
                      {network_summary.compliance_status.pending_reviews}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>System notifications and issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}
                  >
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {alert.entity_name} • {new Date(alert.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <ComplianceIcon />
                    <p className="text-sm mt-2">No alerts</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
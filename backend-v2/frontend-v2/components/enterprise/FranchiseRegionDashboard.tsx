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

// Region-specific icons
const RegionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
)

const MarketIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const CompetitorIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
)

const DemographicsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const GrowthIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const ComplianceIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const DollarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const BuildingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

// Franchise region dashboard data interfaces
interface RegionSummary {
  region_id: number
  total_groups: number
  total_locations: number
  current_vs_target_locations: {
    current: number
    target: number
    percentage: number
  }
  revenue_ytd: number
  revenue_growth: number
  market_penetration: number
  compliance_score: number
  development_timeline: {
    planned_openings: number
    under_construction: number
    in_planning: number
  }
}

interface MarketAnalysis {
  primary_markets: string[]
  demographics: {
    population: number
    median_income: number
    target_demographic_percentage: number
  }
  competition: {
    direct_competitors: number
    market_share_estimate: number
    competitive_advantage_score: number
  }
  market_opportunities: {
    underserved_areas: number
    expansion_potential: number
    recommended_locations: number
  }
}

interface GroupPerformance {
  group_id: number
  name: string
  code: string
  group_type: string
  locations_count: number
  revenue: number
  performance_score: number
  compliance_score: number
  growth_rate: number
  development_stage: 'operational' | 'developing' | 'planning'
  key_metrics: {
    average_revenue_per_location: number
    client_satisfaction: number
    staff_retention: number
  }
}

interface ComplianceTracking {
  overall_score: number
  jurisdiction_compliance: {
    jurisdiction: string
    score: number
    issues_count: number
    last_audit: string
  }[]
  critical_requirements: {
    requirement: string
    status: 'compliant' | 'non_compliant' | 'pending'
    due_date?: string
  }[]
  upcoming_audits: {
    audit_type: string
    scheduled_date: string
    locations_affected: number
  }[]
}

interface RegionDashboardData {
  region_summary: RegionSummary
  market_analysis: MarketAnalysis
  group_performance: GroupPerformance[]
  compliance_tracking: ComplianceTracking
  development_pipeline: {
    pipeline_locations: {
      name: string
      stage: string
      expected_opening: string
      investment: number
    }[]
    quarterly_targets: {
      quarter: string
      target_openings: number
      projected_revenue: number
    }[]
  }
  regional_training: {
    programs_active: number
    completion_rate: number
    next_session: string
  }
}

interface FranchiseRegionDashboardProps {
  currentSelection: FranchiseHierarchy
  onSelectionChange: (selection: FranchiseHierarchy) => void
  networks: FranchiseNetwork[]
  regions: FranchiseRegion[]
  groups: FranchiseGroup[]
  locations: FranchiseLocation[]
  enableRealTime?: boolean
}

export default function FranchiseRegionDashboard({
  currentSelection,
  onSelectionChange,
  networks,
  regions,
  groups,
  locations,
  enableRealTime = true
}: FranchiseRegionDashboardProps) {
  const [dashboardData, setDashboardData] = useState<RegionDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30d')

  // Fetch region dashboard data
  const fetchDashboardData = async () => {
    if (!currentSelection.region) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      const response = await fetch(`/api/v2/franchise/regions/${currentSelection.region.id}/dashboard?` + new URLSearchParams({
        date_range_days: dateRange.replace('d', '').replace('y', '365'),
        include_market_analysis: 'true',
        include_compliance: 'true'
      }), {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch region dashboard data: ${response.statusText}`)
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      console.error('Failed to load franchise region dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [currentSelection.region, dateRange])

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

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 80) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'operational':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
      case 'developing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
      case 'planning':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  if (loading) {
    return <PageLoading />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchDashboardData} />
  }

  if (!currentSelection.region) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-16">
            <RegionIcon />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Select a Region
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Choose a region to view its comprehensive dashboard and market analysis
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
    return <ErrorDisplay error="No region dashboard data available" onRetry={fetchDashboardData} />
  }

  const { region_summary, market_analysis, group_performance, compliance_tracking, development_pipeline, regional_training } = dashboardData

  const revenueGrowthPositive = region_summary.revenue_growth > 0
  const complianceGood = region_summary.compliance_score >= 85
  const marketPenetrationGood = region_summary.market_penetration > 15

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Hierarchy Navigation */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">
                Regional Dashboard
              </h1>
              <p className="text-ios-body text-ios-gray-600 dark:text-zinc-300 mt-2">
                {currentSelection.region.name} • {currentSelection.region.code}
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
                leftIcon={<RegionIcon />}
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

        {/* Regional KPIs */}
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
                    {formatPercentage(region_summary.revenue_growth)}
                  </span>
                ) : (
                  <span className="text-error-600 dark:text-error-400 text-sm font-medium flex items-center">
                    {formatPercentage(Math.abs(region_summary.revenue_growth))}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {formatCurrency(region_summary.revenue_ytd)}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Regional Revenue YTD
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
                  {formatPercentage(region_summary.current_vs_target_locations.percentage)} of target
                </span>
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {region_summary.total_locations}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Active Locations • Target: {region_summary.current_vs_target_locations.target}
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={200}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-success-100 dark:bg-success-900 rounded-ios-lg">
                  <MarketIcon />
                </div>
                <span className={`text-sm font-medium ${marketPenetrationGood ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'}`}>
                  {formatPercentage(region_summary.market_penetration)}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {region_summary.total_groups}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Operational Groups
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-warning-100 dark:bg-warning-900 rounded-ios-lg">
                  <ComplianceIcon />
                </div>
                <span className={`text-sm font-medium ${getComplianceColor(region_summary.compliance_score)}`}>
                  {formatPercentage(region_summary.compliance_score)}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {compliance_tracking.critical_requirements.filter(r => r.status === 'compliant').length}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Compliance Items Met
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Market Analysis and Development Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Market Analysis */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Market Analysis</CardTitle>
              <CardDescription>Regional market insights and opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Demographics */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                    <DemographicsIcon />
                    <span className="ml-2">Demographics</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-accent-900 dark:text-white">
                        {formatNumber(market_analysis.demographics.population)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Population</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-accent-900 dark:text-white">
                        {formatCurrency(market_analysis.demographics.median_income)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Median Income</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm">
                      <span className="font-medium">{formatPercentage(market_analysis.demographics.target_demographic_percentage)}</span>
                      <span className="text-gray-600 dark:text-gray-400 ml-1">target demographic</span>
                    </p>
                  </div>
                </div>

                {/* Competition */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                    <CompetitorIcon />
                    <span className="ml-2">Competition</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-accent-900 dark:text-white">
                        {market_analysis.competition.direct_competitors}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Direct Competitors</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-accent-900 dark:text-white">
                        {formatPercentage(market_analysis.competition.market_share_estimate)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Market Share</p>
                    </div>
                  </div>
                </div>

                {/* Market Opportunities */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                    <TargetIcon />
                    <span className="ml-2">Opportunities</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Underserved Areas</span>
                      <span className="font-medium">{market_analysis.market_opportunities.underserved_areas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Expansion Potential</span>
                      <span className="font-medium">{formatPercentage(market_analysis.market_opportunities.expansion_potential)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Recommended Locations</span>
                      <span className="font-medium text-primary-600">{market_analysis.market_opportunities.recommended_locations}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Development Pipeline */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Development Pipeline</CardTitle>
              <CardDescription>Upcoming locations and expansion timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Development Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent-900 dark:text-white">
                      {region_summary.development_timeline.planned_openings}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Planned</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {region_summary.development_timeline.under_construction}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Building</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {region_summary.development_timeline.in_planning}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Planning</p>
                  </div>
                </div>

                {/* Pipeline Locations */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                    Pipeline Locations
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {development_pipeline.pipeline_locations.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-ios">
                        <div>
                          <p className="font-medium text-sm">{location.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {location.stage} • Opens {new Date(location.expected_opening).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(location.investment)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quarterly Targets */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                    Quarterly Targets
                  </h4>
                  <div className="space-y-2">
                    {development_pipeline.quarterly_targets.map((quarter, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{quarter.quarter}</span>
                        <span className="font-medium">
                          {quarter.target_openings} locations • {formatCurrency(quarter.projected_revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Group Performance Matrix */}
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Group Performance</CardTitle>
              <Button
                onClick={() => {
                  const firstGroup = group_performance[0]
                  if (firstGroup) {
                    const groupData = groups.find(g => g.id === firstGroup.group_id)
                    if (groupData) {
                      onSelectionChange({
                        ...currentSelection,
                        group: groupData
                      })
                    }
                  }
                }}
                variant="ghost"
                size="sm"
                leftIcon={<RegionIcon />}
              >
                View Group Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ios-gray-200 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Group
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Revenue
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Locations
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Performance
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Compliance
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Growth
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Stage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group_performance.map((group) => (
                    <tr
                      key={group.group_id}
                      className="border-b border-ios-gray-100 dark:border-zinc-800 hover:bg-ios-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      onClick={() => {
                        const groupData = groups.find(g => g.id === group.group_id)
                        if (groupData) {
                          onSelectionChange({
                            ...currentSelection,
                            group: groupData
                          })
                        }
                      }}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-accent-900 dark:text-white">{group.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{group.code} • {group.group_type}</p>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">
                        <p className="font-medium">{formatCurrency(group.revenue)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(group.key_metrics.average_revenue_per_location)}/location
                        </p>
                      </td>
                      <td className="text-right py-4 px-4">
                        <p className="font-medium">{group.locations_count}</p>
                      </td>
                      <td className="text-right py-4 px-4">
                        <div className="flex items-center justify-end">
                          <div className="w-16 bg-ios-gray-200 dark:bg-zinc-700 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                group.performance_score > 85
                                  ? 'bg-success-500'
                                  : group.performance_score > 70
                                  ? 'bg-warning-500'
                                  : 'bg-error-500'
                              }`}
                              style={{ width: `${group.performance_score}%` }}
                            />
                          </div>
                          <span className="text-sm">{formatPercentage(group.performance_score)}</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">
                        <span className={`text-sm font-medium ${getComplianceColor(group.compliance_score)}`}>
                          {formatPercentage(group.compliance_score)}
                        </span>
                      </td>
                      <td className="text-right py-4 px-4">
                        <span
                          className={`inline-flex items-center text-sm font-medium ${
                            group.growth_rate > 0
                              ? 'text-success-600 dark:text-success-400'
                              : 'text-error-600 dark:text-error-400'
                          }`}
                        >
                          {group.growth_rate > 0 ? <GrowthIcon /> : null}
                          <span className="ml-1">{group.growth_rate > 0 ? '+' : ''}{formatPercentage(Math.abs(group.growth_rate))}</span>
                        </span>
                      </td>
                      <td className="text-right py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageColor(group.development_stage)}`}>
                          {group.development_stage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Compliance and Training */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compliance Tracking */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Compliance Tracking</CardTitle>
              <CardDescription>Regulatory compliance across jurisdictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent-900 dark:text-white">
                    {formatPercentage(compliance_tracking.overall_score)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overall Compliance</p>
                </div>

                {/* Jurisdiction Compliance */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                    By Jurisdiction
                  </h4>
                  <div className="space-y-3">
                    {compliance_tracking.jurisdiction_compliance.map((jurisdiction, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{jurisdiction.jurisdiction}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {jurisdiction.issues_count} issues • Last audit: {new Date(jurisdiction.last_audit).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-sm font-medium ${getComplianceColor(jurisdiction.score)}`}>
                          {formatPercentage(jurisdiction.score)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Audits */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                    Upcoming Audits
                  </h4>
                  <div className="space-y-2">
                    {compliance_tracking.upcoming_audits.map((audit, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{audit.audit_type}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {new Date(audit.scheduled_date).toLocaleDateString()} • {audit.locations_affected} locations
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regional Training */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Regional Training</CardTitle>
              <CardDescription>Training programs and staff development</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Training Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent-900 dark:text-white">
                      {regional_training.programs_active}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Active Programs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success-600">
                      {formatPercentage(regional_training.completion_rate)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Completion Rate</p>
                  </div>
                </div>

                {/* Next Session */}
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-ios-lg">
                  <div className="flex items-center">
                    <CalendarIcon />
                    <div className="ml-3">
                      <p className="font-medium text-sm">Next Training Session</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(regional_training.next_session).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Training Categories */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                    Training Categories
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Brand Standards</span>
                      <span className="font-medium text-success-600">95% complete</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Safety & Compliance</span>
                      <span className="font-medium text-success-600">88% complete</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Customer Service</span>
                      <span className="font-medium text-warning-600">72% complete</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Management Skills</span>
                      <span className="font-medium text-warning-600">65% complete</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
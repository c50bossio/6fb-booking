'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getDashboardAnalytics, getEnterpriseAnalytics, type User } from '@/lib/api'
import { AnalyticsLayout } from '@/components/analytics/AnalyticsLayout'
import { BarberAnalyticsView } from '@/components/analytics/views/BarberAnalyticsView'
import { ManagerAnalyticsView } from '@/components/analytics/views/ManagerAnalyticsView'
import { EnterpriseAnalyticsView } from '@/components/analytics/views/EnterpriseAnalyticsView'
import { DateRangeSelector, DateRangePreset } from '@/components/analytics/shared/DateRangeSelector'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'

export default function UnifiedAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Date range state
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Initialize date range
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [])

  // Load user and analytics data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // Get user profile
        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        setUser(userData)

        // Load analytics based on user role
        let data = null
        
        if (userData.role === 'super_admin' || userData.role === 'enterprise_owner') {
          // Enterprise view
          const enterpriseData = await getEnterpriseAnalytics(startDate, endDate)
          data = {
            type: 'enterprise',
            summary: {
              totalRevenue: enterpriseData.metrics.total_revenue,
              revenueGrowth: enterpriseData.metrics.revenue_growth,
              totalLocations: enterpriseData.locations.length,
              totalBarbers: enterpriseData.metrics.total_clients, // This would be total barbers in real API
              totalClients: enterpriseData.metrics.total_clients,
              averageUtilization: enterpriseData.metrics.chair_utilization
            },
            locations: enterpriseData.locations.map(loc => ({
              id: loc.id,
              name: loc.name,
              revenue: loc.revenue,
              growth: loc.growth_percentage,
              appointments: loc.appointments,
              utilization: loc.chair_occupancy,
              rating: loc.average_rating,
              barbers: 5 // Would come from API
            })),
            topPerformers: enterpriseData.top_performers.map(p => ({
              id: p.id,
              name: p.name,
              location: 'Main St', // Would come from API
              revenue: p.revenue,
              rating: p.rating
            }))
          }
        } else if (userData.role === 'admin' || userData.role === 'location_manager') {
          // Manager view - get analytics for their location
          const analytics = await getDashboardAnalytics(userData.id)
          data = {
            type: 'manager',
            location: {
              name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Main Location',
              revenue: analytics.revenue_summary.total_revenue,
              revenueGrowth: analytics.revenue_summary.revenue_growth,
              appointments: analytics.appointment_summary.total_appointments,
              utilization: 85 // Would calculate from real data
            },
            team: {
              totalBarbers: 5,
              activeBarbers: 4,
              averagePerformance: 92,
              topPerformer: 'John Smith'
            },
            clients: {
              total: analytics.client_summary.total_clients,
              new: analytics.client_summary.new_clients,
              returning: analytics.client_summary.returning_clients,
              satisfaction: 95
            },
            alerts: []
          }
        } else {
          // Barber view
          const analytics = await getDashboardAnalytics(userData.id)
          data = {
            type: 'barber',
            revenue: {
              total: analytics.revenue_summary.total_revenue,
              thisMonth: analytics.revenue_summary.total_revenue,
              lastMonth: analytics.revenue_summary.total_revenue * 0.9,
              average: analytics.revenue_summary.average_ticket
            },
            appointments: {
              total: analytics.appointment_summary.total_appointments,
              completed: Math.round(analytics.appointment_summary.total_appointments * (1 - analytics.appointment_summary.cancellation_rate / 100 - analytics.appointment_summary.no_show_rate / 100)),
              cancelled: Math.round(analytics.appointment_summary.total_appointments * analytics.appointment_summary.cancellation_rate / 100),
              noShow: Math.round(analytics.appointment_summary.total_appointments * analytics.appointment_summary.no_show_rate / 100)
            },
            clients: {
              total: analytics.client_summary.total_clients,
              returning: analytics.client_summary.returning_clients,
              new: analytics.client_summary.new_clients,
              retentionRate: analytics.client_summary.retention_rate
            },
            performance: {
              averageRating: 4.8, // Would come from reviews API
              completionRate: 100 - analytics.appointment_summary.cancellation_rate - analytics.appointment_summary.no_show_rate,
              punctualityRate: 95, // Would come from API
              rebookingRate: 80 // Would come from API
            }
          }
        }

        setAnalyticsData(data)
      } catch (err) {
        console.error('Failed to load analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    if (startDate && endDate) {
      loadData()
    }
  }, [startDate, endDate, router])

  const handleExport = async () => {
    // Export functionality
    console.log('Exporting analytics data...')
  }

  if (loading) {
    return <PageLoading message="Loading analytics..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user || !analyticsData) {
    return null
  }

  const renderAnalyticsView = () => {
    switch (analyticsData.type) {
      case 'enterprise':
        return <EnterpriseAnalyticsView data={analyticsData} />
      case 'manager':
        return <ManagerAnalyticsView data={analyticsData} />
      case 'barber':
        return <BarberAnalyticsView data={analyticsData} />
      default:
        return <div>Unknown analytics view type</div>
    }
  }

  return (
    <AnalyticsLayout
      title="Analytics Overview"
      description="Comprehensive insights into your business performance"
      userRole={user.role}
      showNavigation={true}
      navigationVariant="tabs"
      headerActions={
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          preset={datePreset}
          onPresetChange={setDatePreset}
        />
      }
    >
      {renderAnalyticsView()}
    </AnalyticsLayout>
  )
}
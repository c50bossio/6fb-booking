'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { AnalyticsLayout } from '@/components/analytics/AnalyticsLayout'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import EnhancedAnalyticsDashboard from '@/components/analytics/EnhancedAnalyticsDashboard'
import { DateRangeSelector, DateRangePreset } from '@/components/analytics/shared/DateRangeSelector'

interface EnhancedAnalyticsContentProps {}

function EnhancedAnalyticsContent({}: EnhancedAnalyticsContentProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
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

  // Load user data
  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true)
        setError(null)

        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        setUser(userData)
      } catch (err) {
        console.error('Failed to load user:', err)
        setError(err instanceof Error ? err.message : 'Failed to load user data')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  // Convert date range to timeRange string for compatibility
  const getTimeRange = (): string => {
    switch (datePreset) {
      case '7d': return '7d'
      case '30d': return '30d'
      case '90d': return '90d'
      case '365d': return '365d'
      case 'custom': return 'custom'
      default: return '30d'
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Enhanced Analytics Dashboard</h1>
          <p className="text-gray-600">Loading advanced business insights...</p>
        </div>
        <PageLoading message="Loading Enhanced Analytics Dashboard..." />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <ErrorDisplay 
          error={error || 'User data not available'}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <AnalyticsLayout
      title="Enhanced Analytics Dashboard"
      description="Advanced Six Figure Barber analytics with real-time insights and AI-powered recommendations"
      userRole={user.role}
      showNavigation={true}
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
      <EnhancedAnalyticsDashboard 
        userId={user.id} 
        timeRange={getTimeRange()}
      />
    </AnalyticsLayout>
  )
}

export default function EnhancedAnalyticsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading Enhanced Analytics..." />}>
      <EnhancedAnalyticsContent />
    </Suspense>
  )
}
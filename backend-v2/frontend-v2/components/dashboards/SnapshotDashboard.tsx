'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import SixFigureAnalyticsDashboard from '@/components/analytics/SixFigureAnalyticsDashboard'
import { CalendarIcon, BanknotesIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

/**
 * Interface for KPI statistics displayed in the snapshot dashboard
 */
export interface TodayStats {
  appointments: number
  revenue: number
  newClients: number
  completionRate: number
}

/**
 * Interface for user information required by the snapshot dashboard
 */
export interface SnapshotUser {
  id: number
  first_name?: string
  role: string
}

/**
 * Props for the SnapshotDashboard component
 */
export interface SnapshotDashboardProps {
  /** User information for analytics and personalization */
  user: SnapshotUser
  /** Today's key performance indicators */
  todayStats: TodayStats
  /** Time range for analytics (defaults to '30d') */
  timeRange?: string
}

/**
 * SnapshotDashboard - A clean, reusable dashboard component that displays
 * key performance indicators and Six Figure Barber analytics.
 * 
 * This component provides a snapshot view of today's performance with:
 * - 4 compact KPI cards (Bookings, Revenue, New Clients, Completion Rate)
 * - Six Figure Analytics Dashboard with AI coaching tips
 * - Clickable cards that navigate to detailed analytics views
 * 
 * @param props - The component props
 * @returns JSX element containing the snapshot dashboard
 */
export function SnapshotDashboard({ 
  user, 
  todayStats, 
  timeRange = '30d' 
}: SnapshotDashboardProps) {
  const router = useRouter()

  /**
   * Handle navigation to analytics pages
   * These routes are prepared for future /analytics/* implementation
   */
  const handleNavigateToBookings = () => {
    // Future: router.push('/analytics/bookings')
    router.push('/dashboard')
  }

  const handleNavigateToRevenue = () => {
    // Future: router.push('/analytics/revenue')
    router.push('/barber/earnings')
  }

  const handleNavigateToClients = () => {
    // Future: router.push('/analytics/clients')
    router.push('/clients')
  }

  const handleNavigateToPerformance = () => {
    // Future: router.push('/analytics/performance')
    router.push('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards - Compact metrics overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's Bookings Card */}
        <Card 
          variant="default" 
          padding="sm" 
          className="cursor-pointer hover:scale-[1.02] transition-transform" 
          onClick={handleNavigateToBookings}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-zinc-300">Today's Bookings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayStats.appointments}
              </p>
            </div>
            <CalendarIcon className="w-8 h-8 text-primary-500 opacity-50" />
          </CardContent>
        </Card>

        {/* Today's Revenue Card */}
        <Card 
          variant="default" 
          padding="sm" 
          className="cursor-pointer hover:scale-[1.02] transition-transform" 
          onClick={handleNavigateToRevenue}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-zinc-300">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${todayStats.revenue}
              </p>
            </div>
            <BanknotesIcon className="w-8 h-8 text-green-500 opacity-50" />
          </CardContent>
        </Card>

        {/* New Clients Card */}
        <Card 
          variant="default" 
          padding="sm" 
          className="cursor-pointer hover:scale-[1.02] transition-transform" 
          onClick={handleNavigateToClients}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-zinc-300">New Clients</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayStats.newClients}
              </p>
            </div>
            <UserGroupIcon className="w-8 h-8 text-purple-500 opacity-50" />
          </CardContent>
        </Card>

        {/* Completion Rate Card */}
        <Card 
          variant="default" 
          padding="sm"
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={handleNavigateToPerformance}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-zinc-300">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayStats.completionRate}%
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <div 
                className="w-6 h-6 rounded-full bg-primary-500" 
                style={{ 
                  background: `conic-gradient(#06b6d4 ${todayStats.completionRate * 3.6}deg, #e5e7eb ${todayStats.completionRate * 3.6}deg)` 
                }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Six Figure Barber Analytics Dashboard */}
      <SixFigureAnalyticsDashboard
        userId={user.id}
        timeRange={timeRange}
        userName={user.first_name}
        todayStats={todayStats}
      />
    </div>
  )
}

export default SnapshotDashboard
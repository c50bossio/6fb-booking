'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import SixFigureAnalyticsDashboard from '@/components/analytics/SixFigureAnalyticsDashboard'
import { CalendarIcon, BanknotesIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { MetricExplanations } from '@/lib/metric-explanations'
import { useControlledTooltip } from '@/hooks/useControlledTooltip'

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
  
  // Controlled tooltip hooks for each metric
  const bookingsTooltip = useControlledTooltip()
  const revenueTooltip = useControlledTooltip()
  const clientsTooltip = useControlledTooltip()
  const completionTooltip = useControlledTooltip()

  /**
   * Handle navigation to analytics pages with proper error handling
   */
  const handleNavigateToBookings = () => {
    try {
      router.push('/calendar')
    } catch (error) {
      console.error('Navigation error:', error)
      router.push('/dashboard')
    }
  }

  const handleNavigateToRevenue = () => {
    try {
      // Navigate to analytics page for revenue details
      router.push('/reviews/analytics')
    } catch (error) {
      console.error('Navigation error:', error)
      router.push('/dashboard')
    }
  }

  const handleNavigateToClients = () => {
    try {
      // Navigate to calendar page to view client appointments
      router.push('/calendar')
    } catch (error) {
      console.error('Navigation error:', error)
      router.push('/dashboard')
    }
  }

  const handleNavigateToPerformance = () => {
    try {
      // Navigate to analytics page for performance metrics
      router.push('/reviews/analytics')
    } catch (error) {
      console.error('Navigation error:', error)
      router.push('/dashboard')
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards - Compact metrics overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's Bookings Card */}
        <Card 
          className="cursor-pointer hover:scale-[1.02] transition-transform p-3" 
          onClick={handleNavigateToBookings}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-700 dark:text-zinc-300">Today's Bookings</p>
                <Tooltip open={bookingsTooltip.isOpen} onOpenChange={bookingsTooltip.isOpen ? bookingsTooltip.onClose : bookingsTooltip.onOpen}>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200" 
                      aria-label="Metric explanation"
                      onClick={bookingsTooltip.onToggle}
                      onMouseEnter={bookingsTooltip.onOpen}
                      onMouseLeave={bookingsTooltip.onClose}
                    >
                      <InformationCircleIcon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3 text-sm">
                    <div className="space-y-1">
                      <p className="font-medium">{MetricExplanations.todaysBookings.explanation}</p>
                      {MetricExplanations.todaysBookings.details && (
                        <p className="text-gray-300 text-xs">{MetricExplanations.todaysBookings.details}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayStats.appointments}
              </p>
            </div>
            <CalendarIcon className="w-8 h-8 text-primary-500 opacity-50" />
          </CardContent>
        </Card>

        {/* Today's Revenue Card */}
        <Card 
          className="cursor-pointer hover:scale-[1.02] transition-transform p-3" 
          onClick={handleNavigateToRevenue}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-700 dark:text-zinc-300">Today's Revenue</p>
                <Tooltip open={revenueTooltip.isOpen} onOpenChange={revenueTooltip.isOpen ? revenueTooltip.onClose : revenueTooltip.onOpen}>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200" 
                      aria-label="Metric explanation"
                      onClick={revenueTooltip.onToggle}
                      onMouseEnter={revenueTooltip.onOpen}
                      onMouseLeave={revenueTooltip.onClose}
                    >
                      <InformationCircleIcon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3 text-sm">
                    <div className="space-y-1">
                      <p className="font-medium">{MetricExplanations.todaysRevenue.explanation}</p>
                      {MetricExplanations.todaysRevenue.details && (
                        <p className="text-gray-300 text-xs">{MetricExplanations.todaysRevenue.details}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${todayStats.revenue.toFixed(2)}
              </p>
            </div>
            <BanknotesIcon className="w-8 h-8 text-green-500 opacity-50" />
          </CardContent>
        </Card>

        {/* New Clients Card */}
        <Card 
          className="cursor-pointer hover:scale-[1.02] transition-transform p-3" 
          onClick={handleNavigateToClients}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-700 dark:text-zinc-300">New Clients</p>
                <Tooltip open={clientsTooltip.isOpen} onOpenChange={clientsTooltip.isOpen ? clientsTooltip.onClose : clientsTooltip.onOpen}>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200" 
                      aria-label="Metric explanation"
                      onClick={clientsTooltip.onToggle}
                      onMouseEnter={clientsTooltip.onOpen}
                      onMouseLeave={clientsTooltip.onClose}
                    >
                      <InformationCircleIcon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3 text-sm">
                    <div className="space-y-1">
                      <p className="font-medium">{MetricExplanations.newClients.explanation}</p>
                      {MetricExplanations.newClients.details && (
                        <p className="text-gray-300 text-xs">{MetricExplanations.newClients.details}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayStats.newClients}
              </p>
            </div>
            <UserGroupIcon className="w-8 h-8 text-purple-500 opacity-50" />
          </CardContent>
        </Card>

        {/* Completion Rate Card */}
        <Card 
          className="cursor-pointer hover:scale-[1.02] transition-transform p-3"
          onClick={handleNavigateToPerformance}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-700 dark:text-zinc-300">Completion Rate</p>
                <Tooltip open={completionTooltip.isOpen} onOpenChange={completionTooltip.isOpen ? completionTooltip.onClose : completionTooltip.onOpen}>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200" 
                      aria-label="Metric explanation"
                      onClick={completionTooltip.onToggle}
                      onMouseEnter={completionTooltip.onOpen}
                      onMouseLeave={completionTooltip.onClose}
                    >
                      <InformationCircleIcon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3 text-sm">
                    <div className="space-y-1">
                      <p className="font-medium">Percentage of bookings that are completed successfully</p>
                      <p className="text-gray-300 text-xs">Measures reliability and shows no-show rates</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
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
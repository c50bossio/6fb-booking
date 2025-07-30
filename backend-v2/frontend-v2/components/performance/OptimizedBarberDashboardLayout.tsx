'use client'

import React, { useState, memo, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { QuickActions } from '@/components/QuickActions'
import SnapshotDashboard from '@/components/dashboards/SnapshotDashboard'
import PriorityInsightWidget from '@/components/smart-insights/PriorityInsightWidget'
import InsightActionCenter from '@/components/smart-insights/InsightActionCenter'
import { 
  ClockIcon, 
  TrophyIcon, 
  StarIcon, 
  ArrowTrendingUpIcon,
  CalendarIcon,
  UsersIcon,
  FireIcon,
  CrownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useMemoizedCallback, useMemoizedValue } from '@/lib/memo-utils'
import '../styles/six-figure-barber-theme.css'

interface BarberDashboardLayoutProps {
  user: {
    id: number
    first_name?: string
    role: string
  }
  todayStats: {
    appointments: number
    revenue: number
    newClients: number
    completionRate: number
  }
  upcomingAppointments: any[]
}

// Memoized sub-components to prevent unnecessary re-renders
const PerformanceMetricsGrid = memo(({ metrics }: { metrics: any }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="text-center p-3 rounded-lg" style={{ background: 'var(--sfb-grey-light)' }}>
      <CalendarIcon className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--sfb-teal)' }} />
      <div className="text-lg font-bold sfb-heading-secondary">
        {(metrics.utilizationRate * 100).toFixed(0)}%
      </div>
      <div className="text-xs sfb-text-premium">Utilization</div>
    </div>
    
    <div className="text-center p-3 rounded-lg" style={{ background: 'var(--sfb-grey-light)' }}>
      <ArrowTrendingUpIcon className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--sfb-teal)' }} />
      <div className="text-lg font-bold sfb-heading-secondary">
        {metrics.avgLeadTimeDays.toFixed(1)}
      </div>
      <div className="text-xs sfb-text-premium">Lead Time (days)</div>
    </div>
    
    <div className="text-center p-3 rounded-lg" style={{ background: 'var(--sfb-grey-light)' }}>
      <UsersIcon className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--sfb-teal)' }} />
      <div className="text-lg font-bold sfb-heading-secondary">
        {metrics.demandVelocity.toFixed(1)}
      </div>
      <div className="text-xs sfb-text-premium">Demand/Week</div>
    </div>
    
    <div className="text-center p-3 rounded-lg" style={{ background: 'var(--sfb-grey-light)' }}>
      <StarIcon className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--sfb-teal)' }} />
      <div className="text-lg font-bold sfb-heading-secondary">
        {metrics.clientSatisfaction.toFixed(1)}
      </div>
      <div className="text-xs sfb-text-premium">Rating/5</div>
    </div>
  </div>
))
PerformanceMetricsGrid.displayName = 'PerformanceMetricsGrid'

const AchievementBadges = memo(({ achievements }: { achievements: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {achievements.map((achievement, index) => (
      <Badge key={index} variant="outline" className="text-xs">
        🏆 {achievement}
      </Badge>
    ))}
  </div>
))
AchievementBadges.displayName = 'AchievementBadges'

const TierProgressBar = memo(({ userPerformance, getProgressColor }: { 
  userPerformance: any, 
  getProgressColor: (progress: number) => string 
}) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <span className="font-medium sfb-text-premium">
        Progress to {userPerformance.nextTier.name} {userPerformance.nextTier.emoji}
      </span>
      <span className="text-sm font-bold" style={{ color: 'var(--sfb-teal)' }}>
        {userPerformance.progressToNext.toFixed(1)}%
      </span>
    </div>
    <div className="relative">
      <Progress 
        value={userPerformance.progressToNext} 
        className="h-3"
      />
      <div 
        className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${getProgressColor(userPerformance.progressToNext)}`}
        style={{ width: `${userPerformance.progressToNext}%` }}
      />
    </div>
    <div className="text-xs sfb-text-premium">
      Score: {userPerformance.metrics.tierScore}/100 (Need {userPerformance.nextTier.requiredScore})
    </div>
  </div>
))
TierProgressBar.displayName = 'TierProgressBar'

const LeaderboardEntry = memo(({ 
  rank, 
  name, 
  emoji, 
  score, 
  rate, 
  revenue, 
  isCurrentUser = false 
}: {
  rank: number
  name: string
  emoji: string
  score: number
  rate: number
  revenue: number
  isCurrentUser?: boolean
}) => (
  <div className={`flex items-center space-x-3 p-${isCurrentUser ? '4' : '3'} rounded-lg ${
    isCurrentUser ? 'sfb-card-elite' : ''
  }`} style={!isCurrentUser ? { background: 'var(--sfb-grey-light)' } : {}}>
    <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm" style={{ background: 'var(--sfb-gradient-teal)' }}>
      {rank}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className={`font-medium ${isCurrentUser ? 'text-white' : 'sfb-text-premium'}`}>{name}</span>
        <span className="text-lg">{emoji}</span>
        {isCurrentUser && <Badge className="bg-teal-100 text-teal-800 text-xs">You</Badge>}
      </div>
      <div className={`text-sm ${isCurrentUser ? 'text-teal-100' : ''}`} style={!isCurrentUser ? { color: 'var(--sfb-grey)' } : {}}>
        Score: {score} • ${rate}/service
      </div>
    </div>
    <div className={`${isCurrentUser ? 'text-white' : 'sfb-text-premium'} text-sm font-medium`}>
      ${revenue.toLocaleString()}
    </div>
  </div>
))
LeaderboardEntry.displayName = 'LeaderboardEntry'

const NextAppointmentCard = memo(({ appointment, router }: { 
  appointment: any, 
  router: any 
}) => (
  <Card variant="default" padding="lg">
    <CardContent>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Next Appointment</h3>
        <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="space-y-2">
        <p className="font-medium text-gray-900 dark:text-white">
          {appointment.client_name || 'Client'}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {appointment.service_name} • {new Date(appointment.start_time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
        <div className="pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            View all appointments →
          </button>
        </div>
      </div>
    </CardContent>
  </Card>
))
NextAppointmentCard.displayName = 'NextAppointmentCard'

const EmptyScheduleCard = memo(({ router }: { router: any }) => (
  <Card variant="default" padding="lg">
    <CardContent>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule</h3>
        <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          No upcoming appointments scheduled
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          View calendar →
        </button>
      </div>
    </CardContent>
  </Card>
))
EmptyScheduleCard.displayName = 'EmptyScheduleCard'

export const OptimizedBarberDashboardLayout = memo(({ 
  user, 
  todayStats, 
  upcomingAppointments 
}: BarberDashboardLayoutProps) => {
  const router = useRouter()

  // Memoized performance data calculation
  const userPerformance = useMemoizedValue(() => ({
    currentTier: {
      name: 'Premium',
      rate: 65,
      emoji: '🏆',
      color: 'var(--sfb-teal)'
    },
    metrics: {
      utilizationRate: 0.87,
      avgLeadTimeDays: 14.5,
      demandVelocity: 15.2,
      clientSatisfaction: 4.8,
      tierScore: 78.5
    },
    nextTier: {
      name: 'Elite',
      emoji: '💎',
      requiredScore: 86
    },
    progressToNext: 82.3,
    achievements: ['High Demand', 'Client Favorite', '500+ Services'],
    streakWeeks: 6,
    monthlyRevenue: todayStats.revenue * 30,
    isNewTierUnlocked: false
  }), [todayStats.revenue])

  // Memoized utility function
  const getProgressColor = useMemoizedCallback((progress: number) => {
    if (progress >= 90) return 'bg-gradient-to-r from-purple-500 to-pink-500'
    if (progress >= 75) return 'bg-gradient-to-r from-blue-500 to-purple-500'
    if (progress >= 50) return 'bg-gradient-to-r from-green-500 to-blue-500'
    return 'bg-gradient-to-r from-gray-400 to-green-500'
  }, [])

  // Memoized navigation handlers
  const handleAnalyticsClick = useMemoizedCallback(() => {
    router.push('/analytics/revenue')
  }, [router])

  const handleCalendarClick = useMemoizedCallback(() => {
    router.push('/calendar')
  }, [router])

  const handleFullAnalyticsClick = useMemoizedCallback(() => {
    router.push('/analytics/revenue')
  }, [router])

  // Memoized action handlers for smart insights
  const handleActionClick = useMemoizedCallback((action: any, insight: any) => {
    if (action.endpoint) {
      router.push(action.endpoint)
    }
  }, [router])

  const handleActionExecuted = useMemoizedCallback((action: any, result: any) => {
    console.log('Action executed:', action.label, result)
  }, [])

  return (
    <div className="space-y-6">
      {/* Snapshot Dashboard - KPI cards and Six Figure Analytics */}
      <SnapshotDashboard
        user={user}
        todayStats={todayStats}
        timeRange="30d"
      />

      {/* Achievement Celebration Banner */}
      {userPerformance.isNewTierUnlocked && (
        <Card className="sfb-card-elite sfb-celebration border-2">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="text-4xl animate-bounce">🎉</div>
                <div>
                  <h3 className="font-bold text-xl text-white">CONGRATULATIONS!</h3>
                  <p className="text-teal-100 text-base">
                    You've reached {userPerformance.currentTier.name} tier! New rate: ${userPerformance.currentTier.rate}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-sm text-teal-200">Achievement Unlocked</div>
                <div className="text-3xl font-bold text-white">
                  {userPerformance.currentTier.emoji} {userPerformance.currentTier.name}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tier Section - Gamified Progress */}
      <Card className="sfb-card-premium">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ background: 'var(--sfb-gradient-teal)' }}
              >
                {userPerformance.currentTier.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="sfb-heading-secondary text-lg font-bold">
                    Your Performance Tier
                  </h3>
                  <Badge className="sfb-badge-teal">
                    {userPerformance.currentTier.name}
                  </Badge>
                </div>
                <p className="text-sm sfb-text-premium">
                  Current rate: ${userPerformance.currentTier.rate}/service • Streak: {userPerformance.streakWeeks} weeks
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: 'var(--sfb-teal)' }}>
                ${userPerformance.monthlyRevenue.toLocaleString()}
              </div>
              <div className="text-sm sfb-text-premium">Monthly Revenue</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tier Progress */}
          {userPerformance.nextTier && (
            <TierProgressBar 
              userPerformance={userPerformance}
              getProgressColor={getProgressColor}
            />
          )}

          {/* Performance Metrics Grid */}
          <PerformanceMetricsGrid metrics={userPerformance.metrics} />

          {/* Recent Achievements */}
          {userPerformance.achievements.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrophyIcon className="w-5 h-5" style={{ color: 'var(--sfb-teal)' }} />
                <span className="font-medium sfb-heading-secondary">Recent Achievements</span>
              </div>
              <AchievementBadges achievements={userPerformance.achievements} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAnalyticsClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <ArrowTrendingUpIcon className="w-4 h-4" />
              View Analytics
            </button>
            <button
              onClick={handleCalendarClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium sfb-button-premium"
            >
              <CalendarIcon className="w-4 h-4" />
              Manage Schedule
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Leaderboard - See how you compare */}
      <Card className="sfb-card-premium">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrophyIcon className="w-6 h-6" style={{ color: 'var(--sfb-teal)' }} />
              <div>
                <h3 className="sfb-heading-secondary text-lg font-bold">Team Performance</h3>
                <p className="text-sm sfb-text-premium">See how you rank this month</p>
              </div>
            </div>
            <button
              onClick={handleFullAnalyticsClick}
              className="text-sm sfb-text-premium hover:text-teal-600 transition-colors"
            >
              View Full Analytics →
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {/* Current User's Position */}
            <LeaderboardEntry
              rank={2}
              name={user.first_name || 'You'}
              emoji={userPerformance.currentTier.emoji}
              score={userPerformance.metrics.tierScore}
              rate={userPerformance.currentTier.rate}
              revenue={userPerformance.monthlyRevenue}
              isCurrentUser={true}
            />

            {/* Other Team Members */}
            <LeaderboardEntry
              rank={1}
              name="Marcus Johnson"
              emoji="💎"
              score={88.5}
              rate={75}
              revenue={7125}
            />

            <LeaderboardEntry
              rank={3}
              name="Diego Rivera"
              emoji="⭐"
              score={68.2}
              rate={55}
              revenue={4950}
            />
          </div>

          <div className="mt-4 p-3 rounded-lg bg-teal-50 border border-teal-200">
            <div className="flex items-center gap-2 text-teal-800 text-sm">
              <SparklesIcon className="w-4 h-4" />
              <span className="font-medium">
                You're only {userPerformance.nextTier.requiredScore - userPerformance.metrics.tierScore} points away from {userPerformance.nextTier.name} tier!
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Insights Hub - Priority Insight for immediate attention */}
      <PriorityInsightWidget
        userId={user.id}
        autoRefresh={true}
        onActionClick={handleActionClick}
      />

      {/* Two-column layout for actions and appointment info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Action Center - Intelligent quick actions */}
        <InsightActionCenter
          userId={user.id}
          variant="compact"
          maxActions={4}
          showHeader={true}
          autoRefresh={true}
          onActionExecuted={handleActionExecuted}
        />

        {/* Next Appointment Card or Empty State */}
        {upcomingAppointments.length > 0 ? (
          <NextAppointmentCard 
            appointment={upcomingAppointments[0]} 
            router={router}
          />
        ) : (
          <EmptyScheduleCard router={router} />
        )}
      </div>

      {/* Traditional Quick Actions - Keep for existing functionality */}
      <QuickActions userRole={user.role} />
    </div>
  )
})

OptimizedBarberDashboardLayout.displayName = 'OptimizedBarberDashboardLayout'
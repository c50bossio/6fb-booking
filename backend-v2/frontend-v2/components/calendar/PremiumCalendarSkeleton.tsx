'use client'

import React from 'react'
import { getTheme } from '@/lib/calendar-premium-theme'

interface PremiumCalendarSkeletonProps {
  view?: 'day' | 'week' | 'month' | 'agenda'
  theme?: 'platinum' | 'pearl' | 'aurora'
  showStats?: boolean
  appointmentCount?: number
  className?: string
}

const ShimmerEffect = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gradient-to-r from-transparent via-white/30 to-transparent ${className}`}>
    <div className="h-full bg-gray-200/60 dark:bg-gray-700/60 rounded" />
  </div>
)

const PremiumShimmer = ({ className = '', theme = 'pearl' }: { className?: string; theme?: 'platinum' | 'pearl' | 'aurora' }) => {
  const themeConfig = getTheme(theme)
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-200/20 to-transparent animate-shimmer" />
      <div className={`h-full ${themeConfig.calendar.surface} rounded animate-pulse`} />
    </div>
  )
}

export default function PremiumCalendarSkeleton({
  view = 'month',
  theme = 'pearl',
  showStats = false,
  appointmentCount = 8,
  className = ''
}: PremiumCalendarSkeletonProps) {
  const themeConfig = getTheme(theme)

  const StatsSkeleton = () => (
    <div className="flex gap-4 mb-6">
      {[1, 2].map((i) => (
        <div key={i} className={`${themeConfig.calendar.elevated} rounded-xl p-4 flex-1 animate-in slide-in-from-top-2 duration-300`} style={{ animationDelay: `${i * 100}ms` }}>
          <PremiumShimmer className="h-8 w-16 mb-2" theme={theme} />
          <PremiumShimmer className="h-4 w-24" theme={theme} />
        </div>
      ))}
    </div>
  )

  const NavigationSkeleton = () => (
    <div className={`${themeConfig.calendar.elevated} rounded-xl p-4 mb-6 animate-in slide-in-from-top-1 duration-300`}>
      <div className="flex items-center justify-between">
        <PremiumShimmer className="h-10 w-10 rounded-lg" theme={theme} />
        <PremiumShimmer className="h-8 w-48 rounded-lg" theme={theme} />
        <PremiumShimmer className="h-10 w-10 rounded-lg" theme={theme} />
      </div>
    </div>
  )

  const DayViewSkeleton = () => (
    <div className="space-y-4 p-6">
      {/* Time slots */}
      <div className="grid grid-cols-1 gap-2">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex gap-4 items-center animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
            <PremiumShimmer className="h-4 w-16 flex-shrink-0" theme={theme} />
            <div className="flex-1 space-y-2">
              {Math.random() > 0.6 && (
                <PremiumShimmer className="h-16 w-full rounded-lg" theme={theme} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const WeekViewSkeleton = () => (
    <div className="p-6">
      {/* Week header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="text-center animate-in slide-in-from-top-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
            <PremiumShimmer className="h-6 w-12 mx-auto mb-2" theme={theme} />
            <PremiumShimmer className="h-8 w-8 rounded-full mx-auto" theme={theme} />
          </div>
        ))}
      </div>
      
      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2 h-96">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="space-y-2 animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
            {Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, j) => (
              <PremiumShimmer key={j} className="h-20 w-full rounded-lg" theme={theme} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  const MonthViewSkeleton = () => (
    <div className="p-6">
      {/* Month header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
          <div key={day} className="text-center py-2 animate-in slide-in-from-top-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
            <PremiumShimmer className="h-4 w-8 mx-auto" theme={theme} />
          </div>
        ))}
      </div>
      
      {/* Month grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className={`h-24 border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-2 animate-in zoom-in-95 duration-300`} style={{ animationDelay: `${i * 20}ms` }}>
            <PremiumShimmer className="h-4 w-6 mb-2" theme={theme} />
            <div className="space-y-1">
              {Math.random() > 0.7 && (
                <>
                  <PremiumShimmer className="h-3 w-full rounded" theme={theme} />
                  {Math.random() > 0.5 && (
                    <PremiumShimmer className="h-3 w-3/4 rounded" theme={theme} />
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const AgendaViewSkeleton = () => (
    <div className="p-6 space-y-6">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
          <PremiumShimmer className="h-6 w-32 mb-3" theme={theme} />
          <div className="space-y-3">
            {Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => (
              <div key={j} className={`${themeConfig.calendar.surface} rounded-lg p-4 border border-white/10`}>
                <div className="flex items-center gap-3">
                  <PremiumShimmer className="h-4 w-16" theme={theme} />
                  <PremiumShimmer className="h-4 w-24" theme={theme} />
                  <PremiumShimmer className="h-4 w-20" theme={theme} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const renderViewSkeleton = () => {
    switch (view) {
      case 'day':
        return <DayViewSkeleton />
      case 'week':
        return <WeekViewSkeleton />
      case 'month':
        return <MonthViewSkeleton />
      case 'agenda':
        return <AgendaViewSkeleton />
      default:
        return <MonthViewSkeleton />
    }
  }

  return (
    <div className={`${className} ${themeConfig.calendar.background} min-h-screen`}>
      <div className="p-6 space-y-6">
        {/* Header skeleton */}
        <div className={`${themeConfig.calendar.surface} rounded-2xl p-6 shadow-premium animate-in slide-in-from-top-1 duration-500`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <PremiumShimmer className="h-8 w-32 mb-2" theme={theme} />
              <PremiumShimmer className="h-4 w-48" theme={theme} />
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <PremiumShimmer key={i} className="h-10 w-16 rounded-lg" theme={theme} />
              ))}
            </div>
          </div>
          
          {showStats && <StatsSkeleton />}
        </div>

        {/* Navigation skeleton */}
        <NavigationSkeleton />

        {/* Main calendar skeleton */}
        <div className={`${themeConfig.calendar.elevated} rounded-xl overflow-hidden shadow-premium border border-white/10 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-700`}>
          {renderViewSkeleton()}
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center py-8 animate-in fade-in-0 duration-1000">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-6 h-6 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-6 h-6 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Background gradient animation */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-transparent to-purple-500/20 animate-morphing-gradient" />
      </div>
    </div>
  )
}

// Preset skeleton configurations
export const skeletonPresets = {
  minimal: {
    showStats: false,
    appointmentCount: 3,
    theme: 'pearl' as const
  },
  standard: {
    showStats: true,
    appointmentCount: 6,
    theme: 'pearl' as const
  },
  rich: {
    showStats: true,
    appointmentCount: 12,
    theme: 'aurora' as const
  }
}
'use client'

import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Lazy load heavy calendar components only when needed
const DragDropCalendar = lazy(() => import('./DragDropCalendar'))
const PremiumCalendar = lazy(() => import('./PremiumCalendar'))
const MobileOptimizedCalendar = lazy(() => import('./MobileOptimizedCalendar'))
const UnifiedCalendar = lazy(() => import('./UnifiedCalendar'))

interface LazyCalendarProps {
  type: 'dragdrop' | 'premium' | 'mobile' | 'unified' | 'basic'
  [key: string]: any
}

const LazyCalendar = ({ type, ...props }: LazyCalendarProps) => {
  const CalendarFallback = () => (
    <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
      <LoadingSpinner />
      <span className="ml-2 text-gray-600">Loading calendar...</span>
    </div>
  )

  const renderCalendar = () => {
    switch (type) {
      case 'dragdrop':
        return (
          <Suspense fallback={<CalendarFallback />}>
            <DragDropCalendar {...props} />
          </Suspense>
        )
      case 'premium':
        return (
          <Suspense fallback={<CalendarFallback />}>
            <PremiumCalendar {...props} />
          </Suspense>
        )
      case 'mobile':
        return (
          <Suspense fallback={<CalendarFallback />}>
            <MobileOptimizedCalendar {...props} />
          </Suspense>
        )
      case 'unified':
        return (
          <Suspense fallback={<CalendarFallback />}>
            <UnifiedCalendar {...props} />
          </Suspense>
        )
      default:
        // For basic calendar, load synchronously as it's lightweight
        const BasicCalendar = lazy(() => import('./RobustCalendar'))
        return (
          <Suspense fallback={<CalendarFallback />}>
            <BasicCalendar {...props} />
          </Suspense>
        )
    }
  }

  return renderCalendar()
}

export default LazyCalendar
'use client'

import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

// Dynamically import the heavy demo component to reduce initial bundle size
const CalendarRevenueOptimizationDemo = dynamicImport(
  () => import('@/components/calendar/CalendarRevenueOptimizationDemo'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    ),
    ssr: false
  }
)

// Force dynamic rendering for demo pages to avoid SSR issues
export const dynamic = 'force-dynamic'

export default function RevenueAnalyticsDemo() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CalendarRevenueOptimizationDemo />
    </Suspense>
  )
}
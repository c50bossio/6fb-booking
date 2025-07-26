'use client'

import CalendarRevenueOptimizationDemo from '@/components/calendar/CalendarRevenueOptimizationDemo'

// Force dynamic rendering for demo pages to avoid SSR issues
export const dynamic = 'force-dynamic'

export default function RevenueAnalyticsDemo() {
  return <CalendarRevenueOptimizationDemo />
}
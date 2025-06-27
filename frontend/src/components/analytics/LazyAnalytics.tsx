'use client'

import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Lazy load analytics components
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'))
const AnimatedAnalyticsDashboard = lazy(() => import('./AnimatedAnalyticsDashboard'))
const RevenueChart = lazy(() => import('./RevenueChart'))
const BarberComparison = lazy(() => import('./BarberComparison'))
const BookingTrendsChart = lazy(() => import('./BookingTrendsChart'))
const ClientRetentionChart = lazy(() => import('./ClientRetentionChart'))
const PeakHoursHeatmap = lazy(() => import('./PeakHoursHeatmap'))
const PerformanceMetrics = lazy(() => import('./PerformanceMetrics'))
const ServiceAnalytics = lazy(() => import('./ServiceAnalytics'))

interface LazyAnalyticsProps {
  component: 'dashboard' | 'animated-dashboard' | 'revenue' | 'barber-comparison' | 
            'booking-trends' | 'client-retention' | 'peak-hours' | 'performance' | 'service'
  [key: string]: any
}

const LazyAnalytics = ({ component, ...props }: LazyAnalyticsProps) => {
  const AnalyticsFallback = () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
      <LoadingSpinner />
      <span className="ml-2 text-gray-600">Loading analytics...</span>
    </div>
  )

  const renderComponent = () => {
    switch (component) {
      case 'dashboard':
        return (
          <Suspense fallback={<AnalyticsFallback />}>
            <AnalyticsDashboard {...props} />
          </Suspense>
        )
      case 'animated-dashboard':
        return (
          <Suspense fallback={<AnalyticsFallback />}>
            <AnimatedAnalyticsDashboard {...props} />
          </Suspense>
        )
      case 'revenue':
        return (
          <Suspense fallback={<AnalyticsFallback />}>
            <RevenueChart {...props} />
          </Suspense>
        )
      case 'barber-comparison':
        return (
          <Suspense fallback={<AnalyticsFallback />}>
            <BarberComparison {...props} />
          </Suspense>
        )
      case 'booking-trends':
        return (
          <Suspense fallback={<AnalyticsFallback />}>
            <BookingTrendsChart {...props} />
          </Suspense>
        )
      case 'client-retention':
        return (
          <Suspense fallback={<AnalyticsFallback />}>
            <ClientRetentionChart {...props} />
          </Suspense>
        )
      case 'peak-hours':
        return (
          <Suspense fallback={<AnalyticsFallback />}>
            <PeakHoursHeatmap {...props} />
          </Suspense>
        )
      case 'performance':
        return (
          <Suspense fallback={<AnalyticsFallback />}>
            <PerformanceMetrics {...props} />
          </Suspense>
        )
      case 'service':
        return (
          <Suspense fallback={<AnalyticsFallback />}>
            <ServiceAnalytics {...props} />
          </Suspense>
        )
      default:
        return <AnalyticsFallback />
    }
  }

  return renderComponent()
}

export default LazyAnalytics
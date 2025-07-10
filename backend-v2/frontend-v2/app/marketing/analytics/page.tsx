'use client'

import React from 'react'
import MarketingAnalyticsDashboard from '@/components/marketing/MarketingAnalyticsDashboard'
import { ErrorBoundary } from '@/components/ErrorBoundary'

/**
 * Marketing Analytics Page
 * 
 * This page provides comprehensive marketing analytics including:
 * - Conversion tracking and attribution
 * - Landing page performance metrics
 * - Channel ROI analysis
 * - Integration health monitoring
 * - Performance trends and insights
 */
export default function MarketingAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary feature="marketing-analytics">
          <MarketingAnalyticsDashboard />
        </ErrorBoundary>
      </div>
    </div>
  )
}
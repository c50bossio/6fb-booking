/**
 * Retention Analytics Page
 * ========================
 * 
 * Main retention analytics page that displays the comprehensive
 * retention analytics dashboard for Six Figure Barber intelligence.
 */

import React from 'react'
import RetentionAnalyticsDashboard from '@/components/retention/RetentionAnalyticsDashboard'

export default function RetentionPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <RetentionAnalyticsDashboard />
    </div>
  )
}

export const metadata = {
  title: 'Retention Analytics | Six Figure Barber',
  description: 'Comprehensive client retention analytics and Six Figure methodology intelligence dashboard.',
}
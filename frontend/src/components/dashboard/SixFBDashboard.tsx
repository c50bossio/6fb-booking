'use client'

import React from 'react'
import DashboardHeader from './DashboardHeader'
import MetricsCards from './MetricsCards'
import WeeklyComparison from './WeeklyComparison'
import SixFBScore from './SixFBScore'
import DailyAppointments from './DailyAppointments'
import TrafftIntegration from './TrafftIntegration'
import AutomationDashboard from './AutomationDashboard'

export default function SixFBDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader />
      
      {/* Main Dashboard Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 6FB Score Section */}
        <SixFBScore />
        
        {/* Key Metrics Cards */}
        <MetricsCards />
        
        {/* Weekly Comparison */}
        <WeeklyComparison />
        
        {/* Daily Appointments Summary */}
        <DailyAppointments />
        
        {/* Trafft Integration */}
        <TrafftIntegration />
        
        {/* Automation Dashboard */}
        <AutomationDashboard />
      </div>
    </div>
  )
}
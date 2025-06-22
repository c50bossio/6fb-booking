'use client'

import { useState } from 'react'
import { AnimatedAnalyticsDashboard } from '@/components/analytics/AnimatedAnalyticsDashboard'

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">6FB Platform</h1>
              <nav className="ml-10 flex space-x-4">
                <a href="/app" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
                <a href="/app/calendar" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Calendar
                </a>
                <a href="/app/analytics" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Analytics
                </a>
                <a href="/app/barbers" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Barbers
                </a>
                <a href="/app/payments" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Payments
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Demo Mode</span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                D
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Track performance metrics and business insights</p>
        </div>

        <AnimatedAnalyticsDashboard />
      </main>
    </div>
  )
}
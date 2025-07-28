'use client'

import React from 'react'
import { BarberDashboardLayout } from '@/components/BarberDashboardLayout'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import { SEO } from '@/components/SEO'

export default function SixFigureBarberAnalyticsPage() {
  return (
    <>
      <SEO 
        title="Six Figure Barber Analytics Dashboard - Comprehensive Business Insights"
        description="Advanced analytics dashboard specifically designed for the Six Figure Barber methodology. Track revenue optimization, client value, service excellence, and business growth metrics."
        keywords="Six Figure Barber, barber analytics, business insights, revenue tracking, client analytics, performance metrics, business intelligence"
      />
      
      <BarberDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">6FB</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Six Figure Barber Analytics</h1>
                <p className="text-gray-600">
                  Advanced business insights aligned with the Six Figure Barber methodology
                </p>
              </div>
            </div>
            
            {/* Methodology Principles Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-5 gap-4 text-center">
                <div className="text-blue-700">
                  <div className="font-semibold text-sm">Revenue</div>
                  <div className="text-xs">Optimization</div>
                </div>
                <div className="text-green-700">
                  <div className="font-semibold text-sm">Client Value</div>
                  <div className="text-xs">Maximization</div>
                </div>
                <div className="text-purple-700">
                  <div className="font-semibold text-sm">Service</div>
                  <div className="text-xs">Excellence</div>
                </div>
                <div className="text-orange-700">
                  <div className="font-semibold text-sm">Business</div>
                  <div className="text-xs">Efficiency</div>
                </div>
                <div className="text-red-700">
                  <div className="font-semibold text-sm">Professional</div>
                  <div className="text-xs">Growth</div>
                </div>
              </div>
            </div>
          </div>
          
          <AnalyticsDashboard />
        </div>
      </BarberDashboardLayout>
    </>
  )
}
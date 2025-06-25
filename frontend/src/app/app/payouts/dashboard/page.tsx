'use client'

import { PayoutAnalyticsDashboard, PayoutStatusTracker } from '@/components/payouts'

export default function PayoutDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Payout Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time insights and status tracking</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Analytics - Takes 2 columns */}
          <div className="lg:col-span-2">
            <PayoutAnalyticsDashboard />
          </div>

          {/* Status Tracker - Takes 1 column */}
          <div className="lg:col-span-1">
            <PayoutStatusTracker />
          </div>
        </div>
      </main>
    </div>
  )
}

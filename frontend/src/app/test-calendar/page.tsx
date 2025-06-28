'use client'

import React from 'react'

export default function TestCalendarPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Calendar Component Test</h1>

        <div className="bg-gray-800 rounded-lg p-6 text-white">
          <p className="mb-4">Testing calendar components...</p>

          <div className="space-y-2">
            <div>✅ Page loads successfully</div>
            <div>✅ No authentication required</div>
            <div>📍 Testing at: {new Date().toLocaleString()}</div>
          </div>

          <div className="mt-6">
            <a
              href="/enhanced-calendar-demo"
              className="inline-block bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded"
            >
              Go to Enhanced Calendar Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

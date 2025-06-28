'use client'

import React from 'react'

export default function CalendarTestPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">Calendar Test Page</h1>
      <p className="text-gray-400 mb-6">If you can see this, the deployment is working!</p>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Available Calendar Demos:</h2>
        <ul className="space-y-2">
          <li>
            <a href="/test-calendar" className="text-blue-400 hover:text-blue-300">
              /test-calendar - Basic test
            </a>
          </li>
          <li>
            <a href="/simple-calendar-demo" className="text-blue-400 hover:text-blue-300">
              /simple-calendar-demo - Simple drag & drop
            </a>
          </li>
          <li>
            <a href="/enhanced-calendar-demo" className="text-blue-400 hover:text-blue-300">
              /enhanced-calendar-demo - Full features
            </a>
          </li>
        </ul>

        <div className="mt-6 p-4 bg-gray-900 rounded">
          <p className="text-sm text-gray-500">
            Deployment time: {new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  )
}

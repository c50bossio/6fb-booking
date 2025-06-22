'use client'

import { useEffect, useState } from 'react'
import DarkCalendarWithSettings from '@/components/DarkCalendarWithSettings'

export default function CalendarSettingsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gray-900/50 backdrop-blur rounded-2xl p-6 border border-gray-700 animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Calendar Settings Demo</h1>
          <p className="text-gray-400">Experience the most customizable booking calendar for your business</p>
        </div>
        
        <DarkCalendarWithSettings />
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-3">🎨 Try These Features</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• Click the gear icon to open settings</li>
              <li>• Change the accent color for instant theme updates</li>
              <li>• Switch between 12/24 hour time formats</li>
              <li>• Adjust display density (compact/comfortable/spacious)</li>
              <li>• Toggle animations on/off</li>
              <li>• Enable/disable color by status</li>
            </ul>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-3">🚀 Production Ready</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• Fully responsive design</li>
              <li>• Keyboard navigation support</li>
              <li>• Touch-friendly on mobile devices</li>
              <li>• Real-time setting persistence</li>
              <li>• Performance optimized</li>
              <li>• Accessibility compliant</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
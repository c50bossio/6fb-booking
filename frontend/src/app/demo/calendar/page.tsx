'use client'

import { useEffect, useState } from 'react'
import DarkCalendarWithSettings from '@/components/DarkCalendarWithSettings'

// This is a standalone demo page without any authentication requirements
export default function StandaloneCalendarDemo() {
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
    <div className="relative min-h-full">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>
      </div>

      <div className="relative z-10 p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Calendar Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Click the gear icon ⚙️ in the calendar to explore customization options
          </p>
        </div>

        {/* Main Calendar Component */}
        <div className="mb-8">
          <DarkCalendarWithSettings />

        </div>

        {/* Instructions */}
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🚀 Interactive Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-violet-600 dark:text-violet-400 mb-4">Settings Panel</h3>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-violet-500 mr-2">•</span>
                  <span><strong>Appearance:</strong> Switch between Dark/Light/Auto themes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-violet-500 mr-2">•</span>
                  <span><strong>Accent Colors:</strong> Choose from 6 gradient color schemes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-violet-500 mr-2">•</span>
                  <span><strong>Density:</strong> Compact, Comfortable, or Spacious layouts</span>
                </li>
                <li className="flex items-start">
                  <span className="text-violet-500 mr-2">•</span>
                  <span><strong>Animations:</strong> Toggle smooth transitions on/off</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-4">Calendar Options</h3>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">•</span>
                  <span><strong>Time Format:</strong> 12-hour (AM/PM) or 24-hour display</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">•</span>
                  <span><strong>Week Start:</strong> Sunday or Monday as first day</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">•</span>
                  <span><strong>Color by Status:</strong> Different colors for appointment types</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">•</span>
                  <span><strong>Quick Actions:</strong> Enable one-click operations</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-violet-100 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-500/30 rounded-lg">
            <p className="text-center text-violet-700 dark:text-violet-300">
              💡 <strong>Pro Tip:</strong> All settings apply instantly - try changing the accent color or density to see real-time updates!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

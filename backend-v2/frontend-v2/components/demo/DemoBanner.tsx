'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

export function DemoBanner() {
  const router = useRouter()

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur">
              DEMO MODE
            </span>
            <p className="text-sm font-medium">
              You're viewing a demo with sample data. No real appointments will be created.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/demo')}
              className="text-sm font-medium hover:text-purple-200 transition-colors"
            >
              Demo Menu
            </button>
            <button
              onClick={() => router.push('/')}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              title="Exit Demo"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
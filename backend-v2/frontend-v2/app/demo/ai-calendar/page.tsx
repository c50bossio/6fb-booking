'use client'

import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

// Dynamically import the heavy AI demo component to reduce initial bundle size
const AICalendarDemo = dynamicImport(
  () => import('@/components/demo/AICalendarDemo'),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Calendar Demo...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

// Force dynamic rendering for demo pages to avoid SSR issues
export const dynamic = 'force-dynamic'

export default function AICalendarDemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Calendar Demo...</p>
        </div>
      </div>
    }>
      <AICalendarDemo />
    </Suspense>
  )
}
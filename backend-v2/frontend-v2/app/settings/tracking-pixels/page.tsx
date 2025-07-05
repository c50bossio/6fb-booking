'use client'

import { Suspense } from 'react'
import TrackingPixelSettings from '@/components/dashboard/TrackingPixelSettings'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

function TrackingPixelsContent() {
  const router = useRouter()

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => router.push('/settings')}
            variant="ghost"
            size="sm"
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            }
          >
            Back to Settings
          </Button>
        </div>

        {/* Tracking Pixel Settings Component */}
        <TrackingPixelSettings />
      </div>
    </main>
  )
}

export default function TrackingPixelsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </main>
    }>
      <TrackingPixelsContent />
    </Suspense>
  )
}
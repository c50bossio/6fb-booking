'use client'

import { Suspense } from 'react'

// Loading component for Suspense boundary
function BookPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-4"></div>
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-8"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Dynamic import of the actual BookPage content
import dynamic from 'next/dynamic'

const BookPageContent = dynamic(() => import('./BookPageContent'), {
  ssr: false,
  loading: () => <BookPageLoading />
})

export default function BookPage() {
  return (
    <Suspense fallback={<BookPageLoading />}>
      <BookPageContent />
    </Suspense>
  )
}
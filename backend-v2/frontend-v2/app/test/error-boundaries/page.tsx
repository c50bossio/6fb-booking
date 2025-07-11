'use client'

import ErrorBoundaryTest from '@/components/testing/ErrorBoundaryTest'

export default function ErrorBoundaryTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Error Boundary Testing
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the specialized error boundaries with simulated failures
          </p>
        </div>
        
        <ErrorBoundaryTest />
      </div>
    </div>
  )
}
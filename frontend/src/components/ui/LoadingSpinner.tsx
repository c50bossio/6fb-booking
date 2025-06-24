'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  fullScreen?: boolean
  overlay?: boolean
}

export function LoadingSpinner({
  size = 'md',
  message = 'Loading...',
  fullScreen = false,
  overlay = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const spinner = (
    <div className={`animate-spin rounded-full border-2 border-t-transparent border-blue-600 ${sizeClasses[size]}`} />
  )

  const content = (
    <div className="flex flex-col items-center justify-center space-y-3">
      {spinner}
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {message}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
        {content}
      </div>
    )
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return content
}

export function LoadingCard({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      <LoadingSpinner message={message} />
    </div>
  )
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LoadingPage({ message = 'Loading page...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="xl" />
        <h2 className="mt-6 text-lg font-medium text-gray-900 dark:text-white">
          {message}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Please wait while we load your content...
        </p>
      </div>
    </div>
  )
}

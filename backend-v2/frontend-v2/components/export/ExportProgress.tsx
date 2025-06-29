'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ExportProgressProps {
  progress: {
    status: 'preparing' | 'processing' | 'complete' | 'error'
    progress: number
    message: string
    downloadUrl?: string
    filename?: string
    error?: string
  }
  onReset: () => void
}

export default function ExportProgress({ progress, onReset }: ExportProgressProps) {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'preparing':
        return (
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
        )
      case 'processing':
        return (
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )
      case 'complete':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
    }
  }

  const getProgressColor = () => {
    switch (progress.status) {
      case 'error':
        return 'bg-red-500'
      case 'complete':
        return 'bg-green-500'
      default:
        return 'bg-blue-500'
    }
  }

  const handleDownload = () => {
    if (progress.downloadUrl) {
      // In a real app, this would trigger a download
      // For now, we'll just log it
      console.log('Downloading:', progress.filename)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Export Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          {getStatusIcon()}
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {progress.message}
          </h3>

          {progress.status !== 'complete' && progress.status !== 'error' && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4 max-w-md mx-auto">
                <div
                  className={`${getProgressColor()} h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                {Math.round(progress.progress)}% complete
              </p>
            </>
          )}

          {progress.status === 'complete' && progress.filename && (
            <div className="mt-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{progress.filename}</p>
                      <p className="text-sm text-gray-600">Ready to download</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDownload}
                    variant="primary"
                    size="sm"
                  >
                    Download
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <Button
                  onClick={onReset}
                  variant="secondary"
                  size="md"
                >
                  Export More Data
                </Button>
              </div>
            </div>
          )}

          {progress.status === 'error' && (
            <div className="mt-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-red-800">
                  {progress.error || 'An error occurred during export. Please try again.'}
                </p>
              </div>
              <Button
                onClick={onReset}
                variant="secondary"
                size="md"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
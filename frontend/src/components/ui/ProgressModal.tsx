'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ProgressModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  progress: number
  status: 'loading' | 'success' | 'error'
  message?: string
  canCancel?: boolean
  onCancel?: () => void
}

export default function ProgressModal({
  isOpen,
  onClose,
  title,
  progress,
  status,
  message,
  canCancel = false,
  onCancel
}: ProgressModalProps) {
  const { theme } = useTheme()

  if (!isOpen) return null

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-600'
      case 'error':
        return 'bg-red-600'
      default:
        return 'bg-blue-600'
    }
  }

  const getProgressColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } rounded-xl shadow-xl max-w-md w-full`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        } flex items-center justify-between`}>
          <h2 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            {title}
          </h2>
          {status !== 'loading' && (
            <button
              onClick={onClose}
              className={`p-1 ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              } rounded-lg transition-colors`}
            >
              <XMarkIcon className={`h-5 w-5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'success' && (
            <div className="text-center mb-4">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {message || 'Operation completed successfully!'}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center mb-4">
              <XMarkIcon className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {message || 'An error occurred during the operation.'}
              </p>
            </div>
          )}

          {status === 'loading' && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${getProgressColor()}`}>
                    Progress
                  </span>
                  <span className={`text-sm ${getProgressColor()}`}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className={`w-full ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                } rounded-full h-2`}>
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Spinning Loader */}
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>

              {message && (
                <p className={`text-sm text-center ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`px-6 py-4 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        } flex items-center justify-end space-x-3`}>
          {status === 'loading' && canCancel && (
            <button
              onClick={onCancel}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Cancel
            </button>
          )}

          {status !== 'loading' && (
            <button
              onClick={onClose}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-600 hover:bg-slate-700 text-white'
                  : 'bg-slate-600 hover:bg-slate-700 text-white'
              }`}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

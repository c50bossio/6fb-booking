'use client'

import { ReactNode } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/contexts/ThemeContext'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
  icon?: ReactNode
  loading?: boolean
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  icon,
  loading = false
}: ConfirmationDialogProps) {
  const { theme } = useTheme()

  if (!isOpen) return null

  const getButtonClasses = (variant: 'danger' | 'primary') => {
    if (variant === 'danger') {
      return theme === 'dark'
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-red-600 hover:bg-red-700 text-white'
    }
    return theme === 'dark'
      ? 'bg-slate-600 hover:bg-slate-700 text-white'
      : 'bg-slate-600 hover:bg-slate-700 text-white'
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
          <div className="flex items-center space-x-3">
            {icon || (
              <ExclamationTriangleIcon className={`h-6 w-6 ${
                confirmVariant === 'danger' ? 'text-red-500' : 'text-amber-500'
              }`} />
            )}
            <h2 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } rounded-lg transition-colors`}
            disabled={loading}
          >
            <XMarkIcon className={`h-5 w-5 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className={`px-6 py-4 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        } flex items-center justify-end space-x-3`}>
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
              theme === 'dark'
                ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${getButtonClasses(confirmVariant)}`}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
            )}
            <span>{loading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

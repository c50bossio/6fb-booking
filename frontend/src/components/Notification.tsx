'use client'

import { useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  onClose: () => void
}

export default function Notification({ type, title, message, duration = 5000, onClose }: NotificationProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const icons = {
    success: <CheckCircleIcon className="h-5 w-5 text-green-400" />,
    error: <XCircleIcon className="h-5 w-5 text-red-400" />,
    warning: <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />,
    info: <InformationCircleIcon className="h-5 w-5 text-blue-400" />
  }

  const bgColors = {
    success: 'bg-green-900/20 border-green-800/50',
    error: 'bg-red-900/20 border-red-800/50',
    warning: 'bg-amber-900/20 border-amber-800/50',
    info: 'bg-blue-900/20 border-blue-800/50'
  }

  const textColors = {
    success: 'text-green-300',
    error: 'text-red-300',
    warning: 'text-amber-300',
    info: 'text-blue-300'
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md w-full animate-slide-in-right`}>
      <div className={`${bgColors[type]} border rounded-lg p-4 shadow-lg backdrop-blur-sm`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icons[type]}
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${textColors[type]}`}>
              {title}
            </p>
            {message && (
              <p className={`mt-1 text-sm ${textColors[type]} opacity-90`}>
                {message}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`ml-4 flex-shrink-0 ${textColors[type]} hover:opacity-80 focus:outline-none`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
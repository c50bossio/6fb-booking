'use client'

import { useAuth } from './AuthProvider'
import { useTheme } from '@/contexts/ThemeContext'

interface AuthStatusBannerProps {
  showDemoModeInfo?: boolean
  showBackendStatus?: boolean
  className?: string
}

export default function AuthStatusBanner({
  showDemoModeInfo = true,
  showBackendStatus = true,
  className = ''
}: AuthStatusBannerProps) {
  const { isDemoMode, authError, backendAvailable, enableDemoMode, clearAuthError } = useAuth()
  const { theme } = useTheme()

  if (!isDemoMode && !authError && backendAvailable) {
    return null
  }

  return (
    <div className={`auth-status-banner ${className}`}>
      {/* Demo Mode Banner */}
      {isDemoMode && showDemoModeInfo && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">Demo Mode Active</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>You're viewing a demo with sample data. Features are fully functional but data won't be saved.</p>
              </div>
            </div>
            <div className="ml-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Demo
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Backend Unavailable Banner */}
      {!backendAvailable && !isDemoMode && showBackendStatus && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Backend Service Unavailable</h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>Cannot connect to the backend service. You can continue in demo mode with sample data.</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => enableDemoMode('Backend service unavailable')}
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded-md transition-colors"
                >
                  Continue in Demo Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Error Banner */}
      {authError && !isDemoMode && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Authentication Issue</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>{authError}</p>
              </div>
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={clearAuthError}
                  className="text-sm font-medium text-red-800 hover:text-red-900"
                >
                  Dismiss
                </button>
                {!backendAvailable && (
                  <button
                    onClick={() => enableDemoMode('Authentication failed, using demo mode')}
                    className="text-sm font-medium text-red-800 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md transition-colors"
                  >
                    Continue in Demo Mode
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { apiUtils } from '@/lib/api/client'
import { useAuth } from './AuthProvider'

interface HealthStatus {
  backendHealthy: boolean
  authServiceHealthy: boolean
  lastChecked: Date | null
  error?: string
}

interface HealthCheckProps {
  autoCheck?: boolean
  interval?: number // in milliseconds
  onStatusChange?: (status: HealthStatus) => void
  showIndicator?: boolean
  className?: string
}

export default function HealthCheck({
  autoCheck = true,
  interval = 30000, // 30 seconds
  onStatusChange,
  showIndicator = false,
  className = ''
}: HealthCheckProps) {
  const [status, setStatus] = useState<HealthStatus>({
    backendHealthy: true,
    authServiceHealthy: true,
    lastChecked: null
  })
  const [isChecking, setIsChecking] = useState(false)
  const { enableDemoMode, disableDemoMode, isDemoMode, backendAvailable } = useAuth()

  const checkHealth = async () => {
    if (isChecking) return

    setIsChecking(true)
    try {
      const healthResult = await apiUtils.checkHealth()

      const newStatus: HealthStatus = {
        backendHealthy: healthResult.healthy && healthResult.backendAvailable,
        authServiceHealthy: healthResult.authServiceHealthy,
        lastChecked: new Date(),
        error: healthResult.error
      }

      setStatus(newStatus)

      // Notify parent component
      if (onStatusChange) {
        onStatusChange(newStatus)
      }

      // Handle backend unavailable
      if (!newStatus.backendHealthy && !isDemoMode) {
        console.log('Backend unhealthy, considering demo mode')
        // Don't automatically enable demo mode, let user decide
      }

    } catch (error) {
      const errorStatus: HealthStatus = {
        backendHealthy: false,
        authServiceHealthy: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed'
      }

      setStatus(errorStatus)

      if (onStatusChange) {
        onStatusChange(errorStatus)
      }

      // Backend is definitely unavailable
      if (!isDemoMode) {
        console.log('Health check failed, backend appears unavailable')
      }
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    if (autoCheck) {
      // Initial check
      checkHealth()

      // Set up interval
      const intervalId = setInterval(checkHealth, interval)

      return () => clearInterval(intervalId)
    }
  }, [autoCheck, interval, isDemoMode])

  const getStatusColor = () => {
    if (isChecking) return 'bg-yellow-500'
    if (status.backendHealthy && status.authServiceHealthy) return 'bg-green-500'
    if (status.backendHealthy && !status.authServiceHealthy) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (isChecking) return 'Checking...'
    if (isDemoMode) return 'Demo Mode'
    if (status.backendHealthy && status.authServiceHealthy) return 'All Services Online'
    if (status.backendHealthy && !status.authServiceHealthy) return 'Auth Service Issues'
    return 'Backend Unavailable'
  }

  const handleEnableDemoMode = () => {
    enableDemoMode('Backend service unavailable')
  }

  const handleRetryConnection = () => {
    checkHealth()
  }

  if (!showIndicator && status.backendHealthy) {
    return null
  }

  return (
    <div className={`health-check ${className}`}>
      {showIndicator && (
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${getStatusColor()} ${isChecking ? 'animate-pulse' : ''}`}
            title={getStatusText()}
          />
          <span className="text-sm text-gray-600">
            {getStatusText()}
          </span>
          {status.lastChecked && (
            <span className="text-xs text-gray-400">
              ({status.lastChecked.toLocaleTimeString()})
            </span>
          )}
        </div>
      )}

      {/* Show connection issues banner */}
      {!status.backendHealthy && !isDemoMode && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Connection Issues
                </h3>
                <div className="mt-1 text-sm text-yellow-700">
                  <p>
                    Unable to connect to the backend service.
                    {status.error && ` Error: ${status.error}`}
                  </p>
                </div>
                <div className="mt-3 flex space-x-3">
                  <button
                    onClick={handleRetryConnection}
                    disabled={isChecking}
                    className="text-sm font-medium text-yellow-800 hover:text-yellow-900 disabled:opacity-50"
                  >
                    {isChecking ? 'Retrying...' : 'Retry Connection'}
                  </button>
                  <button
                    onClick={handleEnableDemoMode}
                    className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
                  >
                    Continue in Demo Mode
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo mode indicator */}
      {isDemoMode && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Demo Mode Active</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>You're using a demo version with sample data. Some features may be limited.</p>
              </div>
              {backendAvailable && (
                <div className="mt-2">
                  <button
                    onClick={disableDemoMode}
                    className="text-sm font-medium text-blue-800 hover:text-blue-900"
                  >
                    Exit Demo Mode
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for using health check status
export function useHealthCheck(options?: { autoCheck?: boolean; interval?: number }) {
  const [status, setStatus] = useState<HealthStatus>({
    backendHealthy: true,
    authServiceHealthy: true,
    lastChecked: null
  })

  const checkHealth = async () => {
    try {
      const result = await apiUtils.checkHealth()
      setStatus({
        backendHealthy: result.healthy && result.backendAvailable,
        authServiceHealthy: result.authServiceHealthy,
        lastChecked: new Date(),
        error: result.error
      })
    } catch (error) {
      setStatus({
        backendHealthy: false,
        authServiceHealthy: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed'
      })
    }
  }

  useEffect(() => {
    if (options?.autoCheck !== false) {
      checkHealth()

      if (options?.interval) {
        const intervalId = setInterval(checkHealth, options.interval)
        return () => clearInterval(intervalId)
      }
    }
  }, [options?.autoCheck, options?.interval])

  return { status, checkHealth }
}

/**
 * Token Status Component
 * Displays current token status and demonstrates proactive refresh
 */

'use client'

import React from 'react'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'
import { formatTokenTimeRemaining } from '@/lib/utils/tokenUtils'
import { smartStorage } from '@/lib/utils/storage'

interface TokenStatusProps {
  showDetails?: boolean
  className?: string
}

export const TokenStatus: React.FC<TokenStatusProps> = ({
  showDetails = false,
  className = ''
}) => {
  const {
    refreshNow,
    validateAndRefresh,
    isRefreshing,
    lastRefresh,
    refreshError,
    tokenTimeRemaining,
    isTokenExpiring
  } = useTokenRefresh({
    proactiveRefresh: true,
    onRefreshSuccess: () => {
      console.log('[TokenStatus] Token refreshed successfully')
    },
    onRefreshError: (error) => {
      console.error('[TokenStatus] Token refresh failed:', error)
    }
  })

  const token = smartStorage.getItem('access_token')
  const timeRemainingFormatted = token ? formatTokenTimeRemaining(token) : 'No token'

  const handleManualRefresh = async () => {
    await refreshNow()
  }

  const handleValidateAndRefresh = async () => {
    await validateAndRefresh()
  }

  if (!showDetails) {
    // Minimal status indicator
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div
          className={`w-2 h-2 rounded-full ${
            isRefreshing
              ? 'bg-yellow-500 animate-pulse'
              : isTokenExpiring
              ? 'bg-orange-500'
              : token
              ? 'bg-green-500'
              : 'bg-red-500'
          }`}
        />
        {showDetails && (
          <span className="text-xs text-gray-600">
            {isRefreshing ? 'Refreshing...' : timeRemainingFormatted}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold mb-3">Token Status</h3>

      <div className="space-y-3">
        {/* Token Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isRefreshing
                  ? 'bg-yellow-500 animate-pulse'
                  : isTokenExpiring
                  ? 'bg-orange-500'
                  : token
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm">
              {isRefreshing
                ? 'Refreshing...'
                : isTokenExpiring
                ? 'Expiring Soon'
                : token
                ? 'Active'
                : 'No Token'}
            </span>
          </div>
        </div>

        {/* Time Remaining */}
        {token && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Time Remaining:</span>
            <span className={`text-sm ${isTokenExpiring ? 'text-orange-600' : 'text-gray-700'}`}>
              {timeRemainingFormatted}
            </span>
          </div>
        )}

        {/* Last Refresh */}
        {lastRefresh && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Refresh:</span>
            <span className="text-sm text-gray-700">
              {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Error */}
        {refreshError && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <span className="text-sm text-red-700">
              Error: {refreshError.message}
            </span>
          </div>
        )}

        {/* Expiring Warning */}
        {isTokenExpiring && !isRefreshing && (
          <div className="bg-orange-50 border border-orange-200 rounded p-2">
            <span className="text-sm text-orange-700">
              ⚠️ Token expires in {timeRemainingFormatted}.
              Automatic refresh will occur before API calls.
            </span>
          </div>
        )}

        {/* Manual Controls */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? 'Refreshing...' : 'Manual Refresh'}
          </button>

          <button
            onClick={handleValidateAndRefresh}
            disabled={isRefreshing}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Validate & Refresh
          </button>
        </div>

        {/* Technical Info */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">Technical Details</summary>
          <div className="mt-2 space-y-1">
            <div>Token exists: {token ? 'Yes' : 'No'}</div>
            <div>Is refreshing: {isRefreshing ? 'Yes' : 'No'}</div>
            <div>Is expiring: {isTokenExpiring ? 'Yes' : 'No'}</div>
            <div>Time remaining (seconds): {tokenTimeRemaining}</div>
            {token && (
              <div className="break-all">
                Token preview: {token.substring(0, 50)}...
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}

export default TokenStatus

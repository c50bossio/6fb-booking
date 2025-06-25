'use client'

import React from 'react'
import Link from 'next/link'
import {
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'

export default function GoogleCalendarStatusWidget() {
  const { status, loading, isConnected } = useGoogleCalendar()

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Loading calendar status...
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = () => {
    if (!status) return 'text-gray-500'
    
    switch (status.status) {
      case 'active':
        return 'text-green-600'
      case 'expired':
        return 'text-yellow-600'
      case 'not_connected':
        return 'text-gray-500'
      default:
        return 'text-red-600'
    }
  }

  const getStatusIcon = () => {
    if (!status) return XCircleIcon
    
    switch (status.status) {
      case 'active':
        return CheckCircleIcon
      case 'expired':
        return ExclamationTriangleIcon
      case 'not_connected':
        return XCircleIcon
      default:
        return XCircleIcon
    }
  }

  const StatusIcon = getStatusIcon()

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Google Calendar
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <StatusIcon className={`h-4 w-4 ${getStatusColor()}`} />
              <span className={`text-xs ${getStatusColor()}`}>
                {status?.message || 'Not connected'}
              </span>
            </div>
            {status?.google_email && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {status.google_email}
              </p>
            )}
          </div>
        </div>
        
        <Link
          href="/settings/google-calendar"
          className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <span>{isConnected ? 'Manage' : 'Connect'}</span>
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
        </Link>
      </div>
      
      {status?.last_sync_date && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last sync: {new Date(status.last_sync_date).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
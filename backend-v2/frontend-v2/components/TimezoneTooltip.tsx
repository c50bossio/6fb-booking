'use client'

import { useState } from 'react'

interface TimezoneTooltipProps {
  timezone?: string
  className?: string
  content?: string
  children?: React.ReactNode
}

export default function TimezoneTooltip({ timezone, className = '', content, children }: TimezoneTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!timezone && !children) return null

  return (
    <div className={`relative inline-block ${className}`}>
      {children ? (
        <div
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {children}
        </div>
      ) : (
        <button
          type="button"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
      
      {showTooltip && (
        <div className="absolute z-10 w-64 p-2 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg -left-20">
          {content ? (
            <p>{content}</p>
          ) : (
            <>
              <p className="font-medium mb-1">Timezone Information</p>
              <p className="text-xs">
                All times are displayed in: <span className="font-medium">{timezone}</span>
              </p>
              <p className="text-xs mt-1">
                To change your timezone, go to Settings.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
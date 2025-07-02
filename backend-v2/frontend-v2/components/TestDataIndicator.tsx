'use client'

import React from 'react'

/**
 * TestDataIndicator component
 * Shows a small indicator when the app is running with test data
 */
export function TestDataIndicator() {
  // Only show in development or when test data is detected
  const isTestEnvironment = process.env.NODE_ENV === 'development' || 
                           process.env.NEXT_PUBLIC_TEST_MODE === 'true'
  
  if (!isTestEnvironment) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
        Test Mode
      </div>
    </div>
  )
}
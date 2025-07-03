'use client'

import React, { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import Link from 'next/link'

/**
 * TestDataIndicator component
 * Shows an indicator when the user has test data in their account
 */
export function TestDataIndicator() {
  const [hasTestData, setHasTestData] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkTestDataStatus = async () => {
      try {
        const data = await fetchAPI('/api/v1/test-data/status')
        setHasTestData(data.has_test_data)
      } catch (error) {
        console.error('Failed to check test data status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkTestDataStatus()
  }, [])

  // Don't show while loading or if no test data
  if (loading || !hasTestData) {
    return null
  }

  return (
    <Link href="/settings/test-data" className="fixed bottom-4 left-4 z-50 group">
      <div className="bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg flex items-center gap-2 hover:bg-blue-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>TEST MODE</span>
        <span className="text-blue-200 group-hover:text-white">→</span>
      </div>
    </Link>
  )
}
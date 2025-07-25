'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoading } from '@/components/LoadingStates'

/**
 * Redirect to unified analytics page with marketing tab
 * 
 * This page has been consolidated into the main analytics dashboard
 * to reduce duplication and improve user experience.
 */
export default function MarketingAnalyticsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to unified analytics with marketing tab selected
    router.replace('/analytics?tab=marketing')
  }, [router])

  return <PageLoading message="Redirecting to marketing analytics..." />
}
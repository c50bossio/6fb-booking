'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoading } from '@/components/LoadingStates'

/**
 * Redirect to unified analytics page with reviews tab
 * 
 * This page has been consolidated into the main analytics dashboard
 * to reduce duplication and improve user experience.
 */
export default function ReviewsAnalyticsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to unified analytics with reviews tab selected
    router.replace('/analytics?tab=reviews')
  }, [router])

  return <PageLoading message="Redirecting to review analytics..." />
}
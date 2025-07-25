'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoading } from '@/components/LoadingStates'

/**
 * Redirect to unified analytics page with revenue tab
 * 
 * Financial analytics has been consolidated into the main analytics dashboard
 * under the Revenue tab to reduce duplication and improve user experience.
 */
export default function FinanceAnalyticsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to unified analytics with revenue tab selected
    router.replace('/analytics?tab=revenue')
  }, [router])

  return <PageLoading message="Redirecting to financial analytics..." />
}
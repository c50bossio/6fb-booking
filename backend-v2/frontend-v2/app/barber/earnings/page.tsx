'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoading } from '@/components/LoadingStates'

/**
 * Redirect to consolidated finance earnings page
 * 
 * Earnings management has been moved to the finance hub
 * for unified financial tracking.
 */
export default function BarberEarningsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to finance earnings page
    router.replace('/finance/earnings')
  }, [router])

  return <PageLoading message="Redirecting to earnings..." />
}
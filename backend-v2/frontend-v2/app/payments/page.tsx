'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoading } from '@/components/LoadingStates'

/**
 * Redirect to finance hub
 * 
 * Payments have been consolidated into the comprehensive finance hub
 * for unified financial management.
 */
export default function PaymentsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to finance hub
    router.replace('/finance')
  }, [router])

  return <PageLoading message="Redirecting to finance center..." />
}
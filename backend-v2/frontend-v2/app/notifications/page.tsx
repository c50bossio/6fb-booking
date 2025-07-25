'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoading } from '@/components/LoadingStates'

/**
 * Redirect to marketing quick-send page
 * 
 * Notifications have been consolidated into the marketing suite
 * for a more integrated communication experience.
 */
export default function NotificationsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to marketing quick-send page
    router.replace('/marketing/quick-send')
  }, [router])

  return <PageLoading message="Redirecting to messaging center..." />
}
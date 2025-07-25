'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoading } from '@/components/LoadingStates'

/**
 * Redirect to consolidated services management page
 * 
 * Service management has been moved to its own dedicated section
 * for better organization and analytics integration.
 */
export default function AdminServicesRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to services page
    router.replace('/services')
  }, [router])

  return <PageLoading message="Redirecting to services..." />
}
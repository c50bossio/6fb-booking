'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { LoadingButton } from '@/components/LoadingStates'

// Dynamically import to avoid SSR issues
const OrganizationLandingPage = dynamic(
  () => import('@/components/OrganizationLandingPage'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingButton loading={true} loadingText="Loading">
            Loading...
          </LoadingButton>
          <p className="text-gray-600">Loading landing page...</p>
        </div>
      </div>
    )
  }
)

// Landing page data interface
interface LandingPageData {
  organization_id: number
  organization_name: string
  organization_slug: string
  description?: string
  phone?: string
  email?: string
  address?: string
  config: {
    enabled: boolean
    logo_url?: string
    primary_color: string
    accent_color: string
    background_preset: string
    custom_headline?: string
    show_testimonials: boolean
    testimonial_source: string
  }
  services: Array<{
    id: number
    name: string
    description?: string
    duration: number
    price: number
    is_featured: boolean
  }>
  testimonials: Array<{
    id: string
    reviewer_name: string
    review_text: string
    rating: number
    date: string
    source: string
    reviewer_photo_url?: string
  }>
  booking_url: string
  timezone: string
  last_updated: string
}

export default function OrganizationLandingPageRoute() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [landingData, setLandingData] = useState<LandingPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLandingPageData = async () => {
      try {
        setLoading(true)
        
        // Fetch landing page data from API
        const response = await fetch(`/api/v1/public/booking/landing/${slug}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Landing page not found or disabled')
          }
          throw new Error('Failed to fetch landing page data')
        }
        
        const data = await response.json()
        setLandingData(data)
        
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          setError('This landing page doesn\'t exist or has been disabled.')
        } else {
          setError('Failed to load landing page. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchLandingPageData()
    }
  }, [slug])

  // Track page view
  useEffect(() => {
    const trackPageView = async () => {
      if (landingData) {
        try {
          await fetch(`/api/v1/public/booking/landing/${slug}/track`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event_type: 'page_view',
              organization_slug: slug,
              session_id: sessionStorage.getItem('session_id') || undefined,
              metadata: {
                page_url: window.location.href,
                timestamp: new Date().toISOString()
              }
            })
          })
        } catch (error) {
          }
      }
    }

    trackPageView()
  }, [landingData, slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingButton loading={true} loadingText="Loading">
            Loading...
          </LoadingButton>
          <p className="text-gray-600">Loading landing page...</p>
        </div>
      </div>
    )
  }

  if (error || !landingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Page Not Found</h2>
            <p className="text-red-600 mb-4">
              {error || 'The page you\'re looking for doesn\'t exist.'}
            </p>
            <button 
              onClick={() => router.push('/')}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <OrganizationLandingPage
      slug={slug}
    />
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

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
        console.error('Failed to fetch landing page data:', err)
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
          console.error('Failed to track page view:', error)
        }
      }
    }

    trackPageView()
  }, [landingData, slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 bg-black rounded"></div>
            <h1 className="text-4xl font-bold text-gray-900">
              {landingData.organization_name}
            </h1>
          </div>
          {landingData.description && (
            <p className="text-xl text-gray-600 mb-4">
              {landingData.description}
            </p>
          )}
          {landingData.config.custom_headline && (
            <p className="text-lg text-gray-700 font-medium">
              {landingData.config.custom_headline}
            </p>
          )}
        </div>

        {/* Services */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Our Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {landingData.services.map((service) => (
              <div key={service.id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                  {service.is_featured && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Featured
                    </span>
                  )}
                </div>
                {service.description && (
                  <p className="text-gray-600 mb-4">{service.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">${service.price}</span>
                  <span className="text-sm text-gray-500">{service.duration} min</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Book Now Section */}
        <div className="text-center mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Book?</h3>
            <p className="text-gray-600 mb-6">Schedule your appointment today</p>
            <a
              href={landingData.booking_url}
              className="inline-block bg-black text-white px-8 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
            >
              Book Now
            </a>
          </div>
        </div>

        {/* Testimonials */}
        {landingData.config.show_testimonials && landingData.testimonials.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">What Our Clients Say</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {landingData.testimonials.slice(0, 6).map((testimonial) => (
                <div key={testimonial.id} className="bg-white rounded-lg shadow-md p-6 border">
                  <div className="flex items-center mb-4">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`h-4 w-4 ${i < testimonial.rating ? 'fill-current' : 'fill-gray-300'}`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">{testimonial.source}</span>
                  </div>
                  <p className="text-gray-700 mb-4">"{testimonial.review_text}"</p>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{testimonial.reviewer_name}</span>
                    <span className="ml-2">{new Date(testimonial.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="text-center bg-white rounded-lg shadow-md p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Us</h3>
          <div className="space-y-2 text-gray-600">
            {landingData.phone && (
              <p>
                <span className="font-medium">Phone:</span> {landingData.phone}
              </p>
            )}
            {landingData.email && (
              <p>
                <span className="font-medium">Email:</span> {landingData.email}
              </p>
            )}
            {landingData.address && (
              <p>
                <span className="font-medium">Address:</span> {landingData.address}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
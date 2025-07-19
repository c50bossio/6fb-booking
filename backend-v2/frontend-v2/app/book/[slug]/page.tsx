'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { LoadingButton } from '@/components/LoadingStates'

// Dynamically import to avoid SSR issues
const ConversionOptimizedBooking = dynamic(
  () => import('@/components/ConversionOptimizedBooking'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingButton loading={true}>Loading...</LoadingButton>
          <p className="text-gray-600">Loading booking system...</p>
        </div>
      </div>
    )
  }
)

// Organization/barber data interface
interface OrganizationData {
  id: number
  slug: string
  name: string
  description?: string
  barberName?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
  phone?: string
  email?: string
  address?: string
  customBranding?: {
    logoUrl?: string
    primaryColor?: string
    accentColor?: string
    welcomeMessage?: string
    services?: any[]
  }
}

export default function OrganizationBookingPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [organization, setOrganization] = useState<OrganizationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        setLoading(true)
        
        // Fetch organization data from API
        const response = await fetch(`/api/v2/public/booking/organization/${slug}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Organization not found')
          }
          throw new Error('Failed to fetch organization data')
        }
        
        const orgData = await response.json()
        
        const organizationData: OrganizationData = {
          id: orgData.id,
          slug: orgData.slug,
          name: orgData.name,
          description: orgData.description,
          barberName: orgData.barber_name,
          logoUrl: orgData.logo_url,
          primaryColor: orgData.primary_color || '#000000',
          accentColor: orgData.accent_color || '#FFD700',
          phone: orgData.phone,
          email: orgData.email,
          address: orgData.address
        }
        
        setOrganization(organizationData)
        
      } catch (err) {
        console.error('Failed to fetch organization data:', err)
        if (err instanceof Error && err.message === 'Organization not found') {
          setError('This booking page doesn\'t exist or has been disabled.')
        } else {
          setError('Failed to load booking page. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchOrganizationData()
    }
  }, [slug])

  // Helper functions to generate mock data based on slug
  const getShopName = (slug: string): string => {
    const shopNames: { [key: string]: string } = {
      'premium-cuts': 'Premium Cuts Barbershop',
      'classic-barber': 'Classic Barber Co.',
      'modern-cuts': 'Modern Cuts Studio',
      'elite-barbershop': 'Elite Barbershop',
      'gentlemen-cuts': 'Gentlemen\'s Cuts',
      'master-barber': 'Master Barber Lounge'
    }
    return shopNames[slug] || 'Professional Barbershop'
  }

  const getBarberName = (slug: string): string => {
    const barberNames: { [key: string]: string } = {
      'premium-cuts': 'Master Tony',
      'classic-barber': 'Carlos Rodriguez',
      'modern-cuts': 'Mike Johnson',
      'elite-barbershop': 'Antonio Silva',
      'gentlemen-cuts': 'David Martinez',
      'master-barber': 'Professional Barber'
    }
    return barberNames[slug] || 'Professional Barber'
  }

  const getPrimaryColor = (slug: string): string => {
    const colors: { [key: string]: string } = {
      'premium-cuts': '#1a1a1a',
      'classic-barber': '#8B4513',
      'modern-cuts': '#2563eb',
      'elite-barbershop': '#7c3aed',
      'gentlemen-cuts': '#059669',
      'master-barber': '#dc2626'
    }
    return colors[slug] || '#000000'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingButton loading={true}>Loading...</LoadingButton>
          <p className="text-gray-600">Loading booking page...</p>
        </div>
      </div>
    )
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Booking Page Not Found</h2>
            <p className="text-red-600 mb-4">
              {error || 'The booking page you\'re looking for doesn\'t exist.'}
            </p>
            <button 
              onClick={() => window.location.href = '/book'}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Go to General Booking
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ConversionOptimizedBooking
      organizationSlug={organization.slug}
      barberName={organization.barberName}
      shopName={organization.name}
      logoUrl={organization.logoUrl}
      primaryColor={organization.primaryColor}
      accentColor={organization.accentColor}
    />
  )
}


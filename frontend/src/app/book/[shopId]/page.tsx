'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Metadata } from 'next'
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  StarIcon,
  UserGroupIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { locationsService } from '@/lib/api/locations'
import { publicBookingService } from '@/lib/api/publicBooking'
import type { Location } from '@/lib/api'
import type { PublicBarberProfile, PublicServiceInfo } from '@/lib/api/publicBooking'

interface ShopInfo {
  location: Location
  barbers: PublicBarberProfile[]
  services: PublicServiceInfo[]
  stats: {
    totalBookings: number
    averageRating: number
    activeBarbers: number
  }
}

function ShopBookingContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const shopId = params.shopId as string
  const preselectedBarber = searchParams.get('barber')

  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadShopInfo()
  }, [shopId])

  const loadShopInfo = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load location details using public API endpoint
      const location = await publicBookingService.getShopInfo(parseInt(shopId))

      // Load barbers for this location using public API
      const barbers = await publicBookingService.getShopBarbers(parseInt(shopId))

      // Load services for this location using public API  
      const services = await publicBookingService.getShopServices(parseInt(shopId))

      // Calculate stats (in real app, this would come from API)
      const stats = {
        totalBookings: Math.floor(Math.random() * 1000) + 500,
        averageRating: 4.5 + Math.random() * 0.5,
        activeBarbers: barbers.length
      }

      setShopInfo({
        location,
        barbers,
        services,
        stats
      })
    } catch (error) {
      console.error('Failed to load shop info:', error)
      setError('Failed to load shop information. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBookNow = (barberId?: number) => {
    const bookingUrl = `/book/${shopId}/booking${barberId ? `?barber=${barberId}` : ''}`
    router.push(bookingUrl)
  }

  const formatRating = (rating: number) => {
    return rating.toFixed(1)
  }

  const formatBusinessHours = (hours: any) => {
    if (!hours) return 'Hours not available'
    // Simple format - in real app, this would be more sophisticated
    return 'Mon-Fri: 9AM-8PM, Sat: 9AM-6PM, Sun: 10AM-5PM'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shop information...</p>
        </div>
      </div>
    )
  }

  if (error || !shopInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <BuildingStorefrontIcon className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Shop Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The shop you\'re looking for doesn\'t exist or is currently unavailable.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const { location, barbers, services, stats } = shopInfo

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
              {/* Shop Info */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                  {location.name}
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  {location.description || 'Professional barbershop services'}
                </p>

                {/* Location & Contact */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-start">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-gray-900">{location.address}</p>
                      <p className="text-gray-600">{location.city}, {location.state} {location.zip_code}</p>
                    </div>
                  </div>

                  {location.phone && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <a href={`tel:${location.phone}`} className="text-slate-700 hover:text-slate-800">
                        {location.phone}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <p className="text-gray-600">{formatBusinessHours(location.business_hours)}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-700">{stats.totalBookings}+</div>
                    <div className="text-sm text-gray-600">Happy Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center">
                      <StarIcon className="h-5 w-5 text-yellow-400 mr-1" />
                      <span className="text-2xl font-bold text-slate-700">{formatRating(stats.averageRating)}</span>
                    </div>
                    <div className="text-sm text-gray-600">Average Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-700">{stats.activeBarbers}</div>
                    <div className="text-sm text-gray-600">Expert Barbers</div>
                  </div>
                </div>

                {/* Main CTA */}
                <div className="mt-8">
                  <button
                    onClick={() => handleBookNow()}
                    className="w-full sm:w-auto px-8 py-3 bg-slate-700 text-white text-lg font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center sm:justify-start"
                  >
                    Book Appointment Now
                    <ArrowRightIcon className="h-5 w-5 ml-2" />
                  </button>
                </div>
              </div>

              {/* Shop Image Placeholder */}
              <div className="mt-8 lg:mt-0">
                <div className="aspect-w-16 aspect-h-10 lg:aspect-w-4 lg:aspect-h-3">
                  <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                    <div className="text-center p-8">
                      <BuildingStorefrontIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600 font-medium">{location.name}</p>
                      <p className="text-slate-500 text-sm mt-1">Professional Barbershop</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Preview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Our Services</h2>
            <p className="text-gray-600 mt-2">Choose from our range of professional services</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.slice(0, 6).map((service) => (
              <div key={service.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                {service.description && (
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2">{service.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {service.duration_minutes}min
                  </div>
                  <div className="text-lg font-semibold text-slate-700">
                    ${service.base_price}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {services.length > 6 && (
            <div className="text-center mt-8">
              <button
                onClick={() => handleBookNow()}
                className="px-6 py-2 text-slate-700 font-medium hover:text-slate-800"
              >
                View All Services →
              </button>
            </div>
          )}
        </div>

        {/* Our Team */}
        <div className="bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Choose Your Barber</h2>
              <p className="text-gray-600 mt-2">Select a specific barber or let us choose the best available professional for you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* No Preference Option */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 text-center border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-gradient-to-br hover:from-slate-100 hover:to-slate-200 transition-all">
                <div className="w-20 h-20 bg-slate-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <UserGroupIcon className="h-10 w-10 text-slate-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  No Preference
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Let us match you with the best available barber based on your service and schedule
                </p>
                <div className="text-xs text-slate-500 mb-4 px-2">
                  ✨ We'll select based on availability, expertise, and current workload
                </div>
                <button
                  onClick={() => handleBookNow()}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors border border-slate-600"
                >
                  Book with Any Barber
                </button>
              </div>

              {barbers.map((barber) => (
                <div key={barber.id} className="bg-gray-50 rounded-lg p-6 text-center hover:bg-gray-100 transition-colors border border-gray-200">
                  <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <UserGroupIcon className="h-10 w-10 text-slate-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {barber.first_name} {barber.last_name}
                  </h3>
                  {barber.specialties && barber.specialties.length > 0 ? (
                    <p className="text-gray-600 text-sm mt-1">{barber.specialties[0]}</p>
                  ) : (
                    <p className="text-gray-600 text-sm mt-1">Professional Barber</p>
                  )}
                  {barber.average_rating ? (
                    <div className="flex items-center justify-center mt-2">
                      <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-gray-600">{formatRating(barber.average_rating)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center mt-2">
                      <StarIcon className="h-4 w-4 text-gray-300 mr-1" />
                      <span className="text-sm text-gray-500">New team member</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2 mb-3">
                    Choose this barber specifically for your appointment
                  </div>
                  <button
                    onClick={() => handleBookNow(barber.id)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preselectedBarber === barber.id.toString()
                        ? 'bg-slate-700 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Book with {barber.first_name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-slate-700 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Book Your Appointment?</h2>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              Experience professional barbering services with our skilled team. Book online in just a few clicks.
            </p>
            <button
              onClick={() => handleBookNow()}
              className="px-8 py-3 bg-white text-slate-700 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-md"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ShopBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shop information...</p>
        </div>
      </div>
    }>
      <ShopBookingContent />
    </Suspense>
  )
}

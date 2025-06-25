'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import MobileBookingFlow from '@/components/booking/MobileBookingFlow'
import '@/styles/mobile-booking.css'

// Dynamically import heavy components for better mobile performance
const BookingFlow = dynamic(() => import('@/components/booking/BookingFlow'), {
  loading: () => <MobileLoadingScreen />
})

function MobileLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white dark:bg-[#1A1B23] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#20D9D2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-[#8B92A5]">Preparing your booking experience...</p>
      </div>
    </div>
  )
}

export default function MobileBookingPage() {
  const params = useParams()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)

      // Add mobile-specific viewport meta tags
      if (mobile) {
        const viewport = document.querySelector('meta[name=viewport]')
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
        }
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Add mobile-specific body classes
    document.body.classList.add('mobile-no-select', 'mobile-no-zoom')

    // Prevent pull-to-refresh on mobile
    let startY = 0
    const preventPullToRefresh = (e: TouchEvent) => {
      const touch = e.touches[0]
      const currentY = touch.clientY

      if (startY === 0) {
        startY = currentY
      }

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      if (scrollTop === 0 && currentY > startY) {
        e.preventDefault()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
    }

    const handleTouchEnd = () => {
      startY = 0
    }

    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart, { passive: false })
      document.addEventListener('touchmove', preventPullToRefresh, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      window.removeEventListener('resize', checkMobile)
      document.body.classList.remove('mobile-no-select', 'mobile-no-zoom')
      if (isMobile) {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchmove', preventPullToRefresh)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isMobile])

  const handleClose = () => {
    setIsOpen(false)
    router.back()
  }

  const handleComplete = (bookingData: any) => {
    console.log('Booking completed:', bookingData)
    // Handle booking completion
    router.push(`/booking-confirmation/${bookingData.appointmentId}`)
  }

  // Mock data - in production, this would come from API
  const mockServices = [
    {
      id: 'haircut',
      name: 'Classic Haircut',
      description: 'Professional cut and style',
      duration: 45,
      price: 35,
      category: 'Haircuts',
      isPopular: true
    },
    {
      id: 'fade',
      name: 'Fade Cut',
      description: 'Modern fade with precision',
      duration: 60,
      price: 45,
      category: 'Haircuts',
      isPopular: true
    },
    {
      id: 'beard',
      name: 'Beard Trim',
      description: 'Shape and style your beard',
      duration: 30,
      price: 25,
      category: 'Grooming'
    }
  ]

  const mockBarbers = [
    {
      id: '1',
      name: 'John Smith',
      rating: 4.8,
      reviewCount: 127,
      specialties: ['Fades', 'Classic Cuts'],
      experience: '5 years',
      availability: {
        [new Date().toISOString().split('T')[0]]: ['09:00', '10:00', '11:00', '14:00', '15:00'],
        [new Date(Date.now() + 86400000).toISOString().split('T')[0]]: ['09:00', '10:00', '13:00', '14:00', '16:00']
      },
      isRecommended: true,
      nextAvailable: 'Today at 2:00 PM'
    },
    {
      id: '2',
      name: 'Mike Johnson',
      rating: 4.6,
      reviewCount: 89,
      specialties: ['Beard Styling', 'Modern Cuts'],
      experience: '3 years',
      availability: {
        [new Date().toISOString().split('T')[0]]: ['10:00', '11:00', '15:00', '16:00'],
        [new Date(Date.now() + 86400000).toISOString().split('T')[0]]: ['09:00', '11:00', '14:00', '15:00']
      },
      nextAvailable: 'Today at 3:00 PM'
    }
  ]

  if (!isMobile) {
    // For desktop, use regular booking flow
    return (
      <BookingFlow
        isOpen={isOpen}
        onClose={handleClose}
        onComplete={handleComplete}
        services={mockServices}
        barbers={mockBarbers}
        theme="light"
      />
    )
  }

  return (
    <>
      {/* Mobile-specific meta tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="theme-color" content="#20D9D2" />

      <MobileBookingFlow
        isOpen={isOpen}
        onClose={handleClose}
        onComplete={handleComplete}
        services={mockServices}
        barbers={mockBarbers}
        theme="light"
      />
    </>
  )
}

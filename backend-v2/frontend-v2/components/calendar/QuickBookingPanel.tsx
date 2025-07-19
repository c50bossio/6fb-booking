'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  Calendar,
  Zap,
  ChevronRight,
  Plus,
  RotateCcw,
  User
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { quickBooking, getNextAvailableSlot, getMyBookings, type NextAvailableSlot, type BookingResponse } from '@/lib/api'
import { formatTimeWithTimezone, getFriendlyDateLabel } from '@/lib/timezone'
import { toastSuccess, toastError } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { useResponsive } from '@/hooks/useResponsive'

interface QuickBookingPanelProps {
  onBookingComplete?: () => void
  className?: string
}

// Common services for quick booking
const QUICK_SERVICES = [
  { id: 'Haircut', name: 'Haircut', duration: 30, price: 30, icon: '✂️' },
  { id: 'Shave', name: 'Shave', duration: 20, price: 20, icon: '🪒' },
  { id: 'Haircut & Shave', name: 'Cut & Shave', duration: 45, price: 45, icon: '💈' },
]

export default function QuickBookingPanel({ 
  onBookingComplete,
  className = ''
}: QuickBookingPanelProps) {
  const router = useRouter()
  const { isMobile } = useResponsive()
  const [nextSlot, setNextSlot] = useState<NextAvailableSlot | null>(null)
  const [recentBookings, setRecentBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingService, setBookingService] = useState<string | null>(null)
  const [showAllServices, setShowAllServices] = useState(false)

  useEffect(() => {
    loadQuickBookingData()
  }, [])

  const loadQuickBookingData = async () => {
    try {
      setLoading(true)
      
      // Load next available slot
      const nextAvailable = await getNextAvailableSlot()
      setNextSlot(nextAvailable)
      
      // Load recent bookings for "Book Again" feature
      const bookingsResponse = await getMyBookings()
      const recent = bookingsResponse.bookings
        .filter(b => b.status === 'completed')
        .slice(0, 3)
      setRecentBookings(recent)
    } catch (error) {
      } finally {
      setLoading(false)
    }
  }

  const handleQuickBooking = async (service: string) => {
    if (!service) return

    setBookingService(service)
    
    try {
      const booking = await quickBooking({ service })
      
      toastSuccess(
        'Booking Confirmed!',
        `Your ${service} has been booked for the next available slot.`
      )
      
      if (onBookingComplete) {
        onBookingComplete()
      }
      
      // Redirect to booking details
      router.push(`/bookings/${booking.id}`)
    } catch (error: any) {
      toastError(
        'Booking Failed',
        error.message || 'Unable to create quick booking. Please try again.'
      )
    } finally {
      setBookingService(null)
    }
  }

  const handleRebooking = async (booking: BookingResponse) => {
    // For rebooking, use the same service
    await handleQuickBooking(booking.service_name)
  }

  const handleCustomBooking = () => {
    router.push('/book')
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayedServices = showAllServices ? QUICK_SERVICES : QUICK_SERVICES.slice(0, 2)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Quick Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Available Slot */}
        {nextSlot && (
          <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg border border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-primary-900 dark:text-primary-100">
                Next Available
              </h4>
              <Badge variant="default" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Fastest
              </Badge>
            </div>
            <p className="text-sm text-primary-700 dark:text-primary-300">
              {getFriendlyDateLabel(new Date(nextSlot.date))} at {formatTimeWithTimezone(nextSlot.time, false)}
            </p>
          </div>
        )}

        {/* Quick Service Selection */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Service
          </h4>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
            {displayedServices.map((service) => (
              <Button
                key={service.id}
                variant="outline"
                size="sm"
                onClick={() => handleQuickBooking(service.id)}
                disabled={bookingService === service.id}
                className="justify-start gap-2 h-auto py-3"
              >
                <span className="text-lg">{service.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{service.name}</div>
                  <div className="text-xs text-gray-500">
                    {service.duration}min • ${service.price}
                  </div>
                </div>
                {bookingService === service.id && (
                  <div className="ml-auto">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                  </div>
                )}
              </Button>
            ))}
          </div>
          
          {!showAllServices && QUICK_SERVICES.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllServices(true)}
              className="w-full mt-2 text-primary-600"
            >
              Show More Services
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Book Again - Recent Services */}
        {recentBookings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Book Again
            </h4>
            <div className="space-y-2">
              {recentBookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => handleRebooking(booking)}
                  className="w-full p-3 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {booking.service_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Last: {format(new Date(booking.start_time), 'MMM d')} with {booking.barber_name}
                      </div>
                    </div>
                    <RotateCcw className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Booking */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={handleCustomBooking}
            className="justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Custom Appointment
          </Button>
        </div>

        {/* Keyboard Shortcuts (Desktop) */}
        {!isMobile && (
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Cmd+B</kbd>
              <span>Quick booking</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Cmd+Shift+B</kbd>
              <span>Custom booking</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
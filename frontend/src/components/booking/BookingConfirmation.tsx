'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SuccessAnimation } from '@/components/ui/success-animation'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  CreditCard,
  Download,
  Share2,
  CheckCircle
} from 'lucide-react'

export interface BookingDetails {
  id: string
  confirmationNumber: string
  service: {
    name: string
    duration: number
    price: number
  }
  barber: {
    name: string
    email: string
    phone?: string
  }
  location: {
    name: string
    address: string
    city: string
    state: string
    zip: string
    phone: string
  }
  appointmentDate: string
  appointmentTime: string
  status: 'confirmed' | 'pending' | 'cancelled'
  paymentStatus: 'paid' | 'pending' | 'not_required'
  clientInfo: {
    name: string
    email: string
    phone?: string
  }
  notes?: string
  createdAt: string
}

export interface BookingConfirmationProps {
  booking: BookingDetails
  onNewBooking?: () => void
  onViewBookings?: () => void
  className?: string
  showAnimation?: boolean
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  booking,
  onNewBooking,
  onViewBookings,
  className,
  showAnimation = true
}) => {
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const formattedHour = hour % 12 || 12
    return `${formattedHour}:${minutes} ${ampm}`
  }

  const handleAddToCalendar = () => {
    const startDate = new Date(`${booking.appointmentDate} ${booking.appointmentTime}`)
    const endDate = new Date(startDate.getTime() + booking.service.duration * 60000)

    const event = {
      title: `${booking.service.name} with ${booking.barber.name}`,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: `${booking.location.name}, ${booking.location.address}, ${booking.location.city}, ${booking.location.state} ${booking.location.zip}`,
      description: `Booking confirmation: ${booking.confirmationNumber}`
    }

    // Create Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate.toISOString().replace(/-|:|\.\d\d\d/g, '')}/${endDate.toISOString().replace(/-|:|\.\d\d\d/g, '')}&location=${encodeURIComponent(event.location)}&details=${encodeURIComponent(event.description)}`

    window.open(googleCalendarUrl, '_blank')
  }

  const handleShare = () => {
    setShowShareOptions(!showShareOptions)
  }

  const handleCopyLink = () => {
    const bookingUrl = `${window.location.origin}/booking/${booking.confirmationNumber}`
    navigator.clipboard.writeText(bookingUrl)
    setCopiedToClipboard(true)
    setTimeout(() => setCopiedToClipboard(false), 2000)
  }

  const handleDownloadConfirmation = () => {
    // In a real app, this would generate a PDF
    const confirmationText = `
Booking Confirmation
Confirmation Number: ${booking.confirmationNumber}

Service: ${booking.service.name}
Barber: ${booking.barber.name}
Date: ${formatDate(booking.appointmentDate)}
Time: ${formatTime(booking.appointmentTime)}
Duration: ${booking.service.duration} minutes
Price: $${booking.service.price}

Location:
${booking.location.name}
${booking.location.address}
${booking.location.city}, ${booking.location.state} ${booking.location.zip}
Phone: ${booking.location.phone}

Your Information:
${booking.clientInfo.name}
${booking.clientInfo.email}
${booking.clientInfo.phone || 'Not provided'}

Status: ${booking.status}
Payment: ${booking.paymentStatus}
    `.trim()

    const blob = new Blob([confirmationText], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `booking-confirmation-${booking.confirmationNumber}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      {showAnimation && (
        <div className="mb-6">
          <SuccessAnimation />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            Booking Confirmed!
          </CardTitle>
          <p className="text-center text-gray-600">
            Your appointment has been successfully booked
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Confirmation Number */}
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Confirmation Number</p>
            <p className="text-2xl font-mono font-bold">{booking.confirmationNumber}</p>
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">Date & Time</p>
                <p className="text-gray-600">
                  {formatDate(booking.appointmentDate)} at {formatTime(booking.appointmentTime)}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">Barber</p>
                <p className="text-gray-600">{booking.barber.name}</p>
                {booking.barber.phone && (
                  <p className="text-sm text-gray-500">{booking.barber.phone}</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-gray-600">{booking.location.name}</p>
                <p className="text-sm text-gray-500">
                  {booking.location.address}<br />
                  {booking.location.city}, {booking.location.state} {booking.location.zip}
                </p>
                <p className="text-sm text-gray-500">{booking.location.phone}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">Service</p>
                <p className="text-gray-600">{booking.service.name}</p>
                <p className="text-sm text-gray-500">
                  {booking.service.duration} minutes • ${booking.service.price}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">Payment Status</p>
                <Badge
                  variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {booking.paymentStatus === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                </Badge>
              </div>
            </div>

            {booking.notes && (
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Notes</p>
                  <p className="text-gray-600">{booking.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t space-y-3">
            <div className="flex space-x-3">
              <Button
                onClick={handleAddToCalendar}
                variant="outline"
                className="flex-1"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
              <Button
                onClick={handleDownloadConfirmation}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="relative">
              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Booking
              </Button>

              {showShareOptions && (
                <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg p-2 z-10">
                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    {copiedToClipboard ? 'Copied!' : 'Copy booking link'}
                  </button>
                  <button
                    onClick={() => {
                      window.open(`mailto:?subject=Booking Confirmation&body=I have a booking on ${formatDate(booking.appointmentDate)} at ${formatTime(booking.appointmentTime)} with ${booking.barber.name}. Confirmation number: ${booking.confirmationNumber}`)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    Email confirmation
                  </button>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              {onNewBooking && (
                <Button onClick={onNewBooking} className="flex-1">
                  Book Another Appointment
                </Button>
              )}
              {onViewBookings && (
                <Button onClick={onViewBookings} variant="outline" className="flex-1">
                  View All Bookings
                </Button>
              )}
            </div>
          </div>

          {/* Confirmation Email Notice */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Confirmation email sent</p>
                <p className="text-blue-700 mt-1">
                  We've sent a confirmation email to {booking.clientInfo.email} with all the booking details.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BookingConfirmation

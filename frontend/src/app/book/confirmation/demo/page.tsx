'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RecurringBookingModal from '@/components/booking/RecurringBookingModal'
import {
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowLeftIcon,
  ShareIcon,
  PrinterIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

// Demo data
const demoBooking = {
  status: "confirmed",
  appointment: {
    id: 123,
    date: "2025-06-26",
    time: "14:30:00",
    service: "Classic Cut & Style",
    duration: "45 minutes",
    price: "$45.00",
    status: "scheduled"
  },
  barber: {
    name: "John Smith",
    business_name: "Elite Cuts Studio"
  },
  client: {
    name: "Demo Customer",
    email: "demo@example.com",
    phone: "+1 (555) 123-4567"
  },
  location: {
    name: "Main Shop",
    address: "123 Main Street, Downtown City, CA 90210"
  }
}

export default function DemoConfirmationPage() {
  const router = useRouter()
  const [booking] = useState(demoBooking)
  const [showRecurringModal, setShowRecurringModal] = useState(false)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr: string) => {
    const time = new Date(`2000-01-01 ${timeStr}`)
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Booking Confirmation',
          text: `Appointment with ${booking.barber.name} on ${formatDate(booking.appointment.date)}`,
          url: window.location.href,
        })
      } catch (err) {
        // Fallback to clipboard
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Confirmation link copied to clipboard!')
  }

  const addToCalendar = () => {
    const startDate = new Date(`${booking.appointment.date} ${booking.appointment.time}`)
    const endDate = new Date(startDate.getTime() + (45 * 60000)) // 45 minutes

    const title = `${booking.appointment.service} with ${booking.barber.name}`
    const details = `Appointment Details:
Service: ${booking.appointment.service}
Barber: ${booking.barber.name}
Location: ${booking.location.name}
Price: ${booking.appointment.price}

Confirmation ID: ${booking.appointment.id}`

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(booking.location.name + (booking.location.address ? ', ' + booking.location.address : ''))}`

    window.open(calendarUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back
            </button>

            <div className="text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                DEMO CONFIRMATION PAGE
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleShare}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ShareIcon className="h-5 w-5 mr-1" />
                Share
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <PrinterIcon className="h-5 w-5 mr-1" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Success Header */}
          <div className="bg-green-50 px-6 py-8 text-center border-b border-green-100">
            <CheckCircleSolidIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">Your appointment has been successfully booked.</p>
            <p className="text-sm text-gray-500 mt-2">Confirmation ID: #{booking.appointment.id}</p>
          </div>

          {/* Appointment Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Appointment Info */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h2>

                  <div className="space-y-4">
                    <div className="flex items-start">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{formatDate(booking.appointment.date)}</p>
                        <p className="text-sm text-gray-500">Date</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{formatTime(booking.appointment.time)}</p>
                        <p className="text-sm text-gray-500">{booking.appointment.duration}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.barber.name}</p>
                        <p className="text-sm text-gray-500">
                          {booking.barber.business_name || 'Your Barber'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.location.name}</p>
                        {booking.location.address && (
                          <p className="text-sm text-gray-500">{booking.location.address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Service & Pricing</h3>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{booking.appointment.service}</p>
                        <p className="text-sm text-gray-500">{booking.appointment.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{booking.appointment.price}</p>
                        <p className="text-sm text-gray-500">Total</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Contact & Actions */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{booking.client.email}</span>
                    </div>

                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{booking.client.phone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

                  <div className="space-y-3">
                    <button
                      onClick={addToCalendar}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      Add to Calendar
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => alert('Reschedule functionality would be implemented here')}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Reschedule
                      </button>

                      <button
                        onClick={() => alert('Cancel functionality would be implemented here')}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                      >
                        <XMarkIcon className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• You'll receive a confirmation email shortly</li>
                    <li>• Please arrive 5 minutes before your appointment</li>
                    <li>• Bring a valid ID for verification</li>
                    <li>• Contact us if you need to make changes</li>
                  </ul>
                </div>

                {/* Recurring Appointment Upsell */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CalendarIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <h4 className="font-medium text-green-900 mb-2">💡 Save with Recurring Appointments</h4>
                      <p className="text-sm text-green-800 mb-3">
                        Never miss your regular cut! Set up recurring appointments and save <strong>15% on every visit</strong>.
                      </p>
                      <div className="space-y-2 text-sm text-green-700">
                        <div className="flex justify-between">
                          <span>Regular price:</span>
                          <span>$45.00 per appointment</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>With recurring discount:</span>
                          <span className="text-green-600">$38.25 per appointment</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-green-200 pt-2">
                          <span>Annual savings (monthly cuts):</span>
                          <span className="font-bold text-green-600">$81.00</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowRecurringModal(true)}
                        className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Set Up Recurring Appointments
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 print:hidden">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <div className="text-sm text-gray-500">
                Need help? Contact us at support@6fbplatform.com
              </div>

              <button
                onClick={() => router.push('/book')}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recurring Booking Modal */}
      <RecurringBookingModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        currentBooking={{
          service: booking.appointment.service,
          barber: booking.barber.name,
          price: booking.appointment.price,
          duration: booking.appointment.duration,
          date: formatDate(booking.appointment.date),
          time: formatTime(booking.appointment.time)
        }}
        onCreateSeries={(seriesData) => {
          console.log('Creating series:', seriesData)
          alert('Recurring appointments set up successfully!')
          setShowRecurringModal(false)
        }}
      />
    </div>
  )
}

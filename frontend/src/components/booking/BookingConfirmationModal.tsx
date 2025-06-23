'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'

interface BookingConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  booking: {
    confirmation_number: string
    service_name: string
    barber_name: string
    appointment_date: string
    appointment_time: string
    duration: number
    price: number
    client_name: string
    client_email?: string
    client_phone?: string
    location?: {
      name: string
      address: string
      city: string
      state: string
      zip: string
    }
  }
  onNewBooking?: () => void
}

export default function BookingConfirmationModal({
  isOpen,
  onClose,
  booking,
  onNewBooking
}: BookingConfirmationModalProps) {
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
    const [hours, minutes] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':')
    const startDate = new Date()
    startDate.setHours(parseInt(hours), parseInt(minutes))
    const endDate = new Date(startDate.getTime() + duration * 60000)
    return endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left align-middle shadow-xl transition-all">
                {/* Success Icon */}
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" aria-hidden="true" />
                </div>

                {/* Title */}
                <div className="mt-3 text-center">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    Booking Confirmed!
                  </Dialog.Title>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Confirmation #{booking.confirmation_number}
                  </p>
                </div>

                {/* Booking Details */}
                <div className="mt-6 space-y-4">
                  {/* Service & Barber */}
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                    <div className="flex items-start">
                      <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{booking.service_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">with {booking.barber_name}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">${booking.price}</p>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                    <div className="flex items-start">
                      <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(booking.appointment_date)}</p>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatTime(booking.appointment_time)} - {getEndTime(booking.appointment_time, booking.duration)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Client Information</p>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 dark:text-gray-300">{booking.client_name}</p>
                      {booking.client_email && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {booking.client_email}
                        </div>
                      )}
                      {booking.client_phone && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          {booking.client_phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {booking.location && (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{booking.location.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {booking.location.address}<br />
                        {booking.location.city}, {booking.location.state} {booking.location.zip}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmation Note */}
                <div className="mt-6 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    A confirmation email has been sent to {booking.client_email || 'the client'}.
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                  {onNewBooking && (
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                      onClick={() => {
                        onClose()
                        onNewBooking()
                      }}
                    >
                      Book Another
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

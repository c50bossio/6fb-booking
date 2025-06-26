'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  CheckIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface RecurringBookingModalProps {
  isOpen: boolean
  onClose: () => void
  currentBooking: {
    service: string
    barber: string
    price: string
    duration: string
    date: string
    time: string
  }
  onCreateSeries?: (seriesData: any) => void
}

type RecurrenceOption = {
  id: string
  name: string
  description: string
  frequency: string
  savings: number
  popular?: boolean
}

const recurrenceOptions: RecurrenceOption[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    description: 'Perfect for regular maintenance',
    frequency: 'Every 4 weeks',
    savings: 15,
    popular: true
  },
  {
    id: 'biweekly',
    name: 'Bi-Weekly',
    description: 'Stay sharp with frequent cuts',
    frequency: 'Every 2 weeks',
    savings: 12
  },
  {
    id: 'every6weeks',
    name: 'Every 6 Weeks',
    description: 'Longer styles, less frequent',
    frequency: 'Every 6 weeks',
    savings: 10
  },
  {
    id: 'weekly',
    name: 'Weekly',
    description: 'Premium maintenance',
    frequency: 'Every week',
    savings: 20
  }
]

export default function RecurringBookingModal({
  isOpen,
  onClose,
  currentBooking,
  onCreateSeries
}: RecurringBookingModalProps) {
  const [selectedOption, setSelectedOption] = useState<RecurrenceOption>(recurrenceOptions[0])
  const [startDate, setStartDate] = useState('')
  const [preferredTime, setPreferredTime] = useState(currentBooking.time)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const basePrice = parseFloat(currentBooking.price.replace('$', ''))
  const discountedPrice = basePrice * (1 - selectedOption.savings / 100)
  const annualSavings = (basePrice - discountedPrice) * (52 / getWeeksInterval(selectedOption.id))

  function getWeeksInterval(optionId: string): number {
    const intervals = {
      weekly: 1,
      biweekly: 2,
      monthly: 4,
      every6weeks: 6
    }
    return intervals[optionId as keyof typeof intervals] || 4
  }

  const handleSubmit = async () => {
    if (!startDate) {
      alert('Please select a start date')
      return
    }

    setIsSubmitting(true)

    const seriesData = {
      recurrence_pattern: selectedOption.id,
      preferred_time: preferredTime,
      start_date: startDate,
      series_discount_percent: selectedOption.savings,
      max_appointments: 12, // One year by default
      is_flexible_time: true,
      notes: `Recurring ${selectedOption.name.toLowerCase()} appointments`
    }

    try {
      if (onCreateSeries) {
        await onCreateSeries(seriesData)
      } else {
        // Placeholder for actual API call
        await new Promise(resolve => setTimeout(resolve, 2000))
        alert('Recurring appointments set up successfully!')
        onClose()
      }
    } catch (error) {
      alert('Failed to set up recurring appointments. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    Set Up Recurring Appointments
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Current Booking Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Your Current Appointment</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Service:</strong> {currentBooking.service}</p>
                    <p><strong>Barber:</strong> {currentBooking.barber}</p>
                    <p><strong>Date & Time:</strong> {currentBooking.date} at {currentBooking.time}</p>
                    <p><strong>Price:</strong> {currentBooking.price}</p>
                  </div>
                </div>

                {/* Recurrence Options */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-4">Choose Your Schedule</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recurrenceOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedOption(option)}
                        className={`relative p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                          selectedOption.id === option.id
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option.popular && (
                          <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                            <StarIcon className="h-3 w-3 mr-1" />
                            Popular
                          </span>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{option.name}</h4>
                          <span className="text-green-600 font-bold text-sm">{option.savings}% OFF</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{option.description}</p>
                        <p className="text-xs text-gray-500">{option.frequency}</p>
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500 line-through">${basePrice.toFixed(2)}</span>
                          <span className="ml-2 font-bold text-green-600">
                            ${(basePrice * (1 - option.savings / 100)).toFixed(2)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Savings Summary */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-green-900 mb-2">💰 Your Savings</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-700">Per appointment:</p>
                      <p className="font-bold text-green-800">
                        Save ${(basePrice - discountedPrice).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700">Annual savings:</p>
                      <p className="font-bold text-green-800">
                        Save ${annualSavings.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Schedule Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Time
                    </label>
                    <input
                      type="time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">✨ Benefits of Recurring Appointments</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Guaranteed time slots with your preferred barber</li>
                    <li>• Automatic reminders so you never miss an appointment</li>
                    <li>• Flexible rescheduling when needed</li>
                    <li>• Consistent grooming schedule for best results</li>
                    <li>• Cancel anytime without penalty</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !startDate}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Setting Up...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Set Up Recurring Appointments
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

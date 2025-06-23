'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface AppointmentForm {
  client_name: string
  client_phone: string
  client_email: string
  barber_id: string
  service: string
  date: string
  time: string
  duration: number
  price: number
  notes: string
}

export default function NewAppointmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<AppointmentForm>({
    client_name: '',
    client_phone: '',
    client_email: '',
    barber_id: '',
    service: '',
    date: '',
    time: '',
    duration: 60,
    price: 45,
    notes: ''
  })

  const services = [
    { id: 'haircut', name: 'Haircut', duration: 45, price: 45 },
    { id: 'beard-trim', name: 'Beard Trim', duration: 30, price: 25 },
    { id: 'haircut-beard', name: 'Haircut + Beard', duration: 75, price: 65 },
    { id: 'special-event', name: 'Special Event Cut', duration: 90, price: 85 },
    { id: 'consultation', name: 'Consultation', duration: 30, price: 0 }
  ]

  const barbers = [
    { id: '1', name: 'Marcus Johnson', specialty: 'Fades & Classic Cuts' },
    { id: '2', name: 'Sarah Mitchell', specialty: 'Beard Styling & Modern Cuts' },
    { id: '3', name: 'Carlos Rodriguez', specialty: 'Creative Styles & Color' },
    { id: '4', name: 'Tyler Brooks', specialty: 'Traditional & Wedding Cuts' }
  ]

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ]

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setForm(prev => ({
        ...prev,
        service: serviceId,
        duration: service.duration,
        price: service.price
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Here you would make the actual API call
      // await appointmentsService.create(form)

      // Show success and redirect
      alert('Appointment created successfully!')
      router.push('/dashboard/appointments')
    } catch (error) {
      console.error('Failed to create appointment:', error)
      alert('Failed to create appointment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/appointments')
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">New Appointment</h1>
                <p className="text-sm text-gray-600">Schedule a new appointment for a client</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Client Information */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Client Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.client_name}
                      onChange={(e) => setForm(prev => ({ ...prev, client_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.client_phone}
                      onChange={(e) => setForm(prev => ({ ...prev, client_phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={form.client_email}
                      onChange={(e) => setForm(prev => ({ ...prev, client_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Appointment Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barber *
                    </label>
                    <select
                      required
                      value={form.barber_id}
                      onChange={(e) => setForm(prev => ({ ...prev, barber_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="">Select a barber</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.name} - {barber.specialty}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service *
                    </label>
                    <select
                      required
                      value={form.service}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="">Select a service</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - ${service.price} ({service.duration} min)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time *
                    </label>
                    <select
                      required
                      value={form.time}
                      onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="">Select time</option>
                      {timeSlots.map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Service Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={form.duration}
                      onChange={(e) => setForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      min="15"
                      max="180"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4 inline mr-1" />
                      End time: {form.time && form.duration ?
                        new Date(new Date(`2000-01-01T${form.time}`).getTime() + form.duration * 60000).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        }) : '--:--'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || loadingData}
                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    <span>Create Appointment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

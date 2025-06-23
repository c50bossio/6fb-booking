'use client'

import { useState } from 'react'
import {
  XCircleIcon,
  UserGroupIcon,
  CreditCardIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'

interface AddBarberModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  // Basic Info
  first_name: string
  last_name: string
  email: string
  phone: string
  location_id: string

  // Payment Model
  payment_type: 'commission' | 'booth_rent' | 'hybrid'
  commission_rate: string
  booth_rent_amount: string
  rent_frequency: 'weekly' | 'monthly'

  // Payment Connections
  enable_stripe: boolean
  enable_square: boolean
}

const PRESET_PLANS = [
  {
    id: 'apprentice',
    name: 'Apprentice Barber',
    description: '40% commission + training support',
    payment_type: 'commission' as const,
    commission_rate: '40',
    booth_rent_amount: '0',
    icon: '🎓'
  },
  {
    id: 'new_barber',
    name: 'New Barber',
    description: '50% commission + $3 new client bonus',
    payment_type: 'commission' as const,
    commission_rate: '50',
    booth_rent_amount: '0',
    icon: '🌱'
  },
  {
    id: 'experienced',
    name: 'Experienced Barber',
    description: '65% commission + performance bonuses',
    payment_type: 'commission' as const,
    commission_rate: '65',
    booth_rent_amount: '0',
    icon: '⭐'
  },
  {
    id: 'booth_standard',
    name: 'Booth Rent Standard',
    description: '$300/week, barber keeps 100%',
    payment_type: 'booth_rent' as const,
    commission_rate: '0',
    booth_rent_amount: '300',
    icon: '🏠'
  },
  {
    id: 'booth_premium',
    name: 'Booth Rent Premium',
    description: '$500/week for premium location',
    payment_type: 'booth_rent' as const,
    commission_rate: '0',
    booth_rent_amount: '500',
    icon: '💎'
  },
  {
    id: 'hybrid',
    name: 'Hybrid Model',
    description: '$200/week + 30% commission',
    payment_type: 'hybrid' as const,
    commission_rate: '30',
    booth_rent_amount: '200',
    icon: '🔄'
  }
]

export default function AddBarberModal({ isOpen, onClose, onSuccess }: AddBarberModalProps) {
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location_id: '',
    payment_type: 'commission',
    commission_rate: '50',
    booth_rent_amount: '0',
    rent_frequency: 'weekly',
    enable_stripe: false,
    enable_square: false
  })

  const [selectedPreset, setSelectedPreset] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const selectPreset = (preset: typeof PRESET_PLANS[0]) => {
    setSelectedPreset(preset.id)
    setFormData(prev => ({
      ...prev,
      payment_type: preset.payment_type,
      commission_rate: preset.commission_rate,
      booth_rent_amount: preset.booth_rent_amount
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const token = localStorage.getItem('access_token')
      const headers = { Authorization: `Bearer ${token}` }

      // Create barber
      const barberData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        location_id: formData.location_id ? parseInt(formData.location_id) : null,
        commission_rate: parseFloat(formData.commission_rate)
      }

      const barberResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/barbers`,
        barberData,
        { headers }
      )

      const barberId = barberResponse.data.id

      // Create payment model
      const paymentData = {
        barber_id: barberId,
        payment_type: formData.payment_type,
        service_commission_rate: formData.payment_type !== 'booth_rent' ? parseFloat(formData.commission_rate) : 0,
        product_commission_rate: 15.0, // Default 15%
        booth_rent_amount: formData.payment_type !== 'commission' ? parseFloat(formData.booth_rent_amount) : 0,
        rent_frequency: formData.rent_frequency,
        rent_due_day: 1,
        auto_collect_rent: true,
        auto_pay_commissions: false
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/barber-payments/payment-models/`,
        paymentData,
        { headers }
      )

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating barber:', error)
      setErrors({ submit: 'Failed to create barber. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Add New Barber</h2>
              <p className="text-gray-400 mt-1">Create a barber profile and configure payment settings in one step</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <UserGroupIcon className="h-5 w-5 mr-2 text-teal-400" />
                  Basic Information
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        First Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:border-teal-500 ${
                          errors.first_name ? 'border-red-500' : 'border-gray-600'
                        }`}
                      />
                      {errors.first_name && (
                        <p className="text-red-400 text-sm mt-1">{errors.first_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Last Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:border-teal-500 ${
                          errors.last_name ? 'border-red-500' : 'border-gray-600'
                        }`}
                      />
                      {errors.last_name && (
                        <p className="text-red-400 text-sm mt-1">{errors.last_name}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:border-purple-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-600'
                      }`}
                    />
                    {errors.email && (
                      <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Location
                      </label>
                      <select
                        name="location_id"
                        value={formData.location_id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="">Select Location</option>
                        <option value="1">Downtown Shop</option>
                        <option value="2">Uptown Premium</option>
                        <option value="3">Brooklyn Style</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Connections */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2 text-teal-400" />
                  Payment Connections
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      name="enable_stripe"
                      checked={formData.enable_stripe}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">Enable Stripe Connect</p>
                      <p className="text-gray-400 text-sm">Accept payments and automatic payouts via Stripe</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      name="enable_square"
                      checked={formData.enable_square}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">Enable Square Integration</p>
                      <p className="text-gray-400 text-sm">Sync with Square POS for product sales</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Model */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <InformationCircleIcon className="h-5 w-5 mr-2 text-teal-400" />
                  Compensation Plan
                </h3>

                {/* Preset Plans */}
                <div className="space-y-2 mb-6">
                  {PRESET_PLANS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset)}
                      className={`w-full p-4 rounded-lg border transition-all text-left ${
                        selectedPreset === preset.id
                          ? 'bg-teal-600/20 border-teal-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{preset.icon}</span>
                          <div>
                            <p className="font-medium">{preset.name}</p>
                            <p className="text-sm opacity-80">{preset.description}</p>
                          </div>
                        </div>
                        {selectedPreset === preset.id && (
                          <CheckCircleIcon className="h-5 w-5 text-teal-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Settings */}
                <div className="p-4 bg-gray-700/50 rounded-lg space-y-4">
                  <p className="text-sm text-gray-400 mb-3">Fine-tune the compensation details:</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Payment Type
                    </label>
                    <select
                      name="payment_type"
                      value={formData.payment_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="commission">Commission Only</option>
                      <option value="booth_rent">Booth Rent Only</option>
                      <option value="hybrid">Hybrid (Rent + Commission)</option>
                    </select>
                  </div>

                  {(formData.payment_type === 'commission' || formData.payment_type === 'hybrid') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        name="commission_rate"
                        value={formData.commission_rate}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  )}

                  {(formData.payment_type === 'booth_rent' || formData.payment_type === 'hybrid') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Booth Rent Amount ($)
                        </label>
                        <input
                          type="number"
                          name="booth_rent_amount"
                          value={formData.booth_rent_amount}
                          onChange={handleInputChange}
                          min="0"
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Rent Frequency
                        </label>
                        <select
                          name="rent_frequency"
                          value={formData.rent_frequency}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="mt-8 flex justify-end space-x-4 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Barber'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

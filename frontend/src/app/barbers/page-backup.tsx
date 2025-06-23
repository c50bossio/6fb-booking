'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import {
  ArrowLeftIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  PlusIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CreditCardIcon,
  HomeIcon,
  CogIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Barber {
  id: number
  user_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  location_id: number
  location_name?: string
  is_active: boolean
  is_verified: boolean
  rating?: number
  total_clients?: number
  total_revenue?: number
  sixfb_score?: number
  profile_image?: string
  specialties?: string[]
  payment_model?: BarberPaymentModel
}

interface BarberPaymentModel {
  barber_id: number
  payment_type: 'booth_rent' | 'commission'
  commission_rate?: number
  booth_rent_amount?: number
  booth_rent_frequency?: string
  stripe_connected: boolean
  square_connected: boolean
  rentpedi_connected: boolean
  stripe_account_id?: string
  square_merchant_id?: string
}

export default function BarbersPage() {
  const [loading, setLoading] = useState(true)
  const [barbers, setBarbers] = useState<Barber[]>([])
  const router = useRouter()

  useEffect(() => {
    fetchBarbers()
  }, [])

  const fetchBarbers = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const headers = { Authorization: `Bearer ${token}` }
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/barbers`,
        { headers }
      )

      setBarbers(response.data || [])
    } catch (error) {
      console.error('Failed to fetch barbers:', error)
      setBarbers([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading barbers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </a>
              <div>
                <h1 className="text-2xl font-bold text-white">Barbers</h1>
                <p className="text-sm text-gray-400">Manage your team and their accounts</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/add-barber-flow.html'}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Barber</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barbers.map((barber) => (
            <div key={barber.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {barber.first_name.charAt(0)}{barber.last_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {barber.first_name} {barber.last_name}
                    </h3>
                    <p className="text-sm text-gray-400">{barber.email}</p>
                  </div>
                </div>
              </div>

              {/* Payment Model Info */}
              {barber.payment_model && (
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-2">Payment Model</h4>
                  <p className="text-xs text-gray-300">
                    {barber.payment_model.payment_type === 'commission'
                      ? `Commission: ${barber.payment_model.commission_rate}%`
                      : `Booth Rent: $${barber.payment_model.booth_rent_amount}/${barber.payment_model.booth_rent_frequency}`
                    }
                  </p>

                  <div className="flex space-x-2 mt-2">
                    <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                      <span className="text-xs text-gray-400">Stripe</span>
                      {barber.payment_model.stripe_connected ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                      <span className="text-xs text-gray-400">Square</span>
                      {barber.payment_model.square_connected ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
                <div>
                  <p className="text-xs text-gray-400">Revenue</p>
                  <p className="text-sm font-semibold text-white">
                    ${barber.total_revenue || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">6FB Score</p>
                  <p className="text-sm font-semibold text-white">
                    {barber.sixfb_score || 0}/100
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

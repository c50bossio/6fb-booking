'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import ModernLayout from '@/components/ModernLayout'
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
  InformationCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon
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
  service_commission_rate?: number
  product_commission_rate?: number
  booth_rent_amount?: number
  booth_rent_frequency?: string
  stripe_connect_account_id?: string
  stripe_onboarding_completed: boolean
  stripe_payouts_enabled: boolean
  square_merchant_id?: string
  square_account_verified: boolean
  rentredi_tenant_id?: string
}

export default function BarbersPage() {
  const [loading, setLoading] = useState(true)
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [showAddBarber, setShowAddBarber] = useState(false)
  const [addBarberStep, setAddBarberStep] = useState(1) // 1 = Basic Info, 2 = Payment Setup
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location_id: '',
    payment_type: 'commission',
    commission_rate: '30'
  })
  const [newBarberConnections, setNewBarberConnections] = useState({
    stripe: false,
    square: false
  })
  const router = useRouter()

  useEffect(() => {
    fetchBarbers()
  }, [])

  const fetchBarbers = async () => {
    try {
      const token = localStorage.getItem('access_token')
      
      // Try authenticated endpoint first
      if (token) {
        try {
          const headers = { Authorization: `Bearer ${token}` }
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/barbers`,
            { headers }
          )
          setBarbers(response.data || [])
          return
        } catch (authError) {
          console.log('Auth failed, falling back to demo data')
        }
      }

      // Use demo data
      const demoResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboard/demo/barbers`
      )
      
      // Transform demo data to match expected format
      const transformedBarbers = demoResponse.data.map((barber: any) => ({
        ...barber,
        total_revenue: Math.floor(Math.random() * 50000) + 10000,
        total_clients: Math.floor(Math.random() * 200) + 50,
        sixfb_score: Math.floor(Math.random() * 40) + 60,
        rating: (Math.random() * 0.5 + 4.5).toFixed(1),
        location_name: 'Headlines Barbershop - Downtown',
        payment_model: {
          barber_id: barber.id,
          payment_type: barber.commission_rate ? 'commission' : 'booth_rent',
          service_commission_rate: barber.commission_rate ? barber.commission_rate / 100 : 0.3,
          product_commission_rate: 0.15,
          stripe_connect_account_id: barber.stripe_account_connected ? `acct_${barber.id}DEMO` : null,
          stripe_onboarding_completed: barber.stripe_account_connected,
          stripe_payouts_enabled: barber.stripe_account_connected,
          square_merchant_id: null,
          square_account_verified: false
        }
      }))
      
      setBarbers(transformedBarbers)
    } catch (error) {
      console.error('Failed to fetch barbers:', error)
      setBarbers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBarber = async (barberId: number, barberName: string) => {
    if (!confirm(`Are you sure you want to delete ${barberName}?`)) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const headers = { Authorization: `Bearer ${token}` }
      
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/barbers/${barberId}`,
        { headers }
      )

      // Refresh barbers list
      fetchBarbers()
    } catch (error) {
      console.error('Failed to delete barber:', error)
      console.error('Delete error details:', error.response?.data || error.message)
      alert(`Failed to delete barber: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleCreateBarber = async () => {
    try {
      console.log('🚀 Starting barber creation...')
      console.log('📋 Form data:', JSON.stringify(formData, null, 2))
      
      const token = localStorage.getItem('access_token')
      console.log('🔑 Token exists:', !!token)
      
      if (!token) {
        router.push('/login')
        return
      }

      // Create the barber first
      const headers = { Authorization: `Bearer ${token}` }
      const barberData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        location_id: 1
      }
      
      console.log('🏗️ Prepared barber data:', JSON.stringify(barberData, null, 2))

      // Skip OAuth testing for now to focus on barber creation
      console.log('⏭️ Skipping OAuth test, creating barber directly...')

      // Now create the barber  
      console.log('🌐 API URL:', process.env.NEXT_PUBLIC_API_URL)
      console.log('📤 Sending barber data:', JSON.stringify(barberData, null, 2))
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/barbers`,
        barberData,
        { headers }
      )

      const newBarber = response.data
      console.log('✅ Barber created:', newBarber)

      // Handle OAuth connections if selected
      if (newBarberConnections.stripe) {
        console.log('🔗 Initiating Stripe OAuth for barber:', newBarber.id)
        try {
          const stripeResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment-splits/connect-account`,
            {
              barber_id: newBarber.id,
              platform: 'stripe'
            },
            { headers }
          )

          if (stripeResponse.data.oauth_url) {
            console.log('📍 Stripe OAuth URL received:', stripeResponse.data.oauth_url)
            window.location.href = stripeResponse.data.oauth_url
            return
          }
        } catch (oauthError) {
          console.error('Stripe OAuth failed:', oauthError)
          alert('Stripe OAuth failed, but barber was created successfully.')
        }
      } else {
        console.log('✅ Barber created successfully! No OAuth connections requested.')
      }

      if (newBarberConnections.square) {
        console.log('🔗 Initiating Square OAuth for barber:', newBarber.id)
        try {
          const squareResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment-splits/connect-account`,
            {
              barber_id: newBarber.id,
              platform: 'square'
            },
            { headers }
          )

          if (squareResponse.data.oauth_url) {
            console.log('📍 Square OAuth URL received:', squareResponse.data.oauth_url)
            window.location.href = squareResponse.data.oauth_url
            return
          }
        } catch (oauthError) {
          console.error('Square OAuth failed:', oauthError)
        }
      }

      // Reset form and close modal
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        location_id: '',
        payment_type: 'commission',
        commission_rate: '30'
      })
      setNewBarberConnections({ stripe: false, square: false })
      setAddBarberStep(1)
      setShowAddBarber(false)
      
      // Refresh barbers list
      fetchBarbers()

    } catch (error) {
      console.error('Failed to create barber:', error)
      console.error('Error status:', error.response?.status)
      console.error('Error details:', JSON.stringify(error.response?.data, null, 2))
      console.error('Request URL:', error.config?.url)
      console.error('Request data:', JSON.stringify(error.config?.data, null, 2))
      
      let errorMsg = 'Unknown error'
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message
      } else if (error.message) {
        errorMsg = error.message
      }
      
      alert(`Failed to add barber: ${errorMsg}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search barbers..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                onChange={(e) => {
                  const search = e.target.value.toLowerCase()
                  const filtered = barbers.filter(b => 
                    b.first_name.toLowerCase().includes(search) ||
                    b.last_name.toLowerCase().includes(search) ||
                    b.email.toLowerCase().includes(search) ||
                    b.phone.includes(search)
                  )
                  // In a real app, you'd update state here
                }}
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent">
              <option value="all">All Status</option>
              <option value="connected">Stripe Connected</option>
              <option value="not-connected">Not Connected</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                // Export barbers data to CSV
                const csv = [
                  ['Name', 'Email', 'Phone', 'Revenue', '6FB Score', 'Stripe Connected'],
                  ...barbers.map(b => [
                    `${b.first_name} ${b.last_name}`,
                    b.email,
                    b.phone,
                    b.total_revenue || 0,
                    b.sixfb_score || 0,
                    b.payment_model?.stripe_connect_account_id ? 'Yes' : 'No'
                  ])
                ].map(row => row.join(',')).join('\n')
                
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `barbers-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
              }}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
              title="Export to CSV"
            >
              <DocumentTextIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => fetchBarbers()}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
              title="Refresh data"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowAddBarber(true)}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Barber</span>
            </button>
          </div>
        </div>
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Total Barbers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{barbers.length}</p>
          </div>
          
          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ${barbers.reduce((sum, b) => sum + (b.total_revenue || 0), 0).toLocaleString()}
            </p>
          </div>
          
          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Avg 6FB Score</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {barbers.length > 0 ? Math.round(barbers.reduce((sum, b) => sum + (b.sixfb_score || 0), 0) / barbers.length) : 0}
            </p>
          </div>
          
          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <LinkIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Connected</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {barbers.filter(b => b.payment_model?.stripe_connect_account_id).length}/{barbers.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barbers.map((barber) => (
            <div key={barber.id} className="premium-card-modern p-6 hover-lift relative overflow-visible">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {barber.first_name.charAt(0)}{barber.last_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {barber.first_name} {barber.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{barber.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBarber(barber.id, `${barber.first_name} ${barber.last_name}`)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                  title="Delete barber"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Payment Model Info */}
              <div className="mb-4 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <CreditCardIcon className="h-4 w-4 mr-2 text-violet-600" />
                  Payment Model
                </h4>
                <div className="bg-white/70 px-3 py-2 rounded-md mb-3">
                  <p className="text-sm text-gray-700">
                    {barber.payment_model?.payment_type === 'commission' 
                      ? `Commission Rate: ${barber.payment_model?.service_commission_rate ? (barber.payment_model.service_commission_rate * 100).toFixed(0) : '30'}%`
                      : `Booth Rent: $${barber.payment_model?.booth_rent_amount || '0'}/${barber.payment_model?.booth_rent_frequency || 'weekly'}`
                    }
                  </p>
                </div>
                  
                <div className="space-y-2">
                  {/* Stripe Connection */}
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-md border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Stripe</p>
                        <p className="text-xs text-gray-400">Instant payouts</p>
                      </div>
                    </div>
                    {barber.payment_model?.stripe_connect_account_id && barber.payment_model?.stripe_payouts_enabled ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <XCircleIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-sm text-gray-500">Not connected</span>
                      </div>
                    )}
                  </div>

                  {/* Square Connection */}
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-md border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.316 17.316L21 21v-9.578A2.421 2.421 0 0018.579 9h-9.578l3.684 3.684 2.21-2.211a1.526 1.526 0 012.211 0 1.58 1.58 0 010 2.211l-2.211 2.211a3.051 3.051 0 01-4.316 0l-2.105-2.105a1.526 1.526 0 010-2.211 1.58 1.58 0 012.211 0l.526.527L9 9H5.421A2.421 2.421 0 003 11.421V21l3.684-3.684 2.211 2.211a1.58 1.58 0 010 2.211 1.526 1.526 0 01-2.211 0l-2.211-2.211a3.051 3.051 0 010-4.316l2.105-2.105a1.58 1.58 0 012.211 0 1.526 1.526 0 010 2.211l-.526.526L9 15h9.579A2.421 2.421 0 0021 12.579V3l-3.684 3.684z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Square</p>
                        <p className="text-xs text-gray-400">Next-day payouts</p>
                      </div>
                    </div>
                    {barber.payment_model?.square_merchant_id && barber.payment_model?.square_account_verified ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <XCircleIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-sm text-gray-500">Not connected</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  {barber.payment_model?.stripe_connect_account_id ? (
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('access_token')
                          const response = await axios.get(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/stripe-connect/status/${barber.id}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                          )
                          
                          if (response.data.dashboard_url) {
                            window.open(response.data.dashboard_url, '_blank')
                          } else {
                            // Fallback for standard accounts
                            window.open('https://dashboard.stripe.com/settings/payouts', '_blank')
                          }
                        } catch (error) {
                          console.error('Failed to get dashboard URL:', error)
                          // Fallback to generic Stripe dashboard
                          window.open('https://dashboard.stripe.com/settings/payouts', '_blank')
                        }
                      }}
                      className="flex-1 text-sm bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 py-2 px-3 rounded-md transition-colors flex items-center justify-center font-medium"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      View Dashboard
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('access_token')
                          const response = await axios.post(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment-splits/connect-account`,
                            {
                              barber_id: barber.id,
                              platform: 'stripe'
                            },
                            { headers: { Authorization: `Bearer ${token}` } }
                          )
                          
                          if (response.data.oauth_url) {
                            window.location.href = response.data.oauth_url
                          }
                        } catch (error) {
                          console.error('Failed to initiate Stripe connection:', error)
                          alert('Failed to connect Stripe account')
                        }
                      }}
                      className="flex-1 text-sm bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 py-2 px-3 rounded-md transition-colors flex items-center justify-center font-medium"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Connect Stripe
                    </button>
                  )}
                  
                  {!barber.payment_model?.square_merchant_id && (
                    <button
                      onClick={() => alert('Square integration coming soon!')}
                      className="flex-1 text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 py-2 px-3 rounded-md transition-colors flex items-center justify-center font-medium"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Connect Square
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-3 border border-green-500/20">
                    <div className="flex items-center space-x-2 mb-1">
                      <CurrencyDollarIcon className="h-4 w-4 text-green-400" />
                      <p className="text-xs text-gray-300 font-medium">Revenue</p>
                    </div>
                    <p className="text-xl font-bold text-white">
                      ${(barber.total_revenue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-3 border border-purple-500/20 relative overflow-visible">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <ChartBarIcon className="h-4 w-4 text-purple-400" />
                        <p className="text-xs text-gray-300 font-medium">6FB Score</p>
                      </div>
                      <button
                        onClick={() => {
                          const scoreInfo = document.getElementById(`score-info-${barber.id}`)
                          if (scoreInfo) {
                            scoreInfo.classList.toggle('hidden')
                          }
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="What is 6FB Score?"
                      >
                        <InformationCircleIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {barber.sixfb_score || 10}<span className="text-sm text-gray-400">/100</span>
                    </p>
                    
                    {/* 6FB Score Explanation Popover */}
                    <div 
                      id={`score-info-${barber.id}`}
                      className="hidden absolute top-full left-0 right-0 mt-2 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto"
                      style={{ minWidth: '320px' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-white">What is 6FB Score?</h4>
                        <button
                          onClick={() => {
                            const scoreInfo = document.getElementById(`score-info-${barber.id}`)
                            if (scoreInfo) {
                              scoreInfo.classList.add('hidden')
                            }
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-300 mb-3">
                        The 6FB Score measures barber performance across 5 key areas:
                      </p>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-400 font-semibold">30%</span>
                          <div>
                            <span className="text-gray-200 font-medium">Booking Utilization:</span>
                            <span className="text-gray-400"> How full their schedule is</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-400 font-semibold">20%</span>
                          <div>
                            <span className="text-gray-200 font-medium">Revenue Growth:</span>
                            <span className="text-gray-400"> Week-over-week improvement</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-400 font-semibold">20%</span>
                          <div>
                            <span className="text-gray-200 font-medium">Customer Retention:</span>
                            <span className="text-gray-400"> % of returning clients</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-400 font-semibold">15%</span>
                          <div>
                            <span className="text-gray-200 font-medium">Average Ticket:</span>
                            <span className="text-gray-400"> Revenue per appointment</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-400 font-semibold">15%</span>
                          <div>
                            <span className="text-gray-200 font-medium">Service Quality:</span>
                            <span className="text-gray-400"> Based on tip percentage</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-400">
                          <span className="font-medium text-gray-300">Score Range:</span> 0-100
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          <span className="font-medium text-gray-300">Current Score:</span> {barber.sixfb_score || 10} = New barber (building data)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-3 border border-blue-500/20">
                    <div className="flex items-center space-x-2 mb-1">
                      <UserGroupIcon className="h-4 w-4 text-blue-400" />
                      <p className="text-xs text-gray-300 font-medium">Clients</p>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {barber.total_clients || 0}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-lg p-3 border border-yellow-500/20">
                    <div className="flex items-center space-x-2 mb-1">
                      <StarIcon className="h-4 w-4 text-yellow-400" />
                      <p className="text-xs text-gray-300 font-medium">Rating</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <p className="text-xl font-bold text-white">{barber.rating || '4.8'}</p>
                      <div className="flex space-x-0.5">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon 
                            key={i} 
                            className={`h-3 w-3 ${i < Math.floor(barber.rating || 4.8) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                <a href={`tel:${barber.phone}`} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group">
                  <PhoneIcon className="h-4 w-4 group-hover:text-green-400 transition-colors" />
                  <span className="text-sm">{barber.phone}</span>
                </a>
                <a href={`mailto:${barber.email}`} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group">
                  <EnvelopeIcon className="h-4 w-4 group-hover:text-blue-400 transition-colors" />
                  <span className="text-sm">{barber.email}</span>
                </a>
                {barber.location_name && (
                  <div className="flex items-center space-x-2 text-gray-400">
                    <MapPinIcon className="h-4 w-4 text-red-400" />
                    <span className="text-sm">{barber.location_name}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-gray-700 flex space-x-2">
                <button 
                  onClick={() => router.push(`/dashboard/appointments?barber=${barber.id}`)}
                  className="flex-1 text-sm bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-md transition-colors flex items-center justify-center"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule
                </button>
                <button 
                  onClick={() => {
                    // Show inline edit form
                    const editForm = document.getElementById(`edit-form-${barber.id}`)
                    if (editForm) {
                      editForm.classList.toggle('hidden')
                    }
                  }}
                  className="flex-1 text-sm bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-md transition-colors flex items-center justify-center"
                >
                  <CogIcon className="h-4 w-4 mr-2" />
                  Settings
                </button>
              </div>

              {/* Inline Edit Form */}
              <div id={`edit-form-${barber.id}`} className="hidden mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <CogIcon className="h-4 w-4 mr-2" />
                  Compensation & Settings
                </h4>
                <div className="space-y-4">
                  {/* Payment Model Selection */}
                  <div>
                    <label className="text-xs text-gray-400 font-medium">Payment Model</label>
                    <select
                      id={`payment-type-${barber.id}`}
                      defaultValue={barber.payment_model?.payment_type || 'commission'}
                      onChange={(e) => {
                        const value = e.target.value
                        const commissionFields = document.getElementById(`commission-fields-${barber.id}`)
                        const boothFields = document.getElementById(`booth-fields-${barber.id}`)
                        const hybridFields = document.getElementById(`hybrid-fields-${barber.id}`)
                        
                        commissionFields?.classList.add('hidden')
                        boothFields?.classList.add('hidden')
                        hybridFields?.classList.add('hidden')
                        
                        if (value === 'commission') commissionFields?.classList.remove('hidden')
                        else if (value === 'booth_rent') boothFields?.classList.remove('hidden')
                        else if (value === 'hybrid') hybridFields?.classList.remove('hidden')
                      }}
                      className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="commission">Commission Based</option>
                      <option value="booth_rent">Booth Rent</option>
                      <option value="hybrid">Hybrid (Commission + Rent)</option>
                    </select>
                  </div>

                  {/* Commission Fields */}
                  <div id={`commission-fields-${barber.id}`} className={barber.payment_model?.payment_type !== 'booth_rent' ? '' : 'hidden'}>
                    <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg">
                      <h5 className="text-xs font-semibold text-purple-400">Commission Settings</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Service Commission (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={(barber.payment_model?.service_commission_rate || 0.3) * 100}
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                            placeholder="30"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Product Commission (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={(barber.payment_model?.product_commission_rate || 0.15) * 100}
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                            placeholder="15"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Tip Handling</label>
                        <select className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
                          <option value="barber_keeps_all">Barber keeps 100% of tips</option>
                          <option value="split_tips">Split tips with shop</option>
                          <option value="pool_tips">Pool tips among team</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Booth Rent Fields */}
                  <div id={`booth-fields-${barber.id}`} className="hidden">
                    <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg">
                      <h5 className="text-xs font-semibold text-blue-400">Booth Rent Settings</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Rent Amount ($)</label>
                          <input
                            type="number"
                            min="0"
                            defaultValue={barber.payment_model?.booth_rent_amount || 500}
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                            placeholder="500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Frequency</label>
                          <select 
                            defaultValue={barber.payment_model?.booth_rent_frequency || 'weekly'}
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Rent Collection Method</label>
                        <select className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
                          <option value="auto_deduct">Auto-deduct from payments</option>
                          <option value="manual">Manual collection</option>
                          <option value="rentredi">RentRedi integration</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id={`late-fee-${barber.id}`} className="rounded" />
                        <label htmlFor={`late-fee-${barber.id}`} className="text-xs text-gray-300">
                          Charge late fee (5% after 3 days)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Hybrid Fields */}
                  <div id={`hybrid-fields-${barber.id}`} className="hidden">
                    <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg">
                      <h5 className="text-xs font-semibold text-green-400">Hybrid Model Settings</h5>
                      <p className="text-xs text-gray-400">Combine booth rent with commission on services</p>
                      
                      {/* Base Rent */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Base Rent ($)</label>
                          <input
                            type="number"
                            min="0"
                            defaultValue="300"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Rent Frequency</label>
                          <select className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Reduced Commission */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Service Commission (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            defaultValue="15"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">After Revenue ($)</label>
                          <input
                            type="number"
                            min="0"
                            defaultValue="1000"
                            placeholder="Commission after X revenue"
                            className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Creative Options */}
                  <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg">
                    <h5 className="text-xs font-semibold text-yellow-400">Creative Compensation Options</h5>
                    
                    {/* Sliding Scale */}
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id={`sliding-scale-${barber.id}`} className="rounded" />
                      <label htmlFor={`sliding-scale-${barber.id}`} className="text-xs text-gray-300">
                        Sliding scale commission (lower % as revenue increases)
                      </label>
                    </div>
                    
                    {/* Performance Bonuses */}
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id={`bonuses-${barber.id}`} className="rounded" />
                      <label htmlFor={`bonuses-${barber.id}`} className="text-xs text-gray-300">
                        Performance bonuses (based on 6FB score)
                      </label>
                    </div>
                    
                    {/* New Client Incentive */}
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id={`new-client-${barber.id}`} className="rounded" />
                      <label htmlFor={`new-client-${barber.id}`} className="text-xs text-gray-300">
                        New client bonus ($10 per new client)
                      </label>
                    </div>
                    
                    {/* Product Sales Bonus */}
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id={`product-bonus-${barber.id}`} className="rounded" />
                      <label htmlFor={`product-bonus-${barber.id}`} className="text-xs text-gray-300">
                        Product sales bonus (5% extra for sales over $100)
                      </label>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400">Phone Number</label>
                      <input
                        type="tel"
                        defaultValue={barber.phone}
                        className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                        placeholder="Phone"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Email</label>
                      <input
                        type="email"
                        defaultValue={barber.email}
                        className="w-full mt-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                        placeholder="Email"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-600">
                    <button 
                      onClick={() => {
                        const editForm = document.getElementById(`edit-form-${barber.id}`)
                        if (editForm) {
                          editForm.classList.add('hidden')
                        }
                      }}
                      className="flex-1 text-sm bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 rounded transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        // Preview the compensation structure
                        const paymentType = (document.getElementById(`payment-type-${barber.id}`) as HTMLSelectElement)?.value
                        alert(`Preview: ${paymentType} model selected. API integration coming soon!`)
                      }}
                      className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded transition-colors"
                    >
                      Preview
                    </button>
                    <button 
                      onClick={() => alert('Compensation update API coming soon!')}
                      className="flex-1 text-sm bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Streamlined Add Barber Modal */}
      {showAddBarber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Barber</h2>
                <button
                  onClick={() => setShowAddBarber(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {addBarberStep === 1 ? (
                // Step 1: Basic Info & Payment Model
                <form onSubmit={(e) => {
                  e.preventDefault()
                  setAddBarberStep(2)
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Payment Model
                      </label>
                      <select
                        value={formData.payment_type}
                        onChange={(e) => setFormData({...formData, payment_type: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="commission">Commission (30%)</option>
                        <option value="booth_rent">Booth Rent</option>
                      </select>
                    </div>

                    {formData.payment_type === 'commission' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Commission Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.commission_rate}
                          onChange={(e) => setFormData({...formData, commission_rate: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddBarber(false)}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Next: Payment Setup
                    </button>
                  </div>
                </form>
              ) : (
                // Step 2: Payment Connections
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">
                    Connect Payment Accounts
                  </h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newBarberConnections.stripe}
                        onChange={(e) => setNewBarberConnections({
                          ...newBarberConnections,
                          stripe: e.target.checked
                        })}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded"
                      />
                      <span className="text-white">Connect Stripe (instant payouts)</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newBarberConnections.square}
                        onChange={(e) => setNewBarberConnections({
                          ...newBarberConnections,
                          square: e.target.checked
                        })}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded"
                      />
                      <span className="text-white">Connect Square (next-day payouts)</span>
                    </label>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mt-4">
                    <p className="text-blue-300 text-sm">
                      💡 Payment connections can be set up later if needed.
                    </p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setAddBarberStep(1)}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateBarber}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Create Barber
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
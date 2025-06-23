'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  PlusIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CreditCardIcon,
  CogIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { barbersService } from '@/lib/api/barbers'
import apiClient from '@/lib/api/client'

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
  commission_rate?: number
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

interface CompensationPlan {
  id: number
  name: string
  description?: string
  payment_type: 'commission' | 'booth_rent' | 'hybrid'
  commission_rate?: number
  booth_rent_amount?: number
  booth_rent_frequency?: string
  is_active: boolean
}

export default function BarbersPage() {
  const [loading, setLoading] = useState(true)
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [compensationPlans, setCompensationPlans] = useState<CompensationPlan[]>([])
  const [showAddBarber, setShowAddBarber] = useState(false)
  const [showEditBarber, setShowEditBarber] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'not-connected'>('all')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location_id: 1,
    commission_rate: 30,
    compensation_plan_id: null as number | null
  })
  const [editFormData, setEditFormData] = useState<Partial<Barber>>({})
  const router = useRouter()

  useEffect(() => {
    fetchBarbers()
    fetchCompensationPlans()
  }, [])

  const fetchBarbers = async () => {
    try {
      const response = await barbersService.getBarbers()
      // Handle both paginated response and direct array response (for mock data)
      const barbersData = Array.isArray(response) ? response : (response?.data || [])
      setBarbers(Array.isArray(barbersData) ? barbersData : [])
    } catch (error) {
      console.error('Failed to fetch barbers:', error)
      setBarbers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCompensationPlans = async () => {
    try {
      const response = await apiClient.get('/compensation-plans')
      setCompensationPlans(response.data || [])
    } catch (error) {
      console.error('Failed to fetch compensation plans:', error)
    }
  }

  const handleCreateBarber = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await barbersService.createBarber({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        location_id: formData.location_id,
        commission_rate: formData.commission_rate
      })

      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        location_id: 1,
        commission_rate: 30,
        compensation_plan_id: null
      })
      setShowAddBarber(false)

      // Refresh barbers list
      fetchBarbers()

      // If compensation plan is selected, apply it
      if (formData.compensation_plan_id && response.data) {
        try {
          await apiClient.post(`/barbers/${response.data.id}/compensation-plan`, {
            compensation_plan_id: formData.compensation_plan_id
          })
        } catch (error) {
          console.error('Failed to apply compensation plan:', error)
        }
      }
    } catch (error: any) {
      console.error('Failed to create barber:', error)
      alert(`Failed to add barber: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleUpdateBarber = async (barberId: number) => {
    try {
      await barbersService.updateBarber(barberId, editFormData)
      setShowEditBarber(null)
      setEditFormData({})
      fetchBarbers()
    } catch (error: any) {
      console.error('Failed to update barber:', error)
      alert(`Failed to update barber: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleDeleteBarber = async (barberId: number, barberName: string) => {
    if (!confirm(`Are you sure you want to delete ${barberName}? This action cannot be undone.`)) {
      return
    }

    try {
      await barbersService.deleteBarber(barberId)
      fetchBarbers()
    } catch (error: any) {
      console.error('Failed to delete barber:', error)
      alert(`Failed to delete barber: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleConnectStripe = async (barberId: number) => {
    try {
      const response = await apiClient.post('/payment-splits/connect-account', {
        barber_id: barberId,
        platform: 'stripe'
      })

      if (response.data.oauth_url) {
        window.location.href = response.data.oauth_url
      }
    } catch (error: any) {
      console.error('Failed to initiate Stripe connection:', error)
      alert(`Failed to connect Stripe account: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleViewStripeAccount = async (barberId: number) => {
    try {
      const response = await apiClient.get(`/stripe-connect/status/${barberId}`)
      if (response.data.dashboard_url) {
        window.open(response.data.dashboard_url, '_blank')
      } else {
        window.open('https://dashboard.stripe.com', '_blank')
      }
    } catch (error) {
      console.error('Failed to get dashboard URL:', error)
      window.open('https://dashboard.stripe.com', '_blank')
    }
  }

  const handlePayout = async (barberId: number) => {
    try {
      const amount = prompt('Enter payout amount:')
      if (!amount) return

      const response = await apiClient.post(`/barbers/${barberId}/payout`, {
        amount: parseFloat(amount),
        description: 'Manual payout'
      })

      alert(`Payout of $${amount} initiated successfully!`)
      fetchBarbers()
    } catch (error: any) {
      console.error('Failed to process payout:', error)
      alert(`Failed to process payout: ${error.response?.data?.detail || error.message}`)
    }
  }

  const filteredBarbers = barbers.filter(barber => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!barber.first_name.toLowerCase().includes(query) &&
          !barber.last_name.toLowerCase().includes(query) &&
          !barber.email.toLowerCase().includes(query) &&
          !barber.phone.includes(query)) {
        return false
      }
    }

    // Status filter
    if (filterStatus === 'connected' && !barber.payment_model?.stripe_connect_account_id) {
      return false
    }
    if (filterStatus === 'not-connected' && barber.payment_model?.stripe_connect_account_id) {
      return false
    }

    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    )
  }

  const totalRevenue = barbers.reduce((sum, b) => sum + (b.total_revenue || 0), 0)
  const avgScore = barbers.length > 0 ? Math.round(barbers.reduce((sum, b) => sum + (b.sixfb_score || 0), 0) / barbers.length) : 0
  const connectedCount = barbers.filter(b => b.payment_model?.stripe_connect_account_id).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Barber Management</h1>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search barbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="connected">Stripe Connected</option>
            <option value="not-connected">Not Connected</option>
          </select>

          <button
            onClick={() => fetchBarbers()}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
            title="Refresh data"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>

          <button
            onClick={() => setShowAddBarber(true)}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-all flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Barber</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-slate-600 rounded-xl">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-200">Total Barbers</p>
          <p className="text-2xl font-bold text-white mt-1">{barbers.length}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-200">Total Revenue</p>
          <p className="text-2xl font-bold text-white mt-1">
            ${totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-slate-600 rounded-xl">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-200">Avg 6FB Score</p>
          <p className="text-2xl font-bold text-white mt-1">{avgScore}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
              <LinkIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-200">Connected</p>
          <p className="text-2xl font-bold text-white mt-1">
            {connectedCount}/{barbers.length}
          </p>
        </div>
      </div>

      {/* Barbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBarbers.map((barber) => (
          <div key={barber.id} className="bg-slate-800 rounded-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {barber.first_name.charAt(0)}{barber.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {barber.first_name} {barber.last_name}
                  </h3>
                  <p className="text-sm text-gray-200">{barber.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setEditFormData(barber)
                    setShowEditBarber(barber.id)
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title="Edit barber"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteBarber(barber.id, `${barber.first_name} ${barber.last_name}`)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Delete barber"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Payment Model Info */}
            <div className="mb-4 p-3 bg-slate-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-200 mb-2 flex items-center">
                <CreditCardIcon className="h-4 w-4 mr-2 text-slate-400" />
                Payment Model
              </h4>
              <p className="text-sm text-gray-200">
                {barber.commission_rate
                  ? `Commission: ${barber.commission_rate}%`
                  : barber.payment_model?.payment_type === 'booth_rent'
                    ? `Booth Rent: $${barber.payment_model?.booth_rent_amount || 0}/${barber.payment_model?.booth_rent_frequency || 'weekly'}`
                    : 'Not configured'
                }
              </p>
            </div>

            {/* Payment Connections */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Stripe</p>
                    <p className="text-xs text-gray-300">Instant payouts</p>
                  </div>
                </div>
                {barber.payment_model?.stripe_connect_account_id ? (
                  <button
                    onClick={() => handleViewStripeAccount(barber.id)}
                    className="flex items-center space-x-2 text-green-400 hover:text-green-300"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Connected</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectStripe(barber.id)}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span className="text-sm">Connect</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-700 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <CurrencyDollarIcon className="h-4 w-4 text-green-400" />
                  <p className="text-xs text-gray-300">Revenue</p>
                </div>
                <p className="text-xl font-bold text-white">
                  ${(barber.total_revenue || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-700 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <ChartBarIcon className="h-4 w-4 text-slate-400" />
                  <p className="text-xs text-gray-300">6FB Score</p>
                </div>
                <p className="text-xl font-bold text-white">
                  {barber.sixfb_score || 0}
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <a href={`tel:${barber.phone}`} className="flex items-center space-x-2 text-gray-300 hover:text-white">
                <PhoneIcon className="h-4 w-4" />
                <span>{barber.phone}</span>
              </a>
              <a href={`mailto:${barber.email}`} className="flex items-center space-x-2 text-gray-300 hover:text-white">
                <EnvelopeIcon className="h-4 w-4" />
                <span className="truncate">{barber.email}</span>
              </a>
              {barber.location_name && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <MapPinIcon className="h-4 w-4" />
                  <span>{barber.location_name}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-slate-700 flex space-x-2">
              <button
                onClick={() => router.push(`/appointments?barber=${barber.id}`)}
                className="flex-1 text-sm bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-md transition-colors flex items-center justify-center"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule
              </button>
              {barber.payment_model?.stripe_connect_account_id && (
                <button
                  onClick={() => handlePayout(barber.id)}
                  className="flex-1 text-sm bg-green-600/20 hover:bg-green-600/30 text-green-300 py-2 px-3 rounded-md transition-colors flex items-center justify-center"
                >
                  <BanknotesIcon className="h-4 w-4 mr-2" />
                  Payout
                </button>
              )}
            </div>

            {/* Edit Form */}
            {showEditBarber === barber.id && (
              <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-3">Edit Barber</h4>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleUpdateBarber(barber.id)
                }} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={editFormData.first_name || ''}
                      onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                      className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={editFormData.last_name || ''}
                      onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                      className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="number"
                    placeholder="Commission Rate (%)"
                    value={editFormData.commission_rate || ''}
                    onChange={(e) => setEditFormData({...editFormData, commission_rate: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditBarber(null)
                        setEditFormData({})
                      }}
                      className="flex-1 text-sm bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 text-sm bg-slate-600 hover:bg-slate-700 text-white py-2 px-3 rounded transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Barber Modal */}
      {showAddBarber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Barber</h2>
                <button
                  onClick={() => setShowAddBarber(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateBarber} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
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
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
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
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({...formData, commission_rate: parseInt(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                {compensationPlans.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      Compensation Plan (Optional)
                    </label>
                    <select
                      value={formData.compensation_plan_id || ''}
                      onChange={(e) => setFormData({...formData, compensation_plan_id: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">None</option>
                      {compensationPlans.filter(plan => plan.is_active).map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - {plan.payment_type === 'commission' ? `${plan.commission_rate}%` : `$${plan.booth_rent_amount}/${plan.booth_rent_frequency}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddBarber(false)}
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Add Barber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

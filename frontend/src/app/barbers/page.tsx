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

import CompensationPlanForm from '../../components/CompensationPlanForm'

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
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'schedule' | 'performance'>('overview')
  const [showAddBarber, setShowAddBarber] = useState(false)
  const [showEditPayment, setShowEditPayment] = useState(false)
  const [showCompensationPlan, setShowCompensationPlan] = useState(false)
  const [addBarberStep, setAddBarberStep] = useState(1) // 1 = Basic Info, 2 = Advanced Compensation
  const [newBarberPaymentType, setNewBarberPaymentType] = useState('commission_only')
  const [selectedPreset, setSelectedPreset] = useState('')
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

      // Fetch barbers with their payment models
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/barbers`,
        { headers }
      )

      // Mock enhanced data for now
      const barbersData = response.data || []
      const enhancedBarbers = barbersData.map((barber: any, index: number) => ({
        ...barber,
        rating: 4.5 + (Math.random() * 0.5),
        total_clients: Math.floor(Math.random() * 200) + 50,
        total_revenue: Math.floor(Math.random() * 50000) + 20000,
        sixfb_score: Math.floor(Math.random() * 20) + 80,
        location_name: ['Downtown Shop', 'Uptown Premium', 'Brooklyn Style'][index % 3],
        specialties: ['Fades', 'Beard Styling', 'Hot Shave', 'Hair Design'].slice(0, Math.floor(Math.random() * 3) + 1),
        payment_model: {
          barber_id: barber.id,
          payment_type: index % 2 === 0 ? 'commission' : 'booth_rent',
          commission_rate: 30,
          booth_rent_amount: 1500,
          booth_rent_frequency: 'monthly',
          stripe_connected: Math.random() > 0.5,
          square_connected: Math.random() > 0.5,
          rentpedi_connected: Math.random() > 0.7
        }
      }))

      setBarbers(enhancedBarbers)
    } catch (error) {
      console.error('Failed to fetch barbers:', error)
      // Use mock data on error
      setBarbers([
        {
          id: 1,
          user_id: 4,
          first_name: 'Mike',
          last_name: 'Johnson',
          email: 'mike.barber@6fb.com',
          phone: '(555) 300-0001',
          location_id: 1,
          location_name: 'Downtown Shop',
          is_active: true,
          is_verified: true,
          rating: 4.8,
          total_clients: 156,
          total_revenue: 45600,
          sixfb_score: 92,
          specialties: ['Fades', 'Beard Styling'],
          payment_model: {
            barber_id: 1,
            payment_type: 'commission',
            commission_rate: 30,
            stripe_connected: true,
            square_connected: false,
            rentpedi_connected: false
          }
        },
        {
          id: 2,
          user_id: 5,
          first_name: 'Sarah',
          last_name: 'Williams',
          email: 'sarah.barber@6fb.com',
          phone: '(555) 300-0002',
          location_id: 2,
          location_name: 'Uptown Premium',
          is_active: true,
          is_verified: true,
          rating: 4.9,
          total_clients: 189,
          total_revenue: 52300,
          sixfb_score: 95,
          specialties: ['Hair Design', 'Color'],
          payment_model: {
            barber_id: 2,
            payment_type: 'booth_rent',
            booth_rent_amount: 1500,
            booth_rent_frequency: 'monthly',
            stripe_connected: true,
            square_connected: true,
            rentpedi_connected: true
          }
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleStripeConnect = async (barberId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payment-splits/oauth-connect`,
        {
          barber_id: barberId,
          platform: 'stripe',
          redirect_uri: window.location.origin + '/barbers'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.auth_url) {
        window.location.href = response.data.auth_url
      }
    } catch (error) {
      console.error('Failed to initiate Stripe Connect:', error)
    }
  }

  const handleSquareConnect = async (barberId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payment-splits/oauth-connect`,
        {
          barber_id: barberId,
          platform: 'square',
          redirect_uri: window.location.origin + '/barbers'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.auth_url) {
        window.location.href = response.data.auth_url
      }
    } catch (error) {
      console.error('Failed to initiate Square Connect:', error)
    }
  }

  const handleAddBarber = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const token = localStorage.getItem('access_token')
      
      // Create user account first
      const userResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/users`,
        {
          email: formData.get('email'),
          password: 'TempPassword123!', // Temporary password
          first_name: formData.get('first_name'),
          last_name: formData.get('last_name'),
          role: 'barber'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Create barber profile
      const barberResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/barbers`,
        {
          user_id: userResponse.data.id,
          location_id: parseInt(formData.get('location_id') as string),
          phone: formData.get('phone'),
          is_active: true,
          is_verified: false
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Create payment model with new compensation plan structure
      const paymentType = formData.get('payment_type') as string
      const compensationPlan: any = {
        barber_id: barberResponse.data.id,
        plan_name: `${formData.get('first_name')} ${formData.get('last_name')} - Default Plan`,
        compensation_type: paymentType,
      }

      // Set up basic compensation structure based on type
      if (paymentType === 'commission_only') {
        const commissionRate = parseInt(formData.get('commission_rate') as string)
        compensationPlan.commission_structure = {
          services: {
            default: { rate: commissionRate }
          },
          products: {
            default: 15,
            premium: 20
          }
        }
      } else if (paymentType === 'booth_rent_only') {
        compensationPlan.booth_rent_amount = parseInt(formData.get('booth_rent_amount') as string)
        compensationPlan.booth_rent_frequency = formData.get('booth_rent_frequency')
        compensationPlan.includes_utilities = true
        compensationPlan.includes_marketing = true
      } else if (paymentType === 'hybrid') {
        compensationPlan.booth_rent_amount = parseInt(formData.get('booth_rent_amount') as string)
        compensationPlan.booth_rent_frequency = 'monthly'
        compensationPlan.commission_structure = {
          services: {
            default: { rate: parseInt(formData.get('commission_rate') as string) }
          },
          products: {
            default: 10
          }
        }
      }

      // Add default performance bonuses
      compensationPlan.performance_bonuses = {
        new_clients: { per_client: 25, monthly_cap: 500 },
        revenue_milestones: [
          { target: 10000, bonus: 250 },
          { target: 15000, bonus: 500 }
        ]
      }

      // Add minimal deductions
      compensationPlan.deductions = {
        processing_fees: { type: 'percentage', value: 2.9 },
        no_show_penalty: { type: 'fixed', value: 15 }
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/compensation-plans`,
        compensationPlan,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Refresh barbers list
      await fetchBarbers()
      setShowAddBarber(false)

      // Show success message (you could add a toast notification here)
      alert('Barber added successfully! They will receive an email to set up their password.')
    } catch (error) {
      console.error('Failed to add barber:', error)
      alert('Failed to add barber. Please try again.')
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
                onClick={() => setShowAddBarber(true)}
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Barbers</p>
                <p className="text-2xl font-bold text-white">{barbers.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {barbers.filter(b => b.is_active).length} active
                </p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {(barbers.reduce((sum, b) => sum + (b.rating || 0), 0) / barbers.length).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Customer satisfaction</p>
              </div>
              <StarIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(barbers.reduce((sum, b) => sum + (b.total_revenue || 0), 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">All barbers combined</p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg 6FB Score</p>
                <p className="text-2xl font-bold text-blue-400">
                  {Math.round(barbers.reduce((sum, b) => sum + (b.sixfb_score || 0), 0) / barbers.length)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Platform performance</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Barbers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-600 transition-all cursor-pointer"
              onClick={() => setSelectedBarber(barber)}
            >
              {/* Barber Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {barber.first_name[0]}{barber.last_name[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {barber.first_name} {barber.last_name}
                      </h3>
                      <p className="text-sm text-gray-400">{barber.location_name}</p>
                      <div className="flex items-center mt-1">
                        <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-yellow-400 ml-1">{barber.rating?.toFixed(1)}</span>
                        <span className="text-sm text-gray-500 ml-2">({barber.total_clients} clients)</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    barber.is_active 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {barber.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-400">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {barber.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    {barber.email}
                  </div>
                </div>

                {/* Specialties */}
                {barber.specialties && barber.specialties.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {barber.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Info */}
                {barber.payment_model && (
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">Payment Model</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        barber.payment_model.payment_type === 'commission'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {barber.payment_model.payment_type === 'commission'
                          ? `${barber.payment_model.commission_rate}% Commission`
                          : `$${barber.payment_model.booth_rent_amount}/mo Booth Rent`
                        }
                      </span>
                    </div>

                    {/* Payment Connections */}
                    <div className="grid grid-cols-2 gap-2">
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
                      {formatCurrency(barber.total_revenue || 0)}
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
            </div>
          ))}
        </div>
      </main>

      {/* Add Barber Modal */}
      {showAddBarber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Add New Barber - 2 Steps</h2>
                  <div className="flex items-center mt-2 space-x-4">
                    <div className={`flex items-center space-x-2 ${addBarberStep === 1 ? 'text-purple-400' : 'text-gray-500'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${addBarberStep === 1 ? 'bg-purple-600 text-white' : addBarberStep > 1 ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                        {addBarberStep > 1 ? '✓' : '1'}
                      </div>
                      <span className="text-sm">Basic Info</span>
                    </div>
                    <div className={`w-8 h-0.5 ${addBarberStep > 1 ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                    <div className={`flex items-center space-x-2 ${addBarberStep === 2 ? 'text-purple-400' : 'text-gray-500'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${addBarberStep === 2 ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                        2
                      </div>
                      <span className="text-sm">Advanced Setup</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddBarber(false)
                    setAddBarberStep(1)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddBarber} className="p-6 space-y-6">
              
              {/* Step 1: Basic Information */}
              {addBarberStep === 1 && (
                <>
                  {/* Basic Information */}
                  <div>
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  <select
                    name="location_id"
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select Location</option>
                    <option value="1">Downtown Shop</option>
                    <option value="2">Uptown Premium</option>
                    <option value="3">Brooklyn Style</option>
                  </select>
                </div>
              </div>

              {/* Payment Setup */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Compensation Plan</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Choose a Preset Plan
                    </label>
                    <select
                      name="compensation_preset"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      onChange={(e) => {
                        const preset = e.target.value;
                        setSelectedPreset(preset);
                        // Auto-fill based on preset selection
                        if (['apprentice', 'new_barber', 'experienced', 'master'].includes(preset)) {
                          setNewBarberPaymentType('commission_only');
                        }
                        if (['booth_rent_low', 'booth_rent'].includes(preset)) {
                          setNewBarberPaymentType('booth_rent_only');
                        }
                        if (['hybrid_starter', 'hybrid_pro'].includes(preset)) {
                          setNewBarberPaymentType('hybrid');
                        }
                        if (preset === 'salary_plus') {
                          setNewBarberPaymentType('salary_plus_commission');
                        }
                      }}
                    >
                      <option value="">Select a compensation plan...</option>
                      <option value="apprentice">🎓 Apprentice (40% commission + training support)</option>
                      <option value="new_barber">🌱 New Barber (50% commission + $3 new client bonus)</option>
                      <option value="experienced">⭐ Experienced Barber (65% commission + $5 new client bonus)</option>
                      <option value="master">👑 Master Barber (75% commission + $10 new client bonus)</option>
                      <option value="booth_rent_low">🏠 Booth Rent - Standard ($300/week, barber keeps 100%)</option>
                      <option value="booth_rent">🏠 Booth Rent - Premium ($375/week, barber keeps 100%)</option>
                      <option value="hybrid_starter">🔄 Hybrid Starter ($150/week rent + 40% commission)</option>
                      <option value="hybrid_pro">🔄 Hybrid Pro ($200/week rent + 30% commission)</option>
                      <option value="salary_plus">💼 Salary + Commission ($800/week base + 25% commission)</option>
                      <option value="custom">⚙️ Custom Setup</option>
                    </select>
                  </div>

                  {/* Manual Customization Fields - Show when preset is selected */}
                  {selectedPreset && selectedPreset !== 'custom' && (
                    <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
                      <h4 className="text-white font-medium text-sm">💡 Customize Your Preset</h4>
                      
                      {/* Commission-based presets */}
                      {['apprentice', 'new_barber', 'experienced', 'master'].includes(selectedPreset) && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Commission Rate (%)</label>
                            <input
                              type="number"
                              name="commission_rate"
                              min="0"
                              max="100"
                              defaultValue={
                                selectedPreset === 'apprentice' ? '40' :
                                selectedPreset === 'new_barber' ? '50' :
                                selectedPreset === 'experienced' ? '65' : '75'
                              }
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">New Client Bonus ($)</label>
                            <input
                              type="number"
                              name="new_client_bonus"
                              min="0"
                              defaultValue={
                                selectedPreset === 'apprentice' ? '2' :
                                selectedPreset === 'new_barber' ? '3' :
                                selectedPreset === 'experienced' ? '5' : '10'
                              }
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Booth rent presets */}
                      {['booth_rent_low', 'booth_rent'].includes(selectedPreset) && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Weekly Rent ($)</label>
                            <input
                              type="number"
                              name="booth_rent_amount"
                              min="0"
                              defaultValue={selectedPreset === 'booth_rent_low' ? '300' : '375'}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Payment Frequency</label>
                            <select
                              name="rent_frequency"
                              defaultValue="weekly"
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            >
                              <option value="weekly">Weekly</option>
                              <option value="biweekly">Bi-weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Hybrid presets */}
                      {['hybrid_starter', 'hybrid_pro'].includes(selectedPreset) && (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Weekly Rent ($)</label>
                            <input
                              type="number"
                              name="booth_rent_amount"
                              min="0"
                              defaultValue={selectedPreset === 'hybrid_starter' ? '150' : '200'}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Commission (%)</label>
                            <input
                              type="number"
                              name="commission_rate"
                              min="0"
                              max="100"
                              defaultValue={selectedPreset === 'hybrid_starter' ? '40' : '30'}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">New Client Bonus ($)</label>
                            <input
                              type="number"
                              name="new_client_bonus"
                              min="0"
                              defaultValue="3"
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Salary + Commission preset */}
                      {selectedPreset === 'salary_plus' && (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Weekly Salary ($)</label>
                            <input
                              type="number"
                              name="base_salary"
                              min="0"
                              defaultValue="800"
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Commission (%)</label>
                            <input
                              type="number"
                              name="commission_rate"
                              min="0"
                              max="100"
                              defaultValue="25"
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Target Bonus ($)</label>
                            <input
                              type="number"
                              name="weekly_target_bonus"
                              min="0"
                              defaultValue="100"
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-400">
                        💡 Adjust these values to perfectly match your needs. Changes are saved automatically.
                      </p>
                    </div>
                  )}

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <InformationCircleIcon className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-purple-300 font-medium">💰 Commission = Barbershop Revenue</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Commission percentages are what <strong>your barbershop keeps</strong>. 
                          You can modify all details after creating the barber - just click their name 
                          and go to the Payments tab for full customization.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                </>
              )}

              {/* Step 2: Advanced Compensation Setup */}
              {addBarberStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      {selectedPreset === 'custom' ? 'Custom Compensation Setup' : 'Advanced Compensation Setup'}
                    </h3>
                    <p className="text-gray-400 text-sm mb-6">
                      {selectedPreset === 'custom' 
                        ? 'Build a completely custom compensation plan with all available options.'
                        : 'Configure detailed commission structures, performance bonuses, and special conditions for this barber.'
                      }
                    </p>
                  </div>
                  
                  {/* Custom Setup - Full Configuration */}
                  {selectedPreset === 'custom' ? (
                    <div className="space-y-6">
                      {/* Compensation Type Selection */}
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                        <h4 className="text-white font-medium">Compensation Model</h4>
                        <div className="grid grid-cols-4 gap-3">
                          <label className="relative">
                            <input type="radio" name="comp_type" value="commission_only" defaultChecked className="sr-only peer" />
                            <div className="p-3 bg-gray-600 border-2 border-gray-500 rounded-lg cursor-pointer peer-checked:border-purple-500 peer-checked:bg-purple-500/10 text-center">
                              <p className="text-white text-sm font-medium">Commission Only</p>
                            </div>
                          </label>
                          <label className="relative">
                            <input type="radio" name="comp_type" value="booth_rent" className="sr-only peer" />
                            <div className="p-3 bg-gray-600 border-2 border-gray-500 rounded-lg cursor-pointer peer-checked:border-purple-500 peer-checked:bg-purple-500/10 text-center">
                              <p className="text-white text-sm font-medium">Booth Rent</p>
                            </div>
                          </label>
                          <label className="relative">
                            <input type="radio" name="comp_type" value="hybrid" className="sr-only peer" />
                            <div className="p-3 bg-gray-600 border-2 border-gray-500 rounded-lg cursor-pointer peer-checked:border-purple-500 peer-checked:bg-purple-500/10 text-center">
                              <p className="text-white text-sm font-medium">Hybrid</p>
                            </div>
                          </label>
                          <label className="relative">
                            <input type="radio" name="comp_type" value="salary_plus" className="sr-only peer" />
                            <div className="p-3 bg-gray-600 border-2 border-gray-500 rounded-lg cursor-pointer peer-checked:border-purple-500 peer-checked:bg-purple-500/10 text-center">
                              <p className="text-white text-sm font-medium">Salary + Commission</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Service-Specific Commission Rates */}
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                        <h4 className="text-white font-medium">Service-Specific Commission Rates</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Haircuts (%)</label>
                            <input type="number" defaultValue="60" min="0" max="100" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Beard Trims (%)</label>
                            <input type="number" defaultValue="55" min="0" max="100" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Hot Shaves (%)</label>
                            <input type="number" defaultValue="70" min="0" max="100" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Hair Styling (%)</label>
                            <input type="number" defaultValue="65" min="0" max="100" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Hair Color (%)</label>
                            <input type="number" defaultValue="50" min="0" max="100" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Eyebrow Trim (%)</label>
                            <input type="number" defaultValue="60" min="0" max="100" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                        </div>
                      </div>

                      {/* Performance Bonuses */}
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                        <h4 className="text-white font-medium">Performance Bonuses</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">New Client Bonus ($)</label>
                            <input type="number" defaultValue="5" min="0" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Client Retention Bonus ($)</label>
                            <input type="number" defaultValue="3" min="0" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Upselling Bonus ($)</label>
                            <input type="number" defaultValue="10" min="0" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Weekly Revenue Target ($)</label>
                            <input type="number" defaultValue="2000" min="0" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Target Achievement Bonus ($)</label>
                            <input type="number" defaultValue="100" min="0" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Monthly Milestone Bonus ($)</label>
                            <input type="number" defaultValue="200" min="0" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                        </div>
                      </div>

                      {/* Time-Based Premiums */}
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                        <h4 className="text-white font-medium">Time-Based Premiums</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Weekend Premium (%)</label>
                            <input type="number" defaultValue="5" min="0" max="50" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Holiday Premium (%)</label>
                            <input type="number" defaultValue="10" min="0" max="50" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Evening Premium (%)</label>
                            <input type="number" defaultValue="3" min="0" max="50" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                        </div>
                      </div>

                      {/* Product & Retail Commissions */}
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                        <h4 className="text-white font-medium">Product & Retail Commissions</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Hair Products (%)</label>
                            <input type="number" defaultValue="15" min="0" max="100" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Beard Products (%)</label>
                            <input type="number" defaultValue="20" min="0" max="100" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Premium Products (%)</label>
                            <input type="number" defaultValue="25" min="0" max="100" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                          </div>
                        </div>
                      </div>

                      {/* Special Conditions */}
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                        <h4 className="text-white font-medium">Special Conditions</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className="flex items-center">
                              <input type="checkbox" className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded" />
                              <span className="ml-2 text-sm text-gray-300">Apprentice reduced rates (first 6 months)</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded" />
                              <span className="ml-2 text-sm text-gray-300">Master barber premium (+10%)</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" defaultChecked className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded" />
                              <span className="ml-2 text-sm text-gray-300">Social media bonus ($20/post)</span>
                            </label>
                          </div>
                          <div className="space-y-3">
                            <label className="flex items-center">
                              <input type="checkbox" className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded" />
                              <span className="ml-2 text-sm text-gray-300">Training workshop attendance bonus</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded" />
                              <span className="ml-2 text-sm text-gray-300">Client satisfaction score bonus</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded" />
                              <span className="ml-2 text-sm text-gray-300">Referral commission (5% of referred revenue)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Preset-based simple advanced options */
                    <div className="space-y-6">
                      {/* Service-Specific Commissions */}
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                        <h4 className="text-white font-medium">Service-Specific Commission Rates</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Haircuts</label>
                            <div className="flex items-center space-x-2">
                              <input type="number" defaultValue="60" min="0" max="100" className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                              <span className="text-gray-400">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Beard Trims</label>
                            <div className="flex items-center space-x-2">
                              <input type="number" defaultValue="50" min="0" max="100" className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                              <span className="text-gray-400">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Hot Shaves</label>
                            <div className="flex items-center space-x-2">
                              <input type="number" defaultValue="70" min="0" max="100" className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                              <span className="text-gray-400">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Styling</label>
                            <div className="flex items-center space-x-2">
                              <input type="number" defaultValue="65" min="0" max="100" className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                              <span className="text-gray-400">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Bonuses */}
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                        <h4 className="text-white font-medium">Performance Bonuses</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">New Client Bonus</label>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400">$</span>
                              <input type="number" defaultValue="5" min="0" className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Weekly Revenue Target</label>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400">$</span>
                              <input type="number" defaultValue="2000" min="0" className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">Target Bonus</label>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400">$</span>
                              <input type="number" defaultValue="100" min="0" className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Special Conditions */}
                      <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                        <h4 className="text-white font-medium">Special Conditions</h4>
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input type="checkbox" className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded" />
                            <span className="ml-2 text-sm text-gray-300">Weekend premium (+5% commission)</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded" />
                            <span className="ml-2 text-sm text-gray-300">Holiday premium (+10% commission)</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded" />
                            <span className="ml-2 text-sm text-gray-300">Product commission (15% of product sales)</span>
                          </label>
                        </div>
                      </div>

                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <p className="text-sm text-green-300 font-medium mb-2">✨ You can modify all these settings later</p>
                        <p className="text-xs text-gray-400">
                          This creates a comprehensive compensation plan. You can always access the full advanced editor 
                          by clicking on the barber's name and going to the Payments tab.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                {/* Left side - Back button (Step 2 only) */}
                <div>
                  {addBarberStep === 2 && (
                    <button
                      type="button"
                      onClick={() => setAddBarberStep(1)}
                      className="px-4 py-2 text-gray-300 hover:text-white transition-colors flex items-center"
                    >
                      <ArrowLeftIcon className="h-4 w-4 mr-2" />
                      Back
                    </button>
                  )}
                </div>

                {/* Right side - Cancel/Next/Finish buttons */}
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBarber(false)
                      setAddBarberStep(1)
                    }}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  
                  {addBarberStep === 1 && (
                    <button
                      type="button"
                      onClick={() => setAddBarberStep(2)}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center"
                    >
                      Next
                      <ArrowLeftIcon className="h-4 w-4 ml-2 rotate-180" />
                    </button>
                  )}
                  
                  {addBarberStep === 2 && (
                    <button
                      type="submit"
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Create Barber
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barber Detail Modal */}
      {selectedBarber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {selectedBarber.first_name[0]}{selectedBarber.last_name[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedBarber.first_name} {selectedBarber.last_name}
                    </h2>
                    <p className="text-gray-400">{selectedBarber.location_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBarber(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="border-b border-gray-700">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {[
                  { id: 'overview', name: 'Overview', icon: UserGroupIcon },
                  { id: 'payments', name: 'Payments', icon: CurrencyDollarIcon },
                  { id: 'schedule', name: 'Schedule', icon: CalendarIcon },
                  { id: 'performance', name: 'Performance', icon: ChartBarIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      py-4 px-1 inline-flex items-center space-x-2 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      }
                    `}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center text-gray-300">
                          <PhoneIcon className="h-5 w-5 mr-3 text-gray-500" />
                          {selectedBarber.phone}
                        </div>
                        <div className="flex items-center text-gray-300">
                          <EnvelopeIcon className="h-5 w-5 mr-3 text-gray-500" />
                          {selectedBarber.email}
                        </div>
                        <div className="flex items-center text-gray-300">
                          <MapPinIcon className="h-5 w-5 mr-3 text-gray-500" />
                          {selectedBarber.location_name}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Clients</span>
                          <span className="text-white font-medium">{selectedBarber.total_clients}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Revenue</span>
                          <span className="text-white font-medium">{formatCurrency(selectedBarber.total_revenue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">6FB Score</span>
                          <span className="text-white font-medium">{selectedBarber.sixfb_score}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Rating</span>
                          <div className="flex items-center">
                            <StarIcon className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                            <span className="text-white font-medium">{selectedBarber.rating?.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && selectedBarber.payment_model && (
                <div className="space-y-6">
                  {/* Payment Model */}
                  <div className="bg-gray-700/50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Payment Model</h3>
                      <button
                        onClick={() => setShowEditPayment(true)}
                        className="text-sm text-purple-400 hover:text-purple-300"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        selectedBarber.payment_model.payment_type === 'commission'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}>
                        {selectedBarber.payment_model.payment_type === 'commission'
                          ? `${selectedBarber.payment_model.commission_rate}% Commission Model`
                          : `$${selectedBarber.payment_model.booth_rent_amount} Monthly Booth Rent`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Payment Platform Connections */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Payment Platforms</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-sm">S</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">Stripe</p>
                            <p className="text-xs text-gray-400">Process payments and splits</p>
                          </div>
                        </div>
                        {selectedBarber.payment_model.stripe_connected ? (
                          <div className="flex items-center text-green-400">
                            <CheckCircleIcon className="h-5 w-5 mr-2" />
                            <span className="text-sm">Connected</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStripeConnect(selectedBarber.id)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>

                      <div className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-sm">□</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">Square</p>
                            <p className="text-xs text-gray-400">Point of sale integration</p>
                          </div>
                        </div>
                        {selectedBarber.payment_model.square_connected ? (
                          <div className="flex items-center text-green-400">
                            <CheckCircleIcon className="h-5 w-5 mr-2" />
                            <span className="text-sm">Connected</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSquareConnect(selectedBarber.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>

                      {selectedBarber.payment_model.payment_type === 'booth_rent' && (
                        <div className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-sm">R</span>
                            </div>
                            <div>
                              <p className="text-white font-medium">RentRedi</p>
                              <p className="text-xs text-gray-400">Booth rent collection</p>
                            </div>
                          </div>
                          {selectedBarber.payment_model.rentpedi_connected ? (
                            <div className="flex items-center text-green-400">
                              <CheckCircleIcon className="h-5 w-5 mr-2" />
                              <span className="text-sm">Connected</span>
                            </div>
                          ) : (
                            <button
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Advanced Compensation Plan */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Advanced Compensation Plan</h3>
                      <button
                        onClick={() => setShowCompensationPlan(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm rounded-lg font-medium transition-all duration-200 shadow-lg"
                      >
                        Setup Detailed Plan
                      </button>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-white font-medium mb-3">Available Features</h4>
                          <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex items-center">
                              <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2" />
                              Service-specific commission rates
                            </li>
                            <li className="flex items-center">
                              <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2" />
                              Sliding scale based on revenue
                            </li>
                            <li className="flex items-center">
                              <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2" />
                              Performance bonuses & milestones
                            </li>
                            <li className="flex items-center">
                              <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2" />
                              Product commission tracking
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-3">Revenue Split Clarity</h4>
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                            <p className="text-sm text-purple-300 font-medium mb-2">💰 How Commissions Work</p>
                            <p className="text-xs text-gray-400">
                              <strong>Commission = Your Barbershop Revenue</strong><br/>
                              Example: 60% commission means your shop keeps $60 from every $100 service.
                              The barber receives the remaining $40.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
                    <div className="bg-gray-700/50 rounded-lg p-8 text-center">
                      <CurrencyDollarIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">Transaction history will appear here</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="space-y-6">
                  <div className="bg-gray-700/50 rounded-lg p-8 text-center">
                    <CalendarIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">Schedule management coming soon</p>
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <div className="bg-gray-700/50 rounded-lg p-8 text-center">
                    <ChartBarIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">Performance analytics coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compensation Plan Modal */}
      {showCompensationPlan && selectedBarber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <CompensationPlanForm
              barberId={selectedBarber.id}
              onSubmit={async (plan) => {
                try {
                  const token = localStorage.getItem('access_token')
                  await axios.post(
                    `http://localhost:8000/api/v1/compensation-plans`,
                    { ...plan, barber_id: selectedBarber.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                  )
                  alert('Compensation plan created successfully!')
                  setShowCompensationPlan(false)
                } catch (error) {
                  console.error('Failed to create compensation plan:', error)
                  alert('Failed to create compensation plan')
                }
              }}
              onCancel={() => setShowCompensationPlan(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
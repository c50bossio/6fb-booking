'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import {
  ArrowLeftIcon,
  CreditCardIcon,
  BanknotesIcon,
  HomeIcon,
  CheckCircleIcon,
  XCircleIcon,
  LinkIcon,
  CalculatorIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface BarberPaymentModel {
  barber_id: number
  barber_name: string
  payment_type: 'booth_rent' | 'commission'
  commission_rate?: number
  booth_rent_amount?: number
  booth_rent_frequency?: string
  stripe_account_id?: string
  square_merchant_id?: string
  stripe_connected: boolean
  square_connected: boolean
  rentpedi_tenant_id?: string
  rentpedi_connected: boolean
  created_at: string
  updated_at: string
}

interface PaymentSplit {
  barber_id: number
  appointment_id: number
  service_revenue: number
  product_revenue: number
  tip_amount: number
  total_amount: number
  barber_amount: number
  shop_amount: number
  commission_rate: number
  status: string
  processed_at?: string
}

interface CommissionPayment {
  id: number
  barber_id: number
  period_start: string
  period_end: string
  service_revenue: number
  product_revenue: number
  tip_amount: number
  total_revenue: number
  commission_amount: number
  barber_payout: number
  status: string
  payment_method: string
  paid_at?: string
}

interface BoothRentPayment {
  id: number
  barber_id: number
  due_date: string
  amount: number
  status: string
  paid_at?: string
  payment_method: string
  rentpedi_payment_id?: string
}

export default function BarberPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [barberPayments, setBarberPayments] = useState<BarberPaymentModel[]>([])
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([])
  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>([])
  const [boothRentPayments, setBoothRentPayments] = useState<BoothRentPayment[]>([])
  const [selectedBarber, setSelectedBarber] = useState<number | null>(null)
  const [showAddBarber, setShowAddBarber] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'splits' | 'commissions' | 'booth-rent'>('overview')
  const router = useRouter()

  useEffect(() => {
    fetchBarberPaymentData()
  }, [])

  const fetchBarberPaymentData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const headers = { Authorization: `Bearer ${token}` }

      const [barbersRes, splitsRes, commissionsRes, boothRentRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payment-splits/barbers`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payment-splits/recent`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payment-splits/commission-payments`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payment-splits/booth-rent`, { headers })
      ])

      setBarberPayments(barbersRes.data || [])
      setPaymentSplits(splitsRes.data || [])
      setCommissionPayments(commissionsRes.data || [])
      setBoothRentPayments(boothRentRes.data || [])

    } catch (error) {
      console.error('Failed to fetch barber payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleStripeConnect = async (barberId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payment-splits/oauth-connect`,
        {
          barber_id: barberId,
          platform: 'stripe',
          redirect_uri: window.location.origin + '/barber-payments'
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
          redirect_uri: window.location.origin + '/barber-payments'
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

  const handleRentRediConnect = async (barberId: number) => {
    // RentRedi integration would go here
    alert('RentRedi integration coming soon!')
  }

  const calculateTotalRevenue = (barberId: number) => {
    const splits = paymentSplits.filter(s => s.barber_id === barberId)
    return splits.reduce((sum, split) => sum + split.barber_amount, 0)
  }

  const calculatePendingCommissions = (barberId: number) => {
    const pending = commissionPayments.filter(
      c => c.barber_id === barberId && c.status === 'pending'
    )
    return pending.reduce((sum, payment) => sum + payment.barber_payout, 0)
  }

  const getNextBoothRentDue = (barberId: number) => {
    const payments = boothRentPayments.filter(
      b => b.barber_id === barberId && b.status === 'pending'
    )
    if (payments.length === 0) return null
    return payments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading barber payments...</p>
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
                href="/analytics"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </a>
              <Image
                src="/6fb-logo.png"
                alt="6FB Logo"
                width={60}
                height={60}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-white">Barber Payment Management</h1>
                <p className="text-xs text-gray-400">Booth Rent & Commission Tracking</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddBarber(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Add Barber Payment Account
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'splits', name: 'Payment Splits', icon: CalculatorIcon },
              { id: 'commissions', name: 'Commissions', icon: CurrencyDollarIcon },
              { id: 'booth-rent', name: 'Booth Rent', icon: HomeIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 inline-flex items-center space-x-2 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-green-500 text-green-400'
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
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Barbers</p>
                    <p className="text-2xl font-bold text-white">{barberPayments.length}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {barberPayments.filter(b => b.payment_type === 'commission').length} commission • 
                      {barberPayments.filter(b => b.payment_type === 'booth_rent').length} booth rent
                    </p>
                  </div>
                  <UserGroupIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Connected Accounts</p>
                    <p className="text-2xl font-bold text-green-400">
                      {barberPayments.filter(b => b.stripe_connected || b.square_connected).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Ready for payouts</p>
                  </div>
                  <LinkIcon className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Pending Commissions</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {formatCurrency(
                        commissionPayments
                          .filter(c => c.status === 'pending')
                          .reduce((sum, c) => sum + c.barber_payout, 0)
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">To be paid out</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(
                        paymentSplits.reduce((sum, split) => sum + split.total_amount, 0)
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">All barbers combined</p>
                  </div>
                  <BanknotesIcon className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Barber Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {barberPayments.map((barber) => {
                const nextRent = getNextBoothRentDue(barber.barber_id)
                const totalRevenue = calculateTotalRevenue(barber.barber_id)
                const pendingCommissions = calculatePendingCommissions(barber.barber_id)

                return (
                  <div key={barber.barber_id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{barber.barber_name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          barber.payment_type === 'commission' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {barber.payment_type === 'commission' 
                            ? `${barber.commission_rate}% Commission` 
                            : `$${barber.booth_rent_amount} ${barber.booth_rent_frequency}`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Payment Platform Connections */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Image
                            src="/stripe-icon.png"
                            alt="Stripe"
                            width={24}
                            height={24}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">Stripe</span>
                        </div>
                        {barber.stripe_connected ? (
                          <span className="flex items-center text-xs text-green-400">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Connected
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStripeConnect(barber.barber_id)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Connect
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Image
                            src="/square-icon.png"
                            alt="Square"
                            width={24}
                            height={24}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">Square</span>
                        </div>
                        {barber.square_connected ? (
                          <span className="flex items-center text-xs text-green-400">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Connected
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSquareConnect(barber.barber_id)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Connect
                          </button>
                        )}
                      </div>

                      {barber.payment_type === 'booth_rent' && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Image
                              src="/rentpedi-icon.png"
                              alt="RentRedi"
                              width={24}
                              height={24}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-300">RentRedi</span>
                          </div>
                          {barber.rentpedi_connected ? (
                            <span className="flex items-center text-xs text-green-400">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Connected
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRentRediConnect(barber.barber_id)}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Revenue Stats */}
                    <div className="space-y-2 pt-4 border-t border-gray-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Revenue</span>
                        <span className="text-white font-medium">{formatCurrency(totalRevenue)}</span>
                      </div>
                      
                      {barber.payment_type === 'commission' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Pending Payout</span>
                          <span className="text-yellow-400 font-medium">{formatCurrency(pendingCommissions)}</span>
                        </div>
                      )}
                      
                      {barber.payment_type === 'booth_rent' && nextRent && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Next Rent Due</span>
                          <span className="text-red-400 font-medium">
                            {formatDate(nextRent.due_date)} • {formatCurrency(nextRent.amount)}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedBarber(barber.barber_id)}
                      className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'splits' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Recent Payment Splits</h3>
              <p className="text-sm text-gray-400 mt-1">Automatic splits between barbers and shop</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Barber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Tips
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Barber Gets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Shop Gets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {paymentSplits.map((split) => {
                    const barber = barberPayments.find(b => b.barber_id === split.barber_id)
                    return (
                      <tr key={`${split.barber_id}-${split.appointment_id}`} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {split.processed_at ? formatDate(split.processed_at) : 'Pending'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {barber?.barber_name || `Barber ${split.barber_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatCurrency(split.service_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatCurrency(split.product_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">
                          {formatCurrency(split.tip_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                          {formatCurrency(split.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-400">
                          {formatCurrency(split.barber_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatCurrency(split.shop_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            split.status === 'processed' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {split.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'commissions' && (
          <div className="space-y-6">
            {/* Commission Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Total Pending</h4>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(
                    commissionPayments
                      .filter(c => c.status === 'pending')
                      .reduce((sum, c) => sum + c.barber_payout, 0)
                  )}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Paid This Month</h4>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(
                    commissionPayments
                      .filter(c => c.status === 'paid' && new Date(c.paid_at!).getMonth() === new Date().getMonth())
                      .reduce((sum, c) => sum + c.barber_payout, 0)
                  )}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Shop Revenue</h4>
                <p className="text-2xl font-bold text-purple-400">
                  {formatCurrency(
                    commissionPayments.reduce((sum, c) => sum + c.commission_amount, 0)
                  )}
                </p>
              </div>
            </div>

            {/* Commission Payments Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Commission Payments</h3>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Process Payouts
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Barber
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Service Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Product Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Tips
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Commission (30%)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Barber Payout
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {commissionPayments.map((payment) => {
                      const barber = barberPayments.find(b => b.barber_id === payment.barber_id)
                      return (
                        <tr key={payment.id} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {barber?.barber_name || `Barber ${payment.barber_id}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatCurrency(payment.service_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatCurrency(payment.product_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">
                            {formatCurrency(payment.tip_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">
                            -{formatCurrency(payment.commission_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-400">
                            {formatCurrency(payment.barber_payout)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              payment.status === 'paid' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : payment.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'booth-rent' && (
          <div className="space-y-6">
            {/* Booth Rent Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Total Due</h4>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(
                    boothRentPayments
                      .filter(b => b.status === 'pending')
                      .reduce((sum, b) => sum + b.amount, 0)
                  )}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Collected This Month</h4>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(
                    boothRentPayments
                      .filter(b => b.status === 'paid' && new Date(b.paid_at!).getMonth() === new Date().getMonth())
                      .reduce((sum, b) => sum + b.amount, 0)
                  )}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Booth Rent Barbers</h4>
                <p className="text-2xl font-bold text-blue-400">
                  {barberPayments.filter(b => b.payment_type === 'booth_rent').length}
                </p>
              </div>
            </div>

            {/* Booth Rent Payments Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Booth Rent Payments</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Barber
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Paid Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {boothRentPayments.map((payment) => {
                      const barber = barberPayments.find(b => b.barber_id === payment.barber_id)
                      const isPastDue = new Date(payment.due_date) < new Date() && payment.status === 'pending'
                      
                      return (
                        <tr key={payment.id} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={isPastDue ? 'text-red-400 font-medium' : 'text-gray-300'}>
                              {formatDate(payment.due_date)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {barber?.barber_name || `Barber ${payment.barber_id}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              payment.status === 'paid' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : isPastDue
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                              {payment.status === 'pending' && isPastDue ? 'PAST DUE' : payment.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {payment.paid_at ? formatDate(payment.paid_at) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {payment.payment_method || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {payment.status === 'pending' && (
                              <button className="text-blue-400 hover:text-blue-300">
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
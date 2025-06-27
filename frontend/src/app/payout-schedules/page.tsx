'use client'

import React, { useEffect, useState, ErrorInfo, Component, ReactNode } from 'react'
import {
  ClockIcon,
  CogIcon,
  CalendarIcon,
  BanknotesIcon,
  UserIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  TagIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import apiClient from '@/lib/api/client'
import { barbersService } from '@/lib/api/barbers'

// Types based on backend API models
interface PayoutSchedule {
  id: number
  barber_id: number
  barber_name: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  day_of_week?: number // 0=Monday, 6=Sunday
  day_of_month?: number // 1-31
  custom_interval_days?: number
  minimum_payout_amount: number
  auto_payout_enabled: boolean
  email_notifications: boolean
  sms_notifications: boolean
  advance_notice_days: number
  preferred_payment_method: string
  backup_payment_method?: string
  is_active: boolean
  last_payout_date?: string
  next_payout_date?: string
  total_payouts_sent: number
  total_amount_paid: number
  created_at: string
  updated_at: string
}

interface PayoutAnalytics {
  total_paid_out: number
  total_pending: number
  average_payout_amount: number
  total_fees_paid: number
  payouts_by_status: Record<string, number>
  payouts_by_method: Record<string, number>
  monthly_trend: Array<{month: string, count: number, total: number}>
  next_scheduled_payouts: Array<{
    barber_id: number
    barber_name: string
    scheduled_date: string
    amount: number
  }>
  // Product commission analytics
  total_product_sales: number
  total_product_commissions: number
  product_sales_count: number
  average_commission_rate: number
  top_selling_products: Array<{
    product_name: string
    quantity_sold: number
    total_revenue: number
    total_commission: number
  }>
  product_sales_trend: Array<{
    month: string
    sales: number
    commissions: number
  }>
}

interface BarberEarnings {
  barber_id: number
  barber_name: string
  period: {
    start_date: string
    end_date: string
  }
  service_earnings: {
    revenue: number
    payout_count: number
  }
  product_earnings: {
    sales_revenue: number
    commission_earned: number
    commission_rate: number
    sales_count: number
    product_breakdown: Record<string, {
      quantity: number
      revenue: number
      commission: number
    }>
  }
  total_earnings: number
  earnings_breakdown: {
    service_percentage: number
    product_percentage: number
  }
}

interface ScheduleForm {
  barber_id: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  day_of_week?: number
  day_of_month?: number
  custom_interval_days?: number
  minimum_payout_amount: string
  auto_payout_enabled: boolean
  email_notifications: boolean
  sms_notifications: boolean
  advance_notice_days: number
  preferred_payment_method: string
  backup_payment_method: string
}

// Utility functions for data validation and safety
const safeFormatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00'
  }
  return formatCurrency(amount)
}

const safePercentage = (value: number | undefined | null, decimals: number = 1): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0%'
  }
  return `${value.toFixed(decimals)}%`
}

const safeCalculatePercentage = (part: number | undefined | null, total: number | undefined | null): number => {
  if (!part || !total || total === 0 || isNaN(part) || isNaN(total)) {
    return 0
  }
  return (part / total) * 100
}

const safeGetArrayLength = (arr: any[] | undefined | null): number => {
  return Array.isArray(arr) ? arr.length : 0
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class PayoutSchedulesErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PayoutSchedules Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              We encountered an unexpected error while loading the payout schedules.
              Please refresh the page or contact support if the problem persists.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function PayoutSchedulesPage() {
  const [schedules, setSchedules] = useState<PayoutSchedule[]>([])
  const [barbers, setBarbers] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<PayoutAnalytics | null>(null)
  const [barberEarnings, setBarberEarnings] = useState<Record<number, BarberEarnings>>({})
  const [loading, setLoading] = useState(true)
  const [earningsLoading, setEarningsLoading] = useState<Record<number, boolean>>({})
  const [earningsError, setEarningsError] = useState<Record<number, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFrequency, setFilterFrequency] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<PayoutSchedule | null>(null)
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    barber_id: '',
    frequency: 'WEEKLY',
    day_of_week: 1, // Tuesday
    minimum_payout_amount: '25.00',
    auto_payout_enabled: true,
    email_notifications: true,
    sms_notifications: false,
    advance_notice_days: 1,
    preferred_payment_method: 'stripe',
    backup_payment_method: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setApiError(null)

      // Fetch barbers
      const barbersResponse = await barbersService.getBarbers()
      const barbersData = Array.isArray(barbersResponse) ? barbersResponse : (barbersResponse?.data || [])
      setBarbers(Array.isArray(barbersData) ? barbersData : [])

      // Fetch payout schedules
      const schedulesResponse = await apiClient.get('/payout-schedules/schedules')
      setSchedules(schedulesResponse.data || [])

      // Fetch analytics
      const analyticsResponse = await apiClient.get('/payout-schedules/analytics')
      setAnalytics(analyticsResponse.data || null)

      // Fetch earnings data for each barber with better error handling
      const barbersArray = Array.isArray(barbersData) ? barbersData : []
      const loadingMap: Record<number, boolean> = {}
      const errorMap: Record<number, string> = {}

      // Initialize loading states
      barbersArray.forEach(barber => {
        loadingMap[barber.id] = true
      })
      setEarningsLoading(loadingMap)
      setEarningsError({})

      const earningsPromises = barbersArray.map(async (barber) => {
        try {
          const earningsResponse = await apiClient.get(`/payout-schedules/barber/${barber.id}/total-earnings`)
          return { barberId: barber.id, earnings: earningsResponse.data, error: null }
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Failed to load earnings'
          console.error(`Failed to fetch earnings for barber ${barber.id}:`, error)
          return { barberId: barber.id, earnings: null, error: errorMessage }
        }
      })

      const earningsResults = await Promise.allSettled(earningsPromises)
      const earningsMap: Record<number, BarberEarnings> = {}
      const newLoadingMap: Record<number, boolean> = {}
      const newErrorMap: Record<number, string> = {}

      earningsResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { barberId, earnings, error } = result.value
          newLoadingMap[barberId] = false

          if (earnings) {
            earningsMap[barberId] = earnings
          } else if (error) {
            newErrorMap[barberId] = error
          }
        }
      })

      setBarberEarnings(earningsMap)
      setEarningsLoading(newLoadingMap)
      setEarningsError(newErrorMap)

    } catch (error: any) {
      console.error('Failed to fetch payout schedules:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load payout data'
      setApiError(errorMessage)
      // Use mock data for development
      setSchedules([
        {
          id: 1,
          barber_id: 1,
          barber_name: 'Marcus Johnson',
          frequency: 'WEEKLY',
          day_of_week: 1,
          minimum_payout_amount: 25.00,
          auto_payout_enabled: true,
          email_notifications: true,
          sms_notifications: false,
          advance_notice_days: 1,
          preferred_payment_method: 'stripe',
          is_active: true,
          next_payout_date: '2024-06-25',
          total_payouts_sent: 12,
          total_amount_paid: 8400.00,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-06-20T10:00:00Z'
        },
        {
          id: 2,
          barber_id: 2,
          barber_name: 'Anthony Davis',
          frequency: 'MONTHLY',
          day_of_month: 1,
          minimum_payout_amount: 100.00,
          auto_payout_enabled: true,
          email_notifications: true,
          sms_notifications: true,
          advance_notice_days: 3,
          preferred_payment_method: 'stripe',
          is_active: true,
          next_payout_date: '2024-07-01',
          total_payouts_sent: 6,
          total_amount_paid: 4200.00,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-06-20T10:00:00Z'
        }
      ])
      setAnalytics({
        total_paid_out: 12600.00,
        total_pending: 950.00,
        average_payout_amount: 700.00,
        total_fees_paid: 126.00,
        payouts_by_status: { completed: 18, pending: 2, failed: 0 },
        payouts_by_method: { stripe: 12600.00 },
        monthly_trend: [
          { month: '2024-01', count: 2, total: 1400.00 },
          { month: '2024-02', count: 2, total: 1400.00 },
          { month: '2024-03', count: 2, total: 1400.00 }
        ],
        next_scheduled_payouts: [
          { barber_id: 1, barber_name: 'Marcus Johnson', scheduled_date: '2024-06-25', amount: 650.00 },
          { barber_id: 2, barber_name: 'Anthony Davis', scheduled_date: '2024-07-01', amount: 300.00 }
        ],
        // Product commission mock data with Shopify integration
        total_product_sales: 4500.00,
        total_product_commissions: 675.00,
        product_sales_count: 28,
        average_commission_rate: 0.15,
        top_selling_products: [
          {
            product_name: "Premium Pomade",
            quantity_sold: 12,
            total_revenue: 240.00,
            total_commission: 36.00
          },
          {
            product_name: "Professional Clippers",
            quantity_sold: 3,
            total_revenue: 450.00,
            total_commission: 67.50
          },
          {
            product_name: "Beard Oil",
            quantity_sold: 8,
            total_revenue: 160.00,
            total_commission: 24.00
          },
          {
            product_name: "Hair Wax",
            quantity_sold: 5,
            total_revenue: 75.00,
            total_commission: 11.25
          },
          {
            product_name: "Styling Gel",
            quantity_sold: 6,
            total_revenue: 90.00,
            total_commission: 13.50
          }
        ],
        product_sales_trend: [
          { month: '2024-01', sales: 1200.00, commissions: 180.00 },
          { month: '2024-02', sales: 1650.00, commissions: 247.50 },
          { month: '2024-03', sales: 1650.00, commissions: 247.50 }
        ],
      })

      // Mock barber earnings data
      setBarberEarnings({
        1: {
          barber_id: 1,
          barber_name: "Marcus Johnson",
          period: {
            start_date: "2024-05-27",
            end_date: "2024-06-27"
          },
          service_earnings: {
            revenue: 2400.00,
            payout_count: 8
          },
          product_earnings: {
            sales_revenue: 800.00,
            commission_earned: 120.00,
            commission_rate: 0.15,
            sales_count: 15,
            product_breakdown: {
              "Premium Pomade": {
                quantity: 8,
                revenue: 160.00,
                commission: 24.00
              },
              "Beard Oil": {
                quantity: 4,
                revenue: 80.00,
                commission: 12.00
              },
              "Professional Clippers": {
                quantity: 1,
                revenue: 150.00,
                commission: 22.50
              }
            }
          },
          total_earnings: 2520.00,
          earnings_breakdown: {
            service_percentage: 95.2,
            product_percentage: 4.8
          }
        },
        2: {
          barber_id: 2,
          barber_name: "Anthony Davis",
          period: {
            start_date: "2024-05-27",
            end_date: "2024-06-27"
          },
          service_earnings: {
            revenue: 1800.00,
            payout_count: 6
          },
          product_earnings: {
            sales_revenue: 350.00,
            commission_earned: 52.50,
            commission_rate: 0.15,
            sales_count: 8,
            product_breakdown: {
              "Hair Wax": {
                quantity: 5,
                revenue: 75.00,
                commission: 11.25
              },
              "Beard Oil": {
                quantity: 3,
                revenue: 60.00,
                commission: 9.00
              }
            }
          },
          total_earnings: 1852.50,
          earnings_breakdown: {
            service_percentage: 97.2,
            product_percentage: 2.8
          }
        }
      })
    } finally {
      setLoading(false)
    }
  }

  // Retry function for individual barber earnings
  const retryBarberEarnings = async (barberId: number) => {
    setEarningsLoading(prev => ({ ...prev, [barberId]: true }))
    setEarningsError(prev => ({ ...prev, [barberId]: '' }))

    try {
      const earningsResponse = await apiClient.get(`/payout-schedules/barber/${barberId}/total-earnings`)
      setBarberEarnings(prev => ({ ...prev, [barberId]: earningsResponse.data }))
      setEarningsLoading(prev => ({ ...prev, [barberId]: false }))
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load earnings'
      setEarningsError(prev => ({ ...prev, [barberId]: errorMessage }))
      setEarningsLoading(prev => ({ ...prev, [barberId]: false }))
      console.error(`Failed to retry earnings for barber ${barberId}:`, error)
    }
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        barber_id: parseInt(scheduleForm.barber_id),
        frequency: scheduleForm.frequency,
        minimum_payout_amount: parseFloat(scheduleForm.minimum_payout_amount),
        auto_payout_enabled: scheduleForm.auto_payout_enabled,
        email_notifications: scheduleForm.email_notifications,
        sms_notifications: scheduleForm.sms_notifications,
        advance_notice_days: scheduleForm.advance_notice_days,
        preferred_payment_method: scheduleForm.preferred_payment_method,
        backup_payment_method: scheduleForm.backup_payment_method || undefined,
        ...(scheduleForm.frequency === 'WEEKLY' && { day_of_week: scheduleForm.day_of_week }),
        ...(scheduleForm.frequency === 'MONTHLY' && { day_of_month: scheduleForm.day_of_month }),
        ...(scheduleForm.frequency === 'CUSTOM' && { custom_interval_days: scheduleForm.custom_interval_days })
      }

      await apiClient.post('/payout-schedules/schedules', payload)

      // Reset form and close modal
      setScheduleForm({
        barber_id: '',
        frequency: 'WEEKLY',
        day_of_week: 1,
        minimum_payout_amount: '25.00',
        auto_payout_enabled: true,
        email_notifications: true,
        sms_notifications: false,
        advance_notice_days: 1,
        preferred_payment_method: 'stripe',
        backup_payment_method: ''
      })
      setShowCreateModal(false)
      fetchData()
    } catch (error: any) {
      console.error('Failed to create schedule:', error)
      alert(`Failed to create schedule: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleUpdateSchedule = async (scheduleId: number) => {
    try {
      const payload = {
        frequency: scheduleForm.frequency,
        minimum_payout_amount: parseFloat(scheduleForm.minimum_payout_amount),
        auto_payout_enabled: scheduleForm.auto_payout_enabled,
        email_notifications: scheduleForm.email_notifications,
        sms_notifications: scheduleForm.sms_notifications,
        advance_notice_days: scheduleForm.advance_notice_days,
        preferred_payment_method: scheduleForm.preferred_payment_method,
        backup_payment_method: scheduleForm.backup_payment_method || undefined,
        ...(scheduleForm.frequency === 'WEEKLY' && { day_of_week: scheduleForm.day_of_week }),
        ...(scheduleForm.frequency === 'MONTHLY' && { day_of_month: scheduleForm.day_of_month }),
        ...(scheduleForm.frequency === 'CUSTOM' && { custom_interval_days: scheduleForm.custom_interval_days })
      }

      await apiClient.put(`/payout-schedules/schedules/${scheduleId}`, payload)

      setEditingSchedule(null)
      setScheduleForm({
        barber_id: '',
        frequency: 'WEEKLY',
        day_of_week: 1,
        minimum_payout_amount: '25.00',
        auto_payout_enabled: true,
        email_notifications: true,
        sms_notifications: false,
        advance_notice_days: 1,
        preferred_payment_method: 'stripe',
        backup_payment_method: ''
      })
      fetchData()
    } catch (error: any) {
      console.error('Failed to update schedule:', error)
      alert(`Failed to update schedule: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm('Are you sure you want to delete this payout schedule?')) return

    try {
      await apiClient.delete(`/payout-schedules/schedules/${scheduleId}`)
      fetchData()
    } catch (error: any) {
      console.error('Failed to delete schedule:', error)
      alert(`Failed to delete schedule: ${error.response?.data?.detail || error.message}`)
    }
  }

  const startEdit = (schedule: PayoutSchedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      barber_id: schedule.barber_id.toString(),
      frequency: schedule.frequency,
      day_of_week: schedule.day_of_week,
      day_of_month: schedule.day_of_month,
      custom_interval_days: schedule.custom_interval_days,
      minimum_payout_amount: schedule.minimum_payout_amount.toString(),
      auto_payout_enabled: schedule.auto_payout_enabled,
      email_notifications: schedule.email_notifications,
      sms_notifications: schedule.sms_notifications,
      advance_notice_days: schedule.advance_notice_days,
      preferred_payment_method: schedule.preferred_payment_method,
      backup_payment_method: schedule.backup_payment_method || ''
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getFrequencyDisplay = (schedule: PayoutSchedule) => {
    switch (schedule.frequency) {
      case 'DAILY':
        return 'Daily'
      case 'WEEKLY':
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return `Weekly on ${dayNames[schedule.day_of_week || 0]}`
      case 'MONTHLY':
        return `Monthly on the ${schedule.day_of_month}${getOrdinalSuffix(schedule.day_of_month || 1)}`
      case 'CUSTOM':
        return `Every ${schedule.custom_interval_days} days`
      default:
        return schedule.frequency
    }
  }

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.barber_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFrequency = filterFrequency === 'all' || schedule.frequency === filterFrequency
    const matchesActive = filterActive === 'all' ||
      (filterActive === 'active' && schedule.is_active) ||
      (filterActive === 'inactive' && !schedule.is_active)

    return matchesSearch && matchesFrequency && matchesActive
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Styles for Shopify Integration */}
      <style jsx>{`
        .hover-lift:hover {
          transform: translateY(-2px);
          transition: all 0.2s ease-in-out;
        }

        .premium-card-modern {
          background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(226,232,240,0.5);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        }

        .premium-card-modern:hover {
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
        }

        .source-indicator {
          position: relative;
          overflow: hidden;
        }

        .source-indicator::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6 50%, #10b981 50%);
        }
      `}</style>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payout Schedules</h1>
          <p className="text-gray-600 mt-1">Manage automated payout schedules for your barbers</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Schedule</span>
        </button>
      </div>

      {/* API Error Display */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Unable to load payout data</h3>
                <p className="text-sm text-red-700 mt-1">{apiError}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={fetchData}
                className="text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-100 px-3 py-1 rounded transition-colors flex items-center space-x-1"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>Retry</span>
              </button>
              <button
                onClick={() => setApiError(null)}
                className="text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-100 px-2 py-1 rounded transition-colors"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search barbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterFrequency}
          onChange={(e) => setFilterFrequency(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          <option value="all">All Frequencies</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="CUSTOM">Custom</option>
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="space-y-6">
          {/* Main Analytics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="premium-card-modern p-6 hover-lift" title="Total amount paid to barbers for services">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                  <BanknotesIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600">Total Paid Out</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{safeFormatCurrency(analytics.total_paid_out)}</p>
              <p className="text-xs text-gray-500 mt-1">Service payouts</p>
            </div>

            <div className="premium-card-modern p-6 hover-lift" title="Amount scheduled for upcoming payouts">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{safeFormatCurrency(analytics.total_pending)}</p>
              <p className="text-xs text-gray-500 mt-1">Scheduled payments</p>
            </div>

            <div className="premium-card-modern p-6 hover-lift group" title="Total revenue from product sales - hover for source breakdown">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  <ShoppingBagIcon className="h-6 w-6 text-white" />
                </div>
                <InformationCircleIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Product Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{safeFormatCurrency(analytics.total_product_sales)}</p>
              <p className="text-xs text-gray-500 mt-1">{analytics.product_sales_count || 0} transactions</p>
            </div>

            <div className="premium-card-modern p-6 hover-lift group" title="Product commissions from all sources">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
                  <CurrencyDollarIcon className="h-6 w-6 text-white" />
                </div>
                <InformationCircleIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Product Commissions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{safeFormatCurrency(analytics.total_product_commissions)}</p>
              <p className="text-xs text-gray-500 mt-1">{safePercentage(analytics.average_commission_rate * 100)} avg rate</p>
            </div>

            <div className="premium-card-modern p-6 hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600">Average Payout</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{safeFormatCurrency(analytics.average_payout_amount)}</p>
              <p className="text-xs text-gray-500 mt-1">Per transaction</p>
            </div>

            <div className="premium-card-modern p-6 hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                  <CogIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600">Active Schedules</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{schedules.filter(s => s.is_active).length}</p>
              <p className="text-xs text-gray-500 mt-1">Auto-payout enabled</p>
            </div>
          </div>

        </div>
      )}

      {/* Top Products Section */}
      {analytics && analytics.top_selling_products.length > 0 && (
        <div className="premium-card-modern p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrophyIcon className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
            </div>
            <span className="text-sm text-gray-500">Last 30 days</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {analytics.top_selling_products.map((product, index) => (
              <div key={product.product_name} className="bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:bg-gray-100 hover:shadow-md">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <TagIcon className="h-4 w-4 text-gray-400" />
                </div>

                  <h4 className="font-medium text-gray-900 text-sm truncate group-hover:text-gray-700">{product.product_name}</h4>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Sold:</span>
                      <span className="font-medium">{product.quantity_sold}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Revenue:</span>
                      <span className="font-medium">{safeFormatCurrency(product.total_revenue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Commission:</span>
                      <span className="font-medium text-green-600">{safeFormatCurrency(product.total_commission)}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Schedules List */}
      <div className="premium-card-modern overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200/50">
          <h3 className="text-lg font-semibold text-gray-900">Payout Schedules</h3>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No payout schedules found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              Create Your First Schedule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200/50">
            {filteredSchedules.map((schedule) => {
              const earnings = barberEarnings[schedule.barber_id];
              return (
                <div key={schedule.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                          schedule.is_active
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          <UserIcon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg font-medium text-gray-900">{schedule.barber_name}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {schedule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{getFrequencyDisplay(schedule)}</p>

                        {/* Earnings Breakdown */}
                        {earningsLoading[schedule.barber_id] ? (
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 mb-3">
                            <div className="animate-pulse">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div className="text-center">
                                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                                  <div className="h-6 bg-gray-300 rounded mb-1"></div>
                                  <div className="h-3 bg-gray-200 rounded"></div>
                                </div>
                                <div className="text-center">
                                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                                  <div className="h-6 bg-gray-300 rounded mb-1"></div>
                                  <div className="h-3 bg-gray-200 rounded"></div>
                                </div>
                                <div className="text-center">
                                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                                  <div className="h-6 bg-gray-300 rounded mb-1"></div>
                                  <div className="h-3 bg-gray-200 rounded"></div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-center space-x-2 text-gray-500 mt-2">
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Loading earnings data...</span>
                            </div>
                          </div>
                        ) : earningsError[schedule.barber_id] ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-red-700">
                                <ExclamationTriangleIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">Failed to load earnings</span>
                              </div>
                              <button
                                onClick={() => retryBarberEarnings(schedule.barber_id)}
                                className="text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-100 px-2 py-1 rounded transition-colors"
                              >
                                Retry
                              </button>
                            </div>
                            <p className="text-xs text-red-600 mt-1">{earningsError[schedule.barber_id]}</p>
                          </div>
                        ) : earnings ? (
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-3 transition-all duration-200 hover:shadow-md hover:from-blue-100 hover:to-purple-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-1 mb-1" title="Revenue earned from service appointments">
                                  <BanknotesIcon className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium text-gray-700">Service Revenue</span>
                                </div>
                                <p className="text-lg font-bold text-blue-600">{safeFormatCurrency(earnings.service_earnings.revenue)}</p>
                                <p className="text-xs text-gray-500">{earnings.service_earnings.payout_count || 0} payouts</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-1 mb-1" title="Commissions earned from product sales">
                                  <ShoppingBagIcon className="h-4 w-4 text-purple-500" />
                                  <span className="font-medium text-gray-700">Product Commissions</span>
                                </div>
                                <p className="text-lg font-bold text-purple-600">{safeFormatCurrency(earnings.product_earnings.commission_earned)}</p>
                                <p className="text-xs text-gray-500">{earnings.product_earnings.sales_count || 0} sales • {safePercentage(earnings.product_earnings.commission_rate * 100)}% rate</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-1 mb-1" title="Combined earnings from services and product commissions">
                                  <CurrencyDollarIcon className="h-4 w-4 text-green-500" />
                                  <span className="font-medium text-gray-700">Total Earnings</span>
                                </div>
                                <p className="text-lg font-bold text-green-600">{safeFormatCurrency(earnings.total_earnings)}</p>
                                <div className="flex justify-center space-x-2 text-xs text-gray-500">
                                  <span>{safePercentage(earnings.earnings_breakdown.service_percentage, 0)} service</span>
                                  <span>•</span>
                                  <span>{safePercentage(earnings.earnings_breakdown.product_percentage, 0)} product</span>
                                </div>
                              </div>
                            </div>

                            {/* Top Products */}
                            {earnings.product_earnings.product_breakdown && Object.keys(earnings.product_earnings.product_breakdown).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-600 mb-2">Top Products:</p>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(earnings.product_earnings.product_breakdown)
                                    .sort(([,a], [,b]) => b.revenue - a.revenue)
                                    .slice(0, 3)
                                    .map(([product, data]) => (
                                      <div key={product} className="bg-white rounded-md px-2 py-1 text-xs">
                                        <span className="font-medium text-gray-700">{product}</span>
                                        <span className="text-gray-500 ml-1">{data.quantity || 0}x • {safeFormatCurrency(data.commission)}</span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-center space-x-2 text-gray-500">
                              <InformationCircleIcon className="h-4 w-4" />
                              <span className="text-sm">No earnings data available</span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <BanknotesIcon className="h-4 w-4 text-gray-400" />
                            <span>Min: {safeFormatCurrency(schedule.minimum_payout_amount)}</span>
                          </div>
                          {schedule.next_payout_date && (
                            <div className="flex items-center space-x-1">
                              <CalendarIcon className="h-4 w-4 text-gray-400" />
                              <span>Next: {new Date(schedule.next_payout_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <span>Payouts: {schedule.total_payouts_sent}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>Total: {safeFormatCurrency(schedule.total_amount_paid)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <span className={`flex items-center space-x-1 ${schedule.auto_payout_enabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {schedule.auto_payout_enabled ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
                            <span>Auto Payout</span>
                          </span>
                          <span className={`flex items-center space-x-1 ${schedule.email_notifications ? 'text-blue-600' : 'text-gray-500'}`}>
                            {schedule.email_notifications ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
                            <span>Email</span>
                          </span>
                          <span className={`flex items-center space-x-1 ${schedule.sms_notifications ? 'text-purple-600' : 'text-gray-500'}`}>
                            {schedule.sms_notifications ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
                            <span>SMS</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => startEdit(schedule)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm hover:bg-red-50 px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Schedule Modal */}
      {(showCreateModal || editingSchedule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingSchedule ? 'Edit Payout Schedule' : 'Create Payout Schedule'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingSchedule(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={editingSchedule ? (e) => { e.preventDefault(); handleUpdateSchedule(editingSchedule.id) } : handleCreateSchedule} className="p-6">
              <div className="space-y-6">
                {/* Barber Selection - only for create */}
                {!editingSchedule && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barber *
                    </label>
                    <select
                      required
                      value={scheduleForm.barber_id}
                      onChange={(e) => setScheduleForm({...scheduleForm, barber_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="">Select a barber</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.first_name} {barber.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payout Frequency *
                  </label>
                  <select
                    required
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({...scheduleForm, frequency: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="CUSTOM">Custom Interval</option>
                  </select>
                </div>

                {/* Frequency-specific fields */}
                {scheduleForm.frequency === 'WEEKLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Week *
                    </label>
                    <select
                      required
                      value={scheduleForm.day_of_week || 0}
                      onChange={(e) => setScheduleForm({...scheduleForm, day_of_week: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value={0}>Monday</option>
                      <option value={1}>Tuesday</option>
                      <option value={2}>Wednesday</option>
                      <option value={3}>Thursday</option>
                      <option value={4}>Friday</option>
                      <option value={5}>Saturday</option>
                      <option value={6}>Sunday</option>
                    </select>
                  </div>
                )}

                {scheduleForm.frequency === 'MONTHLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Month *
                    </label>
                    <select
                      required
                      value={scheduleForm.day_of_month || 1}
                      onChange={(e) => setScheduleForm({...scheduleForm, day_of_month: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                {scheduleForm.frequency === 'CUSTOM' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interval (Days) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      required
                      value={scheduleForm.custom_interval_days || ''}
                      onChange={(e) => setScheduleForm({...scheduleForm, custom_interval_days: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Enter number of days"
                    />
                  </div>
                )}

                {/* Minimum Payout Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Payout Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={scheduleForm.minimum_payout_amount}
                    onChange={(e) => setScheduleForm({...scheduleForm, minimum_payout_amount: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="25.00"
                  />
                </div>

                {/* Payment Methods */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Payment Method *
                    </label>
                    <select
                      required
                      value={scheduleForm.preferred_payment_method}
                      onChange={(e) => setScheduleForm({...scheduleForm, preferred_payment_method: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="stripe">Stripe</option>
                      <option value="square">Square</option>
                      <option value="paypal">PayPal</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Backup Payment Method
                    </label>
                    <select
                      value={scheduleForm.backup_payment_method}
                      onChange={(e) => setScheduleForm({...scheduleForm, backup_payment_method: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      <option value="stripe">Stripe</option>
                      <option value="square">Square</option>
                      <option value="paypal">PayPal</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Auto Payout</label>
                      <p className="text-xs text-gray-500">Automatically process payouts when scheduled</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={scheduleForm.auto_payout_enabled}
                      onChange={(e) => setScheduleForm({...scheduleForm, auto_payout_enabled: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                      <p className="text-xs text-gray-500">Send email alerts for payout events</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={scheduleForm.email_notifications}
                      onChange={(e) => setScheduleForm({...scheduleForm, email_notifications: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                      <p className="text-xs text-gray-500">Send SMS alerts for payout events</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={scheduleForm.sms_notifications}
                      onChange={(e) => setScheduleForm({...scheduleForm, sms_notifications: e.target.checked})}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                {/* Advance Notice Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Advance Notice (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={scheduleForm.advance_notice_days}
                    onChange={(e) => setScheduleForm({...scheduleForm, advance_notice_days: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">How many days before the payout to send notifications</p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingSchedule(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-colors"
                >
                  {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Export the component wrapped with error boundary for comprehensive error handling
export default function PayoutSchedulesPageWithErrorBoundary() {
  return (
    <PayoutSchedulesErrorBoundary>
      <PayoutSchedulesPage />
    </PayoutSchedulesErrorBoundary>
  )
}

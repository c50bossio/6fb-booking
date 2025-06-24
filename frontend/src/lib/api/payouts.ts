/**
 * Payout API - Barber payout management and history
 */

import apiClient from './client'
import type { ApiResponse } from './client'

// === DEMO MODE CONFIGURATION ===
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// === TYPE DEFINITIONS ===

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type PayoutMethod = 'bank_transfer' | 'stripe' | 'check' | 'cash'

export interface Payout {
  id: number
  barber_id: number
  barber_name: string
  amount: number
  status: PayoutStatus
  method: PayoutMethod
  reference_number: string
  created_at: string
  processed_at?: string
  completed_at?: string
  failed_at?: string
  error_message?: string
  period_start: string
  period_end: string
  breakdown: PayoutBreakdown
  receipt_url?: string
  bank_account_last4?: string
  stripe_transfer_id?: string
}

export interface PayoutBreakdown {
  service_revenue: number
  product_revenue: number
  tips: number
  commission_rate?: number
  commission_amount?: number
  booth_rent?: number
  adjustments?: number
  fees?: number
  net_amount: number
}

export interface BarberEarnings {
  barber_id: number
  barber_name: string
  period: string
  total_revenue: number
  service_revenue: number
  product_revenue: number
  tips: number
  appointment_count: number
  average_ticket: number
  commission_rate?: number
  commission_earned?: number
  booth_rent?: number
  net_earnings: number
  payment_type: 'commission' | 'booth_rental'
  pending_payout: number
  earnings_trend: number
  top_services: ServiceEarning[]
  daily_earnings: DailyEarning[]
}

export interface ServiceEarning {
  service_id: number
  service_name: string
  count: number
  revenue: number
  average_price: number
}

export interface DailyEarning {
  date: string
  revenue: number
  appointments: number
  tips: number
}

export interface PayoutFilters {
  barber_id?: number
  status?: PayoutStatus
  method?: PayoutMethod
  date_from?: string
  date_to?: string
  min_amount?: number
  max_amount?: number
}

// === MOCK DATA FOR DEMO MODE ===

const MOCK_PAYOUTS: Payout[] = [
  {
    id: 1,
    barber_id: 1,
    barber_name: "Marcus Johnson",
    amount: 5917.60,
    status: 'completed',
    method: 'bank_transfer',
    reference_number: 'PAY-2024-001',
    created_at: '2024-01-15T10:00:00Z',
    processed_at: '2024-01-15T14:00:00Z',
    completed_at: '2024-01-16T09:00:00Z',
    period_start: '2024-01-01',
    period_end: '2024-01-14',
    breakdown: {
      service_revenue: 6500.00,
      product_revenue: 1456.00,
      tips: 500.00,
      commission_rate: 70,
      commission_amount: 5917.60,
      fees: 0,
      net_amount: 5917.60
    },
    receipt_url: '/receipts/PAY-2024-001.pdf',
    bank_account_last4: '4321'
  },
  {
    id: 2,
    barber_id: 2,
    barber_name: "David Chen",
    amount: 5234.50,
    status: 'completed',
    method: 'stripe',
    reference_number: 'PAY-2024-002',
    created_at: '2024-01-15T10:00:00Z',
    processed_at: '2024-01-15T14:00:00Z',
    completed_at: '2024-01-16T09:00:00Z',
    period_start: '2024-01-01',
    period_end: '2024-01-14',
    breakdown: {
      service_revenue: 5800.00,
      product_revenue: 934.50,
      tips: 500.00,
      booth_rent: 1000.00,
      fees: 0,
      net_amount: 5234.50
    },
    receipt_url: '/receipts/PAY-2024-002.pdf',
    stripe_transfer_id: 'tr_1234567890'
  },
  {
    id: 3,
    barber_id: 1,
    barber_name: "Marcus Johnson",
    amount: 6123.40,
    status: 'processing',
    method: 'bank_transfer',
    reference_number: 'PAY-2024-003',
    created_at: '2024-01-22T10:00:00Z',
    processed_at: '2024-01-22T14:00:00Z',
    period_start: '2024-01-15',
    period_end: '2024-01-21',
    breakdown: {
      service_revenue: 6800.00,
      product_revenue: 1600.00,
      tips: 550.00,
      commission_rate: 70,
      commission_amount: 6123.40,
      fees: 0,
      net_amount: 6123.40
    },
    bank_account_last4: '4321'
  },
  {
    id: 4,
    barber_id: 3,
    barber_name: "James Wilson",
    amount: 4856.50,
    status: 'pending',
    method: 'bank_transfer',
    reference_number: 'PAY-2024-004',
    created_at: '2024-01-29T10:00:00Z',
    period_start: '2024-01-22',
    period_end: '2024-01-28',
    breakdown: {
      service_revenue: 5200.00,
      product_revenue: 1190.00,
      tips: 500.00,
      commission_rate: 70,
      commission_amount: 4856.50,
      fees: 0,
      net_amount: 4856.50
    },
    bank_account_last4: '5678'
  },
  {
    id: 5,
    barber_id: 4,
    barber_name: "Tony Rodriguez",
    amount: 3678.00,
    status: 'failed',
    method: 'stripe',
    reference_number: 'PAY-2024-005',
    created_at: '2024-01-22T10:00:00Z',
    processed_at: '2024-01-22T14:00:00Z',
    failed_at: '2024-01-22T14:30:00Z',
    error_message: 'Invalid bank account information',
    period_start: '2024-01-15',
    period_end: '2024-01-21',
    breakdown: {
      service_revenue: 4500.00,
      product_revenue: 778.00,
      tips: 400.00,
      booth_rent: 1000.00,
      fees: 0,
      net_amount: 3678.00
    }
  }
]

const MOCK_BARBER_EARNINGS: BarberEarnings = {
  barber_id: 1,
  barber_name: "Marcus Johnson",
  period: "last_30_days",
  total_revenue: 24567.00,
  service_revenue: 19500.00,
  product_revenue: 3567.00,
  tips: 1500.00,
  appointment_count: 145,
  average_ticket: 169.43,
  commission_rate: 70,
  commission_earned: 17196.90,
  net_earnings: 17196.90,
  payment_type: 'commission',
  pending_payout: 6123.40,
  earnings_trend: 15.5,
  top_services: [
    {
      service_id: 1,
      service_name: "Premium Haircut & Beard",
      count: 52,
      revenue: 5200.00,
      average_price: 100.00
    },
    {
      service_id: 2,
      service_name: "Deluxe Fade",
      count: 48,
      revenue: 3840.00,
      average_price: 80.00
    },
    {
      service_id: 3,
      service_name: "Hot Towel Shave",
      count: 30,
      revenue: 2400.00,
      average_price: 80.00
    },
    {
      service_id: 4,
      service_name: "Hair Design",
      count: 15,
      revenue: 2250.00,
      average_price: 150.00
    }
  ],
  daily_earnings: [
    { date: '2024-01-29', revenue: 856.00, appointments: 5, tips: 100.00 },
    { date: '2024-01-28', revenue: 1234.00, appointments: 7, tips: 150.00 },
    { date: '2024-01-27', revenue: 945.00, appointments: 6, tips: 75.00 },
    { date: '2024-01-26', revenue: 1123.00, appointments: 7, tips: 125.00 },
    { date: '2024-01-25', revenue: 789.00, appointments: 4, tips: 50.00 },
    { date: '2024-01-24', revenue: 1456.00, appointments: 8, tips: 200.00 },
    { date: '2024-01-23', revenue: 678.00, appointments: 4, tips: 50.00 }
  ]
}

// === PAYOUT API ===

export const payoutService = {
  /**
   * Get payout history with filters
   */
  async getPayouts(filters?: PayoutFilters): Promise<ApiResponse<Payout[]>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock payouts')
      let filtered = [...MOCK_PAYOUTS]

      if (filters) {
        if (filters.barber_id) {
          filtered = filtered.filter(p => p.barber_id === filters.barber_id)
        }
        if (filters.status) {
          filtered = filtered.filter(p => p.status === filters.status)
        }
        if (filters.method) {
          filtered = filtered.filter(p => p.method === filters.method)
        }
      }

      return { data: filtered }
    }

    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get<Payout[]>(`/payouts?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get single payout details
   */
  async getPayoutById(payoutId: number): Promise<ApiResponse<Payout>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock payout')
      const payout = MOCK_PAYOUTS.find(p => p.id === payoutId)
      if (!payout) {
        throw new Error('Payout not found')
      }
      return { data: payout }
    }

    const response = await apiClient.get<Payout>(`/payouts/${payoutId}`)
    return { data: response.data }
  },

  /**
   * Get barber earnings breakdown
   */
  async getBarberEarnings(
    barberId: number,
    dateRange: string = 'last_30_days'
  ): Promise<ApiResponse<BarberEarnings>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock barber earnings')
      return {
        data: {
          ...MOCK_BARBER_EARNINGS,
          barber_id: barberId,
          period: dateRange
        }
      }
    }

    const params = new URLSearchParams({ date_range: dateRange })
    const response = await apiClient.get<BarberEarnings>(
      `/payouts/barber/${barberId}/earnings?${params.toString()}`
    )
    return { data: response.data }
  },

  /**
   * Download payout receipt
   */
  async downloadReceipt(payoutId: number): Promise<Blob> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock receipt')
      // Create a mock PDF blob
      const mockPdf = new Blob(['Mock PDF content'], { type: 'application/pdf' })
      return mockPdf
    }

    const response = await apiClient.get(`/payouts/${payoutId}/receipt`, {
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Process pending payouts
   */
  async processPendingPayouts(barberIds?: number[]): Promise<ApiResponse<{
    processed: number
    failed: number
    errors: string[]
  }>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - simulating payout processing')
      return {
        data: {
          processed: barberIds ? barberIds.length : 3,
          failed: 0,
          errors: []
        }
      }
    }

    const response = await apiClient.post('/payouts/process', {
      barber_ids: barberIds
    })
    return { data: response.data }
  },

  /**
   * Retry failed payout
   */
  async retryPayout(payoutId: number): Promise<ApiResponse<Payout>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - simulating payout retry')
      const payout = MOCK_PAYOUTS.find(p => p.id === payoutId)
      if (!payout) {
        throw new Error('Payout not found')
      }
      return {
        data: {
          ...payout,
          status: 'processing',
          processed_at: new Date().toISOString()
        }
      }
    }

    const response = await apiClient.post<Payout>(`/payouts/${payoutId}/retry`)
    return { data: response.data }
  },

  /**
   * Cancel pending payout
   */
  async cancelPayout(payoutId: number, reason: string): Promise<ApiResponse<Payout>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - simulating payout cancellation')
      const payout = MOCK_PAYOUTS.find(p => p.id === payoutId)
      if (!payout) {
        throw new Error('Payout not found')
      }
      return {
        data: {
          ...payout,
          status: 'cancelled',
          error_message: reason
        }
      }
    }

    const response = await apiClient.post<Payout>(`/payouts/${payoutId}/cancel`, {
      reason
    })
    return { data: response.data }
  },

  // === UTILITY METHODS ===

  /**
   * Get status badge variant
   */
  getStatusBadgeVariant(status: PayoutStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'completed':
        return 'default'
      case 'processing':
        return 'secondary'
      case 'failed':
      case 'cancelled':
        return 'destructive'
      case 'pending':
        return 'outline'
      default:
        return 'outline'
    }
  },

  /**
   * Get status color
   */
  getStatusColor(status: PayoutStatus): string {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'processing':
        return 'text-blue-600 bg-blue-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'cancelled':
        return 'text-gray-600 bg-gray-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  },

  /**
   * Get method icon
   */
  getMethodIcon(method: PayoutMethod): string {
    switch (method) {
      case 'bank_transfer':
        return 'Building'
      case 'stripe':
        return 'CreditCard'
      case 'check':
        return 'FileText'
      case 'cash':
        return 'DollarSign'
      default:
        return 'DollarSign'
    }
  },

  /**
   * Format payout reference
   */
  formatReference(reference: string): string {
    return reference.toUpperCase()
  }
}

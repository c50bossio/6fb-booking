/**
 * Financial API - Shop metrics, barber revenue, and payout management
 */

import apiClient from './client'
import type { ApiResponse } from './client'

// === DEMO MODE CONFIGURATION ===
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// === TYPE DEFINITIONS ===

export interface ShopMetrics {
  total_revenue: number
  total_revenue_trend: number
  service_revenue: number
  product_revenue: number
  tips_total: number
  processing_fees: number
  net_revenue: number
  pending_payouts: number
  completed_payouts: number
  booth_rent_collected: number
  booth_rent_pending: number
  active_barbers: number
  total_appointments: number
  average_ticket: number
  utilization_rate: number
  daily_average_revenue: number
  appointments_per_day: number
}

export interface BarberRevenue {
  barber_id: number
  barber_name: string
  total_revenue: number
  service_revenue: number
  product_revenue: number
  tips: number
  appointments: number
  commission_owed: number
  booth_rent_status: 'paid' | 'pending' | 'overdue' | 'not_applicable'
  booth_rent_amount?: number
  barber_earnings: number
  shop_earnings: number
  utilization_rate: number
  average_ticket: number
  payment_type: string
}

export interface PayoutSummary {
  total_pending_payouts: number
  total_completed_payouts: number
  total_failed_payouts: number
  booth_rent_due: number
  booth_rent_collected: number
  booth_rent_pending: number
  booth_rent_overdue: number
  commission_payouts_pending: number
  commission_payouts_completed: number
  shop_net_revenue: number
  shop_gross_revenue: number
  total_fees: number
  profit_margin: number
}

// === MOCK DATA FOR DEMO MODE ===

const MOCK_SHOP_METRICS: ShopMetrics = {
  total_revenue: 45678.50,
  total_revenue_trend: 12.5,
  service_revenue: 35678.50,
  product_revenue: 7500.00,
  tips_total: 2500.00,
  processing_fees: 1370.36,
  net_revenue: 44308.14,
  pending_payouts: 5678.50,
  completed_payouts: 38629.64,
  booth_rent_collected: 6000.00,
  booth_rent_pending: 2000.00,
  active_barbers: 8,
  total_appointments: 324,
  average_ticket: 141.04,
  utilization_rate: 72.5,
  daily_average_revenue: 1522.62,
  appointments_per_day: 10.8
}

const MOCK_BARBER_REVENUE: BarberRevenue[] = [
  {
    barber_id: 1,
    barber_name: "Marcus Johnson",
    total_revenue: 8456.00,
    service_revenue: 6500.00,
    product_revenue: 1456.00,
    tips: 500.00,
    appointments: 52,
    commission_owed: 1268.40,
    booth_rent_status: 'paid',
    booth_rent_amount: 1000.00,
    barber_earnings: 5917.60,
    shop_earnings: 2538.40,
    utilization_rate: 85.5,
    average_ticket: 162.62,
    payment_type: "commission"
  },
  {
    barber_id: 2,
    barber_name: "David Chen",
    total_revenue: 7234.50,
    service_revenue: 5800.00,
    product_revenue: 934.50,
    tips: 500.00,
    appointments: 48,
    commission_owed: 0,
    booth_rent_status: 'paid',
    booth_rent_amount: 1000.00,
    barber_earnings: 6234.50,
    shop_earnings: 1000.00,
    utilization_rate: 78.2,
    average_ticket: 150.72,
    payment_type: "booth_rental"
  },
  {
    barber_id: 3,
    barber_name: "James Wilson",
    total_revenue: 6890.00,
    service_revenue: 5200.00,
    product_revenue: 1190.00,
    tips: 500.00,
    appointments: 45,
    commission_owed: 1033.50,
    booth_rent_status: 'pending',
    booth_rent_amount: 1000.00,
    barber_earnings: 4856.50,
    shop_earnings: 2033.50,
    utilization_rate: 73.4,
    average_ticket: 153.11,
    payment_type: "commission"
  },
  {
    barber_id: 4,
    barber_name: "Tony Rodriguez",
    total_revenue: 5678.00,
    service_revenue: 4500.00,
    product_revenue: 778.00,
    tips: 400.00,
    appointments: 38,
    commission_owed: 0,
    booth_rent_status: 'overdue',
    booth_rent_amount: 1000.00,
    barber_earnings: 4678.00,
    shop_earnings: 1000.00,
    utilization_rate: 62.0,
    average_ticket: 149.42,
    payment_type: "booth_rental"
  },
  {
    barber_id: 5,
    barber_name: "Michael Smith",
    total_revenue: 4567.00,
    service_revenue: 3800.00,
    product_revenue: 567.00,
    tips: 200.00,
    appointments: 32,
    commission_owed: 685.05,
    booth_rent_status: 'not_applicable',
    barber_earnings: 3196.95,
    shop_earnings: 1370.05,
    utilization_rate: 52.2,
    average_ticket: 142.72,
    payment_type: "commission"
  },
  {
    barber_id: 6,
    barber_name: "Chris Johnson",
    total_revenue: 5123.00,
    service_revenue: 4200.00,
    product_revenue: 623.00,
    tips: 300.00,
    appointments: 35,
    commission_owed: 0,
    booth_rent_status: 'paid',
    booth_rent_amount: 1000.00,
    barber_earnings: 4123.00,
    shop_earnings: 1000.00,
    utilization_rate: 57.1,
    average_ticket: 146.37,
    payment_type: "booth_rental"
  },
  {
    barber_id: 7,
    barber_name: "Daniel Martinez",
    total_revenue: 4890.00,
    service_revenue: 3900.00,
    product_revenue: 690.00,
    tips: 300.00,
    appointments: 33,
    commission_owed: 733.50,
    booth_rent_status: 'paid',
    booth_rent_amount: 1000.00,
    barber_earnings: 3423.50,
    shop_earnings: 1466.50,
    utilization_rate: 53.8,
    average_ticket: 148.18,
    payment_type: "commission"
  },
  {
    barber_id: 8,
    barber_name: "Robert Lee",
    total_revenue: 5890.00,
    service_revenue: 4678.00,
    product_revenue: 812.00,
    tips: 400.00,
    appointments: 40,
    commission_owed: 0,
    booth_rent_status: 'pending',
    booth_rent_amount: 1000.00,
    barber_earnings: 4890.00,
    shop_earnings: 1000.00,
    utilization_rate: 65.2,
    average_ticket: 147.25,
    payment_type: "booth_rental"
  }
]

const MOCK_PAYOUT_SUMMARY: PayoutSummary = {
  total_pending_payouts: 8456.75,
  total_completed_payouts: 34678.90,
  total_failed_payouts: 0,
  booth_rent_due: 8000.00,
  booth_rent_collected: 6000.00,
  booth_rent_pending: 2000.00,
  booth_rent_overdue: 1000.00,
  commission_payouts_pending: 3720.45,
  commission_payouts_completed: 28678.90,
  shop_net_revenue: 44308.14,
  shop_gross_revenue: 45678.50,
  total_fees: 1370.36,
  profit_margin: 32.5
}

// Mock data generators for different date ranges
const generateMockDataForDateRange = (dateRange: string) => {
  const multiplier = getMultiplierForDateRange(dateRange)

  return {
    shopMetrics: {
      ...MOCK_SHOP_METRICS,
      total_revenue: MOCK_SHOP_METRICS.total_revenue * multiplier,
      service_revenue: MOCK_SHOP_METRICS.service_revenue * multiplier,
      product_revenue: MOCK_SHOP_METRICS.product_revenue * multiplier,
      tips_total: MOCK_SHOP_METRICS.tips_total * multiplier,
      processing_fees: MOCK_SHOP_METRICS.processing_fees * multiplier,
      net_revenue: MOCK_SHOP_METRICS.net_revenue * multiplier,
      pending_payouts: MOCK_SHOP_METRICS.pending_payouts * multiplier,
      completed_payouts: MOCK_SHOP_METRICS.completed_payouts * multiplier,
      booth_rent_collected: MOCK_SHOP_METRICS.booth_rent_collected * multiplier,
      booth_rent_pending: MOCK_SHOP_METRICS.booth_rent_pending * multiplier,
      total_appointments: Math.floor(MOCK_SHOP_METRICS.total_appointments * multiplier),
      appointments_per_day: MOCK_SHOP_METRICS.appointments_per_day * getAdjustedMultiplier(dateRange)
    },
    barberRevenue: MOCK_BARBER_REVENUE.map(barber => ({
      ...barber,
      total_revenue: barber.total_revenue * multiplier,
      service_revenue: barber.service_revenue * multiplier,
      product_revenue: barber.product_revenue * multiplier,
      tips: barber.tips * multiplier,
      appointments: Math.floor(barber.appointments * multiplier),
      commission_owed: barber.commission_owed * multiplier,
      barber_earnings: barber.barber_earnings * multiplier,
      shop_earnings: barber.shop_earnings * multiplier
    })),
    payoutSummary: {
      ...MOCK_PAYOUT_SUMMARY,
      total_pending_payouts: MOCK_PAYOUT_SUMMARY.total_pending_payouts * multiplier,
      total_completed_payouts: MOCK_PAYOUT_SUMMARY.total_completed_payouts * multiplier,
      booth_rent_collected: MOCK_PAYOUT_SUMMARY.booth_rent_collected * multiplier,
      booth_rent_pending: MOCK_PAYOUT_SUMMARY.booth_rent_pending * multiplier,
      commission_payouts_pending: MOCK_PAYOUT_SUMMARY.commission_payouts_pending * multiplier,
      commission_payouts_completed: MOCK_PAYOUT_SUMMARY.commission_payouts_completed * multiplier,
      shop_net_revenue: MOCK_PAYOUT_SUMMARY.shop_net_revenue * multiplier,
      shop_gross_revenue: MOCK_PAYOUT_SUMMARY.shop_gross_revenue * multiplier,
      total_fees: MOCK_PAYOUT_SUMMARY.total_fees * multiplier
    }
  }
}

const getMultiplierForDateRange = (dateRange: string): number => {
  switch (dateRange) {
    case 'today': return 0.033
    case 'yesterday': return 0.032
    case 'last_7_days': return 0.23
    case 'last_30_days': return 1
    case 'last_90_days': return 3
    case 'last_year': return 12
    case 'this_month': return 0.5
    case 'last_month': return 1
    case 'this_year': return 10
    case 'custom': return 1
    default: return 1
  }
}

const getAdjustedMultiplier = (dateRange: string): number => {
  switch (dateRange) {
    case 'today': return 1
    case 'yesterday': return 1
    case 'last_7_days': return 1
    case 'last_30_days': return 1
    case 'last_90_days': return 1
    case 'last_year': return 1
    case 'this_month': return 1
    case 'last_month': return 1
    case 'this_year': return 1
    case 'custom': return 1
    default: return 1
  }
}

// === FINANCIAL API ===

export const financialService = {
  /**
   * Get shop metrics for date range
   */
  async getShopMetrics(dateRange: string = 'last_30_days'): Promise<ApiResponse<ShopMetrics>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock shop metrics')
      const mockData = generateMockDataForDateRange(dateRange)
      return { data: mockData.shopMetrics }
    }

    const params = new URLSearchParams({ date_range: dateRange })
    const response = await apiClient.get<ShopMetrics>(`/financial-dashboard/shop-metrics?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get barber revenue breakdown
   */
  async getBarberRevenue(dateRange: string = 'last_30_days'): Promise<ApiResponse<BarberRevenue[]>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock barber revenue')
      const mockData = generateMockDataForDateRange(dateRange)
      return { data: mockData.barberRevenue }
    }

    const params = new URLSearchParams({ date_range: dateRange })
    const response = await apiClient.get<BarberRevenue[]>(`/financial-dashboard/barber-revenue?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get payout summary
   */
  async getPayoutSummary(dateRange: string = 'last_30_days'): Promise<ApiResponse<PayoutSummary>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock payout summary')
      const mockData = generateMockDataForDateRange(dateRange)
      return { data: mockData.payoutSummary }
    }

    const params = new URLSearchParams({ date_range: dateRange })
    const response = await apiClient.get<PayoutSummary>(`/financial-dashboard/payout-summary?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get individual barber dashboard data
   */
  async getBarberDashboard(barberId: number): Promise<ApiResponse<any>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock barber dashboard data')
      return { 
        data: {
          today: {
            earnings: 285.50,
            appointments: 6,
            tips: 45.00,
            services: 240.50,
            products: 0,
            hours_worked: 7.5,
            avg_ticket: 47.58,
            client_satisfaction: 4.8
          },
          week: {
            earnings: 1450.75,
            appointments: 32,
            tips: 220.00,
            goal: 1500,
            progress: 96.7,
            trend: 12.3,
            new_clients: 8,
            returning_clients: 24
          },
          month: {
            earnings: 5890.25,
            appointments: 128,
            goal: 6000,
            progress: 98.2,
            trend: 15.7,
            top_service: "Premium Fade",
            best_day: "Saturday",
            personal_record: true
          },
          goals: {
            daily_target: 300,
            weekly_target: 1500,
            monthly_target: 6000,
            annual_target: 75000,
            current_streak: 5,
            best_streak: 12
          },
          achievements: {
            recent: [
              {
                id: "streak_5",
                title: "5-Day Streak!",
                description: "Hit daily goal 5 days in a row",
                icon: "🔥",
                earned_date: "2024-12-23",
                rarity: "rare"
              }
            ],
            progress: [
              {
                id: "weekly_warrior",
                title: "Weekly Warrior",
                progress: 31,
                target: 50,
                reward: "Premium Badge + $50 Bonus"
              }
            ]
          },
          insights: {
            top_insight: {
              title: "Peak Hour Opportunity",
              description: "You earn 34% more during 6-8 PM slots. Consider booking more evening appointments.",
              potential_value: 280,
              action: "Optimize Schedule"
            },
            peak_hours: ["10:00 AM", "2:00 PM", "6:00 PM", "7:00 PM"],
            top_clients: [
              { name: "Marcus J.", total_spent: 520, visits: 8, last_visit: "2024-12-20" },
              { name: "David R.", total_spent: 480, visits: 7, last_visit: "2024-12-18" }
            ],
            service_performance: [
              { service: "Premium Fade", revenue: 1200, count: 24, avg_price: 50, trend: 15 },
              { service: "Beard Trim", revenue: 800, count: 32, avg_price: 25, trend: 8 }
            ]
          }
        }
      }
    }

    const response = await apiClient.get<any>(`/financial-dashboard/barber-dashboard/${barberId}`)
    return { data: response.data }
  },

  // === UTILITY METHODS ===

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  },

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`
  },

  /**
   * Calculate trend
   */
  getTrendDirection(trend: number): 'up' | 'down' | 'neutral' {
    if (trend > 0) return 'up'
    if (trend < 0) return 'down'
    return 'neutral'
  },

  /**
   * Get trend color
   */
  getTrendColor(trend: number): string {
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-600'
  },

  /**
   * Get booth rent status color
   */
  getBoothRentStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'overdue': return 'text-red-600 bg-red-50'
      case 'not_applicable': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  },

  /**
   * Get booth rent status label
   */
  getBoothRentStatusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'Paid'
      case 'pending': return 'Pending'
      case 'overdue': return 'Overdue'
      case 'not_applicable': return 'N/A'
      default: return status
    }
  },

  /**
   * Calculate shop take
   */
  calculateShopTake(revenue: number, commissionRate: number): number {
    return revenue * (commissionRate / 100)
  },

  /**
   * Calculate barber earnings
   */
  calculateBarberEarnings(revenue: number, commissionRate: number): number {
    return revenue * ((100 - commissionRate) / 100)
  },

  /**
   * Get payment type label
   */
  getPaymentTypeLabel(type: string): string {
    switch (type) {
      case 'commission': return 'Commission'
      case 'booth_rental': return 'Booth Rental'
      default: return type
    }
  },

  /**
   * Get payment type color
   */
  getPaymentTypeColor(type: string): string {
    switch (type) {
      case 'commission': return 'bg-blue-100 text-blue-800'
      case 'booth_rental': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
}

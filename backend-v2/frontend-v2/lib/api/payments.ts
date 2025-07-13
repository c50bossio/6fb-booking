/**
 * Payments API Client
 * 
 * Provides comprehensive payment processing functionality including:
 * - Stripe payment intent creation and confirmation
 * - Payment refunds and history
 * - Gift certificate management
 * - Payout processing for barbers
 * - Stripe Connect onboarding and management
 * - Financial reporting and analytics
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ===============================
// TypeScript Interfaces
// ===============================

export interface PaymentIntentCreate {
  booking_id: number
  gift_certificate_code?: string
}

export interface PaymentIntentResponse {
  client_secret?: string
  payment_intent_id?: string
  amount: number
  original_amount: number
  gift_certificate_used: number
  payment_id: number
}

export interface PaymentConfirm {
  payment_intent_id?: string
  booking_id: number
}

export interface Payment {
  id: number
  amount: number
  status: string
  stripe_payment_intent_id?: string
  platform_fee: number
  barber_amount: number
  commission_rate: number
  refund_amount: number
  gift_certificate_amount_used: number
  created_at: string
  booking_id?: number
  user_id?: number
  barber_id?: number
}

export interface PaymentResponse {
  payment: Payment
  message?: string
}

export interface RefundCreate {
  payment_id: number
  amount?: number // Optional partial refund amount
  reason?: string
}

export interface RefundResponse {
  id: number
  payment_id: number
  amount: number
  status: string
  reason?: string
  stripe_refund_id?: string
  created_at: string
  processed_at?: string
}

export interface GiftCertificateCreate {
  amount: number
  purchaser_name: string
  purchaser_email: string
  recipient_name?: string
  recipient_email?: string
  message?: string
  validity_months?: number
}

export interface GiftCertificate {
  id: number
  code: string
  amount: number
  balance: number
  status: string
  purchaser_name: string
  purchaser_email: string
  recipient_name?: string
  recipient_email?: string
  message?: string
  created_at: string
  expires_at: string
  redeemed_at?: string
}

export interface GiftCertificateResponse {
  certificate: GiftCertificate
  message?: string
}

export interface GiftCertificateValidate {
  code: string
}

export interface GiftCertificateValidation {
  valid: boolean
  certificate?: GiftCertificate
  error?: string
}

export interface PaymentHistoryFilter {
  user_id?: number
  barber_id?: number
  start_date?: string
  end_date?: string
  status?: string
  page?: number
  page_size?: number
}

export interface PaymentHistoryResponse {
  payments: Payment[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface PaymentReportRequest {
  start_date: string
  end_date: string
  barber_id?: number
}

export interface PaymentReportResponse {
  period: {
    start_date: string
    end_date: string
  }
  revenue: {
    total_revenue: number
    gross_revenue: number
    net_revenue: number
    refunded_amount: number
  }
  commissions: {
    total_commission: number
    platform_commission: number
    barber_commission: number
  }
  transactions: {
    total_transactions: number
    successful_transactions: number
    refunded_transactions: number
  }
  averages: {
    average_transaction: number
    average_commission: number
  }
}

export interface PayoutCreate {
  barber_id: number
  start_date: string
  end_date: string
}

export interface Payout {
  id: number
  barber_id: number
  amount: number
  status: string
  period_start: string
  period_end: string
  payment_count: number
  stripe_transfer_id?: string
  created_at: string
  processed_at?: string
}

export interface PayoutResponse {
  payout: Payout
  message?: string
}

export interface StripeConnectOnboardingResponse {
  account_id: string
  onboarding_url: string
  expires_at: string
}

export interface StripeConnectStatusResponse {
  account_id?: string
  onboarding_complete: boolean
  payouts_enabled: boolean
  charges_enabled: boolean
  requirements: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
  }
  verification_status: string
}

export interface PaymentHistoryItem {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  created_at: string
  invoice_url?: string
}

export interface OrganizationPaymentHistory {
  organization_id: number
  payments: PaymentHistoryItem[]
  total_paid: number
  next_payment_date?: string
  next_payment_amount?: number
}

// ===============================
// Utility Functions
// ===============================

/**
 * Get authorization headers with current JWT token
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

/**
 * Get headers with idempotency key for financial operations
 */
function getIdempotentHeaders(idempotencyKey?: string): Record<string, string> {
  const headers = getAuthHeaders()
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }
  return headers
}

/**
 * Handle API response and extract data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(errorData.detail || `Request failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : ''
}

/**
 * Generate idempotency key for financial operations
 */
function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ===============================
// Payments API Client
// ===============================

export const paymentsApi = {
  // ===============================
  // Payment Intent Management
  // ===============================

  /**
   * Create payment intent for a booking
   */
  async createPaymentIntent(
    paymentData: PaymentIntentCreate,
    idempotencyKey?: string
  ): Promise<PaymentIntentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/create-intent`, {
      method: 'POST',
      headers: getIdempotentHeaders(idempotencyKey || generateIdempotencyKey()),
      body: JSON.stringify(paymentData)
    })

    return handleResponse(response)
  },

  /**
   * Confirm payment after client-side processing
   */
  async confirmPayment(
    confirmData: PaymentConfirm,
    idempotencyKey?: string
  ): Promise<PaymentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/confirm`, {
      method: 'POST',
      headers: getIdempotentHeaders(idempotencyKey || generateIdempotencyKey()),
      body: JSON.stringify(confirmData)
    })

    return handleResponse(response)
  },

  // ===============================
  // Payment Management
  // ===============================

  /**
   * Process refund for a payment
   */
  async createRefund(
    refundData: RefundCreate,
    idempotencyKey?: string
  ): Promise<RefundResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/refund`, {
      method: 'POST',
      headers: getIdempotentHeaders(idempotencyKey || generateIdempotencyKey()),
      body: JSON.stringify(refundData)
    })

    return handleResponse(response)
  },

  /**
   * Get payment history with filtering
   */
  async getPaymentHistory(filters: PaymentHistoryFilter = {}): Promise<PaymentHistoryResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/payments/history${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Generate payment report for specified period
   */
  async generatePaymentReport(reportRequest: PaymentReportRequest): Promise<PaymentReportResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reportRequest)
    })

    return handleResponse(response)
  },

  // ===============================
  // Gift Certificate Management
  // ===============================

  /**
   * Create a new gift certificate
   */
  async createGiftCertificate(
    certificateData: GiftCertificateCreate,
    idempotencyKey?: string
  ): Promise<GiftCertificateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/gift-certificates`, {
      method: 'POST',
      headers: getIdempotentHeaders(idempotencyKey || generateIdempotencyKey()),
      body: JSON.stringify(certificateData)
    })

    return handleResponse(response)
  },

  /**
   * Validate gift certificate code
   */
  async validateGiftCertificate(
    validationData: GiftCertificateValidate
  ): Promise<GiftCertificateValidation> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/gift-certificates/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(validationData)
    })

    return handleResponse(response)
  },

  /**
   * Get list of gift certificates
   */
  async getGiftCertificates(filters: {
    status?: string
    purchaser_email?: string
    skip?: number
    limit?: number
  } = {}): Promise<GiftCertificate[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/payments/gift-certificates${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Payout Management
  // ===============================

  /**
   * Create payout for barber
   */
  async createPayout(
    payoutData: PayoutCreate,
    idempotencyKey?: string
  ): Promise<PayoutResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/payouts`, {
      method: 'POST',
      headers: getIdempotentHeaders(idempotencyKey || generateIdempotencyKey()),
      body: JSON.stringify(payoutData)
    })

    return handleResponse(response)
  },

  /**
   * Create enhanced payout with additional features
   */
  async createEnhancedPayout(
    payoutData: PayoutCreate & { include_tips?: boolean; deduct_fees?: boolean },
    idempotencyKey?: string
  ): Promise<PayoutResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/payouts/enhanced`, {
      method: 'POST',
      headers: getIdempotentHeaders(idempotencyKey || generateIdempotencyKey()),
      body: JSON.stringify(payoutData)
    })

    return handleResponse(response)
  },

  // ===============================
  // Stripe Connect Management
  // ===============================

  /**
   * Create Stripe Connect onboarding for barber
   */
  async createStripeConnectOnboarding(
    accountData: { barber_id: number; return_url?: string; refresh_url?: string }
  ): Promise<StripeConnectOnboardingResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/stripe-connect/onboard`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(accountData)
    })

    return handleResponse(response)
  },

  /**
   * Get Stripe Connect account status
   */
  async getStripeConnectStatus(barberId?: number): Promise<StripeConnectStatusResponse> {
    const params = barberId ? { barber_id: barberId } : {}
    const response = await fetch(
      `${API_BASE_URL}/api/v1/payments/stripe-connect/status${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Format currency amount for display
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  },

  /**
   * Calculate commission amount
   */
  calculateCommission(amount: number, commissionRate: number): number {
    return amount * commissionRate
  },

  /**
   * Calculate barber payout amount
   */
  calculateBarberAmount(amount: number, commissionRate: number): number {
    return amount - this.calculateCommission(amount, commissionRate)
  },

  /**
   * Get payment status display text
   */
  getPaymentStatusDisplay(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'succeeded': 'Completed',
      'failed': 'Failed',
      'canceled': 'Canceled',
      'refunded': 'Refunded',
      'partially_refunded': 'Partially Refunded'
    }
    
    return statusMap[status] || status
  },

  /**
   * Get payment status color for UI
   */
  getPaymentStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'pending': 'yellow',
      'succeeded': 'green',
      'failed': 'red',
      'canceled': 'gray',
      'refunded': 'orange',
      'partially_refunded': 'orange'
    }
    
    return colorMap[status] || 'gray'
  },

  /**
   * Check if payment can be refunded
   */
  canRefund(payment: Payment): boolean {
    return payment.status === 'succeeded' && payment.refund_amount === 0
  },

  /**
   * Check if payment can be partially refunded
   */
  canPartiallyRefund(payment: Payment): boolean {
    return payment.status === 'succeeded' && 
           payment.refund_amount > 0 && 
           payment.refund_amount < payment.amount
  },

  /**
   * Calculate available refund amount
   */
  getAvailableRefundAmount(payment: Payment): number {
    return payment.amount - payment.refund_amount
  },

  /**
   * Get gift certificate status display
   */
  getGiftCertificateStatusDisplay(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'redeemed': 'Fully Redeemed',
      'partially_redeemed': 'Partially Redeemed',
      'expired': 'Expired',
      'canceled': 'Canceled'
    }
    
    return statusMap[status] || status
  },

  /**
   * Check if gift certificate is valid for use
   */
  isGiftCertificateValid(certificate: GiftCertificate): boolean {
    if (certificate.status !== 'active' && certificate.status !== 'partially_redeemed') {
      return false
    }
    
    if (certificate.balance <= 0) {
      return false
    }
    
    const expiryDate = new Date(certificate.expires_at)
    const now = new Date()
    
    return expiryDate > now
  },

  /**
   * Get payout status display
   */
  getPayoutStatusDisplay(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'processing': 'Processing',
      'completed': 'Completed',
      'failed': 'Failed',
      'canceled': 'Canceled'
    }
    
    return statusMap[status] || status
  },

  /**
   * Get Stripe Connect status display
   */
  getStripeConnectStatusDisplay(statusResponse: StripeConnectStatusResponse): string {
    if (statusResponse.onboarding_complete && statusResponse.payouts_enabled) {
      return 'Active'
    } else if (statusResponse.onboarding_complete && !statusResponse.payouts_enabled) {
      return 'Pending Verification'
    } else if (statusResponse.account_id) {
      return 'Onboarding Incomplete'
    } else {
      return 'Not Connected'
    }
  },

  /**
   * Check if Stripe Connect setup is required
   */
  requiresStripeConnectSetup(statusResponse: StripeConnectStatusResponse): boolean {
    return !statusResponse.account_id || !statusResponse.onboarding_complete
  },

  /**
   * Generate payment report summary text
   */
  generateReportSummary(report: PaymentReportResponse): string {
    const period = `${report.period.start_date} to ${report.period.end_date}`
    const revenue = this.formatCurrency(report.revenue.total_revenue)
    const transactions = report.transactions.total_transactions
    const avgTransaction = this.formatCurrency(report.averages.average_transaction)
    
    return `${period}: ${revenue} revenue from ${transactions} transactions (avg: ${avgTransaction})`
  },

  /**
   * Calculate monthly recurring revenue (MRR) estimation
   */
  calculateMRR(weeklyRevenue: number): number {
    return weeklyRevenue * 4.33 // Average weeks per month
  },

  /**
   * Calculate year-over-year growth from reports
   */
  calculateYoYGrowth(currentPeriod: number, previousPeriod: number): number {
    if (previousPeriod === 0) return 0
    return ((currentPeriod - previousPeriod) / previousPeriod) * 100
  },

  // ===============================
  // Guest Payment Methods
  // ===============================

  /**
   * Create payment intent for a guest booking (no authentication required)
   */
  async createGuestPaymentIntent(
    paymentData: PaymentIntentCreate,
    idempotencyKey?: string
  ): Promise<PaymentIntentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/guest/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey || generateIdempotencyKey() })
      },
      body: JSON.stringify(paymentData)
    })

    return handleResponse(response)
  },

  /**
   * Confirm payment for a guest booking after client-side processing
   */
  async confirmGuestPayment(
    confirmData: PaymentConfirm,
    idempotencyKey?: string
  ): Promise<PaymentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/payments/guest/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey || generateIdempotencyKey() })
      },
      body: JSON.stringify(confirmData)
    })

    return handleResponse(response)
  }
}

export default paymentsApi
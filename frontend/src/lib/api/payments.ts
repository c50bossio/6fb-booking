/**
 * Payment API client for Stripe integration
 */
import apiClient from './client';

// Types
export interface PaymentMethod {
  id: number;
  type: 'card' | 'bank_account' | 'apple_pay' | 'google_pay';
  last_four?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  bank_name?: string;
  account_last_four?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PaymentIntent {
  payment_id: number;
  client_secret: string;
  amount: number;
  status: PaymentStatus;
  requires_action: boolean;
}

export interface Payment {
  id: number;
  appointment_id: number;
  amount: number;
  amount_decimal: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  created_at: string;
  paid_at?: string;
  refunded_amount: number;
  refundable_amount: number;
}

export interface Refund {
  id: number;
  payment_id: number;
  amount: number;
  reason?: string;
  status: RefundStatus;
  created_at: string;
  refunded_at?: string;
}

export interface PaymentReport {
  id: number;
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_refunds: number;
  net_revenue: number;
  transaction_count: number;
  refund_count: number;
  breakdown_by_barber: Record<string, { revenue: number; count: number }>;
  breakdown_by_service: Record<string, { revenue: number; count: number }>;
  breakdown_by_payment_method: Record<string, { revenue: number; count: number }>;
  file_path?: string;
  created_at: string;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'requires_action';

export type RefundStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled';

// API Functions

/**
 * Payment Methods
 */
export const paymentMethodsApi = {
  /**
   * Add a new payment method
   */
  async add(paymentMethodId: string, setAsDefault = false): Promise<PaymentMethod> {
    const response = await apiClient.post<PaymentMethod>('/payments/payment-methods', {
      payment_method_id: paymentMethodId,
      set_as_default: setAsDefault,
    });
    return response.data;
  },

  /**
   * Get all payment methods
   */
  async list(activeOnly = true): Promise<PaymentMethod[]> {
    const response = await apiClient.get<PaymentMethod[]>('/payments/payment-methods', {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  /**
   * Set a payment method as default
   */
  async setDefault(paymentMethodId: number): Promise<void> {
    await apiClient.put(`/payments/payment-methods/${paymentMethodId}/default`);
  },

  /**
   * Remove a payment method
   */
  async remove(paymentMethodId: number): Promise<void> {
    await apiClient.delete(`/payments/payment-methods/${paymentMethodId}`);
  },
};

/**
 * Payment Intents
 */
export const paymentIntentsApi = {
  /**
   * Create a payment intent for an appointment
   */
  async create(
    appointmentId: number,
    amount: number,
    paymentMethodId?: number,
    savePaymentMethod = false,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    const response = await apiClient.post<PaymentIntent>('/payments/payment-intents', {
      appointment_id: appointmentId,
      amount,
      payment_method_id: paymentMethodId,
      save_payment_method: savePaymentMethod,
      metadata,
    });
    return response.data;
  },

  /**
   * Confirm a payment intent
   */
  async confirm(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<Payment> {
    const response = await apiClient.post<Payment>('/payments/payments/confirm', {
      payment_intent_id: paymentIntentId,
      payment_method_id: paymentMethodId,
    });
    return response.data;
  },

  /**
   * Cancel a payment
   */
  async cancel(paymentId: number): Promise<Payment> {
    const response = await apiClient.post<Payment>(
      `/payments/payments/${paymentId}/cancel`
    );
    return response.data;
  },
};

/**
 * Payments
 */
export const paymentsApi = {
  /**
   * Get payment history
   */
  async getHistory(params?: {
    status?: PaymentStatus;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]> {
    const response = await apiClient.get<Payment[]>('/payments/payments', {
      params,
    });
    return response.data;
  },

  /**
   * Get payment details
   */
  async getById(paymentId: number): Promise<Payment> {
    const response = await apiClient.get<Payment>(`/payments/payments/${paymentId}`);
    return response.data;
  },
};

/**
 * Refunds
 */
export const refundsApi = {
  /**
   * Create a refund
   */
  async create(
    paymentId: number,
    amount?: number,
    reason?: string
  ): Promise<Refund> {
    const response = await apiClient.post<Refund>('/payments/refunds', {
      payment_id: paymentId,
      amount,
      reason,
    });
    return response.data;
  },

  /**
   * Get refund details
   */
  async getById(refundId: number): Promise<Refund> {
    const response = await apiClient.get<Refund>(`/payments/refunds/${refundId}`);
    return response.data;
  },
};

/**
 * Reports
 */
export const paymentReportsApi = {
  /**
   * Create a payment report
   */
  async create(
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom',
    startDate: string,
    endDate: string
  ): Promise<PaymentReport> {
    const response = await apiClient.post<PaymentReport>('/payments/reports', {
      report_type: reportType,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  },

  /**
   * Get payment reports
   */
  async list(params?: {
    report_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaymentReport[]> {
    const response = await apiClient.get<PaymentReport[]>('/payments/reports', {
      params,
    });
    return response.data;
  },
};

/**
 * Format amount for display
 */
export function formatAmount(amountInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountInCents / 100);
}

/**
 * Get payment status color
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  const statusColors: Record<PaymentStatus, string> = {
    pending: 'text-yellow-600 bg-yellow-100',
    processing: 'text-blue-600 bg-blue-100',
    succeeded: 'text-green-600 bg-green-100',
    failed: 'text-red-600 bg-red-100',
    cancelled: 'text-gray-600 bg-gray-100',
    refunded: 'text-purple-600 bg-purple-100',
    partially_refunded: 'text-purple-600 bg-purple-100',
    requires_action: 'text-orange-600 bg-orange-100',
  };
  return statusColors[status] || 'text-gray-600 bg-gray-100';
}
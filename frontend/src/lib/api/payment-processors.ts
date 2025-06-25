import { apiClient } from './client'

export type PaymentProcessor = 'stripe' | 'square' | 'both'

export interface ProcessorPreference {
  primary_processor: PaymentProcessor
  stripe_enabled: boolean
  square_enabled: boolean
  auto_switch_enabled: boolean
  unified_analytics: boolean
  comparison_view: boolean
  fee_alert_threshold: number
  processor_issue_alerts: boolean
  stripe_settings: Record<string, any>
  square_settings: Record<string, any>
}

export interface ProcessorFees {
  payment_fee: number
  payout_fee: number
  total_fee: number
  effective_rate: number
}

export interface ProcessorComparison {
  timeframe_days: number
  stripe: {
    transactions: number
    volume: number
    avg_transaction: number
    fees: ProcessorFees
    effective_rate: number
  }
  square: {
    transactions: number
    volume: number
    avg_transaction: number
    fees: ProcessorFees
    effective_rate: number
  }
  recommendation: {
    recommended: string
    reason: string
    potential_savings: number
    monthly_volume: number
  }
}

export interface UnifiedAnalytics {
  daily_analytics: Array<{
    date: string
    stripe_transactions: number
    stripe_volume: number
    square_transactions: number
    square_volume: number
    total_transactions: number
    total_volume: number
  }>
  summary: {
    total_transactions: number
    total_volume: number
    stripe: {
      transactions: number
      volume: number
      percentage: number
    }
    square: {
      transactions: number
      volume: number
      percentage: number
    }
  }
}

export interface ProcessorHealth {
  stripe?: {
    connected: boolean
    payouts_enabled?: boolean
    charges_enabled?: boolean
    requirements?: any
    error?: string
  }
  square?: {
    connected: boolean
    is_active?: boolean
    can_receive_payments?: boolean
    can_make_payouts?: boolean
    error?: string
  }
}

export interface FeeCalculation {
  amount: number
  processor?: string
  instant_payout: boolean
  payment_fee?: number
  payout_fee?: number
  total_fee?: number
  effective_rate?: number
  stripe?: ProcessorFees
  square?: ProcessorFees
  savings?: {
    processor: string
    amount: number
  }
}

export const paymentProcessorsApi = {
  // Get processor preferences
  getPreference: async (): Promise<ProcessorPreference> => {
    const response = await apiClient.get('/payment-processors/preference')
    return response.data
  },

  // Update processor preferences
  updatePreference: async (updates: Partial<ProcessorPreference>) => {
    const response = await apiClient.put('/payment-processors/preference', updates)
    return response.data
  },

  // Compare processors
  compareProcessors: async (timeframeDays: number = 30): Promise<ProcessorComparison> => {
    const response = await apiClient.get('/payment-processors/comparison', {
      params: { timeframe_days: timeframeDays }
    })
    return response.data
  },

  // Calculate fees
  calculateFees: async (
    amount: number,
    processor: PaymentProcessor,
    instantPayout: boolean = false
  ): Promise<FeeCalculation> => {
    const response = await apiClient.get('/payment-processors/fees/calculate', {
      params: {
        amount,
        processor,
        instant_payout: instantPayout
      }
    })
    return response.data
  },

  // Get unified analytics
  getUnifiedAnalytics: async (
    startDate?: Date,
    endDate?: Date
  ): Promise<UnifiedAnalytics> => {
    const params: any = {}
    if (startDate) params.start_date = startDate.toISOString()
    if (endDate) params.end_date = endDate.toISOString()

    const response = await apiClient.get('/payment-processors/analytics/unified', { params })
    return response.data
  },

  // Switch primary processor
  switchProcessor: async (processor: PaymentProcessor) => {
    const response = await apiClient.post('/payment-processors/switch', { processor })
    return response.data
  },

  // Get processor health
  getProcessorHealth: async (): Promise<ProcessorHealth> => {
    const response = await apiClient.get('/payment-processors/health')
    return response.data
  },

  // Get recommendation
  getRecommendation: async () => {
    const response = await apiClient.get('/payment-processors/recommendation')
    return response.data
  },

  // Get performance metrics
  getPerformanceMetrics: async (processor?: PaymentProcessor) => {
    const params = processor ? { processor } : {}
    const response = await apiClient.get('/payment-processors/performance-metrics', { params })
    return response.data
  }
}

/**
 * Hybrid Payments API Client
 * Provides typed client functions for interacting with the hybrid payment system
 */

import { APIClient } from './client';

const apiClient = new APIClient();

// Types
export interface PaymentMode {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  revenueImpact: {
    keepPercentage: string;
    platformFee: string;
    processingFee: string;
  };
}

export interface PaymentProcessor {
  type: string;
  display_name: string;
  features: {
    payments: boolean;
    refunds: boolean;
    recurring: boolean;
    webhooks: boolean;
    multi_currency: boolean;
  };
  required_config: string[];
  optional_config?: string[];
}

export interface PaymentConnection {
  id: number;
  processor_type: string;
  account_name: string;
  status: string;
  supports_payments: boolean;
  supports_refunds: boolean;
  total_transactions: number;
  total_volume: number;
  connected_at: string;
  last_sync_at?: string;
}

export interface PaymentRoutingDecision {
  routing_decision: string;
  recommended_processor: string;
  routing_details: Record<string, any>;
  estimated_fees: {
    processing_fee: number;
    commission_fee: number;
    total_fees: number;
    net_amount: number;
  };
  processing_time_estimate: string;
}

export interface PaymentMethod {
  type: string;
  processor: string;
  display_name: string;
  default: boolean;
  supports_cards?: boolean;
  supports_ach?: boolean;
}

export interface PaymentOptions {
  payment_mode: string;
  available_methods: PaymentMethod[];
  external_connections: PaymentConnection[];
  fee_breakdown?: {
    amount: number;
    options: Array<{
      type: string;
      processing_fee: number;
      commission_fee: number;
      total_fees: number;
      net_amount: number;
    }>;
  };
}

export interface PaymentResult {
  payment_id: string;
  payment_type: string;
  status: string;
  amount: number;
  currency: string;
  processing_fee: number;
  net_amount: number;
  routing_decision: string;
  external_processor?: string;
  transaction_id?: string;
  created_at: string;
}

export interface PlatformCollection {
  id: number;
  amount: number;
  collection_type: string;
  status: string;
  external_transaction_ids: string[];
  commission_rate: number;
  due_date?: string;
  collection_method: string;
  collected_at?: string;
  created_at: string;
}

export interface PaymentStats {
  total_transactions: number;
  total_volume: number;
  commission_owed: number;
  success_rate: number;
  last_30_days: {
    transactions: number;
    volume: number;
    commission_collected: number;
  };
  by_processor: Array<{
    processor_type: string;
    transactions: number;
    volume: number;
    success_rate: number;
  }>;
}

// API Client Class
export class HybridPaymentsAPI {
  private client = apiClient;

  // Payment routing and processing
  async getPaymentOptions(amount?: number): Promise<PaymentOptions> {
    const params = amount ? { amount: amount.toString() } : {};
    const response = await this.client.get('/api/v2/hybrid-payments/my-options', { params });
    return response.data;
  }

  async getPaymentRouting(appointmentId: number, amount: number, currency: string = 'USD'): Promise<PaymentRoutingDecision> {
    const response = await this.client.post('/api/v2/hybrid-payments/route', {
      appointment_id: appointmentId,
      amount,
      currency
    });
    return response.data;
  }

  async processPayment(data: {
    appointment_id: number;
    amount: number;
    currency?: string;
    payment_method_data: any;
    client_preference?: string;
  }): Promise<PaymentResult> {
    const response = await this.client.post('/api/v2/hybrid-payments/process', data);
    return response.data;
  }

  async processClientPayment(data: {
    appointment_id: number;
    amount: number;
    payment_method_type: string;
    payment_method_data: any;
    tip_amount?: number;
    save_payment_method?: boolean;
  }): Promise<PaymentResult> {
    const response = await this.client.post('/api/v2/hybrid-payments/process-client-payment', data);
    return response.data;
  }

  // Payment processors management
  async getSupportedProcessors(): Promise<{ supported_processors: PaymentProcessor[] }> {
    const response = await this.client.get('/api/v2/external-payments/supported-processors');
    return response.data;
  }

  async getConnections(): Promise<PaymentConnection[]> {
    const response = await this.client.get('/api/v2/external-payments/connections');
    return response.data;
  }

  async createConnection(data: {
    processor_type: string;
    account_name: string;
    connection_config: Record<string, string>;
  }): Promise<PaymentConnection> {
    const response = await this.client.post('/api/v2/external-payments/connections', data);
    return response.data;
  }

  async deleteConnection(processorType: string): Promise<void> {
    await this.client.delete(`/api/v2/external-payments/connections/${processorType}`);
  }

  async testConnection(processorType: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post(`/api/v2/external-payments/connections/${processorType}/test`);
    return response.data;
  }

  // Payment mode management
  async updatePaymentMode(mode: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post('/api/v2/hybrid-payments/update-mode', {
      payment_mode: mode
    });
    return response.data;
  }

  async getPaymentModeConfig(): Promise<{
    payment_mode: string;
    business_rules: Record<string, any>;
    commission_settings: Record<string, any>;
  }> {
    const response = await this.client.get('/api/v2/hybrid-payments/config');
    return response.data;
  }

  async updatePaymentConfig(config: {
    business_rules?: Record<string, any>;
    commission_settings?: Record<string, any>;
  }): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post('/api/v2/hybrid-payments/config', config);
    return response.data;
  }

  // Platform collections
  async getCollections(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ collections: PlatformCollection[]; total: number }> {
    const response = await this.client.get('/api/v2/platform-collections/', { params });
    return response.data;
  }

  async getCollectionById(collectionId: number): Promise<PlatformCollection> {
    const response = await this.client.get(`/api/v2/platform-collections/${collectionId}`);
    return response.data;
  }

  async createCollection(data: {
    external_transaction_ids: string[];
    collection_type?: string;
    commission_rate?: number;
  }): Promise<PlatformCollection> {
    const response = await this.client.post('/api/v2/platform-collections/', data);
    return response.data;
  }

  async processCollection(collectionId: number): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post(`/api/v2/platform-collections/${collectionId}/process`);
    return response.data;
  }

  // Analytics and stats
  async getPaymentStats(): Promise<PaymentStats> {
    const response = await this.client.get('/api/v2/external-payments/stats');
    return response.data;
  }

  async getUnifiedAnalytics(params?: {
    start_date?: string;
    end_date?: string;
    period?: string;
  }): Promise<{
    total_revenue: number;
    platform_revenue: number;
    external_revenue: number;
    commission_collected: number;
    success_rates: Record<string, number>;
    volume_by_processor: Record<string, number>;
    revenue_optimization_insights: any[];
  }> {
    const response = await this.client.get('/api/v2/unified-payment-analytics/', { params });
    return response.data;
  }

  async getSixFigureBarberInsights(): Promise<{
    current_annual_pace: number;
    revenue_trajectory: any[];
    optimization_recommendations: string[];
    milestone_progress: Record<string, number>;
  }> {
    const response = await this.client.get('/api/v2/unified-payment-analytics/six-figure-insights');
    return response.data;
  }

  // Webhooks and synchronization
  async syncExternalTransactions(processorType?: string): Promise<{
    success: boolean;
    synced_count: number;
    message: string;
  }> {
    const params = processorType ? { processor_type: processorType } : {};
    const response = await this.client.post('/api/v2/external-payments/sync', params);
    return response.data;
  }

  async getWebhookLogs(params?: {
    processor_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: Array<{
      id: number;
      processor_type: string;
      event_type: string;
      status: string;
      created_at: string;
      processed_at?: string;
      error_message?: string;
    }>;
    total: number;
  }> {
    const response = await this.client.get('/api/v2/external-payment-webhooks/logs', { params });
    return response.data;
  }

  // Health and monitoring
  async getSystemHealth(): Promise<{
    overall_status: string;
    processor_statuses: Record<string, {
      status: string;
      last_sync: string;
      error_rate: number;
    }>;
    platform_status: string;
    webhook_status: string;
  }> {
    const response = await this.client.get('/api/v2/hybrid-payments/health');
    return response.data;
  }
}

// Create singleton instance
export const hybridPaymentsAPI = new HybridPaymentsAPI();

// Convenience functions
export const getPaymentOptions = (amount?: number) => hybridPaymentsAPI.getPaymentOptions(amount);
export const processPayment = (data: Parameters<HybridPaymentsAPI['processPayment']>[0]) => hybridPaymentsAPI.processPayment(data);
export const getSupportedProcessors = () => hybridPaymentsAPI.getSupportedProcessors();
export const getConnections = () => hybridPaymentsAPI.getConnections();
export const createConnection = (data: Parameters<HybridPaymentsAPI['createConnection']>[0]) => hybridPaymentsAPI.createConnection(data);
export const updatePaymentMode = (mode: string) => hybridPaymentsAPI.updatePaymentMode(mode);
export const getPaymentStats = () => hybridPaymentsAPI.getPaymentStats();
export const getUnifiedAnalytics = (params?: Parameters<HybridPaymentsAPI['getUnifiedAnalytics']>[0]) => hybridPaymentsAPI.getUnifiedAnalytics(params);
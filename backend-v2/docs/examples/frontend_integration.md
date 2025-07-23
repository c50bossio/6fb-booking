# 🌐 Frontend Integration Examples

## 🎯 Overview

This guide provides complete examples for integrating the Hybrid Payment System with frontend applications. Examples are provided for React/Next.js, but the patterns can be adapted for any frontend framework.

## 🔧 API Client Setup

### Base API Client

```typescript
// lib/api/hybrid-payments.ts
import { ApiClient } from './base';

export interface PaymentRequest {
  appointment_id: number;
  amount: number;
  currency?: string;
  payment_method_data?: {
    card_token?: string;
    save_payment_method?: boolean;
  };
  client_preference?: 'platform' | 'external';
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  payment_id: string;
  payment_type: 'centralized' | 'external';
  status: string;
  amount: number;
  currency: string;
  processing_fee: number;
  net_amount: number;
  commission_amount?: number;
  commission_collected?: boolean;
  routing_decision: string;
  external_processor?: string;
  processed_at?: string;
  routing_details: Record<string, any>;
}

export interface PaymentOptions {
  barber_id: number;
  payment_mode: string;
  available_methods: Array<{
    type: string;
    processor: string;
    display_name: string;
    processing_fee_rate: number;
    commission_rate: number;
    supports_saved_cards: boolean;
    processing_time: string;
  }>;
  default_method: string;
  fallback_enabled: boolean;
  external_connections: Array<{
    id: number;
    processor_type: string;
    account_name: string;
    status: string;
    last_transaction?: string;
  }>;
  fee_breakdown?: {
    platform_total_fee: number;
    external_total_fee: number;
    savings_with_external: number;
  };
}

export class HybridPaymentApi extends ApiClient {
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    return this.post<PaymentResponse>('/hybrid-payments/process', request);
  }

  async getPaymentRouting(request: PaymentRequest): Promise<any> {
    return this.post('/hybrid-payments/route', request);
  }

  async getPaymentOptions(barberId?: number, appointmentId?: number, amount?: number): Promise<PaymentOptions> {
    const endpoint = barberId 
      ? `/hybrid-payments/options/${barberId}`
      : '/hybrid-payments/my-options';
    
    const params = new URLSearchParams();
    if (appointmentId) params.append('appointment_id', appointmentId.toString());
    if (amount) params.append('amount', amount.toString());
    
    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    return this.get<PaymentOptions>(url);
  }

  async getRoutingStats(barberId: number, days = 30): Promise<any> {
    return this.get(`/hybrid-payments/routing-stats/${barberId}?days=${days}`);
  }
}

export const hybridPaymentApi = new HybridPaymentApi();
```

### Base API Client

```typescript
// lib/api/base.ts
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get auth token
    const token = this.getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response.text() as any;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  private async handleErrorResponse(response: Response): Promise<Error> {
    try {
      const errorData = await response.json();
      return new ApiError(
        errorData.error?.message || 'Request failed',
        response.status,
        errorData.error?.code,
        errorData.error?.details
      );
    } catch {
      return new ApiError(
        `Request failed with status ${response.status}`,
        response.status
      );
    }
  }

  private getAuthToken(): string | null {
    // For Next.js client-side
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  protected async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  protected async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

## 💳 Payment Processing Components

### Payment Form Component

```typescript
// components/PaymentForm.tsx
import React, { useState, useEffect } from 'react';
import { hybridPaymentApi, PaymentOptions, PaymentRequest } from '@/lib/api/hybrid-payments';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentSummary } from './PaymentSummary';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorAlert } from '../ui/ErrorAlert';

interface PaymentFormProps {
  appointmentId: number;
  amount: number;
  barberId?: number;
  onSuccess: (paymentResult: any) => void;
  onError: (error: Error) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  appointmentId,
  amount,
  barberId,
  onSuccess,
  onError
}) => {
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [paymentMethodData, setPaymentMethodData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentOptions();
  }, [appointmentId, amount, barberId]);

  const fetchPaymentOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const options = await hybridPaymentApi.getPaymentOptions(
        barberId,
        appointmentId,
        amount
      );
      
      setPaymentOptions(options);
      setSelectedMethod(options.default_method);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment options';
      setError(errorMessage);
      onError(new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentMethodData) {
      setError('Please select a payment method');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const paymentRequest: PaymentRequest = {
        appointment_id: appointmentId,
        amount: amount,
        currency: 'USD',
        payment_method_data: paymentMethodData,
        client_preference: selectedMethod === 'platform' ? 'platform' : 'external',
        metadata: {
          source: 'web_app',
          timestamp: new Date().toISOString()
        }
      };

      const result = await hybridPaymentApi.processPayment(paymentRequest);
      onSuccess(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      onError(new Error(errorMessage));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading payment options...</span>
      </div>
    );
  }

  if (!paymentOptions) {
    return (
      <ErrorAlert 
        message="Unable to load payment options. Please try again."
        onRetry={fetchPaymentOptions}
      />
    );
  }

  return (
    <form onSubmit={handlePaymentSubmit} className="space-y-6">
      {error && (
        <ErrorAlert 
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <PaymentSummary 
        amount={amount}
        paymentOptions={paymentOptions}
        selectedMethod={selectedMethod}
      />

      <PaymentMethodSelector
        paymentOptions={paymentOptions}
        selectedMethod={selectedMethod}
        onMethodChange={setSelectedMethod}
        onPaymentDataChange={setPaymentMethodData}
      />

      <button
        type="submit"
        disabled={processing || !paymentMethodData}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
          processing || !paymentMethodData
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {processing ? (
          <>
            <LoadingSpinner size="sm" className="inline mr-2" />
            Processing Payment...
          </>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </button>
    </form>
  );
};
```

### Payment Method Selector

```typescript
// components/PaymentMethodSelector.tsx
import React, { useState } from 'react';
import { PaymentOptions } from '@/lib/api/hybrid-payments';
import { CreditCardForm } from './CreditCardForm';
import { ExternalProcessorForm } from './ExternalProcessorForm';

interface PaymentMethodSelectorProps {
  paymentOptions: PaymentOptions;
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  onPaymentDataChange: (data: any) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentOptions,
  selectedMethod,
  onMethodChange,
  onPaymentDataChange
}) => {
  const [paymentData, setPaymentData] = useState<any>(null);

  const handleMethodSelect = (method: string) => {
    onMethodChange(method);
    setPaymentData(null);
    onPaymentDataChange(null);
  };

  const handlePaymentDataUpdate = (data: any) => {
    setPaymentData(data);
    onPaymentDataChange(data);
  };

  const getSelectedMethodInfo = () => {
    return paymentOptions.available_methods.find(
      method => method.type === selectedMethod
    );
  };

  const selectedMethodInfo = getSelectedMethodInfo();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Payment Method</h3>
      
      {/* Payment Method Options */}
      <div className="grid gap-3">
        {paymentOptions.available_methods.map((method) => (
          <div
            key={`${method.type}-${method.processor}`}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedMethod === method.type
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleMethodSelect(method.type)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="payment_method"
                  value={method.type}
                  checked={selectedMethod === method.type}
                  onChange={() => handleMethodSelect(method.type)}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium">{method.display_name}</div>
                  <div className="text-sm text-gray-500">
                    {method.processing_time} • {(method.processing_fee_rate * 100).toFixed(1)}% fee
                  </div>
                </div>
              </div>
              
              {method.processor === 'square' && (
                <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Recommended
                </div>
              )}
            </div>
            
            {/* Fee Savings Indicator */}
            {paymentOptions.fee_breakdown && method.type === 'external' && (
              <div className="mt-2 text-sm text-green-600">
                Save ${(paymentOptions.fee_breakdown.savings_with_external * paymentOptions.amount || 0).toFixed(2)} in fees
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Payment Form Based on Selected Method */}
      {selectedMethod && selectedMethodInfo && (
        <div className="border-t pt-4">
          {selectedMethod === 'platform' || selectedMethodInfo.processor === 'stripe' ? (
            <CreditCardForm
              onDataChange={handlePaymentDataUpdate}
              supportsSavedCards={selectedMethodInfo.supports_saved_cards}
            />
          ) : (
            <ExternalProcessorForm
              processor={selectedMethodInfo.processor}
              onDataChange={handlePaymentDataUpdate}
            />
          )}
        </div>
      )}
    </div>
  );
};
```

### Credit Card Form

```typescript
// components/CreditCardForm.tsx
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface CreditCardFormProps {
  onDataChange: (data: any) => void;
  supportsSavedCards: boolean;
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({
  onDataChange,
  supportsSavedCards
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [saveCard, setSaveCard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCardChange = async (event: any) => {
    if (event.error) {
      setError(event.error.message);
      onDataChange(null);
    } else {
      setError(null);
      
      if (event.complete && stripe && elements) {
        const cardElement = elements.getElement(CardElement);
        if (cardElement) {
          try {
            const { token, error: tokenError } = await stripe.createToken(cardElement);
            
            if (tokenError) {
              setError(tokenError.message || 'Card validation failed');
              onDataChange(null);
            } else {
              onDataChange({
                card_token: token?.id,
                save_payment_method: saveCard
              });
            }
          } catch (err) {
            setError('Card processing failed');
            onDataChange(null);
          }
        }
      }
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="border rounded-lg p-3 bg-white">
          <CardElement
            options={cardElementOptions}
            onChange={handleCardChange}
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {supportsSavedCards && (
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Save this card for future payments
          </span>
        </label>
      )}
    </div>
  );
};
```

### Payment Summary Component

```typescript
// components/PaymentSummary.tsx
import React from 'react';
import { PaymentOptions } from '@/lib/api/hybrid-payments';

interface PaymentSummaryProps {
  amount: number;
  paymentOptions: PaymentOptions;
  selectedMethod: string;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  amount,
  paymentOptions,
  selectedMethod
}) => {
  const getSelectedMethodInfo = () => {
    return paymentOptions.available_methods.find(
      method => method.type === selectedMethod
    );
  };

  const selectedMethodInfo = getSelectedMethodInfo();
  const processingFee = selectedMethodInfo 
    ? amount * selectedMethodInfo.processing_fee_rate 
    : 0;
  const total = amount + processingFee;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
      <h3 className="font-semibold text-gray-900">Payment Summary</h3>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Service Amount:</span>
          <span>${amount.toFixed(2)}</span>
        </div>
        
        {selectedMethodInfo && (
          <div className="flex justify-between">
            <span>Processing Fee ({(selectedMethodInfo.processing_fee_rate * 100).toFixed(1)}%):</span>
            <span>${processingFee.toFixed(2)}</span>
          </div>
        )}
        
        <div className="border-t pt-1 flex justify-between font-semibold">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {selectedMethodInfo && (
        <div className="text-xs text-gray-600 mt-3">
          <div>Payment Method: {selectedMethodInfo.display_name}</div>
          <div>Processing Time: {selectedMethodInfo.processing_time}</div>
          
          {paymentOptions.fee_breakdown && selectedMethod === 'external' && (
            <div className="text-green-600 font-medium">
              You save ${(paymentOptions.fee_breakdown.savings_with_external * amount).toFixed(2)} 
              compared to platform processing
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

## 📊 Analytics Dashboard Integration

### Analytics Dashboard Component

```typescript
// components/analytics/HybridAnalyticsDashboard.tsx
import React, { useState, useEffect } from 'react';
import { unifiedAnalyticsApi } from '@/lib/api/unified-analytics';
import { AnalyticsCard } from './AnalyticsCard';
import { PaymentModeChart } from './PaymentModeChart';
import { RevenueChart } from './RevenueChart';
import { SixFigureInsights } from './SixFigureInsights';

export const HybridAnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [period, setPeriod] = useState<string>('30_days');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      const data = await unifiedAnalyticsApi.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await unifiedAnalyticsApi.getAnalytics(period);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!dashboardData) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payment Analytics</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="7_days">Last 7 days</option>
          <option value="30_days">Last 30 days</option>
          <option value="90_days">Last 90 days</option>
          <option value="1_year">Last year</option>
        </select>
      </div>

      {/* Real-time Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Today's Revenue"
          value={`$${dashboardData.today.total_volume.toFixed(2)}`}
          subtitle={`${dashboardData.today.total_transactions} transactions`}
          trend={`+${(dashboardData.today.total_volume / dashboardData.yesterday?.total_volume * 100 - 100).toFixed(1)}%`}
        />
        
        <AnalyticsCard
          title="Month to Date"
          value={`$${dashboardData.month_to_date.total_volume.toFixed(2)}`}
          subtitle={`${dashboardData.month_to_date.total_transactions} transactions`}
          trend={`${dashboardData.month_to_date.success_rate.toFixed(1)}% success rate`}
        />
        
        <AnalyticsCard
          title="Net Earnings"
          value={`$${dashboardData.month_to_date.total_net_earnings.toFixed(2)}`}
          subtitle="After fees & commissions"
          trend={`$${dashboardData.month_to_date.total_net_earnings / dashboardData.month_to_date.total_transactions.toFixed(2)} avg per transaction`}
        />
        
        <AnalyticsCard
          title="Outstanding Commission"
          value={`$${dashboardData.outstanding_commission.total_amount.toFixed(2)}`}
          subtitle={`${dashboardData.outstanding_commission.pending_collections} pending`}
          trend={`Due ${new Date(dashboardData.outstanding_commission.next_collection_date).toLocaleDateString()}`}
        />
      </div>

      {/* Analytics Charts */}
      {analyticsData && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PaymentModeChart 
            centralizedData={analyticsData.centralized_payments}
            decentralizedData={analyticsData.decentralized_payments}
          />
          
          <RevenueChart 
            period={period}
            trendData={analyticsData.trend_analysis}
          />
        </div>
      )}

      {/* Six Figure Barber Insights */}
      {analyticsData?.six_figure_insights && (
        <SixFigureInsights insights={analyticsData.six_figure_insights} />
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {dashboardData.recent_transactions.map((transaction: any) => (
            <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">${transaction.amount.toFixed(2)}</div>
                <div className="text-sm text-gray-600">
                  {transaction.payment_type} • {transaction.processor}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  transaction.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {transaction.status}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(transaction.processed_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Six Figure Barber Insights Component

```typescript
// components/analytics/SixFigureInsights.tsx
import React from 'react';
import { ProgressBar } from '../ui/ProgressBar';

interface SixFigureInsightsProps {
  insights: {
    target_annual_revenue: number;
    current_monthly_revenue: number;
    progress_percentage: number;
    projected_annual: number;
    gap_to_target: number;
    recommendations: string[];
  };
}

export const SixFigureInsights: React.FC<SixFigureInsightsProps> = ({ insights }) => {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
      <h3 className="text-xl font-bold mb-4">Six Figure Barber Progress</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold">
              ${insights.current_monthly_revenue.toLocaleString()}
            </div>
            <div className="text-blue-100">Current Monthly Revenue</div>
          </div>
          
          <ProgressBar 
            progress={insights.progress_percentage} 
            className="bg-blue-300"
            fillClassName="bg-white"
          />
          
          <div className="text-sm">
            {insights.progress_percentage.toFixed(1)}% to $100K annual target
          </div>
        </div>

        {/* Gap Analysis */}
        <div className="space-y-3">
          <div>
            <div className="text-xl font-semibold">
              ${insights.gap_to_target.toLocaleString()}
            </div>
            <div className="text-blue-100">Remaining to Target</div>
          </div>
          
          <div>
            <div className="text-lg">
              ${insights.projected_annual.toLocaleString()}
            </div>
            <div className="text-blue-100">Projected Annual</div>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="font-semibold mb-2">Recommendations</h4>
          <ul className="space-y-1 text-sm">
            {insights.recommendations.slice(0, 3).map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-300 mr-2">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
```

## ⚙️ Configuration Management

### Payment Configuration Component

```typescript
// components/settings/PaymentConfiguration.tsx
import React, { useState, useEffect } from 'react';
import { hybridPaymentApi } from '@/lib/api/hybrid-payments';
import { externalPaymentApi } from '@/lib/api/external-payments';
import { PaymentModeSelector } from './PaymentModeSelector';
import { ExternalProcessorSetup } from './ExternalProcessorSetup';
import { CommissionSettings } from './CommissionSettings';

export const PaymentConfiguration: React.FC = () => {
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCurrentConfiguration();
    fetchConnections();
  }, []);

  const fetchCurrentConfiguration = async () => {
    try {
      const options = await hybridPaymentApi.getPaymentOptions();
      setCurrentConfig(options);
    } catch (error) {
      console.error('Failed to fetch payment configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const connectionsData = await externalPaymentApi.getConnections();
      setConnections(connectionsData.connections);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  };

  const handleConfigurationSave = async (newConfig: any) => {
    try {
      setSaving(true);
      // Save configuration via API
      await hybridPaymentApi.updateConfiguration(newConfig);
      await fetchCurrentConfiguration();
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading configuration...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Configuration</h1>
        <p className="text-gray-600 mt-2">
          Configure how payments are processed for your services
        </p>
      </div>

      <PaymentModeSelector
        currentMode={currentConfig?.payment_mode}
        onModeChange={(mode) => handleConfigurationSave({ ...currentConfig, payment_mode: mode })}
      />

      <ExternalProcessorSetup
        connections={connections}
        onConnectionUpdate={fetchConnections}
      />

      <CommissionSettings
        currentSettings={currentConfig}
        onSettingsChange={handleConfigurationSave}
      />
    </div>
  );
};
```

### External Processor Setup

```typescript
// components/settings/ExternalProcessorSetup.tsx
import React, { useState } from 'react';
import { externalPaymentApi } from '@/lib/api/external-payments';
import { SquareSetup } from './processors/SquareSetup';
import { StripeSetup } from './processors/StripeSetup';
import { PayPalSetup } from './processors/PayPalSetup';

interface ExternalProcessorSetupProps {
  connections: any[];
  onConnectionUpdate: () => void;
}

export const ExternalProcessorSetup: React.FC<ExternalProcessorSetupProps> = ({
  connections,
  onConnectionUpdate
}) => {
  const [activeProcessor, setActiveProcessor] = useState<string | null>(null);

  const processors = [
    {
      id: 'square',
      name: 'Square',
      description: 'Connect your Square account for POS integration',
      logo: '/logos/square.png',
      setupComponent: SquareSetup
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Connect your Stripe account for online payments',
      logo: '/logos/stripe.png',
      setupComponent: StripeSetup
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Connect your PayPal Business account',
      logo: '/logos/paypal.png',
      setupComponent: PayPalSetup
    }
  ];

  const getConnectionStatus = (processorId: string) => {
    const connection = connections.find(conn => conn.processor_type === processorId);
    return connection?.status || 'not_connected';
  };

  const handleProcessorSetup = async (processorId: string, config: any) => {
    try {
      await externalPaymentApi.createConnection(processorId, config);
      onConnectionUpdate();
      setActiveProcessor(null);
    } catch (error) {
      console.error(`Failed to setup ${processorId}:`, error);
      throw error;
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">External Payment Processors</h2>
      
      <div className="grid gap-4">
        {processors.map((processor) => {
          const status = getConnectionStatus(processor.id);
          const SetupComponent = processor.setupComponent;
          
          return (
            <div key={processor.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img 
                    src={processor.logo} 
                    alt={processor.name}
                    className="w-8 h-8"
                  />
                  <div>
                    <div className="font-medium">{processor.name}</div>
                    <div className="text-sm text-gray-600">{processor.description}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    status === 'connected' 
                      ? 'bg-green-100 text-green-800'
                      : status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {status.replace('_', ' ')}
                  </span>
                  
                  <button
                    onClick={() => setActiveProcessor(
                      activeProcessor === processor.id ? null : processor.id
                    )}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    {status === 'connected' ? 'Manage' : 'Setup'}
                  </button>
                </div>
              </div>
              
              {activeProcessor === processor.id && (
                <div className="mt-4 pt-4 border-t">
                  <SetupComponent
                    onSetup={(config) => handleProcessorSetup(processor.id, config)}
                    onCancel={() => setActiveProcessor(null)}
                    existingConnection={connections.find(conn => conn.processor_type === processor.id)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

## 🎯 Error Handling & User Experience

### Error Boundary for Payment Components

```typescript
// components/PaymentErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Payment component error:', error, errorInfo);
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          errorInfo,
          component: 'PaymentErrorBoundary'
        }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Payment System Error
          </h3>
          <p className="text-red-700 mb-4">
            There was an error loading the payment system. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Toast Notifications for Payment Events

```typescript
// hooks/usePaymentNotifications.ts
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export const usePaymentNotifications = () => {
  const showPaymentSuccess = (result: any) => {
    toast.success(
      <div>
        <div className="font-semibold">Payment Successful!</div>
        <div className="text-sm">
          ${result.amount.toFixed(2)} processed via {result.external_processor || 'platform'}
        </div>
      </div>,
      { duration: 5000 }
    );
  };

  const showPaymentError = (error: Error) => {
    toast.error(
      <div>
        <div className="font-semibold">Payment Failed</div>
        <div className="text-sm">{error.message}</div>
      </div>,
      { duration: 8000 }
    );
  };

  const showConnectionSuccess = (processor: string) => {
    toast.success(`${processor} connected successfully!`);
  };

  const showConnectionError = (processor: string, error: string) => {
    toast.error(`Failed to connect ${processor}: ${error}`);
  };

  return {
    showPaymentSuccess,
    showPaymentError,
    showConnectionSuccess,
    showConnectionError
  };
};
```

## 📱 Mobile Responsive Implementation

### Mobile Payment Form

```typescript
// components/mobile/MobilePaymentForm.tsx
import React, { useState } from 'react';
import { PaymentForm } from '../PaymentForm';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface MobilePaymentFormProps {
  appointmentId: number;
  amount: number;
  onSuccess: (result: any) => void;
  onError: (error: Error) => void;
}

export const MobilePaymentForm: React.FC<MobilePaymentFormProps> = (props) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!isMobile) {
    return <PaymentForm {...props} />;
  }

  return (
    <div className={`${isFullScreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {isFullScreen && (
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Complete Payment</h2>
          <button
            onClick={() => setIsFullScreen(false)}
            className="p-2 text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      <div className={`${isFullScreen ? 'p-4 overflow-y-auto' : ''}`}>
        <PaymentForm {...props} />
      </div>
      
      {!isFullScreen && (
        <button
          onClick={() => setIsFullScreen(true)}
          className="w-full mt-4 p-3 bg-blue-600 text-white rounded-lg text-center"
        >
          Open Full Screen Payment
        </button>
      )}
    </div>
  );
};
```

## 🔧 Testing & Development

### Mock API for Development

```typescript
// lib/api/mock/hybrid-payments.ts
export const mockHybridPaymentApi = {
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Payment processing failed - please try again');
    }
    
    return {
      payment_id: `mock_${Date.now()}`,
      payment_type: request.client_preference === 'platform' ? 'centralized' : 'external',
      status: 'completed',
      amount: request.amount,
      currency: request.currency || 'USD',
      processing_fee: request.amount * 0.029,
      net_amount: request.amount * 0.971,
      routing_decision: 'external',
      external_processor: 'square',
      processed_at: new Date().toISOString(),
      routing_details: {
        processor: 'square',
        connection_id: 1,
        processing_time: '1.2s'
      }
    };
  },

  async getPaymentOptions(): Promise<PaymentOptions> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      barber_id: 1,
      payment_mode: 'hybrid',
      available_methods: [
        {
          type: 'platform',
          processor: 'stripe',
          display_name: 'BookedBarber Payments',
          processing_fee_rate: 0.029,
          commission_rate: 0.20,
          supports_saved_cards: true,
          processing_time: 'instant'
        },
        {
          type: 'external',
          processor: 'square',
          display_name: 'Square POS',
          processing_fee_rate: 0.026,
          commission_rate: 0.20,
          supports_saved_cards: true,
          processing_time: '1-3 seconds'
        }
      ],
      default_method: 'external',
      fallback_enabled: true,
      external_connections: [
        {
          id: 1,
          processor_type: 'square',
          account_name: 'Main Square Account',
          status: 'connected',
          last_transaction: new Date().toISOString()
        }
      ],
      fee_breakdown: {
        platform_total_fee: 0.249,
        external_total_fee: 0.226,
        savings_with_external: 0.023
      }
    };
  }
};
```

### Component Testing Examples

```typescript
// __tests__/PaymentForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentForm } from '../components/PaymentForm';
import { mockHybridPaymentApi } from '../lib/api/mock/hybrid-payments';

// Mock the API
jest.mock('../lib/api/hybrid-payments', () => ({
  hybridPaymentApi: mockHybridPaymentApi
}));

describe('PaymentForm', () => {
  const defaultProps = {
    appointmentId: 1,
    amount: 75.00,
    onSuccess: jest.fn(),
    onError: jest.fn()
  };

  it('should load payment options on mount', async () => {
    render(<PaymentForm {...defaultProps} />);
    
    expect(screen.getByText('Loading payment options...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
    });
  });

  it('should display available payment methods', async () => {
    render(<PaymentForm {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('BookedBarber Payments')).toBeInTheDocument();
      expect(screen.getByText('Square POS')).toBeInTheDocument();
    });
  });

  it('should show fee savings for external processors', async () => {
    render(<PaymentForm {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Save \$.*in fees/)).toBeInTheDocument();
    });
  });

  it('should call onSuccess when payment succeeds', async () => {
    const onSuccess = jest.fn();
    render(<PaymentForm {...defaultProps} onSuccess={onSuccess} />);
    
    await waitFor(() => {
      expect(screen.getByText('Square POS')).toBeInTheDocument();
    });
    
    // Select Square payment method
    fireEvent.click(screen.getByText('Square POS'));
    
    // Submit payment
    fireEvent.click(screen.getByText(/Pay \$/));
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_type: 'external',
          external_processor: 'square'
        })
      );
    });
  });
});
```

---

This comprehensive frontend integration guide provides everything needed to integrate the hybrid payment system with a React/Next.js frontend application. The examples cover payment processing, analytics display, configuration management, error handling, and testing, ensuring a complete and robust implementation.
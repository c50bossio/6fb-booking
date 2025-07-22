/**
 * Hybrid Payments React Hook
 * Provides convenient React hooks for interacting with the hybrid payment system
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  hybridPaymentsAPI, 
  PaymentOptions, 
  PaymentConnection, 
  PaymentStats, 
  PaymentResult,
  PaymentRoutingDecision 
} from '@/lib/api/hybrid-payments';
import { toast } from '@/components/ui/use-toast';

// Hook for payment options
export const usePaymentOptions = (amount?: number) => {
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hybridPaymentsAPI.getPaymentOptions(amount);
      setOptions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment options';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [amount]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  return {
    options,
    loading,
    error,
    reload: loadOptions
  };
};

// Hook for payment connections
export const usePaymentConnections = () => {
  const [connections, setConnections] = useState<PaymentConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hybridPaymentsAPI.getConnections();
      setConnections(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment connections';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createConnection = useCallback(async (data: {
    processor_type: string;
    account_name: string;
    connection_config: Record<string, string>;
  }) => {
    try {
      await hybridPaymentsAPI.createConnection(data);
      toast({
        title: "Success",
        description: `Successfully connected ${data.processor_type} payment processor`
      });
      await loadConnections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create connection';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, [loadConnections]);

  const deleteConnection = useCallback(async (processorType: string) => {
    try {
      await hybridPaymentsAPI.deleteConnection(processorType);
      toast({
        title: "Success",
        description: `Successfully disconnected ${processorType} payment processor`
      });
      await loadConnections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete connection';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, [loadConnections]);

  const testConnection = useCallback(async (processorType: string) => {
    try {
      const result = await hybridPaymentsAPI.testConnection(processorType);
      toast({
        title: result.success ? "Test Successful" : "Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  return {
    connections,
    loading,
    error,
    createConnection,
    deleteConnection,
    testConnection,
    reload: loadConnections
  };
};

// Hook for payment mode management
export const usePaymentMode = () => {
  const [currentMode, setCurrentMode] = useState<string>('centralized');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMode = useCallback(async (mode: string) => {
    try {
      setLoading(true);
      setError(null);
      await hybridPaymentsAPI.updatePaymentMode(mode);
      setCurrentMode(mode);
      toast({
        title: "Payment Mode Updated",
        description: `Successfully switched to ${mode} payment mode`
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update payment mode';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    currentMode,
    updateMode,
    loading,
    error
  };
};

// Hook for payment processing
export const usePaymentProcessing = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routePayment = useCallback(async (
    appointmentId: number, 
    amount: number, 
    currency: string = 'USD'
  ): Promise<PaymentRoutingDecision | null> => {
    try {
      setError(null);
      const routing = await hybridPaymentsAPI.getPaymentRouting(appointmentId, amount, currency);
      return routing;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get payment routing';
      setError(errorMessage);
      return null;
    }
  }, []);

  const processPayment = useCallback(async (data: {
    appointment_id: number;
    amount: number;
    currency?: string;
    payment_method_data: any;
    client_preference?: string;
  }): Promise<PaymentResult | null> => {
    try {
      setProcessing(true);
      setError(null);
      
      const result = await hybridPaymentsAPI.processPayment(data);
      
      toast({
        title: "Payment Successful",
        description: `Payment of $${data.amount.toFixed(2)} processed successfully`
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  const processClientPayment = useCallback(async (data: {
    appointment_id: number;
    amount: number;
    payment_method_type: string;
    payment_method_data: any;
    tip_amount?: number;
    save_payment_method?: boolean;
  }): Promise<PaymentResult | null> => {
    try {
      setProcessing(true);
      setError(null);
      
      const result = await hybridPaymentsAPI.processClientPayment(data);
      
      toast({
        title: "Payment Successful",
        description: `Payment of $${data.amount.toFixed(2)} processed successfully`
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    processing,
    error,
    routePayment,
    processPayment,
    processClientPayment
  };
};

// Hook for payment statistics
export const usePaymentStats = () => {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hybridPaymentsAPI.getPaymentStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment statistics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    reload: loadStats
  };
};

// Hook for unified analytics
export const useUnifiedAnalytics = (params?: {
  start_date?: string;
  end_date?: string;
  period?: string;
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hybridPaymentsAPI.getUnifiedAnalytics(params);
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    loading,
    error,
    reload: loadAnalytics
  };
};

// Hook for Six Figure Barber insights
export const useSixFigureBarberInsights = () => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hybridPaymentsAPI.getSixFigureBarberInsights();
      setInsights(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Six Figure Barber insights';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  return {
    insights,
    loading,
    error,
    reload: loadInsights
  };
};

// Hook for system health
export const useSystemHealth = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hybridPaymentsAPI.getSystemHealth();
      setHealth(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check system health';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    
    // Set up periodic health checks every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    health,
    loading,
    error,
    checkHealth
  };
};
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { performanceService, type PerformanceSummary, type CacheMetrics, type SystemHealthIndicator, type DetailedAnalytics } from '@/lib/api/performance';

interface PerformanceMetricsState {
  summary: PerformanceSummary | null;
  cacheMetrics: CacheMetrics | null;
  systemHealth: SystemHealthIndicator[] | null;
  detailedAnalytics: DetailedAnalytics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface PerformanceMetricsHook extends PerformanceMetricsState {
  refresh: () => Promise<void>;
  clearCache: (key: string) => Promise<void>;
  warmCache: () => Promise<void>;
  optimizeCache: () => Promise<void>;
  getRecommendations: () => Promise<Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
    impact: string;
  }>>;
  setRefreshInterval: (interval: number | null) => void;
}

export function usePerformanceMetrics(
  autoRefresh: boolean = true,
  refreshInterval: number = 30000 // 30 seconds
): PerformanceMetricsHook {
  const [state, setState] = useState<PerformanceMetricsState>({
    summary: null,
    cacheMetrics: null,
    systemHealth: null,
    detailedAnalytics: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  const [currentRefreshInterval, setCurrentRefreshInterval] = useState<number | null>(
    autoRefresh ? refreshInterval : null
  );

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const isLoadingRef = useRef(false);

  const { lastMessage, isConnected } = useWebSocket();

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'performance_update') {
      setState(prev => ({
        ...prev,
        summary: lastMessage.data?.summary || prev.summary,
        cacheMetrics: lastMessage.data?.cache || prev.cacheMetrics,
        systemHealth: lastMessage.data?.health || prev.systemHealth,
        lastUpdated: new Date(),
      }));
    }
  }, [lastMessage]);

  const fetchAllData = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [summary, cacheMetrics, systemHealth, detailedAnalytics] = await Promise.all([
        performanceService.getPerformanceSummary(),
        performanceService.getCacheMetrics(),
        performanceService.getSystemHealth(),
        performanceService.getDetailedAnalytics(24),
      ]);

      setState({
        summary,
        cacheMetrics,
        systemHealth,
        detailedAnalytics,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch performance metrics',
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  const clearCache = useCallback(async (key: string) => {
    try {
      const result = await performanceService.clearCache(key);
      if (result.success) {
        // Refresh cache metrics after clearing
        const newCacheMetrics = await performanceService.getCacheMetrics();
        setState(prev => ({
          ...prev,
          cacheMetrics: newCacheMetrics,
          lastUpdated: new Date(),
        }));
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear cache',
      }));
    }
  }, []);

  const warmCache = useCallback(async () => {
    try {
      const result = await performanceService.warmCache();
      if (result.success) {
        // Refresh cache metrics after warming
        const newCacheMetrics = await performanceService.getCacheMetrics();
        setState(prev => ({
          ...prev,
          cacheMetrics: newCacheMetrics,
          lastUpdated: new Date(),
        }));
      }
    } catch (error) {
      console.error('Error warming cache:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to warm cache',
      }));
    }
  }, []);

  const optimizeCache = useCallback(async () => {
    try {
      const result = await performanceService.optimizeAnalyticsCache();
      // Refresh all metrics after optimization
      await fetchAllData();
    } catch (error) {
      console.error('Error optimizing cache:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to optimize cache',
      }));
    }
  }, [fetchAllData]);

  const getRecommendations = useCallback(async () => {
    try {
      return await performanceService.getPerformanceRecommendations();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch recommendations',
      }));
      return [];
    }
  }, []);

  const setRefreshInterval = useCallback((interval: number | null) => {
    setCurrentRefreshInterval(interval);
  }, []);

  // Auto-refresh logic
  useEffect(() => {
    const scheduleRefresh = () => {
      if (currentRefreshInterval && currentRefreshInterval > 0) {
        refreshTimeoutRef.current = setTimeout(() => {
          refresh().then(() => {
            scheduleRefresh(); // Schedule next refresh
          });
        }, currentRefreshInterval);
      }
    };

    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Schedule new refresh
    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [currentRefreshInterval, refresh]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh,
    clearCache,
    warmCache,
    optimizeCache,
    getRecommendations,
    setRefreshInterval,
  };
}

// Hook for specific performance metric types
export function useLoadMetrics(refreshInterval: number = 5000) {
  const [loadMetrics, setLoadMetrics] = useState<PerformanceSummary['load_metrics'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchLoadMetrics = useCallback(async () => {
    try {
      const summary = await performanceService.getPerformanceSummary();
      setLoadMetrics(summary.load_metrics);
      setError(null);
    } catch (err) {
      console.error('Error fetching load metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch load metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        fetchLoadMetrics().then(() => {
          scheduleRefresh();
        });
      }, refreshInterval);
    };

    fetchLoadMetrics();
    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchLoadMetrics, refreshInterval]);

  return { loadMetrics, isLoading, error, refresh: fetchLoadMetrics };
}

// Hook for real-time endpoint performance
export function useEndpointPerformance(refreshInterval: number = 10000) {
  const [endpointPerformance, setEndpointPerformance] = useState<PerformanceSummary['endpoint_performance'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchEndpointPerformance = useCallback(async () => {
    try {
      const summary = await performanceService.getPerformanceSummary();
      setEndpointPerformance(summary.endpoint_performance);
      setError(null);
    } catch (err) {
      console.error('Error fetching endpoint performance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch endpoint performance');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        fetchEndpointPerformance().then(() => {
          scheduleRefresh();
        });
      }, refreshInterval);
    };

    fetchEndpointPerformance();
    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchEndpointPerformance, refreshInterval]);

  return { endpointPerformance, isLoading, error, refresh: fetchEndpointPerformance };
}

// Hook for cache metrics with auto-refresh
export function useCacheMetrics(refreshInterval: number = 15000) {
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchCacheMetrics = useCallback(async () => {
    try {
      const metrics = await performanceService.getCacheMetrics();
      setCacheMetrics(metrics);
      setError(null);
    } catch (err) {
      console.error('Error fetching cache metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cache metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        fetchCacheMetrics().then(() => {
          scheduleRefresh();
        });
      }, refreshInterval);
    };

    fetchCacheMetrics();
    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchCacheMetrics, refreshInterval]);

  return { cacheMetrics, isLoading, error, refresh: fetchCacheMetrics };
}
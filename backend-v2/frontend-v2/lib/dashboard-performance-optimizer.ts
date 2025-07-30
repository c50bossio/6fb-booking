/**
 * Dashboard Performance Optimizer for 6FB Booking V2
 * Comprehensive performance optimization system to achieve <2 second load times
 */

import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Performance monitoring
interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  componentCount: number;
  bundleSize: number;
  memoryUsage: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    renderTime: 0,
    apiResponseTime: 0,
    componentCount: 0,
    bundleSize: 0,
    memoryUsage: 0
  };

  startTiming(label: string): () => void {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`[Performance] ${label}: ${end - start}ms`);
      return end - start;
    };
  }

  measureComponentRender<T extends React.ComponentType<any>>(
    Component: T,
    displayName?: string
  ): T {
    const WrappedComponent = (props: any) => {
      const renderStart = useRef(performance.now());
      
      useEffect(() => {
        const renderEnd = performance.now();
        const renderTime = renderEnd - renderStart.current;
        
        if (renderTime > 16) { // > 1 frame at 60fps
          console.warn(`[Performance] Slow render: ${displayName || Component.name}: ${renderTime}ms`);
        }
        
        this.metrics.renderTime += renderTime;
        this.metrics.componentCount++;
      });

      return React.createElement(Component, props);
    };

    WrappedComponent.displayName = `PerformanceMonitor(${displayName || Component.name})`;
    return WrappedComponent as T;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      apiResponseTime: 0,
      componentCount: 0,
      bundleSize: 0,
      memoryUsage: 0
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Optimized data fetching hooks
interface OptimizedQueryOptions {
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export const useOptimizedQuery = <T>(
  key: string[],
  fetcher: () => Promise<T>,
  options: OptimizedQueryOptions = {}
) => {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes default
    cacheTime = 10 * 60 * 1000, // 10 minutes default
    refetchOnWindowFocus = false,
    refetchOnMount = false,
    priority = 'medium'
  } = options;

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const stopTiming = performanceMonitor.startTiming(`API: ${key.join('/')}`);
      try {
        const result = await fetcher();
        stopTiming();
        return result;
      } catch (error) {
        stopTiming();
        throw error;
      }
    },
    staleTime,
    cacheTime,
    refetchOnWindowFocus,
    refetchOnMount,
    // Prioritize high-priority queries
    ...(priority === 'high' && { networkMode: 'always' }),
    ...(priority === 'low' && { networkMode: 'offlineFirst' })
  });
};

// Batch API requests to reduce network overhead
class APIBatcher {
  private batchQueue: Map<string, {
    requests: Array<{ key: string; resolve: Function; reject: Function }>;
    timeout: NodeJS.Timeout;
  }> = new Map();

  private readonly BATCH_DELAY = 50; // 50ms batch window

  batch<T>(batchKey: string, requestKey: string, fetcher: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, {
          requests: [],
          timeout: setTimeout(() => this.executeBatch(batchKey), this.BATCH_DELAY)
        });
      }

      const batch = this.batchQueue.get(batchKey)!;
      batch.requests.push({ key: requestKey, resolve, reject });
    });
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch) return;

    this.batchQueue.delete(batchKey);
    clearTimeout(batch.timeout);

    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled(
        batch.requests.map(req => this.fetchSingle(req.key))
      );

      results.forEach((result, index) => {
        const request = batch.requests[index];
        if (result.status === 'fulfilled') {
          request.resolve(result.value);
        } else {
          request.reject(result.reason);
        }
      });
    } catch (error) {
      batch.requests.forEach(req => req.reject(error));
    }
  }

  private async fetchSingle(key: string): Promise<any> {
    // This would be implemented based on the specific API structure
    const response = await fetch(`/api/v2/${key}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}

export const apiBatcher = new APIBatcher();

// Component lazy loading with suspense
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFn);
  
  return (props: React.ComponentProps<T>) => (
    React.createElement(React.Suspense, {
      fallback: fallback ? React.createElement(fallback) : React.createElement('div', {}, 'Loading...')
    }, React.createElement(LazyComponent, props))
  );
}

// Virtual scrolling for large lists
export const useVirtualScrolling = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStartIndex = Math.floor(scrollTop / itemHeight);
  const visibleEndIndex = Math.min(
    visibleStartIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  );
  
  const visibleItems = useMemo(() => 
    items.slice(visibleStartIndex, visibleEndIndex + 1),
    [items, visibleStartIndex, visibleEndIndex]
  );
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStartIndex * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
};

// Optimized dashboard data management
export const useDashboardData = (userId: string) => {
  const queryClient = useQueryClient();
  
  // High priority: Critical dashboard metrics
  const criticalMetrics = useOptimizedQuery(
    ['dashboard', 'critical', userId],
    () => apiBatcher.batch('dashboard', 'critical-metrics', () => 
      fetch(`/api/v2/dashboard/critical-metrics`).then(r => r.json())
    ),
    { 
      priority: 'high',
      staleTime: 1 * 60 * 1000, // 1 minute for critical data
      refetchOnMount: true
    }
  );

  // Medium priority: Revenue and appointments
  const businessMetrics = useOptimizedQuery(
    ['dashboard', 'business', userId],
    () => apiBatcher.batch('dashboard', 'business-metrics', () =>
      fetch(`/api/v2/dashboard/business-metrics`).then(r => r.json())
    ),
    { priority: 'medium' }
  );

  // Low priority: Analytics and historical data
  const analyticsData = useOptimizedQuery(
    ['dashboard', 'analytics', userId],
    () => apiBatcher.batch('dashboard', 'analytics', () =>
      fetch(`/api/v2/analytics/dashboard/${userId}`).then(r => r.json())
    ),
    { 
      priority: 'low',
      staleTime: 15 * 60 * 1000, // 15 minutes for analytics
      refetchOnWindowFocus: false
    }
  );

  // Preload next likely data
  useEffect(() => {
    const preloadTimer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['dashboard', 'upcoming-appointments', userId],
        queryFn: () => fetch(`/api/v2/appointments/upcoming`).then(r => r.json()),
        staleTime: 5 * 60 * 1000
      });
    }, 1000); // Preload after 1 second

    return () => clearTimeout(preloadTimer);
  }, [userId, queryClient]);

  return {
    criticalMetrics: criticalMetrics.data,
    businessMetrics: businessMetrics.data,
    analyticsData: analyticsData.data,
    isLoading: criticalMetrics.isLoading || businessMetrics.isLoading,
    error: criticalMetrics.error || businessMetrics.error || analyticsData.error
  };
};

// Optimized component rendering
export const OptimizedDashboardCard = React.memo<{
  title: string;
  children: React.ReactNode;
  priority?: 'high' | 'medium' | 'low';
}>(({ title, children, priority = 'medium' }) => {
  const [isVisible, setIsVisible] = useState(priority === 'high');
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy rendering
  useEffect(() => {
    if (priority === 'high') return; // Always render high priority

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  return React.createElement('div', {
    ref: cardRef,
    className: 'dashboard-card'
  }, [
    React.createElement('h3', { key: 'title' }, title),
    isVisible ? children : React.createElement('div', { 
      key: 'skeleton',
      className: 'skeleton-loader' 
    }, 'Loading...')
  ]);
});

OptimizedDashboardCard.displayName = 'OptimizedDashboardCard';

// Bundle splitting utilities
export const loadDashboardModule = (moduleName: string) => {
  switch (moduleName) {
    case 'analytics':
      return import('../components/analytics/LazyAnalytics');
    case 'charts':
      return import('../components/charts/DynamicChart');
    case 'performance':
      return import('../components/performance/PerformanceDashboard');
    default:
      return Promise.reject(new Error(`Unknown module: ${moduleName}`));
  }
};

// Performance optimization hook
export const usePerformanceOptimization = () => {
  const [performanceScore, setPerformanceScore] = useState(0);
  
  useEffect(() => {
    // Monitor performance metrics
    const checkPerformance = () => {
      const metrics = performanceMonitor.getMetrics();
      const score = Math.max(0, 100 - (metrics.renderTime / 10)); // Basic scoring
      setPerformanceScore(score);
      
      if (score < 70) {
        console.warn('[Performance] Dashboard performance is degraded:', metrics);
      }
    };
    
    const interval = setInterval(checkPerformance, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);
  
  return {
    performanceScore,
    metrics: performanceMonitor.getMetrics(),
    resetMetrics: performanceMonitor.reset.bind(performanceMonitor)
  };
};

// Cache warming for predictive loading
export const usePreloadStrategy = (userId: string) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Warm up likely navigation paths
    const preloadSequence = [
      () => queryClient.prefetchQuery({
        queryKey: ['appointments', 'today', userId],
        queryFn: () => fetch(`/api/v2/appointments/today`).then(r => r.json())
      }),
      () => queryClient.prefetchQuery({
        queryKey: ['clients', 'recent', userId],
        queryFn: () => fetch(`/api/v2/clients/recent`).then(r => r.json())
      }),
      () => queryClient.prefetchQuery({
        queryKey: ['revenue', 'weekly', userId],
        queryFn: () => fetch(`/api/v2/analytics/revenue/weekly`).then(r => r.json())
      })
    ];
    
    // Stagger preloading to avoid overwhelming the server
    preloadSequence.forEach((preloadFn, index) => {
      setTimeout(preloadFn, index * 500);
    });
  }, [userId, queryClient]);
};

// Error boundary with performance tracking
export class PerformanceErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Performance] Component error detected:', error, errorInfo);
    
    // Track performance impact of errors
    performanceMonitor.getMetrics();
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || (() => React.createElement('div', {}, 'Something went wrong'));
      return React.createElement(Fallback);
    }

    return this.props.children;
  }
}

export default {
  performanceMonitor,
  useOptimizedQuery,
  apiBatcher,
  createLazyComponent,
  useVirtualScrolling,
  useDashboardData,
  OptimizedDashboardCard,
  loadDashboardModule,
  usePerformanceOptimization,
  usePreloadStrategy,
  PerformanceErrorBoundary
};
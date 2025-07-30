/**
 * Enhanced Lazy Loading Components with Performance Monitoring
 * Optimized for BookedBarber V2 Dashboard Performance
 */
import dynamic from 'next/dynamic';
import React, { Suspense, memo, useState, useEffect } from 'react';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';

// Performance monitoring utilities
const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Log performance metrics (in production, send to analytics)
      console.log(`[Performance] ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
      
      // Track Core Web Vitals
      if ('web-vital' in window) {
        // @ts-ignore
        window['web-vital'].measure(componentName, loadTime);
      }
    };
  }, [componentName]);
};

// Enhanced skeleton loaders for different component types
const AnalyticsSkeleton = memo(() => {
  usePerformanceMonitor('AnalyticsSkeleton');
  
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );
});
AnalyticsSkeleton.displayName = 'AnalyticsSkeleton';

const SixFigureTrackerSkeleton = memo(() => {
  usePerformanceMonitor('SixFigureTrackerSkeleton');
  
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
SixFigureTrackerSkeleton.displayName = 'SixFigureTrackerSkeleton';

const ChartSkeleton = memo(() => {
  usePerformanceMonitor('ChartSkeleton');
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
      <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
});
ChartSkeleton.displayName = 'ChartSkeleton';

// Error boundary for lazy loaded components
class LazyComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; componentName: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; componentName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[LazyLoad Error] ${this.props.componentName}:`, error, errorInfo);
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // trackError(error, { component: this.props.componentName, ...errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Component Loading Error
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {this.props.componentName} failed to load. Please refresh the page.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced lazy loading with performance monitoring and error handling
export const LazyAnalytics = dynamic(
  () => import('../analytics/SixFigureAnalyticsDashboard').catch((error) => {
    console.error('[LazyLoad] Failed to load Analytics:', error);
    return { default: () => <div>Analytics component failed to load</div> };
  }),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false
  }
);

export const LazySixFigureTracker = dynamic(
  () => import('../six-figure-barber/SixFigureBarberDashboard').catch((error) => {
    console.error('[LazyLoad] Failed to load SixFigureTracker:', error);
    return { default: () => <div>Six Figure Tracker component failed to load</div> };
  }),
  {
    loading: () => <SixFigureTrackerSkeleton />,
    ssr: false
  }
);

export const LazyRevenueChart = dynamic(
  () => import('../charts/RevenueChart').catch((error) => {
    console.error('[LazyLoad] Failed to load RevenueChart:', error);
    return { default: () => <div>Revenue chart failed to load</div> };
  }),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

export const LazyBookingChart = dynamic(
  () => import('../charts/BookingChart').catch((error) => {
    console.error('[LazyLoad] Failed to load BookingChart:', error);
    return { default: () => <div>Booking chart failed to load</div> };
  }),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

export const LazyClientAnalytics = dynamic(
  () => import('../analytics/ClientAnalytics').catch((error) => {
    console.error('[LazyLoad] Failed to load ClientAnalytics:', error);
    return { default: () => <div>Client analytics failed to load</div> };
  }),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false
  }
);

// Performance-optimized wrapper for lazy components
export const OptimizedLazyWrapper = memo(({ 
  children, 
  componentName,
  fallback = <DashboardSkeleton />
}: { 
  children: React.ReactNode;
  componentName: string;
  fallback?: React.ReactNode;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [intersectionObserver, setIntersectionObserver] = useState<IntersectionObserver | null>(null);
  
  usePerformanceMonitor(`OptimizedLazyWrapper-${componentName}`);

  useEffect(() => {
    // Intersection Observer for viewport-based lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Load 50px before entering viewport
        threshold: 0.1
      }
    );

    setIntersectionObserver(observer);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Ref callback to observe the element
  const ref = React.useCallback((node: HTMLDivElement | null) => {
    if (node && intersectionObserver) {
      intersectionObserver.observe(node);
    }
  }, [intersectionObserver]);

  return (
    <div ref={ref}>
      <LazyComponentErrorBoundary componentName={componentName}>
        <Suspense fallback={fallback}>
          {isVisible ? children : fallback}
        </Suspense>
      </LazyComponentErrorBoundary>
    </div>
  );
});
OptimizedLazyWrapper.displayName = 'OptimizedLazyWrapper';

// Factory function for creating lazy components
export const createLazyComponent = (
  importFunction: () => Promise<{ default: React.ComponentType<any> }>,
  componentName: string,
  skeleton?: React.ComponentType
) => {
  const LazyComponent = dynamic(
    () => importFunction().catch((error) => {
      console.error(`[LazyLoad] Failed to load ${componentName}:`, error);
      return { default: () => <div>{componentName} failed to load</div> };
    }),
    {
      loading: () => skeleton ? React.createElement(skeleton) : <DashboardSkeleton />,
      ssr: false
    }
  );

  const WrappedComponent = memo((props: any) => (
    <OptimizedLazyWrapper componentName={componentName}>
      <LazyComponent {...props} />
    </OptimizedLazyWrapper>
  ));

  WrappedComponent.displayName = `Lazy${componentName}`;
  return WrappedComponent;
};

// Pre-configured lazy components for common dashboard elements
export const LazyDashboardComponents = {
  Analytics: LazyAnalytics,
  SixFigureTracker: LazySixFigureTracker,
  RevenueChart: LazyRevenueChart,
  BookingChart: LazyBookingChart,
  ClientAnalytics: LazyClientAnalytics
};

export default LazyDashboardComponents;
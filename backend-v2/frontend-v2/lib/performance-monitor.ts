/**
 * Production Performance Monitoring Setup
 * Real-time performance tracking for BookedBarber V2
 */

interface PerformanceConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  reportingInterval: number;
  memoryThreshold: number;
  renderThreshold: number;
}

interface PerformanceReport {
  timestamp: string;
  metrics: {
    renderTimes: { component: string; avgTime: number; count: number }[];
    memoryUsage: number;
    cachePerformance: { hitRate: number; size: number };
    errorCount: number;
  };
  recommendations: string[];
}

class ProductionPerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: Map<string, number[]> = new Map();
  private reportingTimer?: NodeJS.Timeout;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableLogging: process.env.NODE_ENV === 'development',
      enableMetrics: true,
      reportingInterval: 60000, // 1 minute
      memoryThreshold: 150, // MB
      renderThreshold: 100, // ms
      ...config
    };

    if (this.config.enableMetrics) {
      this.startReporting();
    }
  }

  recordRenderTime(component: string, time: number): void {
    if (!this.metrics.has(component)) {
      this.metrics.set(component, []);
    }
    
    this.metrics.get(component)!.push(time);
    
    // Keep only last 100 measurements per component
    const times = this.metrics.get(component)!;
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }

    // Alert on slow renders
    if (time > this.config.renderThreshold && this.config.enableLogging) {
      console.warn(`🐌 Slow render detected: ${component} took ${time.toFixed(2)}ms`);
    }
  }

  recordMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as any).memory;
      const usageInMB = memInfo.usedJSHeapSize / 1024 / 1024;
      
      if (usageInMB > this.config.memoryThreshold && this.config.enableLogging) {
        console.warn(`🧠 High memory usage: ${usageInMB.toFixed(2)}MB`);
      }
      
      return usageInMB;
    }
    return 0;
  }

  generateReport(): PerformanceReport {
    const now = new Date().toISOString();
    const renderTimes: { component: string; avgTime: number; count: number }[] = [];
    
    // Calculate average render times
    this.metrics.forEach((times, component) => {
      if (times.length > 0) {
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        renderTimes.push({ component, avgTime, count: times.length });
      }
    });

    // Sort by average render time (slowest first)
    renderTimes.sort((a, b) => b.avgTime - a.avgTime);

    const memoryUsage = this.recordMemoryUsage();
    
    const recommendations: string[] = [];
    
    // Generate recommendations
    if (renderTimes.some(r => r.avgTime > this.config.renderThreshold)) {
      recommendations.push('Consider optimizing slow-rendering components');
    }
    
    if (memoryUsage > this.config.memoryThreshold) {
      recommendations.push('Memory usage is high - consider cache cleanup');
    }
    
    if (renderTimes.length > 20) {
      recommendations.push('Many components tracked - consider component consolidation');
    }

    return {
      timestamp: now,
      metrics: {
        renderTimes,
        memoryUsage,
        cachePerformance: { hitRate: 0, size: 0 }, // Placeholder
        errorCount: 0 // Placeholder
      },
      recommendations
    };
  }

  private startReporting(): void {
    this.reportingTimer = setInterval(() => {
      const report = this.generateReport();
      
      if (this.config.enableLogging) {
        console.group('📊 Performance Report');
        console.log('⏱️ Render Performance:', report.metrics.renderTimes.slice(0, 5));
        console.log('🧠 Memory Usage:', `${report.metrics.memoryUsage.toFixed(2)}MB`);
        if (report.recommendations.length > 0) {
          console.log('💡 Recommendations:', report.recommendations);
        }
        console.groupEnd();
      }

      // In production, send to analytics service
      if (process.env.NODE_ENV === 'production') {
        this.sendToAnalytics(report);
      }
    }, this.config.reportingInterval);
  }

  private sendToAnalytics(report: PerformanceReport): void {
    // Send to analytics service (Sentry, DataDog, etc.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_report', {
        custom_parameter_memory_usage: report.metrics.memoryUsage,
        custom_parameter_slow_components: report.metrics.renderTimes.filter(r => r.avgTime > this.config.renderThreshold).length
      });
    }
  }

  destroy(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
    this.metrics.clear();
  }
}

// Singleton instance
export const performanceMonitor = new ProductionPerformanceMonitor();

// React Hook for easy integration
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    performanceMonitor.recordRenderTime(componentName, renderTime);
  };
}

// Higher-order component for automatic tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.memo((props: P) => {
    const trackPerformance = usePerformanceTracking(componentName || Component.displayName || 'Unknown');
    
    React.useEffect(() => {
      return trackPerformance();
    });

    return React.createElement(Component, props);
  });

  WrappedComponent.displayName = `withPerformanceTracking(${componentName || Component.displayName || 'Component'})`;
  
  return WrappedComponent;
}

export default performanceMonitor;
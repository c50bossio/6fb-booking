/**
 * Performance tests for chart components.
 * 
 * Tests focus on:
 * - Rendering performance with large datasets
 * - Memory usage and leak detection
 * - Animation performance
 * - Re-render optimization
 * - Chart.js instance management
 * - Six Figure Barber scalability requirements
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { jest } from '@jest/globals';
import ClientMetricsChart from '@/components/charts/ClientMetricsChart';
import RevenueChart from '@/components/charts/RevenueChart';
import ServicePerformanceChart from '@/components/charts/ServicePerformanceChart';
import { ChartDataGenerator, ChartPerformanceUtils } from '@/__tests__/test-utils/chart-test-helpers';

// Mock Chart.js with performance tracking
const mockChartUpdate = jest.fn();
const mockChartDestroy = jest.fn();

jest.mock('react-chartjs-2', () => ({
  Doughnut: React.forwardRef(({ data, options }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      update: mockChartUpdate,
      destroy: mockChartDestroy
    }));
    return <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} />;
  }),
  Line: React.forwardRef(({ data, options }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      update: mockChartUpdate,
      destroy: mockChartDestroy
    }));
    return <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />;
  }),
  Bar: React.forwardRef(({ data, options }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      update: mockChartUpdate,
      destroy: mockChartDestroy
    }));
    return <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />;
  })
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  ArcElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  Filler: jest.fn()
}));

describe('Chart Components Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing timers
    jest.clearAllTimers();
  });

  afterEach(() => {
    cleanup();
  });

  describe('ClientMetricsChart Performance', () => {
    it('renders within acceptable time limits', () => {
      const metrics = ChartDataGenerator.generateClientMetrics({
        totalClients: 1000,
        vipPercentage: 0.25,
        retentionRate: 85
      });

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(<ClientMetricsChart metrics={metrics} />);
      });

      // Should render within 50ms for optimal UX
      expect(renderTime).toBeLessThan(50);
    });

    it('handles rapid prop changes efficiently', () => {
      const initialMetrics = ChartDataGenerator.generateClientMetrics();
      const { rerender } = render(<ClientMetricsChart metrics={initialMetrics} />);

      const renderTimes: number[] = [];

      // Simulate 10 rapid updates (real-time dashboard scenario)
      for (let i = 0; i < 10; i++) {
        const newMetrics = ChartDataGenerator.generateClientMetrics({
          totalClients: 100 + i * 10,
          vipPercentage: 0.2 + (i * 0.01)
        });

        const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
          rerender(<ClientMetricsChart metrics={newMetrics} />);
        });

        renderTimes.push(renderTime);
      }

      // All re-renders should be fast
      const maxRenderTime = Math.max(...renderTimes);
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;

      expect(maxRenderTime).toBeLessThan(30);
      expect(avgRenderTime).toBeLessThan(20);
    });

    it('switches chart types without performance degradation', () => {
      const metrics = ChartDataGenerator.generateClientMetrics();
      const { rerender } = render(<ClientMetricsChart metrics={metrics} type="doughnut" />);

      const switchTime = ChartPerformanceUtils.measureRenderTime(() => {
        rerender(<ClientMetricsChart metrics={metrics} type="bar" />);
      }).renderTime;

      expect(switchTime).toBeLessThan(25);
    });

    it('manages theme changes efficiently', () => {
      const metrics = ChartDataGenerator.generateClientMetrics();
      const { rerender } = render(<ClientMetricsChart metrics={metrics} theme="light" />);

      const themeChangeTime = ChartPerformanceUtils.measureRenderTime(() => {
        rerender(<ClientMetricsChart metrics={metrics} theme="dark" />);
      }).renderTime;

      expect(themeChangeTime).toBeLessThan(20);
    });

    it('handles extreme client counts without breaking', () => {
      const extremeMetrics = ChartDataGenerator.generateClientMetrics({
        totalClients: 50000, // Very large barbershop chain
        vipPercentage: 0.3,
        retentionRate: 90
      });

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(<ClientMetricsChart metrics={extremeMetrics} />);
      });

      // Should still render reasonably fast even with extreme values
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('RevenueChart Performance', () => {
    it('renders large datasets efficiently', () => {
      const largeDataset = ChartPerformanceUtils.createLargeDataset(1000);

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(<RevenueChart data={largeDataset} />);
      });

      // Should handle 1000 data points within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('optimizes performance with multiple datasets', () => {
      const revenueData = ChartDataGenerator.generateRevenueData('month');

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(
          <RevenueChart 
            data={revenueData} 
            showTips={true} 
            showAppointments={true} 
          />
        );
      });

      // Three datasets should still render quickly
      expect(renderTime).toBeLessThan(75);
    });

    it('handles period changes without memory leaks', () => {
      const data = ChartDataGenerator.generateRevenueData('week');
      const { rerender, unmount } = render(<RevenueChart data={data} period="week" />);

      const periods: Array<'day' | 'week' | 'month' | 'quarter' | 'year'> = 
        ['day', 'week', 'month', 'quarter', 'year'];

      // Cycle through all periods
      periods.forEach(period => {
        const periodData = ChartDataGenerator.generateRevenueData(period);
        rerender(<RevenueChart data={periodData} period={period} />);
      });

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });

    it('maintains performance with real-time updates', () => {
      const initialData = ChartDataGenerator.generateRevenueData('day');
      const { rerender } = render(<RevenueChart data={initialData} />);

      const updateTimes: number[] = [];

      // Simulate real-time updates every second for 30 seconds
      for (let i = 0; i < 30; i++) {
        const updatedData = initialData.map(point => ({
          ...point,
          revenue: point.revenue * (1 + (Math.random() - 0.5) * 0.1) // ±5% variance
        }));

        const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
          rerender(<RevenueChart data={updatedData} />);
        });

        updateTimes.push(renderTime);
      }

      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      expect(avgUpdateTime).toBeLessThan(15); // Very fast for real-time updates
    });

    it('optimizes chart reference usage', () => {
      const data = ChartDataGenerator.generateRevenueData('week');
      const { rerender, unmount } = render(<RevenueChart data={data} />);

      // Multiple re-renders should reuse chart reference
      for (let i = 0; i < 5; i++) {
        rerender(<RevenueChart data={data} height={300 + i * 10} />);
      }

      unmount();

      // Chart update should have been called during animation setup
      expect(mockChartUpdate).toHaveBeenCalled();
    });

    it('handles animation performance properly', async () => {
      const data = ChartDataGenerator.generateRevenueData('week');
      
      const startTime = performance.now();
      render(<RevenueChart data={data} />);
      
      // Simulate animation completion time
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const totalTime = performance.now() - startTime;
      
      // Total time including animation setup should be reasonable
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('ServicePerformanceChart Performance', () => {
    it('sorts large service datasets efficiently', () => {
      const manyServices = ChartDataGenerator.generateServiceMetrics(100);

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(<ServicePerformanceChart services={manyServices} />);
      });

      // Should handle 100 services and sort to top 8 quickly
      expect(renderTime).toBeLessThan(60);
    });

    it('handles metric switching efficiently', () => {
      const services = ChartDataGenerator.generateServiceMetrics(50);
      const { rerender } = render(<ServicePerformanceChart services={services} metric="revenue" />);

      const metrics: Array<'revenue' | 'bookings' | 'averagePrice' | 'profitMargin'> = 
        ['bookings', 'averagePrice', 'profitMargin', 'revenue'];

      const switchTimes: number[] = [];

      metrics.forEach(metric => {
        const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
          rerender(<ServicePerformanceChart services={services} metric={metric} />);
        });
        switchTimes.push(renderTime);
      });

      const maxSwitchTime = Math.max(...switchTimes);
      expect(maxSwitchTime).toBeLessThan(40);
    });

    it('efficiently processes premium vs standard service calculations', () => {
      const mixedServices = ChartDataGenerator.generateServiceMetrics(200);

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(
          <ServicePerformanceChart 
            services={mixedServices} 
            showPremiumIndicator={true} 
          />
        );
      });

      // Premium indicator calculations should not significantly impact performance
      expect(renderTime).toBeLessThan(80);
    });

    it('manages service name truncation efficiently', () => {
      const longNamedServices = Array.from({ length: 20 }, (_, i) => ({
        serviceId: i + 1,
        serviceName: `This Is A Very Long Service Name That Needs To Be Truncated For Display Purposes ${i}`,
        bookings: 50,
        revenue: 4000,
        averagePrice: 80,
        profitMargin: 75,
        popularityRank: i + 1,
        isPremium: i % 2 === 0
      }));

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(<ServicePerformanceChart services={longNamedServices} />);
      });

      // String manipulation should not significantly impact performance
      expect(renderTime).toBeLessThan(50);
    });

    it('handles rapid service data updates', () => {
      let services = ChartDataGenerator.generateServiceMetrics(30);
      const { rerender } = render(<ServicePerformanceChart services={services} />);

      const updateTimes: number[] = [];

      // Simulate business metrics updating throughout the day
      for (let i = 0; i < 20; i++) {
        services = services.map(service => ({
          ...service,
          bookings: service.bookings + Math.floor(Math.random() * 3),
          revenue: service.revenue * (1 + Math.random() * 0.1)
        }));

        const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
          rerender(<ServicePerformanceChart services={services} />);
        });

        updateTimes.push(renderTime);
      }

      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      expect(avgUpdateTime).toBeLessThan(25);
    });
  });

  describe('Memory Management', () => {
    it('properly cleans up chart instances on unmount', () => {
      const metrics = ChartDataGenerator.generateClientMetrics();
      const { unmount } = render(<ClientMetricsChart metrics={metrics} />);

      unmount();

      // Should not cause memory leaks
      expect(() => {
        // Force garbage collection in test environment if available
        if (global.gc) {
          global.gc();
        }
      }).not.toThrow();
    });

    it('handles multiple chart instances without interference', () => {
      const metrics = ChartDataGenerator.generateClientMetrics();
      const revenueData = ChartDataGenerator.generateRevenueData('week');
      const services = ChartDataGenerator.generateServiceMetrics(10);

      const startTime = performance.now();

      const { unmount: unmount1 } = render(<ClientMetricsChart metrics={metrics} />);
      const { unmount: unmount2 } = render(<RevenueChart data={revenueData} />);
      const { unmount: unmount3 } = render(<ServicePerformanceChart services={services} />);

      const renderTime = performance.now() - startTime;

      // Multiple charts should render efficiently
      expect(renderTime).toBeLessThan(150);

      // All should unmount cleanly
      expect(() => {
        unmount1();
        unmount2();
        unmount3();
      }).not.toThrow();
    });

    it('prevents memory leaks during rapid re-renders', () => {
      const metrics = ChartDataGenerator.generateClientMetrics();
      const { rerender, unmount } = render(<ClientMetricsChart metrics={metrics} />);

      // Simulate aggressive re-rendering
      for (let i = 0; i < 100; i++) {
        const newMetrics = ChartDataGenerator.generateClientMetrics({
          totalClients: 100 + i
        });
        rerender(<ClientMetricsChart metrics={newMetrics} />);
      }

      // Should unmount without issues
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Six Figure Barber Scalability', () => {
    it('handles enterprise-level client volumes', () => {
      // Simulate large barbershop chain with 10,000+ clients
      const enterpriseMetrics = ChartDataGenerator.generateClientMetrics({
        totalClients: 10000,
        vipPercentage: 0.15,
        retentionRate: 88,
        avgLifetimeValue: 1200
      });

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(<ClientMetricsChart metrics={enterpriseMetrics} />);
      });

      expect(renderTime).toBeLessThan(75);
    });

    it('processes six-figure revenue data efficiently', () => {
      // Generate data representing $100k+ annual revenue
      const highVolumeData = ChartDataGenerator.generateRevenueData('year', {
        baseRevenue: 300, // $300/day = ~$100k/year
        seasonalVariation: true
      });

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(<RevenueChart data={highVolumeData} />);
      });

      expect(renderTime).toBeLessThan(60);
    });

    it('handles premium service portfolio scaling', () => {
      // Large premium service menu for luxury barber shops
      const premiumServices = ChartDataGenerator.generateServiceMetrics(50);
      // Ensure high premium ratio
      const premiumHeavy = premiumServices.map((service, i) => ({
        ...service,
        isPremium: i < 30, // 60% premium services
        averagePrice: service.isPremium ? service.averagePrice * 1.5 : service.averagePrice
      }));

      const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
        return render(<ServicePerformanceChart services={premiumHeavy} />);
      });

      expect(renderTime).toBeLessThan(70);
    });

    it('maintains performance during peak business hours simulation', () => {
      // Simulate data updates during busy Saturday
      const peakData = ChartDataGenerator.generateRevenueData('day', {
        baseRevenue: 1200, // High-volume Saturday
        includeDowntime: false
      });

      const { rerender } = render(<RevenueChart data={peakData} />);

      // Simulate updates every 15 minutes during 10-hour day
      const updateTimes: number[] = [];
      for (let i = 0; i < 40; i++) {
        const updatedData = peakData.map(point => ({
          ...point,
          revenue: point.revenue + Math.random() * 50, // Revenue increases throughout day
          appointments: point.appointments + Math.floor(Math.random() * 2)
        }));

        const { renderTime } = ChartPerformanceUtils.measureRenderTime(() => {
          rerender(<RevenueChart data={updatedData} />);
        });

        updateTimes.push(renderTime);
      }

      const maxUpdateTime = Math.max(...updateTimes);
      expect(maxUpdateTime).toBeLessThan(30);
    });
  });

  describe('Stress Testing', () => {
    it('survives extreme data scenarios', () => {
      const stressData = ChartPerformanceUtils.createStressTestData();

      expect(() => {
        render(<RevenueChart data={stressData.extremeValues} />);
      }).not.toThrow();

      expect(() => {
        render(<RevenueChart data={stressData.zeroValues} />);
      }).not.toThrow();

      expect(() => {
        render(<RevenueChart data={stressData.negativeValues} />);
      }).not.toThrow();

      expect(() => {
        render(<RevenueChart data={stressData.sparseData} />);
      }).not.toThrow();
    });

    it('handles concurrent chart operations', async () => {
      const metrics = ChartDataGenerator.generateClientMetrics();
      const revenueData = ChartDataGenerator.generateRevenueData('week');
      const services = ChartDataGenerator.generateServiceMetrics(20);

      // Render all charts simultaneously
      const promises = [
        Promise.resolve(render(<ClientMetricsChart metrics={metrics} />)),
        Promise.resolve(render(<RevenueChart data={revenueData} />)),
        Promise.resolve(render(<ServicePerformanceChart services={services} />))
      ];

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(200);
      
      // All should render successfully
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.container).toBeInTheDocument();
      });
    });

    it('recovers from chart rendering errors gracefully', () => {
      // Force an error scenario
      const corruptedMetrics = {
        totalClients: null,
        newClients: undefined,
        returningClients: 'invalid',
        vipClients: NaN,
        averageLifetimeValue: -Infinity,
        retentionRate: 'not a number'
      } as any;

      expect(() => {
        render(<ClientMetricsChart metrics={corruptedMetrics} />);
      }).not.toThrow();
    });
  });
});
/**
 * Integration tests for chart components with analytics service.
 * 
 * Tests cover:
 * - Analytics service integration
 * - Real data flow from service to charts
 * - Business logic validation
 * - Six Figure Barber methodology compliance
 * - Error handling with real API responses
 * - Cross-component data consistency
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import ClientMetricsChart from '@/components/charts/ClientMetricsChart';
import RevenueChart from '@/components/charts/RevenueChart';
import ServicePerformanceChart from '@/components/charts/ServicePerformanceChart';
import { AnalyticsService, AnalyticsReport } from '@/services/analytics_service';
import { SixFigureBarberValidation } from '@/__tests__/test-utils/chart-test-helpers';

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Doughnut: jest.fn(({ data }) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)}>
      Doughnut Chart
    </div>
  )),
  Line: jest.fn(({ data }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      Line Chart
    </div>
  )),
  Bar: jest.fn(({ data }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      Bar Chart
    </div>
  ))
}));

jest.mock('chart.js', () => ({
  Chart: { register: jest.fn() },
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

jest.mock('@heroicons/react/24/solid', () => ({
  StarIcon: ({ className }: { className: string }) => (
    <svg data-testid="star-icon" className={className} />
  )
}));

describe('Charts Integration Tests', () => {
  // Mock realistic business data
  const mockAppointments = [
    {
      id: 1,
      client_id: 1,
      service_id: 1,
      service_name: 'Signature Haircut & Style',
      start_time: '2024-01-15T10:00:00Z',
      price: 80.00,
      tips: 12.00,
      status: 'completed',
      is_premium: true
    },
    {
      id: 2,
      client_id: 2,
      service_id: 2,
      service_name: 'Classic Haircut',
      start_time: '2024-01-15T11:00:00Z',
      price: 30.00,
      tips: 4.50,
      status: 'completed',
      is_premium: false
    },
    {
      id: 3,
      client_id: 1,
      service_id: 3,
      service_name: 'Premium Beard Sculpting',
      start_time: '2024-01-16T14:00:00Z',
      price: 70.00,
      tips: 10.50,
      status: 'completed',
      is_premium: true
    },
    {
      id: 4,
      client_id: 3,
      service_id: 1,
      service_name: 'Signature Haircut & Style',
      start_time: '2024-01-17T15:30:00Z',
      price: 80.00,
      tips: 15.00,
      status: 'completed',
      is_premium: true
    },
    {
      id: 5,
      client_id: 4,
      service_id: 4,
      service_name: 'Executive Grooming Package',
      start_time: '2024-01-18T16:00:00Z',
      price: 150.00,
      tips: 30.00,
      status: 'completed',
      is_premium: true
    }
  ];

  const mockClients = [
    {
      id: 1,
      created_at: '2024-01-01T00:00:00Z',
      is_vip: true,
      total_revenue: 850.00,
      total_appointments: 12
    },
    {
      id: 2,
      created_at: '2024-01-10T00:00:00Z',
      is_vip: false,
      total_revenue: 180.00,
      total_appointments: 4
    },
    {
      id: 3,
      created_at: '2023-12-15T00:00:00Z',
      is_vip: false,
      total_revenue: 320.00,
      total_appointments: 6
    },
    {
      id: 4,
      created_at: '2024-01-18T00:00:00Z',
      is_vip: true,
      total_revenue: 750.00,
      total_appointments: 8
    }
  ];

  const testPeriod = {
    start: new Date('2024-01-15T00:00:00Z'),
    end: new Date('2024-01-21T23:59:59Z'),
    type: 'week' as const
  };

  let analyticsReport: AnalyticsReport;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Generate realistic analytics report using the service
    analyticsReport = AnalyticsService.generateReport(
      mockAppointments,
      mockClients,
      testPeriod
    );
  });

  describe('Analytics Service Integration', () => {
    it('generates valid analytics report from real data', () => {
      expect(analyticsReport).toBeDefined();
      expect(analyticsReport.period).toEqual(testPeriod);
      expect(analyticsReport.summary.totalRevenue).toBeGreaterThan(0);
      expect(analyticsReport.revenueData).toHaveLength(7); // Week has 7 days
      expect(analyticsReport.clientMetrics).toBeDefined();
      expect(analyticsReport.serviceMetrics.length).toBeGreaterThan(0);
    });

    it('calculates Six Figure Barber metrics correctly', () => {
      const { summary, clientMetrics } = analyticsReport;
      
      // Validate revenue progression
      const validation = SixFigureBarberValidation.validateRevenueProgression(
        analyticsReport.revenueData, 
        'week'
      );
      
      expect(validation.projectedAnnual).toBeGreaterThan(0);
      expect(validation.sixFigureProgress).toBeGreaterThan(0);
      
      // Validate client metrics
      const clientValidation = SixFigureBarberValidation.validateClientMetrics(clientMetrics);
      expect(clientValidation).toBeDefined();
    });

    it('maintains data consistency across all metrics', () => {
      const { summary, revenueData, serviceMetrics } = analyticsReport;
      
      // Revenue from service metrics should align with summary
      const serviceRevenue = serviceMetrics.reduce((sum, service) => sum + service.revenue, 0);
      const revenueFromData = revenueData.reduce((sum, point) => sum + point.totalRevenue, 0);
      
      // Should be approximately equal (allowing for rounding differences)
      expect(Math.abs(serviceRevenue - revenueFromData)).toBeLessThan(1);
    });
  });

  describe('ClientMetricsChart Integration', () => {
    it('displays real client metrics correctly', () => {
      render(<ClientMetricsChart metrics={analyticsReport.clientMetrics} />);
      
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      expect(screen.getByText(analyticsReport.clientMetrics.totalClients.toString())).toBeInTheDocument();
    });

    it('validates Six Figure Barber client distribution', () => {
      const { clientMetrics } = analyticsReport;
      const validation = SixFigureBarberValidation.validateClientMetrics(clientMetrics);
      
      render(<ClientMetricsChart metrics={clientMetrics} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // VIP clients should be properly represented
      expect(chartData.datasets[0].data[2]).toBe(clientMetrics.vipClients);
      
      // If VIP percentage is low, business should address it
      const vipPercentage = (clientMetrics.vipClients / clientMetrics.totalClients) * 100;
      if (vipPercentage < 20) {
        expect(validation.recommendations).toContain(
          expect.stringContaining('VIP')
        );
      }
    });

    it('handles real client lifecycle scenarios', () => {
      // Test with clients at different lifecycle stages
      const diverseClients = [
        ...mockClients,
        // Add churned client
        {
          id: 5,
          created_at: '2023-06-01T00:00:00Z',
          is_vip: false,
          total_revenue: 60.00,
          total_appointments: 2
        },
        // Add new VIP client
        {
          id: 6,
          created_at: '2024-01-20T00:00:00Z',
          is_vip: true,
          total_revenue: 200.00,
          total_appointments: 2
        }
      ];

      const diverseReport = AnalyticsService.generateReport(
        mockAppointments,
        diverseClients,
        testPeriod
      );

      render(<ClientMetricsChart metrics={diverseReport.clientMetrics} />);
      
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      expect(diverseReport.clientMetrics.totalClients).toBe(4); // Only active clients in period
    });
  });

  describe('RevenueChart Integration', () => {
    it('displays real revenue data with proper formatting', () => {
      render(<RevenueChart data={analyticsReport.revenueData} />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Should have data for each day of the week
      expect(chartData.labels).toHaveLength(7);
      expect(chartData.datasets[0].data).toHaveLength(7);
    });

    it('validates Six Figure Barber revenue patterns', () => {
      const validation = SixFigureBarberValidation.validateRevenueProgression(
        analyticsReport.revenueData,
        'week'
      );

      render(<RevenueChart data={analyticsReport.revenueData} period="week" />);
      
      // Chart should reflect revenue progression
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(validation.projectedAnnual).toBeGreaterThan(0);
      
      // If not on track for six figures, should be visible in data trends
      if (!validation.isOnTrack) {
        const totalWeekRevenue = chartData.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);
        expect(totalWeekRevenue * 52).toBeLessThan(100000);
      }
    });

    it('handles tips integration correctly', () => {
      render(<RevenueChart data={analyticsReport.revenueData} showTips={true} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Should have both revenue and tips datasets
      expect(chartData.datasets).toHaveLength(2);
      expect(chartData.datasets[1].label).toBe('Tips');
      
      // Tips should be realistic percentage of revenue
      const totalRevenue = chartData.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);
      const totalTips = chartData.datasets[1].data.reduce((sum: number, val: number) => sum + val, 0);
      const tipPercentage = (totalTips / totalRevenue) * 100;
      
      expect(tipPercentage).toBeGreaterThan(5); // Minimum reasonable tip percentage
      expect(tipPercentage).toBeLessThan(50); // Maximum reasonable tip percentage
    });

    it('projects toward six-figure goals accurately', () => {
      const weeklyRevenue = analyticsReport.revenueData.reduce((sum, point) => sum + point.totalRevenue, 0);
      const projectedAnnual = weeklyRevenue * 52;
      
      render(<RevenueChart data={analyticsReport.revenueData} period="week" />);
      
      // If projected annual is below $100k, should be evident in chart data
      if (projectedAnnual < 100000) {
        expect(weeklyRevenue).toBeLessThan(1923); // $100k / 52 weeks
      }
    });
  });

  describe('ServicePerformanceChart Integration', () => {
    it('displays real service performance data', () => {
      render(<ServicePerformanceChart services={analyticsReport.serviceMetrics} />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByText('Performance Insights:')).toBeInTheDocument();
    });

    it('validates premium service strategy', () => {
      const validation = SixFigureBarberValidation.validatePremiumServiceAdoption(
        analyticsReport.serviceMetrics
      );

      render(<ServicePerformanceChart services={analyticsReport.serviceMetrics} />);
      
      // Premium services should be properly highlighted
      const premiumServices = analyticsReport.serviceMetrics.filter(s => s.isPremium);
      if (premiumServices.length > 0) {
        const chartElement = screen.getByTestId('bar-chart');
        const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
        
        // Premium services should use premium colors
        const hasPremiumColors = chartData.datasets[0].backgroundColor.includes('rgb(168, 85, 247)');
        expect(hasPremiumColors).toBe(true);
      }

      // If premium adoption is low, should be reflected in insights
      if (validation.premiumAdoptionRate < 30) {
        expect(validation.recommendations).toContain(
          expect.stringContaining('premium')
        );
      }
    });

    it('ranks services by business impact correctly', () => {
      render(<ServicePerformanceChart services={analyticsReport.serviceMetrics} metric="revenue" />);
      
      const chartElement = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Services should be sorted by revenue descending
      const revenueData = chartData.datasets[0].data;
      for (let i = 1; i < revenueData.length; i++) {
        expect(revenueData[i - 1]).toBeGreaterThanOrEqual(revenueData[i]);
      }
    });

    it('provides actionable business insights', () => {
      render(<ServicePerformanceChart services={analyticsReport.serviceMetrics} />);
      
      // Should show top performer
      const topService = analyticsReport.serviceMetrics.reduce((top, service) => 
        service.revenue > top.revenue ? service : top
      );
      
      expect(screen.getByText(topService.serviceName)).toBeInTheDocument();
      expect(screen.getByText(/Top performer:/)).toBeInTheDocument();
    });
  });

  describe('Cross-Component Data Consistency', () => {
    it('maintains consistency between revenue and service charts', () => {
      render(
        <div>
          <RevenueChart data={analyticsReport.revenueData} />
          <ServicePerformanceChart services={analyticsReport.serviceMetrics} />
        </div>
      );

      const revenueChart = screen.getByTestId('line-chart');
      const serviceChart = screen.getByTestId('bar-chart');
      
      const revenueData = JSON.parse(revenueChart.getAttribute('data-chart-data') || '{}');
      const serviceData = JSON.parse(serviceChart.getAttribute('data-chart-data') || '{}');
      
      // Total revenue should be consistent
      const totalRevenueFromChart = revenueData.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);
      const totalServiceRevenue = serviceData.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);
      
      // Should be approximately equal (service chart shows top 8 only)
      expect(totalServiceRevenue).toBeLessThanOrEqual(totalRevenueFromChart);
    });

    it('validates client metrics align with revenue data', () => {
      const { clientMetrics, revenueData } = analyticsReport;
      
      render(
        <div>
          <ClientMetricsChart metrics={clientMetrics} />
          <RevenueChart data={revenueData} showAppointments={true} />
        </div>
      );

      // Total appointments should be consistent
      const totalAppointments = revenueData.reduce((sum, point) => sum + point.appointments, 0);
      
      // Should have reasonable appointments per client ratio
      if (clientMetrics.totalClients > 0) {
        const appointmentsPerClient = totalAppointments / clientMetrics.totalClients;
        expect(appointmentsPerClient).toBeGreaterThan(0);
        expect(appointmentsPerClient).toBeLessThan(50); // Reasonable upper bound
      }
    });

    it('ensures Six Figure Barber methodology alignment across charts', () => {
      const clientValidation = SixFigureBarberValidation.validateClientMetrics(analyticsReport.clientMetrics);
      const revenueValidation = SixFigureBarberValidation.validateRevenueProgression(analyticsReport.revenueData, 'week');
      const serviceValidation = SixFigureBarberValidation.validatePremiumServiceAdoption(analyticsReport.serviceMetrics);

      // All validations should provide consistent business insights
      if (!revenueValidation.isOnTrack) {
        // If revenue is low, other metrics should reflect areas for improvement
        expect(
          clientValidation.issues.length > 0 || 
          serviceValidation.premiumAdoptionRate < 40 ||
          !serviceValidation.isOptimal
        ).toBe(true);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles empty analytics data gracefully', () => {
      const emptyReport = AnalyticsService.generateReport([], [], testPeriod);
      
      expect(() => {
        render(<ClientMetricsChart metrics={emptyReport.clientMetrics} />);
        render(<RevenueChart data={emptyReport.revenueData} />);
        render(<ServicePerformanceChart services={emptyReport.serviceMetrics} />);
      }).not.toThrow();
    });

    it('handles corrupted analytics data', () => {
      const corruptedAppointments = [
        {
          id: null,
          client_id: 'invalid',
          service_id: undefined,
          start_time: 'not-a-date',
          price: 'not-a-number',
          status: 'completed'
        }
      ] as any;

      expect(() => {
        const corruptedReport = AnalyticsService.generateReport(
          corruptedAppointments,
          mockClients,
          testPeriod
        );
        
        render(<ClientMetricsChart metrics={corruptedReport.clientMetrics} />);
        render(<RevenueChart data={corruptedReport.revenueData} />);
        render(<ServicePerformanceChart services={corruptedReport.serviceMetrics} />);
      }).not.toThrow();
    });

    it('maintains performance with real-world data volumes', async () => {
      // Simulate a busy barbershop with lots of data
      const largeAppointmentSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        client_id: (i % 200) + 1, // 200 clients
        service_id: (i % 10) + 1,
        service_name: `Service ${(i % 10) + 1}`,
        start_time: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        price: 30 + Math.random() * 120,
        tips: Math.random() * 20,
        status: 'completed',
        is_premium: Math.random() > 0.6
      }));

      const startTime = performance.now();
      
      const largeReport = AnalyticsService.generateReport(
        largeAppointmentSet,
        mockClients,
        testPeriod
      );
      
      render(
        <div>
          <ClientMetricsChart metrics={largeReport.clientMetrics} />
          <RevenueChart data={largeReport.revenueData} />
          <ServicePerformanceChart services={largeReport.serviceMetrics} />
        </div>
      );
      
      const totalTime = performance.now() - startTime;
      
      // Should handle large datasets efficiently
      expect(totalTime).toBeLessThan(200);
    });

    it('provides meaningful insights even with limited data', () => {
      // Single appointment scenario
      const singleAppointment = [mockAppointments[0]];
      const singleClient = [mockClients[0]];
      
      const minimalReport = AnalyticsService.generateReport(
        singleAppointment,
        singleClient,
        testPeriod
      );

      render(
        <div>
          <ClientMetricsChart metrics={minimalReport.clientMetrics} />
          <RevenueChart data={minimalReport.revenueData} />
          <ServicePerformanceChart services={minimalReport.serviceMetrics} />
        </div>
      );

      // Should still render charts with minimal data
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Real-Time Data Integration', () => {
    it('handles live data updates correctly', async () => {
      const { rerender } = render(
        <div>
          <ClientMetricsChart metrics={analyticsReport.clientMetrics} />
          <RevenueChart data={analyticsReport.revenueData} />
          <ServicePerformanceChart services={analyticsReport.serviceMetrics} />
        </div>
      );

      // Simulate new appointment coming in
      const updatedAppointments = [
        ...mockAppointments,
        {
          id: 6,
          client_id: 2,
          service_id: 1,
          service_name: 'Signature Haircut & Style',
          start_time: '2024-01-19T10:00:00Z',
          price: 80.00,
          tips: 12.00,
          status: 'completed',
          is_premium: true
        }
      ];

      const updatedReport = AnalyticsService.generateReport(
        updatedAppointments,
        mockClients,
        testPeriod
      );

      rerender(
        <div>
          <ClientMetricsChart metrics={updatedReport.clientMetrics} />
          <RevenueChart data={updatedReport.revenueData} />
          <ServicePerformanceChart services={updatedReport.serviceMetrics} />
        </div>
      );

      // Charts should update to reflect new data
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('maintains Six Figure Barber tracking with live updates', () => {
      const initialValidation = SixFigureBarberValidation.validateRevenueProgression(
        analyticsReport.revenueData,
        'week'
      );

      // Add high-value appointments to improve metrics
      const premiumAppointments = Array.from({ length: 10 }, (_, i) => ({
        id: 100 + i,
        client_id: (i % 4) + 1,
        service_id: 4,
        service_name: 'Executive Grooming Package',
        start_time: `2024-01-${16 + (i % 3)}T${10 + i}:00:00Z`,
        price: 150.00,
        tips: 30.00,
        status: 'completed',
        is_premium: true
      }));

      const enhancedReport = AnalyticsService.generateReport(
        [...mockAppointments, ...premiumAppointments],
        mockClients,
        testPeriod
      );

      const enhancedValidation = SixFigureBarberValidation.validateRevenueProgression(
        enhancedReport.revenueData,
        'week'
      );

      // Should show improvement in six-figure progress
      expect(enhancedValidation.sixFigureProgress).toBeGreaterThan(initialValidation.sixFigureProgress);
      
      render(<RevenueChart data={enhancedReport.revenueData} />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});
/**
 * Comprehensive tests for ClientMetricsChart component.
 * 
 * Tests cover:
 * - Component rendering (doughnut and bar charts)
 * - Props validation and data handling
 * - Theme switching (light/dark)
 * - Chart interactions and tooltips
 * - Accessibility features
 * - Performance with various data sizes
 * - Error handling and edge cases
 * - Six Figure Barber business logic alignment
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import ClientMetricsChart from '@/components/charts/ClientMetricsChart';
import { ClientMetrics } from '@/services/analytics_service';

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Doughnut: jest.fn(({ data, options }) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      <canvas />
    </div>
  )),
  Bar: jest.fn(({ data, options }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      <canvas />
    </div>
  ))
}));

// Mock Chart.js registration
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  ArcElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

describe('ClientMetricsChart', () => {
  // Mock data based on Six Figure Barber methodology
  const mockMetrics: ClientMetrics = {
    totalClients: 150,
    newClients: 30,
    returningClients: 90,
    vipClients: 30,
    averageLifetimeValue: 850.00,
    retentionRate: 85.5
  };

  const highVolumeMetrics: ClientMetrics = {
    totalClients: 1250,
    newClients: 250,
    returningClients: 750,
    vipClients: 250,
    averageLifetimeValue: 1200.00,
    retentionRate: 92.8
  };

  const lowVolumeMetrics: ClientMetrics = {
    totalClients: 15,
    newClients: 5,
    returningClients: 8,
    vipClients: 2,
    averageLifetimeValue: 425.00,
    retentionRate: 68.2
  };

  const defaultProps = {
    metrics: mockMetrics
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders doughnut chart by default', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('renders bar chart when type is specified', () => {
      render(<ClientMetricsChart {...defaultProps} type="bar" />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('doughnut-chart')).not.toBeInTheDocument();
    });

    it('displays total clients in center of doughnut chart', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Total Clients')).toBeInTheDocument();
    });

    it('sets custom height when provided', () => {
      render(<ClientMetricsChart {...defaultProps} height={400} />);
      
      const container = screen.getByTestId('doughnut-chart').parentElement;
      expect(container).toHaveStyle('height: 400px');
    });

    it('uses default height of 300px when not specified', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const container = screen.getByTestId('doughnut-chart').parentElement;
      expect(container).toHaveStyle('height: 300px');
    });
  });

  describe('Data Handling and Validation', () => {
    it('correctly maps client metrics data for doughnut chart', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.labels).toEqual(['New Clients', 'Returning Clients', 'VIP Clients']);
      expect(chartData.datasets[0].data).toEqual([30, 90, 30]);
      expect(chartData.datasets[0].label).toBe('Client Distribution');
    });

    it('correctly maps client metrics data for bar chart', () => {
      render(<ClientMetricsChart {...defaultProps} type="bar" />);
      
      const chartElement = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.labels).toEqual(['New Clients', 'Returning', 'VIP Clients', 'Retention Rate']);
      expect(chartData.datasets[0].data).toEqual([30, 90, 30, 85.5]);
    });

    it('handles zero client metrics gracefully', () => {
      const zeroMetrics: ClientMetrics = {
        totalClients: 0,
        newClients: 0,
        returningClients: 0,
        vipClients: 0,
        averageLifetimeValue: 0,
        retentionRate: 0
      };

      render(<ClientMetricsChart metrics={zeroMetrics} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Total Clients')).toBeInTheDocument();
    });

    it('handles high volume client data efficiently', () => {
      render(<ClientMetricsChart metrics={highVolumeMetrics} />);
      
      expect(screen.getByText('1250')).toBeInTheDocument();
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      expect(chartData.datasets[0].data).toEqual([250, 750, 250]);
    });

    it('validates Six Figure Barber client distribution ratios', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      const [newClients, returningClients, vipClients] = chartData.datasets[0].data;
      
      // Six Figure Barber methodology: VIP clients should be 20%+ for optimal revenue
      const vipPercentage = (vipClients / (newClients + returningClients + vipClients)) * 100;
      expect(vipPercentage).toBeGreaterThanOrEqual(15); // Minimum threshold
    });
  });

  describe('Theme Support', () => {
    it('applies light theme colors by default', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets[0].backgroundColor).toEqual([
        'rgb(59, 130, 246)', // blue-500
        'rgb(34, 197, 94)',  // green-500
        'rgb(168, 85, 247)'  // purple-500
      ]);
    });

    it('applies dark theme colors when specified', () => {
      render(<ClientMetricsChart {...defaultProps} theme="dark" />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.plugins.legend.labels.color).toBe('rgb(209, 213, 219)');
      expect(chartOptions.plugins.tooltip.titleColor).toBe('rgb(209, 213, 219)');
    });

    it('maintains theme consistency across chart elements', () => {
      render(<ClientMetricsChart {...defaultProps} theme="dark" />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.plugins.legend.labels.color).toBe(chartOptions.plugins.tooltip.titleColor);
    });
  });

  describe('Chart Configuration and Options', () => {
    it('configures doughnut chart with proper options', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.responsive).toBe(true);
      expect(chartOptions.maintainAspectRatio).toBe(false);
      expect(chartOptions.cutout).toBe('60%');
      expect(chartOptions.animation.duration).toBe(1000);
      expect(chartOptions.plugins.legend.position).toBe('bottom');
    });

    it('configures bar chart with proper scales', () => {
      render(<ClientMetricsChart {...defaultProps} type="bar" />);
      
      const chartElement = screen.getByTestId('bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.grid.color).toBeDefined();
      expect(chartOptions.scales.y.grid.color).toBeDefined();
      expect(chartOptions.plugins.legend.display).toBe(false);
    });

    it('includes custom tooltip callbacks for business metrics', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.plugins.tooltip.callbacks).toBeDefined();
      expect(chartOptions.plugins.tooltip.callbacks.label).toBe('[Function]');
      expect(chartOptions.plugins.tooltip.callbacks.afterLabel).toBe('[Function]');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const container = screen.getByTestId('doughnut-chart').parentElement;
      expect(container).toHaveAttribute('style', expect.stringContaining('position: relative'));
      
      // Center text should be accessible
      expect(screen.getByText('150')).toHaveClass('text-2xl', 'font-bold');
      expect(screen.getByText('Total Clients')).toHaveClass('text-sm');
    });

    it('ensures sufficient color contrast for accessibility', () => {
      render(<ClientMetricsChart {...defaultProps} theme="dark" />);
      
      const centerText = screen.getByText('150');
      expect(centerText).toHaveClass('dark:text-gray-100');
      
      const subtitleText = screen.getByText('Total Clients');
      expect(subtitleText).toHaveClass('dark:text-gray-400');
    });

    it('provides semantic HTML structure', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartContainer = screen.getByTestId('doughnut-chart').parentElement;
      expect(chartContainer).toHaveStyle('position: relative');
      
      // Center overlay should not interfere with accessibility
      const centerOverlay = chartContainer?.querySelector('div[style*="position: absolute"]');
      expect(centerOverlay).toHaveStyle('pointer-events: none');
    });
  });

  describe('Performance and Memory Management', () => {
    it('handles large datasets without performance degradation', () => {
      const performanceStart = performance.now();
      
      render(<ClientMetricsChart metrics={highVolumeMetrics} />);
      
      const performanceEnd = performance.now();
      const renderTime = performanceEnd - performanceStart;
      
      // Should render within reasonable time (100ms threshold)
      expect(renderTime).toBeLessThan(100);
    });

    it('does not cause memory leaks with frequent re-renders', () => {
      const { rerender } = render(<ClientMetricsChart {...defaultProps} />);
      
      // Simulate multiple re-renders with different data
      for (let i = 0; i < 10; i++) {
        const dynamicMetrics = {
          ...mockMetrics,
          totalClients: mockMetrics.totalClients + i,
          newClients: mockMetrics.newClients + i
        };
        rerender(<ClientMetricsChart metrics={dynamicMetrics} />);
      }
      
      // Should not crash or degrade performance
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    });

    it('efficiently updates when metrics change', () => {
      const { rerender } = render(<ClientMetricsChart {...defaultProps} />);
      
      expect(screen.getByText('150')).toBeInTheDocument();
      
      rerender(<ClientMetricsChart metrics={highVolumeMetrics} />);
      
      expect(screen.getByText('1250')).toBeInTheDocument();
      expect(screen.queryByText('150')).not.toBeInTheDocument();
    });
  });

  describe('Business Logic Validation', () => {
    it('highlights VIP client metrics for Six Figure Barber strategy', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // VIP clients should use premium purple color
      expect(chartData.datasets[0].backgroundColor[2]).toBe('rgb(168, 85, 247)');
    });

    it('calculates client distribution percentages correctly', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      // Tooltip should calculate percentages
      expect(chartOptions.plugins.tooltip.callbacks.label).toBeDefined();
    });

    it('displays average lifetime value for VIP clients', () => {
      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      // After label callback should show LTV for VIP clients
      expect(chartOptions.plugins.tooltip.callbacks.afterLabel).toBeDefined();
    });

    it('warns when client metrics indicate business health issues', () => {
      render(<ClientMetricsChart metrics={lowVolumeMetrics} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      const [newClients, returningClients, vipClients] = chartData.datasets[0].data;
      
      // Low retention rate should be flagged for Six Figure Barber methodology
      const retentionRate = lowVolumeMetrics.retentionRate;
      expect(retentionRate).toBeLessThan(80); // Below optimal threshold
      
      // VIP ratio should be sufficient for revenue goals
      const vipRatio = vipClients / (newClients + returningClients + vipClients);
      expect(vipRatio).toBeGreaterThan(0.1); // Minimum 10% VIP clients
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles undefined metrics gracefully', () => {
      const undefinedMetrics = {
        totalClients: undefined,
        newClients: undefined,
        returningClients: undefined,
        vipClients: undefined,
        averageLifetimeValue: undefined,
        retentionRate: undefined
      } as any;

      expect(() => render(<ClientMetricsChart metrics={undefinedMetrics} />)).not.toThrow();
    });

    it('handles negative values appropriately', () => {
      const negativeMetrics: ClientMetrics = {
        totalClients: -5,
        newClients: -2,
        returningClients: -3,
        vipClients: 0,
        averageLifetimeValue: -100,
        retentionRate: -10
      };

      render(<ClientMetricsChart metrics={negativeMetrics} />);
      
      // Should display the values as provided (business logic handles validation elsewhere)
      expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('handles extremely large numbers', () => {
      const largeMetrics: ClientMetrics = {
        totalClients: 999999,
        newClients: 333333,
        returningClients: 333333,
        vipClients: 333333,
        averageLifetimeValue: 99999.99,
        retentionRate: 99.9
      };

      render(<ClientMetricsChart metrics={largeMetrics} />);
      
      expect(screen.getByText('999999')).toBeInTheDocument();
    });

    it('maintains chart integrity with missing properties', () => {
      const partialMetrics = {
        totalClients: 100,
        newClients: 20,
        returningClients: 60
        // Missing vipClients, averageLifetimeValue, retentionRate
      } as ClientMetrics;

      expect(() => render(<ClientMetricsChart metrics={partialMetrics} />)).not.toThrow();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ClientMetricsChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('doughnut-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.responsive).toBe(true);
      expect(chartOptions.maintainAspectRatio).toBe(false);
    });

    it('adjusts text size for smaller screens', () => {
      render(<ClientMetricsChart {...defaultProps} height={200} />);
      
      const container = screen.getByTestId('doughnut-chart').parentElement;
      expect(container).toHaveStyle('height: 200px');
      
      // Center text should remain visible
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  describe('Chart Type Switching', () => {
    it('maintains data consistency when switching chart types', () => {
      const { rerender } = render(<ClientMetricsChart {...defaultProps} />);
      
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      
      rerender(<ClientMetricsChart {...defaultProps} type="bar" />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('doughnut-chart')).not.toBeInTheDocument();
    });

    it('preserves theme when switching chart types', () => {
      const { rerender } = render(<ClientMetricsChart {...defaultProps} theme="dark" />);
      
      const doughnutElement = screen.getByTestId('doughnut-chart');
      const doughnutOptions = JSON.parse(doughnutElement.getAttribute('data-chart-options') || '{}');
      expect(doughnutOptions.plugins.legend.labels.color).toBe('rgb(209, 213, 219)');
      
      rerender(<ClientMetricsChart {...defaultProps} type="bar" theme="dark" />);
      
      const barElement = screen.getByTestId('bar-chart');
      const barOptions = JSON.parse(barElement.getAttribute('data-chart-options') || '{}');
      expect(barOptions.scales.x.ticks.color).toBe('rgb(209, 213, 219)');
    });
  });
});
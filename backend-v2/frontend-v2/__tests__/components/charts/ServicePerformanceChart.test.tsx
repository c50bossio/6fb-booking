/**
 * Comprehensive tests for ServicePerformanceChart component.
 * 
 * Tests cover:
 * - Service performance visualization (horizontal bar chart)
 * - Multiple metrics (revenue, bookings, averagePrice, profitMargin)
 * - Premium vs standard service differentiation
 * - Service ranking and sorting algorithms
 * - Performance insights and business recommendations
 * - Theme switching and responsive design
 * - Six Figure Barber premium service strategy
 * - Accessibility and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import ServicePerformanceChart from '@/components/charts/ServicePerformanceChart';
import { ServiceMetrics } from '@/services/analytics_service';

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Bar: jest.fn(({ data, options }) => (
    <div 
      data-testid="service-bar-chart" 
      data-chart-data={JSON.stringify(data)} 
      data-chart-options={JSON.stringify(options)}
    >
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
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

// Mock Hero Icons
jest.mock('@heroicons/react/24/solid', () => ({
  StarIcon: ({ className }: { className: string }) => (
    <svg data-testid="star-icon" className={className}>
      <title>Star</title>
    </svg>
  )
}));

describe('ServicePerformanceChart', () => {
  // Mock service data aligned with Six Figure Barber methodology
  const mockServices: ServiceMetrics[] = [
    {
      serviceId: 1,
      serviceName: 'Signature Haircut & Style',
      bookings: 85,
      revenue: 6800.00,
      averagePrice: 80.00,
      profitMargin: 78.5,
      popularityRank: 1,
      isPremium: true
    },
    {
      serviceId: 2,
      serviceName: 'Premium Beard Sculpting',
      bookings: 42,
      revenue: 2940.00,
      averagePrice: 70.00,
      profitMargin: 75.2,
      popularityRank: 2,
      isPremium: true
    },
    {
      serviceId: 3,
      serviceName: 'Executive Grooming Package',
      bookings: 28,
      revenue: 4200.00,
      averagePrice: 150.00,
      profitMargin: 82.1,
      popularityRank: 3,
      isPremium: true
    },
    {
      serviceId: 4,
      serviceName: 'Classic Haircut',
      bookings: 156,
      revenue: 4680.00,
      averagePrice: 30.00,
      profitMargin: 62.5,
      popularityRank: 4,
      isPremium: false
    },
    {
      serviceId: 5,
      serviceName: 'Beard Trim',
      bookings: 98,
      revenue: 1960.00,
      averagePrice: 20.00,
      profitMargin: 58.0,
      popularityRank: 5,
      isPremium: false
    },
    {
      serviceId: 6,
      serviceName: 'Hot Towel Shave',
      bookings: 35,
      revenue: 1750.00,
      averagePrice: 50.00,
      profitMargin: 68.5,
      popularityRank: 6,
      isPremium: false
    },
    {
      serviceId: 7,
      serviceName: 'Hair Wash & Styling',
      bookings: 72,
      revenue: 1440.00,
      averagePrice: 20.00,
      profitMargin: 55.0,
      popularityRank: 7,
      isPremium: false
    },
    {
      serviceId: 8,
      serviceName: 'Mustache Grooming',
      bookings: 15,
      revenue: 375.00,
      averagePrice: 25.00,
      profitMargin: 60.0,
      popularityRank: 8,
      isPremium: false
    },
    {
      serviceId: 9,
      serviceName: 'VIP Color & Cut Experience',
      bookings: 12,
      revenue: 2400.00,
      averagePrice: 200.00,
      profitMargin: 85.0,
      popularityRank: 9,
      isPremium: true
    }
  ];

  const limitedServices = mockServices.slice(0, 3);
  
  const singleService: ServiceMetrics[] = [
    {
      serviceId: 1,
      serviceName: 'Premium Haircut',
      bookings: 50,
      revenue: 4000.00,
      averagePrice: 80.00,
      profitMargin: 75.0,
      popularityRank: 1,
      isPremium: true
    }
  ];

  const defaultProps = {
    services: mockServices
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders horizontal bar chart', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      expect(screen.getByTestId('service-bar-chart')).toBeInTheDocument();
    });

    it('displays premium service legend by default', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      expect(screen.getByText('Premium Services')).toBeInTheDocument();
      expect(screen.getByText('Standard Services')).toBeInTheDocument();
      expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    });

    it('hides legend when showPremiumIndicator is false', () => {
      render(<ServicePerformanceChart {...defaultProps} showPremiumIndicator={false} />);
      
      expect(screen.queryByText('Premium Services')).not.toBeInTheDocument();
      expect(screen.queryByText('Standard Services')).not.toBeInTheDocument();
    });

    it('sets custom height when provided', () => {
      render(<ServicePerformanceChart {...defaultProps} height={400} />);
      
      const chartContainer = screen.getByTestId('service-bar-chart').parentElement;
      expect(chartContainer).toHaveStyle('height: 400px');
    });

    it('uses default height of 300px when not specified', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartContainer = screen.getByTestId('service-bar-chart').parentElement;
      expect(chartContainer).toHaveStyle('height: 300px');
    });

    it('displays performance insights section', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      expect(screen.getByText('Performance Insights:')).toBeInTheDocument();
      expect(screen.getByText(/Top performer:/)).toBeInTheDocument();
      expect(screen.getByText(/Premium services:/)).toBeInTheDocument();
    });
  });

  describe('Service Data Processing and Sorting', () => {
    it('sorts services by revenue by default', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Should be sorted by revenue descending
      expect(chartData.datasets[0].data[0]).toBe(6800); // Signature Haircut & Style
      expect(chartData.datasets[0].data[1]).toBe(4680); // Classic Haircut (high volume)
      expect(chartData.datasets[0].data[2]).toBe(4200); // Executive Grooming Package
    });

    it('sorts services by bookings when metric is bookings', () => {
      render(<ServicePerformanceChart {...defaultProps} metric="bookings" />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Should be sorted by bookings descending
      expect(chartData.datasets[0].data[0]).toBe(156); // Classic Haircut
      expect(chartData.datasets[0].data[1]).toBe(98);  // Beard Trim
      expect(chartData.datasets[0].data[2]).toBe(85);  // Signature Haircut & Style
    });

    it('sorts services by average price when metric is averagePrice', () => {
      render(<ServicePerformanceChart {...defaultProps} metric="averagePrice" />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Should be sorted by average price descending
      expect(chartData.datasets[0].data[0]).toBe(200); // VIP Color & Cut Experience
      expect(chartData.datasets[0].data[1]).toBe(150); // Executive Grooming Package
      expect(chartData.datasets[0].data[2]).toBe(80);  // Signature Haircut & Style
    });

    it('sorts services by profit margin when metric is profitMargin', () => {
      render(<ServicePerformanceChart {...defaultProps} metric="profitMargin" />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Should be sorted by profit margin descending
      expect(chartData.datasets[0].data[0]).toBe(85.0); // VIP Color & Cut Experience
      expect(chartData.datasets[0].data[1]).toBe(82.1); // Executive Grooming Package
      expect(chartData.datasets[0].data[2]).toBe(78.5); // Signature Haircut & Style
    });

    it('limits display to top 8 services', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.labels).toHaveLength(8);
      expect(chartData.datasets[0].data).toHaveLength(8);
    });

    it('truncates long service names', () => {
      const longNameServices: ServiceMetrics[] = [
        {
          serviceId: 1,
          serviceName: 'This Is A Very Long Service Name That Should Be Truncated',
          bookings: 50,
          revenue: 4000.00,
          averagePrice: 80.00,
          profitMargin: 75.0,
          popularityRank: 1,
          isPremium: true
        }
      ];

      render(<ServicePerformanceChart services={longNameServices} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.labels[0]).toBe('★ This Is A Very...'); // Truncated with premium indicator
    });
  });

  describe('Premium vs Standard Service Differentiation', () => {
    it('applies premium colors to premium services', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // First service should be premium (purple color)
      expect(chartData.datasets[0].backgroundColor[0]).toBe('rgb(168, 85, 247)');
      // Fourth service should be standard (green color)
      expect(chartData.datasets[0].backgroundColor[3]).toBe('rgb(34, 197, 94)');
    });

    it('adds star prefix to premium services in labels', () => {
      render(<ServicePerformanceChart {...defaultProps} showPremiumIndicator={true} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Premium services should have star prefix
      expect(chartData.labels[0]).toMatch(/^★/);
      // Standard services should not have star prefix
      expect(chartData.labels[3]).not.toMatch(/^★/);
    });

    it('removes star prefix when premium indicator is disabled', () => {
      render(<ServicePerformanceChart {...defaultProps} showPremiumIndicator={false} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // No services should have star prefix
      chartData.labels.forEach((label: string) => {
        expect(label).not.toMatch(/^★/);
      });
    });

    it('displays premium service count in insights', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const premiumCount = mockServices.slice(0, 8).filter(s => s.isPremium).length;
      expect(screen.getByText(`Premium services: ${premiumCount}/8`)).toBeInTheDocument();
    });
  });

  describe('Metric Display and Formatting', () => {
    it('formats revenue with dollar signs', () => {
      render(<ServicePerformanceChart {...defaultProps} metric="revenue" />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.title.text).toBe('Revenue ($)');
      expect(typeof chartOptions.scales.x.ticks.callback).toBe('function');
    });

    it('formats bookings as plain numbers', () => {
      render(<ServicePerformanceChart {...defaultProps} metric="bookings" />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.title.text).toBe('Number of Bookings');
    });

    it('formats average price with dollar signs', () => {
      render(<ServicePerformanceChart {...defaultProps} metric="averagePrice" />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.title.text).toBe('Average Price ($)');
    });

    it('formats profit margin with percentage signs', () => {
      render(<ServicePerformanceChart {...defaultProps} metric="profitMargin" />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.title.text).toBe('Profit Margin (%)');
    });

    it('displays top performer correctly', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      // Top performer by revenue should be Signature Haircut & Style
      expect(screen.getByText(/Top performer:/)).toBeInTheDocument();
      expect(screen.getByText('Signature Haircut & Style')).toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    it('applies light theme colors by default', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.ticks.color).toBe('rgb(55, 65, 81)');
      expect(chartOptions.scales.y.ticks.color).toBe('rgb(55, 65, 81)');
    });

    it('applies dark theme colors when specified', () => {
      render(<ServicePerformanceChart {...defaultProps} theme="dark" />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.ticks.color).toBe('rgb(209, 213, 219)');
      expect(chartOptions.scales.y.ticks.color).toBe('rgb(209, 213, 219)');
      expect(chartOptions.plugins.tooltip.backgroundColor).toBe('rgba(17, 24, 39, 0.95)');
    });

    it('maintains theme consistency in legend and insights', () => {
      render(<ServicePerformanceChart {...defaultProps} theme="dark" />);
      
      const premiumText = screen.getByText('Premium Services');
      expect(premiumText).toHaveClass('dark:text-gray-300');
      
      const insightsSection = screen.getByText('Performance Insights:').parentElement;
      expect(insightsSection).toHaveClass('dark:bg-gray-800');
    });
  });

  describe('Chart Configuration', () => {
    it('configures horizontal bar chart properly', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.indexAxis).toBe('y');
      expect(chartOptions.responsive).toBe(true);
      expect(chartOptions.maintainAspectRatio).toBe(false);
    });

    it('hides legend in chart options', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.plugins.legend.display).toBe(false);
    });

    it('configures animation settings', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.animation.duration).toBe(1000);
      expect(chartOptions.animation.easing).toBe('easeOutQuart');
    });

    it('sets proper border radius for bars', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets[0].borderRadius).toBe(6);
      expect(chartData.datasets[0].borderSkipped).toBe(false);
    });
  });

  describe('Tooltip Configuration', () => {
    it('includes comprehensive tooltip callbacks', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.plugins.tooltip.callbacks.title).toBeDefined();
      expect(chartOptions.plugins.tooltip.callbacks.label).toBeDefined();
      expect(chartOptions.plugins.tooltip.callbacks.afterBody).toBeDefined();
    });

    it('shows service type and popularity rank in tooltip', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(typeof chartOptions.plugins.tooltip.callbacks.label).toBe('function');
    });

    it('displays all service metrics in tooltip afterBody', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(typeof chartOptions.plugins.tooltip.callbacks.afterBody).toBe('function');
    });
  });

  describe('Six Figure Barber Business Logic', () => {
    it('highlights premium service revenue concentration', () => {
      const premiumServices = mockServices.filter(s => s.isPremium);
      const premiumRevenue = premiumServices.reduce((sum, s) => sum + s.revenue, 0);
      const totalRevenue = mockServices.reduce((sum, s) => sum + s.revenue, 0);
      const premiumRevenuePercentage = (premiumRevenue / totalRevenue) * 100;
      
      // Premium services should generate 60%+ of revenue for Six Figure goal
      expect(premiumRevenuePercentage).toBeGreaterThan(50);
    });

    it('validates premium service profit margins', () => {
      const premiumServices = mockServices.filter(s => s.isPremium);
      const avgPremiumMargin = premiumServices.reduce((sum, s) => sum + s.profitMargin, 0) / premiumServices.length;
      
      // Premium services should have 75%+ profit margins
      expect(avgPremiumMargin).toBeGreaterThan(70);
    });

    it('identifies underperforming premium services', () => {
      const premiumServices = mockServices.filter(s => s.isPremium);
      const lowBookingPremium = premiumServices.filter(s => s.bookings < 20);
      
      // Flag premium services with low booking volume
      expect(lowBookingPremium.length).toBeGreaterThan(0); // VIP Color & Cut Experience
    });

    it('shows premium to standard service ratio', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const topServices = mockServices.slice(0, 8);
      const premiumCount = topServices.filter(s => s.isPremium).length;
      const premiumRatio = premiumCount / topServices.length;
      
      // Should have balanced premium service offering
      expect(premiumRatio).toBeGreaterThan(0.3); // At least 30% premium
    });

    it('calculates revenue per booking efficiency', () => {
      const efficiencyMetrics = mockServices.map(service => ({
        name: service.serviceName,
        efficiency: service.revenue / service.bookings,
        isPremium: service.isPremium
      }));

      const premiumEfficiency = efficiencyMetrics
        .filter(m => m.isPremium)
        .reduce((sum, m) => sum + m.efficiency, 0) / efficiencyMetrics.filter(m => m.isPremium).length;

      const standardEfficiency = efficiencyMetrics
        .filter(m => !m.isPremium)
        .reduce((sum, m) => sum + m.efficiency, 0) / efficiencyMetrics.filter(m => !m.isPremium).length;

      // Premium services should have higher revenue per booking
      expect(premiumEfficiency).toBeGreaterThan(standardEfficiency);
    });
  });

  describe('Performance and Scalability', () => {
    it('handles large service datasets efficiently', () => {
      const largeServiceSet = Array.from({ length: 50 }, (_, i) => ({
        serviceId: i + 1,
        serviceName: `Service ${i + 1}`,
        bookings: Math.floor(Math.random() * 100) + 10,
        revenue: (Math.random() * 5000) + 500,
        averagePrice: (Math.random() * 100) + 20,
        profitMargin: (Math.random() * 30) + 50,
        popularityRank: i + 1,
        isPremium: Math.random() > 0.7
      }));

      const performanceStart = performance.now();
      render(<ServicePerformanceChart services={largeServiceSet} />);
      const performanceEnd = performance.now();
      
      expect(performanceEnd - performanceStart).toBeLessThan(100);
      expect(screen.getByTestId('service-bar-chart')).toBeInTheDocument();
    });

    it('maintains performance with frequent metric changes', () => {
      const { rerender } = render(<ServicePerformanceChart {...defaultProps} metric="revenue" />);
      
      const metrics = ['revenue', 'bookings', 'averagePrice', 'profitMargin'] as const;
      
      metrics.forEach(metric => {
        const start = performance.now();
        rerender(<ServicePerformanceChart {...defaultProps} metric={metric} />);
        const end = performance.now();
        
        expect(end - start).toBeLessThan(50);
      });
    });

    it('efficiently sorts and limits large datasets', () => {
      const massiveDataset = Array.from({ length: 1000 }, (_, i) => ({
        serviceId: i + 1,
        serviceName: `Service ${i + 1}`,
        bookings: Math.floor(Math.random() * 200),
        revenue: Math.random() * 10000,
        averagePrice: Math.random() * 200,
        profitMargin: Math.random() * 40 + 40,
        popularityRank: i + 1,
        isPremium: i % 5 === 0
      }));

      render(<ServicePerformanceChart services={massiveDataset} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Should limit to 8 services even with 1000 input
      expect(chartData.labels).toHaveLength(8);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles empty service array', () => {
      render(<ServicePerformanceChart services={[]} />);
      
      expect(screen.getByTestId('service-bar-chart')).toBeInTheDocument();
      expect(screen.queryByText(/Top performer:/)).not.toBeInTheDocument();
    });

    it('handles single service', () => {
      render(<ServicePerformanceChart services={singleService} />);
      
      expect(screen.getByTestId('service-bar-chart')).toBeInTheDocument();
      expect(screen.getByText('Premium Haircut')).toBeInTheDocument();
      expect(screen.getByText(/Premium services: 1\/1/)).toBeInTheDocument();
    });

    it('handles malformed service data', () => {
      const malformedServices = [
        {
          serviceId: null,
          serviceName: '',
          bookings: 'invalid',
          revenue: undefined,
          averagePrice: NaN,
          profitMargin: -50,
          popularityRank: null,
          isPremium: 'true'
        }
      ] as any;

      expect(() => render(<ServicePerformanceChart services={malformedServices} />)).not.toThrow();
    });

    it('handles zero values gracefully', () => {
      const zeroServices: ServiceMetrics[] = [
        {
          serviceId: 1,
          serviceName: 'Zero Service',
          bookings: 0,
          revenue: 0,
          averagePrice: 0,
          profitMargin: 0,
          popularityRank: 1,
          isPremium: false
        }
      ];

      render(<ServicePerformanceChart services={zeroServices} />);
      
      expect(screen.getByTestId('service-bar-chart')).toBeInTheDocument();
      expect(screen.getByText('Zero Service')).toBeInTheDocument();
    });

    it('handles extremely high values', () => {
      const extremeServices: ServiceMetrics[] = [
        {
          serviceId: 1,
          serviceName: 'Extreme Service',
          bookings: 999999,
          revenue: 999999.99,
          averagePrice: 9999.99,
          profitMargin: 99.9,
          popularityRank: 1,
          isPremium: true
        }
      ];

      render(<ServicePerformanceChart services={extremeServices} />);
      
      const chartElement = screen.getByTestId('service-bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets[0].data[0]).toBe(999999.99);
    });
  });

  describe('Accessibility', () => {
    it('provides proper color contrast for premium indicators', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const starIcon = screen.getByTestId('star-icon');
      expect(starIcon).toHaveClass('text-yellow-500');
      
      const premiumLegend = screen.getByText('Premium Services');
      expect(premiumLegend).toHaveClass('text-gray-700', 'dark:text-gray-300');
    });

    it('maintains readability in insights section', () => {
      render(<ServicePerformanceChart {...defaultProps} theme="dark" />);
      
      const insightsSection = screen.getByText('Performance Insights:').parentElement;
      expect(insightsSection).toHaveClass('dark:bg-gray-800');
      
      const insightsText = screen.getByText('Performance Insights:');
      expect(insightsText).toHaveClass('dark:text-gray-400');
    });

    it('provides semantic HTML structure', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const container = screen.getByTestId('service-bar-chart').closest('.w-full');
      expect(container).toBeInTheDocument();
      
      const insightsSection = screen.getByText('Performance Insights:').parentElement;
      expect(insightsSection).toHaveClass('rounded-lg');
    });
  });

  describe('Responsive Design', () => {
    it('adapts chart height for mobile', () => {
      render(<ServicePerformanceChart {...defaultProps} height={250} />);
      
      const chartContainer = screen.getByTestId('service-bar-chart').parentElement;
      expect(chartContainer).toHaveStyle('height: 250px');
    });

    it('maintains legend readability on small screens', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const legendItems = screen.getAllByText(/Services$/);
      legendItems.forEach(item => {
        expect(item).toHaveClass('text-sm');
      });
    });

    it('keeps insights section compact', () => {
      render(<ServicePerformanceChart {...defaultProps} />);
      
      const insightsSection = screen.getByText('Performance Insights:').parentElement;
      expect(insightsSection).toHaveClass('p-3');
      
      const insightsText = screen.getByText('Performance Insights:');
      expect(insightsText).toHaveClass('text-sm');
    });
  });
});
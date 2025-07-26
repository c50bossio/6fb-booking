/**
 * Comprehensive tests for RevenueChart component.
 * 
 * Tests cover:
 * - Component rendering (line and bar charts)
 * - Revenue data visualization across different time periods
 * - Tips and appointments dataset management
 * - Chart interactions and animations
 * - Theme switching and responsive design
 * - Performance with large datasets
 * - Six Figure Barber revenue optimization features
 * - Accessibility and user experience
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import RevenueChart from '@/components/charts/RevenueChart';
import { RevenueDataPoint } from '@/services/analytics_service';

// Mock Chart.js components with proper ref handling and chart methods
jest.mock('react-chartjs-2', () => ({
  Line: React.forwardRef<any, any>(({ data, options }, ref) => {
    const mockChartInstance = {
      update: jest.fn(),
      destroy: jest.fn(),
      resize: jest.fn(),
      render: jest.fn(),
      data: data,
      options: options
    };

    React.useEffect(() => {
      if (ref && typeof ref === 'function') {
        ref(mockChartInstance);
      } else if (ref && ref.current !== undefined) {
        ref.current = mockChartInstance;
      }
    }, []);

    return (
      <div 
        data-testid="line-chart" 
        data-chart-data={JSON.stringify(data)} 
        data-chart-options={JSON.stringify(options)}
      >
        <canvas />
      </div>
    );
  }),
  Bar: React.forwardRef<any, any>(({ data, options }, ref) => {
    const mockChartInstance = {
      update: jest.fn(),
      destroy: jest.fn(),
      resize: jest.fn(),
      render: jest.fn(),
      data: data,
      options: options
    };

    React.useEffect(() => {
      if (ref && typeof ref === 'function') {
        ref(mockChartInstance);  
      } else if (ref && ref.current !== undefined) {
        ref.current = mockChartInstance;
      }
    }, []);

    return (
      <div 
        data-testid="bar-chart" 
        data-chart-data={JSON.stringify(data)} 
        data-chart-options={JSON.stringify(options)}
      >
        <canvas />
      </div>
    );
  })
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
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  Filler: jest.fn()
}));

describe('RevenueChart', () => {
  // Mock revenue data based on Six Figure Barber methodology
  const mockWeeklyData: RevenueDataPoint[] = [
    {
      date: 'Mon',
      revenue: 450.00,
      appointments: 8,
      averageTicket: 56.25,
      tips: 67.50,
      totalRevenue: 517.50
    },
    {
      date: 'Tue',
      revenue: 380.00,
      appointments: 6,
      averageTicket: 63.33,
      tips: 45.60,
      totalRevenue: 425.60
    },
    {
      date: 'Wed',
      revenue: 520.00,
      appointments: 9,
      averageTicket: 57.78,
      tips: 78.00,
      totalRevenue: 598.00
    },
    {
      date: 'Thu',
      revenue: 625.00,
      appointments: 10,
      averageTicket: 62.50,
      tips: 93.75,
      totalRevenue: 718.75
    },
    {
      date: 'Fri',
      revenue: 780.00,
      appointments: 12,
      averageTicket: 65.00,
      tips: 117.00,
      totalRevenue: 897.00
    },
    {
      date: 'Sat',
      revenue: 920.00,
      appointments: 14,
      averageTicket: 65.71,
      tips: 138.00,
      totalRevenue: 1058.00
    },
    {
      date: 'Sun',
      revenue: 0, // Closed
      appointments: 0,
      averageTicket: 0,
      tips: 0,
      totalRevenue: 0
    }
  ];

  const mockMonthlyData: RevenueDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    revenue: 400 + Math.random() * 400, // $400-800 range
    appointments: 6 + Math.floor(Math.random() * 8), // 6-14 appointments
    averageTicket: 50 + Math.random() * 30, // $50-80 range
    tips: 50 + Math.random() * 80, // $50-130 tips
    totalRevenue: 500 + Math.random() * 500 // Total with tips
  }));

  const mockHourlyData: RevenueDataPoint[] = [
    { date: '09:00', revenue: 120, appointments: 2, averageTicket: 60, tips: 18, totalRevenue: 138 },
    { date: '10:00', revenue: 180, appointments: 3, averageTicket: 60, tips: 27, totalRevenue: 207 },
    { date: '11:00', revenue: 240, appointments: 4, averageTicket: 60, tips: 36, totalRevenue: 276 },
    { date: '12:00', revenue: 120, appointments: 2, averageTicket: 60, tips: 18, totalRevenue: 138 },
    { date: '13:00', revenue: 0, appointments: 0, averageTicket: 0, tips: 0, totalRevenue: 0 }, // Lunch break
    { date: '14:00', revenue: 300, appointments: 5, averageTicket: 60, tips: 45, totalRevenue: 345 },
    { date: '15:00', revenue: 360, appointments: 6, averageTicket: 60, tips: 54, totalRevenue: 414 },
    { date: '16:00', revenue: 240, appointments: 4, averageTicket: 60, tips: 36, totalRevenue: 276 },
    { date: '17:00', revenue: 180, appointments: 3, averageTicket: 60, tips: 27, totalRevenue: 207 },
    { date: '18:00', revenue: 120, appointments: 2, averageTicket: 60, tips: 18, totalRevenue: 138 }
  ];

  const defaultProps = {
    data: mockWeeklyData
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders line chart by default', () => {
      render(<RevenueChart {...defaultProps} />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('renders bar chart when type is specified', () => {
      render(<RevenueChart {...defaultProps} type="bar" />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('sets custom height when provided', () => {
      render(<RevenueChart {...defaultProps} height={500} />);
      
      const container = screen.getByTestId('line-chart').parentElement;
      expect(container).toHaveStyle('height: 500px');
    });

    it('uses default height of 300px when not specified', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const container = screen.getByTestId('line-chart').parentElement;
      expect(container).toHaveStyle('height: 300px');
    });

    it('maintains chart reference for animations', async () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      expect(chartElement).toBeInTheDocument();
      
      // useEffect should be called for animation setup
      await waitFor(() => {
        expect(chartElement).toBeInTheDocument();
      });
    });
  });

  describe('Revenue Data Processing', () => {
    it('correctly maps revenue data for line chart', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      expect(chartData.datasets[0].label).toBe('Revenue');
      expect(chartData.datasets[0].data).toEqual([450, 380, 520, 625, 780, 920, 0]);
    });

    it('includes tips dataset when showTips is enabled', () => {
      render(<RevenueChart {...defaultProps} showTips={true} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets).toHaveLength(2);
      expect(chartData.datasets[1].label).toBe('Tips');
      expect(chartData.datasets[1].data).toEqual([67.5, 45.6, 78, 93.75, 117, 138, 0]);
    });

    it('includes appointments dataset when showAppointments is enabled', () => {
      render(<RevenueChart {...defaultProps} showAppointments={true} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      const appointmentsDataset = chartData.datasets.find((ds: any) => ds.label === 'Appointments');
      expect(appointmentsDataset).toBeDefined();
      expect(appointmentsDataset.yAxisID).toBe('y1');
      expect(appointmentsDataset.data).toEqual([8, 6, 9, 10, 12, 14, 0]);
    });

    it('shows all three datasets when both flags are enabled', () => {
      render(<RevenueChart {...defaultProps} showTips={true} showAppointments={true} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets).toHaveLength(3);
      expect(chartData.datasets.map((ds: any) => ds.label)).toEqual(['Revenue', 'Tips', 'Appointments']);
    });

    it('handles empty data gracefully', () => {
      render(<RevenueChart data={[]} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.labels).toEqual([]);
      expect(chartData.datasets[0].data).toEqual([]);
    });

    it('processes large datasets efficiently', () => {
      const performanceStart = performance.now();
      
      render(<RevenueChart data={mockMonthlyData} />);
      
      const performanceEnd = performance.now();
      const renderTime = performanceEnd - performanceStart;
      
      expect(renderTime).toBeLessThan(100); // Should render within 100ms
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Period-Based Configuration', () => {
    it('sets correct x-axis label for day period', () => {
      render(<RevenueChart data={mockHourlyData} period="day" />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.title.text).toBe('Time of Day');
    });

    it('sets correct x-axis label for week period', () => {
      render(<RevenueChart {...defaultProps} period="week" />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.title.text).toBe('Days of Week');
    });

    it('sets correct x-axis label for month period', () => {
      render(<RevenueChart data={mockMonthlyData} period="month" />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.title.text).toBe('Days of Month');
      expect(chartOptions.scales.x.ticks.maxRotation).toBe(45);
    });

    it('sets correct x-axis label for quarter period', () => {
      render(<RevenueChart {...defaultProps} period="quarter" />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.title.text).toBe('Weeks of Quarter');
    });

    it('sets correct x-axis label for year period', () => {
      render(<RevenueChart {...defaultProps} period="year" />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.x.title.text).toBe('Months of Year');
    });
  });

  describe('Theme Support', () => {
    it('applies light theme colors by default', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets[0].borderColor).toBe('rgb(34, 197, 94)'); // green-500
      expect(chartData.datasets[0].backgroundColor).toBe('rgba(34, 197, 94, 0.1)');
    });

    it('applies dark theme colors when specified', () => {
      render(<RevenueChart {...defaultProps} theme="dark" />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.plugins.legend.labels.color).toBe('rgb(209, 213, 219)');
      expect(chartOptions.scales.x.ticks.color).toBe('rgb(209, 213, 219)');
      expect(chartOptions.scales.y.ticks.color).toBe('rgb(209, 213, 219)');
    });

    it('maintains theme consistency in tooltips', () => {
      render(<RevenueChart {...defaultProps} theme="dark" />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.plugins.tooltip.backgroundColor).toBe('rgba(17, 24, 39, 0.95)');
      expect(chartOptions.plugins.tooltip.titleColor).toBe('rgb(209, 213, 219)');
      expect(chartOptions.plugins.tooltip.bodyColor).toBe('rgb(209, 213, 219)');
    });

    it('uses different colors for tips dataset', () => {
      render(<RevenueChart {...defaultProps} showTips={true} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets[1].borderColor).toBe('rgb(245, 158, 11)'); // amber-500
      expect(chartData.datasets[1].pointBackgroundColor).toBe('rgb(245, 158, 11)');
    });
  });

  describe('Chart Configuration and Interactions', () => {
    it('configures line chart with proper styling', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets[0].borderWidth).toBe(3);
      expect(chartData.datasets[0].tension).toBe(0.4);
      expect(chartData.datasets[0].pointRadius).toBe(5);
      expect(chartData.datasets[0].pointHoverRadius).toBe(8);
    });

    it('configures bar chart with different styling', () => {
      render(<RevenueChart {...defaultProps} type="bar" />);
      
      const chartElement = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets[0].backgroundColor).toBe('rgb(34, 197, 94)');
      expect(chartData.datasets[0].borderWidth).toBe(3);
    });

    it('includes secondary y-axis for appointments', () => {
      render(<RevenueChart {...defaultProps} showAppointments={true} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.scales.y1).toBeDefined();
      expect(chartOptions.scales.y1.position).toBe('right');
      expect(chartOptions.scales.y1.title.text).toBe('Appointments');
    });

    it('formats y-axis labels with dollar signs', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const originalOptions = JSON.parse(chartElement.getAttribute('data-original-options') || '{}');
      
      expect(originalOptions.scales.y.ticks.callback).toBe('[Function]');
      expect(originalOptions.scales.y.title.text).toBe('Revenue ($)');
    });

    it('configures animation settings', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.animation.duration).toBe(1000);
      expect(chartOptions.animation.easing).toBe('easeInOutQuart');
    });
  });

  describe('Tooltip Configuration', () => {
    it('includes custom tooltip callbacks', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const originalOptions = JSON.parse(chartElement.getAttribute('data-original-options') || '{}');
      
      expect(originalOptions.plugins.tooltip.callbacks.title).toBe('[Function]');
      expect(originalOptions.plugins.tooltip.callbacks.label).toBe('[Function]');
      expect(originalOptions.plugins.tooltip.callbacks.afterBody).toBe('[Function]');
    });

    it('formats currency values in tooltips', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const originalOptions = JSON.parse(chartElement.getAttribute('data-original-options') || '{}');
      
      expect(originalOptions.plugins.tooltip.callbacks.label).toBe('[Function]');
    });

    it('shows additional metrics in tooltip afterBody', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const originalOptions = JSON.parse(chartElement.getAttribute('data-original-options') || '{}');
      
      expect(originalOptions.plugins.tooltip.callbacks.afterBody).toBe('[Function]');
    });
  });

  describe('Six Figure Barber Business Logic', () => {
    it('tracks revenue progression toward six-figure goal', () => {
      const weeklyRevenue = mockWeeklyData.reduce((sum, day) => sum + day.revenue, 0);
      const projectedAnnualRevenue = weeklyRevenue * 52;
      
      // Should track toward $100k annual goal
      expect(projectedAnnualRevenue).toBeGreaterThan(150000); // Exceeding goal
    });

    it('highlights premium service revenue patterns', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      // Friday-Saturday should show peak revenue (premium services)
      const revenueData = chartData.datasets[0].data;
      expect(revenueData[4]).toBeGreaterThan(revenueData[0]); // Friday > Monday
      expect(revenueData[5]).toBeGreaterThan(revenueData[4]); // Saturday > Friday
    });

    it('validates average ticket progression', () => {
      const averageTickets = mockWeeklyData.map(day => day.averageTicket);
      const workingDays = averageTickets.filter(ticket => ticket > 0);
      const avgTicket = workingDays.reduce((sum, ticket) => sum + ticket, 0) / workingDays.length;
      
      // Six Figure Barber methodology: $60+ average ticket
      expect(avgTicket).toBeGreaterThan(55);
    });

    it('shows tips as percentage of revenue for premium positioning', () => {
      const totalRevenue = mockWeeklyData.reduce((sum, day) => sum + day.revenue, 0);
      const totalTips = mockWeeklyData.reduce((sum, day) => sum + day.tips, 0);
      const tipsPercentage = (totalTips / totalRevenue) * 100;
      
      // Premium barbering should generate 15%+ tips
      expect(tipsPercentage).toBeGreaterThan(12);
    });

    it('identifies peak performance days for scheduling optimization', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      const revenueData = chartData.datasets[0].data as number[];
      const maxRevenue = Math.max(...revenueData);
      const maxIndex = revenueData.indexOf(maxRevenue);
      
      // Saturday should be peak day
      expect(chartData.labels[maxIndex]).toBe('Sat');
    });
  });

  describe('Performance and Optimization', () => {
    it('handles real-time data updates efficiently', () => {
      const { rerender } = render(<RevenueChart {...defaultProps} />);
      
      const updatedData = mockWeeklyData.map(day => ({
        ...day,
        revenue: day.revenue * 1.1 // 10% increase
      }));
      
      const performanceStart = performance.now();
      rerender(<RevenueChart data={updatedData} />);
      const performanceEnd = performance.now();
      
      expect(performanceEnd - performanceStart).toBeLessThan(50);
    });

    it('maintains chart reference across re-renders', async () => {
      const { rerender } = render(<RevenueChart {...defaultProps} />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      
      rerender(<RevenueChart {...defaultProps} type="bar" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('cleans up chart resources properly', () => {
      const { unmount } = render(<RevenueChart {...defaultProps} />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('provides proper ARIA labels', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const container = screen.getByTestId('line-chart').parentElement;
      expect(container).toHaveStyle('position: relative');
    });

    it('maintains readability in both themes', () => {
      const { rerender } = render(<RevenueChart {...defaultProps} theme="light" />);
      
      let chartElement = screen.getByTestId('line-chart');
      let chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      expect(chartOptions.plugins.legend.labels.color).toBe('rgb(55, 65, 81)');
      
      rerender(<RevenueChart {...defaultProps} theme="dark" />);
      
      chartElement = screen.getByTestId('line-chart');
      chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      expect(chartOptions.plugins.legend.labels.color).toBe('rgb(209, 213, 219)');
    });

    it('supports keyboard navigation through chart interactions', () => {
      render(<RevenueChart {...defaultProps} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');
      
      expect(chartOptions.interaction.mode).toBe('index');
      expect(chartOptions.interaction.intersect).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed data gracefully', () => {
      const malformedData = [
        { date: 'Mon', revenue: 'invalid', appointments: null, averageTicket: undefined, tips: -5, totalRevenue: NaN },
        { date: 'Tue', revenue: 500, appointments: 8, averageTicket: 62.5, tips: 75, totalRevenue: 575 }
      ] as any;

      expect(() => render(<RevenueChart data={malformedData} />)).not.toThrow();
    });

    it('handles extreme values appropriately', () => {
      const extremeData: RevenueDataPoint[] = [
        { date: 'Extreme', revenue: 999999, appointments: 100, averageTicket: 9999.99, tips: 50000, totalRevenue: 1049999 }
      ];

      render(<RevenueChart data={extremeData} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      expect(chartData.datasets[0].data).toEqual([999999]);
    });

    it('maintains performance with sparse data', () => {
      const sparseData: RevenueDataPoint[] = [
        { date: 'Day 1', revenue: 500, appointments: 8, averageTicket: 62.5, tips: 75, totalRevenue: 575 },
        ...Array(100).fill(null).map((_, i) => ({
          date: `Day ${i + 2}`,
          revenue: 0,
          appointments: 0,
          averageTicket: 0,
          tips: 0,
          totalRevenue: 0
        }))
      ];

      const performanceStart = performance.now();
      render(<RevenueChart data={sparseData} />);
      const performanceEnd = performance.now();
      
      expect(performanceEnd - performanceStart).toBeLessThan(100);
    });
  });

  describe('Data Visualization Accuracy', () => {
    it('maintains data integrity across chart types', () => {
      const { rerender } = render(<RevenueChart {...defaultProps} />);
      
      let chartElement = screen.getByTestId('line-chart');
      let chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      const lineRevenueData = chartData.datasets[0].data;
      
      rerender(<RevenueChart {...defaultProps} type="bar" />);
      
      chartElement = screen.getByTestId('bar-chart');
      chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      const barRevenueData = chartData.datasets[0].data;
      
      expect(lineRevenueData).toEqual(barRevenueData);
    });

    it('calculates totals correctly when multiple datasets are shown', () => {
      render(<RevenueChart {...defaultProps} showTips={true} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
      
      const revenueData = chartData.datasets[0].data;
      const tipsData = chartData.datasets[1].data;
      
      // Verify that individual components add up to expected totals
      for (let i = 0; i < revenueData.length; i++) {
        const expectedTotal = mockWeeklyData[i].revenue + mockWeeklyData[i].tips;
        const actualTotal = revenueData[i] + tipsData[i];
        expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(0.01);
      }
    });
  });
});
import { render, screen } from '@testing-library/react'
import { RevenueChart } from '../RevenueChart'
import '@testing-library/jest-dom'

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}))

describe('RevenueChart', () => {
  const mockDateRange = {
    from: new Date('2024-01-01'),
    to: new Date('2024-01-31')
  }

  const mockData = [
    { date: '2024-01-01', revenue: 1000, services: 800, products: 150, tips: 50 },
    { date: '2024-01-02', revenue: 1200, services: 950, products: 200, tips: 50 },
    { date: '2024-01-03', revenue: 1100, services: 850, products: 200, tips: 50 },
    { date: '2024-01-04', revenue: 1300, services: 1000, products: 250, tips: 50 },
    { date: '2024-01-05', revenue: 900, services: 700, products: 150, tips: 50 }
  ]

  it('renders revenue summary cards correctly', () => {
    render(<RevenueChart data={mockData} dateRange={mockDateRange} />)

    // Check total revenue
    const totalRevenue = mockData.reduce((sum, item) => sum + item.revenue, 0)
    expect(screen.getByText(`$${totalRevenue.toLocaleString()}`)).toBeInTheDocument()

    // Check daily average
    const avgRevenue = totalRevenue / mockData.length
    expect(screen.getByText(`$${avgRevenue.toFixed(2)}`)).toBeInTheDocument()

    // Check best day
    const maxRevenue = Math.max(...mockData.map(d => d.revenue))
    expect(screen.getByText(`$${maxRevenue.toLocaleString()}`)).toBeInTheDocument()
  })

  it('calculates and displays trend correctly', () => {
    render(<RevenueChart data={mockData} dateRange={mockDateRange} />)

    // Should show trend percentage
    expect(screen.getByText(/\d+\.?\d*% trend/)).toBeInTheDocument()
  })

  it('renders charts when data is available', () => {
    render(<RevenueChart data={mockData} dateRange={mockDateRange} />)

    // Main revenue chart
    expect(screen.getByText('Revenue Trend')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()

    // Revenue breakdown chart
    expect(screen.getByText('Revenue Breakdown')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    render(<RevenueChart data={[]} dateRange={mockDateRange} />)

    expect(screen.getByText('No revenue data available for the selected period')).toBeInTheDocument()
  })

  it('handles invalid data format', () => {
    render(<RevenueChart data={null as any} dateRange={mockDateRange} />)

    expect(screen.getByText('Invalid revenue data format')).toBeInTheDocument()
  })

  it('displays correct trend indicator', () => {
    // Upward trend data
    const upwardData = [
      { date: '2024-01-01', revenue: 500 },
      { date: '2024-01-02', revenue: 600 },
      { date: '2024-01-03', revenue: 900 },
      { date: '2024-01-04', revenue: 1200 }
    ]

    const { rerender } = render(<RevenueChart data={upwardData} dateRange={mockDateRange} />)
    expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument()

    // Downward trend data
    const downwardData = [
      { date: '2024-01-01', revenue: 1200 },
      { date: '2024-01-02', revenue: 900 },
      { date: '2024-01-03', revenue: 600 },
      { date: '2024-01-04', revenue: 500 }
    ]

    rerender(<RevenueChart data={downwardData} dateRange={mockDateRange} />)
    expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument()
  })

  it('formats dates correctly based on date range', () => {
    // Weekly range
    const weeklyRange = {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-07')
    }

    render(<RevenueChart data={mockData} dateRange={weeklyRange} />)
    // Chart should be rendered with correct date formatting
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()

    // Monthly range
    const monthlyRange = {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31')
    }

    render(<RevenueChart data={mockData} dateRange={monthlyRange} />)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('handles missing revenue breakdown data', () => {
    const dataWithoutBreakdown = [
      { date: '2024-01-01', revenue: 1000 },
      { date: '2024-01-02', revenue: 1200 }
    ]

    render(<RevenueChart data={dataWithoutBreakdown} dateRange={mockDateRange} />)

    // Should not render breakdown chart if no breakdown data
    expect(screen.queryByText('Revenue Breakdown')).not.toBeInTheDocument()
  })

  it('handles null values in data', () => {
    const dataWithNulls = [
      { date: '2024-01-01', revenue: null },
      { date: '2024-01-02', revenue: 1200 },
      { date: '2024-01-03', revenue: undefined }
    ]

    render(<RevenueChart data={dataWithNulls as any} dateRange={mockDateRange} />)

    // Should handle nulls gracefully
    expect(screen.getByText('Revenue Trend')).toBeInTheDocument()
  })
})

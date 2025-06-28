import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalyticsDashboard } from '../AnalyticsDashboard'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    lastMessage: null,
    isConnected: true,
    connectionStatus: 'connected'
  })
}))

jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  },
  cacheKeys: {
    analytics: jest.fn()
  },
  cacheUtils: {
    fetchWithCache: jest.fn((key, fetcher) => fetcher())
  }
}))

// Mock fetch
global.fetch = jest.fn()

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    localStorage.setItem('token', 'test-token')

    // Mock successful API responses
    const mockResponses = {
      revenue: [
        { date: '2024-01-01', revenue: 1000, services: 800, products: 150, tips: 50 },
        { date: '2024-01-02', revenue: 1200, services: 950, products: 200, tips: 50 }
      ],
      bookings: [
        { date: '2024-01-01', total: 10, completed: 8, cancelled: 1, no_show: 1, pending: 0 }
      ],
      metrics: {
        totalRevenue: 2200,
        revenueGrowth: 15.5,
        totalBookings: 10,
        bookingGrowth: 5,
        activeClients: 25,
        retention: 85,
        avgBookingValue: 110,
        utilizationRate: 75
      },
      services: [
        { name: 'Haircut', bookings: 50, revenue: 1500, avg_duration: 30 }
      ],
      retention: {
        overallRetention: 85,
        newClients: 10,
        returningClients: 15,
        lostClients: 2
      },
      peakHours: [
        { day: 'Monday', hour: 10, bookings: 5 }
      ],
      barberStats: [
        { id: 1, name: 'John Doe', bookings: 50, revenue: 2500, rating: 4.8 }
      ]
    }

    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      const endpoint = url.split('?')[0].split('/').pop()
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses[endpoint as keyof typeof mockResponses] || {})
      })
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('renders dashboard header correctly', () => {
    render(<AnalyticsDashboard />)

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Track performance and gain insights')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<AnalyticsDashboard />)

    // Should show skeleton loaders
    expect(screen.getAllByTestId('skeleton')).toBeTruthy()
  })

  it('loads and displays analytics data', async () => {
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('$2,200')).toBeInTheDocument() // Total revenue
      expect(screen.getByText('15.5% vs last period')).toBeInTheDocument() // Revenue growth
      expect(screen.getByText('10')).toBeInTheDocument() // Total bookings
      expect(screen.getByText('25')).toBeInTheDocument() // Active clients
    })
  })

  it('handles API errors gracefully', async () => {
    // Mock failed API call
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load analytics data/i)).toBeInTheDocument()
    })
  })

  it('refreshes data when refresh button is clicked', async () => {
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('$2,200')).toBeInTheDocument()
    })

    // Clear mock calls
    ;(global.fetch as jest.Mock).mockClear()

    // Click refresh button
    const refreshButton = screen.getByLabelText('Refresh data')
    fireEvent.click(refreshButton)

    // Verify API calls were made again
    expect(global.fetch).toHaveBeenCalled()
  })

  it('switches between tabs correctly', async () => {
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument()
    })

    // Click on Bookings tab
    const bookingsTab = screen.getByRole('tab', { name: /bookings/i })
    fireEvent.click(bookingsTab)

    // Should show booking content
    await waitFor(() => {
      expect(screen.getByText('Booking Status Trends')).toBeInTheDocument()
    })
  })

  it('handles date range changes', async () => {
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('$2,200')).toBeInTheDocument()
    })

    // Find and click date range picker
    const dateRangePicker = screen.getByRole('button', { name: /date range/i })
    fireEvent.click(dateRangePicker)

    // Select "Last 7 Days"
    const last7Days = screen.getByText('Last 7 Days')
    fireEvent.click(last7Days)

    // Verify API calls were made with new date range
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date='),
        expect.any(Object)
      )
    })
  })

  it('shows no data message when empty', async () => {
    // Mock empty responses
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      })
    )

    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/No revenue data available/i)).toBeInTheDocument()
    })
  })

  it('requires authentication', async () => {
    // Remove token
    localStorage.removeItem('token')

    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Authentication required/i)).toBeInTheDocument()
    })
  })
})

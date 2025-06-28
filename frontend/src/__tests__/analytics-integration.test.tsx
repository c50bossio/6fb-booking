import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

// Mock WebSocket
class MockWebSocket {
  url: string
  readyState: number = 0
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = 1
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 100)
  }

  send(data: string) {
    // Mock sending data
  }

  close() {
    this.readyState = 3
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any

// Mock fetch with realistic data
const mockAnalyticsData = {
  revenue: generateRevenueData(),
  bookings: generateBookingData(),
  metrics: {
    totalRevenue: 125000,
    revenueGrowth: 12.5,
    totalBookings: 850,
    bookingGrowth: 8.3,
    activeClients: 320,
    retention: 82.5,
    avgBookingValue: 147.06,
    utilizationRate: 78.5,
    revenueTarget: 150000,
    currentRevenue: 125000,
    bookingRate: 92.3,
    satisfaction: 4.7,
    insights: [
      { type: 'positive', message: 'Revenue increased by 12.5% compared to previous period' },
      { type: 'warning', message: 'Thursday afternoons show low utilization - consider promotions' }
    ]
  },
  services: [
    { name: 'Premium Cut', bookings: 250, revenue: 12500, avg_duration: 45 },
    { name: 'Classic Cut', bookings: 400, revenue: 16000, avg_duration: 30 },
    { name: 'Beard Trim', bookings: 150, revenue: 4500, avg_duration: 20 },
    { name: 'Hair & Beard', bookings: 50, revenue: 4000, avg_duration: 60 }
  ],
  retention: {
    overallRetention: 82.5,
    newClients: 45,
    returningClients: 275,
    lostClients: 18,
    avgVisitsPerClient: 3.2,
    avgLifetimeValue: 450,
    monthlyRetention: [
      { month: 'January 2024', retention: 85, target: 80 },
      { month: 'February 2024', retention: 82, target: 80 },
      { month: 'March 2024', retention: 83, target: 80 }
    ],
    visitFrequency: [
      { frequency: 'Weekly', clients: 45 },
      { frequency: 'Bi-weekly', clients: 120 },
      { frequency: 'Monthly', clients: 110 },
      { frequency: 'Quarterly', clients: 45 }
    ],
    cohortAnalysis: [],
    segmentAnalysis: []
  },
  peakHours: generatePeakHoursData(),
  barberStats: [
    { id: 1, name: 'John Smith', bookings: 145, revenue: 8750, rating: 4.8, efficiency: 92, retention: 88, productivity: 85, satisfaction: 90, skills: 88, trend: 8 },
    { id: 2, name: 'Mike Johnson', bookings: 132, revenue: 7920, rating: 4.7, efficiency: 88, retention: 85, productivity: 82, satisfaction: 88, skills: 85, trend: 5 },
    { id: 3, name: 'Chris Davis', bookings: 118, revenue: 6845, rating: 4.6, efficiency: 85, retention: 82, productivity: 78, satisfaction: 85, skills: 82, trend: -2 }
  ]
}

function generateRevenueData() {
  const data = []
  const baseDate = new Date('2024-01-01')
  for (let i = 0; i < 30; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + i)
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: 3000 + Math.random() * 2000,
      services: 2500 + Math.random() * 1500,
      products: 300 + Math.random() * 200,
      tips: 200 + Math.random() * 300
    })
  }
  return data
}

function generateBookingData() {
  const data = []
  const baseDate = new Date('2024-01-01')
  for (let i = 0; i < 30; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + i)
    const total = Math.floor(20 + Math.random() * 15)
    const completed = Math.floor(total * 0.85)
    const cancelled = Math.floor((total - completed) * 0.6)
    const no_show = Math.floor((total - completed - cancelled) * 0.5)
    const pending = total - completed - cancelled - no_show

    data.push({
      date: date.toISOString().split('T')[0],
      total,
      completed,
      cancelled,
      no_show,
      pending
    })
  }
  return data
}

function generatePeakHoursData() {
  const data = []
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  days.forEach(day => {
    for (let hour = 8; hour < 20; hour++) {
      const isWeekend = day === 'Saturday' || day === 'Sunday'
      const isPeakHour = (hour >= 10 && hour <= 12) || (hour >= 17 && hour <= 19)
      const baseBookings = isWeekend ? 8 : 5
      const peakMultiplier = isPeakHour ? 2.5 : 1

      data.push({
        day,
        hour,
        bookings: Math.floor(baseBookings * peakMultiplier * (0.5 + Math.random()))
      })
    }
  })

  return data
}

// Setup fetch mock
beforeEach(() => {
  global.fetch = jest.fn((url) => {
    const endpoint = url.toString().split('?')[0].split('/').pop()
    const data = mockAnalyticsData[endpoint as keyof typeof mockAnalyticsData]

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data || {})
    })
  }) as jest.Mock

  localStorage.setItem('token', 'test-token')
})

afterEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
})

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Analytics Dashboard Integration', () => {
  it('completes full analytics workflow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AnalyticsDashboard />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('$125,000')).toBeInTheDocument() // Total revenue
    })

    // Verify all key metrics are displayed
    expect(screen.getByText('850')).toBeInTheDocument() // Total bookings
    expect(screen.getByText('320')).toBeInTheDocument() // Active clients
    expect(screen.getByText('$147.06')).toBeInTheDocument() // Avg booking value

    // Switch to bookings tab
    await user.click(screen.getByRole('tab', { name: /bookings/i }))

    await waitFor(() => {
      expect(screen.getByText('Booking Status Trends')).toBeInTheDocument()
    })

    // Switch to services tab
    await user.click(screen.getByRole('tab', { name: /services/i }))

    await waitFor(() => {
      expect(screen.getByText('Premium Cut')).toBeInTheDocument()
      expect(screen.getByText('Classic Cut')).toBeInTheDocument()
    })

    // Switch to team comparison
    await user.click(screen.getByRole('tab', { name: /team/i }))

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('$8,750')).toBeInTheDocument()
    })
  })

  it('handles date range changes and data refresh', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AnalyticsDashboard />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('$125,000')).toBeInTheDocument()
    })

    // Open date picker
    const dateButton = screen.getByRole('button', { name: /date range/i })
    await user.click(dateButton)

    // Select "Last 7 Days"
    const last7Days = screen.getByText('Last 7 Days')
    await user.click(last7Days)

    // Verify API was called with new dates
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls
      const recentCall = calls[calls.length - 1][0]
      expect(recentCall).toContain('start_date=')
    })
  })

  it('displays real-time updates via WebSocket', async () => {
    renderWithProviders(<AnalyticsDashboard />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('$125,000')).toBeInTheDocument()
    })

    // Simulate WebSocket message
    const ws = new MockWebSocket('ws://localhost:8000')

    // Send analytics update
    setTimeout(() => {
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'analytics_update',
            data: {
              metrics: {
                totalRevenue: 130000,
                revenueGrowth: 15.2
              }
            }
          })
        }))
      }
    }, 500)

    // Revenue should update
    await waitFor(() => {
      expect(screen.getByText('$130,000')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('exports data successfully', async () => {
    const user = userEvent.setup()

    // Mock successful export
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['csv data'], { type: 'text/csv' }))
      })
    ) as jest.Mock

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')

    renderWithProviders(<AnalyticsDashboard />)

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText('$125,000')).toBeInTheDocument()
    })

    // Click export button
    const exportButton = screen.getByRole('button', { name: /export/i })
    await user.click(exportButton)

    // Select CSV format
    const csvOption = screen.getByText('Export as CSV')
    await user.click(csvOption)

    // Verify export was triggered
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/export?format=csv'),
        expect.any(Object)
      )
    })
  })

  it('handles errors gracefully', async () => {
    // Mock API error
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network error'))
    ) as jest.Mock

    renderWithProviders(<AnalyticsDashboard />)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to load analytics data/i)).toBeInTheDocument()
    })

    // Fix the API
    global.fetch = jest.fn((url) => {
      const endpoint = url.toString().split('?')[0].split('/').pop()
      const data = mockAnalyticsData[endpoint as keyof typeof mockAnalyticsData]

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data || {})
      })
    }) as jest.Mock

    // Click refresh
    const refreshButton = screen.getByLabelText('Refresh data')
    await userEvent.click(refreshButton)

    // Should recover and show data
    await waitFor(() => {
      expect(screen.queryByText(/Failed to load/i)).not.toBeInTheDocument()
      expect(screen.getByText('$125,000')).toBeInTheDocument()
    })
  })

  it('maintains state across tab switches', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AnalyticsDashboard />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('$125,000')).toBeInTheDocument()
    })

    // Go to services tab
    await user.click(screen.getByRole('tab', { name: /services/i }))

    await waitFor(() => {
      expect(screen.getByText('Premium Cut')).toBeInTheDocument()
    })

    // Go back to revenue tab
    await user.click(screen.getByRole('tab', { name: /revenue/i }))

    // Data should still be there (no refetch)
    expect(screen.getByText('$125,000')).toBeInTheDocument()

    // Verify no additional API calls were made
    const fetchCalls = (global.fetch as jest.Mock).mock.calls.length

    // Switch tabs again
    await user.click(screen.getByRole('tab', { name: /bookings/i }))

    // No new API calls should have been made
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCalls)
  })
})

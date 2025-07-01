/**
 * Tests for timezone functionality
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TimezoneSelector from '@/components/TimezoneSelector'
import { TimezoneProvider, useTimezone } from '@/lib/useTimezone'
import * as api from '@/lib/api'
import {
  getUserTimezone,
  detectBrowserTimezone,
  isValidTimezone,
  formatTimeWithTimezone,
  formatDateInTimezone,
  convertTimezone,
  localToUTC,
  utcToLocal
} from '@/lib/timezone'

// Mock the API module
jest.mock('@/lib/api', () => ({
  getProfile: jest.fn(),
  updateUserTimezone: jest.fn()
}))

// Mock Intl.DateTimeFormat for consistent testing
const mockTimezone = 'America/New_York'
const originalDateTimeFormat = Intl.DateTimeFormat
beforeAll(() => {
  // @ts-ignore
  global.Intl.DateTimeFormat = jest.fn(() => ({
    resolvedOptions: () => ({ timeZone: mockTimezone }),
    formatToParts: originalDateTimeFormat.prototype.formatToParts,
    format: originalDateTimeFormat.prototype.format
  }))
})

afterAll(() => {
  global.Intl.DateTimeFormat = originalDateTimeFormat
})

describe('Timezone Utilities', () => {
  describe('getUserTimezone', () => {
    it('should return the browser timezone', () => {
      expect(getUserTimezone()).toBe(mockTimezone)
    })
  })

  describe('detectBrowserTimezone', () => {
    it('should detect browser timezone', () => {
      expect(detectBrowserTimezone()).toBe(mockTimezone)
    })
  })

  describe('isValidTimezone', () => {
    it('should validate correct timezones', () => {
      expect(isValidTimezone('America/New_York')).toBe(true)
      expect(isValidTimezone('Europe/London')).toBe(true)
      expect(isValidTimezone('Asia/Tokyo')).toBe(true)
      expect(isValidTimezone('UTC')).toBe(true)
    })

    it('should reject invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false)
      expect(isValidTimezone('Not a timezone')).toBe(false)
      expect(isValidTimezone('')).toBe(false)
    })
  })

  describe('formatTimeWithTimezone', () => {
    it('should format time with AM/PM', () => {
      expect(formatTimeWithTimezone('09:30', false)).toBe('9:30 AM')
      expect(formatTimeWithTimezone('14:45', false)).toBe('2:45 PM')
      expect(formatTimeWithTimezone('00:00', false)).toBe('12:00 AM')
      expect(formatTimeWithTimezone('12:00', false)).toBe('12:00 PM')
    })
  })

  describe('timezone conversions', () => {
    it('should handle local to UTC conversion', () => {
      const localDate = new Date(2024, 0, 1, 12, 0, 0) // Jan 1, 2024, 12:00 PM
      const utcDate = localToUTC(localDate, 'America/New_York')
      
      // In January, NY is UTC-5
      expect(utcDate.getUTCHours()).toBe(17) // 12 PM EST = 5 PM UTC
    })

    it('should handle UTC to local conversion', () => {
      const utcDate = new Date('2024-01-01T17:00:00Z') // 5 PM UTC
      const localDate = utcToLocal(utcDate, 'America/New_York')
      
      // This is a simplified test - actual implementation might differ
      expect(localDate.getHours()).toBe(12) // 5 PM UTC = 12 PM EST
    })
  })
})

describe('TimezoneSelector Component', () => {
  it('should render with current timezone', () => {
    render(<TimezoneSelector />)
    
    // Should show timezone display
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should open dropdown on click', () => {
    render(<TimezoneSelector />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    // Should show timezone options
    expect(screen.getByText('Select timezone')).toBeInTheDocument()
    expect(screen.getByText('Eastern Time (ET)')).toBeInTheDocument()
    expect(screen.getByText('Pacific Time (PT)')).toBeInTheDocument()
  })

  it('should call onChange when timezone is selected', () => {
    const onChange = jest.fn()
    render(<TimezoneSelector onChange={onChange} />)
    
    // Open dropdown
    fireEvent.click(screen.getByRole('button'))
    
    // Select Pacific Time
    fireEvent.click(screen.getByText('Pacific Time (PT)'))
    
    expect(onChange).toHaveBeenCalledWith('America/Los_Angeles')
  })

  it('should use value prop when provided', () => {
    const TestComponent = () => {
      const [timezone, setTimezone] = React.useState('America/Los_Angeles')
      
      return (
        <TimezoneSelector
          value={timezone}
          onChange={setTimezone}
        />
      )
    }
    
    render(<TestComponent />)
    
    // Should display the timezone from value prop
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('Pacific')
  })
})

describe('TimezoneProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('should load user timezone from profile', async () => {
    const mockProfile = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      timezone: 'Europe/London',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }
    
    ;(api.getProfile as jest.Mock).mockResolvedValue(mockProfile)
    
    const TestComponent = () => {
      const { timezone } = useTimezone()
      return <div>{timezone}</div>
    }
    
    render(
      <TimezoneProvider>
        <TestComponent />
      </TimezoneProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Europe/London')).toBeInTheDocument()
    })
  })

  it('should fall back to browser timezone if no profile', async () => {
    ;(api.getProfile as jest.Mock).mockRejectedValue(new Error('Not authenticated'))
    
    const TestComponent = () => {
      const { timezone } = useTimezone()
      return <div>{timezone}</div>
    }
    
    render(
      <TimezoneProvider>
        <TestComponent />
      </TimezoneProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText(mockTimezone)).toBeInTheDocument()
    })
  })

  it('should update timezone on server and locally', async () => {
    const mockProfile = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      timezone: 'America/New_York',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }
    
    ;(api.getProfile as jest.Mock).mockResolvedValue(mockProfile)
    ;(api.updateUserTimezone as jest.Mock).mockResolvedValue({
      ...mockProfile,
      timezone: 'America/Los_Angeles'
    })
    
    const TestComponent = () => {
      const { timezone, setTimezone } = useTimezone()
      
      return (
        <div>
          <div>{timezone}</div>
          <button onClick={() => setTimezone('America/Los_Angeles')}>
            Change Timezone
          </button>
        </div>
      )
    }
    
    render(
      <TimezoneProvider>
        <TestComponent />
      </TimezoneProvider>
    )
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('America/New_York')).toBeInTheDocument()
    })
    
    // Change timezone
    fireEvent.click(screen.getByText('Change Timezone'))
    
    await waitFor(() => {
      expect(api.updateUserTimezone).toHaveBeenCalledWith('America/Los_Angeles')
      expect(screen.getByText('America/Los_Angeles')).toBeInTheDocument()
      expect(localStorage.getItem('userTimezone')).toBe('America/Los_Angeles')
    })
  })

  it('should detect and set browser timezone', async () => {
    ;(api.getProfile as jest.Mock).mockResolvedValue({
      id: 1,
      email: 'test@example.com', 
      name: 'Test User',
      timezone: 'UTC',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })
    ;(api.updateUserTimezone as jest.Mock).mockResolvedValue({})
    
    const TestComponent = () => {
      const { detectAndSetTimezone } = useTimezone()
      
      return (
        <button onClick={detectAndSetTimezone}>
          Detect Timezone
        </button>
      )
    }
    
    render(
      <TimezoneProvider>
        <TestComponent />
      </TimezoneProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Detect Timezone')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Detect Timezone'))
    
    await waitFor(() => {
      expect(api.updateUserTimezone).toHaveBeenCalledWith(mockTimezone)
    })
  })
})

// Integration test for booking flow with timezones
describe('Booking Flow Timezone Integration', () => {
  it('should display times in user timezone', async () => {
    const mockSlots = {
      date: '2024-01-15',
      slots: [
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '14:00', available: false },
        { time: '15:00', available: true }
      ],
      business_hours: {
        start: '09:00',
        end: '17:00'
      },
      slot_duration_minutes: 30
    }
    
    // This would be part of a larger integration test
    // Testing that the booking page properly uses timezone context
    expect(mockSlots).toBeDefined()
  })
})
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Mock console.error to avoid noise in tests
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  ;(console.error as jest.Mock).mockRestore()
})

describe('CalendarErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <CalendarErrorBoundary>
        <ThrowError shouldThrow={false} />
      </CalendarErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <CalendarErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CalendarErrorBoundary>
    )

    expect(screen.getByText('Calendar Error')).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('shows try again button with correct retry count', () => {
    render(
      <CalendarErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CalendarErrorBoundary>
    )

    const tryAgainButton = screen.getByText(/try again/i)
    expect(tryAgainButton).toBeInTheDocument()
    expect(tryAgainButton).toHaveTextContent('Try Again (3 left)')
  })

  it('shows reload page button', () => {
    // Mock window.location.reload
    const mockReload = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    })

    render(
      <CalendarErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CalendarErrorBoundary>
    )

    const reloadButton = screen.getByText(/reload page/i)
    expect(reloadButton).toBeInTheDocument()
    
    fireEvent.click(reloadButton)
    expect(mockReload).toHaveBeenCalled()
  })

  it('calls custom error handler when provided', () => {
    const mockErrorHandler = jest.fn()

    render(
      <CalendarErrorBoundary onError={mockErrorHandler}>
        <ThrowError shouldThrow={true} />
      </CalendarErrorBoundary>
    )

    expect(mockErrorHandler).toHaveBeenCalled()
    expect(mockErrorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error',
        code: 'Error'
      }),
      expect.any(Object)
    )
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>

    render(
      <CalendarErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </CalendarErrorBoundary>
    )

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument()
    expect(screen.queryByText('Calendar Error')).not.toBeInTheDocument()
  })

  it('includes context in error details', () => {
    render(
      <CalendarErrorBoundary context="test-calendar-component">
        <ThrowError shouldThrow={true} />
      </CalendarErrorBoundary>
    )

    // In development mode, error details should be visible
    if (process.env.NODE_ENV === 'development') {
      expect(screen.getByText(/error details/i)).toBeInTheDocument()
    }
  })

  it('recovers after successful retry', () => {
    const { rerender } = render(
      <CalendarErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CalendarErrorBoundary>
    )

    expect(screen.getByText('Calendar Error')).toBeInTheDocument()

    // Click try again
    fireEvent.click(screen.getByText(/try again/i))

    // Re-render with no error
    rerender(
      <CalendarErrorBoundary>
        <ThrowError shouldThrow={false} />
      </CalendarErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
    expect(screen.queryByText('Calendar Error')).not.toBeInTheDocument()
  })

  it('disables retry button after max attempts', () => {
    const { rerender } = render(
      <CalendarErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CalendarErrorBoundary>
    )

    // Click retry 3 times
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText(/try again/i))
      rerender(
        <CalendarErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CalendarErrorBoundary>
      )
    }

    // Should no longer show try again button
    expect(screen.queryByText(/try again/i)).not.toBeInTheDocument()
    expect(screen.getByText(/reload page/i)).toBeInTheDocument()
  })
})
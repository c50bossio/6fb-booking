/**
 * Frontend Test Template for 6FB Booking V2
 * ==========================================
 * 
 * This template provides comprehensive testing structure for frontend components.
 * Follow this template to ensure consistent testing across all React components.
 * 
 * Usage: Copy this template and rename to [YourComponent].test.tsx
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'

// Import your component (replace with actual imports)
import YourComponent from '@/components/YourComponent'
import { YourComponentProps } from '@/components/YourComponent/types'
import * as api from '@/lib/api'

// Mock external dependencies
vi.mock('@/lib/api', () => ({
  getData: vi.fn(),
  postData: vi.fn(),
  updateData: vi.fn(),
  deleteData: vi.fn(),
}))

vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    pathname: '/test-path',
    query: {},
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', role: 'USER' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Test utilities
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: process.env.NODE_ENV === 'test' ? () => {} : console.error,
    },
  })
}

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient()
  
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  )
}

const renderWithProviders = (
  component: React.ReactElement,
  options?: {
    initialEntries?: string[]
    queryClient?: QueryClient
  }
) => {
  const queryClient = options?.queryClient || createTestQueryClient()
  
  return {
    ...render(component, { wrapper: TestWrapper }),
    queryClient,
  }
}

// Sample props for testing
const defaultProps: YourComponentProps = {
  id: 1,
  title: 'Test Component',
  description: 'Test description',
  onAction: vi.fn(),
  isLoading: false,
  error: null,
}

const mockApiData = {
  id: 1,
  name: 'Test Item',
  description: 'Test description',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
}

describe('YourComponent', () => {
  const user = userEvent.setup()
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  // RENDERING TESTS
  describe('Rendering', () => {
    test('renders correctly with default props', () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      expect(screen.getByText(defaultProps.title)).toBeInTheDocument()
      expect(screen.getByText(defaultProps.description)).toBeInTheDocument()
    })

    test('renders loading state', () => {
      const loadingProps = { ...defaultProps, isLoading: true }
      renderWithProviders(<YourComponent {...loadingProps} />)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      // Or expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    test('renders error state', () => {
      const errorProps = { 
        ...defaultProps, 
        error: { message: 'Something went wrong' }
      }
      renderWithProviders(<YourComponent {...errorProps} />)
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    test('renders empty state when no data', () => {
      const emptyProps = { ...defaultProps, data: [] }
      renderWithProviders(<YourComponent {...emptyProps} />)
      
      expect(screen.getByText(/no items found/i)).toBeInTheDocument()
    })

    test('applies custom className', () => {
      const customClass = 'custom-test-class'
      renderWithProviders(
        <YourComponent {...defaultProps} className={customClass} />
      )
      
      const component = screen.getByTestId('your-component')
      expect(component).toHaveClass(customClass)
    })
  })

  // INTERACTION TESTS
  describe('User Interactions', () => {
    test('handles button click', async () => {
      const mockAction = vi.fn()
      renderWithProviders(
        <YourComponent {...defaultProps} onAction={mockAction} />
      )
      
      const button = screen.getByRole('button', { name: /action button/i })
      await user.click(button)
      
      expect(mockAction).toHaveBeenCalledTimes(1)
      expect(mockAction).toHaveBeenCalledWith(expect.any(Object))
    })

    test('handles form submission', async () => {
      const mockSubmit = vi.fn()
      renderWithProviders(
        <YourComponent {...defaultProps} onSubmit={mockSubmit} />
      )
      
      const form = screen.getByRole('form')
      const input = screen.getByLabelText(/input field/i)
      
      await user.type(input, 'test value')
      await user.click(screen.getByRole('button', { name: /submit/i }))
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          inputField: 'test value'
        })
      })
    })

    test('handles input changes', async () => {
      const mockChange = vi.fn()
      renderWithProviders(
        <YourComponent {...defaultProps} onChange={mockChange} />
      )
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'new value')
      
      expect(mockChange).toHaveBeenLastCalledWith('new value')
    })

    test('handles keyboard navigation', async () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const firstItem = screen.getByTestId('item-0')
      const secondItem = screen.getByTestId('item-1')
      
      // Focus first item
      firstItem.focus()
      expect(firstItem).toHaveFocus()
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      expect(secondItem).toHaveFocus()
      
      // Activate with Enter
      await user.keyboard('{Enter}')
      expect(defaultProps.onAction).toHaveBeenCalled()
    })

    test('handles escape key to close modal', async () => {
      const mockClose = vi.fn()
      renderWithProviders(
        <YourComponent {...defaultProps} isOpen={true} onClose={mockClose} />
      )
      
      await user.keyboard('{Escape}')
      expect(mockClose).toHaveBeenCalledTimes(1)
    })
  })

  // API INTEGRATION TESTS
  describe('API Integration', () => {
    test('fetches data on mount', async () => {
      const mockGetData = vi.mocked(api.getData)
      mockGetData.mockResolvedValueOnce(mockApiData)
      
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockGetData).toHaveBeenCalledWith('/api/endpoint')
      })
      
      expect(screen.getByText(mockApiData.name)).toBeInTheDocument()
    })

    test('handles API success response', async () => {
      const mockPostData = vi.mocked(api.postData)
      mockPostData.mockResolvedValueOnce({ success: true, data: mockApiData })
      
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument()
      })
    })

    test('handles API error response', async () => {
      const errorMessage = 'API Error occurred'
      const mockPostData = vi.mocked(api.postData)
      mockPostData.mockRejectedValueOnce(new Error(errorMessage))
      
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    test('shows loading state during API call', async () => {
      const mockGetData = vi.mocked(api.getData)
      // Create a promise that won't resolve immediately
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockGetData.mockReturnValueOnce(pendingPromise)
      
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      // Should show loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      
      // Resolve the promise
      act(() => {
        resolvePromise!(mockApiData)
      })
      
      // Loading should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })
    })

    test('retries failed API calls', async () => {
      const mockGetData = vi.mocked(api.getData)
      mockGetData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockApiData)
      
      renderWithProviders(<YourComponent {...defaultProps} enableRetry={true} />)
      
      // First call fails
      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument()
      })
      
      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)
      
      // Second call succeeds
      await waitFor(() => {
        expect(screen.getByText(mockApiData.name)).toBeInTheDocument()
      })
      
      expect(mockGetData).toHaveBeenCalledTimes(2)
    })
  })

  // FORM VALIDATION TESTS
  describe('Form Validation', () => {
    test('validates required fields', async () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/field is required/i)).toBeInTheDocument()
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    test('validates email format', async () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })

    test('validates minimum length', async () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, '123')
      
      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
      })
    })

    test('shows real-time validation errors', async () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const input = screen.getByLabelText(/username/i)
      
      // Type invalid value
      await user.type(input, 'ab')
      await user.tab() // Trigger blur
      
      await waitFor(() => {
        expect(screen.getByText(/username too short/i)).toBeInTheDocument()
      })
      
      // Clear and type valid value
      await user.clear(input)
      await user.type(input, 'validusername')
      
      await waitFor(() => {
        expect(screen.queryByText(/username too short/i)).not.toBeInTheDocument()
      })
    })
  })

  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /action button/i })
      expect(button).toHaveAttribute('aria-label')
      
      const input = screen.getByLabelText(/input field/i)
      expect(input).toHaveAttribute('aria-describedby')
    })

    test('supports keyboard navigation', async () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      // Tab through focusable elements
      await user.tab()
      expect(screen.getByRole('button')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('textbox')).toHaveFocus()
    })

    test('announces loading states to screen readers', () => {
      renderWithProviders(
        <YourComponent {...defaultProps} isLoading={true} />
      )
      
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-live',
        'polite'
      )
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    test('has proper heading hierarchy', () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const headings = screen.getAllByRole('heading')
      expect(headings[0]).toHaveAttribute('aria-level', '1')
      expect(headings[1]).toHaveAttribute('aria-level', '2')
    })
  })

  // RESPONSIVE DESIGN TESTS
  describe('Responsive Design', () => {
    test('adapts to mobile viewport', () => {
      // Mock window.matchMedia for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
      
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const component = screen.getByTestId('your-component')
      expect(component).toHaveClass('mobile-layout')
    })

    test('shows/hides elements based on screen size', () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const desktopOnlyElement = screen.queryByTestId('desktop-only')
      const mobileOnlyElement = screen.queryByTestId('mobile-only')
      
      // These assertions depend on your responsive implementation
      expect(desktopOnlyElement).toBeInTheDocument()
      expect(mobileOnlyElement).not.toBeInTheDocument()
    })
  })

  // PERFORMANCE TESTS
  describe('Performance', () => {
    test('memoizes expensive calculations', () => {
      const expensiveFunction = vi.fn(() => 'calculated value')
      
      const { rerender } = renderWithProviders(
        <YourComponent {...defaultProps} calculate={expensiveFunction} />
      )
      
      expect(expensiveFunction).toHaveBeenCalledTimes(1)
      
      // Rerender with same props
      rerender(<YourComponent {...defaultProps} calculate={expensiveFunction} />)
      
      // Should not call expensive function again
      expect(expensiveFunction).toHaveBeenCalledTimes(1)
    })

    test('debounces user input', async () => {
      vi.useFakeTimers()
      const mockSearch = vi.fn()
      
      renderWithProviders(
        <YourComponent {...defaultProps} onSearch={mockSearch} />
      )
      
      const searchInput = screen.getByRole('textbox')
      
      // Type quickly
      await user.type(searchInput, 'test')
      
      // Should not have called search yet
      expect(mockSearch).not.toHaveBeenCalled()
      
      // Fast-forward debounce delay
      act(() => {
        vi.advanceTimersByTime(300)
      })
      
      // Now should have called search
      expect(mockSearch).toHaveBeenCalledWith('test')
      
      vi.useRealTimers()
    })
  })

  // ERROR BOUNDARY TESTS
  describe('Error Handling', () => {
    test('catches and displays component errors', () => {
      const ThrowError = () => {
        throw new Error('Test error')
      }
      
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation()
      
      renderWithProviders(
        <YourComponent {...defaultProps}>
          <ThrowError />
        </YourComponent>
      )
      
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    test('provides error recovery actions', async () => {
      const mockReload = vi.fn()
      
      renderWithProviders(
        <YourComponent 
          {...defaultProps} 
          error={new Error('Test error')}
          onReload={mockReload}
        />
      )
      
      const retryButton = screen.getByRole('button', { name: /try again/i })
      await user.click(retryButton)
      
      expect(mockReload).toHaveBeenCalledTimes(1)
    })
  })

  // INTEGRATION WITH EXTERNAL LIBRARIES
  describe('External Library Integration', () => {
    test('integrates with date picker library', async () => {
      renderWithProviders(<YourComponent {...defaultProps} />)
      
      const dateInput = screen.getByLabelText(/date/i)
      await user.click(dateInput)
      
      // Date picker should open
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Select a date
      const dateOption = screen.getByText('15')
      await user.click(dateOption)
      
      // Date should be selected
      expect(dateInput).toHaveValue('2023-01-15')
    })

    test('integrates with chart library', () => {
      const chartData = [
        { label: 'January', value: 100 },
        { label: 'February', value: 200 },
      ]
      
      renderWithProviders(
        <YourComponent {...defaultProps} chartData={chartData} />
      )
      
      // Chart should render
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
      
      // Chart data should be displayed
      expect(screen.getByText('January')).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
    })
  })

  // CONTEXT AND STATE MANAGEMENT TESTS
  describe('Context and State Management', () => {
    test('consumes context correctly', () => {
      const contextValue = { theme: 'dark', language: 'en' }
      
      renderWithProviders(
        <TestContext.Provider value={contextValue}>
          <YourComponent {...defaultProps} />
        </TestContext.Provider>
      )
      
      const component = screen.getByTestId('your-component')
      expect(component).toHaveClass('theme-dark')
    })

    test('updates global state correctly', async () => {
      const mockDispatch = vi.fn()
      
      renderWithProviders(
        <YourComponent {...defaultProps} dispatch={mockDispatch} />
      )
      
      const button = screen.getByRole('button', { name: /update state/i })
      await user.click(button)
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_STATE',
        payload: expect.any(Object)
      })
    })
  })
})

// CUSTOM HOOKS TESTS
describe('useYourHook', () => {
  test('returns initial state correctly', () => {
    const { result } = renderHook(() => useYourHook())
    
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test('fetches data on mount', async () => {
    const mockGetData = vi.mocked(api.getData)
    mockGetData.mockResolvedValueOnce(mockApiData)
    
    const { result } = renderHook(() => useYourHook())
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockApiData)
    })
    
    expect(mockGetData).toHaveBeenCalledTimes(1)
  })

  test('handles errors correctly', async () => {
    const mockGetData = vi.mocked(api.getData)
    mockGetData.mockRejectedValueOnce(new Error('API Error'))
    
    const { result } = renderHook(() => useYourHook())
    
    await waitFor(() => {
      expect(result.current.error).toEqual(expect.any(Error))
    })
  })
})

/**
 * TESTING CHECKLIST FOR THIS TEMPLATE:
 * 
 * Rendering Tests:
 * □ Default rendering with props
 * □ Loading states
 * □ Error states  
 * □ Empty states
 * □ Custom className application
 * 
 * Interaction Tests:
 * □ Button clicks
 * □ Form submissions
 * □ Input changes
 * □ Keyboard navigation
 * □ Modal/dialog interactions
 * 
 * API Integration Tests:
 * □ Data fetching on mount
 * □ Success response handling
 * □ Error response handling
 * □ Loading states during API calls
 * □ Retry mechanisms
 * 
 * Form Validation Tests:
 * □ Required field validation
 * □ Format validation (email, phone, etc.)
 * □ Length validation
 * □ Real-time validation feedback
 * 
 * Accessibility Tests:
 * □ ARIA labels and roles
 * □ Keyboard navigation support
 * □ Screen reader announcements
 * □ Focus management
 * □ Heading hierarchy
 * 
 * Responsive Design Tests:
 * □ Mobile viewport adaptation
 * □ Element visibility based on screen size
 * □ Touch interaction support
 * 
 * Performance Tests:
 * □ Memoization of expensive calculations
 * □ Input debouncing
 * □ Lazy loading
 * □ Bundle size impact
 * 
 * Error Handling Tests:
 * □ Error boundary integration
 * □ Graceful error recovery
 * □ User-friendly error messages
 * 
 * External Library Integration:
 * □ Third-party component integration
 * □ Plugin and library compatibility
 * □ Configuration and customization
 * 
 * State Management Tests:
 * □ Context consumption
 * □ Global state updates
 * □ Local state management
 * □ Side effect handling
 */
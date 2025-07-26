/**
 * Test utilities and helpers for billing-related tests
 * 
 * Provides:
 * - Mock data factories for billing objects
 * - Test helper functions for common scenarios
 * - Stripe mocking utilities
 * - API response builders
 * - Security testing helpers
 * - Performance testing utilities
 */

import { jest } from '@jest/globals'
import type { 
  Subscription, 
  PaymentHistoryItem, 
  BillingPlan,
  BillingContact,
  PriceCalculation 
} from '@/lib/billing-api'

// Mock Data Factories

export function createMockSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub_test_123',
    organization_id: 1,
    stripe_subscription_id: 'sub_stripe_123',
    stripe_customer_id: 'cus_stripe_123',
    status: 'active',
    chairs_count: 1,
    billing_cycle: 'monthly',
    billing_plan: 'Professional',
    current_period_start: '2023-12-01T00:00:00Z',
    current_period_end: '2024-01-01T00:00:00Z',
    current_period_total: 49.00,
    cancel_at_period_end: false,
    payment_method_last4: '4242',
    payment_method_brand: 'visa',
    next_billing_date: '2024-01-01T00:00:00Z',
    enabled_features: {
      max_chairs: 1,
      multi_location: false,
      advanced_analytics: true,
      api_access: false,
      priority_support: true,
      custom_branding: true,
      staff_management: false,
      inventory_management: false,
      marketing_automation: false
    },
    created_at: '2023-11-01T00:00:00Z',
    updated_at: '2023-12-01T00:00:00Z',
    ...overrides
  }
}

export function createMockPaymentHistory(count: number = 3): PaymentHistoryItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `inv_test_${index + 1}`,
    amount: 49.00,
    currency: 'USD',
    status: 'succeeded' as const,
    description: 'Professional Plan - Monthly',
    created_at: new Date(2023, 11 - index, 1).toISOString(),
    invoice_url: `https://example.com/invoice_${index + 1}.pdf`
  }))
}

export function createMockBillingPlan(overrides: Partial<BillingPlan> = {}): BillingPlan {
  return {
    name: 'Professional',
    base_features: {
      max_chairs: 3,
      multi_location: false,
      advanced_analytics: true,
      api_access: false,
      priority_support: true,
      custom_branding: true,
      staff_management: true,
      inventory_management: false,
      marketing_automation: false
    },
    pricing_tiers: [
      {
        chairs_from: 1,
        chairs_to: 1,
        price_per_chair_monthly: 19,
        price_per_chair_yearly: 15.20
      },
      {
        chairs_from: 2,
        chairs_to: 3,
        price_per_chair_monthly: 17,
        price_per_chair_yearly: 13.60
      }
    ],
    trial_days: 14,
    yearly_discount_percent: 20,
    ...overrides
  }
}

export function createMockBillingContact(overrides: Partial<BillingContact> = {}): BillingContact {
  return {
    name: 'Test User',
    email: 'test@example.com',
    phone: '+1234567890',
    street_address: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zip_code: '12345',
    country: 'US',
    ...overrides
  }
}

export function createMockPriceCalculation(overrides: Partial<PriceCalculation> = {}): PriceCalculation {
  return {
    chairs_count: 1,
    monthly_total: 19,
    yearly_total: 182.40,
    yearly_savings: 45.60,
    applicable_tier: {
      chairs_from: 1,
      chairs_to: 1,
      price_per_chair_monthly: 19,
      price_per_chair_yearly: 15.20
    },
    included_features: {
      max_chairs: 1,
      multi_location: false,
      advanced_analytics: true,
      api_access: false,
      priority_support: true,
      custom_branding: true,
      staff_management: false,
      inventory_management: false,
      marketing_automation: false
    },
    ...overrides
  }
}

// Stripe Mock Utilities

export function createMockStripe() {
  return {
    confirmCardPayment: jest.fn(),
    confirmSetupIntent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
    retrieveSetupIntent: jest.fn(),
    elements: jest.fn(() => createMockStripeElements()),
    redirectToCheckout: jest.fn(),
  }
}

export function createMockStripeElements() {
  return {
    create: jest.fn(() => createMockStripeElement()),
    getElement: jest.fn(() => createMockStripeElement()),
  }
}

export function createMockStripeElement() {
  return {
    mount: jest.fn(),
    unmount: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    update: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    clear: jest.fn(),
    destroy: jest.fn(),
  }
}

export function createMockPaymentMethod() {
  return {
    id: 'pm_test_123',
    object: 'payment_method',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
    },
    created: 1623456789,
    customer: 'cus_test_123',
    livemode: false,
    type: 'card',
  }
}

export function createMockSetupIntent() {
  return {
    id: 'seti_test_123',
    object: 'setup_intent',
    client_secret: 'seti_test_123_secret',
    customer: 'cus_test_123',
    payment_method: 'pm_test_123',
    status: 'succeeded',
    usage: 'off_session',
  }
}

// API Response Builders

export function createSuccessResponse<T>(data: T) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response
}

export function createErrorResponse(status: number, error: string | object) {
  const errorData = typeof error === 'string' ? { error } : error
  return {
    ok: false,
    status,
    json: () => Promise.resolve(errorData),
    text: () => Promise.resolve(JSON.stringify(errorData)),
  } as Response
}

export function createNetworkErrorResponse() {
  return Promise.reject(new TypeError('Failed to fetch'))
}

// Test Helper Functions

export function mockBillingAPI() {
  const mocks = {
    getCurrentSubscription: jest.fn(),
    getPaymentHistory: jest.fn(),
    updateSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    createSubscription: jest.fn(),
    getBillingPlans: jest.fn(),
    calculatePrice: jest.fn(),
    getTrialStatus: jest.fn(),
    hasActiveSubscription: jest.fn(),
    convertTrialToPaid: jest.fn(),
  }

  // Setup default successful responses
  mocks.getCurrentSubscription.mockResolvedValue(createMockSubscription())
  mocks.getPaymentHistory.mockResolvedValue(createMockPaymentHistory())
  mocks.getBillingPlans.mockResolvedValue([createMockBillingPlan()])
  mocks.calculatePrice.mockResolvedValue(createMockPriceCalculation())
  mocks.hasActiveSubscription.mockResolvedValue(true)

  return mocks
}

export function mockStripeLib() {
  return {
    getStripe: jest.fn().mockResolvedValue(createMockStripe()),
    createSetupIntent: jest.fn().mockResolvedValue({
      clientSecret: 'seti_test_123_secret',
      setupIntentId: 'seti_test_123',
      customerId: 'cus_test_123'
    }),
    attachPaymentMethod: jest.fn().mockResolvedValue({
      success: true,
      customerId: 'cus_test_123',
      paymentMethodId: 'pm_test_123',
      message: 'Payment method attached successfully'
    }),
    formatCardBrand: jest.fn((brand: string) => brand.charAt(0).toUpperCase() + brand.slice(1)),
    formatLast4: jest.fn((last4: string) => `•••• ${last4}`),
    isStripeAvailable: jest.fn().mockReturnValue(true),
    parseStripeError: jest.fn().mockReturnValue({
      type: 'generic',
      message: 'An error occurred',
      retryable: true
    }),
    retryStripeOperation: jest.fn().mockImplementation((operation) => operation()),
  }
}

// Security Testing Helpers

export function createSecureTestEnvironment() {
  // Mock secure headers
  const mockHeaders = {
    'Content-Security-Policy': "default-src 'self'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }

  // Mock CSRF token
  const mockCSRFToken = 'csrf-token-' + Math.random().toString(36).substr(2, 9)

  return {
    headers: mockHeaders,
    csrfToken: mockCSRFToken,
    mockDocument: {
      querySelector: jest.fn().mockReturnValue({
        getAttribute: jest.fn().mockReturnValue(mockCSRFToken)
      })
    }
  }
}

export function validateNoSensitiveDataInDOM(container: HTMLElement) {
  const html = container.innerHTML

  // Check for common sensitive data patterns
  const sensitivePatterns = [
    /\b4[0-9]{15}\b/, // Visa card numbers
    /\b5[1-5][0-9]{14}\b/, // Mastercard numbers
    /\b3[47][0-9]{13}\b/, // Amex numbers
    /sk_test_[a-zA-Z0-9]+/, // Stripe secret keys
    /pk_test_[a-zA-Z0-9]+/, // Stripe publishable keys (full)
    /\bcvv?\s*:?\s*\d{3,4}\b/i, // CVV codes
    /\bpin\s*:?\s*\d{4,6}\b/i, // PIN codes
  ]

  sensitivePatterns.forEach(pattern => {
    if (pattern.test(html)) {
      throw new Error(`Sensitive data pattern found in DOM: ${pattern}`)
    }
  })
}

// Performance Testing Utilities

export function measureRenderTime(renderFunction: () => void): number {
  const startTime = performance.now()
  renderFunction()
  const endTime = performance.now()
  return endTime - startTime
}

export function simulateSlowNetwork(delay: number = 2000) {
  return {
    mockFetch: jest.fn().mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve(createSuccessResponse({})), delay)
      )
    )
  }
}

export function createLargeDataSet(size: number) {
  return {
    subscription: createMockSubscription(),
    paymentHistory: createMockPaymentHistory(size),
    plans: Array.from({ length: size }, () => createMockBillingPlan())
  }
}

// Accessibility Testing Helpers

export function validateAccessibility(container: HTMLElement) {
  // Check for basic accessibility requirements
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
  if (headings.length === 0) {
    throw new Error('No headings found - page should have proper heading structure')
  }

  const buttons = container.querySelectorAll('button')
  buttons.forEach((button, index) => {
    if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
      throw new Error(`Button at index ${index} has no accessible text`)
    }
  })

  const images = container.querySelectorAll('img')
  images.forEach((img, index) => {
    if (!img.getAttribute('alt')) {
      throw new Error(`Image at index ${index} missing alt text`)
    }
  })
}

export function mockKeyboardNavigation(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  return {
    focusableElements: Array.from(focusableElements),
    simulateTabNavigation: () => {
      let currentIndex = 0
      return {
        next: () => {
          if (currentIndex < focusableElements.length - 1) {
            currentIndex++
            ;(focusableElements[currentIndex] as HTMLElement).focus()
          }
          return focusableElements[currentIndex]
        },
        previous: () => {
          if (currentIndex > 0) {
            currentIndex--
            ;(focusableElements[currentIndex] as HTMLElement).focus()
          }
          return focusableElements[currentIndex]
        },
        current: () => focusableElements[currentIndex]
      }
    }
  }
}

// Error Simulation Helpers

export function simulateAPIErrors() {
  return {
    networkError: () => Promise.reject(new TypeError('Failed to fetch')),
    serverError: () => Promise.reject(createErrorResponse(500, 'Internal Server Error')),
    authError: () => Promise.reject(createErrorResponse(401, 'Unauthorized')),
    validationError: () => Promise.reject(createErrorResponse(400, { 
      error: 'Validation failed',
      details: { field: 'chairs_count', message: 'Must be greater than 0' }
    })),
    rateLimitError: () => Promise.reject(createErrorResponse(429, 'Too Many Requests')),
    stripeError: () => Promise.reject({
      type: 'StripeCardError',
      code: 'card_declined',
      decline_code: 'generic_decline',
      message: 'Your card was declined.'
    })
  }
}

// Component Testing Utilities

export function renderWithProviders(component: React.ReactElement, options?: {
  initialState?: any
  mocks?: any
}) {
  // This would wrap component with necessary providers in a real implementation
  // For now, return the basic render result
  return {
    component,
    options,
    // Mock provider setup would go here
  }
}

export function waitForBillingDataLoad(timeout: number = 5000) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout waiting for billing data to load'))
    }, timeout)

    // Mock implementation - in real scenario would wait for actual data load
    setTimeout(() => {
      clearTimeout(timer)
      resolve()
    }, 100)
  })
}

// Test Data Validation

export function validateSubscriptionData(subscription: any): asserts subscription is Subscription {
  if (!subscription.id || typeof subscription.id !== 'string') {
    throw new Error('Invalid subscription: missing or invalid id')
  }
  if (!subscription.status || !['trialing', 'active', 'past_due', 'canceled', 'unpaid'].includes(subscription.status)) {
    throw new Error('Invalid subscription: invalid status')
  }
  if (!subscription.billing_plan || typeof subscription.billing_plan !== 'string') {
    throw new Error('Invalid subscription: missing or invalid billing_plan')
  }
  // Add more validation as needed
}

export function validatePaymentHistoryData(history: any[]): asserts history is PaymentHistoryItem[] {
  if (!Array.isArray(history)) {
    throw new Error('Payment history must be an array')
  }
  
  history.forEach((item, index) => {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error(`Invalid payment history item at index ${index}: missing or invalid id`)
    }
    if (typeof item.amount !== 'number' || item.amount < 0) {
      throw new Error(`Invalid payment history item at index ${index}: invalid amount`)
    }
    if (!['succeeded', 'pending', 'failed'].includes(item.status)) {
      throw new Error(`Invalid payment history item at index ${index}: invalid status`)
    }
  })
}

// Export commonly used combinations

export const billingTestUtils = {
  // Data factories
  createMockSubscription,
  createMockPaymentHistory,
  createMockBillingPlan,
  createMockBillingContact,
  createMockPriceCalculation,
  
  // Stripe utilities
  createMockStripe,
  createMockStripeElements,
  createMockStripeElement,
  createMockPaymentMethod,
  createMockSetupIntent,
  
  // API utilities
  createSuccessResponse,
  createErrorResponse,
  createNetworkErrorResponse,
  mockBillingAPI,
  mockStripeLib,
  
  // Security utilities
  createSecureTestEnvironment,
  validateNoSensitiveDataInDOM,
  
  // Performance utilities
  measureRenderTime,
  simulateSlowNetwork,
  createLargeDataSet,
  
  // Accessibility utilities
  validateAccessibility,
  mockKeyboardNavigation,
  
  // Error simulation
  simulateAPIErrors,
  
  // Component utilities
  renderWithProviders,
  waitForBillingDataLoad,
  
  // Validation utilities
  validateSubscriptionData,
  validatePaymentHistoryData,
}
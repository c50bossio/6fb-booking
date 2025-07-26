// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import React from 'react'

// Configure jest-fetch-mock for API mocking
import { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks()

// Polyfill "window.fetch" used in the React component.
import 'whatwg-fetch'

// Polyfill TextEncoder/TextDecoder for MSW
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'))

// Mock Next.js navigation
jest.mock('next/navigation', () => require('next-router-mock'))

// Global mocks for common modules
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />
  },
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }) => {
    return <a {...props}>{children}</a>
  },
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ChevronLeftIcon: () => <span data-testid="chevron-left-icon">←</span>,
  ChevronRightIcon: () => <span data-testid="chevron-right-icon">→</span>,
  ArrowPathIcon: () => <span data-testid="arrow-path-icon">↻</span>,
  X: () => <span data-testid="x-icon">×</span>,
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  Clock: () => <span data-testid="clock-icon">🕐</span>,
  User: () => <span data-testid="user-icon">👤</span>,
  Users: () => <span data-testid="users-icon">👥</span>,
  DollarSign: () => <span data-testid="dollar-sign-icon">$</span>,
  TrendingUp: () => <span data-testid="trending-up-icon">📈</span>,
  BarChart: () => <span data-testid="bar-chart-icon">📊</span>,
  PieChart: () => <span data-testid="pie-chart-icon">🥧</span>,
}))

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ChevronLeftIcon: (props) => <span {...props} data-testid="heroicon-chevron-left">←</span>,
  ChevronRightIcon: (props) => <span {...props} data-testid="heroicon-chevron-right">→</span>,
  ArrowPathIcon: (props) => <span {...props} data-testid="heroicon-arrow-path">↻</span>,
  CalendarIcon: (props) => <span {...props} data-testid="heroicon-calendar">📅</span>,
  ClockIcon: (props) => <span {...props} data-testid="heroicon-clock">🕐</span>,
  UserIcon: (props) => <span {...props} data-testid="heroicon-user">👤</span>,
  UsersIcon: (props) => <span {...props} data-testid="heroicon-users">👥</span>,
}))

// Mock Web APIs not available in Jest environment
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})


// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock timezone and date formatting for consistent test results
process.env.TZ = 'UTC'

// Mock Intl.DateTimeFormat to avoid JSDOM issues
const originalDateTimeFormat = Intl.DateTimeFormat
global.Intl.DateTimeFormat = jest.fn().mockImplementation((...args) => {
  return {
    format: jest.fn().mockReturnValue('mocked-date'),
    formatToParts: jest.fn().mockReturnValue([]),
    resolvedOptions: jest.fn().mockReturnValue({
      calendar: 'gregory',
      locale: 'en-US',
      numberingSystem: 'latn',
      timeZone: 'UTC'
    })
  }
})

// Mock Date.prototype.toLocaleString and related methods
Date.prototype.toLocaleString = jest.fn().mockReturnValue('mocked-date')
Date.prototype.toLocaleDateString = jest.fn().mockReturnValue('mocked-date')
Date.prototype.toLocaleTimeString = jest.fn().mockReturnValue('mocked-time')

// fetch is now mocked by jest-fetch-mock

// Suppress console.error for expected errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  // Clear any timers
  jest.clearAllTimers()
})

// Increase test stability
beforeEach(() => {
  // Reset any global state
  jest.clearAllMocks()
})
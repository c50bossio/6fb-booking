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

// Global mocks removed to avoid module resolution issues
// Individual tests should handle their own mocking as needed

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
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
})
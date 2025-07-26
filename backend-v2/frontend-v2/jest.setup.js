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

// Mock Lucide React icons - comprehensive list
const mockIcon = (iconName) => () => <span data-testid={`${iconName.toLowerCase()}-icon`}>{iconName}</span>;

jest.mock('lucide-react', () => {
  // Create a comprehensive mock for all possible lucide-react icons
  const iconNames = [
    'ChevronLeftIcon', 'ChevronRightIcon', 'ArrowPathIcon', 'X', 'Calendar', 'Clock', 
    'User', 'Users', 'DollarSign', 'TrendingUp', 'BarChart', 'PieChart', 'ChevronLeft', 
    'ChevronRight', 'ArrowLeft', 'ArrowRight', 'Settings', 'Download', 'Upload', 'Info', 
    'AlertTriangle', 'CheckCircle', 'XCircle', 'Help', 'Plus', 'Minus', 'Search', 'Filter', 
    'Edit', 'Trash', 'Eye', 'EyeOff', 'Home', 'Menu', 'Close', 'Star', 'Heart', 'ThumbsUp',
    'Share', 'Bell', 'Mail', 'Phone', 'Globe', 'Lock', 'Unlock', 'Key', 'Shield', 'Zap',
    'Activity', 'BarChart2', 'BarChart3', 'LineChart', 'PieChart', 'TrendingDown', 'Target',
    'DollarSign', 'CreditCard', 'Wallet', 'Receipt', 'Calculator', 'FileText', 'File',
    'Folder', 'FolderOpen', 'Image', 'Video', 'Music', 'Headphones', 'Mic', 'Volume2',
    'VolumeX', 'Play', 'Pause', 'Square', 'SkipBack', 'SkipForward', 'Repeat', 'Shuffle',
    'Maximize', 'Minimize', 'RotateCcw', 'RotateCw', 'RefreshCw', 'Power', 'LogOut', 'LogIn'
  ];

  const mockedIcons = {};
  iconNames.forEach(iconName => {
    mockedIcons[iconName] = mockIcon(iconName);
  });

  // Add a default export and fallback for any unmocked icons
  return new Proxy(mockedIcons, {
    get: (target, prop) => {
      if (prop in target) {
        return target[prop];
      }
      // Return a fallback mock for any icon not explicitly listed
      return mockIcon(String(prop));
    }
  });
})

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

// Mock Canvas API for Chart.js
const mockCanvas = {
  getContext: jest.fn(() => ({
    measureText: jest.fn(() => ({ width: 0 })),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    drawImage: jest.fn(),
    createImageData: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    canvas: {
      width: 300,
      height: 150,
      style: {},
      getContext: jest.fn()
    }
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
  toBlob: jest.fn(),
  width: 300,
  height: 150,
  style: {},
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
}

// Mock HTMLCanvasElement
global.HTMLCanvasElement = jest.fn().mockImplementation(() => mockCanvas)
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext
})

// Mock CanvasRenderingContext2D
global.CanvasRenderingContext2D = jest.fn().mockImplementation(() => mockCanvas.getContext())

// Mock Chart.js
jest.mock('chart.js', () => {
  const Chart = jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    render: jest.fn(),
    resize: jest.fn(),
    data: {},
    options: {}
  }))
  
  Chart.register = jest.fn()
  
  return {
    Chart,
    CategoryScale: jest.fn(),
    LinearScale: jest.fn(),
    PointElement: jest.fn(),
    LineElement: jest.fn(),
    BarElement: jest.fn(),
    Title: jest.fn(),
    Tooltip: jest.fn(),
    Legend: jest.fn(),
    Filler: jest.fn(),
    registerables: []
  }
})

// Mock react-chartjs-2 with proper ref handling and Chart.js methods
jest.mock('react-chartjs-2', () => ({
  Line: React.forwardRef(({ data, options }, ref) => {
    // Create a mock chart instance with Chart.js methods
    const mockChartInstance = {
      update: jest.fn(),
      destroy: jest.fn(),
      resize: jest.fn(),
      render: jest.fn(),
      data: data,
      options: options
    };

    // Assign the mock instance to the ref when component mounts
    React.useEffect(() => {
      if (ref && typeof ref === 'function') {
        ref(mockChartInstance);
      } else if (ref && ref.current !== undefined) {
        ref.current = mockChartInstance;
      }
    }, []);

    // Create a sanitized version of options for JSON serialization
    const sanitizedOptions = sanitizeOptionsForSerialization(options);

    return (
      <div 
        data-testid="line-chart" 
        data-chart-data={JSON.stringify(data)} 
        data-chart-options={JSON.stringify(sanitizedOptions)}
        data-original-options={JSON.stringify(options, (key, value) => 
          typeof value === 'function' ? '[Function]' : value
        )}
      >
        <canvas data-testid="chart-canvas" />
      </div>
    );
  }),
  Bar: React.forwardRef(({ data, options }, ref) => {
    // Create a mock chart instance with Chart.js methods
    const mockChartInstance = {
      update: jest.fn(),
      destroy: jest.fn(),
      resize: jest.fn(),
      render: jest.fn(),
      data: data,
      options: options
    };

    // Assign the mock instance to the ref when component mounts
    React.useEffect(() => {
      if (ref && typeof ref === 'function') {
        ref(mockChartInstance);
      } else if (ref && ref.current !== undefined) {
        ref.current = mockChartInstance;
      }
    }, []);

    // Create a sanitized version of options for JSON serialization
    const sanitizedOptions = sanitizeOptionsForSerialization(options);

    return (
      <div 
        data-testid="bar-chart" 
        data-chart-data={JSON.stringify(data)} 
        data-chart-options={JSON.stringify(sanitizedOptions)}
        data-original-options={JSON.stringify(options, (key, value) => 
          typeof value === 'function' ? '[Function]' : value
        )}
      >
        <canvas data-testid="chart-canvas" />
      </div>
    );
  }),
  Doughnut: React.forwardRef(({ data, options }, ref) => {
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

    const sanitizedOptions = sanitizeOptionsForSerialization(options);

    return (
      <div 
        data-testid="doughnut-chart" 
        data-chart-data={JSON.stringify(data)} 
        data-chart-options={JSON.stringify(sanitizedOptions)}
        data-original-options={JSON.stringify(options, (key, value) => 
          typeof value === 'function' ? '[Function]' : value
        )}
      >
        <canvas data-testid="chart-canvas" />
      </div>
    );
  }),
  Pie: React.forwardRef(({ data, options }, ref) => {
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

    const sanitizedOptions = sanitizeOptionsForSerialization(options);

    return (
      <div 
        data-testid="pie-chart" 
        data-chart-data={JSON.stringify(data)} 
        data-chart-options={JSON.stringify(sanitizedOptions)}
        data-original-options={JSON.stringify(options, (key, value) => 
          typeof value === 'function' ? '[Function]' : value
        )}
      >
        <canvas data-testid="chart-canvas" />
      </div>
    );
  })
}))

// Helper function to sanitize chart options for JSON serialization
function sanitizeOptionsForSerialization(options) {
  if (!options) return options;
  
  const sanitized = JSON.parse(JSON.stringify(options, (key, value) => {
    if (typeof value === 'function') {
      return '[Function]';
    }
    return value;
  }));
  
  return sanitized;
}

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => 
    Promise.resolve({
      elements: jest.fn(() => ({
        create: jest.fn(() => ({
          mount: jest.fn(),
          unmount: jest.fn(),
          destroy: jest.fn(),
          on: jest.fn(),
          off: jest.fn()
        })),
        getElement: jest.fn()
      })),
      createPaymentMethod: jest.fn(() => 
        Promise.resolve({
          paymentMethod: {
            id: 'pm_test_123',
            card: {
              brand: 'visa',
              last4: '4242'
            }
          }
        })
      ),
      confirmCardPayment: jest.fn(() => 
        Promise.resolve({
          paymentIntent: {
            id: 'pi_test_123',
            status: 'succeeded'
          }
        })
      )
    })
  )
}))

// Mock Stripe React elements
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <div data-testid="card-element">Card Element</div>,
  useStripe: () => ({
    createPaymentMethod: jest.fn(() => 
      Promise.resolve({
        paymentMethod: {
          id: 'pm_test_123',
          card: { brand: 'visa', last4: '4242' }
        }
      })
    ),
    confirmCardPayment: jest.fn(() => 
      Promise.resolve({
        paymentIntent: { id: 'pi_test_123', status: 'succeeded' }
      })
    )
  }),
  useElements: () => ({
    getElement: jest.fn(() => ({}))
  })
}))

// Mock custom Stripe utilities
jest.mock('@/lib/stripe', () => ({
  isStripeAvailable: jest.fn(() => true),
  formatCardBrand: jest.fn((brand) => brand?.charAt(0).toUpperCase() + brand?.slice(1)),
  formatLast4: jest.fn((last4) => `•••• ${last4}`),
  validateCard: jest.fn(() => ({ valid: true })),
  getStripePublishableKey: jest.fn(() => 'pk_test_mock_key')
}))

// Mock billing API
jest.mock('@/lib/billing-api', () => ({
  getCurrentSubscription: jest.fn(() => 
    Promise.resolve({
      id: 'sub_test_123',
      status: 'active',
      plan: 'pro',
      amount: 2999,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
  ),
  getPaymentHistory: jest.fn(() => 
    Promise.resolve([
      {
        id: 'inv_test_123',
        date: new Date().toISOString(),
        amount: 2999,
        status: 'paid',
        description: 'Pro Plan - Monthly'
      }
    ])
  ),
  getPaymentMethods: jest.fn(() => 
    Promise.resolve([
      {
        id: 'pm_test_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        },
        is_default: true
      }
    ])
  ),
  updateSubscription: jest.fn(() => Promise.resolve({ success: true })),
  cancelSubscription: jest.fn(() => Promise.resolve({ success: true })),
  addPaymentMethod: jest.fn(() => Promise.resolve({ success: true })),
  removePaymentMethod: jest.fn(() => Promise.resolve({ success: true })),
  setDefaultPaymentMethod: jest.fn(() => Promise.resolve({ success: true }))
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
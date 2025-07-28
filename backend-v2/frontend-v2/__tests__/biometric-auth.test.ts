/**
 * Biometric Authentication System Tests
 * Comprehensive test suite for mobile biometric authentication
 * Version: 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MobileBiometricAuthSystem, getBiometricAuthSystem, BiometricAuthConfig } from '@/lib/mobile-biometric-auth'
import { useBiometricLogin, useBiometricQuickLogin, useBiometricSetup } from '@/hooks/useBiometricLogin'

// Mock browser APIs
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15',
  platform: 'iPhone',
  credentials: {
    create: vi.fn(),
    get: vi.fn()
  }
}

const mockWindow = {
  PublicKeyCredential: {
    isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true))
  },
  TouchID: {
    isAvailable: vi.fn(() => Promise.resolve(true)),
    hasEnrolledFingerprints: vi.fn(() => Promise.resolve(true)),
    verifyFingerprint: vi.fn()
  },
  FaceID: {
    isAvailable: vi.fn(() => Promise.resolve(true)),
    hasEnrolledFaces: vi.fn(() => Promise.resolve(true)),
    authenticate: vi.fn()
  },
  crypto: {
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
    subtle: {
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32)))
    }
  }
}

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

describe('MobileBiometricAuthSystem', () => {
  let biometricAuth: MobileBiometricAuthSystem
  let originalNavigator: any
  let originalWindow: any
  let originalLocalStorage: any

  beforeEach(() => {
    // Setup mocks
    originalNavigator = global.navigator
    originalWindow = global.window
    originalLocalStorage = global.localStorage

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    })

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    // Reset mocks
    vi.clearAllMocks()

    // Create fresh instance
    biometricAuth = new MobileBiometricAuthSystem()
  })

  afterEach(() => {
    // Restore originals
    global.navigator = originalNavigator
    global.window = originalWindow
    global.localStorage = originalLocalStorage
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const status = biometricAuth.getStatus()
      expect(status.supported).toBe(true)
      expect(status.enabled).toBe(true)
    })

    it('should detect mobile platform correctly', () => {
      const status = biometricAuth.getStatus()
      expect(status.supported).toBe(true)
    })

    it('should handle unsupported platforms gracefully', () => {
      // Mock unsupported platform
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Unsupported Browser' },
        writable: true
      })

      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      })

      const auth = new MobileBiometricAuthSystem()
      const status = auth.getStatus()
      expect(status.supported).toBe(false)
    })
  })

  describe('Biometric Method Discovery', () => {
    it('should discover available fingerprint methods', async () => {
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait for async initialization
      
      const methods = biometricAuth.getAvailableMethods()
      const fingerprintMethod = methods.find(m => m.type === 'fingerprint')
      
      expect(fingerprintMethod).toBeDefined()
      expect(fingerprintMethod?.available).toBe(true)
      expect(fingerprintMethod?.enrolled).toBe(true)
    })

    it('should discover available face recognition methods', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const methods = biometricAuth.getAvailableMethods()
      const faceMethod = methods.find(m => m.type === 'face')
      
      expect(faceMethod).toBeDefined()
      expect(faceMethod?.available).toBe(true)
      expect(faceMethod?.enrolled).toBe(true)
    })

    it('should handle method discovery errors gracefully', async () => {
      // Mock API errors
      mockWindow.TouchID.isAvailable = vi.fn(() => Promise.reject(new Error('API Error')))
      
      const auth = new MobileBiometricAuthSystem()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const methods = auth.getAvailableMethods()
      expect(methods).toEqual([])
    })
  })

  describe('Authentication', () => {
    beforeEach(async () => {
      // Ensure initialization is complete
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('should authenticate successfully with fingerprint', async () => {
      mockWindow.TouchID.verifyFingerprint = vi.fn((message, success, error) => {
        setTimeout(success, 100)
      })

      const result = await biometricAuth.authenticate({ preferredMethod: 'fingerprint' })
      
      expect(result.success).toBe(true)
      expect(result.method?.type).toBe('fingerprint')
      expect(mockWindow.TouchID.verifyFingerprint).toHaveBeenCalled()
    })

    it('should authenticate successfully with face recognition', async () => {
      mockWindow.FaceID.authenticate = vi.fn((message, success, error) => {
        setTimeout(success, 100)
      })

      const result = await biometricAuth.authenticate({ preferredMethod: 'face' })
      
      expect(result.success).toBe(true)
      expect(result.method?.type).toBe('face')
      expect(mockWindow.FaceID.authenticate).toHaveBeenCalled()
    })

    it('should handle authentication failure', async () => {
      mockWindow.TouchID.verifyFingerprint = vi.fn((message, success, error) => {
        setTimeout(() => error({ localizedDescription: 'Authentication failed' }), 100)
      })

      const result = await biometricAuth.authenticate({ preferredMethod: 'fingerprint' })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Authentication failed')
    })

    it('should handle authentication timeout', async () => {
      // Mock a very slow authentication
      mockWindow.TouchID.verifyFingerprint = vi.fn((message, success, error) => {
        // Never call success or error - simulate timeout
      })

      const config: Partial<BiometricAuthConfig> = {
        timeout: 100 // Very short timeout for testing
      }

      const auth = new MobileBiometricAuthSystem(config)
      await new Promise(resolve => setTimeout(resolve, 150))

      const result = await auth.authenticate({ preferredMethod: 'fingerprint' })
      
      expect(result.success).toBe(false)
      expect(result.fallbackReason).toBe('timeout')
    })

    it('should try multiple methods if preferred fails', async () => {
      // Mock fingerprint failure and face success
      mockWindow.TouchID.verifyFingerprint = vi.fn((message, success, error) => {
        setTimeout(() => error({ localizedDescription: 'Fingerprint failed' }), 50)
      })

      mockWindow.FaceID.authenticate = vi.fn((message, success, error) => {
        setTimeout(success, 50)
      })

      const result = await biometricAuth.authenticate({ preferredMethod: 'fingerprint' })
      
      expect(result.success).toBe(true)
      expect(result.method?.type).toBe('face')
    })
  })

  describe('WebAuthn Integration', () => {
    it('should register new biometric credential', async () => {
      const mockCredential = {
        id: 'test-credential-id',
        response: {
          getPublicKey: () => new ArrayBuffer(65)
        }
      }

      mockNavigator.credentials.create = vi.fn(() => Promise.resolve(mockCredential))

      const credential = await biometricAuth.registerBiometric('test-user-123')
      
      expect(credential.id).toBe('test-credential-id')
      expect(credential.type).toBe('fingerprint')
      expect(mockNavigator.credentials.create).toHaveBeenCalled()
    })

    it('should authenticate using WebAuthn', async () => {
      // First register a credential
      const mockCredential = {
        id: 'test-credential-id',
        response: {
          getPublicKey: () => new ArrayBuffer(65)
        }
      }

      mockNavigator.credentials.create = vi.fn(() => Promise.resolve(mockCredential))
      await biometricAuth.registerBiometric('test-user-123')

      // Now authenticate
      mockNavigator.credentials.get = vi.fn(() => Promise.resolve(mockCredential))

      const result = await biometricAuth.authenticate()
      
      expect(result.success).toBe(true)
      expect(mockNavigator.credentials.get).toHaveBeenCalled()
    })

    it('should handle WebAuthn registration failure', async () => {
      mockNavigator.credentials.create = vi.fn(() => Promise.reject(new Error('Registration failed')))

      await expect(biometricAuth.registerBiometric('test-user-123')).rejects.toThrow('Biometric registration failed')
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        enabled: false,
        maxRetries: 5,
        timeout: 60000
      }

      biometricAuth.updateConfig(newConfig)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'biometric_auth_config',
        expect.stringContaining('"enabled":false')
      )
    })

    it('should respect secureBiometricOnly setting', () => {
      const config: Partial<BiometricAuthConfig> = {
        secureBiometricOnly: true
      }

      const auth = new MobileBiometricAuthSystem(config)
      const methods = auth.getAvailableMethods()
      
      // Should only include secure methods
      methods.forEach(method => {
        expect(method.secure).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing biometric enrollment gracefully', async () => {
      mockWindow.TouchID.hasEnrolledFingerprints = vi.fn(() => Promise.resolve(false))
      
      const auth = new MobileBiometricAuthSystem()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const methods = auth.getAvailableMethods()
      const fingerprintMethod = methods.find(m => m.type === 'fingerprint')
      
      expect(fingerprintMethod?.enrolled).toBe(false)
    })

    it('should handle API not available errors', async () => {
      mockWindow.TouchID.isAvailable = vi.fn(() => Promise.resolve(false))
      
      const auth = new MobileBiometricAuthSystem()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const methods = auth.getAvailableMethods()
      const fingerprintMethod = methods.find(m => m.type === 'fingerprint')
      
      expect(fingerprintMethod?.available).toBe(false)
    })
  })

  describe('Analytics and Tracking', () => {
    it('should track successful authentication', async () => {
      mockWindow.TouchID.verifyFingerprint = vi.fn((message, success, error) => {
        setTimeout(success, 50)
      })

      await biometricAuth.authenticate({ preferredMethod: 'fingerprint' })
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'last_biometric_auth',
        expect.stringContaining('"type":"biometric_auth_success"')
      )
    })
  })
})

describe('useBiometricLogin Hook', () => {
  beforeEach(() => {
    // Setup mocks for hook tests
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    })

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    vi.clearAllMocks()
  })

  it('should provide correct initial state', () => {
    const { result } = renderHook(() => useBiometricLogin())
    
    expect(result.current.isSupported).toBe(true)
    expect(result.current.isEnabled).toBe(true)
    expect(result.current.isAuthenticating).toBe(false)
  })

  it('should handle authentication', async () => {
    mockWindow.TouchID.verifyFingerprint = vi.fn((message, success, error) => {
      setTimeout(success, 50)
    })

    const { result } = renderHook(() => useBiometricLogin())
    
    await act(async () => {
      const authResult = await result.current.authenticate('fingerprint')
      expect(authResult.success).toBe(true)
    })
  })

  it('should handle biometric enablement', async () => {
    const mockCredential = {
      id: 'test-credential',
      response: {
        getPublicKey: () => new ArrayBuffer(65)
      }
    }

    mockNavigator.credentials.create = vi.fn(() => Promise.resolve(mockCredential))

    const { result } = renderHook(() => useBiometricLogin())
    
    await act(async () => {
      const success = await result.current.enableBiometric('test-user')
      expect(success).toBe(true)
    })
  })
})

describe('useBiometricQuickLogin Hook', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    })

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    vi.clearAllMocks()
  })

  it('should provide quick login functionality', () => {
    const { result } = renderHook(() => useBiometricQuickLogin())
    
    expect(result.current.isQuickLoginAvailable).toBe(true)
    expect(typeof result.current.quickLogin).toBe('function')
  })

  it('should perform quick login successfully', async () => {
    mockWindow.TouchID.verifyFingerprint = vi.fn((message, success, error) => {
      setTimeout(success, 50)
    })

    const { result } = renderHook(() => useBiometricQuickLogin())
    
    await act(async () => {
      const success = await result.current.quickLogin()
      expect(success).toBe(true)
    })
  })
})

describe('useBiometricSetup Hook', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    })

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    vi.clearAllMocks()
  })

  it('should provide setup functionality', () => {
    const { result } = renderHook(() => useBiometricSetup())
    
    expect(result.current.isSetupAvailable).toBe(true)
    expect(typeof result.current.startSetup).toBe('function')
  })

  it('should handle setup process', async () => {
    const mockCredential = {
      id: 'setup-test-credential',
      response: {
        getPublicKey: () => new ArrayBuffer(65)
      }
    }

    mockNavigator.credentials.create = vi.fn(() => Promise.resolve(mockCredential))

    const { result } = renderHook(() => useBiometricSetup())
    
    await act(async () => {
      const success = await result.current.startSetup('setup-test-user')
      expect(success).toBe(true)
    })

    expect(result.current.setupStep).toBe('complete')
  })
})
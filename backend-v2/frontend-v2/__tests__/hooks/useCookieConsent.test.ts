/**
 * Comprehensive tests for useCookieConsent hook
 * Tests localStorage integration, API communication, state management, and error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import useCookieConsent, { type CookieCategories, type ConsentPreferences } from '@/hooks/useCookieConsent'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock console methods to avoid noise in tests
const consoleSpy = {
  warn: jest.spyOn(console, 'warn').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
}

describe('useCookieConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  afterAll(() => {
    consoleSpy.warn.mockRestore()
    consoleSpy.error.mockRestore()
  })

  describe('Initial State', () => {
    it('starts with default preferences when no stored data', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual({
        categories: {
          necessary: true,
          analytics: false,
          marketing: false,
          functional: false,
        },
        consentDate: '',
        version: '1.0',
        hasConsented: false,
      })
      expect(result.current.shouldShowBanner).toBe(true)
    })

    it('loads stored preferences from localStorage', async () => {
      const storedPreferences: ConsentPreferences = {
        categories: {
          necessary: true,
          analytics: true,
          marketing: false,
          functional: true,
        },
        consentDate: '2025-07-03T10:00:00.000Z',
        version: '1.0',
        hasConsented: true,
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedPreferences))

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(storedPreferences)
      expect(result.current.shouldShowBanner).toBe(false)
    })

    it('resets preferences when version mismatch', async () => {
      const outdatedPreferences = {
        categories: {
          necessary: true,
          analytics: true,
          marketing: true,
          functional: true,
        },
        consentDate: '2025-07-01T10:00:00.000Z',
        version: '0.9', // Old version
        hasConsented: true,
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(outdatedPreferences))

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences.hasConsented).toBe(false)
      expect(result.current.shouldShowBanner).toBe(true)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cookie-consent-preferences')
    })

    it('handles corrupted localStorage data gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json')

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences.hasConsented).toBe(false)
      expect(result.current.shouldShowBanner).toBe(true)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cookie-consent-preferences')
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Error loading cookie consent preferences:',
        expect.any(Error)
      )
    })
  })

  describe('Accept All Functionality', () => {
    it('accepts all cookies and saves preferences', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.acceptAll()
      })

      expect(result.current.preferences.categories).toEqual({
        necessary: true,
        analytics: true,
        marketing: true,
        functional: true,
      })
      expect(result.current.preferences.hasConsented).toBe(true)
      expect(result.current.preferences.version).toBe('1.0')
      expect(result.current.preferences.consentDate).toBeTruthy()
      expect(result.current.shouldShowBanner).toBe(false)
    })

    it('saves to localStorage when accepting all', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.acceptAll()
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cookie-consent-preferences',
        expect.stringContaining('"hasConsented":true')
      )
    })

    it('calls API when accepting all', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.acceptAll()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/v2/privacy/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: expect.stringContaining('"analytics":true'),
      })
    })

    it('handles API failure gracefully during accept all', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.acceptAll()
      })

      // Should still update local state despite API failure
      expect(result.current.preferences.hasConsented).toBe(true)
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to save consent to API:',
        expect.any(Error)
      )
    })
  })

  describe('Reject All Functionality', () => {
    it('rejects non-essential cookies and saves preferences', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.rejectAll()
      })

      expect(result.current.preferences.categories).toEqual({
        necessary: true,
        analytics: false,
        marketing: false,
        functional: false,
      })
      expect(result.current.preferences.hasConsented).toBe(true)
      expect(result.current.shouldShowBanner).toBe(false)
    })

    it('saves reject all preferences to localStorage', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.rejectAll()
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cookie-consent-preferences',
        expect.stringContaining('"analytics":false')
      )
    })
  })

  describe('Update Consent Functionality', () => {
    it('updates specific categories while preserving others', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.updateConsent({
          analytics: true,
          marketing: false,
        })
      })

      expect(result.current.preferences.categories).toEqual({
        necessary: true,
        analytics: true,
        marketing: false,
        functional: false, // Unchanged
      })
      expect(result.current.preferences.hasConsented).toBe(true)
    })

    it('always keeps necessary cookies enabled', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.updateConsent({
          necessary: false, // Should be ignored
          analytics: true,
        })
      })

      expect(result.current.preferences.categories.necessary).toBe(true)
      expect(result.current.preferences.categories.analytics).toBe(true)
    })

    it('updates consent date when updating preferences', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const beforeDate = new Date().toISOString()

      await act(async () => {
        await result.current.updateConsent({ analytics: true })
      })

      const afterDate = new Date().toISOString()
      const consentDate = result.current.preferences.consentDate

      expect(consentDate).toBeGreaterThanOrEqual(beforeDate)
      expect(consentDate).toBeLessThanOrEqual(afterDate)
    })
  })

  describe('Consent Checking', () => {
    it('returns correct consent status for categories', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Before consent
      expect(result.current.hasConsent('analytics')).toBe(false)
      expect(result.current.hasConsent('necessary')).toBe(false) // No consent given yet

      await act(async () => {
        await result.current.updateConsent({
          analytics: true,
          marketing: false,
        })
      })

      // After consent
      expect(result.current.hasConsent('necessary')).toBe(true)
      expect(result.current.hasConsent('analytics')).toBe(true)
      expect(result.current.hasConsent('marketing')).toBe(false)
      expect(result.current.hasConsent('functional')).toBe(false)
    })

    it('provides convenience flags for script loading', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.updateConsent({
          analytics: true,
          marketing: false,
          functional: true,
        })
      })

      expect(result.current.canLoadAnalytics).toBe(true)
      expect(result.current.canLoadMarketing).toBe(false)
      expect(result.current.canLoadFunctional).toBe(true)
    })
  })

  describe('Reset Functionality', () => {
    it('resets all consent data', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // First set some consent
      await act(async () => {
        await result.current.acceptAll()
      })

      expect(result.current.preferences.hasConsented).toBe(true)

      // Then reset
      act(() => {
        result.current.resetConsent()
      })

      expect(result.current.preferences.hasConsented).toBe(false)
      expect(result.current.shouldShowBanner).toBe(true)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cookie-consent-preferences')
    })
  })

  describe('Consent History', () => {
    it('retrieves empty history when none exists', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const history = result.current.getConsentHistory()
      expect(history).toEqual([])
    })

    it('retrieves stored consent history', async () => {
      const mockHistory = [
        {
          categories: { necessary: true, analytics: false, marketing: false, functional: false },
          consentDate: '2025-07-01T10:00:00.000Z',
          version: '1.0',
          hasConsented: true,
        },
      ]

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'cookie-consent-history') {
          return JSON.stringify(mockHistory)
        }
        return null
      })

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const history = result.current.getConsentHistory()
      expect(history).toEqual(mockHistory)
    })

    it('handles corrupted history data gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'cookie-consent-history') {
          return 'invalid-json'
        }
        return null
      })

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const history = result.current.getConsentHistory()
      expect(history).toEqual([])
    })

    it('saves consent to history when preferences change', async () => {
      mockLocalStorage.getItem.mockReturnValue('[]') // Empty history

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.acceptAll()
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cookie-consent-history',
        expect.stringContaining('"hasConsented":true')
      )
    })

    it('limits history to 10 entries', async () => {
      // Create 12 entries (should keep only last 10)
      const mockHistory = Array.from({ length: 12 }, (_, i) => ({
        categories: { necessary: true, analytics: false, marketing: false, functional: false },
        consentDate: `2025-07-0${(i % 9) + 1}T10:00:00.000Z`,
        version: '1.0',
        hasConsented: true,
      }))

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'cookie-consent-history') {
          return JSON.stringify(mockHistory)
        }
        return null
      })

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.acceptAll()
      })

      // Should save history with only 10 entries (original 12 + new one, then sliced to 10)
      const savedHistoryCall = mockLocalStorage.setItem.mock.calls.find(
        call => call[0] === 'cookie-consent-history'
      )
      expect(savedHistoryCall).toBeDefined()
      
      const savedHistory = JSON.parse(savedHistoryCall[1])
      expect(savedHistory).toHaveLength(10)
    })
  })

  describe('Loading and Saving States', () => {
    it('shows loading state initially', () => {
      const { result } = renderHook(() => useCookieConsent())
      expect(result.current.isLoading).toBe(true)
    })

    it('shows saving state during operations', async () => {
      // Mock a slow API response
      mockFetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100)
      }))

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start accept all (don't await)
      act(() => {
        result.current.acceptAll()
      })

      expect(result.current.isSaving).toBe(true)

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('handles localStorage save errors', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.acceptAll()
        })
      ).rejects.toThrow('Storage quota exceeded')

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error saving cookie consent preferences:',
        expect.any(Error)
      )
    })

    it('continues when API call fails but localStorage succeeds', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.acceptAll()
      })

      // Should still update state
      expect(result.current.preferences.hasConsented).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to save consent to API:',
        expect.any(Error)
      )
    })

    it('handles history save errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation((key) => {
        if (key === 'cookie-consent-history') {
          throw new Error('Storage error')
        }
        // Allow preference storage to work
      })

      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.acceptAll()
      })

      // Should still update preferences
      expect(result.current.preferences.hasConsented).toBe(true)
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Error saving consent history:',
        expect.any(Error)
      )
    })
  })

  describe('Edge Cases', () => {
    it('handles partial category updates correctly', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Set initial state
      await act(async () => {
        await result.current.updateConsent({
          analytics: true,
          marketing: true,
          functional: true,
        })
      })

      // Partial update
      await act(async () => {
        await result.current.updateConsent({
          marketing: false,
        })
      })

      expect(result.current.preferences.categories).toEqual({
        necessary: true,
        analytics: true,   // Unchanged
        marketing: false,  // Updated
        functional: true,  // Unchanged
      })
    })

    it('handles empty category updates', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCategories = result.current.preferences.categories

      await act(async () => {
        await result.current.updateConsent({})
      })

      expect(result.current.preferences.categories).toEqual({
        ...initialCategories,
        necessary: true, // Always enforced
      })
      expect(result.current.preferences.hasConsented).toBe(true)
    })

    it('handles concurrent operations', async () => {
      const { result } = renderHook(() => useCookieConsent())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start multiple operations simultaneously
      const promises = [
        act(async () => await result.current.acceptAll()),
        act(async () => await result.current.updateConsent({ analytics: false })),
      ]

      await Promise.all(promises)

      // Should end up in a consistent state
      expect(result.current.preferences.hasConsented).toBe(true)
      expect(result.current.preferences.categories.necessary).toBe(true)
    })
  })
})
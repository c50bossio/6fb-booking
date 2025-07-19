'use client'

import { useState, useEffect, useCallback } from 'react'

// Cookie consent categories
export interface CookieCategories {
  necessary: boolean      // Always true, cannot be disabled
  analytics: boolean      // Google Analytics, tracking
  marketing: boolean      // Meta Pixel, advertising
  functional: boolean     // Calendar integration, preferences
}

export interface ConsentPreferences {
  categories: CookieCategories
  consentDate: string
  version: string
  hasConsented: boolean
}

// Default consent state
const defaultCategories: CookieCategories = {
  necessary: true,      // Always required
  analytics: false,
  marketing: false,
  functional: false,
}

const CONSENT_VERSION = '1.0'
const STORAGE_KEY = 'cookie-consent-preferences'

export const useCookieConsent = () => {
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    categories: defaultCategories,
    consentDate: '',
    version: CONSENT_VERSION,
    hasConsented: false,
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Mount effect to prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (!mounted) return
    
    const loadPreferences = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed: ConsentPreferences = JSON.parse(stored)
          
          // Check if version matches, reset if not
          if (parsed.version === CONSENT_VERSION) {
            setPreferences(parsed)
          } else {
            // Version mismatch, reset consent
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [mounted])

  // Save preferences to localStorage and API
  const savePreferences = useCallback(async (newPreferences: ConsentPreferences) => {
    setIsSaving(true)
    
    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences))
      
      // Update state
      setPreferences(newPreferences)
      
      // Save to backend API (optional, for compliance tracking)
      try {
        await fetch('/api/v2/privacy/consent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            categories: newPreferences.categories,
            consentDate: newPreferences.consentDate,
            version: newPreferences.version,
          }),
        })
      } catch (apiError) {
        // API save failed, but localStorage succeeded
        }
      
    } catch (error) {
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Accept all cookies
  const acceptAll = useCallback(async () => {
    const newPreferences: ConsentPreferences = {
      categories: {
        necessary: true,
        analytics: true,
        marketing: true,
        functional: true,
      },
      consentDate: new Date().toISOString(),
      version: CONSENT_VERSION,
      hasConsented: true,
    }
    
    await savePreferences(newPreferences)
  }, [savePreferences])

  // Reject non-essential cookies
  const rejectAll = useCallback(async () => {
    const newPreferences: ConsentPreferences = {
      categories: {
        necessary: true,
        analytics: false,
        marketing: false,
        functional: false,
      },
      consentDate: new Date().toISOString(),
      version: CONSENT_VERSION,
      hasConsented: true,
    }
    
    await savePreferences(newPreferences)
  }, [savePreferences])

  // Update specific categories
  const updateConsent = useCallback(async (categories: Partial<CookieCategories>) => {
    const newPreferences: ConsentPreferences = {
      categories: {
        ...preferences.categories,
        ...categories,
        necessary: true, // Always keep necessary true
      },
      consentDate: new Date().toISOString(),
      version: CONSENT_VERSION,
      hasConsented: true,
    }
    
    await savePreferences(newPreferences)
  }, [preferences.categories, savePreferences])

  // Check if user has consent for specific category
  const hasConsent = useCallback((category: keyof CookieCategories): boolean => {
    return preferences.hasConsented && preferences.categories[category]
  }, [preferences])

  // Check if consent banner should be shown
  const shouldShowBanner = !preferences.hasConsented && !isLoading

  // Reset all consent (for testing or re-consent)
  const resetConsent = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setPreferences({
      categories: defaultCategories,
      consentDate: '',
      version: CONSENT_VERSION,
      hasConsented: false,
    })
  }, [])

  // Get consent history (for privacy dashboard)
  const getConsentHistory = useCallback((): ConsentPreferences[] => {
    try {
      const history = localStorage.getItem('cookie-consent-history')
      return history ? JSON.parse(history) : []
    } catch {
      return []
    }
  }, [])

  // Save to consent history
  useEffect(() => {
    if (preferences.hasConsented) {
      try {
        const history = getConsentHistory()
        const newHistory = [...history, preferences].slice(-10) // Keep last 10 entries
        localStorage.setItem('cookie-consent-history', JSON.stringify(newHistory))
      } catch (error) {
        }
    }
  }, [preferences, getConsentHistory])

  return {
    // State
    preferences,
    isLoading,
    isSaving,
    shouldShowBanner,
    
    // Actions
    acceptAll,
    rejectAll,
    updateConsent,
    resetConsent,
    
    // Helpers
    hasConsent,
    getConsentHistory,
    
    // For external script loading
    canLoadAnalytics: hasConsent('analytics'),
    canLoadMarketing: hasConsent('marketing'),
    canLoadFunctional: hasConsent('functional'),
  }
}

export default useCookieConsent
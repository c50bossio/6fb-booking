/**
 * useRegistrationPersistence - Comprehensive registration data persistence hook
 * 
 * Features:
 * - Auto-save registration data to localStorage with debouncing
 * - Step persistence to remember user's progress
 * - Data recovery prompts for returning users
 * - Security measures excluding sensitive data from persistence
 * - Data expiration and cleanup mechanisms
 * - TypeScript interfaces and comprehensive error handling
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounce } from './useDebounce'
import { RegistrationData, RegistrationStep } from '@/components/registration/MultiStepRegistration'

// Storage configuration
const STORAGE_KEY = 'bookedbarber_registration_progress'
const STORAGE_VERSION = '1.0.0'
const EXPIRATION_HOURS = 24
const AUTO_SAVE_DELAY = 2500 // 2.5 seconds

// TypeScript interfaces for persisted data
interface PersistedRegistrationData {
  version: string
  timestamp: number
  expiresAt: number
  currentStep: RegistrationStep
  data: Omit<RegistrationData, 'accountInfo'> & {
    accountInfo: Omit<RegistrationData['accountInfo'], 'password' | 'confirmPassword'>
  }
  sessionId: string
}

interface PersistenceState {
  isLoading: boolean
  hasStoredData: boolean
  isAutoSaving: boolean
  lastSaved: Date | null
  error: string | null
}

interface RecoveryPromptData {
  hasData: boolean
  stepNumber: number
  businessName: string
  savedAt: Date
  isExpired: boolean
}

interface UsePersistenceOptions {
  enableAutoSave?: boolean
  autoSaveDelay?: number
  onDataRecovered?: (data: RegistrationData, step: RegistrationStep) => void
  onRecoveryPrompt?: (promptData: RecoveryPromptData) => Promise<boolean>
}

export interface RegistrationPersistence {
  // State
  persistenceState: PersistenceState
  recoveryPrompt: RecoveryPromptData | null
  
  // Core persistence functions
  saveProgress: (data: RegistrationData, step: RegistrationStep) => Promise<boolean>
  loadProgress: () => Promise<{ data: RegistrationData; step: RegistrationStep } | null>
  clearProgress: () => Promise<boolean>
  
  // Auto-save management
  enableAutoSave: (data: RegistrationData, step: RegistrationStep) => void
  disableAutoSave: () => void
  
  // Recovery and prompt handling
  checkForStoredData: () => Promise<RecoveryPromptData | null>
  acceptRecovery: () => Promise<{ data: RegistrationData; step: RegistrationStep } | null>
  declineRecovery: () => Promise<boolean>
  
  // Utility functions
  getStorageInfo: () => { size: number; lastModified: Date | null; isExpired: boolean }
  validateStorageAvailability: () => { available: boolean; quota?: number; usage?: number }
}

export function useRegistrationPersistence(options: UsePersistenceOptions = {}): RegistrationPersistence {
  const {
    enableAutoSave: enableAutoSaveOption = true,
    autoSaveDelay = AUTO_SAVE_DELAY,
    onDataRecovered,
    onRecoveryPrompt
  } = options

  // State management
  const [persistenceState, setPersistenceState] = useState<PersistenceState>({
    isLoading: false,
    hasStoredData: false,
    isAutoSaving: false,
    lastSaved: null,
    error: null
  })

  const [recoveryPrompt, setRecoveryPrompt] = useState<RecoveryPromptData | null>(null)
  const autoSaveEnabledRef = useRef(false)
  const sessionIdRef = useRef<string>(generateSessionId())

  // Generate unique session ID
  function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Storage availability validation
  const validateStorageAvailability = useCallback((): { available: boolean; quota?: number; usage?: number } => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return { available: false }
      }

      // Test write capability
      const testKey = '_storage_test_'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)

      // Check quota (if supported)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          return {
            available: true,
            quota: estimate.quota,
            usage: estimate.usage
          }
        }).catch(() => ({ available: true }))
      }

      return { available: true }
    } catch (error) {
      console.warn('[RegistrationPersistence] localStorage not available:', error)
      return { available: false }
    }
  }, [])

  // Sanitize data for storage (remove sensitive information)
  const sanitizeDataForStorage = useCallback((data: RegistrationData): PersistedRegistrationData['data'] => {
    const sanitized = {
      ...data,
      accountInfo: {
        ...data.accountInfo,
        // Exclude sensitive fields
        password: undefined,
        confirmPassword: undefined
      }
    }

    // Remove undefined values
    delete (sanitized.accountInfo as any).password
    delete (sanitized.accountInfo as any).confirmPassword

    return sanitized as PersistedRegistrationData['data']
  }, [])

  // Create full persisted data structure
  const createPersistedData = useCallback((
    data: RegistrationData,
    step: RegistrationStep
  ): PersistedRegistrationData => {
    const now = Date.now()
    return {
      version: STORAGE_VERSION,
      timestamp: now,
      expiresAt: now + (EXPIRATION_HOURS * 60 * 60 * 1000),
      currentStep: step,
      data: sanitizeDataForStorage(data),
      sessionId: sessionIdRef.current
    }
  }, [sanitizeDataForStorage])

  // Check if stored data is expired
  const isDataExpired = useCallback((persistedData: PersistedRegistrationData): boolean => {
    return Date.now() > persistedData.expiresAt
  }, [])

  // Core save function
  const saveProgress = useCallback(async (
    data: RegistrationData,
    step: RegistrationStep
  ): Promise<boolean> => {
    try {
      setPersistenceState(prev => ({ ...prev, isAutoSaving: true, error: null }))

      const storageCheck = validateStorageAvailability()
      if (!storageCheck.available) {
        throw new Error('localStorage is not available')
      }

      const persistedData = createPersistedData(data, step)
      const dataString = JSON.stringify(persistedData)

      // Check storage quota before saving
      if (dataString.length > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Registration data exceeds storage limit')
      }

      localStorage.setItem(STORAGE_KEY, dataString)

      setPersistenceState(prev => ({
        ...prev,
        isAutoSaving: false,
        hasStoredData: true,
        lastSaved: new Date(),
        error: null
      }))

      return true
    } catch (error) {
      console.error('[RegistrationPersistence] Save failed:', error)
      setPersistenceState(prev => ({
        ...prev,
        isAutoSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save progress'
      }))
      return false
    }
  }, [validateStorageAvailability, createPersistedData])

  // Core load function
  const loadProgress = useCallback(async (): Promise<{ data: RegistrationData; step: RegistrationStep } | null> => {
    try {
      setPersistenceState(prev => ({ ...prev, isLoading: true, error: null }))

      const storageCheck = validateStorageAvailability()
      if (!storageCheck.available) {
        return null
      }

      const storedData = localStorage.getItem(STORAGE_KEY)
      if (!storedData) {
        setPersistenceState(prev => ({ ...prev, isLoading: false, hasStoredData: false }))
        return null
      }

      const persistedData: PersistedRegistrationData = JSON.parse(storedData)

      // Check version compatibility
      if (persistedData.version !== STORAGE_VERSION) {
        console.warn('[RegistrationPersistence] Version mismatch, clearing old data')
        localStorage.removeItem(STORAGE_KEY)
        setPersistenceState(prev => ({ ...prev, isLoading: false, hasStoredData: false }))
        return null
      }

      // Check expiration
      if (isDataExpired(persistedData)) {
        console.info('[RegistrationPersistence] Data expired, clearing')
        localStorage.removeItem(STORAGE_KEY)
        setPersistenceState(prev => ({ ...prev, isLoading: false, hasStoredData: false }))
        return null
      }

      // Reconstruct full registration data with empty sensitive fields
      const fullData: RegistrationData = {
        ...persistedData.data,
        accountInfo: {
          ...persistedData.data.accountInfo,
          password: '',
          confirmPassword: ''
        }
      }

      setPersistenceState(prev => ({
        ...prev,
        isLoading: false,
        hasStoredData: true,
        lastSaved: new Date(persistedData.timestamp)
      }))

      return {
        data: fullData,
        step: persistedData.currentStep
      }
    } catch (error) {
      console.error('[RegistrationPersistence] Load failed:', error)
      setPersistenceState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load progress'
      }))
      
      // Clear corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (clearError) {
        console.error('[RegistrationPersistence] Failed to clear corrupted data:', clearError)
      }
      
      return null
    }
  }, [validateStorageAvailability, isDataExpired])

  // Clear stored progress
  const clearProgress = useCallback(async (): Promise<boolean> => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setPersistenceState(prev => ({
        ...prev,
        hasStoredData: false,
        lastSaved: null,
        error: null
      }))
      setRecoveryPrompt(null)
      return true
    } catch (error) {
      console.error('[RegistrationPersistence] Clear failed:', error)
      setPersistenceState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear progress'
      }))
      return false
    }
  }, [])

  // Debounced auto-save function
  const debouncedSave = useDebounce(
    useCallback(async (data: RegistrationData, step: RegistrationStep) => {
      if (autoSaveEnabledRef.current) {
        await saveProgress(data, step)
      }
    }, [saveProgress]),
    autoSaveDelay
  )

  // Enable auto-save
  const enableAutoSave = useCallback((data: RegistrationData, step: RegistrationStep) => {
    if (enableAutoSaveOption) {
      autoSaveEnabledRef.current = true
      debouncedSave(data, step)
    }
  }, [enableAutoSaveOption, debouncedSave])

  // Disable auto-save
  const disableAutoSave = useCallback(() => {
    autoSaveEnabledRef.current = false
  }, [])

  // Check for stored data and create recovery prompt
  const checkForStoredData = useCallback(async (): Promise<RecoveryPromptData | null> => {
    try {
      const storageCheck = validateStorageAvailability()
      if (!storageCheck.available) {
        return null
      }

      const storedData = localStorage.getItem(STORAGE_KEY)
      if (!storedData) {
        return null
      }

      const persistedData: PersistedRegistrationData = JSON.parse(storedData)
      const isExpired = isDataExpired(persistedData)

      if (isExpired) {
        // Clean up expired data
        localStorage.removeItem(STORAGE_KEY)
        return null
      }

      const promptData: RecoveryPromptData = {
        hasData: true,
        stepNumber: persistedData.currentStep,
        businessName: persistedData.data.businessInfo.businessName || 'Your Business',
        savedAt: new Date(persistedData.timestamp),
        isExpired
      }

      setRecoveryPrompt(promptData)
      return promptData
    } catch (error) {
      console.error('[RegistrationPersistence] Check for stored data failed:', error)
      return null
    }
  }, [validateStorageAvailability, isDataExpired])

  // Accept recovery and load data
  const acceptRecovery = useCallback(async (): Promise<{ data: RegistrationData; step: RegistrationStep } | null> => {
    const result = await loadProgress()
    if (result && onDataRecovered) {
      onDataRecovered(result.data, result.step)
    }
    setRecoveryPrompt(null)
    return result
  }, [loadProgress, onDataRecovered])

  // Decline recovery and clear data
  const declineRecovery = useCallback(async (): Promise<boolean> => {
    const success = await clearProgress()
    setRecoveryPrompt(null)
    return success
  }, [clearProgress])

  // Get storage information
  const getStorageInfo = useCallback(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY)
      if (!storedData) {
        return { size: 0, lastModified: null, isExpired: false }
      }

      const persistedData: PersistedRegistrationData = JSON.parse(storedData)
      return {
        size: new Blob([storedData]).size,
        lastModified: new Date(persistedData.timestamp),
        isExpired: isDataExpired(persistedData)
      }
    } catch (error) {
      console.error('[RegistrationPersistence] Get storage info failed:', error)
      return { size: 0, lastModified: null, isExpired: false }
    }
  }, [isDataExpired])

  // Initialize and check for existing data on mount
  useEffect(() => {
    let isMounted = true
    
    const initializePersistence = async () => {
      if (!isMounted) return
      await checkForStoredData()
    }

    initializePersistence()
    
    return () => {
      isMounted = false
    }
  }, [])

  // Cleanup expired data on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForStoredData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableAutoSave()
    }
  }, [disableAutoSave])

  return {
    persistenceState,
    recoveryPrompt,
    saveProgress,
    loadProgress,
    clearProgress,
    enableAutoSave,
    disableAutoSave,
    checkForStoredData,
    acceptRecovery,
    declineRecovery,
    getStorageInfo,
    validateStorageAvailability
  }
}

export default useRegistrationPersistence
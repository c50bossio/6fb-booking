/**
 * Biometric Login Hook
 * React hook for integrating biometric authentication with existing auth system
 * Version: 1.0.0
 */

import { useState, useCallback, useEffect } from 'react'
import { useBiometricAuth } from '@/lib/mobile-biometric-auth'
import type { BiometricAuthResult, BiometricMethod } from '@/lib/mobile-biometric-auth'

interface BiometricLoginState {
  isSupported: boolean
  isEnabled: boolean
  isAuthenticating: boolean
  hasCredentials: boolean
  availableMethods: BiometricMethod[]
  lastResult: BiometricAuthResult | null
  error: string | null
}

interface BiometricLoginActions {
  authenticate: (preferredMethod?: string) => Promise<BiometricAuthResult>
  enableBiometric: (userId: string) => Promise<boolean>
  disableBiometric: () => Promise<void>
  clearError: () => void
  refreshStatus: () => void
}

export interface UseBiometricLoginReturn extends BiometricLoginState, BiometricLoginActions {}

/**
 * Hook for biometric login integration
 */
export function useBiometricLogin(): UseBiometricLoginReturn {
  const { 
    authenticate: biometricAuthenticate,
    register: biometricRegister,
    getStatus,
    getAvailableMethods,
    updateConfig
  } = useBiometricAuth()

  const [state, setState] = useState<BiometricLoginState>({
    isSupported: false,
    isEnabled: false,
    isAuthenticating: false,
    hasCredentials: false,
    availableMethods: [],
    lastResult: null,
    error: null
  })

  // Load initial status
  useEffect(() => {
    loadBiometricStatus()
  }, [])

  const loadBiometricStatus = useCallback(() => {
    try {
      const status = getStatus()
      const methods = getAvailableMethods()

      setState(prev => ({
        ...prev,
        isSupported: status.supported,
        isEnabled: status.enabled,
        hasCredentials: status.hasCredentials,
        availableMethods: methods,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to load biometric status: ${error.message}`
      }))
    }
  }, [getStatus, getAvailableMethods])

  /**
   * Authenticate using biometrics
   */
  const authenticate = useCallback(async (preferredMethod?: string): Promise<BiometricAuthResult> => {
    if (!state.isSupported || !state.isEnabled) {
      const result: BiometricAuthResult = {
        success: false,
        error: 'Biometric authentication not available',
        fallbackReason: 'not_available',
        timestamp: Date.now()
      }
      setState(prev => ({ ...prev, lastResult: result }))
      return result
    }

    setState(prev => ({ 
      ...prev, 
      isAuthenticating: true, 
      error: null 
    }))

    try {
      const result = await biometricAuthenticate({
        preferredMethod: preferredMethod as any,
        allowFallback: true
      })

      setState(prev => ({ 
        ...prev, 
        isAuthenticating: false,
        lastResult: result,
        error: result.success ? null : result.error || 'Authentication failed'
      }))

      // Track authentication attempt
      await trackBiometricAttempt(result)

      return result
    } catch (error) {
      const result: BiometricAuthResult = {
        success: false,
        error: error.message,
        fallbackReason: 'failed',
        timestamp: Date.now()
      }

      setState(prev => ({ 
        ...prev, 
        isAuthenticating: false,
        lastResult: result,
        error: error.message
      }))

      return result
    }
  }, [state.isSupported, state.isEnabled, biometricAuthenticate])

  /**
   * Enable biometric authentication for user
   */
  const enableBiometric = useCallback(async (userId: string): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Biometric authentication not supported' }))
      return false
    }

    setState(prev => ({ ...prev, error: null }))

    try {
      // Register biometric credential
      const credential = await biometricRegister(userId)
      
      // Update configuration to enable biometric auth
      updateConfig({ enabled: true })

      // Refresh status
      loadBiometricStatus()

      // Track enablement
      await trackBiometricEnablement(userId, credential.type)

      return true
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }))
      return false
    }
  }, [state.isSupported, biometricRegister, updateConfig, loadBiometricStatus])

  /**
   * Disable biometric authentication
   */
  const disableBiometric = useCallback(async (): Promise<void> => {
    try {
      // Update configuration to disable biometric auth
      updateConfig({ enabled: false })

      // Clear stored credentials
      localStorage.removeItem('biometric_credentials')

      // Refresh status
      loadBiometricStatus()

      // Track disablement
      await trackBiometricDisablement()

      setState(prev => ({ 
        ...prev, 
        error: null,
        lastResult: null
      }))
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }))
    }
  }, [updateConfig, loadBiometricStatus])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  /**
   * Refresh biometric status
   */
  const refreshStatus = useCallback(() => {
    loadBiometricStatus()
  }, [loadBiometricStatus])

  return {
    // State
    isSupported: state.isSupported,
    isEnabled: state.isEnabled,
    isAuthenticating: state.isAuthenticating,
    hasCredentials: state.hasCredentials,
    availableMethods: state.availableMethods,
    lastResult: state.lastResult,
    error: state.error,

    // Actions
    authenticate,
    enableBiometric,
    disableBiometric,
    clearError,
    refreshStatus
  }
}

/**
 * Hook for biometric quick login (simplified interface)
 */
export function useBiometricQuickLogin() {
  const { 
    authenticate, 
    isSupported, 
    isEnabled, 
    hasCredentials, 
    isAuthenticating, 
    error 
  } = useBiometricLogin()

  /**
   * Attempt quick biometric login
   */
  const quickLogin = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !isEnabled || !hasCredentials) {
      return false
    }

    const result = await authenticate()
    return result.success
  }, [authenticate, isSupported, isEnabled, hasCredentials])

  /**
   * Check if quick login is available
   */
  const isQuickLoginAvailable = isSupported && isEnabled && hasCredentials

  return {
    quickLogin,
    isQuickLoginAvailable,
    isAuthenticating,
    error
  }
}

/**
 * Hook for biometric setup flow
 */
export function useBiometricSetup() {
  const { 
    enableBiometric, 
    isSupported, 
    availableMethods, 
    error,
    clearError
  } = useBiometricLogin()

  const [isSetupInProgress, setIsSetupInProgress] = useState(false)
  const [setupStep, setSetupStep] = useState<'intro' | 'registration' | 'complete'>('intro')

  /**
   * Start biometric setup process
   */
  const startSetup = useCallback(async (userId: string): Promise<boolean> => {
    if (!isSupported) {
      return false
    }

    setIsSetupInProgress(true)
    setSetupStep('registration')
    clearError()

    try {
      const success = await enableBiometric(userId)
      
      if (success) {
        setSetupStep('complete')
        setTimeout(() => {
          setIsSetupInProgress(false)
          setSetupStep('intro')
        }, 2000)
      } else {
        setIsSetupInProgress(false)
        setSetupStep('intro')
      }

      return success
    } catch (error) {
      setIsSetupInProgress(false)
      setSetupStep('intro')
      return false
    }
  }, [isSupported, enableBiometric, clearError])

  /**
   * Cancel setup process
   */
  const cancelSetup = useCallback(() => {
    setIsSetupInProgress(false)
    setSetupStep('intro')
    clearError()
  }, [clearError])

  /**
   * Check if setup is available
   */
  const isSetupAvailable = isSupported && availableMethods.length > 0

  return {
    startSetup,
    cancelSetup,
    isSetupAvailable,
    isSetupInProgress,
    setupStep,
    availableMethods,
    error
  }
}

/**
 * Track biometric authentication attempt
 */
async function trackBiometricAttempt(result: BiometricAuthResult): Promise<void> {
  try {
    const event = {
      type: 'biometric_auth_attempt',
      success: result.success,
      method: result.method?.type,
      error: result.error,
      fallbackReason: result.fallbackReason,
      timestamp: result.timestamp,
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }

    // Store locally for analytics
    const attempts = JSON.parse(localStorage.getItem('biometric_auth_attempts') || '[]')
    attempts.push(event)
    
    // Keep only last 50 attempts
    if (attempts.length > 50) {
      attempts.splice(0, attempts.length - 50)
    }
    
    localStorage.setItem('biometric_auth_attempts', JSON.stringify(attempts))

    // In real implementation, also send to analytics service
    console.log('Biometric auth attempt tracked:', event)
  } catch (error) {
    console.error('Failed to track biometric attempt:', error)
  }
}

/**
 * Track biometric enablement
 */
async function trackBiometricEnablement(userId: string, method: string): Promise<void> {
  try {
    const event = {
      type: 'biometric_auth_enabled',
      userId,
      method,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }

    localStorage.setItem('biometric_auth_enabled', JSON.stringify(event))

    // In real implementation, send to analytics service
    console.log('Biometric auth enabled:', event)
  } catch (error) {
    console.error('Failed to track biometric enablement:', error)
  }
}

/**
 * Track biometric disablement
 */
async function trackBiometricDisablement(): Promise<void> {
  try {
    const event = {
      type: 'biometric_auth_disabled',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }

    localStorage.setItem('biometric_auth_disabled', JSON.stringify(event))

    // In real implementation, send to analytics service
    console.log('Biometric auth disabled:', event)
  } catch (error) {
    console.error('Failed to track biometric disablement:', error)
  }
}

export default useBiometricLogin
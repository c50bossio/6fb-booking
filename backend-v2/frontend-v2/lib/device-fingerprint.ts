'use client'

/**
 * Device fingerprinting utilities for trusted device management
 */

export interface DeviceFingerprint {
  id: string
  userAgent: string
  screenResolution: string
  timezone: string
  language: string
  platform: string
  timestamp: number
}

/**
 * Generate a device fingerprint for trusted device functionality
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      id: 'server-side',
      userAgent: 'server',
      screenResolution: '0x0',
      timezone: 'UTC',
      language: 'en',
      platform: 'server',
      timestamp: Date.now()
    }
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx!.textBaseline = 'top'
  ctx!.font = '14px Arial'
  ctx!.fillText('Device fingerprint', 2, 2)
  const canvasFingerprint = canvas.toDataURL()

  const fingerprint = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    timestamp: Date.now()
  }

  // Create a simple hash of the fingerprint data
  const fingerprintString = JSON.stringify(fingerprint) + canvasFingerprint
  const id = btoa(fingerprintString).slice(0, 32)

  return {
    ...fingerprint,
    id
  }
}

/**
 * Store device as trusted
 */
export function trustDevice(fingerprint: DeviceFingerprint): void {
  if (typeof window === 'undefined') return
  
  try {
    const trustedDevices = getTrustedDevices()
    trustedDevices[fingerprint.id] = fingerprint
    localStorage.setItem('trusted_devices', JSON.stringify(trustedDevices))
  } catch (error) {
    console.warn('Failed to store trusted device:', error)
  }
}

/**
 * Check if current device is trusted
 */
export function isDeviceTrusted(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const fingerprint = generateDeviceFingerprint()
    const trustedDevices = getTrustedDevices()
    return fingerprint.id in trustedDevices
  } catch (error) {
    console.warn('Failed to check device trust:', error)
    return false
  }
}

/**
 * Get all trusted devices
 */
export function getTrustedDevices(): Record<string, DeviceFingerprint> {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem('trusted_devices')
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.warn('Failed to get trusted devices:', error)
    return {}
  }
}

/**
 * Remove a trusted device
 */
export function removeTrustedDevice(deviceId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const trustedDevices = getTrustedDevices()
    delete trustedDevices[deviceId]
    localStorage.setItem('trusted_devices', JSON.stringify(trustedDevices))
  } catch (error) {
    console.warn('Failed to remove trusted device:', error)
  }
}

/**
 * Clear all trusted devices
 */
export function clearTrustedDevices(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem('trusted_devices')
  } catch (error) {
    console.warn('Failed to clear trusted devices:', error)
  }
}
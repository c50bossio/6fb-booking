/**
 * Device fingerprinting and trust management
 * Provides secure device identification and trust features
 */

export interface DeviceFingerprint {
  id: string
  userAgent: string
  screen: string
  timezone: string
  language: string
  platform: string
}

/**
 * Generate a unique device fingerprint
 */
export async function generateDeviceFingerprint(): Promise<string> {
  try {
    const fingerprint = {
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
    }
    
    // Create a simple hash from the fingerprint data
    const fingerprintString = JSON.stringify(fingerprint)
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintString))
    const hashArray = Array.from(new Uint8Array(hash))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    // Fallback to a simple hash if crypto.subtle is not available
    const simpleFingerprint = `${navigator.userAgent}-${screen.width}x${screen.height}-${Date.now()}`
    return btoa(simpleFingerprint).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)
  }
}

/**
 * Generate a human-readable device name
 */
export function generateDeviceName(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  
  // Detect mobile devices
  if (ua.includes('mobile') || ua.includes('android')) {
    if (ua.includes('android')) return 'Android Device'
    if (ua.includes('iphone')) return 'iPhone'
    if (ua.includes('ipad')) return 'iPad'
    return 'Mobile Device'
  }
  
  // Detect desktop browsers
  if (ua.includes('chrome')) return 'Chrome Browser'
  if (ua.includes('firefox')) return 'Firefox Browser'
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari Browser'
  if (ua.includes('edge')) return 'Edge Browser'
  
  return 'Desktop Browser'
}

/**
 * Trust a device for a specific user
 */
export async function trustDevice(deviceId: string, userId: string, durationDays: number = 30): Promise<void> {
  try {
    const trustData = {
      deviceId,
      userId,
      trustedAt: Date.now(),
      expiresAt: Date.now() + (durationDays * 24 * 60 * 60 * 1000)
    }
    
    localStorage.setItem(`device_trust_${userId}`, JSON.stringify(trustData))
  } catch (error) {
    console.warn('Failed to store device trust:', error)
  }
}

/**
 * Check if a device is trusted for a specific user
 */
export async function isDeviceTrusted(userId: string): Promise<boolean> {
  try {
    const trustDataStr = localStorage.getItem(`device_trust_${userId}`)
    if (!trustDataStr) return false
    
    const trustData = JSON.parse(trustDataStr)
    
    // Check if trust has expired
    if (Date.now() > trustData.expiresAt) {
      localStorage.removeItem(`device_trust_${userId}`)
      return false
    }
    
    // Verify the device fingerprint matches
    const currentDeviceId = await generateDeviceFingerprint()
    return trustData.deviceId === currentDeviceId
  } catch (error) {
    console.warn('Failed to check device trust:', error)
    return false
  }
}

/**
 * Remove device trust for a specific user
 */
export function removeDeviceTrust(userId: string): void {
  try {
    localStorage.removeItem(`device_trust_${userId}`)
  } catch (error) {
    console.warn('Failed to remove device trust:', error)
  }
}

/**
 * Get all trusted devices for a user (for security settings)
 */
export function getTrustedDevices(userId: string): Array<{deviceId: string, trustedAt: number, expiresAt: number}> {
  try {
    const trustDataStr = localStorage.getItem(`device_trust_${userId}`)
    if (!trustDataStr) return []
    
    const trustData = JSON.parse(trustDataStr)
    return [trustData] // For now, we only support one trusted device per user
  } catch (error) {
    console.warn('Failed to get trusted devices:', error)
    return []
  }
}
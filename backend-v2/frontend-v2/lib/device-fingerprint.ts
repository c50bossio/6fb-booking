// Device fingerprinting utility for trusted device management

interface DeviceInfo {
  userAgent: string
  screenResolution: string
  timezone: string
  language: string
  platform: string
  hardwareConcurrency: number
  deviceMemory?: number
  touchSupport: boolean
  webGLVendor?: string
  webGLRenderer?: string
}

export interface DeviceFingerprint {
  id: string
  name: string
  lastSeen: Date
  firstSeen: Date
  isCurrent: boolean
  location?: string
  browser?: string
  os?: string
}

// Generate a unique device fingerprint
export async function generateDeviceFingerprint(): Promise<string> {
  const deviceInfo = await collectDeviceInfo()
  
  // Create a stable hash from device characteristics using Web Crypto API
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(deviceInfo))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Use first 16 chars for manageable IDs
  return hashHex.substring(0, 16)
}

// Collect device information for fingerprinting
async function collectDeviceInfo(): Promise<DeviceInfo> {
  const info: DeviceInfo = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    touchSupport: 'ontouchstart' in window,
  }
  
  // Get device memory if available
  if ('deviceMemory' in navigator) {
    info.deviceMemory = (navigator as any).deviceMemory
  }
  
  // Get WebGL info for additional entropy
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        info.webGLVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        info.webGLRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      }
    }
  } catch {
    // WebGL not available, continue without it
  }
  
  return info
}

// Parse user agent to get browser and OS info
export function parseUserAgent(userAgent: string): { browser?: string; os?: string } {
  const browser = (() => {
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Unknown'
  })()
  
  const os = (() => {
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'
    return 'Unknown'
  })()
  
  return { browser, os }
}

// Generate a human-readable device name
export function generateDeviceName(userAgent: string): string {
  const { browser, os } = parseUserAgent(userAgent)
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent)
  
  const deviceType = isMobile ? 'Mobile' : 'Desktop'
  return `${browser} on ${os} (${deviceType})`
}

// Check if the current device matches a stored fingerprint
export async function isCurrentDevice(storedFingerprint: string): Promise<boolean> {
  const currentFingerprint = await generateDeviceFingerprint()
  return currentFingerprint === storedFingerprint
}

// Store device trust information
export async function trustDevice(
  deviceId: string,
  userId: string,
  rememberDuration: number = 30 // days
): Promise<void> {
  const trustedDevices = getTrustedDevices(userId)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + rememberDuration)
  
  trustedDevices[deviceId] = {
    trustedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    deviceName: generateDeviceName(navigator.userAgent),
  }
  
  localStorage.setItem(
    `trusted_devices_${userId}`,
    JSON.stringify(trustedDevices)
  )
}

// Get trusted devices for a user
export function getTrustedDevices(userId: string): Record<string, any> {
  const stored = localStorage.getItem(`trusted_devices_${userId}`)
  if (!stored) return {}
  
  try {
    const devices = JSON.parse(stored)
    // Clean up expired devices
    const now = new Date()
    Object.keys(devices).forEach(deviceId => {
      if (new Date(devices[deviceId].expiresAt) < now) {
        delete devices[deviceId]
      }
    })
    
    return devices
  } catch {
    return {}
  }
}

// Check if device is trusted
export async function isDeviceTrusted(userId: string): Promise<boolean> {
  const deviceId = await generateDeviceFingerprint()
  const trustedDevices = getTrustedDevices(userId)
  
  if (!trustedDevices[deviceId]) return false
  
  const device = trustedDevices[deviceId]
  const expiresAt = new Date(device.expiresAt)
  
  return expiresAt > new Date()
}

// Remove device trust
export async function untrustDevice(userId: string, deviceId?: string): Promise<void> {
  const trustedDevices = getTrustedDevices(userId)
  
  if (deviceId) {
    delete trustedDevices[deviceId]
  } else {
    // Remove current device
    const currentDeviceId = await generateDeviceFingerprint()
    delete trustedDevices[currentDeviceId]
  }
  
  localStorage.setItem(
    `trusted_devices_${userId}`,
    JSON.stringify(trustedDevices)
  )
}

// Get all trusted devices with details
export async function getTrustedDevicesList(userId: string): Promise<DeviceFingerprint[]> {
  const trustedDevices = getTrustedDevices(userId)
  const currentDeviceId = await generateDeviceFingerprint()
  
  return Object.entries(trustedDevices).map(([deviceId, device]) => {
    const { browser, os } = parseUserAgent(navigator.userAgent)
    
    return {
      id: deviceId,
      name: device.deviceName || generateDeviceName(navigator.userAgent),
      lastSeen: new Date(device.trustedAt),
      firstSeen: new Date(device.trustedAt),
      isCurrent: deviceId === currentDeviceId,
      browser,
      os,
    }
  })
}
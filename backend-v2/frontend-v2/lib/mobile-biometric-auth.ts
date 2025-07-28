/**
 * Mobile Biometric Authentication System
 * Secure fingerprint and face authentication for mobile PWA
 * Version: 1.0.0
 */

export interface BiometricAuthConfig {
  enabled: boolean
  methods: BiometricMethod[]
  fallbackToPassword: boolean
  maxRetries: number
  timeout: number // milliseconds
  secureBiometricOnly: boolean // Only allow secure biometrics
  promptMessage: string
  cancelButtonText: string
  fallbackButtonText: string
}

export interface BiometricMethod {
  type: 'fingerprint' | 'face' | 'voice' | 'iris'
  available: boolean
  enrolled: boolean
  secure: boolean
  name: string
}

export interface BiometricAuthResult {
  success: boolean
  method?: BiometricMethod
  error?: string
  fallbackReason?: 'user_cancel' | 'not_available' | 'not_enrolled' | 'failed' | 'timeout'
  timestamp: number
}

export interface BiometricCredential {
  id: string
  type: BiometricMethod['type']
  publicKey: string
  counter: number
  lastUsed: number
  deviceInfo: {
    platform: string
    userAgent: string
    fingerprint: string
  }
}

const DEFAULT_CONFIG: BiometricAuthConfig = {
  enabled: true,
  methods: [],
  fallbackToPassword: true,
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  secureBiometricOnly: true,
  promptMessage: 'Use your biometric to sign in to BookedBarber',
  cancelButtonText: 'Cancel',
  fallbackButtonText: 'Use Password'
}

export class MobileBiometricAuthSystem {
  private config: BiometricAuthConfig
  private availableMethods: BiometricMethod[] = []
  private isSupported: boolean = false
  private retryCount: number = 0
  private credentials: BiometricCredential[] = []

  constructor(config?: Partial<BiometricAuthConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeSystem()
  }

  private async initializeSystem() {
    console.log('🔐 Initializing Mobile Biometric Authentication System...')

    // Check platform support
    this.isSupported = await this.checkBiometricSupport()
    
    if (!this.isSupported) {
      console.warn('Biometric authentication not supported on this device')
      return
    }

    // Discover available methods
    await this.discoverBiometricMethods()

    // Load saved credentials
    await this.loadSavedCredentials()

    console.log(`✅ Biometric auth initialized with ${this.availableMethods.length} methods`)
  }

  /**
   * Check if biometric authentication is supported
   */
  private async checkBiometricSupport(): Promise<boolean> {
    try {
      // Check for Web Authentication API
      if (!window.PublicKeyCredential) {
        return false
      }

      // Check for user verification support
      const isSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      
      // Additional checks for mobile platforms
      if (this.isMobilePlatform()) {
        return isSupported || await this.checkMobileBiometricAPIs()
      }

      return isSupported
    } catch (error) {
      console.error('Error checking biometric support:', error)
      return false
    }
  }

  /**
   * Check mobile-specific biometric APIs
   */
  private async checkMobileBiometricAPIs(): Promise<boolean> {
    // Check for various mobile biometric APIs
    return !!(
      (window as any).TouchID ||
      (window as any).FaceID ||
      (navigator as any).credentials ||
      (window as any).BiometricPlugin ||
      'serviceWorker' in navigator // PWA with biometric capabilities
    )
  }

  /**
   * Discover available biometric methods
   */
  private async discoverBiometricMethods(): Promise<void> {
    const methods: BiometricMethod[] = []

    try {
      // Fingerprint detection
      if (await this.checkFingerprintSupport()) {
        methods.push({
          type: 'fingerprint',
          available: true,
          enrolled: await this.checkFingerprintEnrollment(),
          secure: true,
          name: 'Touch ID / Fingerprint'
        })
      }

      // Face recognition detection  
      if (await this.checkFaceSupport()) {
        methods.push({
          type: 'face',
          available: true,
          enrolled: await this.checkFaceEnrollment(),
          secure: true,
          name: 'Face ID / Face Recognition'
        })
      }

      // Voice recognition (if supported)
      if (await this.checkVoiceSupport()) {
        methods.push({
          type: 'voice',
          available: true,
          enrolled: await this.checkVoiceEnrollment(),
          secure: false, // Generally less secure
          name: 'Voice Recognition'
        })
      }

      this.availableMethods = methods
      this.config.methods = methods

    } catch (error) {
      console.error('Error discovering biometric methods:', error)
    }
  }

  /**
   * Check fingerprint support
   */
  private async checkFingerprintSupport(): Promise<boolean> {
    try {
      // iOS Touch ID
      if ((window as any).TouchID) {
        return await (window as any).TouchID.isAvailable()
      }

      // Android fingerprint APIs
      if ((navigator as any).fingerprint) {
        return true
      }

      // Web Authentication API with fingerprint
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        return available && this.isMobilePlatform()
      }

      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Check face recognition support
   */
  private async checkFaceSupport(): Promise<boolean> {
    try {
      // iOS Face ID
      if ((window as any).FaceID) {
        return await (window as any).FaceID.isAvailable()
      }

      // Android face recognition
      if ((navigator as any).faceRecognition) {
        return true
      }

      // Check for face recognition via WebAuthentication
      return this.isMobilePlatform() && await this.checkAdvancedBiometrics()
    } catch (error) {
      return false
    }
  }

  /**
   * Check voice recognition support
   */
  private async checkVoiceSupport(): Promise<boolean> {
    try {
      // Web Speech API
      return !!(
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition ||
        (navigator as any).voiceRecognition
      )
    } catch (error) {
      return false
    }
  }

  /**
   * Check fingerprint enrollment
   */
  private async checkFingerprintEnrollment(): Promise<boolean> {
    try {
      if ((window as any).TouchID) {
        return await (window as any).TouchID.hasEnrolledFingerprints()
      }

      if ((navigator as any).fingerprint) {
        return await (navigator as any).fingerprint.hasEnrolledFingerprints()
      }

      // For WebAuthentication, assume enrolled if available
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Check face enrollment
   */
  private async checkFaceEnrollment(): Promise<boolean> {
    try {
      if ((window as any).FaceID) {
        return await (window as any).FaceID.hasEnrolledFaces()
      }

      // For other platforms, assume enrolled if available
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Check voice enrollment
   */
  private async checkVoiceEnrollment(): Promise<boolean> {
    // Voice recognition typically doesn't require enrollment
    return true
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(options?: {
    preferredMethod?: BiometricMethod['type']
    allowFallback?: boolean
  }): Promise<BiometricAuthResult> {
    if (!this.isSupported) {
      return {
        success: false,
        error: 'Biometric authentication not supported',
        fallbackReason: 'not_available',
        timestamp: Date.now()
      }
    }

    const availableMethods = this.getAvailableMethods()
    if (availableMethods.length === 0) {
      return {
        success: false,
        error: 'No biometric methods available',
        fallbackReason: 'not_available',
        timestamp: Date.now()
      }
    }

    try {
      // Try preferred method first
      if (options?.preferredMethod) {
        const preferredMethod = availableMethods.find(m => m.type === options.preferredMethod)
        if (preferredMethod) {
          const result = await this.performAuthentication(preferredMethod)
          if (result.success) {
            return result
          }
        }
      }

      // Try available methods in order of security preference
      const sortedMethods = this.sortMethodsByPreference(availableMethods)
      
      for (const method of sortedMethods) {
        if (this.retryCount >= this.config.maxRetries) {
          break
        }

        const result = await this.performAuthentication(method)
        if (result.success) {
          this.retryCount = 0
          return result
        }

        this.retryCount++
      }

      return {
        success: false,
        error: 'All biometric methods failed',
        fallbackReason: 'failed',
        timestamp: Date.now()
      }

    } catch (error) {
      console.error('Biometric authentication error:', error)
      return {
        success: false,
        error: error.message,
        fallbackReason: 'failed',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Perform authentication with specific method
   */
  private async performAuthentication(method: BiometricMethod): Promise<BiometricAuthResult> {
    const startTime = Date.now()

    try {
      let success = false
      let error: string | undefined

      switch (method.type) {
        case 'fingerprint':
          success = await this.authenticateFingerprint()
          break
        case 'face':
          success = await this.authenticateFace()
          break
        case 'voice':
          success = await this.authenticateVoice()
          break
        default:
          success = await this.authenticateWebAuthn()
      }

      if (success) {
        // Save successful authentication
        await this.recordSuccessfulAuth(method)
      }

      return {
        success,
        method: success ? method : undefined,
        error,
        timestamp: Date.now()
      }

    } catch (authError) {
      const elapsed = Date.now() - startTime
      
      return {
        success: false,
        error: authError.message,
        fallbackReason: elapsed > this.config.timeout ? 'timeout' : 'failed',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Authenticate using fingerprint
   */
  private async authenticateFingerprint(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Fingerprint authentication timeout'))
      }, this.config.timeout)

      // iOS Touch ID
      if ((window as any).TouchID) {
        (window as any).TouchID.verifyFingerprint(
          this.config.promptMessage,
          () => {
            clearTimeout(timeout)
            resolve(true)
          },
          (error: any) => {
            clearTimeout(timeout)
            reject(new Error(error.localizedDescription || 'Touch ID failed'))
          }
        )
        return
      }

      // Android fingerprint
      if ((navigator as any).fingerprint) {
        (navigator as any).fingerprint.authenticate(
          {
            clientId: 'BookedBarber',
            clientSecret: this.generateClientSecret(),
            localizedFallbackTitle: this.config.fallbackButtonText,
            localizedReason: this.config.promptMessage
          },
          () => {
            clearTimeout(timeout)
            resolve(true)
          },
          (error: any) => {
            clearTimeout(timeout)
            reject(new Error(error.message || 'Fingerprint authentication failed'))
          }
        )
        return
      }

      // Web Authentication API fallback
      this.authenticateWebAuthn()
        .then(result => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  /**
   * Authenticate using face recognition
   */
  private async authenticateFace(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Face ID authentication timeout'))
      }, this.config.timeout)

      // iOS Face ID
      if ((window as any).FaceID) {
        (window as any).FaceID.authenticate(
          this.config.promptMessage,
          () => {
            clearTimeout(timeout)
            resolve(true)
          },
          (error: any) => {
            clearTimeout(timeout)
            reject(new Error(error.localizedDescription || 'Face ID failed'))
          }
        )
        return
      }

      // Android face recognition (placeholder)
      if ((navigator as any).faceRecognition) {
        (navigator as any).faceRecognition.authenticate(
          {
            promptMessage: this.config.promptMessage,
            cancelButtonText: this.config.cancelButtonText
          },
          () => {
            clearTimeout(timeout)
            resolve(true)
          },
          (error: any) => {
            clearTimeout(timeout)
            reject(new Error(error.message || 'Face recognition failed'))
          }
        )
        return
      }

      // Fallback to WebAuthn
      this.authenticateWebAuthn()
        .then(result => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  /**
   * Authenticate using voice recognition
   */
  private async authenticateVoice(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Voice recognition timeout'))
      }, this.config.timeout)

      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

        if (!SpeechRecognition) {
          clearTimeout(timeout)
          reject(new Error('Voice recognition not supported'))
          return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          clearTimeout(timeout)
          const transcript = event.results[0][0].transcript.toLowerCase()
          
          // Simple voice passphrase validation
          const validPhrases = ['open bookedbarber', 'unlock my account', 'biometric access']
          const isValid = validPhrases.some(phrase => transcript.includes(phrase))
          
          resolve(isValid)
        }

        recognition.onerror = (error: any) => {
          clearTimeout(timeout)
          reject(new Error(`Voice recognition error: ${error.error}`))
        }

        recognition.start()

      } catch (error) {
        clearTimeout(timeout)
        reject(new Error('Voice recognition initialization failed'))
      }
    })
  }

  /**
   * Authenticate using Web Authentication API
   */
  private async authenticateWebAuthn(): Promise<boolean> {
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          timeout: this.config.timeout,
          userVerification: 'required',
          allowCredentials: this.credentials.map(cred => ({
            id: this.stringToBuffer(cred.id),
            type: 'public-key',
            transports: ['internal']
          }))
        }
      }) as PublicKeyCredential

      if (credential) {
        await this.verifyWebAuthnCredential(credential)
        return true
      }

      return false
    } catch (error) {
      throw new Error(`WebAuthn authentication failed: ${error.message}`)
    }
  }

  /**
   * Register new biometric credential
   */
  async registerBiometric(userId: string): Promise<BiometricCredential> {
    if (!this.isSupported) {
      throw new Error('Biometric authentication not supported')
    }

    try {
      const challenge = this.generateChallenge()
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: this.stringToBuffer(challenge),
          rp: {
            name: 'BookedBarber',
            id: window.location.hostname
          },
          user: {
            id: this.stringToBuffer(userId),
            name: userId,
            displayName: 'BookedBarber User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: this.config.timeout
        }
      }) as PublicKeyCredential

      const biometricCredential = await this.createBiometricCredential(credential)
      
      // Save credential
      this.credentials.push(biometricCredential)
      await this.saveCredentials()

      return biometricCredential
    } catch (error) {
      throw new Error(`Biometric registration failed: ${error.message}`)
    }
  }

  /**
   * Get available biometric methods
   */
  getAvailableMethods(): BiometricMethod[] {
    return this.availableMethods.filter(method => {
      if (this.config.secureBiometricOnly && !method.secure) {
        return false
      }
      return method.available && method.enrolled
    })
  }

  /**
   * Get system status
   */
  getStatus(): {
    supported: boolean
    enabled: boolean
    methods: BiometricMethod[]
    hasCredentials: boolean
  } {
    return {
      supported: this.isSupported,
      enabled: this.config.enabled,
      methods: this.availableMethods,
      hasCredentials: this.credentials.length > 0
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BiometricAuthConfig>): void {
    this.config = { ...this.config, ...newConfig }
    localStorage.setItem('biometric_auth_config', JSON.stringify(this.config))
  }

  /**
   * Remove biometric credential
   */
  async removeBiometric(credentialId: string): Promise<void> {
    this.credentials = this.credentials.filter(cred => cred.id !== credentialId)
    await this.saveCredentials()
  }

  /**
   * Helper methods
   */
  private isMobilePlatform(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  private async checkAdvancedBiometrics(): Promise<boolean> {
    // Check for advanced biometric support
    return this.isMobilePlatform() && window.PublicKeyCredential
  }

  private sortMethodsByPreference(methods: BiometricMethod[]): BiometricMethod[] {
    // Sort by security and availability preference
    const preference = ['face', 'fingerprint', 'voice', 'iris']
    return methods.sort((a, b) => {
      const aIndex = preference.indexOf(a.type)
      const bIndex = preference.indexOf(b.type)
      return aIndex - bIndex
    })
  }

  private generateClientSecret(): string {
    return btoa(Date.now().toString() + Math.random().toString())
  }

  private generateChallenge(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
  }

  private stringToBuffer(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length)
    const bufView = new Uint8Array(buf)
    for (let i = 0; i < str.length; i++) {
      bufView[i] = str.charCodeAt(i)
    }
    return buf
  }

  private async createBiometricCredential(credential: PublicKeyCredential): Promise<BiometricCredential> {
    const response = credential.response as AuthenticatorAttestationResponse
    
    return {
      id: credential.id,
      type: 'fingerprint', // Default, could be detected more precisely
      publicKey: btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey()!))),
      counter: 0,
      lastUsed: Date.now(),
      deviceInfo: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        fingerprint: await this.generateDeviceFingerprint()
      }
    }
  }

  private async verifyWebAuthnCredential(credential: PublicKeyCredential): Promise<void> {
    // In a real implementation, this would verify the credential against the server
    // For now, we'll just check if it matches our stored credentials
    const credentialExists = this.credentials.some(cred => cred.id === credential.id)
    if (!credentialExists) {
      throw new Error('Unknown credential')
    }
  }

  private async generateDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString()
    ]
    
    const text = components.join('|')
    const msgBuffer = new TextEncoder().encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async recordSuccessfulAuth(method: BiometricMethod): Promise<void> {
    // Record successful authentication for analytics
    const event = {
      type: 'biometric_auth_success',
      method: method.type,
      timestamp: Date.now()
    }
    
    localStorage.setItem('last_biometric_auth', JSON.stringify(event))
  }

  private async loadSavedCredentials(): Promise<void> {
    try {
      const saved = localStorage.getItem('biometric_credentials')
      if (saved) {
        this.credentials = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load saved credentials:', error)
    }
  }

  private async saveCredentials(): Promise<void> {
    try {
      localStorage.setItem('biometric_credentials', JSON.stringify(this.credentials))
    } catch (error) {
      console.error('Failed to save credentials:', error)
    }
  }
}

// Global biometric auth instance
let globalBiometricAuth: MobileBiometricAuthSystem | null = null

/**
 * Get or create biometric auth instance
 */
export function getBiometricAuthSystem(config?: Partial<BiometricAuthConfig>): MobileBiometricAuthSystem {
  if (!globalBiometricAuth) {
    globalBiometricAuth = new MobileBiometricAuthSystem(config)
  }
  return globalBiometricAuth
}

/**
 * React hook for biometric authentication
 */
export function useBiometricAuth() {
  const biometricAuth = getBiometricAuthSystem()

  return {
    authenticate: biometricAuth.authenticate.bind(biometricAuth),
    register: biometricAuth.registerBiometric.bind(biometricAuth),
    getStatus: biometricAuth.getStatus.bind(biometricAuth),
    getAvailableMethods: biometricAuth.getAvailableMethods.bind(biometricAuth),
    updateConfig: biometricAuth.updateConfig.bind(biometricAuth),
    removeBiometric: biometricAuth.removeBiometric.bind(biometricAuth)
  }
}

export default MobileBiometricAuthSystem
/**
 * Network Status Monitor for POS
 * Monitors network connectivity and provides retry logic
 */

export type NetworkStatus = 'online' | 'offline' | 'slow'

export interface NetworkStatusInfo {
  status: NetworkStatus
  isOnline: boolean
  latency?: number
  lastChecked: Date
  downtime?: number
}

type NetworkStatusCallback = (status: NetworkStatusInfo) => void

export class NetworkMonitor {
  private static instance: NetworkMonitor | null = null
  private status: NetworkStatusInfo = {
    status: 'online',
    isOnline: true,
    lastChecked: new Date()
  }
  private callbacks: Set<NetworkStatusCallback> = new Set()
  private checkInterval: NodeJS.Timer | null = null
  private offlineSince: Date | null = null
  private readonly SLOW_THRESHOLD = 3000 // 3 seconds
  private readonly CHECK_INTERVAL = 10000 // 10 seconds

  private constructor() {
    this.initialize()
  }

  static getInstance(): NetworkMonitor {
    if (!this.instance) {
      this.instance = new NetworkMonitor()
    }
    return this.instance
  }

  private initialize() {
    // Initial status
    this.updateStatus(navigator.onLine)

    // Listen to browser online/offline events
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())

    // Periodic connectivity check
    this.startPeriodicCheck()
  }

  private handleOnline() {
    console.log('Network: Browser reported online')
    this.updateStatus(true)
    this.performHealthCheck()
  }

  private handleOffline() {
    console.log('Network: Browser reported offline')
    this.updateStatus(false)
  }

  private updateStatus(isOnline: boolean, latency?: number) {
    const previousStatus = this.status.status

    if (!isOnline) {
      if (!this.offlineSince) {
        this.offlineSince = new Date()
      }
      this.status = {
        status: 'offline',
        isOnline: false,
        lastChecked: new Date(),
        downtime: Date.now() - this.offlineSince.getTime()
      }
    } else if (latency && latency > this.SLOW_THRESHOLD) {
      this.offlineSince = null
      this.status = {
        status: 'slow',
        isOnline: true,
        latency,
        lastChecked: new Date()
      }
    } else {
      this.offlineSince = null
      this.status = {
        status: 'online',
        isOnline: true,
        latency,
        lastChecked: new Date()
      }
    }

    // Notify listeners if status changed
    if (previousStatus !== this.status.status) {
      this.notifyCallbacks()
    }
  }

  private startPeriodicCheck() {
    this.checkInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.CHECK_INTERVAL)
  }

  private async performHealthCheck() {
    try {
      const startTime = Date.now()

      // Try to reach the API health endpoint
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('/api/v1/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
      })

      clearTimeout(timeoutId)
      const latency = Date.now() - startTime

      if (response.ok) {
        this.updateStatus(true, latency)
      } else {
        // Server is reachable but returning errors
        this.updateStatus(true, latency)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request timed out - likely offline or very slow
        this.updateStatus(false)
      } else {
        // Network error
        this.updateStatus(false)
      }
    }
  }

  getStatus(): NetworkStatusInfo {
    return { ...this.status }
  }

  isOnline(): boolean {
    return this.status.isOnline
  }

  subscribe(callback: NetworkStatusCallback) {
    this.callbacks.add(callback)
    // Immediately notify of current status
    callback(this.getStatus())

    return () => {
      this.callbacks.delete(callback)
    }
  }

  private notifyCallbacks() {
    const status = this.getStatus()
    this.callbacks.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        console.error('Network monitor callback error:', error)
      }
    })
  }

  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.callbacks.clear()
  }

  // Utility method for retry logic with exponential backoff
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      initialDelay?: number
      maxDelay?: number
      onRetry?: (attempt: number, error: any) => void
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      onRetry
    } = options

    let lastError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        if (attempt < maxRetries) {
          const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay)

          if (onRetry) {
            onRetry(attempt + 1, error)
          }

          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }
}

// Hook for React components
export function useNetworkStatus() {
  const [status, setStatus] = React.useState<NetworkStatusInfo>(() =>
    NetworkMonitor.getInstance().getStatus()
  )

  React.useEffect(() => {
    const unsubscribe = NetworkMonitor.getInstance().subscribe(setStatus)
    return unsubscribe
  }, [])

  return status
}

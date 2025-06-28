/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures and API spam by monitoring failure rates
 */

export interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures before opening circuit
  resetTimeout: number     // Milliseconds to wait before attempting reset
  monitorWindow: number    // Time window to monitor failures (ms)
  successThreshold: number // Number of successes needed to close circuit
}

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit open, rejecting calls
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures: number[] = []
  private successes: number = 0
  private lastFailureTime: number = 0
  private config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,      // Open after 5 failures
      resetTimeout: 30000,      // Wait 30s before trying again
      monitorWindow: 60000,     // Monitor failures over 1 minute
      successThreshold: 3,      // Need 3 successes to close
      ...config
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN
        this.successes = 0
        console.log('[CircuitBreaker] Attempting reset - moving to HALF_OPEN')
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Get current circuit state information
   */
  getState(): {
    state: CircuitState
    failures: number
    successes: number
    nextRetryTime?: number
  } {
    return {
      state: this.state,
      failures: this.getRecentFailures(),
      successes: this.successes,
      nextRetryTime: this.state === CircuitState.OPEN 
        ? this.lastFailureTime + this.config.resetTimeout 
        : undefined
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED
    this.failures = []
    this.successes = 0
    this.lastFailureTime = 0
    console.log('[CircuitBreaker] Manually reset to CLOSED state')
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++
      console.log(`[CircuitBreaker] Success in HALF_OPEN (${this.successes}/${this.config.successThreshold})`)
      
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED
        this.failures = []
        this.successes = 0
        console.log('[CircuitBreaker] Circuit CLOSED - service recovered')
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Remove old failures on success
      this.cleanupOldFailures()
    }
  }

  private onFailure(): void {
    const now = Date.now()
    this.failures.push(now)
    this.lastFailureTime = now

    if (this.state === CircuitState.HALF_OPEN) {
      // Failure during testing - reopen circuit
      this.state = CircuitState.OPEN
      this.successes = 0
      console.log('[CircuitBreaker] Failure during HALF_OPEN - circuit OPEN again')
    } else if (this.state === CircuitState.CLOSED) {
      const recentFailures = this.getRecentFailures()
      if (recentFailures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN
        console.log(`[CircuitBreaker] Circuit OPEN - ${recentFailures} failures detected`)
      }
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.resetTimeout
  }

  private getRecentFailures(): number {
    this.cleanupOldFailures()
    return this.failures.length
  }

  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.config.monitorWindow
    this.failures = this.failures.filter(time => time > cutoff)
  }
}

/**
 * Pre-configured circuit breakers for different services
 */
export const circuitBreakers = {
  // API calls - aggressive protection
  api: new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 30000,
    monitorWindow: 60000,
    successThreshold: 2
  }),

  // WebSocket connections - moderate protection
  websocket: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
    monitorWindow: 120000,
    successThreshold: 3
  }),

  // Authentication - conservative protection
  auth: new CircuitBreaker({
    failureThreshold: 10,
    resetTimeout: 120000,
    monitorWindow: 300000,
    successThreshold: 5
  })
}

/**
 * Wrapper function for API calls with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const breaker = circuitBreakers.api
  
  try {
    return await breaker.execute(fn)
  } catch (error) {
    const state = breaker.getState()
    console.error(`[CircuitBreaker:${name}] Call failed`, {
      state: state.state,
      failures: state.failures,
      nextRetry: state.nextRetryTime ? new Date(state.nextRetryTime) : 'unknown'
    })
    throw error
  }
}
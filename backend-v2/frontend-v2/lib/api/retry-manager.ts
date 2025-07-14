/**
 * Retry Manager
 * 
 * Handles retry logic with exponential backoff and configurable conditions
 */

import { APIError, RetryConfig, RETRY_PRESETS } from './types/common'

export class RetryManager {
  private config: RetryConfig

  constructor(config: RetryConfig = RETRY_PRESETS.standard) {
    this.config = config
  }

  /**
   * Execute operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'API Operation'
  ): Promise<T> {
    let lastError: APIError | null = null
    let delay = this.config.initialDelay

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation()
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt + 1}`)
        }
        
        return result
        
      } catch (error) {
        lastError = error as APIError
        lastError.retryAttempt = attempt + 1

        // Don't retry if this was the last attempt
        if (attempt === this.config.maxRetries) {
          console.warn(`❌ ${operationName} failed after ${attempt + 1} attempts:`, lastError.message)
          break
        }

        // Check if we should retry based on the error
        if (this.config.retryCondition && !this.config.retryCondition(lastError)) {
          console.warn(`🚫 ${operationName} failed with non-retryable error:`, lastError.message)
          break
        }

        // Log retry attempt
        console.warn(
          `🔄 ${operationName} failed on attempt ${attempt + 1}, retrying in ${delay}ms:`,
          lastError.message
        )

        // Wait before next retry
        await this.wait(delay)
        
        // Calculate next delay with exponential backoff
        delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelay)
      }
    }

    // All retries exhausted, throw the last error
    throw lastError!
  }

  /**
   * Execute operation with custom retry config
   */
  async executeWithConfig<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    operationName: string = 'API Operation'
  ): Promise<T> {
    const originalConfig = this.config
    this.config = config
    
    try {
      return await this.execute(operation, operationName)
    } finally {
      this.config = originalConfig
    }
  }

  /**
   * Check if an error should be retried based on current config
   */
  shouldRetry(error: APIError): boolean {
    if (!this.config.retryCondition) {
      return true
    }
    return this.config.retryCondition(error)
  }

  /**
   * Get retry delay for a given attempt
   */
  getDelayForAttempt(attempt: number): number {
    return Math.min(
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelay
    )
  }

  /**
   * Get current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create a retry manager with a preset configuration
   */
  static withPreset(presetName: keyof typeof RETRY_PRESETS): RetryManager {
    const config = RETRY_PRESETS[presetName]
    if (!config) {
      throw new Error(`Unknown retry preset: ${presetName}`)
    }
    return new RetryManager(config)
  }

  /**
   * Create a retry manager for critical operations
   */
  static forCriticalOperations(): RetryManager {
    return new RetryManager(RETRY_PRESETS.critical)
  }

  /**
   * Create a retry manager for real-time operations
   */
  static forRealtimeOperations(): RetryManager {
    return new RetryManager(RETRY_PRESETS.realtime)
  }

  /**
   * Create a retry manager for authentication operations
   */
  static forAuthOperations(): RetryManager {
    return new RetryManager(RETRY_PRESETS.auth)
  }

  /**
   * Create a retry manager with no retries
   */
  static withoutRetries(): RetryManager {
    return new RetryManager(RETRY_PRESETS.none)
  }
}

/**
 * Utility function to wrap any async operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = RETRY_PRESETS.standard,
  operationName: string = 'Operation'
): Promise<T> {
  const retryManager = new RetryManager(config)
  return retryManager.execute(operation, operationName)
}

/**
 * Decorator function for adding retry logic to class methods
 */
export function retryable(config: RetryConfig = RETRY_PRESETS.standard) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const retryManager = new RetryManager(config)
      const operationName = `${target.constructor.name}.${propertyKey}`
      
      return retryManager.execute(
        () => originalMethod.apply(this, args),
        operationName
      )
    }

    return descriptor
  }
}
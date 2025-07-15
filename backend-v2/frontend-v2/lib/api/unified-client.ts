/**
 * Unified API Client
 * 
 * Provides a standardized HTTP client with comprehensive error handling,
 * retry logic, authentication, and performance monitoring
 */

import {
  APIResponse,
  APIError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  RequestOptions,
  APIClientConfig,
  DEFAULT_CLIENT_CONFIG,
  RETRY_PRESETS
} from './types/common'

import { RetryManager } from './retry-manager'
import { AuthManager } from './auth-manager'
import { PerformanceMonitor } from './performance-monitor'

export class UnifiedAPIClient {
  private config: APIClientConfig
  private retryManager: RetryManager
  private authManager: AuthManager
  private performanceMonitor: PerformanceMonitor

  constructor(config: Partial<APIClientConfig> = {}) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config }
    this.retryManager = new RetryManager(this.config.retry)
    this.authManager = new AuthManager(this.config.auth)
    this.performanceMonitor = new PerformanceMonitor(this.config.monitoring)
  }

  /**
   * Make an HTTP request with comprehensive error handling and monitoring
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const requestId = this.generateRequestId()
    const method = options.method || 'GET'
    const fullUrl = this.buildUrl(endpoint)

    // Start performance monitoring
    const endTiming = this.performanceMonitor.startTiming(requestId, endpoint, method)

    try {
      return await this.retryManager.execute(async () => {
        return await this.executeRequest<T>(requestId, fullUrl, endpoint, options)
      }, `${method} ${endpoint}`)
    } catch (error) {
      endTiming()
      
      // Enhanced error handling
      const apiError = this.enhanceError(error as Error, {
        endpoint,
        method,
        requestId,
        timestamp: new Date().toISOString()
      })

      // Record error metrics
      this.performanceMonitor.endTiming(
        requestId,
        endpoint,
        method,
        apiError.status || 0,
        this.getRequestSize(options.body),
        undefined,
        options.tags
      )

      throw apiError
    }
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(
    requestId: string,
    fullUrl: string,
    endpoint: string,
    options: RequestOptions
  ): Promise<APIResponse<T>> {
    const method = options.method || 'GET'
    const timeout = options.timeout || this.config.timeout

    // Prepare headers
    const authHeaders = await this.authManager.getHeaders()
    const headers: Record<string, string> = {
      'X-Request-ID': requestId,
      ...authHeaders,
      ...options.headers
    }
    
    // Only add Content-Type for requests with body
    if (options.body && method !== 'GET') {
      headers['Content-Type'] = 'application/json'
    }

    // Prepare request config
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const requestConfig: RequestInit = {
      method,
      headers,
      signal: controller.signal
    }

    // Add body for non-GET requests
    if (options.body && method !== 'GET') {
      if (typeof options.body === 'string') {
        requestConfig.body = options.body
      } else {
        requestConfig.body = JSON.stringify(options.body)
      }
    }

    try {
      // Execute the request
      const response = await fetch(fullUrl, requestConfig)
      clearTimeout(timeoutId)

      // Extract response metadata
      const responseHeaders = this.extractHeaders(response.headers)
      const responseRequestId = response.headers.get('X-Request-ID') || requestId
      const responseSize = this.getResponseSize(response.headers)

      // Record successful request metrics
      this.performanceMonitor.endTiming(
        requestId,
        endpoint,
        method,
        response.status,
        this.getRequestSize(options.body),
        responseSize,
        options.tags
      )

      // Handle different response statuses
      if (!response.ok) {
        throw await this.createErrorFromResponse(response, {
          endpoint,
          method,
          requestId: responseRequestId,
          timestamp: new Date().toISOString()
        })
      }

      // Parse response data
      const data = await this.parseResponseData<T>(response)

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        requestId: responseRequestId,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      clearTimeout(timeoutId)

      // Handle network errors and timeouts
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError('Request timeout', {
            endpoint,
            method,
            requestId,
            timestamp: new Date().toISOString()
          })
        }

        if (error.message.includes('fetch')) {
          throw new NetworkError('Network error', {
            endpoint,
            method,
            requestId,
            timestamp: new Date().toISOString()
          })
        }
      }

      throw error
    }
  }

  /**
   * Create an error from HTTP response
   */
  private async createErrorFromResponse(
    response: Response,
    context: Omit<import('./types/common').APIErrorContext, 'status' | 'statusText' | 'response'>
  ): Promise<APIError> {
    const errorContext = {
      ...context,
      status: response.status,
      statusText: response.statusText,
      response
    }

    try {
      const errorData = await response.json()

      // Handle specific error types
      switch (response.status) {
        case 401:
        case 403:
          return new AuthenticationError(
            errorData.message || errorData.detail || 'Authentication failed',
            errorContext
          )

        case 422:
        case 400:
          if (errorData.validation_errors || errorData.details) {
            return new ValidationError(
              errorData.message || 'Validation failed',
              errorContext,
              errorData.validation_errors || errorData.details
            )
          }
          break

        case 429:
          const retryAfter = response.headers.get('Retry-After')
          return new RateLimitError(
            errorData.message || 'Rate limit exceeded',
            errorContext,
            retryAfter ? parseInt(retryAfter) : undefined
          )
      }

      // Generic API error
      return new APIError(
        errorData.message || errorData.detail || `Request failed with status ${response.status}`,
        errorContext
      )

    } catch (parseError) {
      // Failed to parse error response
      return new APIError(
        `Request failed with status ${response.status}`,
        errorContext
      )
    }
  }

  /**
   * Enhance generic errors with API context
   */
  private enhanceError(
    error: Error,
    context: Omit<import('./types/common').APIErrorContext, 'status' | 'statusText' | 'response'>
  ): APIError {
    if (error instanceof APIError) {
      return error
    }

    return new APIError(error.message, context)
  }

  /**
   * Parse response data based on content type
   */
  private async parseResponseData<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('Content-Type') || ''

    if (contentType.includes('application/json')) {
      return response.json()
    }

    if (contentType.includes('text/')) {
      return response.text() as unknown as T
    }

    if (contentType.includes('application/octet-stream') || contentType.includes('application/pdf')) {
      return response.blob() as unknown as T
    }

    // Default to JSON parsing
    return response.json()
  }

  /**
   * Extract headers as plain object
   */
  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint
    }

    const baseUrl = this.config.baseURL.endsWith('/') 
      ? this.config.baseURL.slice(0, -1) 
      : this.config.baseURL

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

    return `${baseUrl}${cleanEndpoint}`
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get request size in bytes
   */
  private getRequestSize(body?: any): number | undefined {
    if (!body) return undefined
    
    if (typeof body === 'string') {
      return new Blob([body]).size
    }
    
    if (typeof body === 'object') {
      return new Blob([JSON.stringify(body)]).size
    }
    
    return undefined
  }

  /**
   * Get response size from headers
   */
  private getResponseSize(headers: Headers): number | undefined {
    const contentLength = headers.get('Content-Length')
    return contentLength ? parseInt(contentLength) : undefined
  }

  // ===============================
  // Convenience Methods
  // ===============================

  /**
   * Make a GET request
   */
  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * Make a POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data
    })
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data
    })
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data
    })
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  // ===============================
  // Configuration Methods
  // ===============================

  /**
   * Get current configuration
   */
  getConfig(): APIClientConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<APIClientConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (config.retry) {
      this.retryManager.updateConfig(config.retry)
    }
    
    if (config.monitoring) {
      this.performanceMonitor.updateConfig(config.monitoring)
    }
  }

  /**
   * Get authentication manager
   */
  getAuthManager(): AuthManager {
    return this.authManager
  }

  /**
   * Get performance monitor
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor
  }

  /**
   * Get retry manager
   */
  getRetryManager(): RetryManager {
    return this.retryManager
  }

  /**
   * Set custom refresh token function
   */
  setTokenRefreshFunction(refreshFn: (refreshToken: string) => Promise<import('./auth-manager').AuthTokens>): void {
    this.authManager.setRefreshFunction(refreshFn)
  }

  // ===============================
  // Factory Methods
  // ===============================

  /**
   * Create client with standard configuration
   */
  static createStandard(baseURL?: string): UnifiedAPIClient {
    return new UnifiedAPIClient({
      baseURL: baseURL || DEFAULT_CLIENT_CONFIG.baseURL,
      retry: RETRY_PRESETS.standard
    })
  }

  /**
   * Create client for critical operations
   */
  static createCritical(baseURL?: string): UnifiedAPIClient {
    return new UnifiedAPIClient({
      baseURL: baseURL || DEFAULT_CLIENT_CONFIG.baseURL,
      retry: RETRY_PRESETS.critical
    })
  }

  /**
   * Create client for realtime operations
   */
  static createRealtime(baseURL?: string): UnifiedAPIClient {
    return new UnifiedAPIClient({
      baseURL: baseURL || DEFAULT_CLIENT_CONFIG.baseURL,
      retry: RETRY_PRESETS.realtime
    })
  }

  /**
   * Create client for authentication operations
   */
  static createAuth(baseURL?: string): UnifiedAPIClient {
    return new UnifiedAPIClient({
      baseURL: baseURL || DEFAULT_CLIENT_CONFIG.baseURL,
      retry: RETRY_PRESETS.auth
    })
  }
}

// Export default instance for backward compatibility
export const apiClient = new UnifiedAPIClient()

// Export convenience alias
export const api = apiClient
/**
 * API Client
 * 
 * Provides a unified HTTP client for API requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
}

class APIClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  async request(endpoint: string, options: RequestOptions = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    if (options.body) {
      config.body = JSON.stringify(options.body)
    }

    // Add auth token if available
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async get(endpoint: string, headers?: Record<string, string>) {
    return this.request(endpoint, { method: 'GET', headers })
  }

  async post(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request(endpoint, { method: 'POST', body, headers })
  }

  async put(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request(endpoint, { method: 'PUT', body, headers })
  }

  async delete(endpoint: string, headers?: Record<string, string>) {
    return this.request(endpoint, { method: 'DELETE', headers })
  }
}

// Export default instance
const apiClient = new APIClient()
export default apiClient

// Also export the class for named imports  
export { APIClient, apiClient }

// Export api alias directly from source
export { apiClient as api }
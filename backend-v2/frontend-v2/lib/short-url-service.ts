/**
 * Short URL Service Client
 * 
 * Client for interacting with the BookedBarber URL shortening API
 * Provides clean, branded short URLs for sharing booking links
 */

interface CreateShortUrlRequest {
  original_url: string
  title?: string
  description?: string
  custom_code?: string
  expires_in_days?: number
  created_by?: string
}

interface CreateShortUrlResponse {
  success: boolean
  short_url?: string
  short_code?: string
  original_url?: string
  id?: number
  expires_at?: string
  created_at?: string
  error?: string
}

interface ShortUrlStats {
  short_code: string
  original_url: string
  title?: string
  click_count: number
  last_clicked?: string
  created_at: string
  expires_at?: string
  is_active: boolean
}

export class ShortUrlService {
  private baseUrl: string

  constructor(baseUrl: string = '/api/v2') {
    this.baseUrl = baseUrl
  }

  /**
   * Create a short URL for a booking link with custom parameters
   */
  async createBookingShortUrl(
    originalUrl: string,
    customName?: string,
    expirationDate?: string,
    description?: string
  ): Promise<CreateShortUrlResponse> {
    try {
      // Calculate expiration days if date is provided
      let expiresInDays: number | undefined
      if (expirationDate) {
        const expiry = new Date(expirationDate)
        const now = new Date()
        const diffTime = expiry.getTime() - now.getTime()
        expiresInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        // Don't create expired links
        if (expiresInDays <= 0) {
          return {
            success: false,
            error: 'Expiration date must be in the future'
          }
        }
      }

      // Generate a clean custom code from the custom name
      let customCode: string | undefined
      if (customName?.trim()) {
        customCode = customName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
          .substring(0, 10) // Limit to 10 characters
        
        // Ensure it's not empty after cleaning
        if (!customCode) {
          customCode = undefined
        }
      }

      const requestData: CreateShortUrlRequest = {
        original_url: originalUrl,
        title: description || 'BookedBarber Booking Link',
        description: description || `Booking link${customName ? ` - ${customName}` : ''}`,
        custom_code: customCode,
        expires_in_days: expiresInDays,
        created_by: 'share_modal'
      }

      const response = await fetch(`${this.baseUrl}/short-urls/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: CreateShortUrlResponse = await response.json()
      return result

    } catch (error) {
      console.error('Error creating short URL:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get statistics for a short URL
   */
  async getShortUrlStats(shortCode: string): Promise<ShortUrlStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/short-urls/stats/${shortCode}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching short URL stats:', error)
      return null
    }
  }

  /**
   * Extract short code from a short URL
   */
  extractShortCode(shortUrl: string): string | null {
    try {
      const url = new URL(shortUrl)
      const pathname = url.pathname
      const shortCode = pathname.substring(1) // Remove leading slash
      return shortCode || null
    } catch (error) {
      return null
    }
  }

  /**
   * Check if a URL is a short URL
   */
  isShortUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.includes('bkdbrbr.com') || 
             urlObj.hostname.includes('short.6fb.app')
    } catch (error) {
      return false
    }
  }

  /**
   * Generate a fallback URL if shortening fails
   */
  generateFallbackUrl(
    baseUrl: string,
    customName?: string,
    expirationDate?: string
  ): string {
    let url = baseUrl
    const params = new URLSearchParams()

    if (customName?.trim()) {
      params.append('ref', customName.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 20))
    }

    if (expirationDate) {
      const expiryTimestamp = new Date(expirationDate).getTime()
      params.append('expires', expiryTimestamp.toString())
    }

    const queryString = params.toString()
    return queryString ? `${url}?${queryString}` : url
  }

  /**
   * Create a booking short URL with automatic fallback
   */
  async createBookingShortUrlWithFallback(
    originalUrl: string,
    customName?: string,
    expirationDate?: string,
    description?: string
  ): Promise<{
    url: string
    isShortUrl: boolean
    error?: string
  }> {
    // Try to create a short URL first
    const shortUrlResult = await this.createBookingShortUrl(
      originalUrl,
      customName,
      expirationDate,
      description
    )

    if (shortUrlResult.success && shortUrlResult.short_url) {
      return {
        url: shortUrlResult.short_url,
        isShortUrl: true
      }
    }

    // Fall back to regular URL with parameters
    const fallbackUrl = this.generateFallbackUrl(originalUrl, customName, expirationDate)
    
    return {
      url: fallbackUrl,
      isShortUrl: false,
      error: shortUrlResult.error
    }
  }
}

// Export singleton instance
export const shortUrlService = new ShortUrlService()

// Export types for use in other components
export type { CreateShortUrlResponse, ShortUrlStats }
/**
 * Smart CTA API Client
 * 
 * Frontend client for the Smart CTA generation service
 */

export interface CTAGenerationRequest {
  business_type: string
  target_audience: string
  tone: string
  context: string
  sentiment: 'positive' | 'neutral' | 'negative'
  cta_type: 'book' | 'visit' | 'contact' | 'follow' | 'special_offer' | 'referral'
  custom_context?: string
  personalization_level?: 'high' | 'medium' | 'low'
}

export interface GeneratedCTA {
  id: string
  text: string
  score: number
  context: string
  sentiment: string
  cta_type: string
  metadata: {
    generated_at: string
    personalization_used: boolean
    methodology_score?: number
  }
}

export interface CTAGenerationResponse {
  success: boolean
  ctas: GeneratedCTA[]
  request_id: string
  generation_time_ms: number
}

export interface CTAPerformance {
  cta_id: string
  clicks: number
  conversions: number
  conversion_rate: number
  rating: number
  usage_count: number
}

/**
 * Generate smart CTAs based on configuration
 */
export async function generateSmartCTAs(
  request: CTAGenerationRequest,
  count: number = 3
): Promise<CTAGenerationResponse> {
  try {
    const response = await fetch('/api/v1/smart-cta/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        count
      })
    })

    if (!response.ok) {
      throw new Error(`CTA generation failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Smart CTA generation error:', error)
    throw new Error('Failed to generate CTAs. Please try again.')
  }
}

/**
 * Get CTA performance analytics
 */
export async function getCTAPerformance(
  cta_ids?: string[],
  date_range?: { start: string; end: string }
): Promise<CTAPerformance[]> {
  try {
    const params = new URLSearchParams()
    if (cta_ids && cta_ids.length > 0) {
      params.append('cta_ids', cta_ids.join(','))
    }
    if (date_range) {
      params.append('start_date', date_range.start)
      params.append('end_date', date_range.end)
    }

    const response = await fetch(`/api/v1/smart-cta/performance?${params}`)
    
    if (!response.ok) {
      throw new Error(`Performance fetch failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CTA performance fetch error:', error)
    throw new Error('Failed to fetch CTA performance data.')
  }
}

/**
 * Rate a CTA (for learning and optimization)
 */
export async function rateCTA(
  cta_id: string, 
  rating: number, 
  feedback?: string
): Promise<{ success: boolean }> {
  try {
    const response = await fetch('/api/v1/smart-cta/rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cta_id,
        rating,
        feedback
      })
    })

    if (!response.ok) {
      throw new Error(`CTA rating failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CTA rating error:', error)
    throw new Error('Failed to rate CTA.')
  }
}

/**
 * Get CTA templates and examples
 */
export async function getCTAExamples(
  context?: string,
  cta_type?: string
): Promise<GeneratedCTA[]> {
  try {
    const params = new URLSearchParams()
    if (context) params.append('context', context)
    if (cta_type) params.append('cta_type', cta_type)

    const response = await fetch(`/api/v1/smart-cta/examples?${params}`)
    
    if (!response.ok) {
      throw new Error(`Examples fetch failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.examples || []
  } catch (error) {
    console.error('CTA examples fetch error:', error)
    throw new Error('Failed to fetch CTA examples.')
  }
}

/**
 * Save a custom CTA template
 */
export async function saveCTATemplate(
  text: string,
  context: string,
  cta_type: string,
  tags: string[] = []
): Promise<{ success: boolean; template_id: string }> {
  try {
    const response = await fetch('/api/v1/smart-cta/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        context,
        cta_type,
        tags
      })
    })

    if (!response.ok) {
      throw new Error(`Template save failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CTA template save error:', error)
    throw new Error('Failed to save CTA template.')
  }
}

// Export types for use in components
export type {
  CTAGenerationRequest,
  GeneratedCTA,
  CTAGenerationResponse,
  CTAPerformance
}
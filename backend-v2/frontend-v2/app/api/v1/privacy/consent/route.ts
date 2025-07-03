import { NextRequest, NextResponse } from 'next/server'

/**
 * Privacy consent endpoint for GDPR compliance
 * Handles cookie consent preferences storage
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categories, consentDate, version } = body

    // Validate required fields
    if (!categories || !consentDate || !version) {
      return NextResponse.json(
        { error: 'Missing required fields: categories, consentDate, version' },
        { status: 400 }
      )
    }

    // In a real app, you might want to:
    // 1. Store consent in database for compliance tracking
    // 2. Associate with user ID if logged in
    // 3. Create audit trail
    
    // For now, just acknowledge the consent was received
    console.log('Cookie consent received:', {
      categories,
      consentDate,
      version,
      userAgent: request.headers.get('user-agent'),
      ip: request.ip || request.headers.get('x-forwarded-for'),
      timestamp: new Date().toISOString()
    })

    // Optional: Forward to backend for persistent storage
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const backendResponse = await fetch(`${API_URL}/api/v1/privacy/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': request.ip || '',
          'User-Agent': request.headers.get('user-agent') || ''
        },
        body: JSON.stringify({
          categories,
          consentDate,
          version,
          metadata: {
            userAgent: request.headers.get('user-agent'),
            ip: request.ip || request.headers.get('x-forwarded-for'),
            source: 'frontend-api'
          }
        })
      })

      if (!backendResponse.ok) {
        console.warn('Failed to forward consent to backend:', backendResponse.status)
      }
    } catch (backendError) {
      console.warn('Backend consent forwarding failed:', backendError)
      // Don't fail the request if backend is down
    }

    return NextResponse.json({
      success: true,
      message: 'Consent preferences saved successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error handling consent:', error)
    return NextResponse.json(
      { error: 'Failed to process consent preferences' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Get consent history (if needed for privacy dashboard)
  return NextResponse.json({
    message: 'Use POST to submit consent preferences',
    endpoints: {
      submit: 'POST /api/v1/privacy/consent',
      privacy_policy: '/privacy',
      terms_of_service: '/terms'
    }
  })
}

export async function OPTIONS(request: NextRequest) {
  // Handle CORS preflight
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
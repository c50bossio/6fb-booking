import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  console.log('[Google OAuth] Callback received:', { code: code?.substring(0, 20), error })

  if (error) {
    console.error('[Google OAuth] Authorization error:', error)
    return NextResponse.redirect(new URL('/settings?google_error=' + encodeURIComponent(error), request.url))
  }

  if (!code) {
    console.error('[Google OAuth] No authorization code received')
    return NextResponse.redirect(new URL('/settings?google_error=no_code', request.url))
  }

  try {
    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[Google OAuth] Token exchange failed:', errorText)
      throw new Error(`Token exchange failed: ${errorText}`)
    }

    const tokens = await tokenResponse.json()
    console.log('[Google OAuth] Tokens received successfully')

    // Store tokens in backend via our API
    const backendResponse = await fetch(`${process.env.BACKEND_URL}/api/v1/google-calendar/store-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${request.cookies.get('access_token')?.value}`, // User's auth token
      },
      body: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
      }),
    })

    if (!backendResponse.ok) {
      console.error('[Google OAuth] Failed to store tokens in backend')
      throw new Error('Failed to store tokens')
    }

    console.log('[Google OAuth] Integration successful!')
    return NextResponse.redirect(new URL('/settings?google_success=true', request.url))

  } catch (error) {
    console.error('[Google OAuth] Callback error:', error)
    return NextResponse.redirect(new URL('/settings?google_error=' + encodeURIComponent(String(error)), request.url))
  }
}

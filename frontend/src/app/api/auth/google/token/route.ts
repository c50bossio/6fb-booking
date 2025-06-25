import { NextRequest, NextResponse } from 'next/server'
import { GOOGLE_CALENDAR_CONFIG } from '@/lib/google-calendar/config'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_CALENDAR_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CALENDAR_CONFIG.clientId,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: GOOGLE_CALENDAR_CONFIG.redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Token exchange failed:', error)
      return NextResponse.json(
        { error: 'Failed to exchange authorization code' },
        { status: 400 }
      )
    }

    const tokens = await tokenResponse.json()

    // Return tokens to client
    return NextResponse.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
      tokenType: tokens.token_type,
    })
  } catch (error) {
    console.error('Error in Google token exchange:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

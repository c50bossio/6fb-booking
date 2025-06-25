import { NextRequest, NextResponse } from 'next/server'
import { GOOGLE_CALENDAR_CONFIG } from '@/lib/google-calendar/config'

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json()

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    // Exchange refresh token for new access token
    const tokenResponse = await fetch(GOOGLE_CALENDAR_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CALENDAR_CONFIG.clientId,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Token refresh failed:', error)
      return NextResponse.json(
        { error: 'Failed to refresh access token' },
        { status: 400 }
      )
    }

    const tokens = await tokenResponse.json()

    // Return new tokens to client
    return NextResponse.json({
      accessToken: tokens.access_token,
      expiryDate: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
      tokenType: tokens.token_type,
    })
  } catch (error) {
    console.error('Error in Google token refresh:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

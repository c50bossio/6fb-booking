import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/calendar?auth_error=${error}`, request.url)
    )
  }

  // Verify we have an authorization code
  if (!code) {
    return NextResponse.redirect(
      new URL('/calendar?auth_error=no_code', request.url)
    )
  }

  // Redirect to calendar page with authorization code
  // The client-side will handle the token exchange
  return NextResponse.redirect(
    new URL(`/calendar?google_auth_code=${code}${state ? `&state=${state}` : ''}`, request.url)
  )
}

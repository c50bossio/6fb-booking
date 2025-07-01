// Auth Debug Utility - helps diagnose authentication issues

export function checkAuthStatus() {
  console.log('=== Authentication Debug Information ===')
  
  // Check localStorage
  const token = localStorage.getItem('token')
  const refreshToken = localStorage.getItem('refresh_token')
  
  console.log('Token present:', !!token)
  console.log('Refresh token present:', !!refreshToken)
  
  if (token) {
    // Decode JWT without verification (for debugging only)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      console.log('Token payload:', payload)
      
      // Check expiration
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000)
        const now = new Date()
        console.log('Token expires at:', expDate)
        console.log('Token expired:', expDate < now)
        console.log('Time until expiration:', Math.floor((expDate.getTime() - now.getTime()) / 1000 / 60), 'minutes')
      }
    } catch (e) {
      console.error('Failed to decode token:', e)
    }
  }
  
  // Check API configuration
  console.log('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  console.log('Current URL:', window.location.href)
  
  // Check cookies
  console.log('Cookies:', document.cookie)
  
  console.log('=================================')
}

export async function testAPIConnection() {
  console.log('=== Testing API Connection ===')
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  // Test 1: Basic connectivity
  try {
    console.log('Test 1: Basic connectivity to /health')
    const healthResponse = await fetch(`${API_URL}/health`)
    console.log('Health check status:', healthResponse.status)
    const healthData = await healthResponse.json()
    console.log('Health check response:', healthData)
  } catch (error) {
    console.error('Health check failed:', error)
  }
  
  // Test 2: CORS preflight
  try {
    console.log('\nTest 2: CORS preflight check')
    const corsResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'OPTIONS',
    })
    console.log('CORS preflight status:', corsResponse.status)
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': corsResponse.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': corsResponse.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': corsResponse.headers.get('Access-Control-Allow-Headers'),
    })
  } catch (error) {
    console.error('CORS preflight failed:', error)
  }
  
  // Test 3: Authenticated request
  const token = localStorage.getItem('token')
  if (token) {
    try {
      console.log('\nTest 3: Authenticated request to /api/v1/auth/me')
      const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
      console.log('Auth check status:', meResponse.status)
      if (meResponse.ok) {
        const userData = await meResponse.json()
        console.log('Current user:', userData)
      } else {
        console.error('Auth check failed:', await meResponse.text())
      }
    } catch (error) {
      console.error('Auth check error:', error)
    }
  } else {
    console.log('\nTest 3: Skipped (no token)')
  }
  
  console.log('==============================')
}

export function clearAuthData() {
  console.log('Clearing all authentication data...')
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  
  // Clear any auth-related cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
  })
  
  console.log('Auth data cleared. Please login again.')
}

// Export to window for easy access in console
if (typeof window !== 'undefined') {
  (window as any).authDebug = {
    checkStatus: checkAuthStatus,
    testAPI: testAPIConnection,
    clear: clearAuthData,
  }
  console.log('Auth debug tools available: window.authDebug.checkStatus(), window.authDebug.testAPI(), window.authDebug.clear()')
}
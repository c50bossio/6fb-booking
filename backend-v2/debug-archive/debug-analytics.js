// Debug script to test the analytics page issue
console.log('🔍 Debugging analytics page issue...')

// Check if we're on the right page
console.log('Current URL:', window.location.href)

// Check for auth token
const token = localStorage.getItem('token')
console.log('Auth token present:', !!token)
if (token) {
  console.log('Token preview:', token.substring(0, 20) + '...')
} else {
  console.log('❌ No auth token found in localStorage')
}

// Check for other auth-related items
const refreshToken = localStorage.getItem('refresh_token')
console.log('Refresh token present:', !!refreshToken)

const user = localStorage.getItem('user')
console.log('User data present:', !!user)
if (user) {
  try {
    const userData = JSON.parse(user)
    console.log('User role:', userData.role)
    console.log('User ID:', userData.id)
  } catch (e) {
    console.log('Error parsing user data:', e)
  }
}

// Test the API endpoint directly
async function testAnalyticsAPI() {
  console.log('🔬 Testing analytics API endpoint...')
  
  try {
    const response = await fetch('/api/v1/agents/analytics', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    
    console.log('API Response status:', response.status)
    console.log('API Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API Response data:', data)
    } else {
      const errorText = await response.text()
      console.log('❌ API Error response:', errorText)
    }
  } catch (error) {
    console.log('❌ Network error:', error)
  }
}

// Test if we can access any authenticated endpoint
async function testAuthStatus() {
  console.log('🔐 Testing authentication status...')
  
  try {
    const response = await fetch('/api/v1/auth/me', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Auth check status:', response.status)
    
    if (response.ok) {
      const userData = await response.json()
      console.log('✅ User authenticated:', userData)
      return true
    } else {
      console.log('❌ User not authenticated')
      return false
    }
  } catch (error) {
    console.log('❌ Auth check error:', error)
    return false
  }
}

// Run the tests
async function runDiagnostics() {
  console.log('🚀 Starting analytics page diagnostics...')
  
  const isAuthenticated = await testAuthStatus()
  
  if (isAuthenticated) {
    await testAnalyticsAPI()
  } else {
    console.log('⚠️ User needs to log in first')
    console.log('Current page should redirect to login or show login form')
  }
  
  // Check if React components are loading
  setTimeout(() => {
    const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]')
    const errorElements = document.querySelectorAll('[class*="error"]')
    
    console.log('Loading elements found:', loadingElements.length)
    console.log('Error elements found:', errorElements.length)
    
    if (loadingElements.length > 0) {
      console.log('⏳ Page seems to be stuck in loading state')
    }
    
    if (errorElements.length > 0) {
      console.log('❌ Error elements found on page')
      errorElements.forEach((el, i) => {
        console.log(`Error ${i + 1}:`, el.textContent)
      })
    }
  }, 2000)
}

runDiagnostics()
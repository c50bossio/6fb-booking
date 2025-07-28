// Test authentication flow with fixed API client
const { login, getProfile, logout } = require('./lib/api.ts')

async function testAuthFlow() {
  console.log('🔐 Testing authentication flow...')
  
  try {
    // Test login
    console.log('1️⃣ Testing login...')
    const loginResponse = await login('test@example.com', 'testpass123')
    console.log('✅ Login successful:', {
      hasAccessToken: !!loginResponse.access_token,
      hasRefreshToken: !!loginResponse.refresh_token,
      tokenType: loginResponse.token_type
    })
    
    // Test get profile
    console.log('2️⃣ Testing profile fetch...')
    const profile = await getProfile()
    console.log('✅ Profile fetch successful:', {
      email: profile.email,
      name: profile.name,
      role: profile.role,
      unified_role: profile.unified_role
    })
    
    // Test logout
    console.log('3️⃣ Testing logout...')
    await logout()
    console.log('✅ Logout successful')
    
    console.log('🎉 All authentication tests passed!')
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAuthFlow()
}

module.exports = { testAuthFlow }
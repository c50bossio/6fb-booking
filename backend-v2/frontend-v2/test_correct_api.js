const fetch = require('node-fetch');

async function testCorrectAPI() {
  console.log('🔍 Testing with correct API endpoints...\n');
  
  // Test correct profile endpoint
  console.log('Testing correct profile endpoint...');
  try {
    const response = await fetch('http://localhost:8000/api/v1/auth/me');
    console.log(`/api/v1/auth/me Status: ${response.status}`);
    if (response.status === 401) {
      console.log('✅ Correct endpoint found (requires auth)');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test login with username instead of email
  console.log('\nTesting login with username field...');
  try {
    const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin@6fb.com',  // Changed from email to username
        password: 'admin123'
      })
    });
    
    const loginStatus = loginResponse.status;
    console.log(`Login Status: ${loginStatus}`);
    
    if (loginStatus === 200) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log(`Token type: ${loginData.token_type}`);
      console.log(`Token present: ${!!loginData.access_token}`);
      
      // Test authenticated request to /me endpoint
      if (loginData.access_token) {
        console.log('\nTesting authenticated request to /me...');
        const profileResponse = await fetch('http://localhost:8000/api/v1/auth/me', {
          headers: {
            'Authorization': `${loginData.token_type} ${loginData.access_token}`
          }
        });
        
        console.log(`Profile Status: ${profileResponse.status}`);
        if (profileResponse.status === 200) {
          const profileData = await profileResponse.json();
          console.log('✅ Profile retrieved successfully');
          console.log('User:', profileData.email || profileData.username);
          console.log('Role:', profileData.role);
        } else {
          const error = await profileResponse.text();
          console.log('❌ Profile failed:', error);
        }
      }
    } else {
      const errorText = await loginResponse.text();
      console.log('❌ Login failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
  }
}

testCorrectAPI().catch(console.error);
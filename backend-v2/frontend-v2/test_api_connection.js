const fetch = require('node-fetch');

async function testAPIConnection() {
  console.log('🔍 Testing API Connection...\n');
  
  const tests = [
    {
      name: 'Backend Health Check',
      url: 'http://localhost:8000/health',
      expectedStatus: 200
    },
    {
      name: 'API Docs',
      url: 'http://localhost:8000/docs',
      expectedStatus: 200
    },
    {
      name: 'Profile Endpoint (No Auth)',
      url: 'http://localhost:8000/api/v1/auth/profile',
      expectedStatus: 401
    },
    {
      name: 'Enterprise Dashboard (No Auth)',
      url: 'http://localhost:8000/api/v1/enterprise/dashboard',
      expectedStatus: 401
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      console.log(`URL: ${test.url}`);
      
      const response = await fetch(test.url);
      const status = response.status;
      
      console.log(`Status: ${status}`);
      console.log(`Expected: ${test.expectedStatus}`);
      console.log(`Result: ${status === test.expectedStatus ? '✅ PASS' : '❌ FAIL'}`);
      
      if (status !== test.expectedStatus) {
        const text = await response.text();
        console.log(`Response: ${text.substring(0, 200)}...`);
      }
      
      console.log('---\n');
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('---\n');
    }
  }
  
  // Test login flow
  console.log('Testing Login Flow...');
  try {
    const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@6fb.com',
        password: 'admin123'
      })
    });
    
    const loginStatus = loginResponse.status;
    console.log(`Login Status: ${loginStatus}`);
    
    if (loginStatus === 200) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log(`Token present: ${!!loginData.access_token}`);
      
      // Test authenticated request
      if (loginData.access_token) {
        console.log('\nTesting authenticated request...');
        const profileResponse = await fetch('http://localhost:8000/api/v1/auth/profile', {
          headers: {
            'Authorization': `Bearer ${loginData.access_token}`
          }
        });
        
        console.log(`Profile Status: ${profileResponse.status}`);
        if (profileResponse.status === 200) {
          const profileData = await profileResponse.json();
          console.log('✅ Profile retrieved:', profileData.email);
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

testAPIConnection().catch(console.error);
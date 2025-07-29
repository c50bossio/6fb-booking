const fetch = require('node-fetch');

async function testFrontendLogin() {
  console.log('🔍 Testing frontend login simulation...\n');
  
  try {
    // Simulate what the frontend should be doing
    console.log('1️⃣ Making login request to frontend API URL...');
    
    const response = await fetch('http://localhost:8000/api/v2/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',  // Simulate frontend origin
        'Referer': 'http://localhost:3000/login'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'admin@bookedbarber.com',
        password: 'admin123'
      })
    });
    
    console.log('2️⃣ Response status:', response.status);
    console.log('3️⃣ Response headers:');
    
    // Check for Set-Cookie headers
    const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
    setCookieHeaders.forEach((cookie, index) => {
      console.log(`   Cookie ${index + 1}: ${cookie.substring(0, 80)}...`);
    });
    
    console.log('4️⃣ CORS headers:');
    console.log('   Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('   Access-Control-Allow-Credentials:', response.headers.get('access-control-allow-credentials'));
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ LOGIN SUCCESS!');
      console.log('   Tokens received:', {
        access_token: data.access_token ? 'YES' : 'NO',
        refresh_token: data.refresh_token ? 'YES' : 'NO',
        csrf_token: data.csrf_token ? 'YES' : 'NO'
      });
    } else {
      const errorData = await response.text();
      console.log('\n❌ LOGIN FAILED:');
      console.log('   Error:', errorData);
    }
    
  } catch (error) {
    console.error('💥 Network error:', error.message);
  }
}

testFrontendLogin();
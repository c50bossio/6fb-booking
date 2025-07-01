const fetch = require('node-fetch');

async function testBookingsAPI() {
  console.log('🔍 Testing Bookings API...\n');
  
  // First, login to get token
  console.log('1. Logging in...');
  const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin@6fb.com',
      password: 'admin123'
    })
  });
  
  if (loginResponse.status !== 200) {
    console.error('Login failed:', await loginResponse.text());
    return;
  }
  
  const { access_token, token_type } = await loginResponse.json();
  console.log('✅ Login successful\n');
  
  // Test bookings endpoint
  console.log('2. Testing GET /api/v1/bookings...');
  try {
    const bookingsResponse = await fetch('http://localhost:8000/api/v1/bookings', {
      headers: {
        'Authorization': `${token_type} ${access_token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Status: ${bookingsResponse.status}`);
    console.log(`Headers:`, bookingsResponse.headers.raw());
    
    if (bookingsResponse.status === 200) {
      const data = await bookingsResponse.json();
      console.log('✅ Bookings response:', JSON.stringify(data, null, 2));
    } else {
      const error = await bookingsResponse.text();
      console.log('❌ Error:', error);
    }
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
  }
  
  // Test from browser perspective with CORS
  console.log('\n3. Testing with CORS headers (simulating browser)...');
  try {
    const corsResponse = await fetch('http://localhost:8000/api/v1/bookings', {
      headers: {
        'Authorization': `${token_type} ${access_token}`,
        'Accept': 'application/json',
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/'
      }
    });
    
    console.log(`CORS Status: ${corsResponse.status}`);
    console.log(`Access-Control-Allow-Origin: ${corsResponse.headers.get('access-control-allow-origin')}`);
    
    if (corsResponse.status === 200) {
      console.log('✅ CORS request successful');
    } else {
      console.log('❌ CORS request failed');
    }
  } catch (error) {
    console.error('❌ CORS error:', error.message);
  }
}

testBookingsAPI().catch(console.error);
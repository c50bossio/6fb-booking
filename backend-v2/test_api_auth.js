// Simple API authentication test

async function testAuth() {
  console.log('Testing authentication flow...\n');
  
  const API_URL = 'http://localhost:8000';
  
  // Test 1: Check if backend is running
  console.log('1. Testing backend health...');
  try {
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✓ Backend is healthy:', healthData);
  } catch (error) {
    console.error('✗ Backend health check failed:', error.message);
    return;
  }
  
  // Test 2: Try to login
  console.log('\n2. Testing login...');
  try {
    const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin@6fb.com',
        password: 'admin123' // Common demo password
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    
    if (loginResponse.ok) {
      console.log('✓ Login successful!');
      console.log('Token:', loginData.access_token?.substring(0, 20) + '...');
      
      // Test 3: Use token to get user info
      console.log('\n3. Testing authenticated request...');
      const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${loginData.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Auth check status:', meResponse.status);
      if (meResponse.ok) {
        const userData = await meResponse.json();
        console.log('✓ Authenticated user:', userData);
      } else {
        console.error('✗ Auth check failed:', await meResponse.text());
      }
      
    } else {
      console.error('✗ Login failed:', loginData);
      
      // Try with default password
      console.log('\nTrying with default password "password"...');
      const retryResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin@6fb.com',
          password: 'password'
        })
      });
      
      if (retryResponse.ok) {
        console.log('✓ Login successful with default password!');
      } else {
        console.error('✗ Login failed with default password too');
        
        // Check what users exist
        console.log('\n4. Checking database for users...');
        const { exec } = require('child_process');
        exec('sqlite3 6fb_booking.db "SELECT email, role FROM users LIMIT 5;"', (error, stdout, stderr) => {
          if (error) {
            console.error('Database query failed:', error);
            return;
          }
          console.log('Existing users:');
          console.log(stdout);
        });
      }
    }
    
  } catch (error) {
    console.error('✗ Login request failed:', error.message);
  }
  
  // Test CORS
  console.log('\n5. Testing CORS configuration...');
  try {
    const corsResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    });
    
    console.log('CORS preflight status:', corsResponse.status);
    console.log('CORS headers:');
    console.log('  Allow-Origin:', corsResponse.headers.get('access-control-allow-origin'));
    console.log('  Allow-Methods:', corsResponse.headers.get('access-control-allow-methods'));
    console.log('  Allow-Headers:', corsResponse.headers.get('access-control-allow-headers'));
    console.log('  Allow-Credentials:', corsResponse.headers.get('access-control-allow-credentials'));
  } catch (error) {
    console.error('✗ CORS check failed:', error.message);
  }
}

// Run the test
testAuth().catch(console.error);
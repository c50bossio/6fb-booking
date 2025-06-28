#!/usr/bin/env node

const https = require('https');

console.log('🔍 Testing authentication endpoints...\n');

// Test 1: Backend health check
const testBackendHealth = () => {
  return new Promise((resolve) => {
    const req = https.get('https://sixfb-backend.onrender.com/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Backend health check:', res.statusCode, data.substring(0, 100));
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log('❌ Backend health check failed:', err.message);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.log('❌ Backend health check timed out');
      resolve(false);
    });
  });
};

// Test 2: Test authentication endpoint
const testAuthEndpoint = () => {
  return new Promise((resolve) => {
    const postData = 'username=admin@6fb.com&password=admin123';

    const options = {
      hostname: 'sixfb-backend.onrender.com',
      port: 443,
      path: '/api/v1/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Auth endpoint test:', res.statusCode);
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log('✅ Login successful, got access token');
            resolve(true);
          } catch (e) {
            console.log('❌ Failed to parse auth response');
            resolve(false);
          }
        } else {
          console.log('❌ Auth failed:', data.substring(0, 200));
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Auth endpoint error:', err.message);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log('❌ Auth endpoint timed out');
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};

// Run tests
async function runTests() {
  console.log('📊 Authentication Flow Test Results:');

  const healthOk = await testBackendHealth();
  const authOk = await testAuthEndpoint();

  console.log('\n📋 Summary:');
  console.log('Backend Health:', healthOk ? '✅ OK' : '❌ FAILED');
  console.log('Authentication:', authOk ? '✅ OK' : '❌ FAILED');

  if (healthOk && authOk) {
    console.log('\n🎉 All tests passed! Authentication should work.');
  } else {
    console.log('\n⚠️  Some tests failed. Check backend connectivity.');
  }
}

runTests().catch(console.error);

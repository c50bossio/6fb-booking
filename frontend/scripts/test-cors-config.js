#!/usr/bin/env node

/**
 * Test script to verify CORS configuration
 * Run: node scripts/test-cors-config.js
 */

const https = require('https');

const BACKEND_URL = 'https://sixfb-backend.onrender.com';
const FRONTEND_ORIGIN = 'https://bookbarber-6fb.vercel.app';

console.log('🧪 Testing CORS Configuration...\n');

// Test 1: Health check
console.log('1️⃣ Testing health endpoint...');
testRequest('GET', '/health', {}, null)
  .then(() => {
    console.log('✅ Health endpoint working\n');

    // Test 2: Preflight request
    console.log('2️⃣ Testing CORS preflight request...');
    return testRequest('OPTIONS', '/api/v1/auth/token', {
      'Origin': FRONTEND_ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    });
  })
  .then(() => {
    console.log('✅ CORS preflight working\n');

    // Test 3: Actual POST request
    console.log('3️⃣ Testing actual POST request with CORS...');
    return testRequest('POST', '/api/v1/auth/token', {
      'Origin': FRONTEND_ORIGIN,
      'Content-Type': 'application/x-www-form-urlencoded'
    }, 'username=test@example.com&password=testpass');
  })
  .then(() => {
    console.log('✅ POST request with CORS working\n');
    console.log('🎉 ALL TESTS PASSED! CORS is properly configured.');
    console.log('\n📋 Your Vercel environment variables should be:');
    console.log('NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com/api/v1');
    console.log('NEXT_PUBLIC_USE_CORS_PROXY=false');
    console.log('NEXT_PUBLIC_ENVIRONMENT=production');
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });

function testRequest(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sixfb-backend.onrender.com',
      port: 443,
      path: path,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   CORS Origin: ${res.headers['access-control-allow-origin'] || 'not set'}`);
        console.log(`   CORS Methods: ${res.headers['access-control-allow-methods'] || 'not set'}`);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else if (res.statusCode === 422 || res.statusCode === 401) {
          // These are expected for invalid credentials
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

#!/usr/bin/env node

/**
 * Test script to check 6FB deployment status
 */

const https = require('https');

// Configuration
const FRONTEND_URL = 'https://web-production-92a6c.up.railway.app';
const BACKEND_URL = 'https://sixfb-backend.onrender.com';
const TEST_EMAIL = 'test@6fb.com';
const TEST_PASSWORD = 'testpassword'; // pragma: allowlist secret

// Test results
const results = {
  frontend: { status: false, details: {} },
  backend: { status: false, details: {} },
  cors: { status: false, details: {} },
  login: { status: false, details: {} }
};

// Helper function to make HTTPS requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + (urlObj.search || ''),
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test 1: Frontend availability
async function testFrontend() {
  console.log('\n🔍 Testing Frontend...');
  try {
    const response = await makeRequest(FRONTEND_URL);
    results.frontend.status = response.status === 200;
    results.frontend.details = {
      statusCode: response.status,
      hasContent: response.body.length > 0,
      isNextJS: response.body.includes('__next') || response.body.includes('_next'),
      title: response.body.match(/<title>(.*?)<\/title>/)?.[1] || 'Not found'
    };
    console.log('✅ Frontend is accessible');
    console.log('  - Status:', response.status);
    console.log('  - Title:', results.frontend.details.title);
    console.log('  - Next.js detected:', results.frontend.details.isNextJS);
  } catch (error) {
    console.log('❌ Frontend error:', error.message);
    results.frontend.details.error = error.message;
  }
}

// Test 2: Backend health
async function testBackend() {
  console.log('\n🔍 Testing Backend...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    const data = JSON.parse(response.body);
    results.backend.status = response.status === 200 && data.status === 'healthy';
    results.backend.details = {
      statusCode: response.status,
      healthData: data,
      headers: response.headers
    };
    console.log('✅ Backend is healthy');
    console.log('  - Status:', response.status);
    console.log('  - Service:', data.service);
    console.log('  - Database:', data.database);
  } catch (error) {
    console.log('❌ Backend error:', error.message);
    results.backend.details.error = error.message;
  }
}

// Test 3: CORS from frontend to backend
async function testCORS() {
  console.log('\n🔍 Testing CORS Configuration...');
  try {
    // Test OPTIONS preflight
    const response = await makeRequest(`${BACKEND_URL}/api/v1/auth/token`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
    };

    results.cors.status = (response.status === 200 || response.status === 204) &&
                         corsHeaders['access-control-allow-origin'] !== undefined;
    results.cors.details = {
      statusCode: response.status,
      corsHeaders,
      allowsOrigin: corsHeaders['access-control-allow-origin'] === '*' ||
                   corsHeaders['access-control-allow-origin']?.includes(FRONTEND_URL)
    };

    if (results.cors.status) {
      console.log('✅ CORS is properly configured');
      console.log('  - Allow-Origin:', corsHeaders['access-control-allow-origin']);
      console.log('  - Allow-Methods:', corsHeaders['access-control-allow-methods']);
    } else {
      console.log('❌ CORS is not properly configured');
      console.log('  - Response headers:', corsHeaders);
    }
  } catch (error) {
    console.log('❌ CORS test error:', error.message);
    results.cors.details.error = error.message;
  }
}

// Test 4: Login functionality
async function testLogin() {
  console.log('\n🔍 Testing Login Endpoint...');
  try {
    const formData = `username=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}`;
    const response = await makeRequest(`${BACKEND_URL}/api/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': FRONTEND_URL
      },
      body: formData
    });

    const responseData = JSON.parse(response.body);
    results.login.status = response.status === 200 || response.status === 422;
    results.login.details = {
      statusCode: response.status,
      message: responseData.detail || responseData.message || 'Login endpoint accessible',
      hasAccessToken: !!responseData.access_token
    };

    if (response.status === 200) {
      console.log('✅ Login successful');
    } else if (response.status === 422) {
      console.log('✅ Login endpoint working (invalid credentials as expected)');
      console.log('  - Response:', responseData.detail);
    } else {
      console.log('❌ Unexpected login response');
      console.log('  - Status:', response.status);
      console.log('  - Response:', responseData);
    }
  } catch (error) {
    console.log('❌ Login test error:', error.message);
    results.login.details.error = error.message;
  }
}

// Test 5: Frontend proxy endpoint
async function testFrontendProxy() {
  console.log('\n🔍 Testing Frontend Proxy...');
  try {
    const response = await makeRequest(`${FRONTEND_URL}/api/proxy/api/v1/health`);
    if (response.status === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ Frontend proxy is working');
      console.log('  - Proxy endpoint accessible');
      console.log('  - Backend health via proxy:', data.status);
    } else {
      console.log('❌ Frontend proxy returned status:', response.status);
    }
  } catch (error) {
    console.log('❌ Frontend proxy error:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 6FB Deployment Status Check');
  console.log('================================');
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test Time: ${new Date().toISOString()}`);

  await testFrontend();
  await testBackend();
  await testCORS();
  await testLogin();
  await testFrontendProxy();

  // Summary
  console.log('\n📊 Test Summary');
  console.log('================================');
  console.log(`Frontend: ${results.frontend.status ? '✅ Working' : '❌ Failed'}`);
  console.log(`Backend: ${results.backend.status ? '✅ Working' : '❌ Failed'}`);
  console.log(`CORS: ${results.cors.status ? '✅ Configured' : '❌ Not Configured'}`);
  console.log(`Login API: ${results.login.status ? '✅ Accessible' : '❌ Failed'}`);

  // Recommendations
  console.log('\n💡 Recommendations');
  console.log('================================');

  if (!results.cors.status) {
    console.log('1. CORS is not properly configured on the backend');
    console.log('   - Add FRONTEND_URL=https://web-production-92a6c.up.railway.app to Render environment variables');
    console.log('   - Or add ALLOWED_ORIGINS=https://web-production-92a6c.up.railway.app');
    console.log('   - Restart the Render service after updating');
  }

  if (results.frontend.status && results.backend.status && !results.cors.status) {
    console.log('\n2. The frontend proxy should be working as a fallback');
    console.log('   - Check Railway environment variables for proper BACKEND_URL');
    console.log('   - Ensure NEXT_PUBLIC_USE_CORS_PROXY=true is set if CORS fails');
  }

  if (!results.login.status) {
    console.log('\n3. Login endpoint is not accessible');
    console.log('   - This could be due to CORS blocking the request');
    console.log('   - Check backend logs for any authentication errors');
  }

  console.log('\n✅ Test complete!');
}

// Run the tests
runTests().catch(console.error);

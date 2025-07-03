#!/usr/bin/env node

/**
 * API Endpoint Testing Script
 * Tests backend connectivity and authentication flows
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:8000';

class APIEndpointTester {
  constructor() {
    this.results = {
      endpoints: [],
      summary: {
        total: 0,
        working: 0,
        authRequired: 0,
        errors: 0
      }
    };
  }

  async testEndpoint(path, method = 'GET', requiresAuth = false, body = null) {
    console.log(`\n🔍 Testing ${method} ${path}`);
    
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      }
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_URL}${path}`, config);
      const contentType = response.headers.get('content-type');
      
      let data = null;
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          data = { error: 'Failed to parse JSON response' };
        }
      } else {
        data = await response.text();
      }

      const result = {
        path,
        method,
        status: response.status,
        statusText: response.statusText,
        requiresAuth,
        data: typeof data === 'string' ? data.substring(0, 200) : data,
        working: response.ok || (requiresAuth && response.status === 401)
      };

      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Working: ${result.working ? '✅' : '❌'}`);
      if (data && typeof data === 'object' && data.message) {
        console.log(`  Message: ${data.message}`);
      }

      this.results.endpoints.push(result);
      this.results.summary.total++;
      
      if (result.working) {
        this.results.summary.working++;
      } else {
        this.results.summary.errors++;
      }
      
      if (requiresAuth && response.status === 401) {
        this.results.summary.authRequired++;
      }

      return result;
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      const result = {
        path,
        method,
        status: 0,
        statusText: 'Network Error',
        requiresAuth,
        error: error.message,
        working: false
      };
      
      this.results.endpoints.push(result);
      this.results.summary.total++;
      this.results.summary.errors++;
      
      return result;
    }
  }

  async testAuthenticationFlow() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    // Test registration
    const registerResult = await this.testEndpoint('/api/v1/auth/register', 'POST', false, {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User'
    });

    // Test login with test credentials
    const loginResult = await this.testEndpoint('/api/v1/auth/login', 'POST', false, {
      email: 'admin@bookedbarber.dev',
      password: 'dev123'
    });

    return { registerResult, loginResult };
  }

  async run() {
    console.log('🧪 Starting API Endpoint Testing...');
    console.log(`Backend URL: ${API_URL}`);

    // Test basic connectivity
    await this.testEndpoint('/', 'GET', false);
    await this.testEndpoint('/health', 'GET', false);
    await this.testEndpoint('/docs', 'GET', false);

    // Test authentication endpoints
    await this.testAuthenticationFlow();

    // Test protected endpoints (should return 401/403)
    await this.testEndpoint('/api/v1/auth/me', 'GET', true);
    await this.testEndpoint('/api/v1/appointments/', 'GET', true);
    await this.testEndpoint('/api/v1/bookings/my', 'GET', true);

    // Test public endpoints that should work without auth
    await this.testEndpoint('/api/v1/appointments/slots', 'GET', false);
    await this.testEndpoint('/api/v1/appointments/slots/next-available', 'GET', false);

    // Test booking endpoints
    await this.testEndpoint('/api/v1/services/', 'GET', false);

    // Test CORS preflight
    console.log('\n🌐 Testing CORS...');
    try {
      const response = await fetch(`${API_URL}/`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET'
        }
      });
      console.log(`  CORS Preflight: ${response.status} ${response.statusText}`);
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
      };
      console.log('  CORS Headers:', corsHeaders);
    } catch (error) {
      console.log(`  ❌ CORS Test Error: ${error.message}`);
    }

    // Summary
    console.log('\n📊 API TESTING SUMMARY');
    console.log('=' * 50);
    console.log(`Total Endpoints Tested: ${this.results.summary.total}`);
    console.log(`✅ Working: ${this.results.summary.working}`);
    console.log(`🔐 Auth Required (Expected): ${this.results.summary.authRequired}`);
    console.log(`❌ Errors: ${this.results.summary.errors}`);

    console.log('\n🔍 Endpoint Details:');
    this.results.endpoints.forEach(endpoint => {
      const icon = endpoint.working ? '✅' : '❌';
      console.log(`  ${icon} ${endpoint.method} ${endpoint.path} - ${endpoint.status} ${endpoint.statusText}`);
    });

    console.log('\n🎯 Recommendations:');
    if (this.results.summary.errors > this.results.summary.authRequired) {
      console.log('  🔧 Fix backend connectivity issues');
      console.log('  🌐 Check CORS configuration');
      console.log('  🚀 Ensure backend server is running properly');
    } else {
      console.log('  ✅ Backend API is working correctly');
      console.log('  🔐 Authentication system functioning');
      console.log('  💡 Frontend errors likely due to missing auth tokens');
    }

    console.log('\n🛠️  Next Steps for Frontend:');
    console.log('  1. Handle unauthenticated state gracefully');
    console.log('  2. Show proper loading states during auth checks');
    console.log('  3. Redirect to login when auth is required');
    console.log('  4. Create guest/public booking flows');
  }
}

// Run tests
const tester = new APIEndpointTester();
tester.run().catch(console.error);
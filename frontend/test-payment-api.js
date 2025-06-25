#!/usr/bin/env node

/**
 * Test script to check payment API endpoints
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'https://sixfb-backend.onrender.com/api/v1';

async function testPaymentEndpoints() {
  console.log('Testing Payment API Endpoints...\n');
  console.log('API Base URL:', API_BASE_URL);
  console.log('-----------------------------------\n');

  // Test 1: Health check
  try {
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`);
    console.log('✅ Health check passed:', health.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  console.log('\n');

  // Test 2: Payment endpoints without auth (should fail with 401)
  const paymentEndpoints = [
    { method: 'GET', path: '/payments/payment-methods', description: 'List payment methods' },
    { method: 'POST', path: '/payments/setup-intent', description: 'Create setup intent' },
    { method: 'GET', path: '/payments/payments', description: 'Get payment history' },
  ];

  for (const endpoint of paymentEndpoints) {
    try {
      console.log(`2. Testing ${endpoint.description} (${endpoint.method} ${endpoint.path})...`);
      const config = {
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.path}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (endpoint.method === 'POST') {
        config.data = {};
      }

      const response = await axios(config);
      console.log(`✅ Endpoint accessible (unexpected - should require auth)`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`✅ Endpoint exists but requires authentication (expected)`);
      } else if (error.response?.status === 404) {
        console.log(`❌ Endpoint not found (404) - Check route registration`);
      } else if (error.response?.status === 422) {
        console.log(`✅ Endpoint exists, validation error (expected for POST without data)`);
      } else {
        console.log(`❌ Unexpected error:`, error.response?.status || error.message);
      }
    }
  }

  console.log('\n-----------------------------------');
  console.log('Test completed.\n');

  console.log('Summary:');
  console.log('- If endpoints return 401, they exist but need authentication');
  console.log('- If endpoints return 404, they might not be registered properly');
  console.log('- Check backend logs for more details');
}

// Run the test
testPaymentEndpoints().catch(console.error);

#!/usr/bin/env node

/**
 * Test specific guest quick booking issue
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:8000';

function fetchAPI(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ ok: res.statusCode < 400, status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ ok: res.statusCode < 400, status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testGuestQuickBooking() {
  console.log('🔍 Testing Guest Quick Booking Specifically...\n');
  
  const quickBookingData = {
    service: "Shave",
    guest_info: {
      first_name: "Quick",
      last_name: "Test",
      email: "quick-test-debug@example.com",
      phone: "(555) 987-6543"
    }
  };
  
  console.log('Sending data:', JSON.stringify(quickBookingData, null, 2));
  
  try {
    const quickResponse = await fetchAPI(`${BACKEND_URL}/api/v1/appointments/guest/quick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quickBookingData)
    });
    
    console.log('Response status:', quickResponse.status);
    console.log('Response data:', JSON.stringify(quickResponse.data, null, 2));
    
    if (quickResponse.ok) {
      console.log('✅ SUCCESS: Guest quick booking created!');
    } else {
      console.log('❌ FAILED: Guest quick booking failed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testGuestQuickBooking();
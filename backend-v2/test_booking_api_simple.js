#!/usr/bin/env node

/**
 * Simple API Test for Booking Flow
 * Tests the backend APIs directly without browser automation
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = 'http://localhost:8000';

// Simple fetch implementation
function fetchAPI(url, options = {}) {
  return new Promise((resolve, reject) => {
    const module = url.startsWith('https:') ? https : http;
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

    const req = module.request(reqOptions, (res) => {
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

async function testBackendAPIs() {
  console.log('🔧 Testing Backend APIs...\n');
  
  const results = {
    tests: {},
    errors: []
  };

  try {
    // Test 1: Health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetchAPI(`${BACKEND_URL}/health`);
    results.tests.health = healthResponse.ok;
    console.log(`   Status: ${healthResponse.status} - ${healthResponse.ok ? '✅ PASS' : '❌ FAIL'}`);
    if (!healthResponse.ok) {
      results.errors.push(`Health endpoint failed: ${healthResponse.status}`);
    }

    // Test 2: Appointments slots endpoint
    console.log('\n2. Testing appointments slots endpoint...');
    const today = new Date().toISOString().split('T')[0];
    const slotsResponse = await fetchAPI(`${BACKEND_URL}/api/v1/appointments/slots?appointment_date=${today}`);
    results.tests.slots = slotsResponse.ok;
    console.log(`   Status: ${slotsResponse.status} - ${slotsResponse.ok ? '✅ PASS' : '❌ FAIL'}`);
    
    if (slotsResponse.ok) {
      const slotsData = slotsResponse.data;
      console.log(`   Date: ${slotsData.date}`);
      console.log(`   Available slots: ${slotsData.slots?.length || 0}`);
      console.log(`   Business hours: ${slotsData.business_hours?.start} - ${slotsData.business_hours?.end}`);
      console.log(`   Slot duration: ${slotsData.slot_duration_minutes} minutes`);
      
      // Test data structure
      const structureValid = !!(slotsData.date && Array.isArray(slotsData.slots) && slotsData.business_hours);
      results.tests.slotsStructure = structureValid;
      console.log(`   Data structure: ${structureValid ? '✅ VALID' : '❌ INVALID'}`);
      
      if (slotsData.slots?.length > 0) {
        const firstSlot = slotsData.slots[0];
        const slotValid = !!(firstSlot.time && typeof firstSlot.available === 'boolean');
        results.tests.slotFormat = slotValid;
        console.log(`   Slot format: ${slotValid ? '✅ VALID' : '❌ INVALID'}`);
        console.log(`   Example slot: ${JSON.stringify(firstSlot)}`);
      }
    } else {
      results.errors.push(`Slots endpoint failed: ${slotsResponse.status} - ${JSON.stringify(slotsResponse.data)}`);
    }

    // Test 3: Next available slot endpoint
    console.log('\n3. Testing next available slot endpoint...');
    const nextAvailableResponse = await fetchAPI(`${BACKEND_URL}/api/v1/appointments/slots/next-available`);
    results.tests.nextAvailable = nextAvailableResponse.ok;
    console.log(`   Status: ${nextAvailableResponse.status} - ${nextAvailableResponse.ok ? '✅ PASS' : '❌ FAIL'}`);
    
    if (nextAvailableResponse.ok) {
      const nextData = nextAvailableResponse.data;
      console.log(`   Next available: ${nextData.date} at ${nextData.time}`);
      
      const nextSlotValid = !!(nextData.date && nextData.time && nextData.datetime);
      results.tests.nextAvailableStructure = nextSlotValid;
      console.log(`   Data structure: ${nextSlotValid ? '✅ VALID' : '❌ INVALID'}`);
    } else {
      results.errors.push(`Next available endpoint failed: ${nextAvailableResponse.status} - ${JSON.stringify(nextAvailableResponse.data)}`);
    }

    // Test 4: Guest booking endpoint
    console.log('\n4. Testing guest booking endpoint...');
    const guestBookingData = {
      date: new Date(Date.now() + 24*60*60*1000).toISOString().split("T")[0],
      time: "09:30",
      service: "Haircut",
      guest_info: {
        first_name: "Test",
        last_name: "User",
        email: "test-booking-flow-1751302718@example.com",
        phone: "(555) 123-4567"
      }
    };
    
    const createResponse = await fetchAPI(`${BACKEND_URL}/api/v1/appointments/guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(guestBookingData)
    });
    
    results.tests.guestBooking = createResponse.ok;
    console.log(`   Status: ${createResponse.status} - ${createResponse.ok ? '✅ PASS' : '❌ FAIL'}`);
    
    if (createResponse.ok) {
      const bookingData = createResponse.data;
      console.log(`   Booking ID: ${bookingData.id}`);
      console.log(`   Service: ${bookingData.service}`);
      console.log(`   Date/Time: ${bookingData.date} ${bookingData.time}`);
      console.log(`   Guest: ${bookingData.guest_name}`);
      console.log(`   Amount: $${bookingData.amount}`);
      
      const bookingValid = !!(bookingData.id && bookingData.service && bookingData.date && bookingData.time);
      results.tests.guestBookingStructure = bookingValid;
      console.log(`   Data structure: ${bookingValid ? '✅ VALID' : '❌ INVALID'}`);
    } else {
      console.log(`   Error: ${JSON.stringify(createResponse.data)}`);
      results.errors.push(`Guest booking failed: ${createResponse.status} - ${JSON.stringify(createResponse.data)}`);
    }

    // Test 5: Quick booking endpoint
    console.log('\n5. Testing guest quick booking endpoint...');
    const quickBookingData = {
      service: "Shave",
      guest_info: {
        first_name: "Quick",
        last_name: "Test",
        email: "quick-test@example.com",
        phone: "(555) 987-6543"
      }
    };
    
    const quickResponse = await fetchAPI(`${BACKEND_URL}/api/v1/appointments/guest/quick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quickBookingData)
    });
    
    results.tests.quickBooking = quickResponse.ok;
    console.log(`   Status: ${quickResponse.status} - ${quickResponse.ok ? '✅ PASS' : '❌ FAIL'}`);
    
    if (quickResponse.ok) {
      const quickData = quickResponse.data;
      console.log(`   Quick booking ID: ${quickData.id}`);
      console.log(`   Service: ${quickData.service}`);
      console.log(`   Date/Time: ${quickData.date} ${quickData.time}`);
    } else {
      console.log(`   Error: ${JSON.stringify(quickResponse.data)}`);
      results.errors.push(`Quick booking failed: ${quickResponse.status} - ${JSON.stringify(quickResponse.data)}`);
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    results.errors.push(`Test execution error: ${error.message}`);
  }

  return results;
}

async function testFrontendAPIMatch() {
  console.log('\n🔍 Testing Frontend API Endpoint Matches...\n');
  
  const frontendExpectedCalls = [
    { endpoint: '/api/v1/appointments/slots', method: 'GET', params: 'appointment_date' },
    { endpoint: '/api/v1/appointments/slots/next-available', method: 'GET' },
    { endpoint: '/api/v1/appointments', method: 'POST' },
    { endpoint: '/api/v1/appointments/guest', method: 'POST' },
    { endpoint: '/api/v1/appointments/guest/quick', method: 'POST' }
  ];

  const results = {
    endpointMatches: {},
    errors: []
  };

  for (const call of frontendExpectedCalls) {
    try {
      let url = `${BACKEND_URL}${call.endpoint}`;
      if (call.params === 'appointment_date') {
        url += `?appointment_date=${new Date().toISOString().split('T')[0]}`;
      }
      
      const testOptions = call.method === 'POST' ? {
        method: call.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      } : {};
      
      const response = await fetchAPI(url, testOptions);
      results.endpointMatches[call.endpoint] = response.status !== 404;
      
      console.log(`${call.method} ${call.endpoint}: ${response.status !== 404 ? '✅ EXISTS' : '❌ NOT FOUND'} (${response.status})`);
      
      if (response.status === 404) {
        results.errors.push(`Endpoint not found: ${call.method} ${call.endpoint}`);
      }
      
    } catch (error) {
      results.endpointMatches[call.endpoint] = false;
      results.errors.push(`Endpoint test error: ${call.endpoint} - ${error.message}`);
      console.log(`${call.method} ${call.endpoint}: ❌ ERROR - ${error.message}`);
    }
  }

  return results;
}

async function main() {
  console.log('🧪 Booking Flow API Test Suite');
  console.log('==============================\n');
  
  // Test backend APIs
  const backendResults = await testBackendAPIs();
  
  // Test frontend API endpoint matches
  const frontendResults = await testFrontendAPIMatch();
  
  // Generate summary
  console.log('\n📊 TEST SUMMARY');
  console.log('===============\n');
  
  const totalBackendTests = Object.keys(backendResults.tests).length;
  const passedBackendTests = Object.values(backendResults.tests).filter(Boolean).length;
  
  const totalFrontendTests = Object.keys(frontendResults.endpointMatches).length;
  const passedFrontendTests = Object.values(frontendResults.endpointMatches).filter(Boolean).length;
  
  console.log(`Backend API Tests: ${passedBackendTests}/${totalBackendTests} passed`);
  console.log(`Frontend Endpoint Tests: ${passedFrontendTests}/${totalFrontendTests} passed`);
  
  const totalErrors = backendResults.errors.length + frontendResults.errors.length;
  console.log(`Total Errors: ${totalErrors}`);
  
  if (totalErrors > 0) {
    console.log('\n❌ ERRORS FOUND:');
    [...backendResults.errors, ...frontendResults.errors].forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  const overallSuccess = totalErrors === 0 && (passedBackendTests >= totalBackendTests * 0.8) && (passedFrontendTests >= totalFrontendTests * 0.8);
  console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  return overallSuccess;
}

// Run if called directly
if (require.main === module) {
  main().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testBackendAPIs, testFrontendAPIMatch };
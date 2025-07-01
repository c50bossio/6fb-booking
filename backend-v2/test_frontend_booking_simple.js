#!/usr/bin/env node

/**
 * Simple Frontend Booking Test
 * Tests the booking page functionality without full browser automation
 */

const http = require('http');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';

function fetchAPI(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const module = url.startsWith('https:') ? require('https') : http;
    
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
        resolve({ 
          ok: res.statusCode < 400, 
          status: res.statusCode, 
          data: data,
          headers: res.headers 
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

async function testFrontendBasics() {
  console.log('🌐 Testing Frontend Basics...\n');
  
  const results = {
    tests: {},
    errors: []
  };

  try {
    // Test 1: Frontend is running
    console.log('1. Testing frontend server...');
    const frontendResponse = await fetchAPI(FRONTEND_URL);
    results.tests.frontendRunning = frontendResponse.ok;
    console.log(`   Status: ${frontendResponse.status} - ${frontendResponse.ok ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!frontendResponse.ok) {
      results.errors.push(`Frontend server not accessible: ${frontendResponse.status}`);
    }

    // Test 2: Booking page loads
    console.log('\n2. Testing booking page...');
    const bookingResponse = await fetchAPI(`${FRONTEND_URL}/book`);
    results.tests.bookingPageLoads = bookingResponse.ok;
    console.log(`   Status: ${bookingResponse.status} - ${bookingResponse.ok ? '✅ PASS' : '❌ FAIL'}`);
    
    if (bookingResponse.ok) {
      const pageContent = bookingResponse.data;
      
      // Check for key booking page elements
      const hasServiceSelection = pageContent.includes('Select a Service') || pageContent.includes('service');
      const hasCalendar = pageContent.includes('calendar') || pageContent.includes('date');
      const hasTimeSlots = pageContent.includes('time') || pageContent.includes('slot');
      
      results.tests.hasServiceElements = hasServiceSelection;
      results.tests.hasCalendarElements = hasCalendar;
      results.tests.hasTimeElements = hasTimeSlots;
      
      console.log(`   Service selection elements: ${hasServiceSelection ? '✅ FOUND' : '❌ MISSING'}`);
      console.log(`   Calendar elements: ${hasCalendar ? '✅ FOUND' : '❌ MISSING'}`);
      console.log(`   Time slot elements: ${hasTimeSlots ? '✅ FOUND' : '❌ MISSING'}`);
      
      // Check for React hydration errors or other issues
      const hasErrors = pageContent.includes('Error') || pageContent.includes('error');
      const hasWarnings = pageContent.includes('Warning') || pageContent.includes('warning');
      
      results.tests.noErrors = !hasErrors;
      results.tests.noWarnings = !hasWarnings;
      
      console.log(`   No visible errors: ${!hasErrors ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   No visible warnings: ${!hasWarnings ? '✅ PASS' : '❌ FAIL'}`);
      
    } else {
      results.errors.push(`Booking page not accessible: ${bookingResponse.status}`);
    }

    // Test 3: API endpoints called by frontend
    console.log('\n3. Testing frontend API calls...');
    
    // Simulate the API calls that the frontend would make
    const today = new Date().toISOString().split('T')[0];
    
    // Test slots API (frontend calls this)
    const slotsCall = await fetchAPI(`${BACKEND_URL}/api/v1/appointments/slots?appointment_date=${today}`);
    results.tests.frontendSlotsAPI = slotsCall.ok;
    console.log(`   Slots API call: ${slotsCall.ok ? '✅ PASS' : '❌ FAIL'} (${slotsCall.status})`);
    
    // Test next available API (frontend calls this)
    const nextAvailableCall = await fetchAPI(`${BACKEND_URL}/api/v1/appointments/slots/next-available`);
    results.tests.frontendNextAvailableAPI = nextAvailableCall.ok;
    console.log(`   Next available API call: ${nextAvailableCall.ok ? '✅ PASS' : '❌ FAIL'} (${nextAvailableCall.status})`);

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    results.errors.push(`Test execution error: ${error.message}`);
  }

  return results;
}

async function testBookingFlowCompatibility() {
  console.log('\n🔗 Testing Booking Flow Compatibility...\n');
  
  const results = {
    tests: {},
    errors: []
  };

  try {
    // Test that frontend API structure matches backend expectations
    console.log('1. Testing API structure compatibility...');
    
    const today = new Date().toISOString().split('T')[0];
    const slotsResponse = await fetchAPI(`${BACKEND_URL}/api/v1/appointments/slots?appointment_date=${today}`);
    
    if (slotsResponse.ok) {
      const slotsData = JSON.parse(slotsResponse.data);
      
      // Check if response structure matches what frontend expects
      const hasRequiredFields = !!(
        slotsData.date &&
        Array.isArray(slotsData.slots) &&
        slotsData.business_hours &&
        typeof slotsData.slot_duration_minutes === 'number'
      );
      
      results.tests.correctResponseStructure = hasRequiredFields;
      console.log(`   Response structure: ${hasRequiredFields ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`);
      
      if (slotsData.slots && slotsData.slots.length > 0) {
        const firstSlot = slotsData.slots[0];
        const slotStructure = !!(
          firstSlot.time &&
          typeof firstSlot.available === 'boolean'
        );
        
        results.tests.correctSlotStructure = slotStructure;
        console.log(`   Slot structure: ${slotStructure ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`);
      }
    } else {
      results.errors.push(`Could not test API compatibility: ${slotsResponse.status}`);
    }

    // Test guest booking structure (what frontend sends)
    console.log('\n2. Testing guest booking compatibility...');
    
    const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
    const testGuestBooking = {
      date: tomorrow,
      time: "12:00",
      service: "Haircut",
      guest_info: {
        first_name: "Test",
        last_name: "User", 
        email: "compatibility-test@example.com",
        phone: "(555) 123-4567"
      }
    };
    
    // Test the structure by attempting to create a booking
    const guestBookingResponse = await fetchAPI(`${BACKEND_URL}/api/v1/appointments/guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testGuestBooking)
    });
    
    // We don't care if it succeeds or fails due to conflicts, just that the structure is accepted
    const structureAccepted = guestBookingResponse.status !== 422; // 422 = validation error
    results.tests.guestBookingStructure = structureAccepted;
    console.log(`   Guest booking structure: ${structureAccepted ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'} (${guestBookingResponse.status})`);
    
    if (!structureAccepted) {
      try {
        const errorData = JSON.parse(guestBookingResponse.data);
        results.errors.push(`Guest booking structure issue: ${errorData.detail}`);
      } catch (e) {
        results.errors.push(`Guest booking structure issue: ${guestBookingResponse.status}`);
      }
    }

  } catch (error) {
    console.error(`❌ Compatibility test failed: ${error.message}`);
    results.errors.push(`Compatibility test error: ${error.message}`);
  }

  return results;
}

async function main() {
  console.log('🧪 Frontend Booking Flow Test');
  console.log('=============================\n');
  
  // Test frontend basics
  const frontendResults = await testFrontendBasics();
  
  // Test booking flow compatibility
  const compatibilityResults = await testBookingFlowCompatibility();
  
  // Generate summary
  console.log('\n📊 TEST SUMMARY');
  console.log('===============\n');
  
  const totalFrontendTests = Object.keys(frontendResults.tests).length;
  const passedFrontendTests = Object.values(frontendResults.tests).filter(Boolean).length;
  
  const totalCompatibilityTests = Object.keys(compatibilityResults.tests).length;
  const passedCompatibilityTests = Object.values(compatibilityResults.tests).filter(Boolean).length;
  
  console.log(`Frontend Tests: ${passedFrontendTests}/${totalFrontendTests} passed`);
  console.log(`Compatibility Tests: ${passedCompatibilityTests}/${totalCompatibilityTests} passed`);
  
  const totalErrors = frontendResults.errors.length + compatibilityResults.errors.length;
  console.log(`Total Errors: ${totalErrors}`);
  
  if (totalErrors > 0) {
    console.log('\n❌ ERRORS FOUND:');
    [...frontendResults.errors, ...compatibilityResults.errors].forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  // Check for critical issues
  const criticalIssues = [];
  if (!frontendResults.tests.frontendRunning) {
    criticalIssues.push('Frontend server not running');
  }
  if (!frontendResults.tests.bookingPageLoads) {
    criticalIssues.push('Booking page not loading');
  }
  if (!compatibilityResults.tests.correctResponseStructure) {
    criticalIssues.push('API response structure incompatible with frontend');
  }
  
  if (criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:');
    criticalIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }
  
  const overallSuccess = totalErrors === 0 && criticalIssues.length === 0 && 
                        (passedFrontendTests >= totalFrontendTests * 0.8) && 
                        (passedCompatibilityTests >= totalCompatibilityTests * 0.8);
  
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

module.exports = { testFrontendBasics, testBookingFlowCompatibility };
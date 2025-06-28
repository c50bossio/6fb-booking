/**
 * Comprehensive test script for the complete booking workflow
 * Run this in the browser console to test all functionality
 */

async function testCompleteBookingFlow() {
  console.log('🧪 Starting comprehensive booking flow test...');

  const tests = {
    passed: 0,
    failed: 0,
    results: []
  };

  function logTest(name, success, details = '') {
    const status = success ? '✅' : '❌';
    const message = `${status} ${name}${details ? ': ' + details : ''}`;
    console.log(message);
    tests.results.push({ name, success, details, message });
    if (success) tests.passed++;
    else tests.failed++;
  }

  try {
    // Test 1: API Connectivity
    console.log('\n📡 Testing API connectivity...');

    // Test backend health
    try {
      const response = await fetch('http://localhost:8000/api/v1/dashboard/demo/appointments/today');
      logTest('Backend API reachable', response.ok, `Status: ${response.status}`);
    } catch (error) {
      logTest('Backend API reachable', false, error.message);
    }

    // Test frontend accessibility
    try {
      const response = await fetch('http://localhost:3002/dashboard');
      logTest('Frontend dashboard accessible', response.ok, `Status: ${response.status}`);
    } catch (error) {
      logTest('Frontend dashboard accessible', false, error.message);
    }

    // Test 2: Service API Endpoints
    console.log('\n🛎️ Testing service endpoints...');

    try {
      const servicesResponse = await fetch('http://localhost:8000/api/v1/booking/public/barbers/1/services');
      const servicesData = await servicesResponse.json();
      logTest('Services API working', servicesResponse.ok && Array.isArray(servicesData),
        `Found ${servicesData.length || 0} services`);
    } catch (error) {
      logTest('Services API working', false, error.message);
    }

    // Test 3: Barber Endpoints
    console.log('\n👨‍💼 Testing barber endpoints...');

    try {
      const barbersResponse = await fetch('http://localhost:8000/api/v1/booking/public/shops/1/barbers');
      const barbersData = await barbersResponse.json();
      logTest('Barbers API working', barbersResponse.ok && Array.isArray(barbersData),
        `Found ${barbersData.length || 0} barbers`);
    } catch (error) {
      logTest('Barbers API working', false, error.message);
    }

    // Test 4: Availability Endpoints
    console.log('\n📅 Testing availability endpoints...');

    try {
      const today = new Date().toISOString().split('T')[0];
      const availabilityResponse = await fetch(
        `http://localhost:8000/api/v1/booking/public/barbers/1/availability?date=${today}&service_id=1&duration=30`
      );
      const availabilityData = await availabilityResponse.json();
      logTest('Availability API working', availabilityResponse.ok,
        `Status: ${availabilityResponse.status}`);
    } catch (error) {
      logTest('Availability API working', false, error.message);
    }

    // Test 5: Dashboard Demo Data
    console.log('\n📊 Testing dashboard data...');

    try {
      const dashboardResponse = await fetch('http://localhost:8000/api/v1/dashboard/demo/appointments/today');
      const dashboardData = await dashboardResponse.json();
      logTest('Dashboard demo data', dashboardResponse.ok && dashboardData.stats,
        `Revenue: $${dashboardData.stats?.revenue || 0}`);
    } catch (error) {
      logTest('Dashboard demo data', false, error.message);
    }

    // Test 6: Environment Configuration
    console.log('\n⚙️ Testing environment configuration...');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    logTest('API URL configured', apiUrl.includes('8000'), `URL: ${apiUrl}`);

    // Test CORS headers
    try {
      const corsResponse = await fetch('http://localhost:8000/api/v1/dashboard/demo/appointments/today', {
        method: 'OPTIONS'
      });
      logTest('CORS configured', corsResponse.ok || corsResponse.status === 200,
        `Status: ${corsResponse.status}`);
    } catch (error) {
      logTest('CORS configured', false, error.message);
    }

  } catch (globalError) {
    logTest('Global test execution', false, globalError.message);
  }

  // Summary
  console.log('\n📋 Test Summary:');
  console.log(`✅ Passed: ${tests.passed}`);
  console.log(`❌ Failed: ${tests.failed}`);
  console.log(`📊 Success Rate: ${((tests.passed / (tests.passed + tests.failed)) * 100).toFixed(1)}%`);

  // Recommendations
  console.log('\n💡 Next Steps:');
  if (tests.failed === 0) {
    console.log('🎉 All tests passed! Ready to test UI components:');
    console.log('1. Visit http://localhost:3002/dashboard');
    console.log('2. Click "Quick Actions" dropdown');
    console.log('3. Click "New Appointment" button');
    console.log('4. Fill out appointment form with real data');
    console.log('5. Test metric card navigation');
  } else {
    console.log('🔧 Issues found. Recommendations:');
    tests.results.filter(r => !r.success).forEach(test => {
      console.log(`   - Fix: ${test.name} - ${test.details}`);
    });
  }

  return tests;
}

// Auto-run the test
testCompleteBookingFlow().then(results => {
  console.log('\n🏁 Test completed. Results stored in window.testResults');
  window.testResults = results;
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});

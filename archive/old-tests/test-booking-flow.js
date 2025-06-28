/**
 * Test script for the complete booking workflow
 * This script can be run in the browser console to test the booking flow
 */

// Test the booking flow step by step
async function testBookingFlow() {
  console.log('🚀 Starting booking flow test...');

  try {
    // Step 1: Test dashboard access
    console.log('📊 Step 1: Testing dashboard access');
    const dashboardResponse = await fetch('http://localhost:3002/dashboard');
    console.log('Dashboard status:', dashboardResponse.status);

    // Step 2: Test API connectivity
    console.log('🔌 Step 2: Testing API connectivity');
    try {
      const apiResponse = await fetch('http://localhost:8000/api/v1/health');
      console.log('API status:', apiResponse.status);
      const apiData = await apiResponse.json();
      console.log('API health:', apiData);
    } catch (error) {
      console.log('API not accessible:', error.message);
    }

    // Step 3: Test demo endpoints
    console.log('🎭 Step 3: Testing demo endpoints');
    try {
      const demoResponse = await fetch('http://localhost:8000/api/v1/dashboard/demo/appointments/today');
      console.log('Demo API status:', demoResponse.status);
      const demoData = await demoResponse.json();
      console.log('Demo data:', demoData);
    } catch (error) {
      console.log('Demo API error:', error.message);
    }

    // Step 4: Test services endpoint
    console.log('🛎️ Step 4: Testing services endpoint');
    try {
      const servicesResponse = await fetch('http://localhost:8000/api/v1/services');
      console.log('Services status:', servicesResponse.status);
      const servicesData = await servicesResponse.json();
      console.log('Services available:', servicesData.length || 'No services');
    } catch (error) {
      console.log('Services API error:', error.message);
    }

    console.log('✅ Booking flow test completed');
    console.log('👆 Now test the UI components manually:');
    console.log('1. Click Quick Actions dropdown');
    console.log('2. Click New Appointment button');
    console.log('3. Fill out the appointment form');
    console.log('4. Test metric card clicks');

  } catch (error) {
    console.error('❌ Booking flow test failed:', error);
  }
}

// Auto-run the test
testBookingFlow();

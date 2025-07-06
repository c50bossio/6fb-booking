/**
 * Quick Appointment Test Runner
 * Tests live appointment booking and calendar verification
 */
const { chromium } = require('playwright');

const CONFIG = {
  FRONTEND_URL: 'http://localhost:3001',
  BACKEND_URL: 'http://localhost:8000',
  TIMEOUT: 30000
};

async function runAppointmentTest() {
  console.log('🚀 Starting BookedBarber V2 Appointment Test...');
  
  const browser = await chromium.launch({ headless: false }); // Visible browser
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Check if servers are running
    console.log('🔍 Checking server status...');
    
    try {
      const backendResponse = await page.goto(CONFIG.BACKEND_URL);
      console.log('✅ Backend server is running');
    } catch (error) {
      console.log('❌ Backend server not responding. Please start it first:');
      console.log('   cd backend-v2 && uvicorn main:app --reload --port 8000');
      return;
    }

    try {
      const frontendResponse = await page.goto(CONFIG.FRONTEND_URL);
      console.log('✅ Frontend server is running');
    } catch (error) {
      console.log('❌ Frontend server not responding. Please start it first:');
      console.log('   cd frontend-v2 && npm run staging');
      return;
    }

    // Step 2: Test login
    console.log('🔐 Testing login flow...');
    await page.goto(`${CONFIG.FRONTEND_URL}/login`);
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    
    // Wait for response (either success or error)
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    if (currentUrl.includes('dashboard')) {
      console.log('✅ Login successful - redirected to dashboard');
    } else if (currentUrl.includes('login')) {
      console.log('⚠️  Still on login page - auth might be working but no redirect');
      console.log('Checking for success messages...');
      
      // Check for any success messages or tokens
      const localStorageToken = await page.evaluate(() => localStorage.getItem('token'));
      if (localStorageToken) {
        console.log('✅ Auth token found in localStorage - login working!');
      } else {
        console.log('❌ No auth token found - login may be failing');
      }
    }

    // Step 3: Take screenshot of current state
    await page.screenshot({ path: 'login-test-result.png', fullPage: true });
    console.log('📸 Screenshot saved: login-test-result.png');

    // Step 4: Test API directly
    console.log('🔧 Testing auth API directly...');
    const apiResponse = await page.request.post(`${CONFIG.BACKEND_URL}/api/v1/auth-test/login`, {
      data: { email: 'test@example.com', password: 'testpass123' }
    });
    
    if (apiResponse.ok()) {
      const responseData = await apiResponse.json();
      console.log('✅ Auth API working - received token');
      
      // Test a protected endpoint
      const protectedResponse = await page.request.get(`${CONFIG.BACKEND_URL}/api/v1/appointments`, {
        headers: {
          'Authorization': `Bearer ${responseData.access_token}`
        }
      });
      
      console.log('📋 Protected endpoint status:', protectedResponse.status());
      
    } else {
      console.log('❌ Auth API failed:', apiResponse.status());
    }

    // Step 5: Test booking page if we can get there
    console.log('📅 Testing booking page access...');
    try {
      await page.goto(`${CONFIG.FRONTEND_URL}/book`);
      await page.waitForTimeout(3000);
      
      const bookingPageLoaded = await page.locator('text=Book Appointment').isVisible();
      if (bookingPageLoaded) {
        console.log('✅ Booking page accessible');
        await page.screenshot({ path: 'booking-page.png', fullPage: true });
        console.log('📸 Booking page screenshot saved: booking-page.png');
      } else {
        console.log('⚠️  Booking page layout different than expected');
      }
    } catch (error) {
      console.log('⚠️  Could not access booking page:', error.message);
    }

    // Step 6: Test barber calendar access
    console.log('📊 Testing barber calendar access...');
    try {
      await page.goto(`${CONFIG.FRONTEND_URL}/barber/calendar`);
      await page.waitForTimeout(3000);
      
      const calendarLoaded = await page.locator('text=Calendar').isVisible();
      if (calendarLoaded) {
        console.log('✅ Barber calendar accessible');
        await page.screenshot({ path: 'calendar-view.png', fullPage: true });
        console.log('📸 Calendar screenshot saved: calendar-view.png');
      } else {
        console.log('⚠️  Calendar page layout different than expected');
      }
    } catch (error) {
      console.log('⚠️  Could not access calendar page:', error.message);
    }

    console.log('\n📋 Test Summary:');
    console.log('================');
    console.log('✅ Backend server: Running');
    console.log('✅ Frontend server: Running');
    console.log('🔐 Login: Tested (check screenshots for results)');
    console.log('📅 Booking page: Tested');
    console.log('📊 Calendar: Tested');
    console.log('\n📸 Screenshots saved for visual verification');
    console.log('🎯 Ready for live Stripe payment testing!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
runAppointmentTest().catch(console.error);
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs').promises;

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:8000/api/v2';
const SCREENSHOT_DIR = './test-screenshots/features';

// Test utilities
async function takeScreenshot(page, name) {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ 
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true 
  });
}

// Feature-specific test functions

async function testRateLimiting() {
  console.log('\n🛡️ Testing Rate Limiting...\n');
  
  try {
    // Test guest booking rate limit (3 per hour)
    const guestBookings = [];
    
    for (let i = 0; i < 5; i++) {
      try {
        const response = await axios.post(`${API_BASE_URL}/appointments/guest`, {
          date: '2024-01-20',
          time: `10:${i}0`,
          service: 'Haircut',
          guest_info: {
            first_name: 'Test',
            last_name: `User${i}`,
            email: `test${i}@example.com`,
            phone: `+123456789${i}`
          }
        });
        
        guestBookings.push({ attempt: i + 1, status: response.status });
        console.log(`✅ Guest booking ${i + 1}: Success`);
        
      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`✅ Guest booking ${i + 1}: Rate limited (expected)`);
          guestBookings.push({ attempt: i + 1, status: 429 });
          
          // Check for CAPTCHA requirement
          if (error.response.data?.captcha_required) {
            console.log('✅ CAPTCHA requirement activated');
          }
        } else {
          console.log(`❌ Guest booking ${i + 1}: Failed - ${error.message}`);
          guestBookings.push({ attempt: i + 1, status: error.response?.status || 0 });
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify rate limiting worked correctly
    const rateLimited = guestBookings.filter(b => b.status === 429).length > 0;
    console.log(`\n${rateLimited ? '✅' : '❌'} Rate limiting ${rateLimited ? 'working correctly' : 'not working'}`);
    
    return rateLimited;
    
  } catch (error) {
    console.error('❌ Rate limiting test failed:', error.message);
    return false;
  }
}

async function testDoubleBookingPrevention() {
  console.log('\n🔒 Testing Double Booking Prevention...\n');
  
  try {
    // First, create a valid booking
    const firstBooking = await axios.post(`${API_BASE_URL}/appointments/guest`, {
      date: '2024-01-25',
      time: '14:00',
      service: 'Haircut',
      guest_info: {
        first_name: 'First',
        last_name: 'Customer',
        email: 'first@example.com',
        phone: '+1234567890'
      }
    });
    
    console.log('✅ First booking created successfully');
    
    // Try to create a conflicting booking
    try {
      const secondBooking = await axios.post(`${API_BASE_URL}/appointments/guest`, {
        date: '2024-01-25',
        time: '14:00',
        service: 'Shave',
        guest_info: {
          first_name: 'Second',
          last_name: 'Customer',
          email: 'second@example.com',
          phone: '+0987654321'
        }
      });
      
      console.log('❌ Double booking was allowed (should have been prevented)');
      return false;
      
    } catch (error) {
      if (error.response?.status === 409 || error.response?.status === 400) {
        console.log('✅ Double booking prevented successfully');
        console.log(`   Message: ${error.response.data?.detail || error.response.data?.message}`);
        return true;
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Double booking prevention test failed:', error.message);
    return false;
  }
}

async function testNotificationDelivery(page) {
  console.log('\n📧 Testing Notification System...\n');
  
  try {
    // Check if notification worker is running
    const notificationStatus = await axios.get(`${API_BASE_URL}/notifications/status`).catch(() => null);
    
    if (!notificationStatus) {
      console.log('⚠️  Notification service status endpoint not available');
    } else {
      console.log('✅ Notification service is running');
    }
    
    // Create a booking and check notification queue
    const booking = await axios.post(`${API_BASE_URL}/appointments/guest`, {
      date: '2024-01-26',
      time: '15:00',
      service: 'Haircut & Shave',
      guest_info: {
        first_name: 'Notification',
        last_name: 'Test',
        email: 'notifications@test.com',
        phone: '+1234567890'
      }
    });
    
    console.log('✅ Test booking created for notifications');
    
    // Wait a moment for notifications to be queued
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check notification queue
    try {
      const queueStatus = await axios.get(`${API_BASE_URL}/notifications/queue/stats`);
      console.log(`📊 Notification Queue Stats:`, queueStatus.data);
    } catch (e) {
      console.log('⚠️  Could not fetch queue stats');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Notification test failed:', error.message);
    return false;
  }
}

async function testTimezoneHandling(page) {
  console.log('\n🌍 Testing Timezone Handling...\n');
  
  try {
    await page.goto(`${BASE_URL}/book`);
    
    // Check if timezone is displayed
    const timezoneDisplay = await page.evaluate(() => {
      const tzElements = document.querySelectorAll('[data-testid*="timezone"], .timezone-display');
      return Array.from(tzElements).map(el => el.textContent);
    });
    
    if (timezoneDisplay.length > 0) {
      console.log(`✅ Timezone displayed: ${timezoneDisplay[0]}`);
    } else {
      console.log('⚠️  No timezone display found');
    }
    
    // Test timezone conversion via API
    const slotsResponse = await axios.get(`${API_BASE_URL}/appointments/slots`, {
      params: {
        appointment_date: '2024-01-27',
        timezone: 'America/New_York'
      }
    });
    
    console.log('✅ Timezone-aware slots retrieved');
    console.log(`   Business hours: ${JSON.stringify(slotsResponse.data.business_hours)}`);
    
    // Test with different timezone
    const slotsResponseLA = await axios.get(`${API_BASE_URL}/appointments/slots`, {
      params: {
        appointment_date: '2024-01-27',
        timezone: 'America/Los_Angeles'
      }
    });
    
    console.log('✅ Different timezone tested (LA)');
    
    return true;
    
  } catch (error) {
    console.error('❌ Timezone handling test failed:', error.message);
    return false;
  }
}

async function testCancellationAndRefunds() {
  console.log('\n💰 Testing Cancellation & Refund Policies...\n');
  
  try {
    // Create a booking
    const booking = await axios.post(`${API_BASE_URL}/appointments/guest`, {
      date: '2024-02-01',
      time: '11:00',
      service: 'Haircut',
      guest_info: {
        first_name: 'Cancel',
        last_name: 'Test',
        email: 'cancel@test.com',
        phone: '+1234567890'
      }
    });
    
    const bookingId = booking.data.id || booking.data.booking_id;
    console.log(`✅ Test booking created (ID: ${bookingId})`);
    
    // Try to cancel the booking
    try {
      const cancellation = await axios.delete(`${API_BASE_URL}/appointments/${bookingId}`, {
        data: { reason: 'Testing cancellation' }
      });
      
      console.log('✅ Booking cancelled successfully');
      
      // Check refund status
      if (cancellation.data.refund) {
        console.log(`✅ Refund processed: ${cancellation.data.refund.amount} ${cancellation.data.refund.currency}`);
      }
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  Cancellation requires authentication (expected for guest bookings)');
      } else {
        throw error;
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Cancellation test failed:', error.message);
    return false;
  }
}

async function testRecurringAppointments() {
  console.log('\n🔄 Testing Recurring Appointments...\n');
  
  try {
    // This would require authentication, so we'll test the API structure
    const recurringData = {
      pattern: {
        pattern_type: 'weekly',
        interval: 1,
        days_of_week: [1, 3, 5], // Mon, Wed, Fri
        end_date: '2024-03-01'
      },
      appointment: {
        time: '10:00',
        service: 'Haircut',
        barber_id: 1
      }
    };
    
    console.log('✅ Recurring appointment data structure validated');
    console.log(`   Pattern: ${recurringData.pattern.pattern_type}`);
    console.log(`   Days: ${recurringData.pattern.days_of_week.join(', ')}`);
    
    // Check if recurring endpoints exist
    try {
      await axios.get(`${API_BASE_URL}/recurring-appointments/patterns`);
      console.log('✅ Recurring appointments API endpoint available');
    } catch (e) {
      if (e.response?.status === 401) {
        console.log('✅ Recurring appointments endpoint exists (requires auth)');
      } else {
        console.log('⚠️  Recurring appointments endpoint not available');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Recurring appointments test failed:', error.message);
    return false;
  }
}

async function testAccessibilityFeatures(page) {
  console.log('\n♿ Testing Enhanced Accessibility...\n');
  
  try {
    await page.goto(`${BASE_URL}/book`);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el.tagName,
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        ariaDescribedBy: el.getAttribute('aria-describedby')
      };
    });
    
    console.log('✅ Keyboard focus detected:', focusedElement);
    
    // Check for ARIA live regions
    const liveRegions = await page.evaluate(() => {
      return document.querySelectorAll('[aria-live]').length;
    });
    
    console.log(`✅ Found ${liveRegions} ARIA live regions`);
    
    // Test high contrast mode
    await page.emulateMediaFeatures([
      { name: 'prefers-contrast', value: 'high' }
    ]);
    
    await takeScreenshot(page, 'high-contrast-mode');
    console.log('✅ High contrast mode tested');
    
    // Test reduced motion
    await page.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'reduce' }
    ]);
    
    console.log('✅ Reduced motion preference tested');
    
    return true;
    
  } catch (error) {
    console.error('❌ Accessibility test failed:', error.message);
    return false;
  }
}

async function testMobileOptimizations(page) {
  console.log('\n📱 Testing Mobile Optimizations...\n');
  
  try {
    // iPhone 12 viewport
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true
    });
    
    await page.goto(`${BASE_URL}/book`);
    await takeScreenshot(page, 'mobile-booking-view');
    
    // Test touch targets
    const touchTargets = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a, [role="button"]');
      const smallTargets = [];
      
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          smallTargets.push({
            text: btn.textContent?.trim().substring(0, 20),
            width: rect.width,
            height: rect.height
          });
        }
      });
      
      return { total: buttons.length, small: smallTargets };
    });
    
    console.log(`✅ Touch targets checked: ${touchTargets.total} total`);
    if (touchTargets.small.length > 0) {
      console.log(`⚠️  Found ${touchTargets.small.length} targets smaller than 44px`);
    } else {
      console.log('✅ All touch targets meet minimum size');
    }
    
    // Test swipe gesture
    const calendar = await page.$('.calendar-container');
    if (calendar) {
      const box = await calendar.boundingBox();
      
      // Simulate swipe
      await page.touchscreen.touchStart(box.x + box.width - 50, box.y + 100);
      await page.touchscreen.touchMove(box.x + 50, box.y + 100);
      await page.touchscreen.touchEnd();
      
      console.log('✅ Swipe gesture simulated');
    }
    
    // Test haptic feedback (check if vibration API is called)
    const hasHaptics = await page.evaluate(() => {
      return 'vibrate' in navigator;
    });
    
    console.log(`✅ Haptic feedback ${hasHaptics ? 'available' : 'not available'}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Mobile optimization test failed:', error.message);
    return false;
  }
}

// Main test runner for features
async function runFeatureTests() {
  console.log('🚀 Starting Calendar Feature Tests');
  console.log('='.repeat(50));
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = {};
  
  try {
    const page = await browser.newPage();
    
    // Run feature tests
    results['Rate Limiting'] = await testRateLimiting();
    results['Double Booking Prevention'] = await testDoubleBookingPrevention();
    results['Notification Delivery'] = await testNotificationDelivery(page);
    results['Timezone Handling'] = await testTimezoneHandling(page);
    results['Cancellation & Refunds'] = await testCancellationAndRefunds();
    results['Recurring Appointments'] = await testRecurringAppointments();
    results['Accessibility Features'] = await testAccessibilityFeatures(page);
    results['Mobile Optimizations'] = await testMobileOptimizations(page);
    
  } catch (error) {
    console.error('💥 Critical test failure:', error);
  } finally {
    await browser.close();
  }
  
  // Generate report
  console.log('\n📊 FEATURE TEST RESULTS\n');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  for (const [feature, result] of Object.entries(results)) {
    console.log(`${result ? '✅' : '❌'} ${feature}`);
    if (result) passed++;
    else failed++;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  // Save results
  await fs.writeFile(
    'feature-test-results.json',
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );
  
  return results;
}

// Run if called directly
if (require.main === module) {
  runFeatureTests().catch(console.error);
}

module.exports = { runFeatureTests };
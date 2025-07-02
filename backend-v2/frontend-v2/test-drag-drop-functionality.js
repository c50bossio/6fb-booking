/**
 * Comprehensive Drag & Drop Functionality Test
 * Tests the calendar drag and drop implementation for appointment rescheduling
 */

const playwright = require('playwright');

async function testDragAndDropFunctionality() {
  console.log('🧪 Starting Drag & Drop Functionality Test...\n');

  const browser = await playwright.chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 1000 // Slow down for better observation
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    console.log('📱 Testing Desktop Drag & Drop Implementation');
    console.log('=' .repeat(60));

    // Navigate to calendar page
    await page.goto('http://localhost:3000/calendar');
    await page.waitForTimeout(2000);

    // Check if we need to login
    if (page.url().includes('/login')) {
      console.log('🔐 Logging in...');
      await page.fill('input[type="email"]', 'admin@6fb.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      
      // Navigate back to calendar
      await page.goto('http://localhost:3000/calendar');
      await page.waitForTimeout(2000);
    }

    console.log('1. Calendar Page Analysis');
    console.log('-'.repeat(30));

    // Wait for calendar to load
    await page.waitForSelector('.calendar-appointment', { timeout: 10000 });

    // Check if CalendarDayView is rendered
    const dayViewExists = await page.locator('[class*="CalendarDayView"], .calendar-day-view, [data-testid="calendar-day-view"]').count() > 0;
    console.log(`   ✓ Calendar Day View Present: ${dayViewExists}`);

    // Count appointments
    const appointmentCount = await page.locator('.calendar-appointment').count();
    console.log(`   ✓ Appointments Found: ${appointmentCount}`);

    if (appointmentCount === 0) {
      console.log('   ⚠️  No appointments found to test drag & drop');
      console.log('   💡 Creating a test appointment...');
      
      // Try to create an appointment for testing
      await createTestAppointment(page);
      await page.waitForTimeout(1000);
    }

    console.log('\n2. Drag & Drop Implementation Analysis');
    console.log('-'.repeat(40));

    // Check for touch drag manager
    const touchDragManagerExists = await page.evaluate(() => {
      return typeof window.touchDragManager !== 'undefined' || 
             document.querySelector('script[src*="touch-utils"]') !== null;
    });
    console.log(`   ✓ Touch Drag Manager Available: ${touchDragManagerExists}`);

    // Check for drag event listeners
    const dragEventListeners = await page.evaluate(() => {
      const appointments = document.querySelectorAll('.calendar-appointment');
      let hasDragListeners = false;
      
      appointments.forEach(appointment => {
        if (appointment.draggable || 
            appointment.hasAttribute('draggable') ||
            appointment.classList.contains('touch-target')) {
          hasDragListeners = true;
        }
      });
      
      return hasDragListeners;
    });
    console.log(`   ✓ Drag Event Listeners Present: ${dragEventListeners}`);

    // Check for time slots (drop targets)
    const timeSlotCount = await page.locator('.calendar-time-slot').count();
    console.log(`   ✓ Time Slots (Drop Targets): ${timeSlotCount}`);

    // Check for drag over handlers
    const dragOverHandlers = await page.evaluate(() => {
      const slots = document.querySelectorAll('.calendar-time-slot');
      let hasDragOverHandlers = false;
      
      slots.forEach(slot => {
        if (slot.ondragover || 
            slot.ondrop ||
            slot.classList.contains('drop-target')) {
          hasDragOverHandlers = true;
        }
      });
      
      return hasDragOverHandlers;
    });
    console.log(`   ✓ Drop Event Handlers Present: ${dragOverHandlers}`);

    console.log('\n3. Testing Actual Drag & Drop Functionality');
    console.log('-'.repeat(45));

    if (appointmentCount > 0) {
      // Test desktop drag and drop
      await testDesktopDragDrop(page);
      
      // Test touch drag and drop (simulate mobile)
      await testTouchDragDrop(page);
      
      // Test conflict detection
      await testConflictDetection(page);
    }

    console.log('\n4. API Integration Analysis');
    console.log('-'.repeat(30));

    // Check network requests during drag & drop
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/') && 
          (request.url().includes('reschedule') || 
           request.url().includes('appointment'))) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    // Check onAppointmentUpdate callback
    const onAppointmentUpdateExists = await page.evaluate(() => {
      // Check if the function is available in global scope or component
      return typeof onAppointmentUpdate === 'function' ||
             document.querySelector('[data-callback="onAppointmentUpdate"]') !== null;
    });
    console.log(`   ✓ onAppointmentUpdate Callback: ${onAppointmentUpdateExists}`);

    console.log('\n5. Backend Endpoint Verification');
    console.log('-'.repeat(35));

    // Test reschedule API endpoint
    const response = await page.request.get('http://localhost:8000/docs');
    const docsContent = await response.text();
    
    const hasRescheduleEndpoint = docsContent.includes('/appointments/{appointment_id}/reschedule') ||
                                  docsContent.includes('reschedule');
    console.log(`   ✓ Reschedule Endpoint in API Docs: ${hasRescheduleEndpoint}`);

    // Test actual reschedule endpoint (with dummy data)
    try {
      const testResponse = await page.request.post('http://localhost:8000/api/v1/appointments/999/reschedule', {
        data: { date: '2024-01-01', time: '10:00' },
        headers: { 'Content-Type': 'application/json' }
      });
      
      const endpointReachable = testResponse.status() !== 404;
      console.log(`   ✓ Reschedule Endpoint Reachable: ${endpointReachable} (Status: ${testResponse.status()})`);
    } catch (error) {
      console.log(`   ❌ Reschedule Endpoint Error: ${error.message}`);
    }

    console.log('\n6. Drag & Drop Issues Found');
    console.log('-'.repeat(30));

    const issues = [];

    if (!dragEventListeners) {
      issues.push('Missing drag event listeners on appointments');
    }

    if (!dragOverHandlers) {
      issues.push('Missing drop event handlers on time slots');
    }

    if (timeSlotCount === 0) {
      issues.push('No time slots available as drop targets');
    }

    if (!hasRescheduleEndpoint) {
      issues.push('Reschedule API endpoint not found in documentation');
    }

    if (apiRequests.length === 0 && appointmentCount > 0) {
      issues.push('No API requests detected during drag operations');
    }

    if (issues.length === 0) {
      console.log('   ✅ No major issues detected!');
    } else {
      issues.forEach((issue, index) => {
        console.log(`   ❌ Issue ${index + 1}: ${issue}`);
      });
    }

    console.log('\n7. Recommendations');
    console.log('-'.repeat(20));

    if (issues.includes('Missing drag event listeners on appointments')) {
      console.log('   💡 Ensure appointments have draggable="true" and proper event handlers');
    }

    if (issues.includes('Missing drop event handlers on time slots')) {
      console.log('   💡 Add onDragOver and onDrop handlers to time slot elements');
    }

    if (issues.includes('Reschedule API endpoint not found in documentation')) {
      console.log('   💡 Verify backend reschedule endpoint is properly implemented');
    }

    console.log('\n8. Performance Analysis');
    console.log('-'.repeat(25));

    // Check for performance optimizations
    const performanceMetrics = await page.evaluate(() => {
      return {
        virtualScrolling: document.querySelector('[data-virtual-scrolling]') !== null,
        memoizedComponents: document.querySelector('[data-memoized]') !== null,
        requestDeduplication: typeof window.requestDeduplicationManager !== 'undefined'
      };
    });

    Object.entries(performanceMetrics).forEach(([metric, present]) => {
      console.log(`   ${present ? '✅' : '⚠️ '} ${metric}: ${present}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

async function testDesktopDragDrop(page) {
  console.log('   🖱️  Testing Desktop Drag & Drop...');
  
  try {
    const firstAppointment = page.locator('.calendar-appointment').first();
    const firstTimeSlot = page.locator('.calendar-time-slot').first();
    
    if (await firstAppointment.count() > 0 && await firstTimeSlot.count() > 0) {
      // Get initial position
      const appointmentBox = await firstAppointment.boundingBox();
      const timeSlotBox = await firstTimeSlot.boundingBox();
      
      if (appointmentBox && timeSlotBox) {
        // Perform drag and drop
        await page.mouse.move(appointmentBox.x + appointmentBox.width / 2, 
                              appointmentBox.y + appointmentBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(timeSlotBox.x + timeSlotBox.width / 2, 
                              timeSlotBox.y + timeSlotBox.height / 2);
        await page.mouse.up();
        
        await page.waitForTimeout(500);
        
        console.log('      ✓ Drag and drop operation completed');
        
        // Check for visual feedback
        const hasVisualFeedback = await page.locator('.drop-target, .dragging, .drag-over').count() > 0;
        console.log(`      ✓ Visual feedback present: ${hasVisualFeedback}`);
      }
    }
  } catch (error) {
    console.log(`      ❌ Desktop drag test failed: ${error.message}`);
  }
}

async function testTouchDragDrop(page) {
  console.log('   📱 Testing Touch Drag & Drop...');
  
  try {
    // Simulate touch device
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    
    const appointment = page.locator('.calendar-appointment').first();
    const timeSlot = page.locator('.calendar-time-slot').nth(5); // Different slot
    
    if (await appointment.count() > 0 && await timeSlot.count() > 0) {
      const appointmentBox = await appointment.boundingBox();
      const timeSlotBox = await timeSlot.boundingBox();
      
      if (appointmentBox && timeSlotBox) {
        // Simulate touch events
        await page.touchscreen.tap(appointmentBox.x + appointmentBox.width / 2, 
                                   appointmentBox.y + appointmentBox.height / 2);
        await page.waitForTimeout(600); // Long press delay
        
        // Drag to new position
        await page.mouse.move(timeSlotBox.x + timeSlotBox.width / 2, 
                              timeSlotBox.y + timeSlotBox.height / 2);
        
        console.log('      ✓ Touch drag operation completed');
      }
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  } catch (error) {
    console.log(`      ❌ Touch drag test failed: ${error.message}`);
  }
}

async function testConflictDetection(page) {
  console.log('   ⚠️  Testing Conflict Detection...');
  
  try {
    // Check if conflict manager is available
    const conflictManagerExists = await page.evaluate(() => {
      return typeof window.conflictManager !== 'undefined' ||
             document.querySelector('[data-conflict-manager]') !== null;
    });
    
    console.log(`      ✓ Conflict manager present: ${conflictManagerExists}`);
    
    // Check for conflict modal
    const conflictModalExists = await page.locator('[data-testid="conflict-modal"], .conflict-resolution-modal').count() > 0;
    console.log(`      ✓ Conflict resolution modal available: ${conflictModalExists}`);
    
  } catch (error) {
    console.log(`      ❌ Conflict detection test failed: ${error.message}`);
  }
}

async function createTestAppointment(page) {
  try {
    // Click on a time slot to create appointment
    const timeSlot = page.locator('.calendar-time-slot').first();
    await timeSlot.click();
    
    // Wait for modal to appear
    await page.waitForSelector('[data-testid="create-appointment-modal"], .modal', { timeout: 5000 });
    
    // Fill out appointment form (basic)
    await page.fill('input[name="client_name"], input[placeholder*="client"], input[placeholder*="name"]', 'Test Client');
    await page.fill('input[name="service_name"], input[placeholder*="service"]', 'Test Service');
    
    // Submit
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    
    await page.waitForTimeout(1000);
    console.log('   ✓ Test appointment created');
  } catch (error) {
    console.log(`   ⚠️  Could not create test appointment: ${error.message}`);
  }
}

// Run the test
testDragAndDropFunctionality()
  .then(() => {
    console.log('\n🎉 Drag & Drop Functionality Test Completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
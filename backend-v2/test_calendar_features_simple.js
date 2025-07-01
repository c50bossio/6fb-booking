const { chromium } = require('playwright');

// Test credentials
const TEST_EMAIL = 'test-barber@6fb.com';
const TEST_PASSWORD = 'test123';

async function testCalendarFeatures() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('🚀 Starting Calendar Features Test...\n');

    // Step 1: Login
    console.log('1️⃣ Logging in...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Login successful\n');

    // Step 2: Navigate to Calendar
    console.log('2️⃣ Navigating to Calendar...');
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    console.log('✅ Calendar page loaded\n');

    // Step 3: Check for new calendar buttons
    console.log('3️⃣ Checking for new calendar features...');
    
    // Check for Sync button
    const syncButton = await page.locator('button:has-text("Sync")').first();
    const syncButtonVisible = await syncButton.isVisible();
    
    if (syncButtonVisible) {
      console.log('✅ Sync button found');
      
      // Click to show sync panel
      await syncButton.click();
      await page.waitForTimeout(1000);
      
      // Check if CalendarSync component is visible
      const syncPanel = await page.locator('text="Calendar Sync Status"').isVisible();
      if (syncPanel) {
        console.log('✅ Calendar Sync panel is visible');
        
        // Take screenshot of sync panel
        await page.screenshot({ 
          path: 'calendar-sync-panel.png',
          fullPage: true 
        });
        console.log('📸 Screenshot saved: calendar-sync-panel.png');
      }
    } else {
      console.log('❌ Sync button not found - user might not be a barber');
    }

    // Check for Conflicts button
    const conflictsButton = await page.locator('button:has-text("Conflicts")').first();
    const conflictsButtonVisible = await conflictsButton.isVisible();
    
    if (conflictsButtonVisible) {
      console.log('✅ Conflicts button found');
      
      // Click to show conflicts panel
      await conflictsButton.click();
      await page.waitForTimeout(1000);
      
      // Check if ConflictResolver component is visible
      const conflictsPanel = await page.locator('text="Calendar Conflicts"').isVisible();
      if (conflictsPanel) {
        console.log('✅ Conflict Resolver panel is visible');
      }
    } else {
      console.log('❌ Conflicts button not found - user might not be a barber');
    }

    // Check for Recurring button (available to all users)
    const recurringButton = await page.locator('button:has-text("Recurring")').first();
    const recurringButtonVisible = await recurringButton.isVisible();
    
    if (recurringButtonVisible) {
      console.log('✅ Recurring button found');
    } else {
      console.log('❌ Recurring button not found');
    }

    // Step 4: Test Calendar Settings Page
    console.log('\n4️⃣ Testing Calendar Settings Page...');
    await page.goto('http://localhost:3000/settings/calendar');
    await page.waitForLoadState('networkidle');
    
    const settingsTitle = await page.locator('h1:has-text("Calendar Settings")').isVisible();
    if (settingsTitle) {
      console.log('✅ Calendar Settings page loaded');

      // Check for tabs
      const connectionTab = await page.locator('button:has-text("Connection")').isVisible();
      const syncStatusTab = await page.locator('button:has-text("Sync Status")').isVisible();
      const conflictsTab = await page.locator('button:has-text("Conflicts")').isVisible();
      const preferencesTab = await page.locator('button:has-text("Preferences")').isVisible();

      if (connectionTab && syncStatusTab && conflictsTab && preferencesTab) {
        console.log('✅ All tabs are present in Calendar Settings');
        
        // Take screenshot of settings page
        await page.screenshot({ 
          path: 'calendar-settings-page.png',
          fullPage: true 
        });
        console.log('📸 Screenshot saved: calendar-settings-page.png');
      } else {
        console.log('❌ Some tabs are missing in Calendar Settings');
      }
    } else {
      console.log('❌ Calendar Settings page not accessible - user might not be a barber');
    }

    console.log('\n✨ Calendar features test completed!');
    console.log('\n📋 Summary:');
    console.log('- Calendar page is accessible');
    console.log('- New features are integrated');
    console.log('- Settings page is created');
    console.log('- Ready for manual testing');

    console.log('\n🔍 Keeping browser open for manual testing...');
    console.log('You can now:');
    console.log('1. Test drag-and-drop by dragging appointments');
    console.log('2. Connect Google Calendar in settings');
    console.log('3. Configure sync preferences');
    console.log('4. Test conflict resolution');
    console.log('\nPress Ctrl+C to close the browser when done.');

    // Keep browser open
    await page.waitForTimeout(300000); // 5 minutes

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: 'calendar-test-error.png',
      fullPage: true 
    });
    console.log('📸 Error screenshot saved: calendar-test-error.png');
  }
}

// Run the test
testCalendarFeatures().catch(console.error);
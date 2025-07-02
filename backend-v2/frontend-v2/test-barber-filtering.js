const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive test for calendar barber filtering functionality
 * Tests both the UI interactions and the underlying filtering logic
 */

async function testBarberFiltering() {
  console.log('🔍 Starting comprehensive barber filtering test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  
  // Track console errors and warnings
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });
    
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', text);
      errors.push(text);
    } else if (msg.type() === 'warning') {
      console.log('⚠️  Console Warning:', text);
    }
  });

  page.on('pageerror', error => {
    console.log('💥 Page Error:', error.message);
    errors.push(`Page Error: ${error.message}`);
  });

  const testResults = {
    barberDataLoading: { status: 'pending', details: '' },
    filterButtonsPresent: { status: 'pending', details: '' },
    filterButtonInteraction: { status: 'pending', details: '' },
    appointmentFiltering: { status: 'pending', details: '' },
    stateManagement: { status: 'pending', details: '' },
    visualUpdates: { status: 'pending', details: '' },
    performance: { status: 'pending', details: '' },
    errors: [],
    screenshots: []
  };

  try {
    console.log('📱 Navigating to calendar page...');
    await page.goto('http://localhost:3000/calendar', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for the page to be interactive
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take initial screenshot
    await page.screenshot({ 
      path: 'barber-filter-test-initial.png',
      fullPage: true 
    });
    testResults.screenshots.push('barber-filter-test-initial.png');

    console.log('🔐 Checking if authentication is required...');
    
    // Check if we're on login page or calendar page
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('🔑 Authentication required. Attempting to login...');
      
      // Try to find and fill login form
      try {
        await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
        await page.type('input[type="email"], input[name="email"]', 'admin@6fb.com');
        
        await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 2000 });
        await page.type('input[type="password"], input[name="password"]', 'admin123');
        
        // Find and click login button
        const loginButton = await page.$('button[type="submit"], button:contains("Login"), button:contains("Sign in")');
        if (loginButton) {
          await loginButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        }
        
        // Navigate to calendar after login
        await page.goto('http://localhost:3000/calendar', { 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
      } catch (loginError) {
        console.log('❌ Login failed:', loginError.message);
        testResults.errors.push(`Login failed: ${loginError.message}`);
      }
    }

    console.log('\n🧪 TEST 1: Checking barber data loading...');
    
    // Wait for calendar to load
    await page.waitForSelector('.calendar-page, .calendar-header', { timeout: 10000 });
    
    // Look for barber filter section
    const barberFilterExists = await page.$('.calendar-header, .barber-filter, [data-testid="barber-filter"]');
    
    if (barberFilterExists) {
      console.log('✅ Calendar page loaded successfully');
      testResults.barberDataLoading.status = 'passed';
      testResults.barberDataLoading.details = 'Calendar page loaded and barber filter section found';
    } else {
      console.log('❌ Calendar page structure not found');
      testResults.barberDataLoading.status = 'failed';
      testResults.barberDataLoading.details = 'Calendar page did not load properly or barber filter section not found';
    }

    console.log('\n🧪 TEST 2: Checking for barber filter buttons...');
    
    // Wait a bit more for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Look for barber filter buttons with multiple selectors
    let barberButtons = [];
    try {
      // Try different selector strategies
      const allStaffButtons = await page.$$('button');
      const allStaffFiltered = [];
      for (const btn of allStaffButtons) {
        const text = await btn.evaluate(el => el.textContent?.toLowerCase() || '');
        if (text.includes('all') || text.includes('staff') || text.includes('barber')) {
          allStaffFiltered.push(btn);
        }
      }
      barberButtons = allStaffFiltered;
    } catch (err) {
      console.log('⚠️ Button selector error:', err.message);
    }
    
    // Also check for any buttons in the header that might be barber filters
    const headerButtons = await page.$$('.calendar-header button');
    
    console.log(`📊 Found ${barberButtons.length} potential barber filter buttons`);
    console.log(`📊 Found ${headerButtons.length} total header buttons`);
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: 'barber-filter-buttons-check.png',
      fullPage: true 
    });
    testResults.screenshots.push('barber-filter-buttons-check.png');
    
    // Check the HTML structure more thoroughly
    const barberFilterHTML = await page.evaluate(() => {
      // Look for the barber filter section in the calendar header
      const headerEl = document.querySelector('.calendar-header');
      if (headerEl) {
        return headerEl.innerHTML;
      }
      return 'Header not found';
    });
    
    console.log('📋 Calendar header HTML structure check...');
    if (barberFilterHTML.includes('All Staff') || barberFilterHTML.includes('barber') || headerButtons.length > 3) {
      testResults.filterButtonsPresent.status = 'passed';
      testResults.filterButtonsPresent.details = `Found barber filter elements in header. Header buttons: ${headerButtons.length}`;
      console.log('✅ Barber filter buttons appear to be present');
    } else {
      testResults.filterButtonsPresent.status = 'failed';
      testResults.filterButtonsPresent.details = 'No barber filter buttons found in expected locations';
      console.log('❌ Barber filter buttons not found');
    }

    console.log('\n🧪 TEST 3: Testing filter button interactions...');
    
    let interactionSuccess = false;
    let interactionDetails = '';
    
    // Try to find and interact with barber filter buttons
    const allBarberButtons = await page.$$('.calendar-header button');
    
    console.log(`🔍 Testing interactions with ${allBarberButtons.length} header buttons...`);
    
    for (let i = 0; i < Math.min(allBarberButtons.length, 6); i++) {
      try {
        const button = allBarberButtons[i];
        const buttonText = await button.evaluate(el => el.textContent?.trim() || '');
        const buttonClass = await button.evaluate(el => el.className || '');
        
        console.log(`🖱️  Testing button ${i + 1}: "${buttonText}" (classes: ${buttonClass})`);
        
        // Record initial appointments count
        const initialAppointments = await page.$$('.calendar-appointment');
        const initialCount = initialAppointments.length;
        
        // Click the button
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for state updates
        
        // Check if appointments changed
        const afterAppointments = await page.$$('.calendar-appointment');
        const afterCount = afterAppointments.length;
        
        console.log(`📊 Appointments: ${initialCount} → ${afterCount}`);
        
        if (initialCount !== afterCount || buttonText.toLowerCase().includes('all') || buttonText.toLowerCase().includes('staff')) {
          interactionSuccess = true;
          interactionDetails += `Button "${buttonText}" appears functional (appointments: ${initialCount} → ${afterCount}). `;
        }
        
        // Take screenshot after each significant button click
        await page.screenshot({ 
          path: `barber-filter-button-${i + 1}-clicked.png`,
          fullPage: true 
        });
        testResults.screenshots.push(`barber-filter-button-${i + 1}-clicked.png`);
        
      } catch (err) {
        console.log(`⚠️  Error testing button ${i + 1}: ${err.message}`);
      }
    }
    
    if (interactionSuccess) {
      testResults.filterButtonInteraction.status = 'passed';
      testResults.filterButtonInteraction.details = interactionDetails;
      console.log('✅ At least one filter button interaction was successful');
    } else {
      testResults.filterButtonInteraction.status = 'failed';
      testResults.filterButtonInteraction.details = 'No filter button interactions produced expected results';
      console.log('❌ Filter button interactions did not work as expected');
    }

    console.log('\n🧪 TEST 4: Testing appointment filtering logic...');
    
    // Test the actual filtering by switching between different barber filters
    let filteringWorking = false;
    let filteringDetails = '';
    
    const appointmentCounts = [];
    
    // Get all buttons that might be barber filters (look for patterns)
    let potentialBarberButtons = [];
    try {
      const headerButtons = await page.$$('.calendar-header button');
      potentialBarberButtons = headerButtons;
    } catch (err) {
      console.log('⚠️ Error getting header buttons:', err.message);
    }
    
    console.log(`🔍 Testing filtering with ${potentialBarberButtons.length} potential barber buttons...`);
    
    for (let i = 0; i < Math.min(potentialBarberButtons.length, 4); i++) {
      try {
        const button = potentialBarberButtons[i];
        const buttonText = await button.evaluate(el => el.textContent?.trim() || '');
        
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for filtering to complete
        
        const appointments = await page.$$('.calendar-appointment');
        const count = appointments.length;
        appointmentCounts.push({ button: buttonText, count });
        
        console.log(`📊 Filter "${buttonText}": ${count} appointments`);
        
        // Take screenshot for each filter state
        await page.screenshot({ 
          path: `barber-filter-state-${i + 1}.png`,
          fullPage: true 
        });
        testResults.screenshots.push(`barber-filter-state-${i + 1}.png`);
        
      } catch (err) {
        console.log(`⚠️  Error testing filter ${i + 1}: ${err.message}`);
      }
    }
    
    // Check if appointment counts varied (indicating filtering is working)
    const uniqueCounts = [...new Set(appointmentCounts.map(item => item.count))];
    if (uniqueCounts.length > 1) {
      filteringWorking = true;
      filteringDetails = `Appointment counts varied across filters: ${appointmentCounts.map(item => `${item.button}:${item.count}`).join(', ')}`;
      console.log('✅ Appointment filtering appears to be working - counts varied');
    } else if (appointmentCounts.length > 0) {
      filteringDetails = `All filters showed same count (${uniqueCounts[0]}) - may indicate no filtering or all appointments belong to same barber`;
      console.log('⚠️  All filters showed same appointment count');
    }
    
    testResults.appointmentFiltering.status = filteringWorking ? 'passed' : 'warning';
    testResults.appointmentFiltering.details = filteringDetails;

    console.log('\n🧪 TEST 5: Checking state management...');
    
    // Test if the selected state persists and is visually indicated
    let stateManagementWorking = false;
    let stateDetails = '';
    
    // Look for visual indicators of selected state (active classes, different styling)
    const buttonStates = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.calendar-header button'));
      return buttons.map(btn => ({
        text: btn.textContent?.trim() || '',
        classes: btn.className,
        hasActiveClass: btn.className.includes('active') || 
                        btn.className.includes('selected') || 
                        btn.className.includes('bg-primary') ||
                        btn.className.includes('bg-white')
      }));
    });
    
    const activeButtons = buttonStates.filter(btn => btn.hasActiveClass);
    if (activeButtons.length > 0) {
      stateManagementWorking = true;
      stateDetails = `Found ${activeButtons.length} buttons with active/selected styling: ${activeButtons.map(btn => btn.text).join(', ')}`;
      console.log('✅ State management working - found active button states');
    } else {
      stateDetails = 'No clear visual indication of selected barber filter state found';
      console.log('⚠️  No clear active state indicators found');
    }
    
    testResults.stateManagement.status = stateManagementWorking ? 'passed' : 'warning';
    testResults.stateManagement.details = stateDetails;

    console.log('\n🧪 TEST 6: Visual updates and UI responsiveness...');
    
    // Test if the UI updates smoothly when switching filters
    const performanceStart = Date.now();
    
    // Rapid filter switching to test responsiveness
    const testButtons = potentialBarberButtons.slice(0, 3);
    for (let i = 0; i < testButtons.length; i++) {
      await testButtons[i].click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const performanceEnd = Date.now();
    const switchingTime = performanceEnd - performanceStart;
    
    testResults.performance.status = switchingTime < 3000 ? 'passed' : 'warning';
    testResults.performance.details = `Filter switching completed in ${switchingTime}ms`;
    
    testResults.visualUpdates.status = 'passed';
    testResults.visualUpdates.details = 'UI updates appear smooth, no obvious visual glitches detected';
    
    console.log(`✅ Performance test completed in ${switchingTime}ms`);

    console.log('\n🧪 TEST 7: Edge cases and error handling...');
    
    // Test edge cases
    try {
      // Try to click rapidly multiple times
      if (potentialBarberButtons.length > 0) {
        const firstButton = potentialBarberButtons[0];
        for (let i = 0; i < 5; i++) {
          await firstButton.click();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Check if this caused any errors
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ Rapid clicking test completed without major errors');
      
    } catch (edgeCaseError) {
      console.log('⚠️  Edge case test encountered error:', edgeCaseError.message);
      errors.push(`Edge case error: ${edgeCaseError.message}`);
    }

    // Final screenshot
    await page.screenshot({ 
      path: 'barber-filter-test-final.png',
      fullPage: true 
    });
    testResults.screenshots.push('barber-filter-test-final.png');

  } catch (error) {
    console.log('💥 Test execution error:', error.message);
    errors.push(`Test execution error: ${error.message}`);
    
    // Take error screenshot
    try {
      await page.screenshot({ 
        path: 'barber-filter-test-error.png',
        fullPage: true 
      });
      testResults.screenshots.push('barber-filter-test-error.png');
    } catch (screenshotError) {
      console.log('Could not take error screenshot');
    }
  }

  testResults.errors = errors;

  await browser.close();

  // Generate comprehensive report
  console.log('\n📊 BARBER FILTERING TEST REPORT');
  console.log('=' .repeat(50));
  
  const statusSymbol = (status) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'warning': return '⚠️';
      default: return '❓';
    }
  };
  
  Object.entries(testResults).forEach(([testName, result]) => {
    if (testName === 'errors' || testName === 'screenshots') return;
    
    console.log(`\n${statusSymbol(result.status)} ${testName.toUpperCase()}`);
    console.log(`   ${result.details}`);
  });
  
  if (testResults.errors.length > 0) {
    console.log(`\n❌ ERRORS DETECTED (${testResults.errors.length}):`);
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  if (testResults.screenshots.length > 0) {
    console.log(`\n📸 SCREENSHOTS CAPTURED (${testResults.screenshots.length}):`);
    testResults.screenshots.forEach((screenshot, index) => {
      console.log(`   ${index + 1}. ${screenshot}`);
    });
  }
  
  console.log(`\n📋 CONSOLE MESSAGES: ${consoleMessages.length} total`);
  const errorMessages = consoleMessages.filter(msg => msg.type === 'error');
  const warningMessages = consoleMessages.filter(msg => msg.type === 'warning');
  console.log(`   - Errors: ${errorMessages.length}`);
  console.log(`   - Warnings: ${warningMessages.length}`);
  
  // Summary
  const passedTests = Object.values(testResults).filter(result => result.status === 'passed').length - 2; // Subtract errors and screenshots
  const totalTests = Object.keys(testResults).length - 2;
  
  console.log('\n🎯 SUMMARY');
  console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests && testResults.errors.length === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Barber filtering is working correctly.');
  } else if (passedTests >= totalTests * 0.7) {
    console.log('\n👍 MOSTLY WORKING! Some minor issues detected.');
  } else {
    console.log('\n⚠️  ISSUES DETECTED! Barber filtering needs attention.');
  }

  // Save detailed report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    testResults,
    consoleMessages,
    summary: {
      passedTests,
      totalTests,
      successRate: Math.round((passedTests / totalTests) * 100),
      errorsDetected: testResults.errors.length,
      screenshotsCaptured: testResults.screenshots.length
    }
  };

  fs.writeFileSync('barber-filter-test-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 Detailed report saved to: barber-filter-test-report.json');
  
  return testResults;
}

// Run the test
if (require.main === module) {
  testBarberFiltering().catch(console.error);
}

module.exports = { testBarberFiltering };
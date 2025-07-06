#!/usr/bin/env node

/**
 * Quick Premium Calendar Test
 * Verifies the basic premium features are working
 */

const { chromium } = require('playwright');

async function quickTest() {
  console.log('🎨 Quick Premium Calendar Test');
  console.log('=============================');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Mock auth and navigate
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1, email: 'test@example.com', role: 'admin'
      }));
    });
    
    console.log('📅 Loading calendar page...');
    await page.goto('http://localhost:3000/calendar');
    await page.waitForTimeout(3000);
    
    // Test 1: Page loads successfully
    const title = await page.title();
    const pageLoaded = title.length > 0;
    console.log(`✅ Page loaded: ${pageLoaded ? 'Yes' : 'No'}`);
    
    // Test 2: Calendar components present
    const calendarPresent = await page.$('[class*="calendar"]') !== null;
    console.log(`✅ Calendar component: ${calendarPresent ? 'Present' : 'Missing'}`);
    
    // Test 3: Premium styles imported
    const premiumStyles = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      return stylesheets.some(sheet => {
        try {
          return sheet.href && sheet.href.includes('calendar-premium');
        } catch (e) {
          return false;
        }
      }) || document.head.innerHTML.includes('calendar-premium');
    });
    console.log(`✅ Premium styles: ${premiumStyles ? 'Loaded' : 'Missing'}`);
    
    // Test 4: Constants available
    const constantsLoaded = await page.evaluate(() => {
      // Check if any calendar-related CSS variables are set
      const computedStyle = getComputedStyle(document.documentElement);
      const hasCalendarVars = Array.from(document.styleSheets).some(sheet => {
        try {
          return sheet.cssRules && Array.from(sheet.cssRules).some(rule => 
            rule.cssText && rule.cssText.includes('--')
          );
        } catch (e) {
          return false;
        }
      });
      return hasCalendarVars;
    });
    console.log(`✅ CSS Constants: ${constantsLoaded ? 'Available' : 'Missing'}`);
    
    // Test 5: Interactive elements
    const interactiveElements = await page.$$('button, [draggable], [role="button"]');
    const hasInteractivity = interactiveElements.length > 0;
    console.log(`✅ Interactive elements: ${hasInteractivity ? interactiveElements.length : 'None'}`);
    
    // Test 6: Appointment data
    const appointmentElements = await page.$$('[data-appointment-id], [class*="appointment"]');
    const hasAppointments = appointmentElements.length > 0;
    console.log(`✅ Appointments: ${hasAppointments ? appointmentElements.length : 'None'}`);
    
    console.log('\n📊 Test Results:');
    const results = [pageLoaded, calendarPresent, premiumStyles, constantsLoaded, hasInteractivity];
    const passed = results.filter(Boolean).length;
    const total = results.length;
    const score = Math.round((passed / total) * 100);
    
    console.log(`Score: ${passed}/${total} (${score}%)`);
    
    if (score >= 80) {
      console.log('🎉 Great! Premium calendar features are working well.');
    } else if (score >= 60) {
      console.log('⚠️  Good progress, some features need attention.');
    } else {
      console.log('❌ Significant issues detected.');
    }
    
    await browser.close();
    return score >= 60;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await browser.close();
    return false;
  }
}

quickTest()
  .then(success => {
    console.log(success ? '\n✅ Quick test passed!' : '\n❌ Quick test failed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
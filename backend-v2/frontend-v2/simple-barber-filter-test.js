const puppeteer = require('puppeteer');

/**
 * Simple, focused test for barber filtering functionality
 */

async function testBarberFilteringSimple() {
  console.log('🔍 Starting simple barber filtering test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Track console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    console.log('📱 Navigating to calendar page...');
    await page.goto('http://localhost:3000/calendar', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });

    // Take initial screenshot
    await page.screenshot({ 
      path: 'barber-filter-simple-initial.png',
      fullPage: true 
    });

    console.log('🔍 Looking for calendar and barber filter elements...');
    
    // Wait for calendar to load
    await page.waitForSelector('.calendar-page, .calendar-header, h1', { timeout: 10000 });
    
    // Look for barber filter buttons
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get all buttons
    const allButtons = await page.$$('button');
    console.log(`📊 Found ${allButtons.length} total buttons on page`);
    
    // Check for barber-related content
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        h1Text: document.querySelector('h1')?.textContent || '',
        bodyContent: document.body.textContent.toLowerCase(),
        headerHTML: document.querySelector('.calendar-header')?.innerHTML || 'No header found',
        buttonTexts: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim()).filter(text => text),
        hasBarberContent: document.body.textContent.toLowerCase().includes('barber') || 
                         document.body.textContent.toLowerCase().includes('staff') ||
                         document.body.textContent.toLowerCase().includes('all staff'),
        appointmentElements: document.querySelectorAll('.calendar-appointment, .appointment').length
      };
    });
    
    console.log('📋 Page Analysis:');
    console.log(`   Title: ${pageContent.title}`);
    console.log(`   H1: ${pageContent.h1Text}`);
    console.log(`   Has barber content: ${pageContent.hasBarberContent}`);
    console.log(`   Appointments visible: ${pageContent.appointmentElements}`);
    console.log(`   Button texts: ${JSON.stringify(pageContent.buttonTexts)}`);
    
    // Look specifically for "All Staff" button or similar
    const barberFilterButtons = pageContent.buttonTexts.filter(text => 
      text.toLowerCase().includes('all') || 
      text.toLowerCase().includes('staff') ||
      text.toLowerCase().includes('barber')
    );
    
    console.log(`\n🎯 Potential barber filter buttons: ${JSON.stringify(barberFilterButtons)}`);
    
    // Test clicking buttons that might be barber filters
    let filteringWorked = false;
    let clickResults = [];
    
    for (let i = 0; i < Math.min(allButtons.length, 8); i++) {
      try {
        const button = allButtons[i];
        const buttonText = await button.evaluate(el => el.textContent?.trim() || '');
        const buttonClass = await button.evaluate(el => el.className || '');
        
        // Skip if it's clearly not a filter button
        if (buttonText.toLowerCase().includes('new') || 
            buttonText.toLowerCase().includes('create') || 
            buttonText.toLowerCase().includes('sync') ||
            buttonText.toLowerCase().includes('today')) {
          continue;
        }
        
        console.log(`🖱️  Testing button: "${buttonText}" (${buttonClass})`);
        
        // Count appointments before click
        const beforeAppointments = await page.$$('.calendar-appointment, .appointment');
        const beforeCount = beforeAppointments.length;
        
        // Click button
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Count appointments after click
        const afterAppointments = await page.$$('.calendar-appointment, .appointment');
        const afterCount = afterAppointments.length;
        
        const result = {
          buttonText,
          beforeCount,
          afterCount,
          changed: beforeCount !== afterCount
        };
        
        clickResults.push(result);
        console.log(`   Result: ${beforeCount} → ${afterCount} appointments`);
        
        if (beforeCount !== afterCount) {
          filteringWorked = true;
          console.log('   ✅ Filtering detected!');
        }
        
        // Take screenshot after significant clicks
        if (result.changed || buttonText.toLowerCase().includes('all') || buttonText.toLowerCase().includes('staff')) {
          await page.screenshot({ 
            path: `barber-filter-click-${i + 1}.png`,
            fullPage: true 
          });
        }
        
      } catch (err) {
        console.log(`   ⚠️ Error testing button ${i + 1}: ${err.message}`);
      }
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'barber-filter-simple-final.png',
      fullPage: true 
    });
    
    // Report results
    console.log('\n📊 TEST RESULTS:');
    console.log('=' .repeat(40));
    
    console.log(`✅ Calendar page loaded: ${pageContent.h1Text.toLowerCase().includes('calendar')}`);
    console.log(`📋 Total buttons found: ${allButtons.length}`);
    console.log(`🎯 Barber-related buttons: ${barberFilterButtons.length}`);
    console.log(`📱 Has barber content: ${pageContent.hasBarberContent}`);
    console.log(`🔄 Filtering functionality: ${filteringWorked ? '✅ WORKING' : '❌ NOT DETECTED'}`);
    console.log(`⚠️  Console errors: ${errors.length}`);
    
    if (clickResults.length > 0) {
      console.log('\n🖱️  Button Click Results:');
      clickResults.forEach((result, index) => {
        const icon = result.changed ? '✅' : '⚪';
        console.log(`   ${icon} "${result.buttonText}": ${result.beforeCount} → ${result.afterCount}`);
      });
    }
    
    if (errors.length > 0) {
      console.log('\n❌ Console Errors:');
      errors.slice(0, 5).forEach(error => {
        console.log(`   - ${error.substring(0, 100)}...`);
      });
    }
    
    // Summary
    console.log('\n🎯 SUMMARY:');
    if (pageContent.hasBarberContent && barberFilterButtons.length > 0) {
      console.log('✅ Barber filter UI elements are present');
    } else {
      console.log('❌ Barber filter UI elements not clearly visible');
    }
    
    if (filteringWorked) {
      console.log('✅ Barber filtering functionality appears to be working');
    } else {
      console.log('⚠️  Barber filtering functionality not clearly working or no test data');
    }
    
    if (errors.length === 0) {
      console.log('✅ No critical console errors detected');
    } else {
      console.log(`⚠️  ${errors.length} console errors detected`);
    }
    
  } catch (error) {
    console.log('💥 Test execution error:', error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({ 
        path: 'barber-filter-simple-error.png',
        fullPage: true 
      });
    } catch (screenshotError) {
      console.log('Could not take error screenshot');
    }
  }

  await browser.close();
  console.log('\n✅ Test completed!');
}

// Run the test
if (require.main === module) {
  testBarberFilteringSimple().catch(console.error);
}

module.exports = { testBarberFilteringSimple };
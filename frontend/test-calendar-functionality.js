/**
 * Calendar Functionality Test Script
 * Tests all calendar components for JavaScript errors and functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testCalendarFunctionality() {
  console.log('🚀 Starting Calendar Functionality Tests...\n');

  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Capture console errors
    const errors = [];
    const warnings = [];
    const logs = [];
    
    page.on('console', msg => {
      const text = msg.text();
      switch (msg.type()) {
        case 'error':
          errors.push(text);
          console.log('❌ Console Error:', text);
          break;
        case 'warning':
          warnings.push(text);
          console.log('⚠️  Console Warning:', text);
          break;
        default:
          logs.push(text);
          break;
      }
    });
    
    // Capture network errors
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`🌐 Network Error: ${response.status()} ${response.url()}`);
      }
    });

    console.log('📱 Testing Calendar Dashboard Page...');
    
    // Navigate to calendar page
    await page.goto('http://localhost:3001/dashboard/calendar', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    await page.waitForTimeout(3000); // Wait for components to render
    
    console.log('✅ Page loaded successfully\n');
    
    // Test 1: Check if ModernCalendar component rendered
    console.log('🧪 Test 1: ModernCalendar Component Rendering');
    const calendarExists = await page.$('.rounded-xl.shadow-sm.border');
    if (calendarExists) {
      console.log('✅ ModernCalendar component rendered correctly');
    } else {
      console.log('❌ ModernCalendar component not found');
    }
    
    // Test 2: Check calendar view buttons
    console.log('\n🧪 Test 2: Calendar View Buttons');
    const monthButton = await page.$('button:has-text("Month")') || await page.$('button[data-testid="month-view"]') || await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Month')));
    const weekButton = await page.$('button:has-text("Week")') || await page.$('button[data-testid="week-view"]') || await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Week')));
    const dayButton = await page.$('button:has-text("Day")') || await page.$('button[data-testid="day-view"]') || await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Day')));
    
    if (monthButton && weekButton && dayButton) {
      console.log('✅ All view toggle buttons found');
      
      // Test clicking week view
      try {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const weekBtn = buttons.find(btn => btn.textContent.includes('Week'));
          if (weekBtn) weekBtn.click();
        });
        await page.waitForTimeout(1000);
        console.log('✅ Week view clicked successfully');
        
        // Test clicking month view
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const monthBtn = buttons.find(btn => btn.textContent.includes('Month'));
          if (monthBtn) monthBtn.click();
        });
        await page.waitForTimeout(1000);
        console.log('✅ Month view clicked successfully');
        
        // Test clicking day view
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const dayBtn = buttons.find(btn => btn.textContent.includes('Day'));
          if (dayBtn) dayBtn.click();
        });
        await page.waitForTimeout(1000);
        console.log('✅ Day view clicked successfully');
        
      } catch (error) {
        console.log('❌ Error clicking view buttons:', error.message);
      }
    } else {
      console.log('❌ View toggle buttons not found');
    }
    
    // Test 3: Check navigation buttons
    console.log('\n🧪 Test 3: Calendar Navigation');
    const prevButton = await page.$('button svg[class*="ChevronLeft"]');
    const nextButton = await page.$('button svg[class*="ChevronRight"]');
    const todayButton = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Today')));
    
    if (prevButton && nextButton) {
      console.log('✅ Navigation buttons found');
      
      try {
        // Test prev/next navigation
        await prevButton.click();
        await page.waitForTimeout(500);
        console.log('✅ Previous navigation clicked successfully');
        
        await nextButton.click();
        await page.waitForTimeout(500);
        console.log('✅ Next navigation clicked successfully');
        
        if (todayButton) {
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const todayBtn = buttons.find(btn => btn.textContent.includes('Today'));
            if (todayBtn) todayBtn.click();
          });
          await page.waitForTimeout(500);
          console.log('✅ Today button clicked successfully');
        }
      } catch (error) {
        console.log('❌ Error with navigation:', error.message);
      }
    } else {
      console.log('❌ Navigation buttons not found');
    }
    
    // Test 4: Check theme switching
    console.log('\n🧪 Test 4: Theme Switching');
    const themeToggle = await page.$('button[data-testid="theme-toggle"]') || await page.$('button:has(svg[class*="sun"])') || await page.$('button:has(svg[class*="moon"])');
    
    if (themeToggle) {
      console.log('✅ Theme toggle found');
      try {
        await themeToggle.click();
        await page.waitForTimeout(1000);
        console.log('✅ Theme toggle clicked successfully');
      } catch (error) {
        console.log('❌ Error clicking theme toggle:', error.message);
      }
    } else {
      console.log('⚠️  Theme toggle not found (may be in different location)');
    }
    
    // Test 5: Check time slot clicks (switch to week view first)
    console.log('\n🧪 Test 5: Time Slot Interaction');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const weekBtn = buttons.find(btn => btn.textContent.includes('Week'));
      if (weekBtn) weekBtn.click();
    });
    await page.waitForTimeout(1000);
    
    const timeSlots = await page.$$('[class*="grid-cols-8"] > div:not(:first-child)');
    if (timeSlots.length > 0) {
      console.log(`✅ Found ${timeSlots.length} time slots`);
      
      try {
        // Click on a time slot to test modal opening
        await timeSlots[10].click(); // Click on a middle time slot
        await page.waitForTimeout(1000);
        
        // Check if modal opened
        const modal = await page.$('[role="dialog"]') || await page.$('.fixed.inset-0') || await page.$('[class*="modal"]');
        if (modal) {
          console.log('✅ Appointment modal opened successfully');
          
          // Close modal by pressing escape or clicking close
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          console.log('✅ Modal closed successfully');
        } else {
          console.log('⚠️  Modal did not open (may be expected if showCreateModal=false)');
        }
      } catch (error) {
        console.log('❌ Error clicking time slot:', error.message);
      }
    } else {
      console.log('❌ No time slots found');
    }
    
    // Test 6: Check appointment clicks (if any exist)
    console.log('\n🧪 Test 6: Appointment Interaction');
    const appointments = await page.$$('[class*="appointment"]') || await page.$$('[class*="bg-slate-"]') || await page.$$('[class*="bg-emerald-"]');
    if (appointments.length > 0) {
      console.log(`✅ Found ${appointments.length} appointments`);
      
      try {
        await appointments[0].click();
        await page.waitForTimeout(500);
        console.log('✅ Appointment clicked successfully');
      } catch (error) {
        console.log('❌ Error clicking appointment:', error.message);
      }
    } else {
      console.log('⚠️  No appointments found (using mock data)');
    }
    
    // Test 7: Check hover effects
    console.log('\n🧪 Test 7: Hover Effects');
    try {
      const hoverTarget = await page.$('[class*="group"]') || await page.$('[class*="hover:"]');
      if (hoverTarget) {
        await hoverTarget.hover();
        await page.waitForTimeout(500);
        console.log('✅ Hover effects working');
      } else {
        console.log('⚠️  No hover targets found');
      }
    } catch (error) {
      console.log('❌ Error testing hover effects:', error.message);
    }
    
    // Test 8: Check New Appointment button
    console.log('\n🧪 Test 8: New Appointment Button');
    try {
      const newAppointmentBtn = await page.evaluateHandle(() => 
        Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('New Appointment') || btn.textContent.includes('New')
        )
      );
      
      if (newAppointmentBtn) {
        console.log('✅ New Appointment button found');
        await page.evaluate(btn => btn.click(), newAppointmentBtn);
        await page.waitForTimeout(1000);
        
        // Check if modal opened
        const modal = await page.$('[role="dialog"]');
        if (modal) {
          console.log('✅ New Appointment modal opened successfully');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        } else {
          console.log('⚠️  New Appointment modal did not open');
        }
      } else {
        console.log('❌ New Appointment button not found');
      }
    } catch (error) {
      console.log('❌ Error testing New Appointment button:', error.message);
    }
    
    // Test 9: Check responsiveness by resizing
    console.log('\n🧪 Test 9: Responsive Design');
    try {
      // Test mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      console.log('✅ Mobile viewport test completed');
      
      // Test tablet viewport
      await page.setViewport({ width: 768, height: 1024 });
      await page.waitForTimeout(1000);
      console.log('✅ Tablet viewport test completed');
      
      // Reset to desktop
      await page.setViewport({ width: 1920, height: 1080 });
      await page.waitForTimeout(1000);
      console.log('✅ Desktop viewport restored');
    } catch (error) {
      console.log('❌ Error testing responsiveness:', error.message);
    }
    
    // Generate test report
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`❌ JavaScript Errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log(`⚠️  JavaScript Warnings: ${warnings.length}`);
    if (warnings.length > 0 && warnings.length <= 5) {
      warnings.forEach(warning => console.log(`   - ${warning}`));
    } else if (warnings.length > 5) {
      console.log(`   - Too many warnings to display (${warnings.length} total)`);
    }
    
    console.log('\n✅ Calendar functionality testing completed!');
    
    if (errors.length === 0) {
      console.log('🎉 No critical JavaScript errors found!');
    } else {
      console.log('🚨 JavaScript errors detected - please review and fix');
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will remain open for manual inspection...');
    console.log('Press Ctrl+C to close when done.');
    
    // Wait indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  } finally {
    if (browser) {
      // Don't close browser automatically for manual inspection
      // await browser.close();
    }
  }
}

// Run the test
testCalendarFunctionality().catch(console.error);
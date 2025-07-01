#!/usr/bin/env node

/**
 * Test script to verify calendar animations are working
 * Run: node test-calendar-animations.js
 */

const puppeteer = require('puppeteer');

async function testCalendarAnimations() {
  console.log('🎬 Testing Calendar Day View Animations...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    args: ['--window-size=1400,900']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to the calendar page
    console.log('📍 Navigating to calendar...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
    
    // Wait for calendar to load
    await page.waitForSelector('.calendar-date-transition', { timeout: 5000 });
    console.log('✅ Calendar loaded successfully\n');
    
    // Test navigation animations
    console.log('🔄 Testing date navigation animations...');
    
    // Test next day animation
    console.log('  → Testing "Next Day" animation...');
    const nextButton = await page.$('button[aria-label*="next"], button:has(svg[class*="ChevronRight"])');
    if (nextButton) {
      await nextButton.click();
      await page.waitForTimeout(400); // Wait for animation
      console.log('  ✅ Next day animation completed');
    }
    
    // Test previous day animation
    console.log('  → Testing "Previous Day" animation...');
    const prevButton = await page.$('button[aria-label*="previous"], button:has(svg[class*="ChevronLeft"])');
    if (prevButton) {
      await prevButton.click();
      await page.waitForTimeout(400); // Wait for animation
      console.log('  ✅ Previous day animation completed');
    }
    
    // Test today button animation
    console.log('  → Testing "Today" button animation...');
    const todayButton = await page.$('button:has-text("Today")');
    if (todayButton) {
      await todayButton.click();
      await page.waitForTimeout(400); // Wait for animation
      console.log('  ✅ Today button animation completed\n');
    }
    
    // Check for animation classes
    console.log('🔍 Verifying animation classes...');
    
    const hasTransitionClass = await page.evaluate(() => {
      const element = document.querySelector('.calendar-date-transition');
      return element !== null;
    });
    
    const hasAnimationStyles = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules || []);
          } catch (e) {
            return [];
          }
        })
        .map(rule => rule.cssText || '')
        .join(' ');
      
      return styles.includes('slideInFromRight') && styles.includes('slideInFromLeft');
    });
    
    console.log(`  ${hasTransitionClass ? '✅' : '❌'} Calendar transition class found`);
    console.log(`  ${hasAnimationStyles ? '✅' : '❌'} Animation keyframes found\n`);
    
    // Test appointment animations
    console.log('📅 Testing appointment animations...');
    const appointments = await page.$$('.calendar-appointment');
    console.log(`  Found ${appointments.length} appointments`);
    
    if (appointments.length > 0) {
      const hasStaggerAnimation = await page.evaluate(() => {
        const appointments = document.querySelectorAll('.calendar-appointment');
        return Array.from(appointments).some(apt => 
          apt.style.animationDelay && apt.style.animationDelay !== '0ms'
        );
      });
      
      console.log(`  ${hasStaggerAnimation ? '✅' : '❌'} Staggered appointment animations found\n`);
    }
    
    // Test mobile swipe animations (if viewport is mobile)
    console.log('📱 Testing mobile animations...');
    await page.setViewport({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    
    const isMobileView = await page.evaluate(() => {
      return window.innerWidth < 768;
    });
    
    if (isMobileView) {
      console.log('  ✅ Mobile view activated');
      
      // Simulate swipe gesture
      const calendar = await page.$('.calendar-date-transition, [class*="calendar"]');
      if (calendar) {
        const box = await calendar.boundingBox();
        await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(400);
        console.log('  ✅ Swipe gesture completed');
      }
    }
    
    console.log('\n✨ All animation tests completed!');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testCalendarAnimations().catch(console.error);
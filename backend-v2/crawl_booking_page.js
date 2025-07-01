#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function crawlBookingPage() {
  console.log('🕷️ Crawling booking page to analyze the contradiction...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      slowMo: 500,
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('📋 Step 1: Navigate to login...');
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    console.log('🔐 Step 2: Login...');
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    console.log('📅 Step 3: Navigate to booking page...');
    await page.goto('http://localhost:3000/book');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    console.log('🔧 Step 4: Select first service...');
    const serviceButtons = await page.$$('button');
    if (serviceButtons.length > 0) {
      await serviceButtons[0].click();
      console.log('✅ Service selected');
    }
    
    console.log('📅 Step 5: Wait for calendar and select June 28th...');
    await page.waitForTimeout(2000); // Wait for page to load
    
    // Look for June 28th button and click it
    const june28Button = await page.$('button:has-text("28")') || 
                        await page.$('button[aria-label*="28"]') ||
                        await page.$('button:contains("28")') ||
                        await page.$$eval('button', buttons => 
                          buttons.find(btn => btn.textContent.trim() === '28')
                        );
    
    if (june28Button) {
      await june28Button.click();
      console.log('✅ June 28th selected');
    } else {
      // Try alternative method
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const june28 = buttons.find(btn => btn.textContent.trim() === '28');
        if (june28) june28.click();
      });
      console.log('✅ June 28th selected (alternative method)');
    }
    
    console.log('⏱️ Step 6: Wait for slots to load...');
    await page.waitForTimeout(3000);
    
    console.log('🔍 Step 7: Analyze what\'s displayed...');
    
    // Extract all text related to availability
    const availabilityInfo = await page.evaluate(() => {
      const results = {
        selectedDate: '',
        timeSlotMessages: [],
        errorMessages: [],
        allAvailableText: [],
        apiCallsMade: []
      };
      
      // Get selected date
      const dateHeader = document.querySelector('h2');
      if (dateHeader) {
        results.selectedDate = dateHeader.textContent;
      }
      
      // Find all elements containing "available" or "slot"
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.includes('available') || text.includes('slot') || 
            text.includes('Next') || text.includes('No ')) {
          results.allAvailableText.push({
            text: text,
            parent: node.parentElement.tagName,
            className: node.parentElement.className,
            id: node.parentElement.id
          });
        }
      }
      
      // Look for specific messages
      const timeSlotArea = document.querySelector('[class*="time"], [class*="slot"]');
      if (timeSlotArea) {
        results.timeSlotMessages.push(timeSlotArea.textContent);
      }
      
      // Look for error/info messages
      const errorElements = document.querySelectorAll('[class*="error"], [class*="blue"], [class*="info"]');
      errorElements.forEach(el => {
        if (el.textContent.includes('available') || el.textContent.includes('slot')) {
          results.errorMessages.push(el.textContent.trim());
        }
      });
      
      return results;
    });
    
    console.log('📊 ANALYSIS RESULTS:');
    console.log('='.repeat(60));
    console.log(`📅 Selected Date: ${availabilityInfo.selectedDate}`);
    console.log(`🎯 Current Date: June 28, 2025`);
    
    console.log('\n📝 All "available/slot" text found:');
    availabilityInfo.allAvailableText.forEach((item, i) => {
      console.log(`  ${i + 1}. "${item.text}" (in <${item.parent}> class="${item.className}")`);
    });
    
    console.log('\n🔍 Time Slot Messages:');
    availabilityInfo.timeSlotMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg}`);
    });
    
    console.log('\n⚠️ Error/Info Messages:');
    availabilityInfo.errorMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg}`);
    });
    
    // Make direct API calls to see what data is actually returned
    console.log('\n🌐 Making API calls to check backend data...');
    const apiData = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Call the slots API for June 28th
        const slotsResponse = await fetch('http://localhost:8000/api/v1/bookings/slots?booking_date=2025-06-28', { headers });
        const slotsData = await slotsResponse.json();
        
        // Call next available API
        const nextResponse = await fetch('http://localhost:8000/api/v1/bookings/slots/next-available', { headers });
        const nextData = await nextResponse.json();
        
        return {
          slots: {
            status: slotsResponse.status,
            slotsCount: slotsData.slots ? slotsData.slots.length : 0,
            nextAvailable: slotsData.next_available,
            businessHours: slotsData.business_hours
          },
          nextAvailableGlobal: {
            status: nextResponse.status,
            data: nextData
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n🔌 API Data Analysis:');
    console.log('='.repeat(60));
    if (apiData.error) {
      console.log(`❌ API Error: ${apiData.error}`);
    } else {
      console.log(`📊 Slots for June 28th:`);
      console.log(`   - Number of slots: ${apiData.slots.slotsCount}`);
      console.log(`   - Business hours: ${JSON.stringify(apiData.slots.businessHours)}`);
      console.log(`   - Next available: ${JSON.stringify(apiData.slots.nextAvailable)}`);
      
      console.log(`\n🎯 Global next available:`);
      console.log(`   - Data: ${JSON.stringify(apiData.nextAvailableGlobal.data)}`);
      
      // Analyze the contradiction
      if (apiData.slots.slotsCount === 0 && apiData.slots.nextAvailable) {
        const nextDate = apiData.slots.nextAvailable.date;
        const nextTime = apiData.slots.nextAvailable.time;
        
        console.log(`\n🤔 CONTRADICTION ANALYSIS:`);
        console.log(`   - API says: 0 slots available for June 28th`);
        console.log(`   - API also says: Next available is ${nextDate} at ${nextTime}`);
        
        if (nextDate === '2025-06-28') {
          console.log(`   ❌ LOGICAL ERROR: If next available is TODAY at ${nextTime}, why are there 0 slots?`);
          console.log(`   🔍 This suggests slots are being filtered out incorrectly!`);
        } else {
          console.log(`   ✅ CONSISTENT: Next available is ${nextDate}, not today`);
        }
      }
    }
    
    // Take screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({
      path: '/Users/bossio/6fb-booking/backend-v2/booking-contradiction-analysis.png',
      fullPage: true
    });
    
    console.log('✅ Analysis complete! Screenshot saved.');
    
    // Keep browser open for manual inspection
    console.log('🔍 Keeping browser open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Crawl failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

crawlBookingPage().catch(console.error);
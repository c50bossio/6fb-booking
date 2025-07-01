#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testBookingPageWithoutAuth() {
  console.log('🚀 Testing booking page without authentication...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,    // Run headless
      slowMo: 500,       // Slow down actions
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('📋 Step 1: Navigate directly to booking page...');
    await page.goto('http://localhost:3000/book', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('Page loaded successfully');
    
    // Wait a moment for any dynamic content
    await page.waitForTimeout(3000);
    
    console.log('🔍 Step 2: Analyzing page content for "next available" messages...');
    
    // Look for all text that mentions "available", "slot", or "Next"
    const allRelevantText = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const texts = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.toLowerCase().includes('available') || 
            text.toLowerCase().includes('slot') || 
            text.toLowerCase().includes('next') ||
            text.toLowerCase().includes('june') ||
            text.toLowerCase().includes('july')) {
          texts.push({
            text: text,
            parent: node.parentElement.tagName,
            className: node.parentElement.className,
            id: node.parentElement.id
          });
        }
      }
      return texts;
    });
    
    console.log('📝 All relevant text found:');
    allRelevantText.forEach((item, i) => {
      console.log(`  ${i + 1}. "${item.text}"`);
      console.log(`     In <${item.parent}> class="${item.className}" id="${item.id}"`);
      console.log('');
    });
    
    // Check for specific elements that might contain conflicting dates
    const dateElements = await page.$$eval('*', elements => {
      return elements
        .filter(el => {
          const text = el.textContent || '';
          return text.includes('June') || text.includes('July') || text.includes('available');
        })
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: el.textContent.trim(),
          innerHTML: el.innerHTML
        }))
        .slice(0, 10); // Limit to first 10 matches
    });
    
    console.log('🎯 Elements containing date/availability info:');
    dateElements.forEach((elem, i) => {
      console.log(`  ${i + 1}. <${elem.tagName}> class="${elem.className}" id="${elem.id}"`);
      console.log(`     Text: "${elem.text}"`);
      console.log(`     HTML: "${elem.innerHTML.substring(0, 100)}..."`);
      console.log('');
    });
    
    console.log('📸 Step 3: Taking screenshot...');
    await page.screenshot({
      path: '/Users/bossio/6fb-booking/backend-v2/simple-frontend-test.png',
      fullPage: true
    });
    
    console.log('✅ Test completed! Screenshot saved.');
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testBookingPageWithoutAuth().catch(console.error);
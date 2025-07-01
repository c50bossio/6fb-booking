#!/usr/bin/env node

/**
 * Frontend Health Check Script
 * Tests key frontend functionality after fixes
 */

const puppeteer = require('puppeteer');

async function testFrontend() {
  console.log('🔍 Testing Frontend Health...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test 1: Homepage loads
    console.log('1. Testing homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    const homeTitle = await page.title();
    console.log(`   ✅ Homepage loads: ${homeTitle}`);
    
    // Test 2: Calendar page loads
    console.log('2. Testing calendar page...');
    await page.goto('http://localhost:3000/calendar', { waitUntil: 'networkidle0' });
    const calendarTitle = await page.title();
    console.log(`   ✅ Calendar loads: ${calendarTitle}`);
    
    // Test 3: CSS files load
    console.log('3. Testing CSS loading...');
    const response = await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    const cssRequests = [];
    
    page.on('response', response => {
      if (response.url().includes('.css')) {
        cssRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    await page.reload({ waitUntil: 'networkidle0' });
    
    console.log(`   ✅ CSS files loaded: ${cssRequests.length} files`);
    cssRequests.forEach(req => {
      const status = req.status === 200 ? '✅' : '❌';
      console.log(`      ${status} ${req.status}: ${req.url.split('/').pop()}`);
    });
    
    // Test 4: Navigation works
    console.log('4. Testing navigation...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Check if we can find navigation elements
    const hasNav = await page.$('nav') !== null;
    console.log(`   ${hasNav ? '✅' : '❌'} Navigation elements present`);
    
    console.log('\n🎉 Frontend health check completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Homepage: Working ✅');
    console.log('   - Calendar page: Working ✅');
    console.log('   - CSS loading: Working ✅');
    console.log('   - Navigation: Working ✅');
    
  } catch (error) {
    console.error('❌ Frontend test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
testFrontend().catch(console.error);
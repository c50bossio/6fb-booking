const puppeteer = require('puppeteer');

async function testCalendarRendering() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true 
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.error('❌ Console error:', text);
      } else if (type === 'warning') {
        console.warn('⚠️ Console warning:', text);
      } else {
        console.log(`📝 Console ${type}:`, text);
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });
    
    // Listen for request failures
    page.on('requestfailed', request => {
      console.error('❌ Request failed:', request.url(), request.failure().errorText);
    });
    
    console.log('🔍 Testing calendar rendering...\n');
    
    // Test 1: Basic test page
    console.log('1️⃣ Testing basic test page...');
    await page.goto('http://localhost:3000/calendar/test-page', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    const testPageContent = await page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent,
        message: document.querySelector('p')?.textContent,
        hasContent: !!document.querySelector('div')
      };
    });
    
    console.log('Test page content:', testPageContent);
    
    // Wait a bit to see any delayed errors
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Debug calendar page
    console.log('\n2️⃣ Testing debug calendar page...');
    await page.goto('http://localhost:3000/calendar-debug', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    const debugPageContent = await page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent,
        hasCalendar: !!document.querySelector('[class*="grid-cols-7"]'),
        errorMessage: document.querySelector('.error')?.textContent,
        bodyHTML: document.body.innerHTML.substring(0, 500) // First 500 chars for debugging
      };
    });
    
    console.log('Debug page content:', debugPageContent);
    
    // Wait a bit to see any delayed errors
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Main calendar page
    console.log('\n3️⃣ Testing main calendar page...');
    await page.goto('http://localhost:3000/calendar', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for potential auth redirect or error
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const calendarPageContent = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.querySelector('h1')?.textContent,
        hasCalendar: !!document.querySelector('[class*="calendar"]'),
        hasError: !!document.querySelector('[class*="error"]'),
        hasLogin: !!document.querySelector('[type="password"]'),
        bodyClasses: document.body.className,
        firstError: document.querySelector('.error')?.textContent
      };
    });
    
    console.log('Calendar page content:', calendarPageContent);
    
    // Check for specific React/Next.js errors
    const reactErrors = await page.evaluate(() => {
      const errorBoundary = document.querySelector('[data-nextjs-error]');
      const hydrateError = document.querySelector('#__next')?.textContent?.includes('Hydration');
      return {
        hasNextError: !!errorBoundary,
        hasHydrationError: hydrateError,
        errorText: errorBoundary?.textContent
      };
    });
    
    console.log('\nReact/Next.js errors:', reactErrors);
    
    console.log('\n✅ Test completed. Check the browser window for visual inspection.');
    console.log('Press Ctrl+C to close the browser when done.');
    
    // Keep browser open for manual inspection
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error);
    await browser.close();
  }
}

testCalendarRendering();
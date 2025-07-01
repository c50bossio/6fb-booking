const puppeteer = require('puppeteer');

async function testCalendarWithAuth() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });
    
    console.log('🔐 Step 1: Navigate to login page...\n');
    
    // Go to login page
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for login form to load
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    
    console.log('📝 Step 2: Fill login form...\n');
    
    // Fill in login form
    await page.type('input[type="email"]', 'demo@example.com');
    await page.type('input[type="password"]', 'demo123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    console.log('⏳ Step 3: Wait for authentication...\n');
    
    // Wait for navigation or error
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
    
    // Check if we're logged in
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check for auth token in localStorage
    const hasToken = await page.evaluate(() => {
      return !!localStorage.getItem('token');
    });
    
    console.log(`Has auth token: ${hasToken}`);
    
    if (!hasToken) {
      console.log('❌ Login failed - no auth token found');
      console.log('\n📋 Page content:');
      const pageText = await page.evaluate(() => document.body.textContent);
      console.log(pageText.substring(0, 500));
      
      // Try with test credentials
      console.log('\n🔄 Trying with test credentials...\n');
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      
      await page.evaluate(() => {
        document.querySelector('input[type="email"]').value = '';
        document.querySelector('input[type="password"]').value = '';
      });
      
      await page.type('input[type="email"]', 'test@example.com');
      await page.type('input[type="password"]', 'test123');
      await page.click('button[type="submit"]');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n🗓️ Step 4: Navigate to calendar...\n');
    
    // Navigate to calendar
    await page.goto('http://localhost:3000/calendar', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check calendar page
    const calendarInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        hasToken: !!localStorage.getItem('token'),
        hasCalendarHeader: !!document.querySelector('h1'),
        headerText: document.querySelector('h1')?.textContent,
        hasCalendar: !!document.querySelector('[class*="calendar"]'),
        errors: Array.from(document.querySelectorAll('[class*="error"]')).map(el => el.textContent),
        bodyPreview: document.body.textContent.substring(0, 300)
      };
    });
    
    console.log('📊 Calendar Page Analysis:');
    console.log(JSON.stringify(calendarInfo, null, 2));
    
    // Take screenshot
    await page.screenshot({ 
      path: 'calendar-with-auth-screenshot.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as calendar-with-auth-screenshot.png');
    
    console.log('\n✅ Test completed. Check the browser window.');
    console.log('Press Ctrl+C to close when done.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error);
    await browser.close();
  }
}

testCalendarWithAuth();
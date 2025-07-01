const puppeteer = require('puppeteer');

async function testCalendar() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture all console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(text);
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });
    
    console.log('🔍 Loading calendar page...\n');
    
    // Navigate to calendar
    const response = await page.goto('http://localhost:3000/calendar', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log(`Response status: ${response.status()}`);
    
    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check page content
    const pageInfo = await page.evaluate(() => {
      // Check for auth redirect
      const isLoginPage = window.location.pathname.includes('login');
      
      // Check for calendar elements
      const hasCalendarHeader = !!document.querySelector('h1');
      const headerText = document.querySelector('h1')?.textContent;
      
      // Check for error messages
      const errorElements = Array.from(document.querySelectorAll('[class*="error"], [class*="Error"]'));
      const errors = errorElements.map(el => el.textContent);
      
      // Check for loading states
      const loadingElements = Array.from(document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="skeleton"]'));
      
      // Check body content
      const bodyText = document.body.textContent.substring(0, 500);
      
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        isLoginPage,
        hasCalendarHeader,
        headerText,
        errors,
        hasLoadingElements: loadingElements.length > 0,
        bodyText,
        hasReactRoot: !!document.querySelector('#__next'),
        documentTitle: document.title
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log(JSON.stringify(pageInfo, null, 2));
    
    // Check for specific calendar components
    const calendarComponents = await page.evaluate(() => {
      return {
        hasCalendar: !!document.querySelector('[class*="calendar"]'),
        hasDatePicker: !!document.querySelector('[class*="date"]'),
        hasTimeSlots: !!document.querySelector('[class*="time"]'),
        hasAppointments: !!document.querySelector('[class*="appointment"]'),
        hasButtons: document.querySelectorAll('button').length,
        hasInputs: document.querySelectorAll('input').length
      };
    });
    
    console.log('\n🗓️ Calendar Components:');
    console.log(JSON.stringify(calendarComponents, null, 2));
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'calendar-screenshot.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as calendar-screenshot.png');
    
    console.log('\n✅ Test completed. Check the browser window.');
    console.log('Press Ctrl+C to close when done.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error);
    await browser.close();
  }
}

testCalendar();
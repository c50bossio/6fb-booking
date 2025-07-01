const puppeteer = require('puppeteer');

async function testCalendarDirectAuth() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.error(`❌ [${type}] ${msg.text()}`);
      } else {
        console.log(`[${type}] ${msg.text()}`);
      }
    });
    
    console.log('🔐 Setting up authentication token...\n');
    
    // First navigate to the site to establish localStorage
    await page.goto('http://localhost:3000/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Get a valid token from the API
    const tokenResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'demo@example.com', password: 'demo123' })
    });
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Got auth token from API');
    
    // Set the token in localStorage
    await page.evaluate((token) => {
      localStorage.setItem('token', token.access_token);
      localStorage.setItem('refresh_token', token.refresh_token);
    }, tokenData);
    
    console.log('✅ Token set in localStorage\n');
    
    console.log('🗓️ Navigating to calendar page...\n');
    
    // Now navigate to calendar with auth
    await page.goto('http://localhost:3000/calendar', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for potential React rendering
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Analyze the page
    const pageAnalysis = await page.evaluate(() => {
      // Look for any error boundaries or error messages
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], [role="alert"]');
      const errors = Array.from(errorElements).map(el => ({
        text: el.textContent,
        className: el.className
      }));
      
      // Look for loading states
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="skeleton"], [class*="Skeleton"]');
      
      // Look for calendar elements
      const calendarElements = {
        header: document.querySelector('h1')?.textContent,
        hasCalendar: !!document.querySelector('[class*="calendar"], [class*="Calendar"]'),
        hasGrid: !!document.querySelector('[class*="grid"]'),
        hasButtons: document.querySelectorAll('button').length,
        hasDateElements: !!document.querySelector('[class*="date"], [class*="Date"]'),
        hasTimeElements: !!document.querySelector('[class*="time"], [class*="Time"]')
      };
      
      // Check React root
      const reactRoot = document.querySelector('#__next');
      const hasReactContent = reactRoot && reactRoot.children.length > 0;
      
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        hasToken: !!localStorage.getItem('token'),
        errors,
        loadingCount: loadingElements.length,
        calendarElements,
        hasReactContent,
        bodyText: document.body.textContent.substring(0, 500),
        // Get all class names that might indicate calendar components
        relevantClasses: Array.from(document.querySelectorAll('*'))
          .map(el => el.className)
          .filter(cn => typeof cn === 'string' && (cn.includes('calendar') || cn.includes('Calendar')))
          .slice(0, 10)
      };
    });
    
    console.log('📊 Page Analysis:');
    console.log(JSON.stringify(pageAnalysis, null, 2));
    
    // Check for specific console errors
    console.log('\n🔍 Looking for specific issues...\n');
    
    // Check if any components failed to load
    const componentStatus = await page.evaluate(() => {
      // Try to find specific components
      const components = {
        Calendar: !!window.Calendar,
        CalendarMonthView: !!window.CalendarMonthView,
        CalendarWeekView: !!window.CalendarWeekView,
        CalendarDayView: !!window.CalendarDayView
      };
      
      // Check for hydration errors
      const hydrationError = document.body.textContent.includes('Hydration') || 
                           document.body.textContent.includes('hydration');
      
      return {
        components,
        hydrationError,
        documentReady: document.readyState
      };
    });
    
    console.log('Component Status:');
    console.log(JSON.stringify(componentStatus, null, 2));
    
    // Take screenshot
    await page.screenshot({ 
      path: 'calendar-direct-auth-screenshot.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as calendar-direct-auth-screenshot.png');
    
    // Try to interact with the page
    console.log('\n🖱️ Attempting to interact with calendar...\n');
    
    // Click on view mode buttons if they exist
    const viewButtons = await page.$$('button');
    console.log(`Found ${viewButtons.length} buttons on the page`);
    
    console.log('\n✅ Test completed. Check the browser window.');
    console.log('Press Ctrl+C to close when done.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error);
    await browser.close();
  }
}

testCalendarDirectAuth();
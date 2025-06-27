const puppeteer = require('puppeteer');

async function inspectCalendarPage() {
  console.log('🔍 Starting calendar page inspection...');

  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[Browser ${type.toUpperCase()}]:`, text);
    });

    // Capture errors
    page.on('pageerror', error => {
      console.error('[Page Error]:', error.message);
    });

    // Capture failed requests
    page.on('requestfailed', request => {
      console.error('[Request Failed]:', request.url(), '-', request.failure().errorText);
    });

    // Capture responses
    page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        console.error(`[HTTP ${status}]:`, response.url());
      }
    });

    console.log('📱 Navigating to calendar page with demo mode...');

    // First, navigate to login and enable demo mode
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Set demo mode in session storage
    await page.evaluate(() => {
      sessionStorage.setItem('demo_mode', 'true');
      localStorage.setItem('demo_mode', 'true');
    });

    // Now navigate to calendar
    await page.goto('http://localhost:3000/dashboard/calendar', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for potential redirects
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get current URL after any redirects
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    // Take a screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `/Users/bossio/6fb-booking/calendar-screenshot-${timestamp}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('📸 Screenshot saved to:', screenshotPath);

    // Get page content and state
    const pageState = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
        cookies: document.cookie,
        bodyClasses: document.body.className,
        hasCalendarElements: !!document.querySelector('[class*="calendar"]'),
        hasAuthElements: !!document.querySelector('[class*="auth"], [class*="login"]'),
        visibleText: document.body.innerText.substring(0, 500)
      };
    });

    console.log('\n📋 Page State:', JSON.stringify(pageState, null, 2));

    // Check for specific calendar components
    const calendarCheck = await page.evaluate(() => {
      const checks = {
        calendarContainer: !!document.querySelector('.calendar-container, [id*="calendar"], [class*="calendar"]'),
        fullCalendar: !!document.querySelector('.fc, .fullcalendar'),
        reactBigCalendar: !!document.querySelector('.rbc-calendar'),
        customCalendar: !!document.querySelector('[data-calendar], [data-testid*="calendar"]'),
        appointmentElements: document.querySelectorAll('[class*="appointment"], [class*="event"]').length,
        loadingIndicators: !!document.querySelector('[class*="loading"], [class*="spinner"]'),
        errorMessages: !!document.querySelector('[class*="error"], [role="alert"]')
      };

      return checks;
    });

    console.log('\n🗓️ Calendar Component Check:', JSON.stringify(calendarCheck, null, 2));

    // Get any error messages
    const errorMessages = await page.evaluate(() => {
      const errors = [];
      document.querySelectorAll('[class*="error"], [role="alert"], .error-message').forEach(el => {
        if (el.textContent.trim()) {
          errors.push(el.textContent.trim());
        }
      });
      return errors;
    });

    if (errorMessages.length > 0) {
      console.log('\n❌ Error Messages Found:', errorMessages);
    }

    // Check network activity
    console.log('\n🌐 Checking API calls...');
    await page.evaluate(() => {
      // Override fetch to log API calls
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        console.log('API Call:', args[0]);
        return originalFetch.apply(this, args);
      };
    });

    // Wait a bit more to catch any delayed API calls
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n✅ Inspection complete!');

  } catch (error) {
    console.error('❌ Inspection failed:', error);
  } finally {
    console.log('\n🔚 Closing browser...');
    await browser.close();
  }
}

// Run the inspection
inspectCalendarPage().catch(console.error);

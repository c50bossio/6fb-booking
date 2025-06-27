const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    console.log('1. Navigating to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    console.log('   Current URL:', page.url());

    // Click Sign In
    console.log('\n2. Clicking Sign In...');
    // Try to find and click the Sign In link/button
    const signInLink = await page.$('a[href="/login"]') ||
                      await page.$('button:contains("Sign In")') ||
                      await page.$x("//a[contains(text(), 'Sign In')]")[0];
    if (signInLink) {
      await signInLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
      // Fallback: navigate directly
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    }
    console.log('   Current URL:', page.url());

    // Fill login form
    console.log('\n3. Filling login form...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
    await page.type('input[type="email"], input[name="email"]', 'admin@6fb.com');
    await page.type('input[type="password"], input[name="password"]', 'admin123');

    // Submit login
    console.log('\n4. Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    console.log('   Current URL after login:', page.url());

    // Check if we're on dashboard
    const isDashboard = page.url().includes('/dashboard');
    console.log('   On dashboard?', isDashboard);

    if (isDashboard) {
      // Wait a bit for page to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // First, open the sidebar if it's collapsed
      console.log('\n5. Opening sidebar menu...');
      const menuButton = await page.$('button[aria-label*="menu"]') || await page.$('[data-testid="menu-button"]') || await page.$('svg[class*="menu"]')?.parentElement;
      if (menuButton) {
        await menuButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Look for Calendar link
      console.log('6. Looking for Calendar link...');
      const calendarLink = await page.$('a[href*="calendar"]');
      if (calendarLink) {
        console.log('   Found Calendar link, clicking...');
        await calendarLink.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        console.log('   Current URL after calendar click:', page.url());

        // Check if we stayed authenticated
        const stillOnCalendar = page.url().includes('calendar');
        const redirectedToLogin = page.url().includes('/login');

        console.log('\n6. Authentication test results:');
        console.log('   Still on calendar?', stillOnCalendar);
        console.log('   Redirected to login?', redirectedToLogin);
        console.log('   TEST RESULT:', stillOnCalendar && !redirectedToLogin ? 'PASSED ✓' : 'FAILED ✗');
      } else {
        console.log('   Calendar link not found!');
      }
    } else {
      console.log('   Login failed or redirected elsewhere');
    }

    // Take final screenshot
    await page.screenshot({ path: 'auth-test-result.png' });
    console.log('\nScreenshot saved as auth-test-result.png');

  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'auth-test-error.png' });
  } finally {
    await browser.close();
  }
})();

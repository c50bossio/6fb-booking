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
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('AuthProvider') || text.includes('Route check')) {
        console.log(`Browser [${type}]:`, text);
      }
    });

    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

    // Fill login form
    console.log('2. Logging in...');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', 'admin@6fb.com');
    await page.type('input[type="password"]', 'admin123');

    // Submit login
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    console.log('   Logged in, current URL:', page.url());

    // Wait for auth to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Now navigate directly to calendar
    console.log('\n3. Navigating directly to /dashboard/calendar...');
    await page.goto('http://localhost:3000/dashboard/calendar', { waitUntil: 'networkidle2' });

    // Check final URL
    const finalUrl = page.url();
    console.log('   Final URL:', finalUrl);

    // Check results
    const onCalendar = finalUrl.includes('calendar');
    const onLogin = finalUrl.includes('login');

    console.log('\n4. TEST RESULTS:');
    console.log('   Still on calendar?', onCalendar);
    console.log('   Redirected to login?', onLogin);
    console.log('   AUTH FIX:', onCalendar && !onLogin ? '✅ WORKING!' : '❌ STILL BROKEN');

    // Take screenshot
    await page.screenshot({ path: 'calendar-auth-test.png' });
    console.log('\nScreenshot saved as calendar-auth-test.png');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
})();

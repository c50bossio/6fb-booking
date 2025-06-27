const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3000...');

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to the page
    const response = await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Response status:', response.status());

    // Get page title
    const title = await page.title();
    console.log('Page title:', title);

    // Get page URL (in case of redirects)
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Check if we're on login page
    const isLoginPage = currentUrl.includes('/login');
    console.log('Is login page?', isLoginPage);

    // Get some page content
    const bodyText = await page.evaluate(() => {
      return document.body.innerText.substring(0, 500);
    });
    console.log('\nPage content preview:');
    console.log(bodyText);

    // Check for specific elements
    const hasCalendarLink = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Calendar'));
    });
    console.log('\nHas Calendar link?', hasCalendarLink);

    // Take a screenshot
    await page.screenshot({ path: 'current-page.png' });
    console.log('\nScreenshot saved as current-page.png');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();

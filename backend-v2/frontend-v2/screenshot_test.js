const puppeteer = require('puppeteer');

(async () => {
  console.log('Taking screenshot of calendar page...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/calendar', { waitUntil: 'networkidle0' });
    
    // Wait for page to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    await page.screenshot({ path: 'calendar-current-state.png', fullPage: false });
    console.log('Screenshot saved as calendar-current-state.png');
    
    // Check page content
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasEmailInput: !!document.querySelector('input[type="email"]'),
        buttonCount: document.querySelectorAll('button').length,
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('Page info:', pageInfo);
    
    if (pageInfo.hasEmailInput) {
      console.log('This appears to be a login page - authentication required');
    } else {
      console.log('This appears to be an authenticated page');
      
      // Look for header specifically
      const headerInfo = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (header) {
          return {
            found: true,
            content: header.textContent.substring(0, 200),
            buttonCount: header.querySelectorAll('button').length
          };
        }
        return { found: false };
      });
      
      console.log('Header info:', headerInfo);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
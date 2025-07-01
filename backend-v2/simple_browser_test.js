const puppeteer = require('puppeteer');

async function simpleBrowserTest() {
  console.log('Starting simple browser test...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set up request interception
  await page.setRequestInterception(true);
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api')) {
      console.log(`API Request: ${request.method()} ${url}`);
    }
    request.continue();
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('api')) {
      console.log(`API Response: ${response.status()} ${url}`);
    }
  });
  
  console.log('Navigating to dashboard...');
  try {
    await page.goto('http://localhost:3000/dashboard', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    console.log('Page loaded, waiting for API calls...');
    await page.waitForTimeout(3000);
    
    // Check page state
    const pageContent = await page.evaluate(() => {
      const spinner = document.querySelector('.animate-spin');
      const errorMessage = document.querySelector('[role="alert"]');
      const bodyText = document.body.innerText;
      
      return {
        hasSpinner: !!spinner,
        hasError: !!errorMessage,
        errorText: errorMessage?.innerText || null,
        pageText: bodyText.substring(0, 200)
      };
    });
    
    console.log('\nPage State:');
    console.log('- Loading spinner:', pageContent.hasSpinner ? 'Yes' : 'No');
    console.log('- Error displayed:', pageContent.hasError ? 'Yes' : 'No');
    if (pageContent.errorText) {
      console.log('- Error message:', pageContent.errorText);
    }
    console.log('- Page content preview:', pageContent.pageText);
    
  } catch (error) {
    console.error('Navigation error:', error.message);
  }
  
  await browser.close();
}

simpleBrowserTest().catch(console.error);
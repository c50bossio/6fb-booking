const puppeteer = require('puppeteer');

async function testPagesSimple() {
  console.log('Testing page loading after login...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Track errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push({ type: 'page-error', message: error.message });
  });
  
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('localhost')) {
      errors.push({ 
        type: 'http-error', 
        status: response.status(), 
        url: response.url() 
      });
    }
  });

  const pagesToTest = [
    '/dashboard',
    '/bookings', 
    '/calendar',
    '/analytics',
    '/settings',
    '/admin'
  ];

  try {
    // 1. Login first
    console.log('Logging in...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.waitForSelector('#email', { visible: true });
    await page.type('#email', 'admin.test@bookedbarber.com');
    await page.type('#password', 'AdminTest123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('Logged in:', !!token);
    console.log('Current URL:', page.url());
    console.log('\n');

    // 2. Test each page
    for (const path of pagesToTest) {
      errors.length = 0; // Clear errors
      
      console.log(`\nTesting ${path}...`);
      
      try {
        const response = await page.goto(`http://localhost:3000${path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        
        // Wait a bit for React to render
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const finalUrl = page.url();
        const status = response ? response.status() : 'No response';
        
        // Check if page loaded
        const hasContent = await page.evaluate(() => {
          const body = document.body;
          const h1 = document.querySelector('h1');
          const main = document.querySelector('main');
          return {
            bodyText: body ? body.innerText.slice(0, 100) : 'No body',
            h1Text: h1 ? h1.innerText : 'No h1',
            hasMain: !!main,
            hasError: body.innerText.includes('Error') || body.innerText.includes('error')
          };
        });
        
        console.log(`  Status: ${status}`);
        console.log(`  URL: ${finalUrl}`);
        console.log(`  Redirected: ${!finalUrl.includes(path)}`);
        console.log(`  H1: ${hasContent.h1Text}`);
        console.log(`  Has main content: ${hasContent.hasMain}`);
        console.log(`  Has error text: ${hasContent.hasError}`);
        
        if (errors.length > 0) {
          console.log('  Errors:', errors);
        }
        
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }

    console.log('\n\n=== SUMMARY ===');
    console.log('If pages show "No h1" or redirect to login, there may be:');
    console.log('1. Authentication issues');
    console.log('2. Component import/export errors');
    console.log('3. Missing dependencies');
    console.log('4. API failures');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    console.log('\nBrowser will stay open. Press Ctrl+C to close.');
    await new Promise(() => {});
  }
}

testPagesSimple().catch(console.error);
const puppeteer = require('puppeteer');

async function quickAuthTest() {
  console.log('🚀 Starting quick authentication test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    timeout: 30000
  });
  
  const page = await browser.newPage();
  
  // Monitor console logs
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warn') {
      console.log(`${type.toUpperCase()}: ${msg.text()}`);
    }
  });
  
  try {
    console.log('📱 Navigating to homepage...');
    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('📸 Taking homepage screenshot...');
    await page.screenshot({ path: 'homepage-test.png', fullPage: true });
    
    console.log('🔍 Looking for login links...');
    const loginLinks = await page.$$eval('a', links => 
      links.filter(link => 
        link.textContent.toLowerCase().includes('login') ||
        link.textContent.toLowerCase().includes('sign in') ||
        link.href.includes('/login')
      ).map(link => ({
        text: link.textContent,
        href: link.href
      }))
    );
    
    console.log('🔗 Found login links:', loginLinks);
    
    // Try to navigate to login page
    console.log('🌐 Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    await page.screenshot({ path: 'login-page-test.png', fullPage: true });
    
    console.log('🔍 Looking for login form elements...');
    const formElements = await page.evaluate(() => {
      const emailInputs = document.querySelectorAll('input[type="email"], input[name="email"]');
      const passwordInputs = document.querySelectorAll('input[type="password"], input[name="password"]');
      const submitButtons = document.querySelectorAll('button[type="submit"], button:contains("Login"), button:contains("Sign In")');
      
      return {
        emailInputs: emailInputs.length,
        passwordInputs: passwordInputs.length,
        submitButtons: submitButtons.length,
        title: document.title,
        url: window.location.href
      };
    });
    
    console.log('📝 Form elements found:', formElements);
    
    if (formElements.emailInputs > 0 && formElements.passwordInputs > 0) {
      console.log('✅ Login form detected - proceeding with login test');
      
      // Fill and submit login form
      await page.type('input[type="email"], input[name="email"]', 'test_claude@example.com');
      await page.type('input[type="password"], input[name="password"]', 'testpassword123');
      
      console.log('🔄 Submitting login form...');
      await page.click('button[type="submit"]');
      
      // Wait for navigation or response
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log('📍 After login URL:', currentUrl);
      
      await page.screenshot({ path: 'after-login-test.png', fullPage: true });
      
      // Check for tokens in storage
      const storage = await page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage).reduce((acc, key) => {
            acc[key] = localStorage.getItem(key);
            return acc;
          }, {}),
          sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
            acc[key] = sessionStorage.getItem(key);
            return acc;
          }, {})
        };
      });
      
      console.log('💾 Storage contents:', storage);
      
      console.log('✅ Authentication test completed successfully!');
    } else {
      console.log('❌ Login form not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-test.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

quickAuthTest().catch(console.error);
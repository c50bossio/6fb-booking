const puppeteer = require('puppeteer');

async function finalAuthTest() {
  console.log('🚀 Starting final comprehensive authentication test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    timeout: 30000
  });
  
  const page = await browser.newPage();
  
  // Monitor all network requests for auth-related calls
  page.on('request', request => {
    if (request.url().includes('auth') || request.url().includes('login')) {
      console.log(`📡 AUTH REQUEST: ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`📦 POST DATA: ${request.postData()}`);
      }
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('auth') || response.url().includes('login')) {
      console.log(`📨 AUTH RESPONSE: ${response.status()} ${response.url()}`);
    }
  });
  
  // Monitor console logs for authentication feedback
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
    } else if (text.includes('login') || text.includes('auth') || text.includes('token')) {
      console.log(`📝 Auth Log: ${text}`);
    }
  });
  
  try {
    console.log('\n🌐 Step 1: Navigate to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('📸 Taking login page screenshot...');
    await page.screenshot({ path: 'test-login-page.png', fullPage: true });
    
    console.log('\n🔍 Step 2: Check form elements...');
    const formInfo = await page.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"], input[name="email"]');
      const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
      const submitButton = document.querySelector('button[type="submit"]');
      
      return {
        emailInputExists: !!emailInput,
        passwordInputExists: !!passwordInput,
        submitButtonExists: !!submitButton,
        submitButtonText: submitButton ? submitButton.textContent : 'Not found'
      };
    });
    
    console.log('📝 Form info:', formInfo);
    
    if (!formInfo.emailInputExists || !formInfo.passwordInputExists || !formInfo.submitButtonExists) {
      throw new Error('Required form elements not found');
    }
    
    console.log('\n🔄 Step 3: Fill and submit login form...');
    await page.type('input[type="email"]', 'test_claude@example.com');
    await page.type('input[type="password"]', 'testpassword123');
    
    console.log('📸 Form filled screenshot...');
    await page.screenshot({ path: 'test-form-filled.png', fullPage: true });
    
    // Click submit and wait for navigation or response
    console.log('🚀 Submitting form...');
    await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('auth') && response.status() === 200, 
        { timeout: 10000 }
      ).catch(() => null),
      page.click('button[type="submit"]')
    ]);
    
    // Wait a bit more for the response to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🔍 Step 4: Check authentication state...');
    const authState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        localStorage: Object.keys(localStorage).reduce((acc, key) => {
          acc[key] = localStorage.getItem(key) ? 'Present' : 'Missing';
          return acc;
        }, {}),
        sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
          acc[key] = sessionStorage.getItem(key) ? 'Present' : 'Missing';
          return acc;
        }, {}),
        hasToken: !!(localStorage.getItem('token') || localStorage.getItem('authToken') || 
                     localStorage.getItem('access_token') || sessionStorage.getItem('token') || 
                     sessionStorage.getItem('authToken') || sessionStorage.getItem('access_token'))
      };
    });
    
    console.log('📍 Authentication state:', authState);
    
    console.log('📸 After submission screenshot...');
    await page.screenshot({ path: 'test-after-submission.png', fullPage: true });
    
    if (authState.hasToken) {
      console.log('✅ Authentication successful - token found!');
      
      console.log('\n🔄 Step 5: Test protected route access...');
      await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      const dashboardState = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title
      }));
      
      console.log('📍 Dashboard state:', dashboardState);
      
      if (dashboardState.url.includes('/dashboard')) {
        console.log('✅ Protected route accessible!');
        
        console.log('📸 Dashboard screenshot...');
        await page.screenshot({ path: 'test-dashboard.png', fullPage: true });
        
        console.log('\n🔄 Step 6: Test token persistence...');
        await page.reload({ waitUntil: 'domcontentloaded' });
        
        const afterReloadState = await page.evaluate(() => ({
          url: window.location.href,
          hasToken: !!(localStorage.getItem('token') || localStorage.getItem('authToken') || 
                       localStorage.getItem('access_token') || sessionStorage.getItem('token') || 
                       sessionStorage.getItem('authToken') || sessionStorage.getItem('access_token'))
        }));
        
        console.log('📍 After reload state:', afterReloadState);
        
        if (afterReloadState.hasToken && afterReloadState.url.includes('/dashboard')) {
          console.log('✅ Token persistence verified!');
        } else {
          console.log('❌ Token lost after page reload');
        }
        
      } else {
        console.log('❌ Redirected away from dashboard - authentication may have failed');
      }
      
    } else {
      console.log('❌ Authentication failed - no token found');
    }
    
    console.log('\n🎉 Authentication test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  } finally {
    console.log('\n⏹️  Closing browser...');
    await browser.close();
  }
}

finalAuthTest().catch(console.error);
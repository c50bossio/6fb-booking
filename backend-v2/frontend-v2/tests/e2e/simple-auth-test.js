const puppeteer = require('puppeteer');

async function simpleAuthTest() {
  console.log('🚀 Starting simple authentication test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    timeout: 30000
  });
  
  const page = await browser.newPage();
  
  // Monitor console logs and errors
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    } else if (type === 'warn') {
      console.log(`⚠️  Console Warning: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
  });
  
  try {
    console.log('🌐 Step 1: Navigate to homepage...');
    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('📸 Taking homepage screenshot...');
    await page.screenshot({ path: 'homepage-test.png', fullPage: true });
    
    console.log('🔍 Step 2: Navigate to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('📸 Taking login page screenshot...');
    await page.screenshot({ path: 'login-page-test.png', fullPage: true });
    
    console.log('🔍 Step 3: Check login form...');
    const pageInfo = await page.evaluate(() => {
      const emailInputs = document.querySelectorAll('input[type="email"], input[name="email"]');
      const passwordInputs = document.querySelectorAll('input[type="password"], input[name="password"]');
      const submitButtons = document.querySelectorAll('button[type="submit"]');
      const allButtons = document.querySelectorAll('button');
      
      return {
        title: document.title,
        url: window.location.href,
        emailInputs: emailInputs.length,
        passwordInputs: passwordInputs.length,
        submitButtons: submitButtons.length,
        allButtons: allButtons.length,
        buttonTexts: Array.from(allButtons).map(btn => btn.textContent || btn.innerText).slice(0, 5)
      };
    });
    
    console.log('📝 Login page info:', pageInfo);
    
    if (pageInfo.emailInputs > 0 && pageInfo.passwordInputs > 0) {
      console.log('✅ Login form found - proceeding with login test');
      
      console.log('🔄 Step 4: Fill login form...');
      await page.type('input[type="email"], input[name="email"]', 'test_claude@example.com');
      await page.type('input[type="password"], input[name="password"]', 'testpassword123');
      
      console.log('📸 Form filled screenshot...');
      await page.screenshot({ path: 'form-filled-test.png', fullPage: true });
      
      console.log('🔄 Step 5: Submit login form...');
      await page.click('button[type="submit"]');
      
      // Wait for navigation or response
      console.log('⏳ Waiting for response...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const afterLoginInfo = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          localStorage: Object.keys(localStorage).length,
          sessionStorage: Object.keys(sessionStorage).length,
          hasToken: !!(localStorage.getItem('token') || localStorage.getItem('authToken') || 
                       localStorage.getItem('access_token') || sessionStorage.getItem('token') || 
                       sessionStorage.getItem('authToken') || sessionStorage.getItem('access_token'))
        };
      });
      
      console.log('📍 After login info:', afterLoginInfo);
      
      console.log('📸 After login screenshot...');
      await page.screenshot({ path: 'after-login-test.png', fullPage: true });
      
      if (afterLoginInfo.hasToken) {
        console.log('✅ Authentication token found in storage!');
        
        console.log('🔄 Step 6: Test protected route navigation...');
        await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        const dashboardInfo = await page.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title
          };
        });
        
        console.log('📍 Dashboard info:', dashboardInfo);
        
        if (dashboardInfo.url.includes('/dashboard')) {
          console.log('✅ Successfully accessed protected route!');
        } else {
          console.log('❌ Redirected away from dashboard - authentication may have failed');
        }
        
        console.log('📸 Dashboard screenshot...');
        await page.screenshot({ path: 'dashboard-test.png', fullPage: true });
        
        console.log('🔄 Step 7: Test page refresh (token persistence)...');
        await page.reload({ waitUntil: 'domcontentloaded' });
        
        const afterRefreshInfo = await page.evaluate(() => {
          return {
            url: window.location.href,
            hasToken: !!(localStorage.getItem('token') || localStorage.getItem('authToken') || 
                         localStorage.getItem('access_token') || sessionStorage.getItem('token') || 
                         sessionStorage.getItem('authToken') || sessionStorage.getItem('access_token'))
          };
        });
        
        console.log('📍 After refresh info:', afterRefreshInfo);
        
        if (afterRefreshInfo.hasToken && afterRefreshInfo.url.includes('/dashboard')) {
          console.log('✅ Token persisted after refresh!');
        } else {
          console.log('❌ Token or session lost after refresh');
        }
        
      } else {
        console.log('❌ No authentication token found after login');
      }
      
    } else {
      console.log('❌ Login form not found on page');
    }
    
    console.log('🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-test.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

simpleAuthTest().catch(console.error);
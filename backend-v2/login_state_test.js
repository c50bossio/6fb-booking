const puppeteer = require('puppeteer');

async function testLoginState() {
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  console.log('🔍 TESTING LOGIN STATE PERSISTENCE...\n');
  
  try {
    // Step 1: Navigate to login
    console.log('1️⃣ Going to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Step 2: Check current auth state
    console.log('2️⃣ Checking initial auth state...');
    
    const initialState = await page.evaluate(() => {
      return {
        cookies: document.cookie,
        localStorage: Object.keys(localStorage).map(key => ({ key, value: localStorage[key] })),
        sessionStorage: Object.keys(sessionStorage).map(key => ({ key, value: sessionStorage[key] }))
      };
    });
    
    console.log('📊 Initial state:', {
      cookieCount: initialState.cookies.split(';').length,
      localStorageCount: initialState.localStorage.length,
      sessionStorageCount: initialState.sessionStorage.length
    });
    
    // Step 3: Login
    console.log('3️⃣ Performing login...');
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait a moment for login to process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Check auth state after login
    console.log('4️⃣ Checking auth state after login...');
    
    const postLoginState = await page.evaluate(() => {
      return {
        url: window.location.href,
        cookies: document.cookie,
        localStorage: Object.keys(localStorage).map(key => ({ key, value: localStorage[key] })),
        sessionStorage: Object.keys(sessionStorage).map(key => ({ key, value: sessionStorage[key] }))
      };
    });
    
    console.log('📊 Post-login state:', {
      url: postLoginState.url,
      cookieCount: postLoginState.cookies.split(';').filter(c => c.trim()).length,
      localStorageCount: postLoginState.localStorage.length,
      sessionStorageCount: postLoginState.sessionStorage.length
    });
    
    // Check for auth cookies specifically
    const authCookies = postLoginState.cookies.split(';')
      .map(c => c.trim())
      .filter(c => c.includes('access_token') || c.includes('refresh_token') || c.includes('csrf_token'));
    
    console.log('🍪 Auth cookies found:', authCookies.length);
    authCookies.forEach(cookie => console.log(`   ${cookie.substring(0, 50)}...`));
    
    // Step 5: Try to access dashboard directly
    console.log('5️⃣ Testing dashboard access...');
    
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
    
    const dashboardState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasError: !!document.querySelector('.error, [role="alert"]'),
        bodyText: document.body.textContent.substring(0, 200)
      };
    });
    
    console.log('🏠 Dashboard result:', dashboardState);
    
    if (dashboardState.url.includes('/dashboard')) {
      console.log('✅ SUCCESS! Login and dashboard access working!');
      console.log('\n🎉 WORKING CREDENTIALS:');
      console.log('   Email: admin@bookedbarber.com');
      console.log('   Password: admin123');
      console.log('   Login URL: http://localhost:3000/login');
    } else {
      console.log('❌ Dashboard access failed - authentication not persisting');
    }
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
  
  console.log('\n🔍 Browser staying open for manual testing...');
  // Keep browser open for manual verification
}

testLoginState();
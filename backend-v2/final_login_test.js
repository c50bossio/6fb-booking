const puppeteer = require('puppeteer');

async function finalLoginTest() {
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  // Monitor for auth loops
  let authRequestCount = 0;
  
  page.on('request', request => {
    if (request.url().includes('/api/v2/auth/')) {
      authRequestCount++;
      console.log(`🔑 AUTH REQUEST #${authRequestCount}: ${request.method()} ${request.url()}`);
      
      if (authRequestCount > 10) {
        console.log('🚨 STOPPING - Too many auth requests detected (infinite loop)');
        process.exit(1);
      }
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/v2/auth/')) {
      console.log(`🔓 AUTH RESPONSE: ${response.status()} ${response.url()}`);
    }
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`💥 JS ERROR: ${msg.text()}`);
    }
  });
  
  try {
    console.log('🎯 FINAL LOGIN TEST - Testing auth loop fix...');
    
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 10000 });
    
    console.log(`2️⃣ Page loaded with ${authRequestCount} auth requests`);
    
    if (authRequestCount > 5) {
      console.log('❌ STILL TOO MANY AUTH REQUESTS - Auth loop not fully fixed');
      return false;
    }
    
    console.log('3️⃣ Filling login form...');
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    
    console.log('4️⃣ Submitting login...');
    const beforeSubmitRequests = authRequestCount;
    
    await page.click('button[type="submit"]');
    
    console.log('5️⃣ Waiting for login result...');
    
    await page.waitForFunction(
      () => {
        return window.location.pathname.includes('/dashboard') || 
               document.querySelector('.text-red-500') !== null;
      },
      { timeout: 8000 }
    );
    
    const currentUrl = page.url();
    const afterSubmitRequests = authRequestCount;
    
    console.log(`6️⃣ Final URL: ${currentUrl}`);
    console.log(`📊 Total auth requests: ${afterSubmitRequests} (${afterSubmitRequests - beforeSubmitRequests} during login)`);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ SUCCESS! Login works correctly!');
      console.log('🎉 Admin credentials: admin@bookedbarber.com / admin123');
      return true;
    } else {
      console.log('❌ Login failed - still on login page');
      
      const errors = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.text-red-500, [role="alert"]'))
                    .map(el => el.textContent.trim())
                    .filter(text => text);
      });
      
      if (errors.length > 0) {
        console.log('🚨 Error messages:', errors);
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return false;
  } finally {
    console.log('\n🔍 Browser staying open for manual verification...');
    // await browser.close();
  }
}

finalLoginTest();
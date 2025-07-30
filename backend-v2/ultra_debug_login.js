const puppeteer = require('puppeteer');

async function ultraDebugLogin() {
  console.log('🚀 Starting ULTRA DEEP LOGIN DEBUGGING...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    slowMo: 100
  });
  
  const page = await browser.newPage();
  
  // Capture EVERYTHING
  const errors = [];
  const consoleMessages = [];
  const networkRequests = [];
  const networkResponses = [];
  
  // Console logging
  page.on('console', msg => {
    const message = `${msg.type()}: ${msg.text()}`;
    consoleMessages.push(message);
    console.log(`🖥️  CONSOLE [${msg.type()}]: ${msg.text()}`);
  });
  
  // Error logging
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`💥 PAGE ERROR: ${error.message}`);
  });
  
  // Request logging
  page.on('request', request => {
    const req = {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      timestamp: Date.now()
    };
    networkRequests.push(req);
    
    if (request.url().includes('api/') || request.url().includes('localhost')) {
      console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
    }
  });
  
  // Response logging
  page.on('response', response => {
    const res = {
      url: response.url(),
      status: response.status(),
      headers: response.headers(),
      timestamp: Date.now()
    };
    networkResponses.push(res);
    
    if (response.url().includes('api/') || response.url().includes('localhost')) {
      console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
      
      if (response.status() >= 400) {
        console.log(`🚨 ERROR RESPONSE: ${response.status()} ${response.url()}`);
      }
    }
  });
  
  // Request failed
  page.on('requestfailed', request => {
    console.log(`❌ REQUEST FAILED: ${request.failure().errorText} ${request.url()}`);
  });
  
  try {
    console.log('\n1️⃣ PHASE 1: Navigation to login page...');
    
    const startTime = Date.now();
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    console.log(`✅ Page loaded in ${Date.now() - startTime}ms`);
    
    console.log('\n2️⃣ PHASE 2: Waiting for page to stabilize...');
    
    // Wait for auth checks to complete
    await page.waitForFunction(
      () => {
        const authLoading = document.querySelector('[data-testid="auth-loading"]');
        const emailField = document.querySelector('#email');
        return !authLoading && emailField;
      },
      { timeout: 10000 }
    ).catch(() => {
      console.log('⚠️  Page didn\'t stabilize completely, continuing...');
    });
    
    console.log('\n3️⃣ PHASE 3: Checking page state...');
    
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        title: document.title,
        emailFieldExists: !!document.querySelector('#email'),
        passwordFieldExists: !!document.querySelector('#password'),
        submitButtonExists: !!document.querySelector('button[type="submit"]'),
        errorMessages: Array.from(document.querySelectorAll('.text-red-500, [role="alert"]')).map(el => el.textContent),
        bodyHTML: document.body.innerHTML.length > 0
      };
    });
    
    console.log('📊 PAGE STATE:', JSON.stringify(pageState, null, 2));
    
    if (!pageState.emailFieldExists) {
      console.log('❌ EMAIL FIELD NOT FOUND - LOGIN FORM NOT LOADING');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'login_debug_no_form.png', fullPage: true });
      console.log('📸 Screenshot saved: login_debug_no_form.png');
      
      // Check what's actually on the page
      const bodyText = await page.evaluate(() => document.body.textContent);
      console.log('📄 BODY TEXT:', bodyText.substring(0, 500) + '...');
      
      return false;
    }
    
    console.log('\n4️⃣ PHASE 4: Testing login form...');
    
    await page.type('#email', 'admin@bookedbarber.com', { delay: 50 });
    await page.type('#password', 'admin123', { delay: 50 });
    
    console.log('✅ Credentials entered');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'before_submit.png' });
    console.log('📸 Screenshot before submit: before_submit.png');
    
    console.log('🔄 Clicking submit button...');
    await page.click('button[type="submit"]');
    
    console.log('\n5️⃣ PHASE 5: Waiting for login result...');
    
    // Wait for either success or failure
    const result = await page.waitForFunction(
      () => {
        return window.location.pathname === '/dashboard' || 
               window.location.pathname.includes('dashboard') ||
               document.querySelector('.text-red-500') !== null ||
               document.querySelector('[role="alert"]') !== null;
      },
      { timeout: 10000 }
    ).then(() => 'completed').catch(() => 'timeout');
    
    const finalState = await page.evaluate(() => {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        errorMessages: Array.from(document.querySelectorAll('.text-red-500, [role="alert"]')).map(el => el.textContent.trim()).filter(t => t)
      };
    });
    
    console.log('\n🎯 FINAL RESULT:', JSON.stringify(finalState, null, 2));
    
    if (finalState.pathname.includes('dashboard')) {
      console.log('✅ LOGIN SUCCESS! Redirected to dashboard');
      return true;
    } else if (finalState.errorMessages.length > 0) {
      console.log('❌ LOGIN FAILED with errors:', finalState.errorMessages);
      return false;
    } else {
      console.log('⏰ LOGIN TIMEOUT - no clear success or failure');
      
      // Take final screenshot
      await page.screenshot({ path: 'login_timeout.png', fullPage: true });
      console.log('📸 Timeout screenshot: login_timeout.png');
      
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error.message);
    
    // Take error screenshot
    await page.screenshot({ path: 'login_crash.png', fullPage: true });
    console.log('📸 Crash screenshot: login_crash.png');
    
    return false;
    
  } finally {
    console.log('\n📋 DEBUGGING SUMMARY:');
    console.log(`- Console messages: ${consoleMessages.length}`);
    console.log(`- JavaScript errors: ${errors.length}`);
    console.log(`- Network requests: ${networkRequests.length}`);
    console.log(`- Network responses: ${networkResponses.length}`);
    
    if (errors.length > 0) {
      console.log('\n🚨 JAVASCRIPT ERRORS:');
      errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }
    
    // Log failed requests
    const failedRequests = networkResponses.filter(r => r.status >= 400);
    if (failedRequests.length > 0) {
      console.log('\n🚨 FAILED REQUESTS:');
      failedRequests.forEach((req, i) => console.log(`${i + 1}. ${req.status} ${req.url}`));
    }
    
    console.log('\n🔍 Browser staying open for manual inspection...');
    console.log('Press Ctrl+C to close when ready.');
    
    // Don't close browser automatically
    // await browser.close();
  }
}

ultraDebugLogin().catch(console.error);
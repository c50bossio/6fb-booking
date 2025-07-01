const puppeteer = require('puppeteer');

async function debugAPICalls() {
  console.log('🔍 Debugging API calls from frontend...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Intercept API calls
  const apiCalls = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('localhost:8000') || url.includes('/api/')) {
      const call = {
        url: url,
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      };
      apiCalls.push(call);
      console.log(`🌐 API Request: ${call.method} ${call.url}`);
      console.log('   Headers:', JSON.stringify(call.headers.authorization || 'No auth header'));
    }
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('localhost:8000') || url.includes('/api/')) {
      console.log(`📥 API Response: ${response.status()} ${url}`);
      
      // Find matching request
      const matchingCall = apiCalls.find(call => call.url === url);
      if (matchingCall) {
        matchingCall.responseStatus = response.status();
        matchingCall.responseHeaders = response.headers();
      }
    }
  });
  
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.includes('localhost:8000') || url.includes('/api/')) {
      console.log(`❌ API Request Failed: ${url}`);
      console.log(`   Failure: ${request.failure()?.errorText}`);
    }
  });
  
  // Console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  try {
    console.log('--- Loading Dashboard (protected route) ---\n');
    await page.goto('http://localhost:3000/dashboard', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Wait to see if any API calls are made
    await page.waitForTimeout(3000);
    
    console.log('\n--- Summary of API Calls ---');
    console.log(`Total API calls made: ${apiCalls.length}`);
    
    apiCalls.forEach((call, i) => {
      console.log(`\nCall ${i + 1}:`);
      console.log(`  URL: ${call.url}`);
      console.log(`  Method: ${call.method}`);
      console.log(`  Auth Header: ${call.headers.authorization || 'None'}`);
      console.log(`  Response Status: ${call.responseStatus || 'No response'}`);
    });
    
    // Check if loading spinner is still present
    const hasSpinner = await page.evaluate(() => {
      return !!document.querySelector('.animate-spin');
    });
    console.log(`\nLoading spinner still visible: ${hasSpinner}`);
    
    // Check localStorage
    const localStorage = await page.evaluate(() => {
      return {
        token: window.localStorage.getItem('token'),
        refresh_token: window.localStorage.getItem('refresh_token'),
        theme: window.localStorage.getItem('6fb-theme')
      };
    });
    console.log('\nLocalStorage contents:');
    console.log(`  token: ${localStorage.token ? 'Present' : 'Missing'}`);
    console.log(`  refresh_token: ${localStorage.refresh_token ? 'Present' : 'Missing'}`);
    console.log(`  theme: ${localStorage.theme || 'Not set'}`);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-api-calls.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n✅ Debug complete. Browser remains open for inspection.');
  console.log('Check the Network tab in DevTools for more details.');
  console.log('Press Ctrl+C to exit.');
}

debugAPICalls().catch(console.error);
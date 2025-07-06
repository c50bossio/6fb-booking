const puppeteer = require('puppeteer');

async function testLoginAPI() {
  console.log('🔍 Login API Test\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true  // Open DevTools
  });
  
  const page = await browser.newPage();
  
  // Enable request interception
  await page.setRequestInterception(true);
  
  const apiCalls = [];
  
  // Monitor all requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/') || url.includes('login')) {
      console.log(`➡️  Request: ${request.method()} ${url}`);
      apiCalls.push({
        method: request.method(),
        url: url,
        headers: request.headers(),
        postData: request.postData()
      });
    }
    request.continue();
  });
  
  // Monitor all responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/') || (url.includes('login') && response.status() !== 200)) {
      console.log(`⬅️  Response: ${url} - Status: ${response.status()}`);
      
      if (response.status() !== 200) {
        try {
          const text = await response.text();
          console.log('Response body:', text.substring(0, 500));
        } catch (e) {}
      }
    }
  });
  
  // Log console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console error:', msg.text());
    }
  });
  
  try {
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Close cookie banner
    try {
      await page.click('button:has-text("Accept All")', { timeout: 1000 });
    } catch (e) {}
    
    console.log('\n2. Filling form...');
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    
    console.log('\n3. Submitting form...');
    
    // Clear previous API calls
    apiCalls.length = 0;
    
    await page.click('button[type="submit"]');
    
    // Wait for API call
    console.log('\n4. Waiting for API response...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check API calls
    console.log('\n📊 API Calls Summary:');
    console.log('Total API calls:', apiCalls.length);
    
    apiCalls.forEach((call, i) => {
      console.log(`\nCall ${i + 1}:`);
      console.log('Method:', call.method);
      console.log('URL:', call.url);
      if (call.postData) {
        console.log('Post data:', call.postData);
      }
    });
    
    // Check current state
    const currentUrl = page.url();
    console.log('\nCurrent URL:', currentUrl);
    
    // Check localStorage for auth token
    const authCheck = await page.evaluate(() => {
      return {
        hasToken: !!localStorage.getItem('token'),
        hasRefreshToken: !!localStorage.getItem('refresh_token'),
        allKeys: Object.keys(localStorage)
      };
    });
    
    console.log('\n🔐 Auth Storage:');
    console.log('Has token:', authCheck.hasToken);
    console.log('Has refresh token:', authCheck.hasRefreshToken);
    console.log('All localStorage keys:', authCheck.allKeys);
    
    // If no API call was made, check why
    if (apiCalls.length === 0) {
      console.log('\n⚠️  No API calls detected!');
      
      // Check form validation
      const validation = await page.evaluate(() => {
        const form = document.querySelector('form');
        const emailInput = document.querySelector('#email');
        const passwordInput = document.querySelector('#password');
        
        return {
          formExists: !!form,
          formAction: form?.getAttribute('action'),
          emailValid: emailInput?.checkValidity(),
          passwordValid: passwordInput?.checkValidity(),
          formValid: form?.checkValidity()
        };
      });
      
      console.log('\nForm validation:');
      console.log('Form exists:', validation.formExists);
      console.log('Form action:', validation.formAction);
      console.log('Email valid:', validation.emailValid);
      console.log('Password valid:', validation.passwordValid);
      console.log('Form valid:', validation.formValid);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\nTest complete. Browser will remain open for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

testLoginAPI().catch(console.error);
const puppeteer = require('puppeteer');

async function directAPITest() {
  console.log('🚀 Testing API call directly...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  // Monitor all network requests
  page.on('request', request => {
    console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
    if (request.postData()) {
      console.log(`📦 POST DATA: ${request.postData()}`);
    }
  });
  
  page.on('response', response => {
    console.log(`📨 RESPONSE: ${response.status()} ${response.url()}`);
  });
  
  // Monitor console logs
  page.on('console', msg => {
    const type = msg.type();
    console.log(`${type.toUpperCase()}: ${msg.text()}`);
  });
  
  try {
    await page.goto('http://localhost:3001');
    
    // Test API call directly in browser console
    const result = await page.evaluate(async () => {
      try {
        console.log('Testing API call...');
        const response = await fetch('http://localhost:8002/api/v2/auth/login-simple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test_claude@example.com',
            password: 'testpassword123'
          })
        });
        
        const data = await response.json();
        console.log('API Response:', data);
        
        return {
          status: response.status,
          success: response.ok,
          data: data
        };
      } catch (error) {
        console.error('API Error:', error);
        return {
          error: error.message
        };
      }
    });
    
    console.log('🎯 Direct API Test Result:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

directAPITest().catch(console.error);
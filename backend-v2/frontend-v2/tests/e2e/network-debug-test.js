const puppeteer = require('puppeteer');

async function networkDebugTest() {
  console.log('🚀 Starting network debug test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    timeout: 30000
  });
  
  const page = await browser.newPage();
  
  // Monitor all network requests
  page.on('request', request => {
    if (request.url().includes('auth') || request.url().includes('login')) {
      console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`📦 POST DATA: ${request.postData()}`);
      }
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('auth') || response.url().includes('login')) {
      console.log(`📨 RESPONSE: ${response.status()} ${response.url()}`);
    }
  });
  
  // Monitor console logs and errors
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warn' && text.includes('auth')) {
      console.log(`⚠️  Console Warning: ${text}`);
    } else if (text.includes('login') || text.includes('auth')) {
      console.log(`📝 Console: ${text}`);
    }
  });
  
  try {
    console.log('🌐 Navigate to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('🔍 Fill login form...');
    await page.type('input[type="email"]', 'test_claude@example.com');
    await page.type('input[type="password"]', 'testpassword123');
    
    console.log('🔄 Submit login form and monitor network...');
    await page.click('button[type="submit"]');
    
    // Wait longer to see network activity
    console.log('⏳ Waiting for network activity...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const finalInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        localStorage: Object.keys(localStorage).reduce((acc, key) => {
          acc[key] = localStorage.getItem(key);
          return acc;
        }, {}),
        sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
          acc[key] = sessionStorage.getItem(key);
          return acc;
        }, {}),
        hasToken: !!(localStorage.getItem('token') || localStorage.getItem('authToken') || 
                     localStorage.getItem('access_token') || sessionStorage.getItem('token') || 
                     sessionStorage.getItem('authToken') || sessionStorage.getItem('access_token'))
      };
    });
    
    console.log('📍 Final state:', finalInfo);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

networkDebugTest().catch(console.error);
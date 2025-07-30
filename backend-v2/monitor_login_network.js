const puppeteer = require('puppeteer');

async function monitorLoginNetwork() {
  console.log('🔍 Monitoring login network requests...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Monitor all network requests
  page.on('request', (request) => {
    const url = request.url();
    const method = request.method();
    if (url.includes('api') || url.includes('login') || url.includes('auth')) {
      console.log(`🌐 REQUEST: ${method} ${url}`);
      if (method === 'POST') {
        console.log(`   Headers: ${JSON.stringify(request.headers(), null, 2)}`);
      }
    }
  });
  
  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();
    if (url.includes('api') || url.includes('login') || url.includes('auth')) {
      console.log(`📡 RESPONSE: ${status} ${url}`);
      
      // Check for Set-Cookie headers
      const headers = response.headers();
      if (headers['set-cookie']) {
        console.log(`   Set-Cookie: ${headers['set-cookie']}`);
      }
    }
  });
  
  try {
    console.log('1️⃣ Going to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    console.log('2️⃣ Filling login form...');
    await page.waitForSelector('#email');
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    
    console.log('3️⃣ Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for network activity
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('4️⃣ Current page state:');
    const currentUrl = page.url();
    console.log(`   URL: ${currentUrl}`);
    
    // Check cookies
    const cookies = await page.cookies();
    console.log(`   Cookies: ${cookies.length} total`);
    cookies.forEach(cookie => {
      console.log(`     ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
    });
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
  
  console.log('\n🔍 Browser staying open for manual inspection...');
  // Keep browser open for manual debugging
}

monitorLoginNetwork();
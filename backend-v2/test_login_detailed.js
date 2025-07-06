const puppeteer = require('puppeteer');

async function testLoginDetailed() {
  console.log('🔍 Detailed Login Test\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    
    // Show important logs immediately
    if (text.includes('Login') || text.includes('login') || text.includes('error') || text.includes('Error')) {
      console.log(`Console [${msg.type()}]: ${text}`);
    }
  });
  
  // Monitor network
  await page.setRequestInterception(true);
  
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`\n➡️  API Request:`, {
        method: request.method(),
        url: request.url(),
        headers: request.headers()
      });
    }
    request.continue();
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log(`\n⬅️  API Response:`, {
        status: response.status(),
        url: response.url(),
        headers: response.headers()
      });
      
      try {
        const body = await response.text();
        console.log('Response body:', body.substring(0, 200));
      } catch (e) {}
    }
  });
  
  try {
    console.log('1. Navigate to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Accept cookies
    try {
      await page.click('button:has-text("Accept All")', { timeout: 1000 });
    } catch (e) {}
    
    console.log('\n2. Fill form and submit...');
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    
    // Clear console logs before submit
    consoleLogs.length = 0;
    
    // Click submit and wait
    await page.click('button[type="submit"]');
    
    console.log('\n3. Waiting for response...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Report all console logs
    console.log('\n📋 All Console Logs:');
    consoleLogs.forEach(log => {
      console.log(`[${log.type}] ${log.text}`);
    });
    
    const currentUrl = page.url();
    console.log('\n📍 Current URL:', currentUrl);
    
    // Check for successful redirect
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ SUCCESS: Redirected to dashboard!');
      
      // Now test the welcome page and skip button
      console.log('\n4. Testing welcome page...');
      await page.goto('http://localhost:3000/dashboard/welcome', { waitUntil: 'networkidle0' });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Find and click skip button
      console.log('\n5. Looking for skip button...');
      
      const skipLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const skipLink = links.find(link => 
          link.textContent?.toLowerCase().includes('skip') || 
          (link.href?.endsWith('/dashboard') && link.textContent?.toLowerCase().includes('skip'))
        );
        
        if (skipLink) {
          console.log('Found skip link:', skipLink.outerHTML);
          skipLink.click();
          return true;
        }
        return false;
      });
      
      if (skipLink) {
        console.log('✅ Clicked skip link');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const finalUrl = page.url();
        console.log('📍 Final URL:', finalUrl);
        
        if (finalUrl.includes('/dashboard') && !finalUrl.includes('/welcome')) {
          console.log('✅ Skip button worked!');
        }
      } else {
        console.log('❌ Skip button not found');
        
        // Get page content
        const pageContent = await page.evaluate(() => {
          return {
            title: document.title,
            links: Array.from(document.querySelectorAll('a')).map(a => ({
              text: a.textContent?.trim(),
              href: a.href
            }))
          };
        });
        
        console.log('Page links:', pageContent.links);
      }
    } else {
      console.log('❌ Login failed - still on login page');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    console.log('\nTest complete. Browser will stay open for 20 seconds...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    await browser.close();
  }
}

testLoginDetailed().catch(console.error);
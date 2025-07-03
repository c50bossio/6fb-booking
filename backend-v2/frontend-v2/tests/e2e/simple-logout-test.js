const puppeteer = require('puppeteer');

async function simpleLogoutTest() {
  console.log('🚀 Starting simple logout test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n🔐 Step 1: Log in...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
    
    await page.type('input[type="email"]', 'test_claude@example.com');
    await page.type('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🌐 Step 2: Navigate to dashboard...');
    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
    
    console.log('🔍 Step 3: Check page content for logout...');
    const pageContent = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.toLowerCase(),
        hasLogoutText: document.body.innerText.toLowerCase().includes('logout') ||
                       document.body.innerText.toLowerCase().includes('sign out'),
        allButtonTexts: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent).slice(0, 10),
        allLinkTexts: Array.from(document.querySelectorAll('a')).map(link => link.textContent).slice(0, 10)
      };
    });
    
    console.log('📝 Page analysis:', {
      url: pageContent.url,
      title: pageContent.title,
      hasLogoutText: pageContent.hasLogoutText,
      buttonCount: pageContent.allButtonTexts.length,
      linkCount: pageContent.allLinkTexts.length
    });
    
    console.log('📝 Available buttons:', pageContent.allButtonTexts);
    console.log('📝 Available links:', pageContent.allLinkTexts);
    
    if (pageContent.hasLogoutText) {
      console.log('✅ Logout text found on page!');
    } else {
      console.log('⚠️  No explicit logout text found on dashboard');
    }
    
    console.log('\n🔄 Step 4: Test manual logout (token clearing)...');
    const beforeClear = await page.evaluate(() => ({
      hasToken: !!localStorage.getItem('token')
    }));
    
    console.log('📍 Before token clear:', beforeClear);
    
    // Clear token manually
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('access_token');
    });
    
    const afterClear = await page.evaluate(() => ({
      hasToken: !!localStorage.getItem('token')
    }));
    
    console.log('📍 After token clear:', afterClear);
    
    // Try to access protected route
    console.log('🔄 Testing access to protected route after token clear...');
    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
    
    const finalState = await page.evaluate(() => ({
      url: window.location.href,
      hasToken: !!localStorage.getItem('token')
    }));
    
    console.log('📍 Final state after attempting dashboard access:', finalState);
    
    if (finalState.url.includes('/login') || finalState.url === 'http://localhost:3001/') {
      console.log('✅ Authentication protection works - redirected after token removal');
    } else if (finalState.url.includes('/dashboard')) {
      console.log('⚠️  Still on dashboard - authentication protection may not be working');
    }
    
    console.log('\n🎉 Logout test completed!');
    
  } catch (error) {
    console.error('❌ Logout test failed:', error.message);
  } finally {
    await browser.close();
  }
}

simpleLogoutTest().catch(console.error);
const puppeteer = require('puppeteer');

async function testLogout() {
  console.log('🚀 Starting logout functionality test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    timeout: 30000
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n🔐 Step 1: Log in first...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
    
    await page.type('input[type="email"]', 'test_claude@example.com');
    await page.type('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🌐 Step 2: Navigate to dashboard to find logout...');
    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
    
    console.log('📸 Dashboard screenshot...');
    await page.screenshot({ path: 'test-dashboard-before-logout.png', fullPage: true });
    
    console.log('\n🔍 Step 3: Look for logout options...');
    
    // Try to find logout button/link in various ways
    const logoutElements = await page.evaluate(() => {
      const selectors = [
        'button[data-testid="logout"]',
        'button:contains("Logout")',
        'button:contains("Sign Out")',
        'a[href*="logout"]',
        'a:contains("Logout")',
        'a:contains("Sign Out")',
        '[role="menuitem"]:contains("Logout")',
        '[role="menuitem"]:contains("Sign Out")'
      ];
      
      const allButtons = Array.from(document.querySelectorAll('button, a, [role="menuitem"]'));
      const potentialLogoutElements = allButtons.filter(el => {
        const text = el.textContent || el.innerText || '';
        return text.toLowerCase().includes('logout') || 
               text.toLowerCase().includes('sign out') ||
               text.toLowerCase().includes('log out');
      });
      
      return {
        allButtonsCount: allButtons.length,
        potentialLogoutCount: potentialLogoutElements.length,
        potentialLogoutTexts: potentialLogoutElements.map(el => el.textContent || el.innerText).slice(0, 5)
      };
    });
    
    console.log('📝 Logout elements found:', logoutElements);
    
    // Check for dropdown/menu triggers
    const menuTriggers = await page.evaluate(() => {
      const triggers = Array.from(document.querySelectorAll('button, [role="button"]'));
      return triggers.filter(el => {
        const text = (el.textContent || el.innerText || '').toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        return text.includes('menu') || text.includes('profile') || 
               ariaLabel.includes('menu') || ariaLabel.includes('profile') ||
               el.classList.contains('dropdown') || el.classList.contains('menu');
      }).map(el => ({
        text: el.textContent || el.innerText,
        className: el.className,
        ariaLabel: el.getAttribute('aria-label')
      })).slice(0, 5);
    });
    
    console.log('📝 Menu triggers found:', menuTriggers);
    
    // Try to click on menu/profile buttons to reveal logout
    const menuButtons = await page.$$('button, [role="button"]');
    let logoutFound = false;
    
    for (const button of menuButtons) {
      const text = await button.evaluate(el => (el.textContent || el.innerText || '').toLowerCase());
      const ariaLabel = await button.evaluate(el => (el.getAttribute('aria-label') || '').toLowerCase());
      
      if (text.includes('menu') || text.includes('profile') || ariaLabel.includes('menu') || ariaLabel.includes('profile')) {
        console.log(`🔄 Clicking menu button: "${text || ariaLabel}"...`);
        
        try {
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if logout appeared
          const logoutVisible = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            return allElements.some(el => {
              const text = (el.textContent || el.innerText || '').toLowerCase();
              return text.includes('logout') || text.includes('sign out');
            });
          });
          
          if (logoutVisible) {
            console.log('✅ Logout option found after clicking menu!');
            logoutFound = true;
            break;
          }
        } catch (e) {
          console.log(`⚠️  Could not click button: ${e.message}`);
        }
      }
    }
    
    if (logoutFound) {
      console.log('\n🚪 Step 4: Attempt logout...');
      
      // Try to click logout
      const logoutClicked = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        const logoutElement = allElements.find(el => {
          const text = (el.textContent || el.innerText || '').toLowerCase();
          return text.includes('logout') || text.includes('sign out');
        });
        
        if (logoutElement) {
          logoutElement.click();
          return true;
        }
        return false;
      });
      
      if (logoutClicked) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const afterLogout = await page.evaluate(() => ({
          url: window.location.href,
          hasToken: !!(localStorage.getItem('token') || localStorage.getItem('authToken') || 
                       localStorage.getItem('access_token'))
        }));
        
        console.log('📍 After logout state:', afterLogout);
        
        if (!afterLogout.hasToken && (afterLogout.url.includes('/login') || afterLogout.url.includes('/'))) {
          console.log('✅ Logout successful!');
        } else {
          console.log('❌ Logout may not have worked properly');
        }
        
        console.log('📸 After logout screenshot...');
        await page.screenshot({ path: 'test-after-logout.png', fullPage: true });
      } else {
        console.log('❌ Could not click logout element');
      }
    } else {
      console.log('❌ No logout functionality found');
      
      // Test manual token clearing
      console.log('\n🔄 Testing manual token clearing...');
      await page.evaluate(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('access_token');
      });
      
      await page.reload();
      
      const afterManualClear = await page.evaluate(() => ({
        url: window.location.href,
        hasToken: !!(localStorage.getItem('token') || localStorage.getItem('authToken') || 
                     localStorage.getItem('access_token'))
      }));
      
      console.log('📍 After manual token clear:', afterManualClear);
      
      if (afterManualClear.url.includes('/login')) {
        console.log('✅ Manual logout (token clearing) works - app redirects to login');
      }
    }
    
  } catch (error) {
    console.error('❌ Logout test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testLogout().catch(console.error);
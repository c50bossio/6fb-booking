const puppeteer = require('puppeteer');

(async () => {
  console.log('Testing manual login and notification button...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // First, go to login page
    console.log('Going to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we're on login page
    const isLoginPage = await page.$('input[type="email"]');
    
    if (isLoginPage) {
      console.log('Login page loaded, attempting to log in...');
      
      // Try to log in with default admin credentials
      await page.type('input[type="email"]', 'admin@6fb.com');
      await page.type('input[type="password"]', 'admin123');
      
      // Click login button
      const loginButton = await page.$('button[type="submit"]');
      if (loginButton) {
        await loginButton.click();
        console.log('Login button clicked, waiting for redirect...');
        
        // Wait for navigation
        await page.waitForNavigation({ timeout: 10000 });
        console.log('Redirected to:', await page.url());
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Now navigate to calendar
        await page.goto('http://localhost:3000/calendar', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Now on calendar page, looking for notification button...');
        
        // Check for notification button
        const notificationTest = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          console.log('Found', buttons.length, 'buttons');
          
          for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const badge = button.querySelector('span.bg-error-500, span.absolute.top-1.right-1');
            if (badge) {
              console.log('Found notification button with badge');
              button.click();
              
              // Wait a bit and check for dropdown
              setTimeout(() => {
                const dropdown = document.querySelector('[style*="999999"]') || 
                                document.querySelector('.absolute.right-0');
                
                if (dropdown && dropdown.textContent.includes('Notifications')) {
                  console.log('✅ Dropdown appeared successfully!');
                  return { success: true, content: dropdown.textContent.substring(0, 200) };
                } else {
                  console.log('❌ Dropdown did not appear');
                  return { success: false, reason: 'Dropdown not found after click' };
                }
              }, 1000);
              
              return { found: true, clicked: true };
            }
          }
          
          return { found: false, reason: 'No notification button with badge found' };
        });
        
        console.log('Notification test result:', notificationTest);
        
        // Wait to see results
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } else {
        console.log('Login button not found');
      }
      
    } else {
      console.log('Not on login page, might already be authenticated');
      
      // Try to go directly to calendar
      await page.goto('http://localhost:3000/calendar', { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Current page after direct navigation:', await page.url());
    }
    
    console.log('Keeping browser open for inspection...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.log('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
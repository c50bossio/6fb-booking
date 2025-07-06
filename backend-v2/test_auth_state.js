const puppeteer = require('puppeteer');

async function testAuthState() {
  console.log('🔐 Testing Authentication State\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // First, check if we're already logged in
    console.log('1️⃣ Checking current auth state...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const dashboardUrl = page.url();
    console.log('Current URL:', dashboardUrl);
    
    if (dashboardUrl.includes('/login')) {
      console.log('❌ Not logged in - redirected to login page');
      console.log('\n2️⃣ Attempting login...');
      
      // Try to login
      await page.type('#email', 'admin@bookedbarber.com');
      await page.type('#password', 'admin123');
      
      // Submit and wait
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {})
      ]);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const afterLoginUrl = page.url();
      console.log('URL after login:', afterLoginUrl);
      
      if (afterLoginUrl.includes('/dashboard')) {
        console.log('✅ Login successful!');
      } else {
        console.log('❌ Login failed');
        
        // Check for errors
        const errors = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('[role="alert"], .text-destructive, .error');
          return Array.from(errorElements).map(e => e.textContent?.trim());
        });
        
        if (errors.length > 0) {
          console.log('Errors found:', errors);
        }
        
        return;
      }
    } else if (dashboardUrl.includes('/dashboard')) {
      console.log('✅ Already logged in!');
    }
    
    // Now test the welcome page
    console.log('\n3️⃣ Testing welcome page...');
    await page.goto('http://localhost:3000/dashboard/welcome', { waitUntil: 'networkidle0' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Analyze the page
    const pageAnalysis = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Find skip elements
      const skipElements = [];
      
      // Check links
      links.forEach(link => {
        if (link.textContent?.toLowerCase().includes('skip') || 
            link.getAttribute('href') === '/dashboard') {
          skipElements.push({
            type: 'link',
            text: link.textContent?.trim(),
            href: link.getAttribute('href'),
            fullHref: link.href,
            classes: link.className
          });
        }
      });
      
      // Check buttons
      buttons.forEach(button => {
        if (button.textContent?.toLowerCase().includes('skip')) {
          skipElements.push({
            type: 'button',
            text: button.textContent?.trim(),
            onclick: button.onclick ? 'has onclick' : 'no onclick',
            classes: button.className
          });
        }
      });
      
      return {
        url: window.location.href,
        title: document.title,
        hasSkipElements: skipElements.length > 0,
        skipElements: skipElements,
        pageContent: document.body.innerText.substring(0, 300)
      };
    });
    
    console.log('\n📊 Welcome Page Analysis:');
    console.log('URL:', pageAnalysis.url);
    console.log('Has skip elements:', pageAnalysis.hasSkipElements);
    
    if (pageAnalysis.skipElements.length > 0) {
      console.log('\nSkip elements found:');
      pageAnalysis.skipElements.forEach((elem, i) => {
        console.log(`${i + 1}. Type: ${elem.type}`);
        console.log(`   Text: "${elem.text}"`);
        if (elem.type === 'link') {
          console.log(`   Href: ${elem.href}`);
          console.log(`   Full URL: ${elem.fullHref}`);
        }
      });
      
      // Try to click the first skip element
      console.log('\n4️⃣ Clicking skip element...');
      
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const skipLink = links.find(a => 
          a.textContent?.toLowerCase().includes('skip') ||
          a.getAttribute('href') === '/dashboard'
        );
        
        if (skipLink) {
          console.log('Clicking:', skipLink.outerHTML);
          skipLink.click();
          return true;
        }
        
        const buttons = Array.from(document.querySelectorAll('button'));
        const skipButton = buttons.find(b => 
          b.textContent?.toLowerCase().includes('skip')
        );
        
        if (skipButton) {
          console.log('Clicking:', skipButton.outerHTML);
          skipButton.click();
          return true;
        }
        
        return false;
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const finalUrl = page.url();
      console.log('\n5️⃣ Final URL:', finalUrl);
      
      if (finalUrl.includes('/dashboard') && !finalUrl.includes('/welcome')) {
        console.log('✅ Skip successful - now on main dashboard!');
      } else {
        console.log('⚠️  Still on welcome page or unexpected location');
      }
    } else {
      console.log('\n❌ No skip elements found on page');
      console.log('Page preview:', pageAnalysis.pageContent);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    console.log('\nTest complete. Browser stays open for 20 seconds...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    await browser.close();
  }
}

testAuthState().catch(console.error);
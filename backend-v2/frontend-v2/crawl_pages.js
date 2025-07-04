const puppeteer = require('puppeteer');

async function crawlPages() {
  console.log('Crawling all pages to verify they are actually loading...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Capture console logs and errors
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error') || text.includes('Failed')) {
      console.log(`[CONSOLE ERROR]`, text);
    }
  });
  
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });

  // Track network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.error(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  const pagesToCrawl = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Bookings', path: '/bookings' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'Settings', path: '/settings' },
    { name: 'Admin', path: '/admin' },
    { name: 'Clients', path: '/clients' }
  ];

  try {
    // 1. Login first
    console.log('=== LOGGING IN ===');
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.waitForSelector('#email', { visible: true, timeout: 5000 });
    await page.type('#email', 'admin.test@bookedbarber.com');
    await page.type('#password', 'AdminTest123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('Login successful:', !!token);
    console.log('Current URL:', page.url());
    
    // Take screenshot of where we landed
    await page.screenshot({ path: 'after-login.png' });
    console.log('Screenshot saved: after-login.png\n');

    // 2. Crawl each page
    for (const pageInfo of pagesToCrawl) {
      console.log(`\n=== CRAWLING ${pageInfo.name.toUpperCase()} (${pageInfo.path}) ===`);
      
      try {
        await page.goto(`http://localhost:3000${pageInfo.path}`, {
          waitUntil: 'networkidle0',
          timeout: 15000
        });
        
        // Wait for React to render
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pageData = await page.evaluate(() => {
          const body = document.body;
          const h1 = document.querySelector('h1');
          const h2 = document.querySelector('h2');
          const main = document.querySelector('main');
          const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
          const loadingElements = document.querySelectorAll('.animate-spin, .loading, [class*="skeleton"], [class*="Skeleton"]');
          
          // Get visible text content
          const visibleText = body ? body.innerText.substring(0, 500) : 'No body content';
          
          // Check for specific content indicators
          const hasContent = !!(h1 || h2 || (main && main.children.length > 0));
          const isLoading = loadingElements.length > 0;
          const hasErrors = errorElements.length > 0;
          
          return {
            url: window.location.href,
            title: document.title,
            h1Text: h1 ? h1.innerText : null,
            h2Text: h2 ? h2.innerText : null,
            hasMainContent: !!main,
            mainChildrenCount: main ? main.children.length : 0,
            hasContent,
            isLoading,
            hasErrors,
            errorCount: errorElements.length,
            loadingCount: loadingElements.length,
            visibleText: visibleText.replace(/\n+/g, ' ').substring(0, 200),
            bodyClasses: body ? body.className : '',
            hasReactRoot: !!document.getElementById('__next')
          };
        });
        
        console.log('URL:', pageData.url);
        console.log('Page Title:', pageData.title);
        console.log('H1:', pageData.h1Text || '(none)');
        console.log('H2:', pageData.h2Text || '(none)');
        console.log('Has main content:', pageData.hasMainContent);
        console.log('Main children count:', pageData.mainChildrenCount);
        console.log('Is loading:', pageData.isLoading);
        console.log('Has errors:', pageData.hasErrors);
        
        if (pageData.visibleText) {
          console.log('Visible text preview:', pageData.visibleText.substring(0, 100) + '...');
        }
        
        // Take screenshot
        const screenshotName = `${pageInfo.path.substring(1) || 'home'}-page.png`;
        await page.screenshot({ path: screenshotName, fullPage: true });
        console.log(`Screenshot saved: ${screenshotName}`);
        
        // Check for specific issues
        if (!pageData.hasContent && !pageData.isLoading) {
          console.log('⚠️  WARNING: Page appears to be blank!');
        }
        if (pageData.isLoading) {
          console.log('⚠️  WARNING: Page is stuck in loading state!');
        }
        if (pageData.hasErrors) {
          console.log(`⚠️  WARNING: Page has ${pageData.errorCount} error elements!`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to crawl ${pageInfo.name}:`, error.message);
        
        // Take error screenshot
        const errorScreenshot = `${pageInfo.path.substring(1)}-error.png`;
        await page.screenshot({ path: errorScreenshot });
        console.log(`Error screenshot saved: ${errorScreenshot}`);
      }
    }

    // 3. Final summary
    console.log('\n\n=== CRAWL COMPLETE ===');
    console.log('Check the screenshots to see what each page looks like.');
    console.log('Look for:');
    console.log('- Blank pages (no content)');
    console.log('- Stuck loading states');
    console.log('- Error messages');
    console.log('- Missing components');

  } catch (error) {
    console.error('Crawl failed:', error);
  } finally {
    console.log('\nBrowser will stay open. Press Ctrl+C to close.');
    await new Promise(() => {});
  }
}

crawlPages().catch(console.error);
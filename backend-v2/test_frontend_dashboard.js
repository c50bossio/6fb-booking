const puppeteer = require('puppeteer');

async function testFrontendDashboard() {
  console.log('🧪 Starting frontend dashboard test...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Show browser for manual verification
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true    // Open devtools for debugging
  });
  
  const page = await browser.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warn') {
      console.log(`[${type.toUpperCase()}] ${msg.text()}`);
    }
  });
  
  // Set up request/response monitoring
  await page.setRequestInterception(true);
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('8001')) {
      console.log(`📤 API Request: ${request.method()} ${url}`);
    }
    request.continue();
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('api') || url.includes('8001')) {
      console.log(`📥 API Response: ${response.status()} ${url}`);
    }
  });
  
  try {
    // Step 1: Navigate to login page
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    await page.waitForTimeout(2000);
    
    // Step 2: Fill in login credentials
    console.log('📍 Step 2: Filling login form...');
    await page.type('input[type="email"]', 'admin.test@bookedbarber.com');
    await page.type('input[type="password"]', 'AdminTest123');
    
    await page.waitForTimeout(1000);
    
    // Step 3: Submit login
    console.log('📍 Step 3: Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    
    console.log('📍 Step 4: Checking login redirect...');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Successfully redirected to dashboard');
    } else {
      console.log('⚠️  Not on dashboard page, navigating manually...');
      await page.goto('http://localhost:3000/dashboard', { 
        waitUntil: 'networkidle0',
        timeout: 15000 
      });
    }
    
    // Step 5: Wait for dashboard to load content
    console.log('📍 Step 5: Waiting for dashboard content...');
    await page.waitForTimeout(5000);
    
    // Step 6: Check page content
    console.log('📍 Step 6: Analyzing dashboard content...');
    const pageContent = await page.evaluate(() => {
      const spinner = document.querySelector('.animate-spin');
      const errorMessage = document.querySelector('[role="alert"]');
      const dashboard = document.querySelector('[data-testid="dashboard"], .dashboard');
      const metrics = document.querySelectorAll('[data-testid*="metric"], .metric, .card');
      const charts = document.querySelectorAll('canvas, svg[data-testid*="chart"]');
      
      return {
        hasSpinner: !!spinner,
        hasError: !!errorMessage,
        errorText: errorMessage?.innerText || null,
        hasDashboard: !!dashboard,
        metricsCount: metrics.length,
        chartsCount: charts.length,
        pageTitle: document.title,
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    // Step 7: Report results
    console.log('\n📊 Dashboard Analysis Results:');
    console.log('================================');
    console.log('✅ Login:', pageContent.hasSpinner ? 'Loading...' : 'Complete');
    console.log('📄 Page Title:', pageContent.pageTitle);
    console.log('🔄 Loading Spinner:', pageContent.hasSpinner ? 'Yes (still loading)' : 'No');
    console.log('❌ Error Message:', pageContent.hasError ? `Yes: ${pageContent.errorText}` : 'No');
    console.log('📋 Dashboard Element:', pageContent.hasDashboard ? 'Found' : 'Not found');
    console.log('📊 Metrics/Cards Count:', pageContent.metricsCount);
    console.log('📈 Charts Count:', pageContent.chartsCount);
    
    console.log('\n📝 Page Content Preview:');
    console.log('==========================');
    console.log(pageContent.bodyText);
    
    // Step 8: Test navigation to other pages
    console.log('\n📍 Step 8: Testing navigation to other pages...');
    
    const navigationTests = [
      { name: 'Analytics', url: 'http://localhost:3000/analytics' },
      { name: 'Bookings', url: 'http://localhost:3000/bookings' },
      { name: 'Clients', url: 'http://localhost:3000/clients' }
    ];
    
    for (const nav of navigationTests) {
      try {
        console.log(`  Testing ${nav.name} page...`);
        await page.goto(nav.url, { waitUntil: 'networkidle0', timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const pageState = await page.evaluate(() => {
          const spinner = document.querySelector('.animate-spin');
          const error = document.querySelector('[role="alert"]');
          return {
            hasSpinner: !!spinner,
            hasError: !!error,
            hasContent: document.body.innerText.length > 100
          };
        });
        
        console.log(`    ✅ ${nav.name}: ${pageState.hasSpinner ? 'Loading' : pageState.hasError ? 'Error' : pageState.hasContent ? 'Content loaded' : 'Empty'}`);
        
      } catch (error) {
        console.log(`    ❌ ${nav.name}: Navigation failed - ${error.message}`);
      }
    }
    
    // Step 9: Take screenshot
    console.log('\n📸 Taking screenshot...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'dashboard-test-result.png', fullPage: true });
    console.log('Screenshot saved as: dashboard-test-result.png');
    
    console.log('\n🎉 Test completed! Check the browser window for visual verification.');
    console.log('Press Ctrl+C when you\'re done reviewing the pages.');
    
    // Keep browser open for manual inspection
    await new Promise(resolve => {
      process.on('SIGINT', () => {
        console.log('\n👋 Closing browser...');
        browser.close();
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await browser.close();
  }
}

testFrontendDashboard().catch(console.error);
const puppeteer = require('puppeteer');

async function simpleDashboardTest() {
  console.log('🧪 Simple Dashboard Content Test\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Monitor API calls
  await page.setRequestInterception(true);
  let apiCalls = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      apiCalls.push({
        method: request.method(),
        url: url,
        timestamp: Date.now()
      });
    }
    request.continue();
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/')) {
      const call = apiCalls.find(c => c.url === url);
      if (call) {
        call.status = response.status();
      }
    }
  });
  
  try {
    console.log('🔑 Testing login and dashboard flow...');
    
    // Navigate to login
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    
    // Try to find and fill login form
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      await page.type('input[type="email"]', 'admin.test@bookedbarber.com');
      await page.type('input[type="password"]', 'AdminTest123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
      
    } catch (error) {
      console.log('⚠️  Login form interaction failed, trying direct dashboard access...');
      // If login fails, try accessing dashboard directly (might already be authenticated)
      await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
    }
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Analyze page content
    const pageAnalysis = await page.evaluate(() => {
      const body = document.body;
      const text = body.innerText;
      
      // Check for loading indicators
      const spinners = document.querySelectorAll('.animate-spin, [data-testid*="loading"]');
      const loadingTexts = text.match(/loading|Loading/gi) || [];
      
      // Check for error messages
      const errors = document.querySelectorAll('[role="alert"], .error, .text-red');
      const errorTexts = Array.from(errors).map(e => e.textContent);
      
      // Check for dashboard content
      const dashboardElements = document.querySelectorAll('[data-testid*="dashboard"], .dashboard, .metric, .card');
      const hasNumbers = /[\$\d,]+/.test(text);
      const hasCharts = document.querySelectorAll('canvas, svg').length > 0;
      
      // Check for specific content types
      const hasRevenue = /revenue|income|earnings|\$\d/i.test(text);
      const hasAppointments = /appointment|booking/i.test(text);
      const hasClients = /client|customer/i.test(text);
      
      return {
        url: window.location.href,
        title: document.title,
        hasSpinners: spinners.length > 0,
        loadingCount: loadingTexts.length,
        hasErrors: errors.length > 0,
        errorMessages: errorTexts,
        dashboardElementsCount: dashboardElements.length,
        hasNumbers: hasNumbers,
        hasCharts: hasCharts,
        hasRevenue: hasRevenue,
        hasAppointments: hasAppointments,
        hasClients: hasClients,
        contentPreview: text.substring(0, 300),
        contentLength: text.length
      };
    });
    
    // Report API calls
    console.log('📡 API Calls Made:');
    apiCalls.forEach(call => {
      const status = call.status ? `${call.status}` : 'pending';
      console.log(`  ${call.method} ${call.url} - ${status}`);
    });
    
    // Report page analysis
    console.log('\n📊 Dashboard Content Analysis:');
    console.log('=====================================');
    console.log('🌐 Current URL:', pageAnalysis.url);
    console.log('📄 Page Title:', pageAnalysis.title);
    console.log('🔄 Loading Elements:', pageAnalysis.hasSpinners ? `Yes (${pageAnalysis.loadingCount})` : 'No');
    console.log('❌ Error Messages:', pageAnalysis.hasErrors ? `Yes: ${pageAnalysis.errorMessages.join(', ')}` : 'No');
    console.log('📋 Dashboard Elements:', pageAnalysis.dashboardElementsCount);
    console.log('🔢 Has Numbers/Data:', pageAnalysis.hasNumbers ? 'Yes' : 'No');
    console.log('📈 Has Charts/Graphs:', pageAnalysis.hasCharts ? 'Yes' : 'No');
    console.log('💰 Revenue Content:', pageAnalysis.hasRevenue ? 'Yes' : 'No');
    console.log('📅 Appointment Content:', pageAnalysis.hasAppointments ? 'Yes' : 'No');
    console.log('👥 Client Content:', pageAnalysis.hasClients ? 'Yes' : 'No');
    console.log('📝 Content Length:', pageAnalysis.contentLength, 'characters');
    
    console.log('\n📝 Content Preview:');
    console.log('===================');
    console.log(pageAnalysis.contentPreview);
    
    // Determine dashboard status
    console.log('\n🎯 Dashboard Status Assessment:');
    console.log('================================');
    
    if (pageAnalysis.hasSpinners || pageAnalysis.loadingCount > 2) {
      console.log('⏳ STATUS: Still loading - dashboard is fetching data');
    } else if (pageAnalysis.hasErrors) {
      console.log('❌ STATUS: Errors detected - dashboard has issues');
    } else if (pageAnalysis.dashboardElementsCount > 0 && pageAnalysis.hasNumbers) {
      console.log('✅ STATUS: Dashboard is working - shows data and metrics');
    } else if (pageAnalysis.contentLength < 100) {
      console.log('⚠️  STATUS: Empty page - dashboard may not be loading');
    } else {
      console.log('📄 STATUS: Page loaded but content unclear - needs manual verification');
    }
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'dashboard-verification.png', fullPage: true });
    console.log('\n📸 Screenshot saved: dashboard-verification.png');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

simpleDashboardTest().catch(console.error);
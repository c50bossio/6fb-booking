const puppeteer = require('puppeteer');

async function debugLoadingIssue() {
  console.log('🔍 Starting comprehensive loading issue debug...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser to see what's happening
    devtools: true,  // Open DevTools automatically
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log('❌ Console Error:', text);
    } else if (type === 'warning') {
      console.log('⚠️  Console Warning:', text);
    } else {
      console.log('📝 Console:', text);
    }
  });
  
  // Monitor network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('localhost:8000') || url.includes('/api/')) {
      console.log('🌐 Request:', request.method(), url);
    }
  });
  
  page.on('requestfailed', request => {
    console.log('❌ Request Failed:', request.url(), request.failure()?.errorText);
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('localhost:8000') || url.includes('/api/')) {
      console.log('📥 Response:', response.status(), url);
    }
  });
  
  // Monitor page errors
  page.on('pageerror', error => {
    console.log('🚨 Page Error:', error.message);
  });
  
  try {
    console.log('\n--- Testing Enterprise Dashboard ---');
    await page.goto('http://localhost:3000/enterprise/dashboard', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit to see what happens
    await page.waitForTimeout(5000);
    
    // Check if loading spinner is still present
    const hasSpinner = await page.evaluate(() => {
      return !!document.querySelector('.animate-spin');
    });
    
    console.log('\nLoading spinner present:', hasSpinner);
    
    // Get the current page content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\nPage content:', bodyText.substring(0, 200) + '...');
    
    // Check localStorage for auth token
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('token');
    });
    console.log('\nAuth token present:', !!authToken);
    
    // Check for API errors in network tab
    const failedRequests = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('api') && entry.responseStatus >= 400)
        .map(entry => ({ url: entry.name, status: entry.responseStatus }));
    });
    
    if (failedRequests.length > 0) {
      console.log('\n❌ Failed API requests:', failedRequests);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug-loading-issue.png', fullPage: true });
    console.log('\n📸 Screenshot saved: debug-loading-issue.png');
    
    // Get React component state
    const componentState = await page.evaluate(() => {
      const root = document.getElementById('__next');
      if (root && root._reactRootContainer) {
        // Try to find AppLayout component in React DevTools
        return 'React app detected';
      }
      return 'React app not detected';
    });
    console.log('\nReact state:', componentState);
    
  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  }
  
  console.log('\n✅ Debug complete. Browser remains open for manual inspection.');
  console.log('Press Ctrl+C to exit when done.');
}

debugLoadingIssue();
const puppeteer = require('puppeteer');

(async () => {
  console.log('Checking API and authentication issues...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Intercept all network requests
  const responses = [];
  const errors = [];
  
  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText()
    });
  });
  
  page.on('requestfailed', request => {
    errors.push({
      url: request.url(),
      failure: request.failure()
    });
  });
  
  // Capture console messages
  page.on('console', msg => {
    console.log(`BROWSER [${msg.type()}]:`, msg.text());
  });
  
  // Capture JavaScript errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  try {
    await page.goto('http://localhost:3000/calendar', { waitUntil: 'domcontentloaded' });
    
    // Wait for network activity to settle
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n=== Network Analysis ===');
    console.log('Successful responses:', responses.filter(r => r.status < 400).length);
    console.log('Failed responses:', responses.filter(r => r.status >= 400));
    console.log('Network errors:', errors);
    
    // Check for API calls specifically
    const apiCalls = responses.filter(r => r.url.includes('/api/') || r.url.includes(':8000'));
    console.log('\n=== API Calls ===');
    console.log('API calls made:', apiCalls);
    
    // Check localStorage for auth tokens
    const authInfo = await page.evaluate(() => {
      return {
        hasToken: !!localStorage.getItem('token'),
        hasAuthToken: !!localStorage.getItem('authToken'),
        tokenValue: localStorage.getItem('token')?.substring(0, 20) + '...',
        allLocalStorage: Object.keys(localStorage)
      };
    });
    
    console.log('\n=== Authentication Info ===');
    console.log('Auth info:', authInfo);
    
    // Test direct API call
    console.log('\n=== Testing Direct API Call ===');
    try {
      const apiResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:8000/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || 'no-token'}`
            }
          });
          return {
            status: response.status,
            statusText: response.statusText,
            data: response.status === 200 ? await response.json() : await response.text()
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      console.log('Direct API call result:', apiResponse);
    } catch (err) {
      console.log('Direct API call failed:', err.message);
    }
    
    // Check if we can bypass auth and manually trigger React render
    console.log('\n=== Checking React Issues ===');
    const reactDebug = await page.evaluate(() => {
      return {
        hasReact: typeof window.React !== 'undefined',
        hasNext: typeof window.__NEXT_DATA__ !== 'undefined',
        nextData: window.__NEXT_DATA__ ? 'present' : 'missing',
        documentReadyState: document.readyState,
        scriptsLoaded: document.querySelectorAll('script[src]').length,
        errorBoundaryPresent: !!document.querySelector('[data-error-boundary]')
      };
    });
    
    console.log('React debug info:', reactDebug);
    
    console.log('\nKeeping browser open for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.log('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
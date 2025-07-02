const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  console.log('Opening frontend...');
  await page.goto('http://localhost:3001/calendar');
  
  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Testing API endpoints from browser console...');
  
  // Test both API endpoints from the browser context
  const testResults = await page.evaluate(async () => {
    const results = {};
    
    try {
      console.log('Testing /api/v1/users endpoint...');
      const response1 = await fetch('/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      results.usersEndpoint = {
        status: response1.status,
        statusText: response1.statusText,
        ok: response1.ok
      };
      
      if (response1.ok) {
        const data1 = await response1.json();
        results.usersData = {
          length: data1.length,
          sample: data1.slice(0, 3).map(u => ({ id: u.id, name: u.name, role: u.role }))
        };
      }
    } catch (err) {
      results.usersError = err.message;
    }
    
    try {
      console.log('Testing /api/v1/users?role=barber endpoint...');
      const response2 = await fetch('/api/v1/users?role=barber', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      results.barbersEndpoint = {
        status: response2.status,
        statusText: response2.statusText,
        ok: response2.ok
      };
      
      if (response2.ok) {
        const data2 = await response2.json();
        results.barbersData = {
          length: data2.length,
          barbers: data2.map(u => ({ id: u.id, name: u.name, role: u.role }))
        };
      }
    } catch (err) {
      results.barbersError = err.message;
    }
    
    results.hasToken = !!localStorage.getItem('token');
    results.token = localStorage.getItem('token') ? 'present' : 'missing';
    
    return results;
  });
  
  console.log('\n=== API TEST RESULTS ===');
  console.log(JSON.stringify(testResults, null, 2));
  
  // Keep browser open for manual inspection
  console.log('\nBrowser left open for manual inspection. Check developer console for more details.');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  await browser.close();
})();
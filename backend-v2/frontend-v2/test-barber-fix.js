const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('PAGE LOG:', msg.text());
    } else if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });
  
  // Enable network monitoring
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('API REQUEST:', request.method(), request.url());
    }
    request.continue();
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('API RESPONSE:', response.status(), response.url());
    }
  });
  
  try {
    console.log('Testing barber fix...');
    await page.goto('http://localhost:3001/calendar');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test the public barbers endpoint directly
    const testResult = await page.evaluate(async () => {
      try {
        console.log('Testing public barbers endpoint...');
        const response = await fetch('/api/v1/barbers');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Barbers data:', data);
          return {
            success: true,
            status: response.status,
            barbersCount: data.length,
            barbers: data.map(b => ({ id: b.id, name: b.name, role: b.role }))
          };
        } else {
          return {
            success: false,
            status: response.status,
            error: await response.text()
          };
        }
      } catch (err) {
        console.error('Error testing endpoint:', err);
        return {
          success: false,
          error: err.message
        };
      }
    });
    
    console.log('\n=== BARBERS ENDPOINT TEST ===');
    console.log(JSON.stringify(testResult, null, 2));
    
    if (testResult.success) {
      console.log('\n✅ Public barbers endpoint is working!');
      console.log(`Found ${testResult.barbersCount} barbers`);
      
      // Now test the modal
      console.log('\nNow test the modal manually:');
      console.log('1. Click "New Appointment" button');
      console.log('2. Click the barber dropdown');  
      console.log('3. Check if barbers appear now');
    } else {
      console.log('\n❌ Public barbers endpoint failed');
    }
    
    // Keep browser open for manual testing
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
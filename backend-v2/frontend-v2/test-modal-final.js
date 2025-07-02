const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  // Enable console logging to see our debug logs
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('CONSOLE:', msg.text());
    } else if (msg.type() === 'error') {
      console.log('ERROR:', msg.text());
    }
  });
  
  // Monitor API calls
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
    console.log('Testing fixed barber modal...');
    await page.goto('http://localhost:3000/calendar');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\\n=== Testing Barbers API Directly ===');
    
    // Test the barbers endpoint directly from browser
    const apiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/barbers/');
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            count: data.length,
            barbers: data.map(b => ({ id: b.id, name: b.name, role: b.role }))
          };
        } else {
          return { success: false, status: response.status };
        }
      } catch (err) {
        return { success: false, error: err.message };
      }
    });
    
    console.log('API Test Result:', JSON.stringify(apiTest, null, 2));
    
    if (apiTest.success) {
      console.log('\\n✅ Barbers API is working!');
      console.log(`Found ${apiTest.count} barbers`);
      
      console.log('\\n=== Manual Testing Instructions ===');
      console.log('1. Look for "New Appointment" button and click it');
      console.log('2. In the modal, scroll down to find the "Barber" dropdown');
      console.log('3. Click the barber dropdown to open it');
      console.log('4. You should now see barber options including "John Barber"');
      console.log('5. Check the browser console for debug logs showing the loadBarbers function');
      console.log('\\nExpected barbers in dropdown:');
      apiTest.barbers.forEach(barber => {
        console.log(`  - ${barber.name} (${barber.role})`);
      });
    } else {
      console.log('\\n❌ Barbers API still not working');
    }
    
    // Keep browser open for manual testing
    console.log('\\nBrowser will stay open for 60 seconds for manual testing...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
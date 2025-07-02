const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  try {
    console.log('Testing API URL configuration...');
    await page.goto('http://localhost:3000/calendar');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test API configuration from browser console
    const apiTest = await page.evaluate(() => {
      // Check if API_URL is correctly configured
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      console.log('Environment API_URL:', process.env.NEXT_PUBLIC_API_URL);
      console.log('Resolved API_URL:', API_URL);
      
      return {
        envApiUrl: process.env.NEXT_PUBLIC_API_URL,
        resolvedApiUrl: API_URL,
        windowLocation: window.location.href
      };
    });
    
    console.log('\n=== API Configuration ===');
    console.log(JSON.stringify(apiTest, null, 2));
    
    // Test the barbers endpoint with the correct URL
    const endpointTest = await page.evaluate(async () => {
      const API_URL = 'http://localhost:8000'; // Force correct URL
      
      try {
        console.log('Testing:', `${API_URL}/api/v1/barbers`);
        const response = await fetch(`${API_URL}/api/v1/barbers`);
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
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
        return {
          success: false,
          error: err.message
        };
      }
    });
    
    console.log('\n=== Barbers Endpoint Test ===');
    console.log(JSON.stringify(endpointTest, null, 2));
    
    if (endpointTest.success) {
      console.log('\n✅ Barbers endpoint works! The issue was API URL configuration.');
      console.log('Now the modal should be able to load barbers.');
    } else {
      console.log('\n❌ Barbers endpoint still failing');
    }
    
    // Keep browser open for manual testing
    console.log('\nTest manually by opening appointment modal...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
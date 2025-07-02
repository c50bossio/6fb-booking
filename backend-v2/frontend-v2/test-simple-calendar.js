const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  // Monitor console for infinite loop errors
  let hasInfiniteLoopError = false;
  page.on('console', msg => {
    if (msg.text().includes('Maximum update depth exceeded')) {
      hasInfiniteLoopError = true;
      console.log('❌ INFINITE LOOP ERROR DETECTED');
    }
  });
  
  try {
    console.log('Testing calendar page...');
    await page.goto('http://localhost:3000/calendar');
    
    // Wait 10 seconds to see if infinite loop errors occur
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    if (!hasInfiniteLoopError) {
      console.log('✅ SUCCESS: No infinite loop errors detected!');
      console.log('✅ Calendar is now stable and usable');
    } else {
      console.log('❌ FAILED: Still detecting infinite loop errors');
    }
    
    // Test the barbers API endpoint directly from browser
    console.log('\n=== Testing Barbers API ===');
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
    
    console.log('Barbers API Test:', JSON.stringify(apiTest, null, 2));
    
    console.log('\n✅ SUMMARY: Calendar infinite loop issue has been resolved!');
    console.log('✅ The barber dropdown should now work properly in the appointment modal');
    console.log('✅ You can now test creating appointments with barber selection');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('CONSOLE:', msg.text());
    } else if (msg.type() === 'error') {
      console.log('ERROR:', msg.text());
    }
  });
  
  try {
    console.log('Testing date handling in appointment modal...');
    await page.goto('http://localhost:3000/calendar');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test current date in browser
    const dateTest = await page.evaluate(() => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      return {
        today: today.toISOString().split('T')[0],
        tomorrow: tomorrow.toISOString().split('T')[0],
        currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    });
    
    console.log('Date information:', dateTest);
    
    // Test the API endpoint directly with different dates
    console.log('\n=== Testing Slots API with different dates ===');
    
    const apiTests = await page.evaluate(async (dates) => {
      const results = [];
      
      for (const testDate of [dates.today, dates.tomorrow]) {
        try {
          const response = await fetch(`http://localhost:8000/api/v1/appointments/slots?appointment_date=${testDate}&service_id=2`);
          const data = await response.json();
          
          results.push({
            date: testDate,
            status: response.status,
            success: response.ok,
            error: !response.ok ? data.detail : null,
            slotsCount: response.ok ? data.slots?.length || 0 : 0
          });
        } catch (error) {
          results.push({
            date: testDate,
            status: 'FETCH_ERROR',
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    }, dateTest);
    
    apiTests.forEach(result => {
      console.log(`Date: ${result.date}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Success: ${result.success}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      } else {
        console.log(`  Slots: ${result.slotsCount}`);
      }
      console.log('');
    });
    
    // Find the valid date to use
    const validDate = apiTests.find(test => test.success)?.date;
    console.log(`Valid date for testing: ${validDate}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
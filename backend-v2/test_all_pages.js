const puppeteer = require('puppeteer');

async function testAllPages() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const pages = [
    // Public pages
    { url: 'http://localhost:3000/', name: 'Homepage' },
    { url: 'http://localhost:3000/login', name: 'Login' },
    { url: 'http://localhost:3000/register', name: 'Register' },
    { url: 'http://localhost:3000/forgot-password', name: 'Forgot Password' },
    { url: 'http://localhost:3000/book', name: 'Book Appointment' },
    
    // Auth required pages
    { url: 'http://localhost:3000/dashboard', name: 'Dashboard' },
    { url: 'http://localhost:3000/settings', name: 'Settings' },
    { url: 'http://localhost:3000/bookings', name: 'Bookings' },
    { url: 'http://localhost:3000/calendar', name: 'Calendar' },
    { url: 'http://localhost:3000/clients', name: 'Clients' },
    { url: 'http://localhost:3000/analytics', name: 'Analytics' },
    { url: 'http://localhost:3000/notifications', name: 'Notifications' },
    { url: 'http://localhost:3000/payments', name: 'Payments' },
    
    // Admin pages
    { url: 'http://localhost:3000/admin', name: 'Admin Dashboard' },
    { url: 'http://localhost:3000/admin/services', name: 'Admin Services' },
    { url: 'http://localhost:3000/admin/booking-rules', name: 'Admin Booking Rules' },
    
    // Barber specific
    { url: 'http://localhost:3000/barber/availability', name: 'Barber Availability' },
    { url: 'http://localhost:3000/barber/earnings', name: 'Barber Earnings' },
    { url: 'http://localhost:3000/barber-availability', name: 'Barber Availability Management' },
  ];
  
  const results = [];
  
  for (const pageInfo of pages) {
    try {
      console.log(`Testing ${pageInfo.name}...`);
      const response = await page.goto(pageInfo.url, { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });
      
      // Check for console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Wait a bit to catch any delayed errors
      await page.waitForTimeout(1000);
      
      const status = response.status();
      const title = await page.title();
      const hasError = await page.$('body').then(async (body) => {
        const text = await page.evaluate(el => el.textContent, body);
        return text.includes('Error') || text.includes('error') || text.includes('failed');
      }).catch(() => false);
      
      results.push({
        name: pageInfo.name,
        url: pageInfo.url,
        status,
        title,
        hasError,
        consoleErrors,
        accessible: status < 400
      });
      
    } catch (error) {
      results.push({
        name: pageInfo.name,
        url: pageInfo.url,
        status: 'ERROR',
        error: error.message,
        accessible: false
      });
    }
  }
  
  await browser.close();
  
  // Print summary
  console.log('\n=== Page Test Results ===\n');
  
  const working = results.filter(r => r.accessible && !r.hasError);
  const notWorking = results.filter(r => !r.accessible || r.hasError);
  
  console.log(`✅ Working Pages (${working.length}):`);
  working.forEach(r => {
    console.log(`  - ${r.name}: ${r.status} - ${r.title}`);
  });
  
  console.log(`\n❌ Not Working Pages (${notWorking.length}):`);
  notWorking.forEach(r => {
    console.log(`  - ${r.name}: ${r.status} - ${r.error || 'Has errors'}`);
    if (r.consoleErrors?.length > 0) {
      console.log(`    Console errors: ${r.consoleErrors.join(', ')}`);
    }
  });
  
  // Test API connectivity
  console.log('\n=== API Connectivity Test ===\n');
  
  try {
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:8000/health');
      return {
        status: response.status,
        data: await response.json()
      };
    });
    console.log(`Backend API Health: ${apiResponse.status} - ${JSON.stringify(apiResponse.data)}`);
  } catch (error) {
    console.log(`Backend API Error: ${error.message}`);
  }
  
  return results;
}

testAllPages().catch(console.error);
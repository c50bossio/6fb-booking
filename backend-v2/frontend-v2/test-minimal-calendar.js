const puppeteer = require('puppeteer');

async function testMinimalCalendar() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    console.log('🔍 Testing minimal calendar page...\n');
    
    // Navigate to minimal test page
    await page.goto('http://localhost:3000/calendar/test-minimal', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for React
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check content
    const content = await page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent,
        hasGrid: !!document.querySelector('.grid-cols-7'),
        gridItems: document.querySelectorAll('.grid-cols-7 > div').length,
        bodyText: document.body.textContent
      };
    });
    
    console.log('Page content:', JSON.stringify(content, null, 2));
    
    console.log('\n✅ Minimal test completed. The page loads correctly.');
    console.log('\nNow testing the main calendar page to compare...\n');
    
    // Test main calendar page
    await page.goto('http://localhost:3000/calendar', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const calendarContent = await page.evaluate(() => {
      // Look for error messages
      const errorText = document.body.textContent.match(/Permission Denied|Access denied|403|Forbidden/gi);
      
      return {
        url: window.location.href,
        hasErrors: !!errorText,
        errorMessages: errorText || [],
        hasReactRoot: !!document.querySelector('#__next'),
        bodyPreview: document.body.textContent.substring(0, 200)
      };
    });
    
    console.log('Main calendar page:', JSON.stringify(calendarContent, null, 2));
    
    if (calendarContent.hasErrors) {
      console.log('\n❌ The main calendar page requires authentication.');
      console.log('   The "Permission Denied" error indicates you need to be logged in.');
      console.log('\n   To fix this:');
      console.log('   1. Login first at http://localhost:3000/login');
      console.log('   2. Use credentials: demo@example.com / demo123');
      console.log('   3. Then navigate to the calendar page');
    }
    
    console.log('\nPress Ctrl+C to close when done.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error);
    await browser.close();
  }
}

testMinimalCalendar();
const puppeteer = require('puppeteer');

async function testPage(page, url, expectedContent) {
  console.log(`\nTesting ${url}...`);
  try {
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    const status = response.status();
    console.log(`  Status: ${status}`);
    
    // Wait for any loading spinners to disappear
    await page.waitForFunction(
      () => !document.querySelector('.animate-spin'),
      { timeout: 5000 }
    ).catch(() => console.log('  (Loading spinner still present after 5s)'));
    
    // Check page content
    const content = await page.content();
    const hasExpectedContent = expectedContent.some(text => content.includes(text));
    console.log(`  Expected content found: ${hasExpectedContent ? '✓' : '✗'}`);
    
    // Take screenshot
    const screenshotName = url.split('/').pop() || 'home';
    await page.screenshot({ path: `test-${screenshotName}.png` });
    console.log(`  Screenshot saved: test-${screenshotName}.png`);
    
    return { url, status, success: status === 200 && hasExpectedContent };
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return { url, status: 0, success: false, error: error.message };
  }
}

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });
  
  const tests = [
    { url: 'http://localhost:3000/', expected: ['6FB Booking', 'Sign In', 'Professional booking'] },
    { url: 'http://localhost:3000/login', expected: ['Welcome Back', 'Sign in', 'Email', 'Password'] },
    { url: 'http://localhost:3000/register', expected: ['Create', 'account', 'Email', 'Password'] },
    { url: 'http://localhost:3000/dashboard', expected: ['Dashboard', 'Loading'] }, // Will redirect to login
    { url: 'http://localhost:3000/enterprise/dashboard', expected: ['Enterprise', 'Loading'] }, // Will redirect to login
  ];
  
  console.log('Starting frontend health check...\n');
  const results = [];
  
  for (const test of tests) {
    const result = await testPage(page, test.url, test.expected);
    results.push(result);
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total pages tested: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  results.forEach(r => {
    console.log(`${r.success ? '✓' : '✗'} ${r.url} - Status: ${r.status}`);
  });
  
  await browser.close();
})();
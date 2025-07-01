const puppeteer = require('puppeteer');

async function simpleTest() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Go directly to notifications page without auth check
    console.log('Going to notifications page...');
    await page.goto('http://localhost:3000/notifications', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    await page.screenshot({ 
      path: 'current_page_state.png',
      fullPage: true 
    });
    
    // Check what's on the page
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasHeader: document.querySelector('header') !== null,
        hasMain: document.querySelector('main') !== null,
        bodyText: document.body.innerText.substring(0, 200)
      };
    });
    
    console.log('Page info:', JSON.stringify(pageInfo, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
}

simpleTest();
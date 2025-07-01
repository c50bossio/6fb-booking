const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'homepage-screenshot.png', fullPage: true });
    
    // Log the page title and any visible text
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for the dark bar text
    const darkBarText = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (let el of elements) {
        if (el.textContent && el.textContent.includes('BookBarber') && !el.textContent.includes('BookedBarber')) {
          const styles = window.getComputedStyle(el);
          return {
            text: el.textContent.trim(),
            background: styles.backgroundColor,
            color: styles.color,
            position: el.getBoundingClientRect()
          };
        }
      }
      return null;
    });
    
    if (darkBarText) {
      console.log('Found BookBarber text:', darkBarText);
    }
    
    // Check for sidebar presence
    const sidebar = await page.evaluate(() => {
      const sidebarEl = document.querySelector('[class*="sidebar"]') || document.querySelector('aside');
      if (sidebarEl) {
        const rect = sidebarEl.getBoundingClientRect();
        return {
          visible: rect.width > 0 && rect.height > 0,
          position: rect
        };
      }
      return null;
    });
    
    if (sidebar) {
      console.log('Sidebar found:', sidebar);
    }
    
    console.log('Screenshot saved as homepage-screenshot.png');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
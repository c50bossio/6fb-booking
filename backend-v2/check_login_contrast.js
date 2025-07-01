const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
  
  // Set dark mode preference
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
  
  // Wait for the login form to be visible
  await page.waitForSelector('form', { timeout: 5000 });
  
  // Get all text elements and their computed styles
  const textElements = await page.evaluate(() => {
    const elements = [];
    
    // Get all text elements
    const selectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'label', 'a', 'button', 'span', 'div'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.textContent.trim()) {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          
          if (rect.width > 0 && rect.height > 0) {
            elements.push({
              tagName: el.tagName,
              text: el.textContent.trim().substring(0, 50),
              color: styles.color,
              backgroundColor: styles.backgroundColor,
              fontSize: styles.fontSize,
              fontWeight: styles.fontWeight,
              className: el.className,
              id: el.id
            });
          }
        }
      });
    });
    
    // Also get input elements
    document.querySelectorAll('input').forEach(input => {
      const styles = window.getComputedStyle(input);
      const label = input.labels?.[0];
      
      elements.push({
        tagName: 'INPUT',
        type: input.type,
        placeholder: input.placeholder,
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        label: label?.textContent || input.id || input.name,
        className: input.className
      });
    });
    
    return elements;
  });
  
  console.log('Text Elements and Their Styles:');
  console.log('================================');
  
  textElements.forEach(el => {
    if (el.tagName === 'INPUT') {
      console.log(`\n${el.tagName} (${el.type}) - Label: "${el.label}"`);
      console.log(`  Placeholder: ${el.placeholder || 'none'}`);
    } else {
      console.log(`\n${el.tagName} - "${el.text}"`);
    }
    console.log(`  Color: ${el.color}`);
    console.log(`  Background: ${el.backgroundColor}`);
    console.log(`  Classes: ${el.className}`);
  });
  
  // Check for low contrast combinations
  console.log('\n\nPotential Contrast Issues:');
  console.log('==========================');
  
  textElements.forEach(el => {
    // Simple contrast check - dark grays on light backgrounds
    if (el.color && el.color.includes('rgb')) {
      const colorMatch = el.color.match(/\d+/g);
      if (colorMatch) {
        const [r, g, b] = colorMatch.map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        if (brightness < 100 && !el.backgroundColor.includes('rgb(0, 0, 0)')) {
          console.log(`\nLow contrast detected:`);
          console.log(`  Element: ${el.tagName} - "${el.text || el.label}"`);
          console.log(`  Color: ${el.color} (brightness: ${brightness.toFixed(0)})`);
          console.log(`  Classes: ${el.className}`);
        }
      }
    }
  });
  
  await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
})();
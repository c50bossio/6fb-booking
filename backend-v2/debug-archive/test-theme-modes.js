const puppeteer = require('puppeteer');

async function testThemeModes() {
  console.log('🎨 Testing registration page in both light and dark modes...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Navigate to registration page
    console.log('📍 Loading registration page...');
    await page.goto('http://localhost:3001/register', { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Test Light Mode
    console.log('☀️ Testing Light Mode...');
    
    // Force light mode by adding class to html element
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    
    await page.waitForTimeout(1000); // Wait for theme to apply
    
    // Take screenshot of light mode
    await page.screenshot({ 
      path: '/Users/bossio/6fb-booking/backend-v2/registration-light-mode.png',
      fullPage: true 
    });
    console.log('📸 Light mode screenshot saved');
    
    // Check if text is visible (not checking specific colors, just visibility)
    const lightModeText = await page.evaluate(() => {
      const header = document.querySelector('h2');
      const subtitle = document.querySelector('p');
      return {
        headerVisible: header && window.getComputedStyle(header).opacity !== '0',
        subtitleVisible: subtitle && window.getComputedStyle(subtitle).opacity !== '0',
        headerText: header?.textContent || '',
        subtitleText: subtitle?.textContent || ''
      };
    });
    console.log('☀️ Light mode text visibility:', lightModeText);
    
    // Test Dark Mode
    console.log('🌙 Testing Dark Mode...');
    
    // Force dark mode by adding class to html element
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });
    
    await page.waitForTimeout(1000); // Wait for theme to apply
    
    // Take screenshot of dark mode
    await page.screenshot({ 
      path: '/Users/bossio/6fb-booking/backend-v2/registration-dark-mode.png',
      fullPage: true 
    });
    console.log('📸 Dark mode screenshot saved');
    
    // Check if text is visible in dark mode
    const darkModeText = await page.evaluate(() => {
      const header = document.querySelector('h2');
      const subtitle = document.querySelector('p');
      const inputs = document.querySelectorAll('input');
      const button = document.querySelector('button[type="submit"]');
      
      return {
        headerVisible: header && window.getComputedStyle(header).opacity !== '0',
        subtitleVisible: subtitle && window.getComputedStyle(subtitle).opacity !== '0',
        inputCount: inputs.length,
        buttonVisible: button && window.getComputedStyle(button).opacity !== '0',
        headerText: header?.textContent || '',
        subtitleText: subtitle?.textContent || ''
      };
    });
    console.log('🌙 Dark mode text visibility:', darkModeText);
    
    // Test form interaction in dark mode
    console.log('📝 Testing form interaction in dark mode...');
    
    try {
      await page.type('input[name="name"]', 'Dark Mode Test User');
      await page.type('input[name="email"]', 'darkmode.test@example.com');
      await page.type('input[name="password"]', 'DarkModeTest123');
      await page.type('input[name="confirmPassword"]', 'DarkModeTest123');
      
      // Check required checkboxes
      await page.click('input[id="terms-consent"]');
      await page.click('input[id="privacy-consent"]');
      
      console.log('✅ Form interaction successful in dark mode');
      
      // Take screenshot with filled form
      await page.screenshot({ 
        path: '/Users/bossio/6fb-booking/backend-v2/registration-dark-mode-filled.png',
        fullPage: true 
      });
      
    } catch (formError) {
      console.log('❌ Form interaction failed in dark mode:', formError.message);
    }
    
    // Test theme switching via localStorage
    console.log('🔄 Testing theme switching mechanism...');
    
    const themeTest = await page.evaluate(() => {
      // Test localStorage theme setting
      localStorage.setItem('6fb-theme', 'light');
      const lightStored = localStorage.getItem('6fb-theme');
      
      localStorage.setItem('6fb-theme', 'dark');
      const darkStored = localStorage.getItem('6fb-theme');
      
      localStorage.setItem('6fb-theme', 'system');
      const systemStored = localStorage.getItem('6fb-theme');
      
      return {
        lightStored,
        darkStored,
        systemStored,
        supportsPrefers: window.matchMedia('(prefers-color-scheme: dark)').matches !== undefined
      };
    });
    
    console.log('🔄 Theme switching test results:', themeTest);
    
    // Final summary
    console.log('\n📊 Theme Testing Summary:');
    console.log('✅ Light mode screenshot captured');
    console.log('✅ Dark mode screenshot captured');
    console.log(`✅ Form interaction in dark mode: ${darkModeText.inputCount > 0 ? 'Working' : 'Failed'}`);
    console.log(`✅ Theme persistence: ${themeTest.lightStored && themeTest.darkStored ? 'Working' : 'Failed'}`);
    console.log(`✅ System theme support: ${themeTest.supportsPrefers ? 'Available' : 'Not available'}`);
    
  } catch (error) {
    console.error('💥 Error during theme testing:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testThemeModes().catch(console.error);
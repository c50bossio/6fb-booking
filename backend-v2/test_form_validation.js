const puppeteer = require('puppeteer');

async function testFormValidation() {
  console.log('🔍 Form Validation Test\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('1. Navigate to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Accept cookies
    try {
      await page.click('button:has-text("Accept All")', { timeout: 1000 });
    } catch (e) {}
    
    console.log('\n2. Check initial form state...');
    let formState = await page.evaluate(() => {
      const emailInput = document.querySelector('#email');
      const passwordInput = document.querySelector('#password');
      const submitButton = document.querySelector('button[type="submit"]');
      
      return {
        emailValue: emailInput?.value || '',
        passwordValue: passwordInput?.value || '',
        submitDisabled: submitButton?.disabled,
        submitClasses: submitButton?.className,
        hasForm: !!document.querySelector('form')
      };
    });
    
    console.log('Initial state:', formState);
    
    console.log('\n3. Type email...');
    await page.type('#email', 'admin@bookedbarber.com');
    
    formState = await page.evaluate(() => {
      const submitButton = document.querySelector('button[type="submit"]');
      return {
        submitDisabled: submitButton?.disabled,
        emailValue: document.querySelector('#email')?.value
      };
    });
    console.log('After email:', formState);
    
    console.log('\n4. Type password...');
    await page.type('#password', 'admin123');
    
    formState = await page.evaluate(() => {
      const submitButton = document.querySelector('button[type="submit"]');
      return {
        submitDisabled: submitButton?.disabled,
        passwordValue: document.querySelector('#password')?.value ? '***' : ''
      };
    });
    console.log('After password:', formState);
    
    console.log('\n5. Try to submit form...');
    
    // Method 1: Click button
    const clicked = await page.evaluate(() => {
      const button = document.querySelector('button[type="submit"]');
      if (button && !button.disabled) {
        console.log('Clicking submit button...');
        button.click();
        return true;
      }
      return false;
    });
    
    console.log('Button clicked:', clicked);
    
    // Method 2: Submit form directly
    if (!clicked) {
      console.log('\n6. Trying form.submit()...');
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          console.log('Submitting form directly...');
          form.requestSubmit();
        }
      });
    }
    
    // Wait and check result
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalUrl = page.url();
    console.log('\n📍 Final URL:', finalUrl);
    
    // Check for errors
    const errors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('.text-destructive, [role="alert"], .error');
      return Array.from(errorElements).map(e => e.textContent?.trim());
    });
    
    if (errors.length > 0) {
      console.log('❌ Form errors:', errors);
    }
    
    // Check console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    console.log('\nTest complete. Browser will stay open...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

testFormValidation().catch(console.error);
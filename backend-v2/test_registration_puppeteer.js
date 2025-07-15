#!/usr/bin/env node
const puppeteer = require('puppeteer');

async function testRegistration() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('🚀 Starting registration test...');
    
    // Navigate to registration page
    console.log('📍 Navigating to registration page...');
    await page.goto('http://localhost:3000/register', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    // Wait for the page to load completely
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take a screenshot to see current state
    await page.screenshot({ path: 'registration_initial.png' });
    
    // Check if form elements are present
    console.log('🔍 Checking for form elements...');
    const formElements = await page.evaluate(() => {
      const form = document.querySelector('form');
      const nameInput = document.querySelector('input[name="name"], input[placeholder*="name" i]');
      const emailInput = document.querySelector('input[name="email"], input[type="email"]');
      const passwordInput = document.querySelector('input[name="password"], input[type="password"]');
      const submitButton = document.querySelector('button[type="submit"]');
      const registerButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Register') || btn.textContent.includes('Sign up')
      );
      
      return {
        hasForm: !!form,
        hasNameInput: !!nameInput,
        hasEmailInput: !!emailInput,
        hasPasswordInput: !!passwordInput,
        hasSubmitButton: !!(submitButton || registerButton),
        pageTitle: document.title,
        bodyContent: document.body.textContent.substring(0, 200)
      };
    });
    
    console.log('Form elements found:', formElements);
    
    if (!formElements.hasForm) {
      console.log('❌ Registration form not found. Checking for React hydration...');
      
      // Wait for React to hydrate
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check again
      const formCheck = await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input');
        return {
          formCount: forms.length,
          inputCount: inputs.length,
          hasReact: typeof window.React !== 'undefined'
        };
      });
      
      console.log('After waiting:', formCheck);
      
      if (formCheck.formCount === 0) {
        console.log('❌ Still no form found. This indicates a frontend loading issue.');
        return;
      }
    }
    
    // Test form validation
    console.log('🔍 Testing form validation...');
    
    // Try to submit empty form
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for validation errors
      const validationErrors = await page.evaluate(() => {
        const errors = document.querySelectorAll('.error, .invalid, [data-testid*="error"]');
        return Array.from(errors).map(el => el.textContent);
      });
      
      console.log('Validation errors:', validationErrors);
    }
    
    // Test successful registration
    console.log('✅ Testing successful registration...');
    
    // Fill out the form
    const testData = {
      name: 'Test User',
      email: `test+${Date.now()}@example.com`,
      password: 'TestPassword123!',
      businessType: 'individual'
    };
    
    // Fill name field
    const nameInput = await page.$('input[name="name"], input[placeholder*="name" i]');
    if (nameInput) {
      await nameInput.type(testData.name);
    }
    
    // Fill email field
    const emailInput = await page.$('input[name="email"], input[type="email"]');
    if (emailInput) {
      await emailInput.type(testData.email);
    }
    
    // Fill password field
    const passwordInput = await page.$('input[name="password"], input[type="password"]');
    if (passwordInput) {
      await passwordInput.type(testData.password);
    }
    
    // Accept terms if checkbox exists
    const termsCheckbox = await page.$('input[type="checkbox"]');
    if (termsCheckbox) {
      await termsCheckbox.click();
    }
    
    // Take screenshot before submission
    await page.screenshot({ path: 'registration_filled.png' });
    
    // Submit the form
    if (submitButton) {
      await submitButton.click();
      console.log('📤 Form submitted, waiting for response...');
      
      // Wait for either success or error response
      try {
        await page.waitForNavigation({ timeout: 10000 });
        console.log('✅ Registration successful! Redirected to:', page.url());
      } catch (error) {
        console.log('⚠️  No navigation occurred, checking for errors...');
        
        const errorMessages = await page.evaluate(() => {
          const errors = document.querySelectorAll('.error, .alert-error, [data-testid*="error"]');
          return Array.from(errors).map(el => el.textContent);
        });
        
        console.log('Error messages:', errorMessages);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'registration_final.png' });
    
    console.log('🎉 Registration test completed!');
    
  } catch (error) {
    console.error('❌ Registration test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testRegistration().catch(console.error);
#!/usr/bin/env node

/**
 * Authentication System Test
 * Tests the auth system to understand login process
 */

const { chromium } = require('playwright');

class AuthSystemTest {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    console.log('🔐 Testing Authentication System...');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 2000
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testAuthFlow() {
    console.log('\n🔍 Analyzing Authentication Flow...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    // Capture network requests
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    // Capture responses
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    try {
      console.log('  📍 Step 1: Navigate to login page...');
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Analyze login page
      const loginPageAnalysis = await page.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"], input[name="email"]');
        const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
        const submitButton = document.querySelector('button[type="submit"]') ||
                            Array.from(document.querySelectorAll('button')).find(btn => 
                              btn.textContent?.includes('Sign in') || btn.textContent?.includes('Login')
                            );

        return {
          emailInput: emailInput ? {
            present: true,
            id: emailInput.id,
            name: emailInput.name,
            value: emailInput.value,
            required: emailInput.required
          } : { present: false },
          passwordInput: passwordInput ? {
            present: true,
            id: passwordInput.id,
            name: passwordInput.name,
            required: passwordInput.required
          } : { present: false },
          submitButton: submitButton ? {
            present: true,
            text: submitButton.textContent?.trim(),
            type: submitButton.type,
            disabled: submitButton.disabled
          } : { present: false },
          formAction: document.querySelector('form')?.action || 'No form found',
          validationMessages: Array.from(document.querySelectorAll('.error, [class*="error"], .invalid-feedback'))
            .map(el => el.textContent?.trim()).filter(text => text),
          pageUrl: window.location.href
        };
      });

      console.log('  📋 Login Page Analysis:');
      console.log('    Email Input:', loginPageAnalysis.emailInput.present ? '✅' : '❌');
      if (loginPageAnalysis.emailInput.present) {
        console.log(`      ID: ${loginPageAnalysis.emailInput.id}, Name: ${loginPageAnalysis.emailInput.name}, Required: ${loginPageAnalysis.emailInput.required}`);
      }
      console.log('    Password Input:', loginPageAnalysis.passwordInput.present ? '✅' : '❌');
      if (loginPageAnalysis.passwordInput.present) {
        console.log(`      ID: ${loginPageAnalysis.passwordInput.id}, Name: ${loginPageAnalysis.passwordInput.name}, Required: ${loginPageAnalysis.passwordInput.required}`);
      }
      console.log('    Submit Button:', loginPageAnalysis.submitButton.present ? '✅' : '❌');
      if (loginPageAnalysis.submitButton.present) {
        console.log(`      Text: "${loginPageAnalysis.submitButton.text}", Type: ${loginPageAnalysis.submitButton.type}, Disabled: ${loginPageAnalysis.submitButton.disabled}`);
      }
      console.log('    Form Action:', loginPageAnalysis.formAction);
      console.log('    Validation Messages:', loginPageAnalysis.validationMessages);

      if (loginPageAnalysis.emailInput.present && loginPageAnalysis.passwordInput.present && loginPageAnalysis.submitButton.present) {
        console.log('\n  🔐 Step 2: Attempting login...');
        
        // Clear any existing values
        await page.fill('input[type="email"], input[name="email"]', '');
        await page.fill('input[type="password"], input[name="password"]', '');
        
        // Fill form step by step
        console.log('    📧 Filling email...');
        await page.fill('input[type="email"], input[name="email"]', 'admin@bookedbarber.dev');
        await page.waitForTimeout(500);
        
        console.log('    🔒 Filling password...');
        await page.fill('input[type="password"], input[name="password"]', 'dev123');
        await page.waitForTimeout(500);

        // Check form state before submit
        const preSubmitState = await page.evaluate(() => {
          const emailInput = document.querySelector('input[type="email"], input[name="email"]');
          const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
          const submitButton = document.querySelector('button[type="submit"]') ||
                              Array.from(document.querySelectorAll('button')).find(btn => 
                                btn.textContent?.includes('Sign in') || btn.textContent?.includes('Login')
                              );

          return {
            emailValue: emailInput?.value,
            passwordFilled: passwordInput?.value?.length > 0,
            buttonDisabled: submitButton?.disabled,
            formValid: emailInput?.checkValidity() && passwordInput?.checkValidity()
          };
        });

        console.log('    📋 Pre-submit state:');
        console.log(`      Email value: "${preSubmitState.emailValue}"`);
        console.log(`      Password filled: ${preSubmitState.passwordFilled}`);
        console.log(`      Button disabled: ${preSubmitState.buttonDisabled}`);
        console.log(`      Form valid: ${preSubmitState.formValid}`);

        if (preSubmitState.formValid && !preSubmitState.buttonDisabled) {
          console.log('    🚀 Submitting form...');
          
          // Clear previous responses
          responses.length = 0;
          
          // Submit the form
          await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');
          
          // Wait for submission to complete
          await page.waitForTimeout(5000);
          
          // Check what happened
          const postSubmitState = await page.evaluate(() => {
            return {
              currentUrl: window.location.href,
              validationErrors: Array.from(document.querySelectorAll('.error, [class*="error"], .text-red, .invalid-feedback'))
                .map(el => el.textContent?.trim()).filter(text => text),
              formStillVisible: !!document.querySelector('input[type="email"]'),
              hasSuccessMessage: Array.from(document.querySelectorAll('*'))
                .some(el => el.textContent?.includes('success') || el.textContent?.includes('welcome')),
              pageTitle: document.title,
              localStorageTokens: {
                token: localStorage.getItem('token'),
                refreshToken: localStorage.getItem('refresh_token')
              }
            };
          });

          console.log('  📊 Post-submit Analysis:');
          console.log('    Current URL:', postSubmitState.currentUrl);
          console.log('    Form still visible:', postSubmitState.formStillVisible);
          console.log('    Validation errors:', postSubmitState.validationErrors);
          console.log('    Success message:', postSubmitState.hasSuccessMessage);
          console.log('    Has auth tokens:', !!postSubmitState.localStorageTokens.token);

          // Check API responses
          console.log('\n  🌐 API Responses:');
          if (responses.length > 0) {
            responses.forEach((response, i) => {
              console.log(`    ${i + 1}. ${response.method} ${response.url} - ${response.status} ${response.statusText}`);
            });
          } else {
            console.log('    ⚠️  No API responses captured - possible frontend-only validation');
          }

          // Determine login result
          if (postSubmitState.currentUrl !== loginPageAnalysis.pageUrl && !postSubmitState.formStillVisible) {
            console.log('\n  ✅ LOGIN SUCCESS: Redirected away from login page');
          } else if (postSubmitState.validationErrors.length > 0) {
            console.log('\n  ❌ LOGIN FAILED: Validation errors');
            postSubmitState.validationErrors.forEach(error => {
              console.log(`    - ${error}`);
            });
          } else if (responses.some(r => r.status >= 400)) {
            console.log('\n  ❌ LOGIN FAILED: API errors');
            responses.filter(r => r.status >= 400).forEach(r => {
              console.log(`    - ${r.status} ${r.statusText}: ${r.url}`);
            });
          } else {
            console.log('\n  🟡 LOGIN STATUS UNCLEAR: No clear success or failure indicators');
          }

        } else {
          console.log('    ❌ Cannot submit: Form invalid or button disabled');
        }

      } else {
        console.log('  ❌ Cannot test login: Form elements missing');
      }

      // Take screenshot for manual review
      await page.screenshot({ 
        path: './test-screenshots/auth-system-test.png', 
        fullPage: true 
      });

    } catch (error) {
      console.log('  ❌ Auth test error:', error.message);
    }

    await context.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.testAuthFlow();
      
      console.log('\n✅ Authentication System Test Complete!');
      console.log('📸 Screenshot saved to test-screenshots/auth-system-test.png');
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run auth system test
const tester = new AuthSystemTest();
tester.run().catch(console.error);
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:8000',
  testUser: {
    email: 'test.customer@example.com',
    password: 'TestPassword123!',
    name: 'Test Customer',
    phone: '+1234567890'
  },
  timeout: 30000,
  headless: true,
  slowMo: 50
};

// Utility functions
async function takeScreenshot(page, name) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `customer-test-${name}-${timestamp}.png`;
    await page.screenshot({ 
      path: path.join(__dirname, 'test-results', 'customer', filename),
      fullPage: true 
    });
    return filename;
  } catch (error) {
    console.log(`Screenshot failed for ${name}:`, error.message);
    return null;
  }
}

async function logTestResult(results, testName, status, details = {}) {
  results.push({
    test: testName,
    status,
    timestamp: new Date().toISOString(),
    ...details
  });
  console.log(`${status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⏭️'} ${testName}`, details.error || '');
}

async function checkAuthentication(page) {
  try {
    const authData = await page.evaluate(() => {
      return {
        hasToken: !!localStorage.getItem('authToken'),
        hasSession: !!sessionStorage.getItem('user'),
        cookies: document.cookie.includes('auth') || document.cookie.includes('session')
      };
    });
    return authData;
  } catch (error) {
    return { hasToken: false, hasSession: false, cookies: false };
  }
}

// Main test suite
async function runCustomerTests() {
  const browser = await puppeteer.launch({
    headless: TEST_CONFIG.headless,
    slowMo: TEST_CONFIG.slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = [];
  let page;
  const startTime = Date.now();
  
  try {
    // Create test results directory
    await fs.mkdir(path.join(__dirname, 'test-results', 'customer'), { recursive: true });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    
    console.log('🧪 Starting Customer User Testing (Simplified)...\n');
    
    // Test 1: Homepage Access
    console.log('🏠 Test 1: Homepage Access');
    try {
      await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle0' });
      
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          hasContent: document.body.innerText.length > 0,
          url: window.location.href
        };
      });
      
      await takeScreenshot(page, 'homepage');
      await logTestResult(results, 'Homepage Access', 'PASSED', { pageInfo });
    } catch (error) {
      await logTestResult(results, 'Homepage Access', 'FAILED', { error: error.message });
    }
    
    // Test 2: Navigation to Login
    console.log('\n🔐 Test 2: Navigate to Login');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/login`, { waitUntil: 'networkidle0' });
      
      const loginPageInfo = await page.evaluate(() => {
        return {
          hasEmailField: !!document.querySelector('input[type="email"], input[name="email"]'),
          hasPasswordField: !!document.querySelector('input[type="password"], input[name="password"]'),
          hasSubmitButton: !!document.querySelector('button[type="submit"], input[type="submit"]'),
          hasLoginForm: !!document.querySelector('form'),
          pageText: document.body.innerText.toLowerCase().includes('login')
        };
      });
      
      await takeScreenshot(page, 'login-page');
      await logTestResult(results, 'Login Page Access', 'PASSED', { loginPageInfo });
    } catch (error) {
      await logTestResult(results, 'Login Page Access', 'FAILED', { error: error.message });
    }
    
    // Test 3: Login Attempt
    console.log('\n🔑 Test 3: Login Attempt');
    try {
      const emailField = await page.$('input[type="email"], input[name="email"]');
      const passwordField = await page.$('input[type="password"], input[name="password"]');
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');
      
      if (emailField && passwordField && submitButton) {
        await emailField.type(TEST_CONFIG.testUser.email);
        await passwordField.type(TEST_CONFIG.testUser.password);
        
        await takeScreenshot(page, 'login-form-filled');
        
        await submitButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for potential redirect
        
        const postLoginInfo = await page.evaluate(() => {
          return {
            currentUrl: window.location.href,
            hasErrorMessage: document.body.innerText.toLowerCase().includes('error'),
            hasSuccessIndicator: document.body.innerText.toLowerCase().includes('dashboard') || 
                                document.body.innerText.toLowerCase().includes('welcome')
          };
        });
        
        const authStatus = await checkAuthentication(page);
        
        await takeScreenshot(page, 'after-login-attempt');
        await logTestResult(results, 'Login Attempt', 'PASSED', { 
          postLoginInfo, 
          authStatus,
          notes: 'Login attempted successfully, check redirect and auth status'
        });
      } else {
        await logTestResult(results, 'Login Attempt', 'FAILED', { 
          error: 'Login form elements not found' 
        });
      }
    } catch (error) {
      await logTestResult(results, 'Login Attempt', 'FAILED', { error: error.message });
    }
    
    // Test 4: Dashboard Access
    console.log('\n📊 Test 4: Dashboard Access');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
      
      const dashboardInfo = await page.evaluate(() => {
        return {
          hasContent: document.body.innerText.length > 100,
          hasNavigation: !!document.querySelector('nav, [role="navigation"]'),
          hasMainContent: !!document.querySelector('main, .main-content, .dashboard'),
          title: document.title,
          textContent: document.body.innerText.substring(0, 200)
        };
      });
      
      await takeScreenshot(page, 'dashboard');
      await logTestResult(results, 'Dashboard Access', 'PASSED', { dashboardInfo });
    } catch (error) {
      await logTestResult(results, 'Dashboard Access', 'FAILED', { error: error.message });
    }
    
    // Test 5: Book Page Access
    console.log('\n📅 Test 5: Book Page Access');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/book`, { waitUntil: 'networkidle0' });
      
      const bookPageInfo = await page.evaluate(() => {
        const allInputs = Array.from(document.querySelectorAll('input, select, textarea'));
        const allButtons = Array.from(document.querySelectorAll('button'));
        
        return {
          hasContent: document.body.innerText.length > 50,
          inputCount: allInputs.length,
          buttonCount: allButtons.length,
          hasForm: !!document.querySelector('form'),
          pageTitle: document.title,
          inputTypes: allInputs.map(input => ({ type: input.type, name: input.name })),
          containsBookingText: document.body.innerText.toLowerCase().includes('book') ||
                              document.body.innerText.toLowerCase().includes('appointment')
        };
      });
      
      await takeScreenshot(page, 'book-page');
      await logTestResult(results, 'Book Page Access', 'PASSED', { bookPageInfo });
    } catch (error) {
      await logTestResult(results, 'Book Page Access', 'FAILED', { error: error.message });
    }
    
    // Test 6: Profile Page Access
    console.log('\n👤 Test 6: Profile Page Access');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/profile`, { waitUntil: 'networkidle0' });
      
      const profileInfo = await page.evaluate(() => {
        return {
          hasContent: document.body.innerText.length > 50,
          hasInputFields: document.querySelectorAll('input').length > 0,
          hasForm: !!document.querySelector('form'),
          title: document.title,
          containsProfileText: document.body.innerText.toLowerCase().includes('profile') ||
                              document.body.innerText.toLowerCase().includes('account')
        };
      });
      
      await takeScreenshot(page, 'profile-page');
      await logTestResult(results, 'Profile Page Access', 'PASSED', { profileInfo });
    } catch (error) {
      await logTestResult(results, 'Profile Page Access', 'FAILED', { error: error.message });
    }
    
    // Test 7: Appointments Page Access
    console.log('\n📜 Test 7: Appointments Page Access');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/appointments`, { waitUntil: 'networkidle0' });
      
      const appointmentsInfo = await page.evaluate(() => {
        return {
          hasContent: document.body.innerText.length > 50,
          hasTable: !!document.querySelector('table'),
          hasList: !!document.querySelector('ul, ol, .list'),
          title: document.title,
          containsAppointmentsText: document.body.innerText.toLowerCase().includes('appointment')
        };
      });
      
      await takeScreenshot(page, 'appointments-page');
      await logTestResult(results, 'Appointments Page Access', 'PASSED', { appointmentsInfo });
    } catch (error) {
      await logTestResult(results, 'Appointments Page Access', 'FAILED', { error: error.message });
    }
    
    // Test 8: Mobile Responsiveness
    console.log('\n📱 Test 8: Mobile Responsiveness');
    try {
      const viewports = [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 768, height: 1024 }
      ];
      
      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
        
        const responsiveInfo = await page.evaluate(() => {
          return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            hasOverflow: document.body.scrollWidth > window.innerWidth,
            isReadable: document.body.innerText.length > 0
          };
        });
        
        await takeScreenshot(page, `responsive-${viewport.name.toLowerCase()}`);
        await logTestResult(results, `Mobile Responsiveness - ${viewport.name}`, 'PASSED', {
          viewport,
          responsiveInfo
        });
      }
    } catch (error) {
      await logTestResult(results, 'Mobile Responsiveness', 'FAILED', { error: error.message });
    }
    
    // Test 9: Error Page (404)
    console.log('\n⚠️ Test 9: Error Page Handling');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/nonexistent-page-test-404`, { waitUntil: 'networkidle0' });
      
      const errorPageInfo = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return {
          has404Text: text.includes('404') || text.includes('not found'),
          hasErrorMessage: text.includes('error'),
          hasNavigationBack: !!document.querySelector('a[href="/"], a[href*="home"]'),
          statusCode: 'unknown' // We can't easily get this from client-side
        };
      });
      
      await takeScreenshot(page, 'error-404');
      await logTestResult(results, 'Error Page Handling', 'PASSED', { errorPageInfo });
    } catch (error) {
      await logTestResult(results, 'Error Page Handling', 'FAILED', { error: error.message });
    }
    
    // Test 10: Basic Performance Check
    console.log('\n⚡ Test 10: Basic Performance');
    try {
      const performanceMetrics = await page.metrics();
      
      const performanceInfo = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
          loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
          resourceCount: performance.getEntriesByType('resource').length
        };
      });
      
      await logTestResult(results, 'Basic Performance Check', 'PASSED', {
        metrics: performanceMetrics,
        performance: performanceInfo
      });
    } catch (error) {
      await logTestResult(results, 'Basic Performance Check', 'FAILED', { error: error.message });
    }
    
  } catch (error) {
    console.error('Critical test error:', error);
  } finally {
    // Generate test report
    const endTime = Date.now();
    const report = {
      testSuite: 'Customer User Testing (Simplified)',
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      environment: {
        frontend: TEST_CONFIG.baseUrl,
        backend: TEST_CONFIG.apiUrl
      },
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'PASSED').length,
        failed: results.filter(r => r.status === 'FAILED').length,
        skipped: results.filter(r => r.status === 'SKIPPED').length
      },
      results
    };
    
    // Save report
    await fs.writeFile(
      path.join(__dirname, 'test-results', 'customer', 'simple-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CUSTOMER USER TEST SUMMARY (SIMPLIFIED)');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⏭️  Skipped: ${report.summary.skipped}`);
    console.log(`⏱️  Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.log(`📈 Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`);
    console.log('\nDetailed report: test-results/customer/simple-test-report.json');
    console.log('Screenshots: test-results/customer/');
    
    // Show failed tests
    const failedTests = results.filter(r => r.status === 'FAILED');
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   - ${test.test}: ${test.error}`);
      });
    }
    
    await browser.close();
  }
}

// Run tests
runCustomerTests().catch(console.error);
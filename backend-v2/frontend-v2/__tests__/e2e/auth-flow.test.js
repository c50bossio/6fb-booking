const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  frontendUrl: 'http://localhost:3001',
  backendUrl: 'http://localhost:8002',
  credentials: {
    email: 'test_claude@example.com',
    password: 'testpassword123'
  },
  timeout: 10000,
  screenshotDir: './test-screenshots'
};

// Ensure screenshot directory exists
if (!fs.existsSync(TEST_CONFIG.screenshotDir)) {
  fs.mkdirSync(TEST_CONFIG.screenshotDir, { recursive: true });
}

class AuthFlowTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async init() {
    console.log('🚀 Starting authentication flow test...');
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log(`❌ Console Error: ${text}`);
      } else if (type === 'warn') {
        console.log(`⚠️  Console Warning: ${text}`);
      } else {
        console.log(`📝 Console: ${text}`);
      }
    });

    // Monitor network failures
    this.page.on('requestfailed', request => {
      console.log(`🔴 Failed request: ${request.url()} - ${request.failure().errorText}`);
    });

    // Set timeout
    await this.page.setDefaultTimeout(TEST_CONFIG.timeout);
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    try {
      await testFunction();
      console.log(`✅ ${testName} - PASSED`);
      this.results.tests.push({ name: testName, status: 'PASSED' });
      this.results.passed++;
    } catch (error) {
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
      this.results.failed++;
      // Take screenshot on failure
      await this.takeScreenshot(`failed-${testName.replace(/\s+/g, '-').toLowerCase()}`);
    }
  }

  async takeScreenshot(name) {
    const timestamp = Date.now();
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(TEST_CONFIG.screenshotDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filepath}`);
    return filepath;
  }

  async navigateToLogin() {
    console.log(`🌐 Navigating to login page: ${TEST_CONFIG.frontendUrl}/login`);
    await this.page.goto(`${TEST_CONFIG.frontendUrl}/login`, { waitUntil: 'networkidle2' });
    await this.takeScreenshot('login-page');
  }

  async testLoginForm() {
    // Check if login form elements exist
    const emailField = await this.page.$('input[type="email"], input[name="email"]');
    const passwordField = await this.page.$('input[type="password"], input[name="password"]');
    const submitButton = await this.page.$('button[type="submit"], button:contains("Login"), button:contains("Sign In")');

    if (!emailField) throw new Error('Email field not found');
    if (!passwordField) throw new Error('Password field not found');
    if (!submitButton) throw new Error('Submit button not found');

    console.log('📝 Filling login form...');
    await this.page.type('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email);
    await this.page.type('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password);
    
    await this.takeScreenshot('login-form-filled');
    
    // Submit the form
    console.log('🔄 Submitting login form...');
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click('button[type="submit"], button:contains("Login"), button:contains("Sign In")')
    ]);
  }

  async testTokenStorage() {
    console.log('🔍 Checking token storage...');
    
    // Check localStorage for token
    const localStorage = await this.page.evaluate(() => {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token');
      return {
        token: token ? 'Present' : 'Missing',
        keys: Object.keys(localStorage)
      };
    });

    // Check sessionStorage for token
    const sessionStorage = await this.page.evaluate(() => {
      const token = sessionStorage.getItem('token') || sessionStorage.getItem('authToken') || sessionStorage.getItem('access_token');
      return {
        token: token ? 'Present' : 'Missing',
        keys: Object.keys(sessionStorage)
      };
    });

    console.log('📊 Storage Analysis:');
    console.log('  localStorage:', localStorage);
    console.log('  sessionStorage:', sessionStorage);

    if (localStorage.token === 'Missing' && sessionStorage.token === 'Missing') {
      throw new Error('Authentication token not found in localStorage or sessionStorage');
    }
  }

  async testProtectedRoutes() {
    const protectedRoutes = [
      '/dashboard',
      '/calendar',
      '/appointments',
      '/bookings',
      '/profile'
    ];

    console.log('🔐 Testing protected routes access...');
    
    for (const route of protectedRoutes) {
      console.log(`  Testing: ${route}`);
      try {
        await this.page.goto(`${TEST_CONFIG.frontendUrl}${route}`, { waitUntil: 'networkidle2' });
        
        // Check if we're still on the protected route (not redirected to login)
        const currentUrl = this.page.url();
        if (currentUrl.includes('/login')) {
          console.log(`    ⚠️  Redirected to login for ${route}`);
        } else if (currentUrl.includes(route)) {
          console.log(`    ✅ Successfully accessed ${route}`);
        } else {
          console.log(`    ❓ Unexpected redirect to ${currentUrl} for ${route}`);
        }
        
        await this.takeScreenshot(`protected-route-${route.replace('/', '')}`);
      } catch (error) {
        console.log(`    ❌ Failed to access ${route}: ${error.message}`);
      }
    }
  }

  async testTokenPersistence() {
    console.log('🔄 Testing token persistence across page refresh...');
    
    // Get current URL
    const currentUrl = this.page.url();
    
    // Refresh the page
    await this.page.reload({ waitUntil: 'networkidle2' });
    
    // Check if still authenticated (not redirected to login)
    const newUrl = this.page.url();
    if (newUrl.includes('/login')) {
      throw new Error('Session lost after page refresh - redirected to login');
    }
    
    // Check if token is still present
    const tokenExists = await this.page.evaluate(() => {
      return !!(localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') ||
                sessionStorage.getItem('token') || sessionStorage.getItem('authToken') || sessionStorage.getItem('access_token'));
    });
    
    if (!tokenExists) {
      throw new Error('Token not found after page refresh');
    }
  }

  async testLogout() {
    console.log('🚪 Testing logout functionality...');
    
    // Look for logout button or link
    const logoutSelectors = [
      'button:contains("Logout")',
      'button:contains("Sign Out")',
      'a:contains("Logout")',
      'a:contains("Sign Out")',
      '[data-testid="logout"]',
      '.logout-btn'
    ];
    
    let logoutElement = null;
    for (const selector of logoutSelectors) {
      try {
        logoutElement = await this.page.$(selector);
        if (logoutElement) break;
      } catch (e) {
        // Continue searching
      }
    }
    
    if (!logoutElement) {
      // Try to find logout in dropdown or menu
      const menuButtons = await this.page.$$('button, .menu-trigger, .dropdown-trigger');
      for (const button of menuButtons) {
        try {
          await button.click();
          await this.page.waitForTimeout(500);
          
          for (const selector of logoutSelectors) {
            try {
              logoutElement = await this.page.$(selector);
              if (logoutElement) break;
            } catch (e) {
              // Continue searching
            }
          }
          if (logoutElement) break;
        } catch (e) {
          // Continue searching
        }
      }
    }
    
    if (!logoutElement) {
      throw new Error('Logout button/link not found');
    }
    
    await this.takeScreenshot('before-logout');
    
    // Click logout
    await logoutElement.click();
    await this.page.waitForTimeout(2000);
    
    await this.takeScreenshot('after-logout');
    
    // Check if redirected to login or home page
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/login') && !currentUrl.includes('/home') && !currentUrl.includes('/')) {
      throw new Error(`Logout did not redirect properly. Current URL: ${currentUrl}`);
    }
    
    // Check if token is cleared
    const tokenExists = await this.page.evaluate(() => {
      return !!(localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') ||
                sessionStorage.getItem('token') || sessionStorage.getItem('authToken') || sessionStorage.getItem('access_token'));
    });
    
    if (tokenExists) {
      throw new Error('Token not cleared after logout');
    }
  }

  async testBackendConnection() {
    console.log('🔌 Testing backend connection...');
    
    // Test the auth endpoint directly
    try {
      const response = await this.page.evaluate(async (backendUrl, credentials) => {
        const response = await fetch(`${backendUrl}/api/v2/auth/login-simple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials)
        });
        
        return {
          status: response.status,
          statusText: response.statusText,
          data: await response.json()
        };
      }, TEST_CONFIG.backendUrl, TEST_CONFIG.credentials);
      
      console.log('📡 Backend Response:', response);
      
      if (response.status !== 200) {
        throw new Error(`Backend authentication failed: ${response.status} ${response.statusText}`);
      }
      
      if (!response.data.access_token) {
        throw new Error('No access token received from backend');
      }
      
    } catch (error) {
      throw new Error(`Backend connection test failed: ${error.message}`);
    }
  }

  async runAllTests() {
    try {
      await this.init();
      
      // Test 1: Navigate to login page
      await this.runTest('Navigate to Login Page', async () => {
        await this.navigateToLogin();
      });
      
      // Test 2: Test backend connection
      await this.runTest('Backend Connection Test', async () => {
        await this.testBackendConnection();
      });
      
      // Test 3: Test login form
      await this.runTest('Login Form Submission', async () => {
        await this.testLoginForm();
      });
      
      // Test 4: Test token storage
      await this.runTest('Token Storage Verification', async () => {
        await this.testTokenStorage();
      });
      
      // Test 5: Test protected routes
      await this.runTest('Protected Routes Access', async () => {
        await this.testProtectedRoutes();
      });
      
      // Test 6: Test token persistence
      await this.runTest('Token Persistence on Refresh', async () => {
        await this.testTokenPersistence();
      });
      
      // Test 7: Test logout
      await this.runTest('Logout Functionality', async () => {
        await this.testLogout();
      });
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.failed++;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    if (this.browser) {
      await this.browser.close();
    }
  }

  printResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Total: ${this.results.tests.length}`);
    
    console.log('\n📝 Detailed Results:');
    this.results.tests.forEach((test, index) => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.name}`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });
    
    return this.results;
  }
}

// Run the test
async function main() {
  const tester = new AuthFlowTester();
  await tester.runAllTests();
  const results = tester.printResults();
  
  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFile = `./test-results/auth-flow-test-${timestamp}.json`;
  
  if (!fs.existsSync('./test-results')) {
    fs.mkdirSync('./test-results', { recursive: true });
  }
  
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultFile}`);
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(console.error);
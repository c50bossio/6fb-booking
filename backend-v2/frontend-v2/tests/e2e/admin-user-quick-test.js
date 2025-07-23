const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class AdminUserQuickTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
    this.apiUrl = 'http://localhost:8000';
    this.screenshots = [];
    this.testResults = {
      passed: [],
      failed: [],
      warnings: [],
      uiExploration: [],
      metrics: {
        startTime: null,
        endTime: null,
        totalDuration: null,
        pageLoadTimes: {}
      }
    };
  }

  async init() {
    console.log('🚀 Initializing Admin User Quick Test Suite...');
    this.testResults.metrics.startTime = new Date();
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    
    this.page = await this.browser.newPage();
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.testResults.warnings.push(`Console error: ${msg.text()}`);
      }
    });
  }

  async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `admin-quick-${name}-${timestamp}.png`;
    const filepath = path.join(__dirname, 'test-screenshots', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await this.page.screenshot({ path: filepath, fullPage: true });
    
    this.screenshots.push({ name, filepath, timestamp });
    console.log(`📸 Screenshot saved: ${filename}`);
  }

  async exploreCurrentPage(pageName) {
    console.log(`\n🔍 Exploring ${pageName}...`);
    
    try {
      // Get page title and URL
      const title = await this.page.title();
      const url = this.page.url();
      
      console.log(`Title: ${title}`);
      console.log(`URL: ${url}`);
      
      // Get all interactive elements
      const elements = await this.page.evaluate(() => {
        const results = {
          links: [],
          buttons: [],
          forms: [],
          inputs: [],
          navigation: []
        };
        
        // Links
        document.querySelectorAll('a[href]').forEach(link => {
          results.links.push({
            text: link.textContent.trim(),
            href: link.href,
            classes: link.className
          });
        });
        
        // Buttons
        document.querySelectorAll('button').forEach(button => {
          results.buttons.push({
            text: button.textContent.trim(),
            type: button.type,
            classes: button.className
          });
        });
        
        // Forms
        document.querySelectorAll('form').forEach(form => {
          results.forms.push({
            action: form.action,
            method: form.method,
            inputs: form.querySelectorAll('input').length
          });
        });
        
        // Inputs
        document.querySelectorAll('input').forEach(input => {
          results.inputs.push({
            type: input.type,
            name: input.name,
            placeholder: input.placeholder,
            id: input.id
          });
        });
        
        // Navigation elements
        document.querySelectorAll('nav, .nav, .navigation, .sidebar').forEach(nav => {
          results.navigation.push({
            tag: nav.tagName,
            classes: nav.className,
            links: nav.querySelectorAll('a').length
          });
        });
        
        return results;
      });
      
      this.testResults.uiExploration.push({
        pageName,
        title,
        url,
        elements,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Found: ${elements.links.length} links, ${elements.buttons.length} buttons, ${elements.forms.length} forms`);
      
      return elements;
      
    } catch (error) {
      console.error(`Error exploring ${pageName}:`, error);
      return null;
    }
  }

  async testFrontendAccess() {
    console.log('\n🌐 Testing Frontend Access...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0', timeout: 15000 });
      await this.takeScreenshot('landing-page');
      
      const elements = await this.exploreCurrentPage('Landing Page');
      
      if (elements) {
        this.testResults.passed.push('Frontend accessible');
        
        // Try to find and navigate to different pages
        const interestingLinks = elements.links.filter(link => 
          link.href.includes('login') ||
          link.href.includes('dashboard') ||
          link.href.includes('admin') ||
          link.href.includes('app')
        );
        
        console.log('Interesting navigation links found:', interestingLinks.map(l => l.href));
        
        return elements;
      } else {
        this.testResults.warnings.push('Could not explore landing page elements');
      }
      
    } catch (error) {
      this.testResults.failed.push(`Frontend access failed: ${error.message}`);
      console.error('❌ Frontend access failed:', error);
    }
  }

  async testLoginPage() {
    console.log('\n🔐 Testing Login Page...');
    
    try {
      // Try multiple potential login URLs
      const loginUrls = [
        `${this.baseUrl}/login`,
        `${this.baseUrl}/auth/login`,
        `${this.baseUrl}/signin`,
        `${this.baseUrl}/admin/login`
      ];
      
      for (const loginUrl of loginUrls) {
        try {
          console.log(`Trying: ${loginUrl}`);
          await this.page.goto(loginUrl, { waitUntil: 'networkidle0', timeout: 10000 });
          
          await this.takeScreenshot(`login-attempt-${loginUrl.split('/').pop()}`);
          
          const elements = await this.exploreCurrentPage(`Login Page - ${loginUrl}`);
          
          if (elements && elements.forms.length > 0) {
            console.log(`✅ Found login form at: ${loginUrl}`);
            this.testResults.passed.push(`Login page accessible at ${loginUrl}`);
            
            // Try to find email and password inputs
            const emailInput = elements.inputs.find(input => 
              input.type === 'email' || 
              input.name.toLowerCase().includes('email') ||
              input.placeholder.toLowerCase().includes('email')
            );
            
            const passwordInput = elements.inputs.find(input => 
              input.type === 'password'
            );
            
            if (emailInput && passwordInput) {
              console.log('✅ Found login form with email and password fields');
              this.testResults.passed.push('Login form structure valid');
              
              // Attempt login with test credentials
              await this.attemptLogin(emailInput, passwordInput);
            }
            
            break; // Successfully found a login page
          }
          
        } catch (error) {
          console.log(`❌ ${loginUrl} not accessible: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.testResults.failed.push(`Login page test failed: ${error.message}`);
      console.error('❌ Login page test failed:', error);
    }
  }

  async attemptLogin(emailInput, passwordInput) {
    console.log('\n🔑 Attempting Login...');
    
    try {
      // Fill in login credentials
      await this.page.type(`input[name="${emailInput.name}"], input[type="email"], #email`, 'admin@bookedbarber.com');
      await this.page.type(`input[name="${passwordInput.name}"], input[type="password"], #password`, 'AdminSecure123!');
      
      await this.takeScreenshot('login-form-filled');
      
      // Find and click submit button
      const submitButton = await this.page.$('button[type="submit"], input[type="submit"], .submit-btn, [role="button"]');
      
      if (submitButton) {
        await submitButton.click();
        await this.page.waitForTimeout(3000);
        
        await this.takeScreenshot('after-login-attempt');
        
        const currentUrl = this.page.url();
        console.log(`After login attempt, current URL: ${currentUrl}`);
        
        // Check if we were redirected to a different page
        if (!currentUrl.includes('login')) {
          console.log('✅ Login appears successful - redirected away from login page');
          this.testResults.passed.push('Login attempt successful');
          
          // Explore the post-login page
          await this.exploreCurrentPage('Post-Login Dashboard');
          
        } else {
          console.log('⚠️ Still on login page - login may have failed');
          this.testResults.warnings.push('Login attempt may have failed');
        }
      } else {
        console.log('⚠️ Could not find submit button');
        this.testResults.warnings.push('Submit button not found');
      }
      
    } catch (error) {
      this.testResults.warnings.push(`Login attempt failed: ${error.message}`);
      console.error('⚠️ Login attempt failed:', error);
    }
  }

  async testAPIConnection() {
    console.log('\n🔌 Testing API Connection...');
    
    try {
      // Test basic API connectivity
      const response = await fetch(`${this.apiUrl}/`);
      const data = await response.text();
      
      console.log(`API Response: ${data}`);
      
      if (response.ok) {
        this.testResults.passed.push('API connection successful');
      } else {
        this.testResults.warnings.push(`API returned status: ${response.status}`);
      }
      
      // Test health endpoint variations
      const healthEndpoints = ['/health', '/api/health', '/api/v2/health', '/status'];
      
      for (const endpoint of healthEndpoints) {
        try {
          const healthResponse = await fetch(`${this.apiUrl}${endpoint}`);
          if (healthResponse.ok) {
            const healthData = await healthResponse.text();
            console.log(`Health endpoint ${endpoint}: ${healthData}`);
            this.testResults.passed.push(`Health endpoint ${endpoint} accessible`);
          }
        } catch (error) {
          // Silently continue to next endpoint
        }
      }
      
    } catch (error) {
      this.testResults.warnings.push(`API connection failed: ${error.message}`);
      console.error('⚠️ API connection failed:', error);
    }
  }

  async testDashboardFeatures() {
    console.log('\n📊 Testing Dashboard Features...');
    
    try {
      const currentUrl = this.page.url();
      
      // If we're on a dashboard-like page, explore it
      if (currentUrl.includes('dashboard') || currentUrl.includes('admin') || currentUrl.includes('app')) {
        await this.takeScreenshot('dashboard-overview');
        
        const elements = await this.exploreCurrentPage('Dashboard');
        
        if (elements) {
          // Look for admin-specific features
          const adminFeatures = elements.links.filter(link =>
            link.text.toLowerCase().includes('user') ||
            link.text.toLowerCase().includes('admin') ||
            link.text.toLowerCase().includes('manage') ||
            link.text.toLowerCase().includes('setting') ||
            link.text.toLowerCase().includes('analytics')
          );
          
          console.log('Admin features found:', adminFeatures.map(f => f.text));
          
          if (adminFeatures.length > 0) {
            this.testResults.passed.push(`Found ${adminFeatures.length} admin features`);
            
            // Try to visit the first admin feature
            if (adminFeatures[0]) {
              try {
                await this.page.click(`a[href="${adminFeatures[0].href}"]`);
                await this.page.waitForTimeout(2000);
                
                await this.takeScreenshot('admin-feature-page');
                await this.exploreCurrentPage('Admin Feature Page');
                
                this.testResults.passed.push('Admin feature navigation working');
              } catch (error) {
                this.testResults.warnings.push('Could not navigate to admin feature');
              }
            }
          }
        }
      } else {
        this.testResults.warnings.push('Not on a dashboard page, skipping dashboard tests');
      }
      
    } catch (error) {
      this.testResults.warnings.push(`Dashboard test failed: ${error.message}`);
      console.error('⚠️ Dashboard test failed:', error);
    }
  }

  async generateReport() {
    console.log('\n📋 Generating Quick Test Report...');
    
    this.testResults.metrics.endTime = new Date();
    this.testResults.metrics.totalDuration = 
      this.testResults.metrics.endTime - this.testResults.metrics.startTime;
    
    const report = {
      summary: {
        totalTests: this.testResults.passed.length + this.testResults.failed.length,
        passed: this.testResults.passed.length,
        failed: this.testResults.failed.length,
        warnings: this.testResults.warnings.length,
        duration: `${Math.round(this.testResults.metrics.totalDuration / 1000)}s`,
        timestamp: new Date().toISOString()
      },
      results: this.testResults,
      screenshots: this.screenshots,
      uiExploration: this.testResults.uiExploration,
      findings: {
        frontendAccessible: this.testResults.passed.some(p => p.includes('Frontend accessible')),
        loginFormFound: this.testResults.passed.some(p => p.includes('Login form')),
        apiConnected: this.testResults.passed.some(p => p.includes('API connection')),
        dashboardAccess: this.testResults.passed.some(p => p.includes('dashboard') || p.includes('admin'))
      }
    };
    
    // Save report
    const reportPath = path.join(__dirname, 'test-reports', `admin-quick-test-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Quick Test Report saved to: ${reportPath}`);
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      
      // Run focused tests
      await this.testFrontendAccess();
      await this.testAPIConnection();
      await this.testLoginPage();
      await this.testDashboardFeatures();
      
      const report = await this.generateReport();
      
      // Print summary
      console.log('\n' + '='.repeat(50));
      console.log('ADMIN USER QUICK TEST SUMMARY');
      console.log('='.repeat(50));
      console.log(`✅ Passed: ${report.summary.passed}`);
      console.log(`❌ Failed: ${report.summary.failed}`);
      console.log(`⚠️  Warnings: ${report.summary.warnings}`);
      console.log(`⏱️  Duration: ${report.summary.duration}`);
      
      console.log('\nKey Findings:');
      console.log(`• Frontend Accessible: ${report.findings.frontendAccessible ? '✅' : '❌'}`);
      console.log(`• Login Form Found: ${report.findings.loginFormFound ? '✅' : '❌'}`);
      console.log(`• API Connected: ${report.findings.apiConnected ? '✅' : '❌'}`);
      console.log(`• Dashboard Access: ${report.findings.dashboardAccess ? '✅' : '❌'}`);
      
      console.log(`\nUI Exploration: Found ${report.uiExploration.length} pages to explore`);
      
      if (report.results.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        report.results.warnings.slice(0, 5).forEach(warning => {
          console.log(`  • ${warning}`);
        });
      }
      
      return report;
      
    } catch (error) {
      console.error('💥 Critical test failure:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Execute the test if run directly
if (require.main === module) {
  const test = new AdminUserQuickTest();
  test.run()
    .then(() => {
      console.log('\n✅ Admin user quick test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Admin user quick test failed:', error);
      process.exit(1);
    });
}

module.exports = AdminUserQuickTest;
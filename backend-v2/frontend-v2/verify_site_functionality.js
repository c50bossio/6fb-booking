const puppeteer = require('puppeteer');
const axios = require('axios');

async function verifySiteFunctionality() {
  console.log('🔍 Starting Site Functionality Verification...\n');

  let browser;
  const results = {
    backend: {},
    frontend: {},
    integration: {},
    errors: []
  };

  try {
    // 1. Test Backend API Endpoints
    console.log('📡 Testing Backend API...');
    
    try {
      const healthCheck = await axios.get('http://localhost:8000/health');
      results.backend.health = {
        status: healthCheck.status === 200 ? 'PASS' : 'FAIL',
        data: healthCheck.data
      };
      console.log('  ✅ Health check: PASS');
    } catch (error) {
      results.backend.health = { status: 'FAIL', error: error.message };
      console.log('  ❌ Health check: FAIL');
    }

    try {
      const docsCheck = await axios.get('http://localhost:8000/docs');
      results.backend.docs = {
        status: docsCheck.status === 200 ? 'PASS' : 'FAIL'
      };
      console.log('  ✅ API docs: PASS');
    } catch (error) {
      results.backend.docs = { status: 'FAIL', error: error.message };
      console.log('  ❌ API docs: FAIL');
    }

    // 2. Test Frontend with Puppeteer
    console.log('\n🌐 Testing Frontend with Puppeteer...');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Track console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Track network errors
    const networkErrors = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // 3. Test Homepage
    console.log('  Testing homepage...');
    try {
      await page.goto('http://localhost:3000', { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      const title = await page.title();
      results.frontend.homepage = {
        status: 'PASS',
        title: title,
        url: page.url()
      };
      console.log('    ✅ Homepage loads successfully');
    } catch (error) {
      results.frontend.homepage = { status: 'FAIL', error: error.message };
      console.log('    ❌ Homepage failed to load');
    }

    // 4. Test Navigation Links
    console.log('  Testing navigation...');
    try {
      // Look for common navigation elements
      const navLinks = await page.$$eval('a', links => 
        links.map(link => ({
          text: link.textContent?.trim(),
          href: link.href
        })).filter(link => link.text && link.href.startsWith('http://localhost:3000'))
      );
      
      results.frontend.navigation = {
        status: navLinks.length > 0 ? 'PASS' : 'FAIL',
        linksFound: navLinks.length,
        links: navLinks.slice(0, 5) // First 5 links
      };
      console.log(`    ✅ Found ${navLinks.length} navigation links`);
    } catch (error) {
      results.frontend.navigation = { status: 'FAIL', error: error.message };
      console.log('    ❌ Navigation test failed');
    }

    // 5. Test Key Pages
    const testPages = [
      { path: '/login', name: 'Login Page' },
      { path: '/book', name: 'Booking Page' },
      { path: '/dashboard', name: 'Dashboard' }
    ];

    console.log('  Testing key pages...');
    results.frontend.pages = {};
    
    for (const testPage of testPages) {
      try {
        await page.goto(`http://localhost:3000${testPage.path}`, { 
          waitUntil: 'networkidle2', 
          timeout: 15000 
        });
        
        const pageTitle = await page.title();
        results.frontend.pages[testPage.path] = {
          status: 'PASS',
          title: pageTitle
        };
        console.log(`    ✅ ${testPage.name}: PASS`);
      } catch (error) {
        results.frontend.pages[testPage.path] = {
          status: 'FAIL',
          error: error.message
        };
        console.log(`    ❌ ${testPage.name}: FAIL`);
      }
    }

    // 6. Test API Integration from Frontend
    console.log('\n🔗 Testing Frontend-Backend Integration...');
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
      
      // Inject test to check if fetch to backend works
      const apiTest = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:8000/health');
          const data = await response.json();
          return { status: 'PASS', data };
        } catch (error) {
          return { status: 'FAIL', error: error.message };
        }
      });
      
      results.integration.apiFromFrontend = apiTest;
      console.log(`  ${apiTest.status === 'PASS' ? '✅' : '❌'} Frontend can reach backend: ${apiTest.status}`);
    } catch (error) {
      results.integration.apiFromFrontend = { status: 'FAIL', error: error.message };
      console.log('  ❌ Frontend-backend integration test failed');
    }

    // 7. Collect Console and Network Errors
    results.frontend.consoleErrors = consoleErrors;
    results.frontend.networkErrors = networkErrors;
    
    if (consoleErrors.length > 0) {
      console.log(`\n⚠️  Found ${consoleErrors.length} console errors`);
      consoleErrors.slice(0, 3).forEach(error => console.log(`    - ${error}`));
    } else {
      console.log('\n✅ No console errors detected');
    }

    if (networkErrors.length > 0) {
      console.log(`\n⚠️  Found ${networkErrors.length} network errors`);
      networkErrors.slice(0, 3).forEach(error => console.log(`    - ${error.status} ${error.url}`));
    } else {
      console.log('\n✅ No network errors detected');
    }

  } catch (error) {
    console.error('❌ Critical error during testing:', error.message);
    results.errors.push(error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // 8. Generate Summary Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL VERIFICATION REPORT');
  console.log('='.repeat(60));

  const backendPassing = Object.values(results.backend).every(test => test.status === 'PASS');
  const frontendPassing = Object.values(results.frontend.pages || {}).every(test => test.status === 'PASS') && 
                          results.frontend.homepage?.status === 'PASS';
  const integrationPassing = results.integration.apiFromFrontend?.status === 'PASS';

  console.log(`\n🔧 Backend Status: ${backendPassing ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🌐 Frontend Status: ${frontendPassing ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔗 Integration Status: ${integrationPassing ? '✅ PASS' : '❌ FAIL'}`);

  const overallStatus = backendPassing && frontendPassing && integrationPassing;
  console.log(`\n🎯 Overall Site Status: ${overallStatus ? '✅ FULLY FUNCTIONAL' : '⚠️  ISSUES DETECTED'}`);

  if (results.frontend.consoleErrors?.length > 0 || results.frontend.networkErrors?.length > 0) {
    console.log('\n⚠️  Warnings:');
    if (results.frontend.consoleErrors?.length > 0) {
      console.log(`   - ${results.frontend.consoleErrors.length} console errors detected`);
    }
    if (results.frontend.networkErrors?.length > 0) {
      console.log(`   - ${results.frontend.networkErrors.length} network errors detected`);
    }
  }

  // Save detailed results
  require('fs').writeFileSync(
    'verification_results.json', 
    JSON.stringify(results, null, 2)
  );
  console.log('\n📄 Detailed results saved to verification_results.json');

  return overallStatus;
}

// Run the verification
verifySiteFunctionality()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
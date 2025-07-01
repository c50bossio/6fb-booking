// Test script for role-based route protection
const puppeteer = require('puppeteer');

async function testRouteProtection() {
  console.log('🔒 Testing Role-Based Route Protection...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Test cases
  const testCases = [
    {
      name: 'Public Route Access',
      url: 'http://localhost:3000/login',
      expectedToContain: ['login', 'Sign in', 'Email'],
      shouldRedirect: false
    },
    {
      name: 'Dashboard Without Auth',
      url: 'http://localhost:3000/dashboard',
      expectedToContain: ['login', 'Sign in'],
      shouldRedirect: true,
      expectedRedirectPath: '/login'
    },
    {
      name: 'Admin Route Without Auth',
      url: 'http://localhost:3000/admin',
      expectedToContain: ['login', 'Sign in'],
      shouldRedirect: true,
      expectedRedirectPath: '/login'
    },
    {
      name: 'Analytics Route Without Auth',
      url: 'http://localhost:3000/analytics',
      expectedToContain: ['login', 'Sign in'],
      shouldRedirect: true,
      expectedRedirectPath: '/login'
    },
    {
      name: 'Bookings Route Without Auth',
      url: 'http://localhost:3000/bookings',
      expectedToContain: ['login', 'Sign in'],
      shouldRedirect: true,
      expectedRedirectPath: '/login'
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    
    try {
      // Navigate to the URL
      const response = await page.goto(testCase.url, { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });
      
      // Wait a bit for any redirects to complete
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const content = await page.content();
      
      // Check if redirect happened as expected
      let redirectTest = true;
      if (testCase.shouldRedirect) {
        if (testCase.expectedRedirectPath) {
          redirectTest = currentUrl.includes(testCase.expectedRedirectPath);
        } else {
          redirectTest = currentUrl !== testCase.url;
        }
      } else {
        redirectTest = currentUrl === testCase.url;
      }
      
      // Check if expected content is present
      const contentTest = testCase.expectedToContain.some(text => 
        content.toLowerCase().includes(text.toLowerCase())
      );
      
      const result = {
        test: testCase.name,
        url: testCase.url,
        currentUrl: currentUrl,
        redirectTest: redirectTest,
        contentTest: contentTest,
        passed: redirectTest && contentTest
      };
      
      results.push(result);
      
      console.log(`   📍 Original URL: ${testCase.url}`);
      console.log(`   📍 Current URL: ${currentUrl}`);
      console.log(`   🔄 Redirect Test: ${redirectTest ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   📄 Content Test: ${contentTest ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   🎯 Overall: ${result.passed ? '✅ PASS' : '❌ FAIL'}\n`);
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
      results.push({
        test: testCase.name,
        url: testCase.url,
        error: error.message,
        passed: false
      });
    }
  }
  
  await browser.close();
  
  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
  });
  
  console.log(`\n🎯 Overall Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All route protection tests PASSED! ✅');
  } else {
    console.log('⚠️  Some route protection tests FAILED! ❌');
  }
  
  return results;
}

// Test navigation integration
async function testNavigationIntegration() {
  console.log('\n🧭 Testing Navigation Integration...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Go to public page first
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    
    // Check if navigation is properly filtered for unauthenticated users
    const content = await page.content();
    
    console.log('📍 Testing public page navigation...');
    
    // Should not show admin/staff navigation items on public pages
    const hasAdminNav = content.includes('Admin Panel') || content.includes('/admin');
    const hasAnalyticsNav = content.includes('Analytics') || content.includes('/analytics');
    const hasClientsNav = content.includes('Clients') || content.includes('/clients');
    
    console.log(`   🔒 Admin Navigation Hidden: ${!hasAdminNav ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   📊 Analytics Navigation Hidden: ${!hasAnalyticsNav ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   👥 Clients Navigation Hidden: ${!hasClientsNav ? '✅ PASS' : '❌ FAIL'}`);
    
    const navigationTest = !hasAdminNav && !hasAnalyticsNav && !hasClientsNav;
    console.log(`   🎯 Navigation Filtering: ${navigationTest ? '✅ PASS' : '❌ FAIL'}\n`);
    
    await browser.close();
    return navigationTest;
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}\n`);
    await browser.close();
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Route Protection Test Suite\n');
  console.log('=' .repeat(50));
  
  try {
    const routeResults = await testRouteProtection();
    const navResult = await testNavigationIntegration();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🏁 Final Test Results:');
    console.log('=' .repeat(50));
    
    const routePassed = routeResults.filter(r => r.passed).length === routeResults.length;
    
    console.log(`🔒 Route Protection: ${routePassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🧭 Navigation Integration: ${navResult ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = routePassed && navResult;
    console.log(`\n🎯 Overall System: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
      console.log('\n🎉 Role-based routing is working correctly! 🔐');
    } else {
      console.log('\n⚠️  Some issues detected in role-based routing system.');
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Check if puppeteer is available
try {
  runAllTests();
} catch (error) {
  console.log('⚠️  Puppeteer not available, running basic tests instead...\n');
  
  // Fallback to basic curl tests
  const { execSync } = require('child_process');
  
  console.log('🔍 Basic Route Accessibility Tests:');
  console.log('==================================');
  
  const routes = [
    { path: '/', name: 'Home Page' },
    { path: '/login', name: 'Login Page' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/admin', name: 'Admin Panel' },
    { path: '/analytics', name: 'Analytics' },
    { path: '/bookings', name: 'Bookings' }
  ];
  
  routes.forEach(route => {
    try {
      const result = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000${route.path}`, { timeout: 5000 });
      const statusCode = result.toString().trim();
      const status = statusCode === '200' ? '✅ ACCESSIBLE' : `⚠️  Status: ${statusCode}`;
      console.log(`${route.name}: ${status}`);
    } catch (error) {
      console.log(`${route.name}: ❌ ERROR`);
    }
  });
  
  console.log('\n✅ Basic accessibility tests completed.');
  console.log('📝 Note: Install puppeteer for comprehensive route protection testing.');
}
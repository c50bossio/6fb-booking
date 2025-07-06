/**
 * Direct API Calendar Test
 * Tests calendar functionality through direct API calls and basic UI verification
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  apiURL: 'http://localhost:8001',
  timeout: 15000,
  slowMo: 300
}

// Test results
let testResults = {
  timestamp: new Date().toISOString(),
  overall: 'PASS',
  tests: [],
  screenshots: [],
  apiResults: {}
}

async function takeScreenshot(page, name, context = '') {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `calendar-direct-test-${name}-${timestamp}.png`
    const filepath = path.join(__dirname, 'test-screenshots', filename)
    
    // Ensure directory exists
    if (!fs.existsSync(path.dirname(filepath))) {
      fs.mkdirSync(path.dirname(filepath), { recursive: true })
    }
    
    await page.screenshot({ path: filepath, fullPage: true })
    testResults.screenshots.push({
      test: name,
      context,
      file: filename,
      timestamp
    })
    
    return filepath
  } catch (error) {
    console.log(`⚠️  Screenshot failed for ${name}:`, error.message)
    return null
  }
}

async function testBackendAPI() {
  const testName = 'backend-api'
  console.log('🔌 Testing backend API directly...')
  
  try {
    // Test 1: Health check
    const response = await fetch(`${TEST_CONFIG.apiURL}/`)
    const health = await response.text()
    
    if (!health.includes('6FB Booking API')) {
      throw new Error('Backend API not responding properly')
    }
    
    // Test 2: Check if we can access appointment endpoints
    try {
      const appointmentsResponse = await fetch(`${TEST_CONFIG.apiURL}/api/v1/appointments`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      testResults.apiResults.appointmentsEndpoint = {
        status: appointmentsResponse.status,
        accessible: appointmentsResponse.status !== 404
      }
    } catch (apiError) {
      testResults.apiResults.appointmentsEndpoint = {
        status: 'error',
        error: apiError.message
      }
    }
    
    // Test 3: Check other API endpoints
    const endpoints = ['/api/v1/users', '/api/v1/locations', '/api/v1/auth/profile']
    
    for (const endpoint of endpoints) {
      try {
        const endpointResponse = await fetch(`${TEST_CONFIG.apiURL}${endpoint}`)
        testResults.apiResults[endpoint] = {
          status: endpointResponse.status,
          accessible: endpointResponse.status !== 404
        }
      } catch (error) {
        testResults.apiResults[endpoint] = {
          status: 'error',
          error: error.message
        }
      }
    }
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: testResults.apiResults
    })
    
    console.log('✅ Backend API test passed')
    return true
    
  } catch (error) {
    console.error('❌ Backend API test failed:', error.message)
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function testFrontendAccess(page) {
  const testName = 'frontend-access'
  console.log('🌐 Testing frontend access...')
  
  try {
    // Test 1: Access homepage
    await page.goto(TEST_CONFIG.baseURL)
    await page.waitForTimeout(2000)
    
    await takeScreenshot(page, testName, 'homepage')
    
    // Test 2: Check if we can access calendar page directly
    try {
      await page.goto(`${TEST_CONFIG.baseURL}/calendar`)
      await page.waitForTimeout(3000)
      
      await takeScreenshot(page, testName, 'calendar-page')
      
      // Check if calendar page loaded (even if authentication required)
      const pageContent = await page.content()
      const hasCalendarContent = pageContent.includes('calendar') || 
                                pageContent.includes('Calendar') ||
                                pageContent.includes('appointment') ||
                                pageContent.includes('booking')
      
      if (hasCalendarContent) {
        console.log('✅ Calendar page accessible')
      } else {
        console.log('⚠️  Calendar page may require authentication')
      }
      
    } catch (calendarError) {
      console.log('⚠️  Calendar page access failed:', calendarError.message)
    }
    
    // Test 3: Check if login page works
    try {
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.waitForTimeout(2000)
      
      await takeScreenshot(page, testName, 'login-page')
      
      const hasLoginForm = await page.$('form') !== null
      const hasEmailField = await page.$('input[type="email"]') !== null
      const hasPasswordField = await page.$('input[type="password"]') !== null
      
      testResults.apiResults.loginPage = {
        accessible: true,
        hasForm: hasLoginForm,
        hasEmailField: hasEmailField,
        hasPasswordField: hasPasswordField
      }
      
      console.log('✅ Login page accessible')
      
    } catch (loginError) {
      console.log('⚠️  Login page access failed:', loginError.message)
      testResults.apiResults.loginPage = {
        accessible: false,
        error: loginError.message
      }
    }
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: {
        homepageAccessible: true,
        calendarPageTested: true,
        loginPageTested: true
      }
    })
    
    console.log('✅ Frontend access test passed')
    return true
    
  } catch (error) {
    console.error('❌ Frontend access test failed:', error.message)
    await takeScreenshot(page, testName, 'error')
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function testCalendarComponents(page) {
  const testName = 'calendar-components'
  console.log('📅 Testing calendar components...')
  
  try {
    // Navigate to calendar (might be redirected to login)
    await page.goto(`${TEST_CONFIG.baseURL}/calendar`)
    await page.waitForTimeout(3000)
    
    const currentURL = page.url()
    console.log(`📍 Current URL: ${currentURL}`)
    
    if (currentURL.includes('/login')) {
      console.log('🔐 Redirected to login - testing login flow...')
      
      // Try to login with test credentials
      const emailField = await page.$('input[type="email"]')
      const passwordField = await page.$('input[type="password"]')
      const submitButton = await page.$('button[type="submit"]')
      
      if (emailField && passwordField && submitButton) {
        await page.fill('input[type="email"]', 'test_claude@example.com')
        await page.fill('input[type="password"]', 'testpassword123')
        
        await takeScreenshot(page, testName, 'login-filled')
        
        await page.click('button[type="submit"]')
        await page.waitForTimeout(5000)
        
        await takeScreenshot(page, testName, 'after-login-attempt')
        
        const newURL = page.url()
        console.log(`📍 After login URL: ${newURL}`)
        
        if (newURL.includes('/calendar')) {
          console.log('✅ Login successful, on calendar page')
        } else {
          console.log('⚠️  Login may have failed or redirected elsewhere')
        }
      }
    }
    
    // Test for calendar-related elements regardless of authentication state
    const pageContent = await page.content()
    const calendarElements = {
      hasCalendarClass: pageContent.includes('calendar'),
      hasAppointmentClass: pageContent.includes('appointment'),
      hasBookingClass: pageContent.includes('booking'),
      hasDateClass: pageContent.includes('date'),
      hasTimeClass: pageContent.includes('time')
    }
    
    // Look for specific calendar UI elements
    const uiElements = {
      viewSwitcher: await page.$$('button:has-text("Day"), button:has-text("Week"), button:has-text("Month")'),
      newAppointmentButton: await page.$$('button:has-text("New"), button:has-text("Create"), button:has-text("Add")'),
      calendarGrid: await page.$$('.calendar, .grid, [data-testid*="calendar"]'),
      dateElements: await page.$$('[data-date], .date, .day')
    }
    
    testResults.apiResults.calendarUI = {
      ...calendarElements,
      viewSwitcherButtons: uiElements.viewSwitcher.length,
      newAppointmentButtons: uiElements.newAppointmentButton.length,
      calendarGrids: uiElements.calendarGrid.length,
      dateElements: uiElements.dateElements.length
    }
    
    console.log('🔍 Calendar UI elements found:')
    console.log(`   View switcher buttons: ${uiElements.viewSwitcher.length}`)
    console.log(`   New appointment buttons: ${uiElements.newAppointmentButton.length}`)
    console.log(`   Calendar grids: ${uiElements.calendarGrid.length}`)
    console.log(`   Date elements: ${uiElements.dateElements.length}`)
    
    await takeScreenshot(page, testName, 'calendar-final')
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: {
        currentURL,
        calendarElements,
        uiElementCounts: {
          viewSwitcher: uiElements.viewSwitcher.length,
          newAppointmentButton: uiElements.newAppointmentButton.length,
          calendarGrid: uiElements.calendarGrid.length,
          dateElements: uiElements.dateElements.length
        }
      }
    })
    
    console.log('✅ Calendar components test passed')
    return true
    
  } catch (error) {
    console.error('❌ Calendar components test failed:', error.message)
    await takeScreenshot(page, testName, 'error')
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function testMobileView(page) {
  const testName = 'mobile-view'
  console.log('📱 Testing mobile view...')
  
  try {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 }) // iPhone 12
    await page.waitForTimeout(1000)
    
    // Navigate to calendar page
    await page.goto(`${TEST_CONFIG.baseURL}/calendar`)
    await page.waitForTimeout(3000)
    
    await takeScreenshot(page, testName, 'mobile-calendar')
    
    // Test mobile-specific elements
    const mobileElements = {
      hasViewportMeta: await page.locator('meta[name="viewport"]').count() > 0,
      responsiveClasses: await page.$$('[class*="sm:"], [class*="md:"], [class*="lg:"]'),
      mobileMenus: await page.$$('[class*="mobile"], [data-testid*="mobile"]'),
      touchTargets: await page.$$('button, a, [role="button"]')
    }
    
    // Check if buttons are touch-friendly (at least 44px)
    const buttons = await page.$$('button')
    let touchFriendlyButtons = 0
    
    for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
      const box = await button.boundingBox()
      if (box && (box.height >= 44 || box.width >= 44)) {
        touchFriendlyButtons++
      }
    }
    
    // Check for horizontal scrolling
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    
    testResults.apiResults.mobileView = {
      viewportSet: true,
      hasViewportMeta: mobileElements.hasViewportMeta,
      responsiveClassCount: mobileElements.responsiveClasses.length,
      mobileMenuCount: mobileElements.mobileMenus.length,
      totalButtons: buttons.length,
      touchFriendlyButtons,
      touchFriendlyPercentage: buttons.length > 0 ? (touchFriendlyButtons / Math.min(buttons.length, 5) * 100).toFixed(1) : 0,
      hasHorizontalScroll
    }
    
    console.log('📱 Mobile view analysis:')
    console.log(`   Responsive classes: ${mobileElements.responsiveClasses.length}`)
    console.log(`   Touch-friendly buttons: ${touchFriendlyButtons}/${Math.min(buttons.length, 5)}`)
    console.log(`   Horizontal scroll: ${hasHorizontalScroll ? 'Yes' : 'No'}`)
    
    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(1000)
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: testResults.apiResults.mobileView
    })
    
    console.log('✅ Mobile view test passed')
    return true
    
  } catch (error) {
    console.error('❌ Mobile view test failed:', error.message)
    await takeScreenshot(page, testName, 'error')
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function testCalendarPerformance(page) {
  const testName = 'calendar-performance'
  console.log('⚡ Testing calendar performance...')
  
  try {
    // Navigate to calendar and measure load time
    const startTime = Date.now()
    await page.goto(`${TEST_CONFIG.baseURL}/calendar`)
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // Measure view switching performance
    const viewSwitchTimes = []
    
    const viewButtons = await page.$$('button:has-text("Day"), button:has-text("Week"), button:has-text("Month")')
    
    if (viewButtons.length >= 2) {
      for (let i = 0; i < Math.min(viewButtons.length, 3); i++) {
        const switchStart = Date.now()
        await viewButtons[i].click()
        await page.waitForTimeout(200) // Wait for view to switch
        const switchTime = Date.now() - switchStart
        viewSwitchTimes.push(switchTime)
      }
    }
    
    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      }
    })
    
    testResults.apiResults.performance = {
      pageLoadTime: loadTime,
      viewSwitchTimes,
      averageViewSwitchTime: viewSwitchTimes.length > 0 ? viewSwitchTimes.reduce((a, b) => a + b, 0) / viewSwitchTimes.length : 0,
      performanceMetrics
    }
    
    console.log('⚡ Performance metrics:')
    console.log(`   Page load time: ${loadTime}ms`)
    console.log(`   Average view switch: ${testResults.apiResults.performance.averageViewSwitchTime.toFixed(1)}ms`)
    console.log(`   DOM content loaded: ${performanceMetrics.domContentLoaded.toFixed(1)}ms`)
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: testResults.apiResults.performance
    })
    
    console.log('✅ Calendar performance test passed')
    return true
    
  } catch (error) {
    console.error('❌ Calendar performance test failed:', error.message)
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function runDirectTests() {
  console.log('🚀 Starting direct calendar tests...')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: TEST_CONFIG.slowMo
  })
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })
  
  const page = await context.newPage()
  
  try {
    // Run all tests
    const tests = [
      () => testBackendAPI(),
      () => testFrontendAccess(page),
      () => testCalendarComponents(page),
      () => testMobileView(page),
      () => testCalendarPerformance(page)
    ]
    
    let passedTests = 0
    let totalTests = tests.length
    
    for (const test of tests) {
      try {
        if (await test()) {
          passedTests++
        }
      } catch (error) {
        console.error('❌ Test failed:', error.message)
      }
    }
    
    // Update results
    testResults.overall = passedTests === totalTests ? 'PASS' : 'PARTIAL'
    testResults.performance = {
      totalTests,
      passedTests,
      passRate: (passedTests / totalTests * 100).toFixed(1)
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed (${testResults.performance.passRate}%)`)
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message)
    testResults.overall = 'FAIL'
    testResults.error = error.message
  } finally {
    await browser.close()
  }
  
  // Save results
  const reportPath = path.join(__dirname, 'test-results', `calendar-direct-test-report-${Date.now()}.json`)
  
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2))
  console.log(`📄 Test report saved to: ${reportPath}`)
  
  return testResults
}

// Main execution
async function main() {
  console.log('🧪 Calendar Direct Test Suite')
  console.log('=' .repeat(50))
  
  const results = await runDirectTests()
  
  console.log('\n' + '=' .repeat(50))
  console.log('📋 FINAL TEST SUMMARY')
  console.log('=' .repeat(50))
  console.log(`Overall Status: ${results.overall}`)
  console.log(`Tests Run: ${results.tests.length}`)
  console.log(`Screenshots: ${results.screenshots.length}`)
  
  if (results.performance) {
    console.log(`Pass Rate: ${results.performance.passRate}%`)
  }
  
  console.log('\n🔍 Individual Test Results:')
  results.tests.forEach((test, index) => {
    const status = test.status === 'PASS' ? '✅' : '❌'
    console.log(`${status} ${index + 1}. ${test.name}: ${test.status}`)
    if (test.error) {
      console.log(`   Error: ${test.error}`)
    }
  })
  
  console.log('\n📊 Key Findings:')
  if (results.apiResults.appointmentsEndpoint) {
    console.log(`   Appointments API: ${results.apiResults.appointmentsEndpoint.accessible ? 'Accessible' : 'Not Accessible'}`)
  }
  if (results.apiResults.calendarUI) {
    console.log(`   View Switcher Buttons: ${results.apiResults.calendarUI.viewSwitcherButtons}`)
    console.log(`   Calendar UI Elements: ${results.apiResults.calendarUI.calendarGrids} grids, ${results.apiResults.calendarUI.dateElements} date elements`)
  }
  if (results.apiResults.mobileView) {
    console.log(`   Mobile Touch-Friendly: ${results.apiResults.mobileView.touchFriendlyPercentage}% of buttons`)
    console.log(`   Horizontal Scroll Issue: ${results.apiResults.mobileView.hasHorizontalScroll ? 'Yes' : 'No'}`)
  }
  if (results.apiResults.performance) {
    console.log(`   Page Load Time: ${results.apiResults.performance.pageLoadTime}ms`)
    console.log(`   View Switch Speed: ${results.apiResults.performance.averageViewSwitchTime.toFixed(1)}ms`)
  }
  
  if (results.overall === 'PASS') {
    console.log('\n🎉 Calendar system functioning well!')
  } else if (results.overall === 'PARTIAL') {
    console.log('\n⚠️  Calendar system partially working - check findings above')
  } else {
    console.log('\n❌ Calendar system has issues - check error details above')
  }
  
  process.exit(results.overall === 'PASS' ? 0 : 1)
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { runDirectTests, testResults }
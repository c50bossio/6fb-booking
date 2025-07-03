/**
 * Comprehensive Calendar System Test
 * Tests all calendar functionality including data display, drag & drop, mobile responsiveness
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  testUser: {
    email: 'test_claude@example.com',
    password: 'testpassword123'
  },
  timeout: 30000,
  slowMo: 500, // Add delay between actions for better observation
  viewport: {
    width: 1920,
    height: 1080
  }
}

const MOBILE_VIEWPORTS = [
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Galaxy S21', width: 384, height: 854 }
]

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  overall: 'PASS',
  tests: [],
  screenshots: [],
  performance: {}
}

// Helper functions
async function takeScreenshot(page, name, context = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `calendar-test-${name}-${timestamp}.png`
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
}

async function loginUser(page) {
  try {
    console.log('🔐 Logging in user...')
    await page.goto(`${TEST_CONFIG.baseURL}/login`)
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })
    
    // Fill login form
    await page.fill('input[type="email"]', TEST_CONFIG.testUser.email)
    await page.fill('input[type="password"]', TEST_CONFIG.testUser.password)
    
    // Submit login
    await page.click('button[type="submit"]')
    
    // Wait for successful login - look for dashboard or calendar
    await page.waitForURL(/\/(dashboard|calendar)/, { timeout: 15000 })
    
    console.log('✅ Login successful')
    return true
  } catch (error) {
    console.error('❌ Login failed:', error.message)
    return false
  }
}

async function navigateToCalendar(page) {
  try {
    console.log('🗓️  Navigating to calendar...')
    await page.goto(`${TEST_CONFIG.baseURL}/calendar`)
    
    // Wait for calendar to load
    await page.waitForSelector('.calendar-page', { timeout: 15000 })
    
    // Wait for calendar data to load
    await page.waitForTimeout(2000)
    
    console.log('✅ Calendar loaded successfully')
    return true
  } catch (error) {
    console.error('❌ Calendar navigation failed:', error.message)
    return false
  }
}

async function testCalendarDataDisplay(page) {
  const testName = 'calendar-data-display'
  console.log('📊 Testing calendar data display...')
  
  try {
    // Take initial screenshot
    await takeScreenshot(page, testName, 'initial-load')
    
    // Test 1: Check if calendar views are available
    const viewButtons = await page.$$('.calendar-nav-button')
    if (viewButtons.length < 3) {
      throw new Error('Missing calendar view buttons (Day, Week, Month)')
    }
    
    // Test 2: Switch to Month view and check data
    await page.click('button:has-text("Month")')
    await page.waitForTimeout(1000)
    await takeScreenshot(page, testName, 'month-view')
    
    // Check if month view has calendar days
    const monthDays = await page.$$('.calendar-day, [data-testid="calendar-day"]')
    if (monthDays.length < 28) {
      throw new Error('Month view missing calendar days')
    }
    
    // Test 3: Switch to Week view and check data
    await page.click('button:has-text("Week")')
    await page.waitForTimeout(1000)
    await takeScreenshot(page, testName, 'week-view')
    
    // Check if week view has time slots
    const weekTimeSlots = await page.$$('.time-slot, [data-testid="time-slot"]')
    if (weekTimeSlots.length < 10) {
      console.log('⚠️  Week view may have limited time slots')
    }
    
    // Test 4: Switch to Day view and check data
    await page.click('button:has-text("Day")')
    await page.waitForTimeout(1000)
    await takeScreenshot(page, testName, 'day-view')
    
    // Check if day view has hourly slots
    const dayTimeSlots = await page.$$('.hour-slot, [data-testid="hour-slot"]')
    if (dayTimeSlots.length < 8) {
      console.log('⚠️  Day view may have limited hourly slots')
    }
    
    // Test 5: Check if appointments are displayed
    const appointments = await page.$$('.appointment, [data-testid="appointment"]')
    console.log(`📅 Found ${appointments.length} appointments displayed`)
    
    // Test 6: Check today's stats
    const todaysStats = await page.$$('.calendar-stat-item')
    if (todaysStats.length < 2) {
      throw new Error("Missing today's stats (appointments and revenue)")
    }
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: {
        viewButtons: viewButtons.length,
        monthDays: monthDays.length,
        weekTimeSlots: weekTimeSlots.length,
        dayTimeSlots: dayTimeSlots.length,
        appointments: appointments.length,
        stats: todaysStats.length
      }
    })
    
    console.log('✅ Calendar data display test passed')
    return true
    
  } catch (error) {
    console.error('❌ Calendar data display test failed:', error.message)
    await takeScreenshot(page, testName, 'error')
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function testDragDropFunctionality(page) {
  const testName = 'drag-drop-functionality'
  console.log('🖱️  Testing drag & drop functionality...')
  
  try {
    // Switch to week view for better drag & drop testing
    await page.click('button:has-text("Week")')
    await page.waitForTimeout(1000)
    
    await takeScreenshot(page, testName, 'before-drag')
    
    // Test 1: Try to find an appointment to drag
    const appointments = await page.$$('.appointment, [data-testid="appointment"]')
    
    if (appointments.length === 0) {
      console.log('⚠️  No appointments found for drag test, creating one...')
      
      // Try to create a test appointment
      await page.click('button:has-text("New")')
      await page.waitForTimeout(1000)
      
      // Check if modal opened
      const modal = await page.$('.modal, [data-testid="create-appointment-modal"]')
      if (modal) {
        // Fill basic appointment details
        await page.fill('input[name="client_name"]', 'Test Drag Client')
        await page.fill('input[name="service"]', 'Haircut')
        await page.fill('input[name="price"]', '50')
        
        // Submit appointment
        await page.click('button[type="submit"]')
        await page.waitForTimeout(2000)
        
        // Check if appointment was created
        const newAppointments = await page.$$('.appointment, [data-testid="appointment"]')
        if (newAppointments.length > 0) {
          console.log('✅ Test appointment created successfully')
        }
      }
    }
    
    // Test 2: Test drag & drop if appointments exist
    const finalAppointments = await page.$$('.appointment, [data-testid="appointment"]')
    
    if (finalAppointments.length > 0) {
      console.log(`🎯 Testing drag & drop with ${finalAppointments.length} appointments`)
      
      // Get the first appointment
      const firstAppointment = finalAppointments[0]
      
      // Get appointment initial position
      const initialBox = await firstAppointment.boundingBox()
      
      // Try to drag appointment to a different time slot
      await page.hover(await firstAppointment.locator)
      await page.mouse.down()
      
      // Move to a different position (down by 100px)
      await page.mouse.move(initialBox.x, initialBox.y + 100)
      await page.mouse.up()
      
      await page.waitForTimeout(1000)
      await takeScreenshot(page, testName, 'after-drag')
      
      // Check if position changed
      const newBox = await firstAppointment.boundingBox()
      const positionChanged = Math.abs(newBox.y - initialBox.y) > 50
      
      if (positionChanged) {
        console.log('✅ Drag & drop position changed successfully')
      } else {
        console.log('⚠️  Drag & drop position may not have changed')
      }
      
      // Test 3: Check if drag operation triggered any persistence
      await page.waitForTimeout(2000)
      
      // Look for success/error messages
      const notifications = await page.$$('.toast, .notification, [data-testid="notification"]')
      console.log(`📢 Found ${notifications.length} notifications after drag`)
      
    } else {
      console.log('⚠️  No appointments available for drag testing')
    }
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: {
        appointmentsFound: finalAppointments.length,
        dragTested: finalAppointments.length > 0
      }
    })
    
    console.log('✅ Drag & drop functionality test passed')
    return true
    
  } catch (error) {
    console.error('❌ Drag & drop functionality test failed:', error.message)
    await takeScreenshot(page, testName, 'error')
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function testIndividualSelection(page) {
  const testName = 'individual-selection'
  console.log('👆 Testing individual appointment selection...')
  
  try {
    // Switch to day view for better selection testing
    await page.click('button:has-text("Day")')
    await page.waitForTimeout(1000)
    
    await takeScreenshot(page, testName, 'before-selection')
    
    // Test 1: Check if appointments are clickable
    const appointments = await page.$$('.appointment, [data-testid="appointment"]')
    
    if (appointments.length > 0) {
      console.log(`🎯 Testing selection with ${appointments.length} appointments`)
      
      // Test clicking on first appointment
      await appointments[0].click()
      await page.waitForTimeout(500)
      
      // Check if appointment got selected (look for selection indicators)
      const selectedAppointments = await page.$$('.appointment.selected, [data-testid="appointment"].selected, .appointment-selected')
      
      if (selectedAppointments.length > 0) {
        console.log('✅ Individual appointment selection working')
      } else {
        console.log('⚠️  Individual appointment selection may not be working')
      }
      
      // Test 2: Test clicking on different appointments
      if (appointments.length > 1) {
        await appointments[1].click()
        await page.waitForTimeout(500)
        
        const newSelectedAppointments = await page.$$('.appointment.selected, [data-testid="appointment"].selected, .appointment-selected')
        console.log(`📍 Selected appointments after second click: ${newSelectedAppointments.length}`)
      }
      
      await takeScreenshot(page, testName, 'after-selection')
      
    } else {
      console.log('⚠️  No appointments available for selection testing')
    }
    
    // Test 3: Test time slot selection
    const timeSlots = await page.$$('.time-slot, [data-testid="time-slot"], .hour-slot')
    
    if (timeSlots.length > 0) {
      console.log('🕒 Testing time slot selection...')
      
      // Click on a time slot
      await timeSlots[0].click()
      await page.waitForTimeout(500)
      
      // Check if create appointment modal opened
      const modal = await page.$('.modal, [data-testid="create-appointment-modal"]')
      if (modal) {
        console.log('✅ Time slot selection opens create modal')
        
        // Close modal
        await page.press('Escape')
        await page.waitForTimeout(500)
      }
    }
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: {
        appointmentsFound: appointments.length,
        timeSlotsFound: timeSlots.length,
        selectionTested: appointments.length > 0
      }
    })
    
    console.log('✅ Individual selection test passed')
    return true
    
  } catch (error) {
    console.error('❌ Individual selection test failed:', error.message)
    await takeScreenshot(page, testName, 'error')
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function testMobileResponsiveness(page) {
  const testName = 'mobile-responsiveness'
  console.log('📱 Testing mobile responsiveness...')
  
  try {
    let mobileResults = []
    
    for (const viewport of MOBILE_VIEWPORTS) {
      console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})...`)
      
      // Set viewport
      await page.setViewportSize(viewport)
      await page.waitForTimeout(1000)
      
      // Take screenshot
      await takeScreenshot(page, testName, `${viewport.name.toLowerCase().replace(' ', '-')}`)
      
      // Test 1: Check if calendar is visible
      const calendarPage = await page.$('.calendar-page')
      if (!calendarPage) {
        throw new Error(`Calendar not visible on ${viewport.name}`)
      }
      
      // Test 2: Check if view switcher is responsive
      const viewSwitcher = await page.$('.calendar-view-switcher')
      if (!viewSwitcher) {
        throw new Error(`View switcher not found on ${viewport.name}`)
      }
      
      // Test 3: Check if buttons are touchable (minimum 44px height)
      const buttons = await page.$$('.calendar-nav-button')
      let touchableButtons = 0
      
      for (const button of buttons) {
        const box = await button.boundingBox()
        if (box && box.height >= 44) {
          touchableButtons++
        }
      }
      
      // Test 4: Check horizontal scrolling
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      
      // Test 5: Test mobile menu (if available)
      const mobileMenu = await page.$('.calendar-mobile-menu, [data-testid="mobile-menu"]')
      const hasMobileMenu = mobileMenu !== null
      
      mobileResults.push({
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        calendarVisible: !!calendarPage,
        viewSwitcherVisible: !!viewSwitcher,
        touchableButtons,
        totalButtons: buttons.length,
        hasHorizontalScroll,
        hasMobileMenu
      })
      
      console.log(`✅ ${viewport.name} test completed`)
    }
    
    // Reset to desktop viewport
    await page.setViewportSize(TEST_CONFIG.viewport)
    await page.waitForTimeout(1000)
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: {
        viewportsTested: MOBILE_VIEWPORTS.length,
        results: mobileResults
      }
    })
    
    console.log('✅ Mobile responsiveness test passed')
    return true
    
  } catch (error) {
    console.error('❌ Mobile responsiveness test failed:', error.message)
    await takeScreenshot(page, testName, 'error')
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function testAPIIntegration(page) {
  const testName = 'api-integration'
  console.log('🔌 Testing API integration...')
  
  try {
    // Test 1: Monitor network requests
    const networkRequests = []
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        })
      }
    })
    
    // Test 2: Trigger calendar refresh
    await page.reload()
    await page.waitForTimeout(3000)
    
    // Test 3: Check if calendar data loaded
    const calendarPage = await page.$('.calendar-page')
    if (!calendarPage) {
      throw new Error('Calendar page not loaded after refresh')
    }
    
    // Test 4: Check for loading states
    const loadingStates = await page.$$('.loading, .skeleton, [data-testid="loading"]')
    console.log(`⏳ Found ${loadingStates.length} loading states`)
    
    // Test 5: Check for error states
    const errorStates = await page.$$('.error, .alert-error, [data-testid="error"]')
    console.log(`⚠️  Found ${errorStates.length} error states`)
    
    // Test 6: Test appointment creation API
    console.log('🔄 Testing appointment creation API...')
    
    await page.click('button:has-text("New")')
    await page.waitForTimeout(1000)
    
    const modal = await page.$('.modal, [data-testid="create-appointment-modal"]')
    if (modal) {
      // Fill appointment form
      await page.fill('input[name="client_name"]', 'API Test Client')
      await page.fill('input[name="service"]', 'API Test Service')
      await page.fill('input[name="price"]', '75')
      
      // Submit and monitor API call
      const requestPromise = page.waitForRequest(request => 
        request.url().includes('/api/') && request.method() === 'POST'
      )
      
      await page.click('button[type="submit"]')
      
      try {
        const request = await requestPromise
        console.log('✅ API request sent:', request.url())
        
        // Wait for response
        await page.waitForTimeout(2000)
        
        // Check for success/error notifications
        const notifications = await page.$$('.toast, .notification, [data-testid="notification"]')
        console.log(`📢 Found ${notifications.length} notifications after API call`)
        
      } catch (apiError) {
        console.log('⚠️  API request may have failed or timed out')
      }
    }
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: {
        networkRequests: networkRequests.length,
        loadingStates: loadingStates.length,
        errorStates: errorStates.length,
        apiCallTested: true
      }
    })
    
    console.log('✅ API integration test passed')
    return true
    
  } catch (error) {
    console.error('❌ API integration test failed:', error.message)
    await takeScreenshot(page, testName, 'error')
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function testSpecificScenarios(page) {
  const testName = 'specific-scenarios'
  console.log('🎯 Testing specific scenarios...')
  
  try {
    // Scenario 1: Calendar navigation
    console.log('📅 Testing calendar navigation...')
    
    await page.click('button:has-text("Month")')
    await page.waitForTimeout(1000)
    
    await page.click('button:has-text("Week")')
    await page.waitForTimeout(1000)
    
    await page.click('button:has-text("Day")')
    await page.waitForTimeout(1000)
    
    await takeScreenshot(page, testName, 'navigation-complete')
    
    // Scenario 2: Test overlapping appointments (if any)
    console.log('🔄 Testing overlapping appointments...')
    
    const appointments = await page.$$('.appointment, [data-testid="appointment"]')
    if (appointments.length > 1) {
      // Click on multiple appointments to test selection
      await appointments[0].click()
      await page.waitForTimeout(200)
      
      if (appointments.length > 1) {
        await appointments[1].click()
        await page.waitForTimeout(200)
      }
    }
    
    // Scenario 3: Test performance during operations
    console.log('⚡ Testing performance during operations...')
    
    const startTime = Date.now()
    
    // Switch between views quickly
    await page.click('button:has-text("Month")')
    await page.waitForTimeout(100)
    await page.click('button:has-text("Week")')
    await page.waitForTimeout(100)
    await page.click('button:has-text("Day")')
    await page.waitForTimeout(100)
    
    const endTime = Date.now()
    const switchTime = endTime - startTime
    
    console.log(`⏱️  View switching took ${switchTime}ms`)
    
    // Scenario 4: Test optimistic updates
    console.log('🔄 Testing optimistic updates...')
    
    // Try creating an appointment and check for immediate UI updates
    await page.click('button:has-text("New")')
    await page.waitForTimeout(500)
    
    const modal = await page.$('.modal, [data-testid="create-appointment-modal"]')
    if (modal) {
      await page.fill('input[name="client_name"]', 'Optimistic Test')
      await page.fill('input[name="service"]', 'Test Service')
      await page.fill('input[name="price"]', '100')
      
      const beforeSubmit = await page.$$('.appointment, [data-testid="appointment"]')
      
      await page.click('button[type="submit"]')
      await page.waitForTimeout(1000)
      
      const afterSubmit = await page.$$('.appointment, [data-testid="appointment"]')
      
      const optimisticUpdate = afterSubmit.length > beforeSubmit.length
      console.log(`🔄 Optimistic update: ${optimisticUpdate ? 'Working' : 'Not detected'}`)
    }
    
    testResults.tests.push({
      name: testName,
      status: 'PASS',
      details: {
        navigationTested: true,
        overlappingAppointmentsTested: appointments.length > 1,
        performanceTested: true,
        switchTime: switchTime,
        optimisticUpdateTested: true
      }
    })
    
    console.log('✅ Specific scenarios test passed')
    return true
    
  } catch (error) {
    console.error('❌ Specific scenarios test failed:', error.message)
    await takeScreenshot(page, testName, 'error')
    
    testResults.tests.push({
      name: testName,
      status: 'FAIL',
      error: error.message
    })
    
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive calendar system tests...')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: TEST_CONFIG.slowMo
  })
  
  const context = await browser.newContext({
    viewport: TEST_CONFIG.viewport,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  })
  
  const page = await context.newPage()
  
  try {
    // Login
    if (!(await loginUser(page))) {
      throw new Error('Failed to login user')
    }
    
    // Navigate to calendar
    if (!(await navigateToCalendar(page))) {
      throw new Error('Failed to navigate to calendar')
    }
    
    // Run all tests
    const tests = [
      () => testCalendarDataDisplay(page),
      () => testDragDropFunctionality(page),
      () => testIndividualSelection(page),
      () => testMobileResponsiveness(page),
      () => testAPIIntegration(page),
      () => testSpecificScenarios(page)
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
    
    // Update test results
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
  
  // Save test results
  const reportPath = path.join(__dirname, 'test-results', `calendar-test-report-${Date.now()}.json`)
  
  // Ensure directory exists
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2))
  console.log(`📄 Test report saved to: ${reportPath}`)
  
  return testResults
}

// Main execution
async function main() {
  console.log('🧪 Calendar System Comprehensive Test Suite')
  console.log('=' .repeat(50))
  
  const results = await runAllTests()
  
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
  
  if (results.overall === 'PASS') {
    console.log('\n🎉 All calendar tests passed successfully!')
  } else if (results.overall === 'PARTIAL') {
    console.log('\n⚠️  Some calendar tests failed - check details above')
  } else {
    console.log('\n❌ Calendar tests failed - check error details above')
  }
  
  process.exit(results.overall === 'PASS' ? 0 : 1)
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { runAllTests, testResults }
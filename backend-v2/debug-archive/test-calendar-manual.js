/**
 * Manual Calendar Test
 * Interactive test for manual verification of calendar functionality
 */

const { chromium } = require('playwright')

const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  testUser: {
    email: 'test_claude@example.com',
    password: 'testpassword123'
  }
}

async function manualCalendarTest() {
  console.log('🧪 Manual Calendar Test Suite')
  console.log('==============================')
  console.log('This test will open the browser for manual verification.')
  console.log('Please follow the prompts to test calendar functionality.')
  console.log('')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Slow down for better observation
  })
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  })
  
  const page = await context.newPage()
  
  try {
    console.log('🌐 Opening application...')
    await page.goto(TEST_CONFIG.baseURL)
    await page.waitForTimeout(2000)
    
    console.log('🔐 Navigating to login page...')
    await page.goto(`${TEST_CONFIG.baseURL}/login`)
    await page.waitForTimeout(2000)
    
    console.log('📋 MANUAL TEST CHECKLIST')
    console.log('========================')
    console.log('')
    
    console.log('1. LOGIN TEST:')
    console.log(`   - Enter email: ${TEST_CONFIG.testUser.email}`)
    console.log(`   - Enter password: ${TEST_CONFIG.testUser.password}`)
    console.log('   - Click login button')
    console.log('   - Verify successful login')
    console.log('')
    
    console.log('Press Enter when login is complete...')
    await waitForEnter()
    
    console.log('🗓️  Navigating to calendar...')
    await page.goto(`${TEST_CONFIG.baseURL}/calendar`)
    await page.waitForTimeout(3000)
    
    console.log('')
    console.log('2. CALENDAR DATA DISPLAY TEST:')
    console.log('   ✓ Check if calendar page loads')
    console.log('   ✓ Check if view switcher (Day/Week/Month) is visible')
    console.log('   ✓ Check if appointments are displayed')
    console.log('   ✓ Check if today\'s stats are shown')
    console.log('   ✓ Switch between Month, Week, and Day views')
    console.log('')
    console.log('Press Enter when data display test is complete...')
    await waitForEnter()
    
    console.log('')
    console.log('3. DRAG & DROP FUNCTIONALITY TEST:')
    console.log('   ✓ Try to drag an appointment to a different time slot')
    console.log('   ✓ Check if appointment moves visually')
    console.log('   ✓ Look for confirmation dialogs')
    console.log('   ✓ Check if changes persist after page refresh')
    console.log('')
    console.log('Press Enter when drag & drop test is complete...')
    await waitForEnter()
    
    console.log('')
    console.log('4. INDIVIDUAL SELECTION TEST:')
    console.log('   ✓ Click on individual appointments')
    console.log('   ✓ Check if appointments get selected/highlighted')
    console.log('   ✓ Test clicking on different appointments')
    console.log('   ✓ Try clicking on time slots to create new appointments')
    console.log('')
    console.log('Press Enter when individual selection test is complete...')
    await waitForEnter()
    
    console.log('')
    console.log('5. MOBILE RESPONSIVENESS TEST:')
    console.log('   - Resizing window to mobile size...')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(1000)
    
    console.log('   ✓ Check if calendar adapts to mobile screen')
    console.log('   ✓ Check if view switcher is touch-friendly')
    console.log('   ✓ Check if there\'s no horizontal scrolling')
    console.log('   ✓ Test touch interactions')
    console.log('   ✓ Check if mobile menu is available')
    console.log('')
    console.log('Press Enter when mobile test is complete...')
    await waitForEnter()
    
    // Reset to desktop view
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(1000)
    
    console.log('')
    console.log('6. API INTEGRATION TEST:')
    console.log('   ✓ Try creating a new appointment')
    console.log('   ✓ Check if appointment appears immediately (optimistic update)')
    console.log('   ✓ Check for success/error notifications')
    console.log('   ✓ Refresh page and verify appointment persists')
    console.log('')
    console.log('Press Enter when API integration test is complete...')
    await waitForEnter()
    
    console.log('')
    console.log('7. SPECIFIC SCENARIOS TEST:')
    console.log('   ✓ Test calendar navigation (month/week/day switching)')
    console.log('   ✓ Test overlapping appointments (if any)')
    console.log('   ✓ Test appointment editing/cancellation')
    console.log('   ✓ Test performance during rapid view switching')
    console.log('')
    console.log('Press Enter when specific scenarios test is complete...')
    await waitForEnter()
    
    console.log('')
    console.log('🎉 Manual test completed!')
    console.log('')
    console.log('SUMMARY QUESTIONS:')
    console.log('==================')
    console.log('')
    
    const questions = [
      'Did the calendar data display properly in all views? (y/n)',
      'Did drag & drop functionality work correctly? (y/n)',
      'Did individual appointment selection work? (y/n)',
      'Was the calendar responsive on mobile? (y/n)',
      'Did API integration work (creating appointments)? (y/n)',
      'Were there any UI bugs or display problems? (y/n)',
      'Was performance acceptable during operations? (y/n)'
    ]
    
    console.log('Please answer the following questions:')
    for (const question of questions) {
      console.log(`${question}`)
    }
    
    console.log('')
    console.log('Press Enter to close the browser...')
    await waitForEnter()
    
  } catch (error) {
    console.error('❌ Test error:', error.message)
  } finally {
    await browser.close()
  }
}

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.once('data', (data) => {
      if (data[0] === 13) { // Enter key
        process.stdin.setRawMode(false)
        process.stdin.pause()
        resolve()
      }
    })
  })
}

// Run the manual test
if (require.main === module) {
  manualCalendarTest().catch(console.error)
}

module.exports = { manualCalendarTest }
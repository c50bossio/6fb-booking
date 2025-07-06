#!/usr/bin/env node

/**
 * Simple calendar view switching test using Puppeteer
 * This will help identify specific JavaScript errors during view switching
 */

const puppeteer = require('puppeteer')

async function testCalendarViewSwitching() {
  let browser
  let page
  
  try {
    console.log('🚀 Starting calendar view switching test...')
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging
      devtools: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    })
    
    page = await browser.newPage()
    
    // Enable console logging
    const consoleMessages = []
    const errors = []
    
    page.on('console', msg => {
      const message = `${msg.type()}: ${msg.text()}`
      consoleMessages.push(message)
      console.log(`📝 Console: ${message}`)
    })
    
    page.on('pageerror', error => {
      const errorMsg = error.toString()
      errors.push(errorMsg)
      console.error(`❌ Page Error: ${errorMsg}`)
    })
    
    page.on('requestfailed', request => {
      console.error(`❌ Request Failed: ${request.url()} - ${request.failure().errorText}`)
    })
    
    // Set viewport
    await page.setViewport({ width: 1200, height: 800 })
    
    console.log('📖 Navigating to calendar page...')
    
    // Navigate to calendar page
    try {
      await page.goto('http://localhost:3001/calendar', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      })
    } catch (navigationError) {
      console.error(`❌ Navigation failed: ${navigationError.message}`)
      return
    }
    
    console.log('✅ Page loaded successfully')
    
    // Wait for page to settle
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Check if we need to authenticate
    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('🔐 Redirected to login page - authentication required')
      console.log('⚠️  Please manually login and re-run the test')
      await new Promise(resolve => setTimeout(resolve, 30000)) // Wait for manual login
    }
    
    // Look for view switcher buttons
    console.log('🔍 Looking for view switcher buttons...')
    
    const viewButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const viewSwitchers = buttons.filter(btn => {
        const text = btn.textContent.toLowerCase()
        return text.includes('day') || text.includes('week') || text.includes('month')
      })
      
      return viewSwitchers.map(btn => ({
        text: btn.textContent,
        className: btn.className,
        disabled: btn.disabled,
        visible: btn.offsetParent !== null
      }))
    })
    
    console.log(`📊 Found ${viewButtons.length} view switcher buttons:`)
    viewButtons.forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text}" - disabled: ${btn.disabled}, visible: ${btn.visible}`)
    })
    
    if (viewButtons.length === 0) {
      console.error('❌ No view switcher buttons found!')
      return
    }
    
    // Test view switching
    console.log('🔄 Testing view switching...')
    
    const viewTypes = ['day', 'week', 'month']
    
    for (const viewType of viewTypes) {
      console.log(`\n🔄 Testing ${viewType} view...`)
      
      try {
        // Click the view button
        const clicked = await page.evaluate((view) => {
          const buttons = Array.from(document.querySelectorAll('button'))
          const button = buttons.find(btn => 
            btn.textContent.toLowerCase().includes(view)
          )
          
          if (button) {
            button.click()
            return true
          }
          return false
        }, viewType)
        
        if (!clicked) {
          console.error(`❌ Could not find ${viewType} button`)
          continue
        }
        
        console.log(`✅ Clicked ${viewType} button`)
        
        // Wait for view to render
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Check for errors after view switch
        const errorCount = errors.length
        console.log(`📊 Error count after ${viewType} switch: ${errorCount}`)
        
        // Check if view actually changed
        const currentView = await page.evaluate(() => {
          // Look for view-specific indicators
          const hasWeekGrid = document.querySelector('.grid-cols-7')
          const hasMonthView = document.querySelector('[class*="month"]')
          const hasDayView = document.querySelector('[class*="day"]')
          
          if (hasWeekGrid) return 'week'
          if (hasMonthView) return 'month'
          if (hasDayView) return 'day'
          return 'unknown'
        })
        
        console.log(`📊 Current view appears to be: ${currentView}`)
        
        // Wait a bit more to catch delayed errors
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (switchError) {
        console.error(`❌ Error switching to ${viewType} view: ${switchError.message}`)
        errors.push(`View switch error (${viewType}): ${switchError.message}`)
      }
    }
    
    // Final error summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(50))
    
    console.log(`\n📝 Total console messages: ${consoleMessages.length}`)
    if (consoleMessages.length > 0) {
      console.log('Recent console messages:')
      consoleMessages.slice(-10).forEach(msg => console.log(`  ${msg}`))
    }
    
    console.log(`\n❌ Total errors: ${errors.length}`)
    if (errors.length > 0) {
      console.log('Errors encountered:')
      errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`)
      })
    }
    
    if (errors.length === 0) {
      console.log('✅ No JavaScript errors found during view switching!')
    } else {
      console.log('❌ JavaScript errors found - see details above')
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...')
    await new Promise(resolve => setTimeout(resolve, 30000))
    
  } catch (error) {
    console.error(`❌ Test failed with error: ${error.message}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Run the test
testCalendarViewSwitching().catch(console.error)
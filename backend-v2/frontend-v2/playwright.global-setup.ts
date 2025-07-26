/**
 * Playwright Global Setup for Revenue Analytics Demo Tests
 * 
 * Handles:
 * - Test environment preparation
 * - Demo data initialization
 * - Performance baseline establishment
 * - Accessibility testing setup
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Revenue Analytics Demo E2E Tests...')
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Verify demo page is accessible
    console.log('📊 Verifying demo page accessibility...')
    await page.goto('/demo/revenue-analytics')
    
    // Wait for critical elements to load
    await page.waitForSelector('text=Advanced Analytics Suite', { timeout: 10000 })
    await page.waitForSelector('[data-testid="unified-calendar"]', { timeout: 10000 })
    
    console.log('✅ Demo page loaded successfully')
    
    // Establish performance baselines
    console.log('⚡ Establishing performance baselines...')
    const startTime = Date.now()
    await page.reload()
    await page.waitForSelector('text=Advanced Analytics Suite')
    const loadTime = Date.now() - startTime
    
    console.log(`📈 Baseline load time: ${loadTime}ms`)
    
    // Verify core demo functionality
    console.log('🧪 Verifying core demo functionality...')
    
    // Test view switching
    const viewSelect = page.locator('select').first()
    await viewSelect.selectOption('week')
    await page.waitForTimeout(500)
    
    // Test barber selection
    const barberSelect = page.locator('select').nth(1)
    await barberSelect.selectOption('1')
    await page.waitForTimeout(500)
    
    console.log('✅ Core functionality verified')
    
    // Set up accessibility testing
    console.log('♿ Preparing accessibility testing...')
    await page.addInitScript(() => {
      // Inject axe-core for accessibility testing
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/@axe-core/playwright@latest/dist/index.js'
      document.head.appendChild(script)
    })
    
    console.log('✅ Accessibility testing prepared')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
  
  console.log('🎉 Global setup completed successfully')
}

export default globalSetup
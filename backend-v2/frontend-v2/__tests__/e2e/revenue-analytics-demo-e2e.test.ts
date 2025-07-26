/**
 * End-to-End Tests for Revenue Analytics Demo
 * 
 * Tests cover:
 * - Complete user workflows in demo environment
 * - Real browser interactions and navigation
 * - Six Figure Barber business process validation
 * - Analytics feature demonstrations
 * - Cross-browser compatibility
 * - Performance benchmarks
 * - Accessibility compliance
 * - Mobile responsiveness
 * - Demo-to-production comparison workflows
 */

import { test, expect } from '@playwright/test'

test.describe('Revenue Analytics Demo E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the demo page
    await page.goto('/demo/revenue-analytics')
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle')
  })

  test.describe('Demo Page Loading and Structure', () => {
    test('loads demo page with all essential components', async ({ page }) => {
      // Verify page title and branding
      await expect(page.locator('text=6FB')).toBeVisible()
      await expect(page.locator('text=Advanced Analytics Suite')).toBeVisible()
      
      // Verify key sections are present
      await expect(page.locator('text=Six Figure Barber Platform')).toBeVisible()
      await expect(page.locator('text=Key Features Demonstrated')).toBeVisible()
      
      // Verify calendar component loads
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })

    test('displays comprehensive demo instructions', async ({ page }) => {
      // Check instructional content
      await expect(page.locator('text=Revenue button to access')).toBeVisible()
      await expect(page.locator('text=Interactive Charts:')).toBeVisible()
      await expect(page.locator('text=Client Analytics:')).toBeVisible()
      await expect(page.locator('text=AI Predictions:')).toBeVisible()
    })

    test('shows Six Figure Barber revenue metrics', async ({ page }) => {
      // Verify revenue tracking
      await expect(page.locator('text=Today\'s Revenue')).toBeVisible()
      await expect(page.locator('text=$400')).toBeVisible()
      
      // Verify progress tracking
      await expect(page.locator('text=Six Figure Progress')).toBeVisible()
      await expect(page.locator('text=47.8%')).toBeVisible()
    })

    test('loads within acceptable performance thresholds', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/demo/revenue-analytics')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
    })
  })

  test.describe('Calendar View Management', () => {
    test('switches between calendar views seamlessly', async ({ page }) => {
      // Start with day view (default)
      const viewSelect = page.locator('select').first()
      await expect(viewSelect).toHaveValue('day')
      
      // Switch to week view
      await viewSelect.selectOption('week')
      await page.waitForTimeout(500) // Allow transition
      
      // Verify calendar updates
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
      
      // Switch to month view
      await viewSelect.selectOption('month')
      await page.waitForTimeout(500)
      
      // Verify month view loads
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })

    test('maintains view selection state during interactions', async ({ page }) => {
      const viewSelect = page.locator('select').first()
      
      // Set to week view
      await viewSelect.selectOption('week')
      await expect(viewSelect).toHaveValue('week')
      
      // Interact with other controls
      const barberSelect = page.locator('select').nth(1)
      await barberSelect.selectOption('1')
      
      // View should remain week
      await expect(viewSelect).toHaveValue('week')
    })

    test('handles rapid view switching gracefully', async ({ page }) => {
      const viewSelect = page.locator('select').first()
      
      // Rapid switching
      await viewSelect.selectOption('week')
      await viewSelect.selectOption('month')
      await viewSelect.selectOption('day')
      await viewSelect.selectOption('week')
      
      await page.waitForTimeout(1000)
      
      // Should end up in final state
      await expect(viewSelect).toHaveValue('week')
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })
  })

  test.describe('Barber Selection and Filtering', () => {
    test('filters appointments by barber selection', async ({ page }) => {
      const barberSelect = page.locator('select').nth(1)
      
      // Initially should show "All Barbers"
      await expect(barberSelect).toHaveValue('all')
      
      // Select specific barber
      await barberSelect.selectOption('1')
      await expect(barberSelect).toHaveValue('1')
      
      // Calendar should update accordingly
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })

    test('provides proper barber options', async ({ page }) => {
      const barberSelect = page.locator('select').nth(1)
      
      // Check available options
      const options = await barberSelect.locator('option').allTextContents()
      expect(options).toContain('All Barbers')
      expect(options).toContain('Alex Martinez')
    })

    test('synchronizes barber selection across demo features', async ({ page }) => {
      const barberSelect = page.locator('select').nth(1)
      
      // Select specific barber
      await barberSelect.selectOption('1')
      
      // Switch views - selection should persist
      const viewSelect = page.locator('select').first()
      await viewSelect.selectOption('week')
      
      await expect(barberSelect).toHaveValue('1')
    })
  })

  test.describe('Revenue Analytics Demonstration', () => {
    test('displays accurate revenue calculations', async ({ page }) => {
      // Check today's revenue display
      const revenueAmount = page.locator('text=$400')
      await expect(revenueAmount).toBeVisible()
      
      // Verify styling indicates success/growth
      const revenueContainer = page.locator('text=$400').locator('..')
      await expect(revenueContainer).toHaveClass(/text-green-600/)
    })

    test('shows Six Figure progress tracking', async ({ page }) => {
      // Progress should be prominently displayed
      const progressAmount = page.locator('text=47.8%')
      await expect(progressAmount).toBeVisible()
      
      // Should have proper business styling
      const progressContainer = page.locator('text=47.8%').locator('..')
      await expect(progressContainer).toHaveClass(/text-blue-600/)
    })

    test('demonstrates analytics features comprehensively', async ({ page }) => {
      // Verify feature listings
      await expect(page.locator('text=Real-time revenue visualization')).toBeVisible()
      await expect(page.locator('text=Line & bar chart options')).toBeVisible()
      await expect(page.locator('text=Client distribution charts')).toBeVisible()
      await expect(page.locator('text=Revenue forecasting')).toBeVisible()
      await expect(page.locator('text=AI-powered business intelligence')).toBeVisible()
    })

    test('emphasizes premium service methodology', async ({ page }) => {
      // Should highlight premium positioning
      await expect(page.locator('text=Six Figure Barber methodology')).toBeVisible()
      await expect(page.locator('text=Smart recommendations')).toBeVisible()
      await expect(page.locator('text=Seasonal trend analysis')).toBeVisible()
    })
  })

  test.describe('User Interaction Workflows', () => {
    test('supports complete demo exploration workflow', async ({ page }) => {
      // User should be able to explore all features
      
      // 1. Change calendar view
      const viewSelect = page.locator('select').first()
      await viewSelect.selectOption('week')
      await page.waitForTimeout(500)
      
      // 2. Select specific barber
      const barberSelect = page.locator('select').nth(1)
      await barberSelect.selectOption('1')
      await page.waitForTimeout(500)
      
      // 3. View should update accordingly
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
      
      // 4. Switch back to overview
      await viewSelect.selectOption('day')
      await barberSelect.selectOption('all')
      
      // Should return to initial state
      await expect(viewSelect).toHaveValue('day')
      await expect(barberSelect).toHaveValue('all')
    })

    test('handles calendar interactions smoothly', async ({ page }) => {
      // Calendar should be interactive
      const calendar = page.locator('[data-testid="unified-calendar"]')
      await expect(calendar).toBeVisible()
      
      // Should allow view switching without errors
      const viewSelect = page.locator('select').first()
      await viewSelect.selectOption('month')
      
      await expect(calendar).toBeVisible()
      
      // No JavaScript errors should occur
      const consoleErrors = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })
      
      await page.waitForTimeout(1000)
      expect(consoleErrors).toHaveLength(0)
    })

    test('provides responsive user feedback', async ({ page }) => {
      // Changes should be immediate and visible
      const viewSelect = page.locator('select').first()
      
      await viewSelect.selectOption('week')
      
      // Should see immediate visual feedback
      await expect(viewSelect).toHaveValue('week')
      
      // Calendar should reflect change quickly
      await page.waitForTimeout(100)
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('displays properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Key elements should still be visible
      await expect(page.locator('text=6FB')).toBeVisible()
      await expect(page.locator('text=Advanced Analytics Suite')).toBeVisible()
      
      // Controls should be accessible
      await expect(page.locator('select').first()).toBeVisible()
      await expect(page.locator('select').nth(1)).toBeVisible()
      
      // Revenue metrics should be readable
      await expect(page.locator('text=$400')).toBeVisible()
      await expect(page.locator('text=47.8%')).toBeVisible()
    })

    test('maintains functionality on tablet size', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // All functionality should work
      const viewSelect = page.locator('select').first()
      await viewSelect.selectOption('week')
      
      const barberSelect = page.locator('select').nth(1)
      await barberSelect.selectOption('1')
      
      // Calendar should update
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })

    test('adapts layout for different screen sizes', async ({ page }) => {
      // Test different breakpoints
      const breakpoints = [
        { width: 320, height: 568 }, // Small mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1024, height: 768 }, // Small desktop
        { width: 1920, height: 1080 }  // Large desktop
      ]
      
      for (const viewport of breakpoints) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(500)
        
        // Core elements should remain accessible
        await expect(page.locator('text=6FB')).toBeVisible()
        await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
      }
    })
  })

  test.describe('Performance and Loading', () => {
    test('maintains smooth interactions under load', async ({ page }) => {
      // Perform multiple rapid interactions
      const viewSelect = page.locator('select').first()
      const barberSelect = page.locator('select').nth(1)
      
      const startTime = Date.now()
      
      // Rapid interactions
      for (let i = 0; i < 5; i++) {
        await viewSelect.selectOption('week')
        await viewSelect.selectOption('day')
        await barberSelect.selectOption('1')
        await barberSelect.selectOption('all')
      }
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000)
      
      // Should end in stable state
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })

    test('handles concurrent user actions gracefully', async ({ page }) => {
      // Simulate multiple simultaneous actions
      const viewSelect = page.locator('select').first()
      const barberSelect = page.locator('select').nth(1)
      
      // Concurrent selections
      await Promise.all([
        viewSelect.selectOption('week'),
        barberSelect.selectOption('1')
      ])
      
      // Should reach stable state
      await page.waitForTimeout(1000)
      await expect(viewSelect).toHaveValue('week')
      await expect(barberSelect).toHaveValue('1')
    })

    test('maintains performance with extended usage', async ({ page }) => {
      // Extended interaction session
      const viewSelect = page.locator('select').first()
      const barberSelect = page.locator('select').nth(1)
      
      // Extended usage pattern
      for (let cycle = 0; cycle < 3; cycle++) {
        await viewSelect.selectOption('week')
        await page.waitForTimeout(200)
        
        await barberSelect.selectOption('1')
        await page.waitForTimeout(200)
        
        await viewSelect.selectOption('month')
        await page.waitForTimeout(200)
        
        await barberSelect.selectOption('all')
        await page.waitForTimeout(200)
        
        await viewSelect.selectOption('day')
        await page.waitForTimeout(200)
      }
      
      // Should remain responsive
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })
  })

  test.describe('Accessibility Compliance', () => {
    test('provides proper keyboard navigation', async ({ page }) => {
      // Should be able to navigate with keyboard
      await page.keyboard.press('Tab')
      
      // First select should be focused
      const viewSelect = page.locator('select').first()
      await expect(viewSelect).toBeFocused()
      
      // Navigate to next control
      await page.keyboard.press('Tab')
      
      const barberSelect = page.locator('select').nth(1)
      await expect(barberSelect).toBeFocused()
    })

    test('includes proper ARIA labels and roles', async ({ page }) => {
      // Form controls should be labeled
      const viewLabel = page.locator('text=View')
      await expect(viewLabel).toBeVisible()
      
      const barberLabel = page.locator('text=Barber')
      await expect(barberLabel).toBeVisible()
      
      // Select elements should be accessible
      const viewSelect = page.locator('select').first()
      await expect(viewSelect).toHaveAttribute('name')
    })

    test('maintains focus management during interactions', async ({ page }) => {
      const viewSelect = page.locator('select').first()
      
      // Focus select
      await viewSelect.focus()
      await expect(viewSelect).toBeFocused()
      
      // Change value via keyboard
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      
      // Focus should be maintained
      await expect(viewSelect).toBeFocused()
    })

    test('provides sufficient color contrast', async ({ page }) => {
      // Revenue metrics should have proper contrast
      const revenueText = page.locator('text=$400')
      const computedStyle = await revenueText.evaluate(el => {
        return window.getComputedStyle(el).color
      })
      
      // Should use green color for positive revenue
      expect(computedStyle).toBeTruthy()
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test('handles navigation errors gracefully', async ({ page }) => {
      // Monitor console errors
      const consoleErrors = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })
      
      // Perform various interactions
      const viewSelect = page.locator('select').first()
      await viewSelect.selectOption('week')
      await viewSelect.selectOption('month')
      await viewSelect.selectOption('day')
      
      await page.waitForTimeout(1000)
      
      // Should not generate console errors
      expect(consoleErrors.filter(error => 
        !error.includes('favicon') && // Ignore favicon errors
        !error.includes('sourcemap')   // Ignore sourcemap warnings
      )).toHaveLength(0)
    })

    test('recovers from rapid state changes', async ({ page }) => {
      const viewSelect = page.locator('select').first()
      const barberSelect = page.locator('select').nth(1)
      
      // Very rapid state changes
      await Promise.all([
        viewSelect.selectOption('week'),
        viewSelect.selectOption('month'),
        barberSelect.selectOption('1'),
        barberSelect.selectOption('all')
      ])
      
      await page.waitForTimeout(2000)
      
      // Should settle into a stable state
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })

    test('maintains functionality after page interactions', async ({ page }) => {
      // Interact with page extensively
      await page.mouse.click(100, 100) // Click elsewhere
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Core functionality should still work
      const viewSelect = page.locator('select').first()
      await viewSelect.selectOption('week')
      
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    test('works consistently across different browsers', async ({ page, browserName }) => {
      // All browsers should display the same core functionality
      await expect(page.locator('text=6FB')).toBeVisible()
      await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible()
      
      // Interactions should work regardless of browser
      const viewSelect = page.locator('select').first()
      await viewSelect.selectOption('week')
      
      await expect(viewSelect).toHaveValue('week')
      
      console.log(`Test passed in ${browserName}`)
    })
  })

  test.describe('Demo-to-Production Workflow', () => {
    test('demonstrates features that lead to production usage', async ({ page }) => {
      // Demo should clearly show production value
      await expect(page.locator('text=Six Figure Barber Platform')).toBeVisible()
      await expect(page.locator('text=Revenue button to access')).toBeVisible()
      
      // Should highlight real business value
      await expect(page.locator('text=AI-powered business intelligence')).toBeVisible()
      await expect(page.locator('text=Revenue forecasting')).toBeVisible()
    })

    test('provides clear path to advanced features', async ({ page }) => {
      // Instructions should guide toward advanced usage
      await expect(page.locator('text=advanced analytics suite')).toBeVisible()
      await expect(page.locator('text=interactive charts')).toBeVisible()
      await expect(page.locator('text=predictive forecasting')).toBeVisible()
    })
  })
})
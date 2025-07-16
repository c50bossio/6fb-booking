/**
 * End-to-End Mobile Gesture User Journey Tests
 * 
 * Tests complete user workflows using mobile gestures on touch devices.
 * Simulates real user interactions with the Phase 2 calendar system.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

// Test configuration for mobile
test.use({
  viewport: { width: 375, height: 812 }, // iPhone X dimensions
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3
})

// Mock data setup
const mockAppointments = [
  {
    id: 1,
    start_time: '2023-12-01T10:00:00Z',
    client_name: 'John Doe',
    service_name: 'Haircut',
    barber_name: 'Mike Johnson',
    status: 'scheduled'
  },
  {
    id: 2,
    start_time: '2023-12-01T14:00:00Z',
    client_name: 'Jane Smith',
    service_name: 'Cut & Style',
    barber_name: 'Sarah Wilson',
    status: 'confirmed'
  }
]

test.describe('Mobile Gesture User Journeys', () => {
  let page: Page
  let context: BrowserContext

  test.beforeEach(async ({ page: testPage, context: testContext }) => {
    page = testPage
    context = testContext

    // Mock API responses
    await page.route('**/api/appointments**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAppointments)
      })
    })

    await page.route('**/api/barbers**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Mike Johnson', available: true },
          { id: 2, name: 'Sarah Wilson', available: true }
        ])
      })
    })

    // Navigate to calendar page
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Touch Navigation Gestures', () => {
    test('swipe left/right navigates between calendar periods', async () => {
      // Wait for calendar to load
      await page.waitForSelector('[role="application"]')
      
      // Get initial date display
      const initialDate = await page.textContent('[id="calendar-period-title"]')
      
      // Perform swipe left gesture
      const calendar = page.locator('[role="application"]')
      await calendar.touchStart([{ x: 300, y: 400 }])
      await calendar.touchMove([{ x: 100, y: 400 }])
      await calendar.touchEnd()

      // Wait for navigation animation
      await page.waitForTimeout(500)
      
      // Verify date changed
      const newDate = await page.textContent('[id="calendar-period-title"]')
      expect(newDate).not.toBe(initialDate)

      // Swipe right to go back
      await calendar.touchStart([{ x: 100, y: 400 }])
      await calendar.touchMove([{ x: 300, y: 400 }])
      await calendar.touchEnd()

      await page.waitForTimeout(500)
      
      // Should return to original date
      const returnedDate = await page.textContent('[id="calendar-period-title"]')
      expect(returnedDate).toBe(initialDate)
    })

    test('pinch gesture switches between calendar views', async () => {
      await page.waitForSelector('[role="application"]')

      // Start in month view
      const monthButton = page.locator('text=Month')
      if (await monthButton.isVisible()) {
        await monthButton.click()
      }

      // Perform pinch out gesture (zoom in to week view)
      const calendar = page.locator('[role="application"]')
      await calendar.touchStart([
        { x: 150, y: 300 },
        { x: 225, y: 300 }
      ])
      await calendar.touchMove([
        { x: 100, y: 300 },
        { x: 275, y: 300 }
      ])
      await calendar.touchEnd()

      await page.waitForTimeout(300)

      // Check if view changed to week
      const weekIndicator = page.locator('text=Week')
      expect(await weekIndicator.isVisible()).toBeTruthy()
    })

    test('long press creates new appointment', async () => {
      await page.waitForSelector('[role="application"]')

      // Long press on empty time slot
      const timeSlot = page.locator('.time-slot').first()
      await timeSlot.touchStart([{ x: 200, y: 350 }])
      await page.waitForTimeout(600) // Long press duration
      await timeSlot.touchEnd()

      // Check if appointment creation modal appears
      await expect(page.locator('[role="dialog"]')).toBeVisible()
      
      // Verify modal content
      await expect(page.locator('text=Create Appointment')).toBeVisible()
    })
  })

  test.describe('Appointment Management Gestures', () => {
    test('tap appointment opens details modal', async () => {
      await page.waitForSelector('[role="application"]')

      // Wait for appointments to load
      await page.waitForSelector('text=John Doe')

      // Tap on appointment
      const appointment = page.locator('text=John Doe').first()
      await appointment.click()

      // Check appointment details modal
      await expect(page.locator('[role="dialog"]')).toBeVisible()
      await expect(page.locator('text=John Doe')).toBeVisible()
      await expect(page.locator('text=Haircut')).toBeVisible()
    })

    test('drag and drop reschedules appointment', async () => {
      await page.waitForSelector('[role="application"]')
      await page.waitForSelector('text=John Doe')

      // Get appointment element
      const appointment = page.locator('[data-appointment-id="1"]').first()
      const appointmentBox = await appointment.boundingBox()
      
      if (!appointmentBox) {
        throw new Error('Could not find appointment element')
      }

      // Drag appointment to new time slot (2 hours later)
      const startX = appointmentBox.x + appointmentBox.width / 2
      const startY = appointmentBox.y + appointmentBox.height / 2
      const endY = startY + 160 // Move down 4 time slots (4 * 40px)

      await page.mouse.move(startX, startY)
      await page.mouse.down()
      await page.mouse.move(startX, endY, { steps: 10 })
      await page.mouse.up()

      // Wait for update to process
      await page.waitForTimeout(1000)

      // Verify appointment moved
      const updatedAppointment = page.locator('[data-appointment-id="1"]').first()
      const newBox = await updatedAppointment.boundingBox()
      
      expect(newBox?.y).toBeGreaterThan(appointmentBox.y)
    })

    test('handles drag with conflict resolution', async () => {
      await page.waitForSelector('[role="application"]')
      await page.waitForSelector('text=John Doe')

      // Mock conflict response
      await page.route('**/api/appointments/*/update', async route => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Scheduling conflict detected',
            conflicts: [
              {
                type: 'time_overlap',
                message: 'Overlaps with existing appointment'
              }
            ]
          })
        })
      })

      // Attempt to drag appointment to conflicting time
      const appointment = page.locator('[data-appointment-id="1"]').first()
      const conflictingSlot = page.locator('[data-appointment-id="2"]').first()
      
      await appointment.dragTo(conflictingSlot)

      // Check conflict resolution modal appears
      await expect(page.locator('text=Scheduling conflict')).toBeVisible()
      await expect(page.locator('text=Overlaps with existing appointment')).toBeVisible()
    })
  })

  test.describe('Touch-Friendly Navigation', () => {
    test('mobile calendar controls work with touch', async () => {
      await page.waitForSelector('[role="application"]')

      // Test date picker touch interaction
      const dateButton = page.locator('[role="button"]').filter({ hasText: /December|January|February/ }).first()
      await dateButton.click()

      // Date picker should open
      await expect(page.locator('text=Today')).toBeVisible()

      // Select a different month
      const monthButton = page.locator('text=Jan').first()
      await monthButton.click()

      // Date picker should close and date should change
      await page.waitForTimeout(500)
      expect(await dateButton.textContent()).toContain('Jan')
    })

    test('view selector buttons are touch-friendly', async () => {
      await page.waitForSelector('[role="application"]')

      // Test view switching with touch
      const weekButton = page.locator('text=Week').first()
      const monthButton = page.locator('text=Month').first()
      const dayButton = page.locator('text=Day').first()

      // Switch to week view
      await weekButton.click()
      await page.waitForTimeout(300)
      
      // Switch to day view
      await dayButton.click()
      await page.waitForTimeout(300)
      
      // Switch back to month view
      await monthButton.click()
      await page.waitForTimeout(300)

      // All switches should work smoothly
      expect(await monthButton.isVisible()).toBeTruthy()
    })

    test('today button functions correctly', async () => {
      await page.waitForSelector('[role="application"]')

      // Navigate away from today first
      const nextButton = page.locator('[aria-label*="next"]').first()
      await nextButton.click()
      await nextButton.click() // Move 2 periods ahead

      const initialDate = await page.textContent('[id="calendar-period-title"]')

      // Click Today button
      const todayButton = page.locator('text=Today').first()
      await todayButton.click()

      await page.waitForTimeout(500)

      // Should return to current date
      const currentDate = await page.textContent('[id="calendar-period-title"]')
      expect(currentDate).not.toBe(initialDate)
      
      // Should contain current month/year
      const now = new Date()
      const currentMonth = now.toLocaleString('default', { month: 'long' })
      expect(currentDate).toContain(currentMonth)
    })
  })

  test.describe('Bulk Operations on Mobile', () => {
    test('multi-select with touch gestures', async () => {
      await page.waitForSelector('[role="application"]')
      await page.waitForSelector('text=John Doe')

      // Enable multi-select mode (long press on first appointment)
      const firstAppointment = page.locator('[data-appointment-id="1"]').first()
      await firstAppointment.touchStart([{ x: 200, y: 300 }])
      await page.waitForTimeout(800) // Long press
      await firstAppointment.touchEnd()

      // Check if selection mode is active
      await expect(page.locator('text=Bulk Actions')).toBeVisible()

      // Tap second appointment to add to selection
      const secondAppointment = page.locator('[data-appointment-id="2"]').first()
      await secondAppointment.click()

      // Check selection count
      await expect(page.locator('text=2 of')).toBeVisible()
    })

    test('bulk operations modal is touch-friendly', async () => {
      await page.waitForSelector('[role="application"]')
      
      // Mock multi-select state
      await page.evaluate(() => {
        // Simulate having appointments selected
        const event = new CustomEvent('multiSelectActive', { 
          detail: { selectedCount: 2 } 
        })
        document.dispatchEvent(event)
      })

      // Look for bulk actions button
      const bulkActionsButton = page.locator('text=Bulk Actions')
      if (await bulkActionsButton.isVisible()) {
        await bulkActionsButton.click()

        // Check bulk operations modal
        await expect(page.locator('text=Reschedule')).toBeVisible()
        await expect(page.locator('text=Cancel')).toBeVisible()
        await expect(page.locator('text=Mark Complete')).toBeVisible()

        // Test touch interaction with bulk operation
        const rescheduleButton = page.locator('text=Reschedule').first()
        await rescheduleButton.click()

        // Should show date/time picker for rescheduling
        await page.waitForTimeout(300)
      }
    })
  })

  test.describe('Performance on Mobile', () => {
    test('smooth scrolling with large appointment lists', async () => {
      // Mock large dataset
      const largeAppointmentSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        start_time: `2023-12-01T${String(8 + Math.floor(i / 10)).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}:00Z`,
        client_name: `Client ${i + 1}`,
        service_name: 'Service',
        barber_name: 'Barber',
        status: 'scheduled'
      }))

      await page.route('**/api/appointments**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeAppointmentSet)
        })
      })

      await page.reload()
      await page.waitForLoadState('networkidle')

      // Test scrolling performance
      const calendar = page.locator('[role="application"]')
      
      const startTime = Date.now()
      
      // Perform scroll gesture
      for (let i = 0; i < 5; i++) {
        await calendar.wheel({ deltaY: 500 })
        await page.waitForTimeout(100)
      }
      
      const endTime = Date.now()
      const scrollDuration = endTime - startTime

      // Scrolling should be responsive (< 2 seconds for 5 scrolls)
      expect(scrollDuration).toBeLessThan(2000)

      // Content should still be visible after scrolling
      await expect(page.locator('text=Client')).toBeVisible()
    })

    test('animation performance during interactions', async () => {
      await page.waitForSelector('[role="application"]')

      // Measure animation performance
      const startTime = Date.now()

      // Trigger multiple animations
      const appointment = page.locator('text=John Doe').first()
      
      // Hover animations
      await appointment.hover()
      await page.waitForTimeout(100)
      
      // Click animations
      await appointment.click()
      await page.waitForTimeout(300)
      
      // Close modal
      const closeButton = page.locator('[aria-label="Close"]').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
      }
      
      const endTime = Date.now()
      const animationDuration = endTime - startTime

      // Animations should complete quickly (< 1 second total)
      expect(animationDuration).toBeLessThan(1000)
    })
  })

  test.describe('Edge Cases and Error Handling', () => {
    test('handles network disconnection gracefully', async () => {
      await page.waitForSelector('[role="application"]')

      // Simulate network failure
      await page.route('**/api/**', route => route.abort())

      // Try to perform action that requires network
      const appointment = page.locator('text=John Doe').first()
      await appointment.click()

      // Should show error state but not crash
      await page.waitForTimeout(1000)
      expect(await page.locator('[role="application"]').isVisible()).toBeTruthy()
    })

    test('recovers from gesture recognition failures', async () => {
      await page.waitForSelector('[role="application"]')

      const calendar = page.locator('[role="application"]')

      // Perform invalid gesture sequence
      await calendar.touchStart([{ x: 100, y: 100 }])
      await calendar.touchMove([{ x: 150, y: 150 }])
      // Don't end the touch event to simulate incomplete gesture

      await page.waitForTimeout(500)

      // Calendar should still be functional
      const appointment = page.locator('text=John Doe').first()
      await appointment.click()

      await expect(page.locator('[role="dialog"]')).toBeVisible()
    })

    test('handles rapid gesture sequences', async () => {
      await page.waitForSelector('[role="application"]')

      const calendar = page.locator('[role="application"]')

      // Rapid swipe sequence
      for (let i = 0; i < 5; i++) {
        await calendar.touchStart([{ x: 300, y: 400 }])
        await calendar.touchMove([{ x: 100, y: 400 }])
        await calendar.touchEnd()
        await page.waitForTimeout(50) // Very short delay
      }

      // Calendar should still be responsive
      expect(await calendar.isVisible()).toBeTruthy()
      
      // Should be able to interact normally
      const appointment = page.locator('text=John Doe').first()
      await appointment.click()
      await expect(page.locator('[role="dialog"]')).toBeVisible()
    })
  })

  test.describe('Accessibility with Touch', () => {
    test('touch gestures work with screen reader', async () => {
      // Enable accessibility features
      await page.addInitScript(() => {
        // Mock screen reader environment
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 VoiceOver'
        })
      })

      await page.waitForSelector('[role="application"]')

      // Check ARIA labels are present for touch elements
      const calendar = page.locator('[role="application"]')
      expect(await calendar.getAttribute('aria-label')).toBeTruthy()

      // Check appointments have proper labeling
      const appointment = page.locator('[data-appointment-id="1"]').first()
      expect(await appointment.getAttribute('aria-label')).toBeTruthy()

      // Touch interaction should trigger announcements
      await appointment.click()
      
      // Live region should update
      const liveRegion = page.locator('[aria-live="polite"]')
      expect(await liveRegion.isVisible()).toBeTruthy()
    })

    test('high contrast mode works with touch interactions', async () => {
      // Enable high contrast mode
      await page.addInitScript(() => {
        Object.defineProperty(window, 'matchMedia', {
          value: (query: string) => ({
            matches: query.includes('prefers-contrast: high'),
            addEventListener: () => {},
            removeEventListener: () => {}
          })
        })
      })

      await page.reload()
      await page.waitForLoadState('networkidle')

      // Touch interactions should still work in high contrast
      const appointment = page.locator('text=John Doe').first()
      await appointment.click()

      await expect(page.locator('[role="dialog"]')).toBeVisible()
    })
  })
})

test.describe('Cross-Device Gesture Compatibility', () => {
  test('works on different mobile screen sizes', async ({ browser }) => {
    // Test different viewports
    const devices = [
      { width: 375, height: 812, name: 'iPhone X' },
      { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
      { width: 360, height: 640, name: 'Android' },
      { width: 768, height: 1024, name: 'iPad' }
    ]

    for (const device of devices) {
      const context = await browser.newContext({
        viewport: device,
        isMobile: true,
        hasTouch: true
      })
      
      const page = await context.newPage()
      
      await page.route('**/api/appointments**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAppointments)
        })
      })

      await page.goto('/calendar')
      await page.waitForLoadState('networkidle')

      // Basic gesture should work on all devices
      const calendar = page.locator('[role="application"]')
      await calendar.touchStart([{ x: device.width * 0.8, y: device.height * 0.5 }])
      await calendar.touchMove([{ x: device.width * 0.2, y: device.height * 0.5 }])
      await calendar.touchEnd()

      await page.waitForTimeout(300)

      // Calendar should still be functional
      expect(await calendar.isVisible()).toBeTruthy()
      
      await context.close()
    }
  })
})
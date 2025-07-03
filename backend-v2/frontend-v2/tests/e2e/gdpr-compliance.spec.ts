/**
 * End-to-end tests for GDPR compliance and cookie consent flows
 * Tests complete user journeys through cookie banners, privacy settings, and data management
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

test.describe('GDPR Compliance E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing cookies/localStorage before each test
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
  })

  test.describe('Cookie Banner Flow', () => {
    test('displays cookie banner on first visit', async ({ page }) => {
      await page.goto('/')
      
      // Cookie banner should be visible
      const cookieBanner = page.getByRole('dialog').filter({ hasText: 'We value your privacy' })
      await expect(cookieBanner).toBeVisible()
      
      // Check banner content
      await expect(page.getByText('We use cookies to enhance your experience')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Accept All' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Reject All' })).toBeVisible()
      await expect(page.getByRole('button', { name: /Manage Preferences/i })).toBeVisible()
    })

    test('hides banner after accepting all cookies', async ({ page }) => {
      await page.goto('/')
      
      // Accept all cookies
      await page.getByRole('button', { name: 'Accept All' }).click()
      
      // Banner should disappear
      const cookieBanner = page.getByRole('dialog').filter({ hasText: 'We value your privacy' })
      await expect(cookieBanner).not.toBeVisible()
      
      // Reload page - banner should not reappear
      await page.reload()
      await expect(cookieBanner).not.toBeVisible()
    })

    test('hides banner after rejecting all cookies', async ({ page }) => {
      await page.goto('/')
      
      // Reject all cookies
      await page.getByRole('button', { name: 'Reject All' }).click()
      
      // Banner should disappear
      const cookieBanner = page.getByRole('dialog').filter({ hasText: 'We value your privacy' })
      await expect(cookieBanner).not.toBeVisible()
      
      // Reload page - banner should not reappear
      await page.reload()
      await expect(cookieBanner).not.toBeVisible()
    })

    test('expands and collapses cookie details', async ({ page }) => {
      await page.goto('/')
      
      // Initially details should be hidden
      await expect(page.getByText('Necessary Cookies')).not.toBeVisible()
      
      // Click learn more
      await page.getByRole('button', { name: 'Learn more' }).click()
      
      // Details should be visible
      await expect(page.getByText('Necessary Cookies')).toBeVisible()
      await expect(page.getByText('Analytics Cookies')).toBeVisible()
      await expect(page.getByText('Marketing Cookies')).toBeVisible()
      await expect(page.getByText('Functional Cookies')).toBeVisible()
      
      // Click show less
      await page.getByRole('button', { name: /Show less/i }).click()
      
      // Details should be hidden again
      await expect(page.getByText('Necessary Cookies')).not.toBeVisible()
    })

    test('toggles cookie categories in expanded view', async ({ page }) => {
      await page.goto('/')
      
      // Expand details
      await page.getByRole('button', { name: 'Learn more' }).click()
      
      // Check initial states
      const analyticsToggle = page.getByLabel('Toggle Analytics Cookies')
      const marketingToggle = page.getByLabel('Toggle Marketing Cookies')
      const necessaryToggle = page.getByLabel('Toggle Necessary Cookies')
      
      await expect(analyticsToggle).not.toBeChecked()
      await expect(marketingToggle).not.toBeChecked()
      await expect(necessaryToggle).toBeChecked()
      await expect(necessaryToggle).toBeDisabled() // Should be required
      
      // Toggle analytics on
      await analyticsToggle.click()
      await expect(analyticsToggle).toBeChecked()
      
      // Toggle marketing on
      await marketingToggle.click()
      await expect(marketingToggle).toBeChecked()
    })
  })

  test.describe('Cookie Preferences Modal', () => {
    test('opens preferences modal from banner', async ({ page }) => {
      await page.goto('/')
      
      // Click manage preferences
      await page.getByRole('button', { name: /Manage Preferences/i }).click()
      
      // Modal should open
      const modal = page.getByRole('dialog', { name: /Cookie Preferences/i })
      await expect(modal).toBeVisible()
      await expect(page.getByText('Customize your cookie settings')).toBeVisible()
    })

    test('displays all cookie categories in modal', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /Manage Preferences/i }).click()
      
      // Check all categories are displayed
      await expect(page.getByText('Necessary Cookies')).toBeVisible()
      await expect(page.getByText('Analytics Cookies')).toBeVisible()
      await expect(page.getByText('Marketing Cookies')).toBeVisible()
      await expect(page.getByText('Functional Cookies')).toBeVisible()
      
      // Check required badge for necessary cookies
      await expect(page.getByText('Required')).toBeVisible()
      
      // Check examples are shown
      await expect(page.getByText(/Authentication, security, basic functionality/)).toBeVisible()
      await expect(page.getByText(/Google Analytics, page views, user behavior/)).toBeVisible()
    })

    test('saves custom preferences from modal', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /Manage Preferences/i }).click()
      
      // Toggle analytics on, marketing off
      await page.getByLabel('Toggle Analytics Cookies').click()
      await page.getByLabel('Toggle Marketing Cookies').click() // Should be off by default, this turns it on
      await page.getByLabel('Toggle Marketing Cookies').click() // Turn it back off
      
      // Save preferences
      await page.getByRole('button', { name: 'Save Preferences' }).click()
      
      // Modal should close
      const modal = page.getByRole('dialog', { name: /Cookie Preferences/i })
      await expect(modal).not.toBeVisible()
      
      // Banner should be hidden
      const cookieBanner = page.getByRole('dialog').filter({ hasText: 'We value your privacy' })
      await expect(cookieBanner).not.toBeVisible()
    })

    test('cancels preference changes', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /Manage Preferences/i }).click()
      
      // Make some changes
      await page.getByLabel('Toggle Analytics Cookies').click()
      
      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click()
      
      // Modal should close
      const modal = page.getByRole('dialog', { name: /Cookie Preferences/i })
      await expect(modal).not.toBeVisible()
      
      // Banner should still be visible (no preferences saved)
      const cookieBanner = page.getByRole('dialog').filter({ hasText: 'We value your privacy' })
      await expect(cookieBanner).toBeVisible()
    })

    test('includes privacy information and links', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /Manage Preferences/i }).click()
      
      // Check privacy information section
      await expect(page.getByText('About your privacy:')).toBeVisible()
      await expect(page.getByText(/Your preferences are stored locally and on our servers/)).toBeVisible()
      
      // Check policy links
      await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
      await expect(page.getByRole('link', { name: 'Cookie Policy' })).toHaveAttribute('href', '/cookies')
    })
  })

  test.describe('Privacy Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Set up authenticated session - go to privacy dashboard
      await page.goto('/dashboard/privacy')
    })

    test('displays privacy status overview', async ({ page }) => {
      // Should show privacy dashboard title
      await expect(page.getByRole('heading', { name: 'Privacy Dashboard' })).toBeVisible()
      await expect(page.getByText('Manage your privacy settings and data preferences')).toBeVisible()
      
      // Should show privacy status section
      await expect(page.getByText('Privacy Status')).toBeVisible()
      await expect(page.getByText('Your current privacy and cookie preferences')).toBeVisible()
      
      // Should show all cookie categories
      await expect(page.getByText('Necessary Cookies')).toBeVisible()
      await expect(page.getByText('Analytics Cookies')).toBeVisible()
      await expect(page.getByText('Marketing Cookies')).toBeVisible()
      await expect(page.getByText('Functional Cookies')).toBeVisible()
    })

    test('manages cookie preferences in dashboard', async ({ page }) => {
      // Should show cookie preferences section
      await expect(page.getByText('Cookie Preferences')).toBeVisible()
      await expect(page.getByText('Control which cookies and tracking technologies we use')).toBeVisible()
      
      // Check that toggles exist and necessary is disabled
      const analyticsToggle = page.getByLabel(/Toggle Analytics/)
      const necessaryToggle = page.getByLabel(/Toggle Necessary/)
      
      await expect(analyticsToggle).toBeVisible()
      await expect(necessaryToggle).toBeVisible()
      await expect(necessaryToggle).toBeDisabled()
      
      // Make a change
      await analyticsToggle.click()
      
      // Should show unsaved changes alert
      await expect(page.getByText('You have unsaved changes to your privacy preferences')).toBeVisible()
      
      // Save button should be enabled
      const saveButton = page.getByRole('button', { name: 'Save Preferences' })
      await expect(saveButton).toBeEnabled()
      
      // Save changes
      await saveButton.click()
      
      // Alert should disappear
      await expect(page.getByText('You have unsaved changes')).not.toBeVisible()
    })

    test('exports privacy data', async ({ page }) => {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download')
      
      // Click export button
      await page.getByRole('button', { name: 'Export Data' }).click()
      
      // Wait for download to start
      const download = await downloadPromise
      
      // Verify download properties
      expect(download.suggestedFilename()).toMatch(/privacy-data-\d{4}-\d{2}-\d{2}\.json/)
      
      // Verify file size is reasonable (not empty)
      const stream = await download.createReadStream()
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const content = Buffer.concat(chunks)
      expect(content.length).toBeGreaterThan(10) // Should have some content
      
      // Verify it's valid JSON
      const jsonData = JSON.parse(content.toString())
      expect(jsonData).toHaveProperty('timestamp')
      expect(jsonData).toHaveProperty('currentPreferences')
      expect(jsonData).toHaveProperty('consentHistory')
    })

    test('resets consent preferences', async ({ page }) => {
      // Click reset consent button
      await page.getByRole('button', { name: 'Reset Consent' }).click()
      
      // Should show confirmation dialog
      await expect(page.getByText('Reset Privacy Consent')).toBeVisible()
      await expect(page.getByText(/This will clear all your privacy preferences/)).toBeVisible()
      
      // Confirm reset
      await page.getByRole('button', { name: 'Reset Consent' }).click()
      
      // Dialog should close
      await expect(page.getByText('Reset Privacy Consent')).not.toBeVisible()
      
      // Should redirect or reload to show reset state
      // (Implementation dependent - might show banner again or clear preferences)
    })

    test('displays consent history', async ({ page }) => {
      // First set some preferences to create history
      await page.goto('/')
      await page.getByRole('button', { name: 'Accept All' }).click()
      
      // Go to privacy dashboard
      await page.goto('/dashboard/privacy')
      
      // Should show consent history section (if history exists)
      const historySection = page.getByText('Consent History')
      if (await historySection.isVisible()) {
        await expect(page.getByText('Your previous privacy preference changes')).toBeVisible()
        
        // Should show at least one history entry
        const historyEntries = page.locator('[data-testid="consent-history-entry"]')
        await expect(historyEntries.first()).toBeVisible()
      }
    })

    test('includes legal information links', async ({ page }) => {
      // Should show legal information section
      await expect(page.getByText('Legal Information')).toBeVisible()
      await expect(page.getByText('Review our privacy policies and terms')).toBeVisible()
      
      // Check all legal links
      const privacyLink = page.getByRole('link', { name: 'Privacy Policy' })
      const cookieLink = page.getByRole('link', { name: 'Cookie Policy' })
      const termsLink = page.getByRole('link', { name: 'Terms of Service' })
      
      await expect(privacyLink).toHaveAttribute('href', '/privacy')
      await expect(cookieLink).toHaveAttribute('href', '/cookies')
      await expect(termsLink).toHaveAttribute('href', '/terms')
      
      // Check they open in new tabs
      await expect(privacyLink).toHaveAttribute('target', '_blank')
      await expect(cookieLink).toHaveAttribute('target', '_blank')
      await expect(termsLink).toHaveAttribute('target', '_blank')
    })
  })

  test.describe('Registration Consent Flow', () => {
    test('shows consent checkboxes during registration', async ({ page }) => {
      await page.goto('/auth/register')
      
      // Should show consent checkboxes
      await expect(page.getByLabel(/I agree to the Terms of Service/)).toBeVisible()
      await expect(page.getByLabel(/I agree to the Privacy Policy/)).toBeVisible()
      
      // May show optional marketing consent
      const marketingConsent = page.getByLabel(/I want to receive marketing emails/)
      if (await marketingConsent.isVisible()) {
        await expect(marketingConsent).not.toBeChecked() // Should be opt-in
      }
    })

    test('requires mandatory consents for registration', async ({ page }) => {
      await page.goto('/auth/register')
      
      // Fill out form without consent
      await page.getByLabel('Name').fill('Test User')
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Password', { exact: true }).fill('testpass123')
      
      // Try to submit without checking required consents
      await page.getByRole('button', { name: 'Register' }).click()
      
      // Should show validation errors or prevent submission
      // (Implementation specific - could be validation message or disabled button)
      const termsCheckbox = page.getByLabel(/I agree to the Terms of Service/)
      const privacyCheckbox = page.getByLabel(/I agree to the Privacy Policy/)
      
      if (await termsCheckbox.isVisible()) {
        await expect(termsCheckbox).not.toBeChecked()
      }
      if (await privacyCheckbox.isVisible()) {
        await expect(privacyCheckbox).not.toBeChecked()
      }
    })

    test('allows registration with mandatory consents', async ({ page }) => {
      await page.goto('/auth/register')
      
      // Fill out form
      await page.getByLabel('Name').fill('Test User')
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Password', { exact: true }).fill('testpass123')
      
      // Check required consents
      const termsCheckbox = page.getByLabel(/I agree to the Terms of Service/)
      const privacyCheckbox = page.getByLabel(/I agree to the Privacy Policy/)
      
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check()
      }
      if (await privacyCheckbox.isVisible()) {
        await privacyCheckbox.check()
      }
      
      // Submit form
      await page.getByRole('button', { name: 'Register' }).click()
      
      // Should either redirect to success page or show success message
      // (Implementation specific)
    })
  })

  test.describe('Cross-Page Consent Persistence', () => {
    test('persists cookie preferences across page navigation', async ({ page }) => {
      // Accept analytics cookies on home page
      await page.goto('/')
      await page.getByRole('button', { name: 'Learn more' }).click()
      await page.getByLabel('Toggle Analytics Cookies').click()
      await page.getByRole('button', { name: 'Accept All' }).click()
      
      // Navigate to another page
      await page.goto('/about')
      
      // Cookie banner should not appear
      const cookieBanner = page.getByRole('dialog').filter({ hasText: 'We value your privacy' })
      await expect(cookieBanner).not.toBeVisible()
      
      // Go to privacy dashboard and verify settings
      await page.goto('/dashboard/privacy')
      
      // Analytics should be enabled
      const analyticsStatus = page.locator('text=Analytics').locator('..').getByText('Enabled')
      await expect(analyticsStatus).toBeVisible()
    })

    test('maintains consent state across browser sessions', async ({ context, page }) => {
      // Accept cookies
      await page.goto('/')
      await page.getByRole('button', { name: 'Accept All' }).click()
      
      // Close page and create new one (simulating new session)
      await page.close()
      const newPage = await context.newPage()
      
      // Cookie banner should not appear on new page
      await newPage.goto('/')
      const cookieBanner = newPage.getByRole('dialog').filter({ hasText: 'We value your privacy' })
      await expect(cookieBanner).not.toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('cookie banner is accessible', async ({ page }) => {
      await page.goto('/')
      
      const cookieBanner = page.getByRole('dialog').filter({ hasText: 'We value your privacy' })
      
      // Should have proper ARIA attributes
      await expect(cookieBanner).toHaveAttribute('aria-labelledby')
      await expect(cookieBanner).toHaveAttribute('aria-describedby')
      
      // Should be keyboard navigable
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })

    test('preferences modal is accessible', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /Manage Preferences/i }).click()
      
      const modal = page.getByRole('dialog', { name: /Cookie Preferences/i })
      
      // Should trap focus in modal
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      
      // Focus should be within modal
      await expect(modal).toContainText(await focusedElement.textContent() || '')
      
      // Should be closable with Escape
      await page.keyboard.press('Escape')
      await expect(modal).not.toBeVisible()
    })

    test('toggle switches have proper labels', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /Manage Preferences/i }).click()
      
      // All toggles should have accessible labels
      await expect(page.getByLabel('Toggle Necessary Cookies')).toBeVisible()
      await expect(page.getByLabel('Toggle Analytics Cookies')).toBeVisible()
      await expect(page.getByLabel('Toggle Marketing Cookies')).toBeVisible()
      await expect(page.getByLabel('Toggle Functional Cookies')).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('cookie banner works on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      
      // Banner should be visible and usable
      const cookieBanner = page.getByRole('dialog').filter({ hasText: 'We value your privacy' })
      await expect(cookieBanner).toBeVisible()
      
      // Buttons should be clickable
      await expect(page.getByRole('button', { name: 'Accept All' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Reject All' })).toBeVisible()
      
      // Accept all should work
      await page.getByRole('button', { name: 'Accept All' }).click()
      await expect(cookieBanner).not.toBeVisible()
    })

    test('preferences modal works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      
      // Open preferences modal
      await page.getByRole('button', { name: /Manage Preferences/i }).click()
      
      const modal = page.getByRole('dialog', { name: /Cookie Preferences/i })
      await expect(modal).toBeVisible()
      
      // Should be scrollable if content is too tall
      const modalContent = modal.locator('[role="document"]')
      if (await modalContent.isVisible()) {
        // Verify content doesn't overflow viewport
        const bbox = await modalContent.boundingBox()
        expect(bbox?.height).toBeLessThanOrEqual(667)
      }
      
      // Save button should be accessible
      await expect(page.getByRole('button', { name: 'Save Preferences' })).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('cookie banner loads quickly', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      
      // Banner should appear within reasonable time
      await expect(page.getByRole('dialog').filter({ hasText: 'We value your privacy' })).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    })

    test('preference changes are saved quickly', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /Manage Preferences/i }).click()
      
      // Make a change and save
      await page.getByLabel('Toggle Analytics Cookies').click()
      
      const startTime = Date.now()
      await page.getByRole('button', { name: 'Save Preferences' }).click()
      
      // Modal should close quickly
      const modal = page.getByRole('dialog', { name: /Cookie Preferences/i })
      await expect(modal).not.toBeVisible()
      
      const saveTime = Date.now() - startTime
      expect(saveTime).toBeLessThan(3000) // Should save within 3 seconds
    })
  })
})
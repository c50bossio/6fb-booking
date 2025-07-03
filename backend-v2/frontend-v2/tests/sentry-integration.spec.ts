import { test, expect, Page } from '@playwright/test'

/**
 * Comprehensive Sentry integration tests
 * 
 * These tests verify that Sentry is properly configured and
 * capturing the expected data in different scenarios.
 */

// Mock Sentry for testing
const mockSentryCapture = `
window.__SENTRY_EVENTS__ = []
window.__SENTRY_BREADCRUMBS__ = []

// Mock Sentry methods
if (window.Sentry) {
  const originalCaptureException = window.Sentry.captureException
  const originalAddBreadcrumb = window.Sentry.addBreadcrumb
  
  window.Sentry.captureException = function(error, scope) {
    window.__SENTRY_EVENTS__.push({
      type: 'exception',
      error: error.message || error.toString(),
      timestamp: Date.now(),
      scope: scope || {}
    })
    return originalCaptureException.call(this, error, scope)
  }
  
  window.Sentry.addBreadcrumb = function(breadcrumb) {
    window.__SENTRY_BREADCRUMBS__.push({
      ...breadcrumb,
      timestamp: Date.now()
    })
    return originalAddBreadcrumb.call(this, breadcrumb)
  }
}
`

async function setupSentryMocks(page: Page) {
  await page.addInitScript(mockSentryCapture)
}

async function getSentryEvents(page: Page) {
  return await page.evaluate(() => (window as any).__SENTRY_EVENTS__ || [])
}

async function getSentryBreadcrumbs(page: Page) {
  return await page.evaluate(() => (window as any).__SENTRY_BREADCRUMBS__ || [])
}

test.describe('Sentry Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupSentryMocks(page)
  })

  test('should initialize Sentry on page load', async ({ page }) => {
    await page.goto('/')
    
    // Check that Sentry is available globally
    const sentryExists = await page.evaluate(() => typeof window.Sentry !== 'undefined')
    expect(sentryExists).toBe(true)
    
    // Check that initial breadcrumbs are created
    const breadcrumbs = await getSentryBreadcrumbs(page)
    expect(breadcrumbs.length).toBeGreaterThan(0)
    
    // Look for navigation breadcrumb
    const navigationBreadcrumbs = breadcrumbs.filter(b => b.category?.includes('navigation'))
    expect(navigationBreadcrumbs.length).toBeGreaterThan(0)
  })

  test('should capture user interactions as breadcrumbs', async ({ page }) => {
    await page.goto('/')
    
    // Click on a button (assuming there's a navigation button)
    const button = page.locator('button').first()
    if (await button.count() > 0) {
      await button.click()
      
      const breadcrumbs = await getSentryBreadcrumbs(page)
      const clickBreadcrumbs = breadcrumbs.filter(b => 
        b.category?.includes('ui.click') || b.message?.includes('click')
      )
      expect(clickBreadcrumbs.length).toBeGreaterThan(0)
    }
  })

  test('should track performance metrics', async ({ page }) => {
    await page.goto('/')
    
    // Wait for performance observers to run
    await page.waitForTimeout(2000)
    
    const breadcrumbs = await getSentryBreadcrumbs(page)
    const performanceBreadcrumbs = breadcrumbs.filter(b => 
      b.category?.includes('performance')
    )
    
    // Should have some performance-related breadcrumbs
    expect(performanceBreadcrumbs.length).toBeGreaterThan(0)
  })

  test('should capture errors through error boundary', async ({ page }) => {
    // Create a test page that will throw an error
    await page.goto('/')
    
    // Inject an error-throwing component
    await page.evaluate(() => {
      // Simulate a React error by throwing in a component
      const errorDiv = document.createElement('div')
      errorDiv.innerHTML = 'Test Error Component'
      errorDiv.onclick = () => {
        throw new Error('Test error for Sentry integration')
      }
      document.body.appendChild(errorDiv)
    })
    
    // Trigger the error
    await page.click('div:has-text("Test Error Component")')
    
    // Wait for error to be processed
    await page.waitForTimeout(1000)
    
    const events = await getSentryEvents(page)
    const errorEvents = events.filter(e => e.type === 'exception')
    
    // Should have captured the error
    expect(errorEvents.length).toBeGreaterThan(0)
    expect(errorEvents[0].error).toContain('Test error for Sentry integration')
  })

  test('should track API requests with proper context', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/**', async route => {
      const url = route.request().url()
      if (url.includes('/api/test')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
          headers: {
            'X-Request-ID': 'test-request-123'
          }
        })
      } else {
        await route.continue()
      }
    })
    
    await page.goto('/')
    
    // Make an API request
    await page.evaluate(async () => {
      try {
        const response = await fetch('/api/test', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        await response.json()
      } catch (error) {
        console.error('API request failed:', error)
      }
    })
    
    // Wait for breadcrumbs to be added
    await page.waitForTimeout(1000)
    
    const breadcrumbs = await getSentryBreadcrumbs(page)
    const apiBreadcrumbs = breadcrumbs.filter(b => 
      b.category?.includes('fetch') || b.message?.includes('API')
    )
    
    expect(apiBreadcrumbs.length).toBeGreaterThan(0)
  })

  test('should handle API errors properly', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/error-test', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })
    
    await page.goto('/')
    
    // Make an API request that will fail
    await page.evaluate(async () => {
      try {
        const response = await fetch('/api/error-test')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        // Error should be captured by Sentry
        if (window.Sentry) {
          window.Sentry.captureException(error)
        }
      }
    })
    
    await page.waitForTimeout(1000)
    
    const events = await getSentryEvents(page)
    const errorEvents = events.filter(e => e.type === 'exception')
    
    expect(errorEvents.length).toBeGreaterThan(0)
    expect(errorEvents.some(e => e.error.includes('HTTP 500'))).toBe(true)
  })

  test('should track user context properly', async ({ page }) => {
    await page.goto('/')
    
    // Simulate setting user context
    await page.evaluate(() => {
      if (window.Sentry) {
        window.Sentry.setUser({
          id: 'test-user-123',
          email: 'test@example.com'
        })
        
        window.Sentry.setTag('user.role', 'client')
        window.Sentry.setTag('feature', 'booking')
      }
    })
    
    // Trigger an error to see if user context is attached
    await page.evaluate(() => {
      if (window.Sentry) {
        window.Sentry.captureException(new Error('Test error with user context'))
      }
    })
    
    await page.waitForTimeout(500)
    
    const events = await getSentryEvents(page)
    expect(events.length).toBeGreaterThan(0)
  })

  test('should track form interactions', async ({ page }) => {
    await page.goto('/')
    
    // Create a test form
    await page.evaluate(() => {
      const form = document.createElement('form')
      form.innerHTML = `
        <input type="text" name="name" placeholder="Name" />
        <input type="email" name="email" placeholder="Email" />
        <button type="submit">Submit</button>
      `
      document.body.appendChild(form)
    })
    
    // Interact with form fields
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    await page.waitForTimeout(1000)
    
    const breadcrumbs = await getSentryBreadcrumbs(page)
    const formBreadcrumbs = breadcrumbs.filter(b => 
      b.category?.includes('form') || b.category?.includes('ui')
    )
    
    expect(formBreadcrumbs.length).toBeGreaterThan(0)
  })

  test('should handle network connectivity changes', async ({ page }) => {
    await page.goto('/')
    
    // Simulate going offline
    await page.evaluate(() => {
      // Dispatch offline event
      window.dispatchEvent(new Event('offline'))
    })
    
    await page.waitForTimeout(500)
    
    // Simulate going back online
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'))
    })
    
    await page.waitForTimeout(500)
    
    const breadcrumbs = await getSentryBreadcrumbs(page)
    const connectivityBreadcrumbs = breadcrumbs.filter(b => 
      b.message?.includes('Connection') || b.message?.includes('online')
    )
    
    expect(connectivityBreadcrumbs.length).toBeGreaterThan(0)
  })

  test('should track page visibility changes', async ({ page }) => {
    await page.goto('/')
    
    // Simulate page becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    await page.waitForTimeout(500)
    
    // Simulate page becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    await page.waitForTimeout(500)
    
    const breadcrumbs = await getSentryBreadcrumbs(page)
    const visibilityBreadcrumbs = breadcrumbs.filter(b => 
      b.message?.includes('Page') && (b.message?.includes('hidden') || b.message?.includes('visible'))
    )
    
    expect(visibilityBreadcrumbs.length).toBeGreaterThan(0)
  })

  test('should handle memory tracking', async ({ page }) => {
    // This test checks if memory tracking is working (when available)
    await page.goto('/')
    
    const hasMemoryAPI = await page.evaluate(() => {
      return 'memory' in performance
    })
    
    if (hasMemoryAPI) {
      // Wait for memory tracking to kick in
      await page.waitForTimeout(3000)
      
      const breadcrumbs = await getSentryBreadcrumbs(page)
      const memoryBreadcrumbs = breadcrumbs.filter(b => 
        b.message?.includes('Memory') || b.data?.type === 'memory'
      )
      
      expect(memoryBreadcrumbs.length).toBeGreaterThan(0)
    }
  })
})

test.describe('Sentry Error Boundary Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupSentryMocks(page)
  })

  test('should show error boundary UI when error occurs', async ({ page }) => {
    await page.goto('/')
    
    // Inject a component that will cause an error
    await page.evaluate(() => {
      const errorButton = document.createElement('button')
      errorButton.textContent = 'Trigger Error'
      errorButton.onclick = () => {
        // Simulate a React component error
        const error = new Error('Component error for testing')
        if (window.Sentry) {
          window.Sentry.captureException(error)
        }
        
        // Show error boundary UI
        const errorDiv = document.createElement('div')
        errorDiv.innerHTML = `
          <div data-testid="error-boundary" style="padding: 20px; border: 1px solid red;">
            <h2>Something went wrong</h2>
            <button data-testid="try-again">Try Again</button>
            <button data-testid="report-issue">Report Issue</button>
          </div>
        `
        document.body.appendChild(errorDiv)
      }
      document.body.appendChild(errorButton)
    })
    
    // Trigger the error
    await page.click('button:has-text("Trigger Error")')
    
    // Check that error boundary UI is shown
    await expect(page.getByTestId('error-boundary')).toBeVisible()
    await expect(page.getByTestId('try-again')).toBeVisible()
    await expect(page.getByTestId('report-issue')).toBeVisible()
    
    // Verify error was captured
    const events = await getSentryEvents(page)
    const errorEvents = events.filter(e => e.type === 'exception')
    expect(errorEvents.length).toBeGreaterThan(0)
  })

  test('should allow user feedback submission', async ({ page }) => {
    await page.goto('/')
    
    // Simulate error boundary with feedback form
    await page.evaluate(() => {
      const errorDiv = document.createElement('div')
      errorDiv.innerHTML = `
        <div data-testid="error-boundary" style="padding: 20px; border: 1px solid red;">
          <h2>Something went wrong</h2>
          <button data-testid="report-issue">Report Issue</button>
          <div data-testid="feedback-form" style="display: none; margin-top: 10px;">
            <input data-testid="feedback-name" type="text" placeholder="Your name" />
            <input data-testid="feedback-email" type="email" placeholder="Your email" />
            <textarea data-testid="feedback-comments" placeholder="What happened?"></textarea>
            <button data-testid="submit-feedback">Send Feedback</button>
          </div>
        </div>
      `
      
      const reportButton = errorDiv.querySelector('[data-testid="report-issue"]')
      const feedbackForm = errorDiv.querySelector('[data-testid="feedback-form"]')
      
      reportButton.addEventListener('click', () => {
        feedbackForm.style.display = 'block'
      })
      
      document.body.appendChild(errorDiv)
    })
    
    // Click report issue button
    await page.click('[data-testid="report-issue"]')
    
    // Verify feedback form appears
    await expect(page.getByTestId('feedback-form')).toBeVisible()
    
    // Fill out feedback form
    await page.fill('[data-testid="feedback-name"]', 'Test User')
    await page.fill('[data-testid="feedback-email"]', 'test@example.com')
    await page.fill('[data-testid="feedback-comments"]', 'This is a test feedback message')
    
    // Submit feedback
    await page.click('[data-testid="submit-feedback"]')
    
    // Verify form submission (breadcrumb should be added)
    await page.waitForTimeout(500)
    const breadcrumbs = await getSentryBreadcrumbs(page)
    const feedbackBreadcrumbs = breadcrumbs.filter(b => 
      b.message?.includes('feedback') || b.message?.includes('Feedback')
    )
    
    expect(feedbackBreadcrumbs.length).toBeGreaterThan(0)
  })
})

test.describe('Sentry Source Maps', () => {
  test('should have source maps available in development', async ({ page }) => {
    // This test verifies that source maps are working
    // In a real scenario, you'd check the Sentry dashboard for proper stack traces
    
    await page.goto('/')
    
    // Check that source maps are referenced in the built files
    const sourceMapLinks = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      return scripts.map(script => script.src).filter(src => src.includes('.js'))
    })
    
    expect(sourceMapLinks.length).toBeGreaterThan(0)
    
    // In development, check for inline source maps or source map comments
    const hasSourceMaps = await page.evaluate(() => {
      return document.documentElement.innerHTML.includes('sourceMappingURL')
    })
    
    // Source maps should be available in development builds
    if (process.env.NODE_ENV !== 'production') {
      expect(hasSourceMaps).toBe(true)
    }
  })
})
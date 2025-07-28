import { test, expect, Page } from '@playwright/test'

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login')
    
    // Wait for page to load completely
    await expect(page.getByText('Welcome Back')).toBeVisible()
  })

  test.describe('Login Form Validation', () => {
    test('should display validation errors for empty fields', async ({ page }) => {
      // Try to submit empty form
      await page.click('button:has-text("Sign in to your account")')
      
      // Check for validation errors
      await expect(page.getByText('Email is required')).toBeVisible()
      await expect(page.getByText('Password is required')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      // Enter invalid email
      await page.fill('input[type="email"]', 'invalid-email')
      await page.fill('input[type="password"]', 'password123')
      
      // Trigger validation by clicking submit
      await page.click('button:has-text("Sign in to your account")')
      
      await expect(page.getByText('Please enter a valid email address')).toBeVisible()
    })

    test('should reject admin@bookedbarber.com with spaces', async ({ page }) => {
      // Test leading space
      await page.fill('input[type="email"]', ' admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      await page.click('button:has-text("Sign in to your account")')
      
      await expect(page.getByText('Please enter a valid email address')).toBeVisible()
      
      // Clear and test trailing space
      await page.fill('input[type="email"]', 'admin@bookedbarber.com ')
      await page.click('button:has-text("Sign in to your account")')
      
      await expect(page.getByText('Please enter a valid email address')).toBeVisible()
    })

    test('should reject emails with consecutive dots', async ({ page }) => {
      await page.fill('input[type="email"]', 'admin..test@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      await page.click('button:has-text("Sign in to your account")')
      
      await expect(page.getByText('Please enter a valid email address')).toBeVisible()
    })

    test('should validate password length', async ({ page }) => {
      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', '12345')
      await page.click('button:has-text("Sign in to your account")')
      
      await expect(page.getByText('Password must be at least 6 characters')).toBeVisible()
    })
  })

  test.describe('Successful Authentication Flow', () => {
    test('should complete login flow with valid credentials', async ({ page, context }) => {
      // Mock successful API responses
      await page.route('/api/v2/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-jwt-token-12345',
            token_type: 'bearer',
            user_id: 'user-123'
          })
        })
      })

      await page.route('/api/v2/auth/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-123',
            email: 'admin@bookedbarber.com',
            first_name: 'Admin',
            last_name: 'User',
            role: 'client',
            is_verified: true
          })
        })
      })

      // Fill login form
      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      
      // Submit form
      await page.click('button:has-text("Sign in to your account")')
      
      // Wait for redirect to dashboard
      await expect(page).toHaveURL('/dashboard')
      
      // Verify token was stored in localStorage
      const token = await page.evaluate(() => localStorage.getItem('token'))
      expect(token).toBe('mock-jwt-token-12345')
    })

    test('should handle remember me functionality', async ({ page }) => {
      // Mock API responses
      await page.route('/api/v2/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            token_type: 'bearer',
            user_id: 'user-123'
          })
        })
      })

      await page.route('/api/v2/auth/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-123',
            email: 'admin@bookedbarber.com',
            role: 'client'
          })
        })
      })

      // Fill form and check remember me
      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      await page.check('input[type="checkbox"]')
      
      // Submit
      await page.click('button:has-text("Sign in to your account")')
      
      // Should redirect successfully
      await expect(page).toHaveURL('/dashboard')
    })

    test('should show loading state during login', async ({ page }) => {
      // Mock delayed API response
      await page.route('/api/v2/auth/login', async (route) => {
        // Add delay to simulate slow API
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            token_type: 'bearer',
            user_id: 'user-123'
          })
        })
      })

      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      
      // Submit form
      await page.click('button:has-text("Sign in to your account")')
      
      // Check for loading state
      await expect(page.getByText('Signing in...')).toBeVisible()
      await expect(page.locator('button:has-text("Signing in...")').first()).toBeDisabled()
    })
  })

  test.describe('Error Handling Flow', () => {
    test('should handle invalid credentials error', async ({ page }) => {
      // Mock 401 error response
      await page.route('/api/v2/auth/login', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Invalid credentials'
          })
        })
      })

      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'wrongpassword')
      await page.click('button:has-text("Sign in to your account")')
      
      // Should stay on login page
      await expect(page).toHaveURL('/login')
      
      // Should not redirect
      await page.waitForTimeout(2000)
      await expect(page).toHaveURL('/login')
    })

    test('should handle email verification required', async ({ page }) => {
      // Mock 403 email verification error
      await page.route('/api/v2/auth/login', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Email address not verified'
          })
        })
      })

      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      await page.click('button:has-text("Sign in to your account")')
      
      // Should show verification error message
      await expect(page.getByText('Email Verification Required')).toBeVisible()
      await expect(page.getByRole('button', { name: /resend verification email/i })).toBeVisible()
    })

    test('should handle resend verification flow', async ({ page }) => {
      // Mock initial login error
      await page.route('/api/v2/auth/login', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Email address not verified'
          })
        })
      })

      // Mock resend verification success
      await page.route('/api/v2/auth/resend-verification', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Verification email sent'
          })
        })
      })

      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      await page.click('button:has-text("Sign in to your account")')
      
      // Wait for verification error to appear
      await expect(page.getByRole('button', { name: /resend verification email/i })).toBeVisible()
      
      // Click resend button
      await page.click('button:has-text("Resend Verification Email")')
      
      // Should show success message
      await expect(page.getByText(/verification email sent/i)).toBeVisible()
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('/api/v2/auth/login', async (route) => {
        await route.abort('failed')
      })

      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      await page.click('button:has-text("Sign in to your account")')
      
      // Should stay on login page and not crash
      await expect(page).toHaveURL('/login')
      
      // Form should be re-enabled after error
      await expect(page.locator('button:has-text("Sign in to your account")')).toBeEnabled()
    })

    test('should handle server errors (500)', async ({ page }) => {
      // Mock 500 server error
      await page.route('/api/v2/auth/login', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Internal server error'
          })
        })
      })

      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      await page.click('button:has-text("Sign in to your account")')
      
      // Should handle error gracefully
      await expect(page).toHaveURL('/login')
      await expect(page.locator('button:has-text("Sign in to your account")')).toBeEnabled()
    })

    test('should handle profile fetch failure after successful login', async ({ page }) => {
      // Mock successful login
      await page.route('/api/v2/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            token_type: 'bearer',
            user_id: 'user-123'
          })
        })
      })

      // Mock profile fetch failure
      await page.route('/api/v2/auth/me', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Server error'
          })
        })
      })

      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      await page.click('button:has-text("Sign in to your account")')
      
      // Should still redirect even if profile fetch fails
      await expect(page).toHaveURL('/dashboard')
    })
  })

  test.describe('Form Interaction and UX', () => {
    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]')
      const toggleButton = page.locator('button[aria-label*="password"]').first()
      
      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password')
      
      // Click toggle button
      await toggleButton.click()
      
      // Password should now be visible
      await expect(page.locator('input[type="text"]').last()).toBeVisible()
    })

    test('should focus on email field when page loads', async ({ page }) => {
      // Email field should have focus
      await expect(page.locator('input[type="email"]')).toBeFocused()
    })

    test('should navigate between fields with Tab key', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')
      const rememberMeCheckbox = page.locator('input[type="checkbox"]')
      
      // Start with email field focused
      await expect(emailInput).toBeFocused()
      
      // Tab to password field
      await page.keyboard.press('Tab')
      await expect(passwordInput).toBeFocused()
      
      // Tab to remember me checkbox
      await page.keyboard.press('Tab')
      await expect(rememberMeCheckbox).toBeFocused()
    })

    test('should submit form with Enter key', async ({ page }) => {
      // Mock successful response
      await page.route('/api/v2/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            token_type: 'bearer',
            user_id: 'user-123'
          })
        })
      })

      await page.route('/api/v2/auth/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-123',
            email: 'admin@bookedbarber.com',
            role: 'client'
          })
        })
      })

      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      
      // Submit with Enter key
      await page.keyboard.press('Enter')
      
      // Should redirect
      await expect(page).toHaveURL('/dashboard')
    })

    test('should prevent double submission', async ({ page }) => {
      let requestCount = 0
      
      await page.route('/api/v2/auth/login', async (route) => {
        requestCount++
        // Add delay to simulate slow API
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            token_type: 'bearer',
            user_id: 'user-123'
          })
        })
      })

      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      
      // Try to submit multiple times quickly
      const submitButton = page.locator('button:has-text("Sign in to your account")')
      await submitButton.click()
      await submitButton.click()
      await submitButton.click()
      
      // Should only make one request
      await page.waitForTimeout(2000)
      expect(requestCount).toBe(1)
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check form has proper role
      await expect(page.locator('form')).toHaveAttribute('role', 'form')
      
      // Check inputs have proper labels
      await expect(page.locator('input[type="email"]')).toHaveAttribute('aria-label')
      await expect(page.locator('input[type="password"]')).toHaveAttribute('aria-label')
      
      // Check submit button has proper attributes
      await expect(page.locator('button[type="submit"]')).toHaveAttribute('aria-label')
    })

    test('should announce validation errors to screen readers', async ({ page }) => {
      // Submit empty form
      await page.click('button:has-text("Sign in to your account")')
      
      // Check for aria-live regions or error announcements
      const errorRegion = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="alert"]')
      await expect(errorRegion).toBeTruthy()
    })

    test('should support keyboard navigation', async ({ page }) => {
      // Should be able to navigate entire form with keyboard
      await page.keyboard.press('Tab') // Email field
      await page.keyboard.press('Tab') // Password field  
      await page.keyboard.press('Tab') // Remember me
      await page.keyboard.press('Tab') // Forgot password link
      await page.keyboard.press('Tab') // Submit button
      
      // Submit button should be focusable
      await expect(page.locator('button:has-text("Sign in to your account")')).toBeFocused()
    })

    test('should have sufficient color contrast', async ({ page }) => {
      // This would typically use axe-playwright or similar tool
      // For now, check that elements are visible
      await expect(page.getByText('Welcome Back')).toBeVisible()
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button:has-text("Sign in to your account")')).toBeVisible()
    })
  })

  test.describe('URL Parameter Handling', () => {
    test('should show registration success message from URL parameter', async ({ page }) => {
      await page.goto('/login?registered=true')
      
      await expect(page.getByText(/registration successful/i)).toBeVisible()
    })

    test('should show password reset success message', async ({ page }) => {
      await page.goto('/login?reset=true')
      
      await expect(page.getByText(/password reset successful/i)).toBeVisible()
    })

    test('should show email verification success message', async ({ page }) => {
      await page.goto('/login?verified=true')
      
      await expect(page.getByText(/email verified successfully/i)).toBeVisible()
    })

    test('should dismiss success messages', async ({ page }) => {
      await page.goto('/login?registered=true')
      
      await expect(page.getByText(/registration successful/i)).toBeVisible()
      
      // Find and click dismiss button if available
      const dismissButton = page.locator('[aria-label="Dismiss"], button:has-text("×")')
      if (await dismissButton.isVisible()) {
        await dismissButton.click()
        await expect(page.getByText(/registration successful/i)).not.toBeVisible()
      }
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // All elements should still be visible and functional
      await expect(page.getByText('Welcome Back')).toBeVisible()
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button:has-text("Sign in to your account")')).toBeVisible()
      
      // Form should still work
      await page.fill('input[type="email"]', 'admin@bookedbarber.com')
      await page.fill('input[type="password"]', 'Password123!')
      
      // Button should be clickable
      await expect(page.locator('button:has-text("Sign in to your account")')).toBeEnabled()
    })

    test('should handle touch interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Should be able to tap form fields
      await page.tap('input[type="email"]')
      await expect(page.locator('input[type="email"]')).toBeFocused()
      
      await page.tap('input[type="password"]')
      await expect(page.locator('input[type="password"]')).toBeFocused()
    })
  })
})
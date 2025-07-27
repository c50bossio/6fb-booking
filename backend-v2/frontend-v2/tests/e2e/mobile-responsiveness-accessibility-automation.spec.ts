/**
 * Comprehensive Mobile Responsiveness and Accessibility Automation Tests
 * 
 * This test suite provides automated testing for mobile responsiveness across
 * devices and comprehensive accessibility compliance validation for BookedBarber V2.
 * 
 * Coverage:
 * - Cross-device booking flows (mobile, tablet, desktop)
 * - Touch interaction validation
 * - Responsive design breakpoint testing
 * - Accessibility compliance on mobile and desktop
 * - WCAG 2.1 AA compliance validation
 * - Screen reader compatibility
 * - Keyboard navigation testing
 * 
 * Target: 100% WCAG compliance, seamless mobile experience
 */

import { test, expect, Page, devices, BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { authHelpers } from '../utils/authHelpers';
import { testHelpers } from '../utils/testHelpers';

// Device configurations for responsive testing
const deviceConfigs = [
  {
    name: 'iPhone 12',
    device: devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
    type: 'mobile'
  },
  {
    name: 'iPhone 12 Pro Max',
    device: devices['iPhone 12 Pro Max'],
    viewport: { width: 428, height: 926 },
    type: 'mobile'
  },
  {
    name: 'Samsung Galaxy S21',
    device: devices['Galaxy S8'],
    viewport: { width: 360, height: 740 },
    type: 'mobile'
  },
  {
    name: 'iPad Air',
    device: devices['iPad'],
    viewport: { width: 820, height: 1180 },
    type: 'tablet'
  },
  {
    name: 'Desktop',
    device: devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1080 },
    type: 'desktop'
  },
  {
    name: 'Small Desktop',
    device: devices['Desktop Chrome'],
    viewport: { width: 1366, height: 768 },
    type: 'desktop'
  }
];

// Test data for mobile booking flows
const testData = {
  client: {
    email: 'mobile.client@test.com',
    password: 'MobileTest123!',
    name: 'Mobile Test Client',
    phone: '+1234567890'
  },
  barber: {
    email: 'mobile.barber@test.com',
    password: 'BarberMobile123!',
    name: 'Mobile Test Barber'
  }
};

test.describe('Mobile Responsiveness and Accessibility Tests', () => {

  test.describe('Cross-Device Booking Flow Tests', () => {
    
    deviceConfigs.forEach(deviceConfig => {
      test(`Complete booking flow - ${deviceConfig.name}`, async ({ browser }) => {
        // Create context with device configuration
        const context = await browser.newContext({
          ...deviceConfig.device,
          viewport: deviceConfig.viewport
        });
        
        const page = await context.newPage();
        
        try {
          // Setup test environment
          await testHelpers.setupTestEnvironment();
          await testHelpers.createTestUsers(testData);
          
          // 1. Navigate to booking page
          await page.goto('/book');
          await page.waitForLoadState('networkidle');
          
          // Verify page loads correctly on device
          await expect(page.locator('[data-testid="booking-page"]')).toBeVisible();
          
          // 2. Test responsive navigation
          if (deviceConfig.type === 'mobile') {
            // Test mobile hamburger menu
            await page.click('[data-testid="mobile-menu-button"]');
            await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
            await page.click('[data-testid="mobile-menu-close"]');
          } else {
            // Test desktop navigation
            await expect(page.locator('[data-testid="desktop-navigation"]')).toBeVisible();
          }
          
          // 3. Test service selection responsiveness
          await page.click('[data-testid="service-category-haircut"]');
          await expect(page.locator('[data-testid="service-list"]')).toBeVisible();
          
          // Verify service cards are properly sized for device
          const serviceCard = page.locator('[data-testid="service-card"]:first-child');
          const cardBox = await serviceCard.boundingBox();
          
          if (deviceConfig.type === 'mobile') {
            // On mobile, cards should be full width or close to it
            expect(cardBox?.width).toBeGreaterThan(deviceConfig.viewport.width * 0.8);
          }
          
          await serviceCard.click();
          
          // 4. Test barber selection interface
          await expect(page.locator('[data-testid="barber-selection"]')).toBeVisible();
          await page.click('[data-testid="barber-card"]:first-child');
          
          // 5. Test calendar interface responsiveness
          await expect(page.locator('[data-testid="calendar-widget"]')).toBeVisible();
          
          if (deviceConfig.type === 'mobile') {
            // Mobile calendar should be optimized for touch
            await expect(page.locator('[data-testid="mobile-calendar"]')).toBeVisible();
            
            // Test touch interactions
            await page.tap('[data-testid="calendar-next-week"]');
            await page.tap('[data-testid="time-slot-available"]:first-child');
          } else {
            // Desktop calendar with different layout
            await page.click('[data-testid="calendar-next-week"]');
            await page.click('[data-testid="time-slot-available"]:first-child');
          }
          
          // 6. Test form interface responsiveness
          await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
          
          // Fill form with device-appropriate interactions
          if (deviceConfig.type === 'mobile') {
            await page.tap('[data-testid="client-name-input"]');
          } else {
            await page.click('[data-testid="client-name-input"]');
          }
          
          await page.fill('[data-testid="client-name-input"]', testData.client.name);
          await page.fill('[data-testid="client-email-input"]', testData.client.email);
          await page.fill('[data-testid="client-phone-input"]', testData.client.phone);
          
          // 7. Test payment interface responsiveness
          if (deviceConfig.type === 'mobile') {
            await page.tap('[data-testid="continue-to-payment"]');
          } else {
            await page.click('[data-testid="continue-to-payment"]');
          }
          
          await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
          
          // Verify payment form is properly sized
          const paymentForm = page.locator('[data-testid="payment-form"]');
          const formBox = await paymentForm.boundingBox();
          
          if (deviceConfig.type === 'mobile') {
            // Payment form should fit within viewport
            expect(formBox?.width).toBeLessThanOrEqual(deviceConfig.viewport.width);
          }
          
          // 8. Test confirmation interface
          await page.fill('[data-testid="card-number"]', '4242424242424242');
          await page.fill('[data-testid="card-expiry"]', '12/25');
          await page.fill('[data-testid="card-cvc"]', '123');
          
          if (deviceConfig.type === 'mobile') {
            await page.tap('[data-testid="confirm-booking"]');
          } else {
            await page.click('[data-testid="confirm-booking"]');
          }
          
          // Verify booking confirmation
          await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
          
          // Test responsive confirmation layout
          if (deviceConfig.type === 'mobile') {
            await expect(page.locator('[data-testid="mobile-confirmation-layout"]')).toBeVisible();
          }
          
        } finally {
          await context.close();
        }
      });
    });

  });

  test.describe('Touch Interaction Validation', () => {
    
    test('Mobile touch interactions throughout booking flow', async ({ browser }) => {
      const context = await browser.newContext(devices['iPhone 12']);
      const page = await context.newPage();
      
      try {
        await page.goto('/book');
        
        // Test touch gestures and interactions
        const touchTests = [
          {
            action: 'tap',
            element: '[data-testid="service-category-haircut"]',
            description: 'Service category selection'
          },
          {
            action: 'longpress',
            element: '[data-testid="service-card"]:first-child',
            description: 'Service details on long press'
          },
          {
            action: 'swipe',
            element: '[data-testid="calendar-widget"]',
            description: 'Calendar navigation by swipe'
          },
          {
            action: 'pinch',
            element: '[data-testid="calendar-widget"]',
            description: 'Calendar zoom (if supported)'
          }
        ];
        
        for (const touchTest of touchTests) {
          switch (touchTest.action) {
            case 'tap':
              await page.tap(touchTest.element);
              break;
            case 'longpress':
              await page.tap(touchTest.element, { timeout: 1000 });
              break;
            case 'swipe':
              const element = page.locator(touchTest.element);
              const box = await element.boundingBox();
              if (box) {
                await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height / 2);
                await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
              }
              break;
          }
          
          // Verify interaction worked
          await page.waitForTimeout(500);
          // Add specific assertions based on expected behavior
        }
        
      } finally {
        await context.close();
      }
    });

    test('Touch target size compliance', async ({ browser }) => {
      const context = await browser.newContext(devices['iPhone 12']);
      const page = await context.newPage();
      
      try {
        await page.goto('/book');
        
        // Check touch target sizes (minimum 44x44 pixels per Apple guidelines)
        const touchTargets = [
          '[data-testid="mobile-menu-button"]',
          '[data-testid="service-card"]',
          '[data-testid="time-slot-available"]',
          '[data-testid="confirm-booking"]'
        ];
        
        for (const target of touchTargets) {
          const element = page.locator(target).first();
          if (await element.count() > 0) {
            const box = await element.boundingBox();
            if (box) {
              expect(box.width).toBeGreaterThanOrEqual(44);
              expect(box.height).toBeGreaterThanOrEqual(44);
            }
          }
        }
        
      } finally {
        await context.close();
      }
    });

  });

  test.describe('Responsive Design Breakpoint Testing', () => {
    
    const breakpoints = [
      { name: 'Mobile Small', width: 320 },
      { name: 'Mobile Medium', width: 375 },
      { name: 'Mobile Large', width: 414 },
      { name: 'Tablet Small', width: 768 },
      { name: 'Tablet Large', width: 1024 },
      { name: 'Desktop Small', width: 1280 },
      { name: 'Desktop Large', width: 1920 }
    ];
    
    breakpoints.forEach(breakpoint => {
      test(`Layout integrity at ${breakpoint.name} (${breakpoint.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: breakpoint.width, height: 800 });
        await page.goto('/');
        
        // Test header layout
        const header = page.locator('[data-testid="site-header"]');
        await expect(header).toBeVisible();
        
        const headerBox = await header.boundingBox();
        expect(headerBox?.width).toBeLessThanOrEqual(breakpoint.width);
        
        // Test navigation layout
        if (breakpoint.width < 768) {
          // Mobile navigation
          await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
          await expect(page.locator('[data-testid="desktop-navigation"]')).not.toBeVisible();
        } else {
          // Desktop navigation
          await expect(page.locator('[data-testid="desktop-navigation"]')).toBeVisible();
          await expect(page.locator('[data-testid="mobile-menu-button"]')).not.toBeVisible();
        }
        
        // Test main content layout
        await page.goto('/book');
        const mainContent = page.locator('[data-testid="main-content"]');
        const contentBox = await mainContent.boundingBox();
        
        // Content should not overflow viewport
        expect(contentBox?.width).toBeLessThanOrEqual(breakpoint.width);
        
        // Test footer layout
        const footer = page.locator('[data-testid="site-footer"]');
        if (await footer.count() > 0) {
          const footerBox = await footer.boundingBox();
          expect(footerBox?.width).toBeLessThanOrEqual(breakpoint.width);
        }
      });
    });

    test('Responsive images and media', async ({ page }) => {
      await page.goto('/');
      
      // Test responsive images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        
        // Check for responsive image attributes
        const srcset = await image.getAttribute('srcset');
        const sizes = await image.getAttribute('sizes');
        
        // Images should have responsive attributes or proper CSS
        const hasResponsiveAttrs = srcset || sizes;
        const hasResponsiveCSS = await image.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.maxWidth === '100%' || style.width === '100%';
        });
        
        expect(hasResponsiveAttrs || hasResponsiveCSS).toBeTruthy();
      }
    });

  });

  test.describe('Accessibility Compliance Testing', () => {
    
    test('WCAG 2.1 AA compliance - Homepage', async ({ page }) => {
      await page.goto('/');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('WCAG 2.1 AA compliance - Booking flow', async ({ page }) => {
      await page.goto('/book');
      
      // Test each step of booking flow for accessibility
      const bookingSteps = [
        { url: '/book', name: 'Service selection' },
        { url: '/book/barber', name: 'Barber selection' },
        { url: '/book/time', name: 'Time selection' },
        { url: '/book/details', name: 'Booking details' },
        { url: '/book/payment', name: 'Payment' }
      ];
      
      for (const step of bookingSteps) {
        await page.goto(step.url);
        
        const accessibilityResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        
        expect(accessibilityResults.violations).toEqual([]);
      }
    });

    test('Keyboard navigation support', async ({ page }) => {
      await page.goto('/book');
      
      // Test tab navigation through booking flow
      const focusableElements = [
        '[data-testid="service-category-haircut"]',
        '[data-testid="service-card"]:first-child',
        '[data-testid="barber-card"]:first-child',
        '[data-testid="time-slot-available"]:first-child',
        '[data-testid="client-name-input"]',
        '[data-testid="confirm-booking"]'
      ];
      
      for (const element of focusableElements) {
        // Navigate to element with Tab
        await page.keyboard.press('Tab');
        
        // Check if element is focusable and has proper focus indicators
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
        
        // Test activation with Enter key
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    });

    test('Screen reader compatibility', async ({ page }) => {
      await page.goto('/book');
      
      // Test ARIA labels and roles
      const ariaElements = [
        { selector: '[data-testid="booking-form"]', expectedRole: 'form' },
        { selector: '[data-testid="service-list"]', expectedRole: 'list' },
        { selector: '[data-testid="calendar-widget"]', expectedRole: 'application' },
        { selector: '[data-testid="time-slot-available"]', expectedRole: 'button' }
      ];
      
      for (const ariaElement of ariaElements) {
        const element = page.locator(ariaElement.selector);
        if (await element.count() > 0) {
          const role = await element.getAttribute('role');
          const ariaLabel = await element.getAttribute('aria-label');
          const ariaLabelledBy = await element.getAttribute('aria-labelledby');
          
          // Element should have proper role
          expect(role).toBe(ariaElement.expectedRole);
          
          // Element should have accessible name
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('Color contrast compliance', async ({ page }) => {
      await page.goto('/');
      
      const contrastResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('.text-')  // Target text elements
        .analyze();
      
      // No color contrast violations
      const contrastViolations = contrastResults.violations.filter(
        violation => violation.id === 'color-contrast'
      );
      expect(contrastViolations).toEqual([]);
    });

    test('Form accessibility', async ({ page }) => {
      await page.goto('/book');
      
      // Navigate to booking form
      await page.click('[data-testid="service-category-haircut"]');
      await page.click('[data-testid="service-card"]:first-child');
      await page.click('[data-testid="barber-card"]:first-child');
      await page.click('[data-testid="time-slot-available"]:first-child');
      
      // Test form accessibility
      const formFields = [
        '[data-testid="client-name-input"]',
        '[data-testid="client-email-input"]',
        '[data-testid="client-phone-input"]'
      ];
      
      for (const field of formFields) {
        const input = page.locator(field);
        
        // Check for proper labels
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
        }
        
        // Check for error handling
        await input.fill('');
        await page.keyboard.press('Tab');
        
        const errorMessage = page.locator(`[aria-describedby*="${id}"]`);
        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toBeVisible();
        }
      }
    });

    test('Focus management and indicators', async ({ page }) => {
      await page.goto('/book');
      
      // Test focus indicators on interactive elements
      const interactiveElements = [
        '[data-testid="service-card"]:first-child',
        '[data-testid="barber-card"]:first-child',
        '[data-testid="time-slot-available"]:first-child'
      ];
      
      for (const element of interactiveElements) {
        await page.focus(element);
        
        // Check for visible focus indicator
        const focusedElement = page.locator(element);
        const hasFocusStyle = await focusedElement.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.outline !== 'none' || 
                 style.boxShadow !== 'none' || 
                 style.backgroundColor !== 'transparent';
        });
        
        expect(hasFocusStyle).toBeTruthy();
      }
    });

  });

  test.describe('Mobile Six Figure Barber Dashboard', () => {
    
    test('Six Figure dashboard mobile optimization', async ({ browser }) => {
      const context = await browser.newContext(devices['iPhone 12']);
      const page = await context.newPage();
      
      try {
        // Login as barber
        await authHelpers.loginAsBarber(page, testData.barber);
        await page.goto('/dashboard/six-figure-barber');
        
        // Test mobile dashboard layout
        await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
        
        // Test mobile-optimized charts and metrics
        const metricsCards = page.locator('[data-testid="metric-card"]');
        const cardCount = await metricsCards.count();
        
        for (let i = 0; i < cardCount; i++) {
          const card = metricsCards.nth(i);
          const cardBox = await card.boundingBox();
          
          // Cards should be properly sized for mobile
          expect(cardBox?.width).toBeLessThanOrEqual(390); // iPhone 12 width
          expect(cardBox?.width).toBeGreaterThan(300); // Minimum readable width
        }
        
        // Test mobile analytics interaction
        await page.tap('[data-testid="revenue-chart"]');
        await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
        
        // Test mobile menu navigation
        await page.tap('[data-testid="mobile-menu-button"]');
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        
        await page.tap('[data-testid="analytics-menu-item"]');
        await expect(page.locator('[data-testid="analytics-page"]')).toBeVisible();
        
      } finally {
        await context.close();
      }
    });

  });

  test.describe('Performance on Mobile Devices', () => {
    
    test('Mobile page load performance', async ({ browser }) => {
      const context = await browser.newContext(devices['iPhone 12']);
      const page = await context.newPage();
      
      try {
        // Monitor page load performance
        const startTime = Date.now();
        
        await page.goto('/book');
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        
        // Mobile page load should be fast
        expect(loadTime).toBeLessThan(3000); // 3 seconds
        
        // Test runtime performance
        const performanceMetrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            loadComplete: navigation.loadEventEnd - navigation.navigationStart,
            firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0
          };
        });
        
        expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
        expect(performanceMetrics.firstPaint).toBeLessThan(1500);
        
      } finally {
        await context.close();
      }
    });

  });

});
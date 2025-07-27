/**
 * Mobile responsiveness automation tests for Six Figure Barber workflows.
 * Tests cross-device booking flows, touch interactions, and responsive design.
 */
import { test, expect, Page, devices } from '@playwright/test';
import {
  setupMobileSixFigureTestData,
  simulateTouchGestures,
  validateMobileLayout,
  testMobilePerformance
} from '../test-utils/mobile-test-helpers';

// Mobile device configurations for testing
const MOBILE_DEVICES = [
  { name: 'iPhone 13', ...devices['iPhone 13'] },
  { name: 'iPhone 13 Pro Max', ...devices['iPhone 13 Pro Max'] },
  { name: 'Pixel 5', ...devices['Pixel 5'] },
  { name: 'Samsung Galaxy S21', ...devices['Galaxy S21'] },
  { name: 'iPad', ...devices['iPad Pro'] },
  { name: 'iPad Mini', ...devices['iPad Mini'] },
];

const TABLET_DEVICES = [
  { name: 'iPad Pro', ...devices['iPad Pro'] },
  { name: 'Surface Pro', { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 1024 } } },
];

const RESPONSIVE_BREAKPOINTS = [
  { name: 'Mobile Small', width: 320, height: 568 },
  { name: 'Mobile Medium', width: 375, height: 667 },
  { name: 'Mobile Large', width: 414, height: 896 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Tablet Landscape', width: 1024, height: 768 },
  { name: 'Desktop Small', width: 1280, height: 720 },
];

test.describe('Mobile Six Figure Barber Booking Flow', () => {
  MOBILE_DEVICES.forEach(device => {
    test(`${device.name}: Complete booking flow responsiveness`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
        geolocation: { longitude: -122.4194, latitude: 37.7749 }, // San Francisco
        permissions: ['geolocation']
      });
      
      const page = await context.newPage();
      const testData = await setupMobileSixFigureTestData();

      try {
        // Navigate to Six Figure Barber service page
        await page.goto('/services/six-figure-premium');
        await page.waitForLoadState('networkidle');

        // Test mobile layout validation
        await validateMobileLayout(page, {
          expectedElements: [
            '[data-testid="mobile-service-header"]',
            '[data-testid="mobile-price-display"]',
            '[data-testid="mobile-book-button"]',
            '[data-testid="mobile-service-details"]'
          ],
          hiddenElements: [
            '[data-testid="desktop-sidebar"]',
            '[data-testid="desktop-navigation"]'
          ]
        });

        // Test touch-friendly button sizes (minimum 44px)
        const bookButton = page.locator('[data-testid="mobile-book-button"]');
        const buttonBox = await bookButton.boundingBox();
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
        expect(buttonBox?.width).toBeGreaterThanOrEqual(44);

        // Test mobile booking flow
        await bookButton.tap();
        await page.waitForSelector('[data-testid="mobile-booking-modal"]');

        // Verify modal is full-screen on mobile
        const modal = page.locator('[data-testid="mobile-booking-modal"]');
        const modalBox = await modal.boundingBox();
        const viewport = page.viewportSize();
        
        if (viewport && modalBox) {
          expect(modalBox.width).toBeCloseTo(viewport.width, 10);
        }

        // Test mobile date picker
        await page.tap('[data-testid="mobile-date-picker"]');
        await page.waitForSelector('[data-testid="mobile-calendar"]');

        // Test swipe gestures on calendar
        await simulateTouchGestures(page, '[data-testid="mobile-calendar"]', {
          swipeLeft: true,
          swipeRight: true
        });

        // Select date with touch
        await page.tap('[data-testid="calendar-date-available"]:first-child');

        // Test mobile time slot selection
        await page.waitForSelector('[data-testid="mobile-time-slots"]');
        
        // Verify time slots are touch-friendly
        const timeSlots = page.locator('[data-testid="time-slot"]');
        const timeSlotCount = await timeSlots.count();
        
        for (let i = 0; i < Math.min(timeSlotCount, 3); i++) {
          const slot = timeSlots.nth(i);
          const slotBox = await slot.boundingBox();
          expect(slotBox?.height).toBeGreaterThanOrEqual(44);
        }

        // Select time slot
        await timeSlots.first().tap();

        // Test mobile form inputs
        await page.fill('[data-testid="mobile-client-name"]', 'John Mobile User');
        await page.fill('[data-testid="mobile-client-email"]', 'john@mobile.test');
        await page.fill('[data-testid="mobile-client-phone"]', '+1234567890');

        // Test mobile-specific features
        await page.tap('[data-testid="mobile-style-preferences"]');
        await page.waitForSelector('[data-testid="mobile-style-options"]');

        // Use mobile-optimized selection
        await page.tap('[data-testid="style-option-business"]');
        await page.tap('[data-testid="close-style-modal"]');

        // Test mobile payment flow
        await page.tap('[data-testid="proceed-to-payment"]');
        await page.waitForSelector('[data-testid="mobile-payment-form"]');

        // Verify payment form is mobile-optimized
        const paymentForm = page.locator('[data-testid="mobile-payment-form"]');
        await expect(paymentForm).toBeVisible();

        // Test credit card input with proper mobile keyboards
        const cardInput = page.locator('[data-testid="card-number-input"]');
        await expect(cardInput).toHaveAttribute('inputmode', 'numeric');

        const emailInput = page.locator('[data-testid="mobile-client-email"]');
        await expect(emailInput).toHaveAttribute('inputmode', 'email');

        // Test mobile payment completion
        await page.fill('[data-testid="card-number-input"]', '4242424242424242');
        await page.fill('[data-testid="card-expiry"]', '12/25');
        await page.fill('[data-testid="card-cvc"]', '123');

        await page.tap('[data-testid="complete-mobile-payment"]');
        await page.waitForSelector('[data-testid="mobile-booking-success"]');

        // Verify mobile success screen
        await expect(page.locator('[data-testid="mobile-booking-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-confirmation-details"]')).toBeVisible();

        // Test add to calendar functionality
        await page.tap('[data-testid="add-to-mobile-calendar"]');
        
        // Verify mobile calendar integration
        if (device.name.includes('iPhone') || device.name.includes('iPad')) {
          // iOS calendar integration
          await expect(page.locator('[data-testid="ios-calendar-prompt"]')).toBeVisible();
        } else {
          // Android calendar integration
          await expect(page.locator('[data-testid="android-calendar-prompt"]')).toBeVisible();
        }

      } finally {
        await context.close();
      }
    });
  });
});

test.describe('Mobile Six Figure Dashboard Responsiveness', () => {
  MOBILE_DEVICES.forEach(device => {
    test(`${device.name}: Six Figure dashboard mobile optimization`, async ({ browser }) => {
      const context = await browser.newContext(device);
      const page = await context.newPage();

      try {
        const testData = await setupMobileSixFigureTestData();
        
        // Login as Six Figure Barber
        await page.goto('/login');
        await page.fill('[data-testid="email"]', testData.barber.email);
        await page.fill('[data-testid="password"]', testData.barber.password);
        await page.tap('[data-testid="mobile-login-button"]');

        // Navigate to mobile Six Figure dashboard
        await page.goto('/dashboard/six-figure-barber');
        await page.waitForLoadState('networkidle');

        // Test mobile dashboard layout
        await validateMobileLayout(page, {
          expectedElements: [
            '[data-testid="mobile-dashboard-header"]',
            '[data-testid="mobile-revenue-widget"]',
            '[data-testid="mobile-goals-widget"]',
            '[data-testid="mobile-clients-widget"]'
          ],
          mobileOptimizations: [
            'single-column-layout',
            'touch-friendly-buttons',
            'readable-fonts',
            'adequate-spacing'
          ]
        });

        // Test mobile revenue widget interactions
        await page.tap('[data-testid="mobile-revenue-widget"]');
        await page.waitForSelector('[data-testid="mobile-revenue-details"]');

        // Test swipe navigation on mobile charts
        const chartContainer = page.locator('[data-testid="mobile-revenue-chart"]');
        await simulateTouchGestures(page, '[data-testid="mobile-revenue-chart"]', {
          swipeLeft: true,
          swipeRight: true,
          pinchZoom: true
        });

        // Test mobile goal progress interaction
        await page.tap('[data-testid="mobile-goals-widget"]');
        await page.waitForSelector('[data-testid="mobile-goal-editor"]');

        // Verify mobile goal editing
        const goalEditor = page.locator('[data-testid="mobile-goal-editor"]');
        await expect(goalEditor).toBeVisible();

        // Test number input for mobile
        const goalInput = page.locator('[data-testid="annual-goal-input"]');
        await expect(goalInput).toHaveAttribute('inputmode', 'numeric');

        // Test mobile client management
        await page.tap('[data-testid="mobile-clients-widget"]');
        await page.waitForSelector('[data-testid="mobile-client-list"]');

        // Test pull-to-refresh on mobile client list
        await simulateTouchGestures(page, '[data-testid="mobile-client-list"]', {
          pullToRefresh: true
        });

        // Test mobile client search
        await page.tap('[data-testid="mobile-client-search"]');
        await page.fill('[data-testid="mobile-search-input"]', 'John');

        // Test mobile client filtering
        await page.tap('[data-testid="mobile-filter-button"]');
        await page.waitForSelector('[data-testid="mobile-filter-modal"]');

        // Verify filter options are touch-friendly
        const filterOptions = page.locator('[data-testid="filter-option"]');
        const filterCount = await filterOptions.count();
        
        for (let i = 0; i < Math.min(filterCount, 3); i++) {
          const option = filterOptions.nth(i);
          const optionBox = await option.boundingBox();
          expect(optionBox?.height).toBeGreaterThanOrEqual(44);
        }

      } finally {
        await context.close();
      }
    });
  });
});

test.describe('Cross-Device Responsive Design Testing', () => {
  RESPONSIVE_BREAKPOINTS.forEach(breakpoint => {
    test(`${breakpoint.name} (${breakpoint.width}x${breakpoint.height}): Layout adaptation`, async ({ page }) => {
      // Set viewport to specific breakpoint
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });

      const testData = await setupMobileSixFigureTestData();

      // Test Six Figure service page at this breakpoint
      await page.goto('/services/six-figure-premium');
      await page.waitForLoadState('networkidle');

      // Test layout adaptation
      if (breakpoint.width < 768) {
        // Mobile layout expectations
        await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
        await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
        
        // Test mobile menu
        await page.click('[data-testid="mobile-menu-toggle"]');
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        
        // Verify menu is full-width on mobile
        const menu = page.locator('[data-testid="mobile-menu"]');
        const menuBox = await menu.boundingBox();
        expect(menuBox?.width).toBeCloseTo(breakpoint.width, 20);
        
      } else if (breakpoint.width < 1024) {
        // Tablet layout expectations
        await expect(page.locator('[data-testid="tablet-navigation"]')).toBeVisible();
        
        // Test tablet-specific interactions
        await page.hover('[data-testid="service-card"]');
        await expect(page.locator('[data-testid="hover-details"]')).toBeVisible();
        
      } else {
        // Desktop layout expectations
        await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-navigation"]')).not.toBeVisible();
      }

      // Test font sizes and readability
      const headingElements = page.locator('h1, h2, h3');
      const headingCount = await headingElements.count();
      
      for (let i = 0; i < headingCount; i++) {
        const heading = headingElements.nth(i);
        const fontSize = await heading.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        
        const fontSizePx = parseInt(fontSize.replace('px', ''));
        
        // Ensure minimum readable font sizes
        if (breakpoint.width < 768) {
          expect(fontSizePx).toBeGreaterThanOrEqual(16); // Mobile minimum
        } else {
          expect(fontSizePx).toBeGreaterThanOrEqual(14); // Desktop minimum
        }
      }

      // Test touch target sizes on touch devices
      if (breakpoint.width < 1024) {
        const interactiveElements = page.locator('button, a, input, [role="button"]');
        const elementCount = await interactiveElements.count();
        
        for (let i = 0; i < Math.min(elementCount, 10); i++) {
          const element = interactiveElements.nth(i);
          const box = await element.boundingBox();
          
          if (box && box.height > 0 && box.width > 0) {
            expect(Math.min(box.height, box.width)).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });
  });
});

test.describe('Mobile Performance and Accessibility', () => {
  test('Mobile performance benchmarks', async ({ page }) => {
    // Test on mobile device
    await page.emulate(devices['iPhone 13']);
    
    const performanceMetrics = await testMobilePerformance(page, {
      url: '/dashboard/six-figure-barber',
      metrics: [
        'firstContentfulPaint',
        'largestContentfulPaint',
        'cumulativeLayoutShift',
        'firstInputDelay'
      ]
    });

    // Performance benchmarks for mobile
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2500); // 2.5s
    expect(performanceMetrics.largestContentfulPaint).toBeLessThan(4000); // 4s
    expect(performanceMetrics.cumulativeLayoutShift).toBeLessThan(0.1); // 0.1
    expect(performanceMetrics.firstInputDelay).toBeLessThan(100); // 100ms
  });

  test('Mobile accessibility compliance', async ({ page }) => {
    await page.emulate(devices['iPhone 13']);
    
    const testData = await setupMobileSixFigureTestData();
    await page.goto('/services/six-figure-premium');

    // Test mobile accessibility features
    await page.evaluate(() => {
      // Simulate screen reader navigation
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      focusableElements.forEach((element, index) => {
        if (element instanceof HTMLElement) {
          element.focus();
          
          // Verify focus indicators are visible
          const computedStyle = window.getComputedStyle(element, ':focus');
          const outline = computedStyle.outline;
          const boxShadow = computedStyle.boxShadow;
          
          if (outline === 'none' && boxShadow === 'none') {
            console.warn(`Element ${index} lacks focus indicator:`, element);
          }
        }
      });
    });

    // Test mobile screen reader compatibility
    const ariaLabels = page.locator('[aria-label]');
    const ariaLabelCount = await ariaLabels.count();
    expect(ariaLabelCount).toBeGreaterThan(0);

    // Test mobile keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
  });

  test('Touch gesture responsiveness', async ({ page }) => {
    await page.emulate(devices['iPhone 13']);
    
    const testData = await setupMobileSixFigureTestData();
    await page.goto('/dashboard/six-figure-barber');

    // Test touch responsiveness
    const touchStartTime = Date.now();
    await page.tap('[data-testid="mobile-revenue-widget"]');
    const touchEndTime = Date.now();
    
    const touchResponseTime = touchEndTime - touchStartTime;
    expect(touchResponseTime).toBeLessThan(100); // Touch should respond within 100ms

    // Test gesture recognition
    await simulateTouchGestures(page, '[data-testid="mobile-revenue-chart"]', {
      tap: { x: 100, y: 100 },
      doubleTap: { x: 150, y: 150 },
      longPress: { x: 200, y: 200, duration: 1000 },
      swipe: { 
        start: { x: 50, y: 300 }, 
        end: { x: 250, y: 300 },
        duration: 500 
      }
    });

    // Verify gestures triggered appropriate responses
    await expect(page.locator('[data-testid="gesture-feedback"]')).toBeVisible();
  });
});

test.describe('Tablet-Specific Six Figure Features', () => {
  TABLET_DEVICES.forEach(device => {
    test(`${device.name}: Tablet-optimized Six Figure interface`, async ({ browser }) => {
      const context = await browser.newContext(device);
      const page = await context.newPage();

      try {
        const testData = await setupMobileSixFigureTestData();
        
        await page.goto('/dashboard/six-figure-barber');
        await page.waitForLoadState('networkidle');

        // Test tablet layout (should be between mobile and desktop)
        await validateMobileLayout(page, {
          expectedElements: [
            '[data-testid="tablet-dashboard-grid"]',
            '[data-testid="tablet-navigation"]',
            '[data-testid="tablet-sidebar"]'
          ],
          tabletOptimizations: [
            'two-column-layout',
            'expanded-widgets',
            'hover-interactions',
            'contextual-menus'
          ]
        });

        // Test tablet-specific interactions
        await page.hover('[data-testid="revenue-widget"]');
        await expect(page.locator('[data-testid="widget-hover-menu"]')).toBeVisible();

        // Test right-click context menu on tablet
        await page.click('[data-testid="client-item"]', { button: 'right' });
        await expect(page.locator('[data-testid="context-menu"]')).toBeVisible();

        // Test tablet chart interactions
        const chart = page.locator('[data-testid="revenue-chart"]');
        
        // Test pinch-to-zoom on tablet
        await page.mouse.move(200, 200);
        await page.mouse.down();
        await page.mouse.move(250, 250);
        await page.mouse.up();
        
        // Verify chart zoom functionality
        await expect(page.locator('[data-testid="chart-zoom-controls"]')).toBeVisible();

        // Test tablet keyboard shortcuts
        await page.keyboard.press('Control+/');
        await expect(page.locator('[data-testid="keyboard-shortcuts-modal"]')).toBeVisible();

      } finally {
        await context.close();
      }
    });
  });
});

test.describe('Progressive Web App Features', () => {
  test('PWA installation and mobile functionality', async ({ page }) => {
    await page.emulate(devices['iPhone 13']);
    
    const testData = await setupMobileSixFigureTestData();
    await page.goto('/');

    // Test PWA installation prompt
    await page.evaluate(() => {
      // Trigger PWA install prompt
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });

    await expect(page.locator('[data-testid="pwa-install-banner"]')).toBeVisible();

    // Test offline functionality
    await page.context().setOffline(true);
    await page.reload();

    // Should show offline page
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="cached-content"]')).toBeVisible();

    // Test service worker functionality
    await page.context().setOffline(false);
    await page.reload();

    const serviceWorkerActive = await page.evaluate(async () => {
      return 'serviceWorker' in navigator && 
             (await navigator.serviceWorker.ready).active !== null;
    });

    expect(serviceWorkerActive).toBeTruthy();

    // Test push notification setup
    await page.click('[data-testid="enable-notifications"]');
    
    const notificationPermission = await page.evaluate(async () => {
      return Notification.permission;
    });

    expect(['granted', 'default', 'denied']).toContain(notificationPermission);
  });

  test('Mobile app-like navigation', async ({ page }) => {
    await page.emulate(devices['iPhone 13']);
    
    const testData = await setupMobileSixFigureTestData();
    await page.goto('/dashboard');

    // Test bottom navigation (mobile app pattern)
    await expect(page.locator('[data-testid="mobile-bottom-nav"]')).toBeVisible();

    const navItems = page.locator('[data-testid="nav-item"]');
    const navCount = await navItems.count();
    
    // Typically 3-5 items in bottom navigation
    expect(navCount).toBeGreaterThanOrEqual(3);
    expect(navCount).toBeLessThanOrEqual(5);

    // Test navigation transitions
    for (let i = 0; i < navCount; i++) {
      await navItems.nth(i).tap();
      
      // Verify smooth transitions
      await page.waitForFunction(() => 
        !document.body.classList.contains('transitioning')
      );
      
      // Verify active state
      await expect(navItems.nth(i)).toHaveClass(/active/);
    }

    // Test mobile-specific gestures for navigation
    await simulateTouchGestures(page, '[data-testid="main-content"]', {
      swipeRight: true // Should trigger back navigation
    });

    // Test pull-to-refresh
    await simulateTouchGestures(page, '[data-testid="dashboard-content"]', {
      pullToRefresh: true
    });

    await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible();
  });
});
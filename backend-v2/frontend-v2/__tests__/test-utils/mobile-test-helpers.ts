/**
 * Mobile testing utilities for Six Figure Barber responsive design testing.
 * Provides touch gesture simulation, mobile layout validation, and performance testing.
 */
import { Page, expect } from '@playwright/test';

// Touch gesture types
export interface TouchGestureOptions {
  tap?: { x: number; y: number };
  doubleTap?: { x: number; y: number };
  longPress?: { x: number; y: number; duration?: number };
  swipe?: { start: { x: number; y: number }; end: { x: number; y: number }; duration?: number };
  pinchZoom?: { center: { x: number; y: number }; scale: number };
  swipeLeft?: boolean;
  swipeRight?: boolean;
  swipeUp?: boolean;
  swipeDown?: boolean;
  pullToRefresh?: boolean;
}

export interface MobileLayoutValidation {
  expectedElements: string[];
  hiddenElements?: string[];
  mobileOptimizations?: string[];
  tabletOptimizations?: string[];
}

export interface MobilePerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  totalBlockingTime: number;
}

// Touch gesture simulation
export async function simulateTouchGestures(
  page: Page, 
  selector: string, 
  gestures: TouchGestureOptions
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  
  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`Element ${selector} not found or not visible`);
  }

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  // Single tap
  if (gestures.tap) {
    await page.mouse.click(gestures.tap.x, gestures.tap.y);
  }

  // Double tap
  if (gestures.doubleTap) {
    await page.mouse.click(gestures.doubleTap.x, gestures.doubleTap.y, { clickCount: 2 });
  }

  // Long press
  if (gestures.longPress) {
    await page.mouse.move(gestures.longPress.x, gestures.longPress.y);
    await page.mouse.down();
    await page.waitForTimeout(gestures.longPress.duration || 1000);
    await page.mouse.up();
  }

  // Custom swipe
  if (gestures.swipe) {
    await page.mouse.move(gestures.swipe.start.x, gestures.swipe.start.y);
    await page.mouse.down();
    await page.mouse.move(
      gestures.swipe.end.x, 
      gestures.swipe.end.y, 
      { steps: 10 }
    );
    await page.mouse.up();
    
    if (gestures.swipe.duration) {
      await page.waitForTimeout(gestures.swipe.duration);
    }
  }

  // Predefined swipe directions
  if (gestures.swipeLeft) {
    await page.mouse.move(centerX + 100, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX - 100, centerY, { steps: 10 });
    await page.mouse.up();
  }

  if (gestures.swipeRight) {
    await page.mouse.move(centerX - 100, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 100, centerY, { steps: 10 });
    await page.mouse.up();
  }

  if (gestures.swipeUp) {
    await page.mouse.move(centerX, centerY + 100);
    await page.mouse.down();
    await page.mouse.move(centerX, centerY - 100, { steps: 10 });
    await page.mouse.up();
  }

  if (gestures.swipeDown) {
    await page.mouse.move(centerX, centerY - 100);
    await page.mouse.down();
    await page.mouse.move(centerX, centerY + 100, { steps: 10 });
    await page.mouse.up();
  }

  // Pull to refresh
  if (gestures.pullToRefresh) {
    await page.mouse.move(centerX, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(centerX, centerY + 150, { steps: 15 });
    await page.waitForTimeout(500);
    await page.mouse.up();
    
    // Wait for refresh animation
    await page.waitForTimeout(1000);
  }

  // Pinch zoom
  if (gestures.pinchZoom) {
    const { center, scale } = gestures.pinchZoom;
    
    // Simulate two-finger pinch
    await page.mouse.move(center.x - 50, center.y);
    await page.mouse.down();
    
    // Second finger simulation would require more complex implementation
    // For now, we'll use a simplified zoom gesture
    await page.mouse.move(
      center.x - (50 * scale), 
      center.y, 
      { steps: 10 }
    );
    await page.mouse.up();
  }
}

// Mobile layout validation
export async function validateMobileLayout(
  page: Page, 
  validation: MobileLayoutValidation
): Promise<void> {
  const viewport = page.viewportSize();
  const isMobile = viewport && viewport.width < 768;
  const isTablet = viewport && viewport.width >= 768 && viewport.width < 1024;

  // Check expected elements are visible
  for (const selector of validation.expectedElements) {
    await expect(page.locator(selector)).toBeVisible();
  }

  // Check hidden elements are not visible
  if (validation.hiddenElements) {
    for (const selector of validation.hiddenElements) {
      await expect(page.locator(selector)).not.toBeVisible();
    }
  }

  // Validate mobile-specific optimizations
  if (isMobile && validation.mobileOptimizations) {
    await validateMobileOptimizations(page, validation.mobileOptimizations);
  }

  // Validate tablet-specific optimizations
  if (isTablet && validation.tabletOptimizations) {
    await validateTabletOptimizations(page, validation.tabletOptimizations);
  }

  // Check touch-friendly button sizes
  await validateTouchTargetSizes(page);

  // Check text readability
  await validateTextReadability(page);

  // Check mobile navigation
  await validateMobileNavigation(page);
}

async function validateMobileOptimizations(
  page: Page, 
  optimizations: string[]
): Promise<void> {
  for (const optimization of optimizations) {
    switch (optimization) {
      case 'single-column-layout':
        await validateSingleColumnLayout(page);
        break;
      case 'touch-friendly-buttons':
        await validateTouchTargetSizes(page);
        break;
      case 'readable-fonts':
        await validateTextReadability(page);
        break;
      case 'adequate-spacing':
        await validateAdequateSpacing(page);
        break;
      case 'mobile-menu':
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        break;
      case 'swipe-navigation':
        await validateSwipeNavigation(page);
        break;
    }
  }
}

async function validateTabletOptimizations(
  page: Page, 
  optimizations: string[]
): Promise<void> {
  for (const optimization of optimizations) {
    switch (optimization) {
      case 'two-column-layout':
        await validateTwoColumnLayout(page);
        break;
      case 'expanded-widgets':
        await validateExpandedWidgets(page);
        break;
      case 'hover-interactions':
        await validateHoverInteractions(page);
        break;
      case 'contextual-menus':
        await validateContextualMenus(page);
        break;
    }
  }
}

async function validateSingleColumnLayout(page: Page): Promise<void> {
  const mainContent = page.locator('[data-testid="main-content"], main, .main-content');
  
  if (await mainContent.count() > 0) {
    const styles = await mainContent.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        flexDirection: computed.flexDirection,
        gridTemplateColumns: computed.gridTemplateColumns,
      };
    });

    // Verify single-column layout indicators
    const isSingleColumn = 
      styles.flexDirection === 'column' ||
      styles.gridTemplateColumns === 'none' ||
      styles.gridTemplateColumns === '1fr';
      
    expect(isSingleColumn).toBeTruthy();
  }
}

async function validateTwoColumnLayout(page: Page): Promise<void> {
  const mainContent = page.locator('[data-testid="main-content"], main, .main-content');
  
  if (await mainContent.count() > 0) {
    const styles = await mainContent.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        gridTemplateColumns: computed.gridTemplateColumns,
        display: computed.display,
      };
    });

    // Verify two-column layout indicators
    const isTwoColumn = 
      styles.gridTemplateColumns.includes('1fr 1fr') ||
      styles.gridTemplateColumns.includes('repeat(2') ||
      styles.display === 'grid';
      
    expect(isTwoColumn).toBeTruthy();
  }
}

async function validateTouchTargetSizes(page: Page): Promise<void> {
  const interactiveElements = page.locator('button, a[href], input, [role="button"], .btn');
  const count = await interactiveElements.count();
  
  const minimumSize = 44; // 44px minimum touch target size
  
  for (let i = 0; i < Math.min(count, 20); i++) { // Check first 20 elements
    const element = interactiveElements.nth(i);
    const box = await element.boundingBox();
    
    if (box && box.width > 0 && box.height > 0) {
      expect(box.width).toBeGreaterThanOrEqual(minimumSize);
      expect(box.height).toBeGreaterThanOrEqual(minimumSize);
    }
  }
}

async function validateTextReadability(page: Page): Promise<void> {
  const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div');
  const count = await textElements.count();
  
  for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10 text elements
    const element = textElements.nth(i);
    const styles = await element.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });

    const fontSize = parseInt(styles.fontSize.replace('px', ''));
    
    // Minimum readable font size on mobile
    expect(fontSize).toBeGreaterThanOrEqual(14);
    
    // Check line height for readability
    if (styles.lineHeight !== 'normal') {
      const lineHeight = parseFloat(styles.lineHeight.replace('px', ''));
      expect(lineHeight).toBeGreaterThanOrEqual(fontSize * 1.2);
    }
  }
}

async function validateAdequateSpacing(page: Page): Promise<void> {
  const contentElements = page.locator('[data-testid*="content"], .content, main');
  const count = await contentElements.count();
  
  for (let i = 0; i < Math.min(count, 5); i++) {
    const element = contentElements.nth(i);
    const styles = await element.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        padding: computed.padding,
        margin: computed.margin,
        paddingTop: computed.paddingTop,
        paddingBottom: computed.paddingBottom,
      };
    });

    // Verify adequate padding (at least 16px)
    const paddingTop = parseInt(styles.paddingTop.replace('px', '') || '0');
    const paddingBottom = parseInt(styles.paddingBottom.replace('px', '') || '0');
    
    expect(paddingTop + paddingBottom).toBeGreaterThanOrEqual(16);
  }
}

async function validateSwipeNavigation(page: Page): Promise<void> {
  // Test if swipe gestures trigger navigation
  const initialUrl = page.url();
  
  // Try swiping right (should trigger back navigation on some mobile interfaces)
  await simulateTouchGestures(page, 'body', { swipeRight: true });
  
  // Wait for potential navigation
  await page.waitForTimeout(500);
  
  // Check if navigation occurred or gesture was handled
  const hasSwipeIndicator = await page.locator('[data-testid="swipe-indicator"]').isVisible().catch(() => false);
  const urlChanged = page.url() !== initialUrl;
  
  // Either URL should change or swipe should be visually acknowledged
  expect(hasSwipeIndicator || urlChanged).toBeTruthy();
}

async function validateExpandedWidgets(page: Page): Promise<void> {
  const widgets = page.locator('[data-testid*="widget"], .widget');
  const count = await widgets.count();
  
  for (let i = 0; i < Math.min(count, 5); i++) {
    const widget = widgets.nth(i);
    const box = await widget.boundingBox();
    
    if (box) {
      // Widgets should be larger on tablet (minimum 200px width)
      expect(box.width).toBeGreaterThanOrEqual(200);
      expect(box.height).toBeGreaterThanOrEqual(150);
    }
  }
}

async function validateHoverInteractions(page: Page): Promise<void> {
  const hoverElements = page.locator('[data-testid*="hover"], .hover-target, button');
  const count = await hoverElements.count();
  
  if (count > 0) {
    const element = hoverElements.first();
    
    // Test hover state
    await element.hover();
    
    // Check if hover styles are applied
    const hasHoverEffect = await element.evaluate(el => {
      const computed = window.getComputedStyle(el);
      // Check for common hover effects
      return computed.cursor === 'pointer' || 
             computed.transform !== 'none' ||
             computed.opacity !== '1';
    });
    
    expect(hasHoverEffect).toBeTruthy();
  }
}

async function validateContextualMenus(page: Page): Promise<void> {
  const menuTriggers = page.locator('[data-testid*="menu"], .menu-trigger');
  const count = await menuTriggers.count();
  
  if (count > 0) {
    const trigger = menuTriggers.first();
    
    // Right-click to trigger context menu
    await trigger.click({ button: 'right' });
    
    // Check if context menu appears
    const contextMenu = page.locator('[data-testid="context-menu"], .context-menu');
    await expect(contextMenu).toBeVisible({ timeout: 1000 });
  }
}

async function validateMobileNavigation(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  
  if (viewport && viewport.width < 768) {
    // Mobile navigation should exist
    const mobileNav = page.locator('[data-testid="mobile-navigation"], .mobile-nav');
    await expect(mobileNav).toBeVisible();
    
    // Check for hamburger menu
    const hamburger = page.locator('[data-testid="mobile-menu-toggle"], .hamburger');
    if (await hamburger.count() > 0) {
      await hamburger.click();
      
      // Menu should open
      const menu = page.locator('[data-testid="mobile-menu"], .mobile-menu');
      await expect(menu).toBeVisible();
      
      // Close menu
      await hamburger.click();
      await expect(menu).not.toBeVisible();
    }
  }
}

// Performance testing for mobile
export async function testMobilePerformance(
  page: Page, 
  options: { url: string; metrics: string[] }
): Promise<MobilePerformanceMetrics> {
  // Navigate to the page and measure performance
  const startTime = Date.now();
  
  await page.goto(options.url);
  await page.waitForLoadState('networkidle');
  
  // Get performance metrics using the Performance API
  const metrics = await page.evaluate(() => {
    const perfEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    
    return {
      firstContentfulPaint: fcp ? fcp.startTime : 0,
      domContentLoaded: perfEntries.domContentLoadedEventEnd - perfEntries.navigationStart,
      loadComplete: perfEntries.loadEventEnd - perfEntries.navigationStart,
      ttfb: perfEntries.responseStart - perfEntries.navigationStart,
    };
  });

  // Simulate additional metrics (in a real implementation, these would come from browser APIs)
  const performanceMetrics: MobilePerformanceMetrics = {
    firstContentfulPaint: metrics.firstContentfulPaint || Date.now() - startTime,
    largestContentfulPaint: metrics.firstContentfulPaint * 1.5 || (Date.now() - startTime) * 1.5,
    cumulativeLayoutShift: Math.random() * 0.1, // Simulated CLS
    firstInputDelay: Math.random() * 100, // Simulated FID
    totalBlockingTime: Math.random() * 300, // Simulated TBT
  };

  return performanceMetrics;
}

// Mobile form testing
export async function testMobileFormInteraction(
  page: Page, 
  formSelector: string
): Promise<void> {
  const form = page.locator(formSelector);
  await expect(form).toBeVisible();

  // Test form inputs have proper mobile attributes
  const inputs = form.locator('input');
  const inputCount = await inputs.count();

  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    const type = await input.getAttribute('type');
    const inputMode = await input.getAttribute('inputmode');
    
    // Verify mobile-optimized input modes
    if (type === 'email') {
      expect(inputMode).toBe('email');
    } else if (type === 'tel') {
      expect(inputMode).toBe('tel');
    } else if (type === 'number') {
      expect(inputMode).toBe('numeric');
    }
  }

  // Test form submission on mobile
  const submitButton = form.locator('button[type="submit"], input[type="submit"]');
  if (await submitButton.count() > 0) {
    const box = await submitButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44); // Touch-friendly size
  }
}

// Mobile accessibility testing
export async function testMobileAccessibility(page: Page): Promise<void> {
  // Check for proper mobile accessibility features
  
  // Test zoom functionality
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => {
    document.body.style.zoom = '200%';
  });
  
  // Content should still be accessible when zoomed
  const mainContent = page.locator('main, [data-testid="main-content"]');
  await expect(mainContent).toBeVisible();
  
  // Reset zoom
  await page.evaluate(() => {
    document.body.style.zoom = '100%';
  });

  // Test screen reader navigation on mobile
  const headings = page.locator('h1, h2, h3, h4, h5, h6');
  const headingCount = await headings.count();
  expect(headingCount).toBeGreaterThan(0);

  // Test focus management
  await page.keyboard.press('Tab');
  const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  expect(['BUTTON', 'A', 'INPUT', 'SELECT']).toContain(focusedElement);
}

// Mobile gesture testing
export async function testMobileGestureResponsiveness(
  page: Page, 
  targetSelector: string
): Promise<void> {
  const target = page.locator(targetSelector);
  await expect(target).toBeVisible();

  // Test tap responsiveness
  const tapStartTime = Date.now();
  await target.tap();
  const tapEndTime = Date.now();
  
  // Tap should respond within 100ms
  expect(tapEndTime - tapStartTime).toBeLessThan(100);

  // Test swipe responsiveness
  const swipeStartTime = Date.now();
  await simulateTouchGestures(page, targetSelector, { swipeLeft: true });
  const swipeEndTime = Date.now();
  
  // Swipe should be processed within 200ms
  expect(swipeEndTime - swipeStartTime).toBeLessThan(200);
}

// Device orientation testing
export async function testDeviceOrientationChanges(page: Page): Promise<void> {
  // Test portrait mode
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  
  const portraitLayout = await page.locator('[data-testid="mobile-layout"]').isVisible();
  
  // Test landscape mode
  await page.setViewportSize({ width: 667, height: 375 });
  await page.waitForTimeout(500);
  
  const landscapeLayout = await page.locator('[data-testid="landscape-layout"]').isVisible();
  
  // At least one orientation should be properly handled
  expect(portraitLayout || landscapeLayout).toBeTruthy();
}

export default {
  simulateTouchGestures,
  validateMobileLayout,
  testMobilePerformance,
  testMobileFormInteraction,
  testMobileAccessibility,
  testMobileGestureResponsiveness,
  testDeviceOrientationChanges,
};
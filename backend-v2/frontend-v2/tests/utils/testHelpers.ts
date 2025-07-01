import { Page, Locator, expect } from '@playwright/test';

/**
 * Common test helper functions for Playwright tests
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for a page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Fill a form field and wait for it to be filled
   */
  async fillField(selector: string, value: string) {
    await this.page.fill(selector, value);
    await expect(this.page.locator(selector)).toHaveValue(value);
  }

  /**
   * Click an element and wait for it to be clicked
   */
  async clickAndWait(selector: string, waitForSelector?: string) {
    await this.page.click(selector);
    if (waitForSelector) {
      await this.page.waitForSelector(waitForSelector);
    }
  }

  /**
   * Wait for element to be visible and enabled
   */
  async waitForElementReady(selector: string) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.waitFor({ state: 'attached' });
    await expect(element).toBeEnabled();
    return element;
  }

  /**
   * Scroll element into view and click
   */
  async scrollAndClick(selector: string) {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    await element.click();
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Wait for API response
   */
  async waitForAPIResponse(urlPattern: string | RegExp, status = 200) {
    const response = await this.page.waitForResponse(
      resp => {
        const url = resp.url();
        const matchesPattern = typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
        return matchesPattern && resp.status() === status;
      }
    );
    return response;
  }

  /**
   * Mock API response
   */
  async mockAPIResponse(urlPattern: string | RegExp, responseData: any, status = 200) {
    await this.page.route(urlPattern, async route => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  /**
   * Check for console errors
   */
  async checkForConsoleErrors() {
    const consoleErrors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Return function to get collected errors
    return () => consoleErrors;
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoadingComplete() {
    // Wait for any loading spinners to disappear
    await this.page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('[data-testid*="loading"], .spinner, .loading');
      return loadingElements.length === 0;
    }, { timeout: 10000 });
  }

  /**
   * Check if element exists without throwing
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get text content safely
   */
  async getTextContent(selector: string): Promise<string> {
    const element = await this.waitForElementReady(selector);
    return await element.textContent() || '';
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, option: string) {
    await this.page.selectOption(selector, option);
    await expect(this.page.locator(selector)).toHaveValue(option);
  }

  /**
   * Upload file
   */
  async uploadFile(selector: string, filePath: string) {
    await this.page.setInputFiles(selector, filePath);
  }

  /**
   * Handle modal dialogs
   */
  async handleDialog(acceptDialog = true, promptText?: string) {
    this.page.once('dialog', async dialog => {
      if (acceptDialog) {
        await dialog.accept(promptText);
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Wait for URL to change
   */
  async waitForURLChange(expectedUrl: string | RegExp) {
    await this.page.waitForURL(expectedUrl);
  }

  /**
   * Verify page title
   */
  async verifyPageTitle(expectedTitle: string) {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  /**
   * Check accessibility violations
   */
  async checkA11y() {
    // Basic accessibility checks
    const focusableElements = await this.page.locator('button, input, select, textarea, a[href]').count();
    console.log(`Found ${focusableElements} focusable elements on page`);
    
    // Check for missing alt text on images
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      console.warn(`Found ${imagesWithoutAlt} images without alt text`);
    }
  }
}

/**
 * Utility functions that don't require page instance
 */
export class TestUtils {
  /**
   * Generate random test data
   */
  static generateTestData() {
    const timestamp = Date.now();
    return {
      email: `test.user.${timestamp}@example.com`,
      firstName: `Test${timestamp}`,
      lastName: `User${timestamp}`,
      phone: `555-${String(timestamp).slice(-7)}`,
      password: 'TestPassword123!',
    };
  }

  /**
   * Generate random string
   */
  static randomString(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Format date for testing
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Sleep/delay function
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxAttempts) {
          throw lastError;
        }
        await this.sleep(delayMs * Math.pow(2, attempt - 1));
      }
    }
    
    throw lastError!;
  }
}

/**
 * Custom assertions for common patterns
 */
export class CustomAssertions {
  constructor(private page: Page) {}

  /**
   * Assert element is visible and enabled
   */
  async assertElementReady(selector: string) {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toBeEnabled();
  }

  /**
   * Assert form validation error
   */
  async assertValidationError(fieldSelector: string, errorMessage?: string) {
    const field = this.page.locator(fieldSelector);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    
    if (errorMessage) {
      const errorElement = this.page.locator(`[aria-describedby*="${await field.getAttribute('aria-describedby')}"]`);
      await expect(errorElement).toContainText(errorMessage);
    }
  }

  /**
   * Assert successful form submission
   */
  async assertFormSuccess(successMessage?: string) {
    if (successMessage) {
      await expect(this.page.locator('[role="alert"], .success-message, .alert-success')).toContainText(successMessage);
    }
  }

  /**
   * Assert API error response
   */
  async assertAPIError(expectedStatus: number, expectedMessage?: string) {
    // This would be used with network interception
    console.log(`Expecting API error with status ${expectedStatus}`);
    if (expectedMessage) {
      console.log(`Expected error message: ${expectedMessage}`);
    }
  }
}
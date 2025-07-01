import { Page, BrowserContext } from '@playwright/test';
import { TestHelpers } from './testHelpers';

/**
 * Authentication helper functions for Playwright tests
 */

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'barber' | 'client';
  phone?: string;
}

export class AuthHelpers {
  private testHelpers: TestHelpers;

  constructor(private page: Page) {
    this.testHelpers = new TestHelpers(page);
  }

  /**
   * Login with credentials
   */
  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/login');
    await this.testHelpers.waitForPageLoad();

    // Fill login form
    await this.testHelpers.fillField('[name="email"], [data-testid="email"]', email);
    await this.testHelpers.fillField('[name="password"], [data-testid="password"]', password);

    // Submit form and wait for navigation
    await this.page.click('[type="submit"], [data-testid="login-button"]');
    
    // Wait for successful login (redirect to dashboard or home)
    await this.page.waitForURL(/\/(dashboard|home|\?)/, { timeout: 10000 });
    await this.testHelpers.waitForPageLoad();
  }

  /**
   * Login as specific test user role
   */
  async loginAs(role: TestUser['role']): Promise<void> {
    const testUser = this.getTestUser(role);
    await this.login(testUser.email, testUser.password);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    // Try different logout patterns
    const logoutSelectors = [
      '[data-testid="logout"]',
      'button:has-text("Logout")',
      'button:has-text("Sign out")',
      '.logout-button',
      '[aria-label="Logout"]'
    ];

    for (const selector of logoutSelectors) {
      if (await this.testHelpers.elementExists(selector)) {
        await this.page.click(selector);
        break;
      }
    }

    // Wait for redirect to login or home page
    await this.page.waitForURL(/\/(login|home|\?)/, { timeout: 5000 });
    await this.testHelpers.waitForPageLoad();
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    // Check for authenticated elements
    const authIndicators = [
      '[data-testid="user-menu"]',
      '[data-testid="logout"]',
      '.user-avatar',
      '.user-profile'
    ];

    for (const selector of authIndicators) {
      if (await this.testHelpers.elementExists(selector)) {
        return true;
      }
    }

    // Check current URL
    const url = this.page.url();
    return !url.includes('/login') && !url.includes('/register');
  }

  /**
   * Get current user role from UI
   */
  async getCurrentUserRole(): Promise<string | null> {
    try {
      // Look for role indicators in the UI
      const roleSelectors = [
        '[data-testid="user-role"]',
        '.user-role',
        '[data-role]'
      ];

      for (const selector of roleSelectors) {
        if (await this.testHelpers.elementExists(selector)) {
          return await this.testHelpers.getTextContent(selector);
        }
      }

      // Check navigation items to infer role
      if (await this.testHelpers.elementExists('[href*="/admin"]')) {
        return 'admin';
      }
      if (await this.testHelpers.elementExists('[href*="/barber"]')) {
        return 'barber';
      }

      return 'client';
    } catch {
      return null;
    }
  }

  /**
   * Register new user
   */
  async register(userData: Partial<TestUser>): Promise<void> {
    await this.page.goto('/register');
    await this.testHelpers.waitForPageLoad();

    // Fill registration form
    if (userData.firstName) {
      await this.testHelpers.fillField('[name="firstName"], [data-testid="firstName"]', userData.firstName);
    }
    if (userData.lastName) {
      await this.testHelpers.fillField('[name="lastName"], [data-testid="lastName"]', userData.lastName);
    }
    if (userData.email) {
      await this.testHelpers.fillField('[name="email"], [data-testid="email"]', userData.email);
    }
    if (userData.phone) {
      await this.testHelpers.fillField('[name="phone"], [data-testid="phone"]', userData.phone);
    }
    if (userData.password) {
      await this.testHelpers.fillField('[name="password"], [data-testid="password"]', userData.password);
      await this.testHelpers.fillField('[name="confirmPassword"], [data-testid="confirmPassword"]', userData.password);
    }

    // Submit form
    await this.page.click('[type="submit"], [data-testid="register-button"]');
    
    // Wait for success or redirect
    await this.page.waitForURL(/\/(dashboard|login|verify-email)/, { timeout: 10000 });
    await this.testHelpers.waitForPageLoad();
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<void> {
    await this.page.goto('/forgot-password');
    await this.testHelpers.waitForPageLoad();

    await this.testHelpers.fillField('[name="email"], [data-testid="email"]', email);
    await this.page.click('[type="submit"], [data-testid="reset-button"]');

    // Wait for confirmation message
    await this.testHelpers.waitForElementReady('.success-message, .alert-success, [data-testid="success"]');
  }

  /**
   * Get test user credentials
   */
  getTestUser(role: TestUser['role']): TestUser {
    const testUsers: Record<TestUser['role'], TestUser> = {
      super_admin: {
        email: 'admin@test.com',
        password: 'admin123',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        phone: '555-0001'
      },
      admin: {
        email: 'manager@test.com',
        password: 'manager123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        phone: '555-0002'
      },
      barber: {
        email: 'barber@test.com',
        password: 'barber123',
        firstName: 'Test',
        lastName: 'Barber',
        role: 'barber',
        phone: '555-0003'
      },
      client: {
        email: 'client@test.com',
        password: 'client123',
        firstName: 'Test',
        lastName: 'Client',
        role: 'client',
        phone: '555-0004'
      }
    };

    return testUsers[role];
  }

  /**
   * Ensure user is logged out
   */
  async ensureLoggedOut(): Promise<void> {
    if (await this.isLoggedIn()) {
      await this.logout();
    }
  }

  /**
   * Ensure user is logged in with specific role
   */
  async ensureLoggedInAs(role: TestUser['role']): Promise<void> {
    const currentRole = await this.getCurrentUserRole();
    
    if (!await this.isLoggedIn() || currentRole !== role) {
      await this.ensureLoggedOut();
      await this.loginAs(role);
    }
  }

  /**
   * Store authentication state for reuse
   */
  async saveAuthState(context: BrowserContext, filePath: string): Promise<void> {
    await context.storageState({ path: filePath });
  }

  /**
   * Load stored authentication state
   */
  static async loadAuthState(context: BrowserContext, filePath: string): Promise<void> {
    await context.addInitScript(() => {
      // This runs in browser context
    });
  }

  /**
   * Mock authentication for testing
   */
  async mockAuth(userData: TestUser): Promise<void> {
    // Mock JWT token in localStorage
    await this.page.addInitScript((user) => {
      const mockToken = btoa(JSON.stringify({
        sub: user.email,
        role: user.role,
        name: `${user.firstName} ${user.lastName}`,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      }));
      
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(user));
    }, userData);
  }

  /**
   * Clear authentication state
   */
  async clearAuthState(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
    });
  }

  /**
   * Verify authentication persistence across page reloads
   */
  async verifyAuthPersistence(): Promise<boolean> {
    const wasLoggedIn = await this.isLoggedIn();
    if (!wasLoggedIn) return false;

    await this.page.reload();
    await this.testHelpers.waitForPageLoad();

    return await this.isLoggedIn();
  }

  /**
   * Test authentication timeout/expiry
   */
  async testAuthTimeout(): Promise<void> {
    // This would require backend coordination to simulate token expiry
    // For now, we can test by clearing the token
    await this.page.evaluate(() => {
      localStorage.removeItem('token');
    });

    // Trigger a request that requires authentication
    await this.page.reload();
    
    // Should redirect to login
    await this.page.waitForURL(/\/login/, { timeout: 5000 });
  }
}
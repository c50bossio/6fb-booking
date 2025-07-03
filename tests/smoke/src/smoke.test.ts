import axios, { AxiosResponse } from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';

const TIMEOUT = 30000;

describe('BookedBarber Smoke Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Set viewport for consistent testing
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Health Checks', () => {
    test('Backend health endpoint should return healthy status', async () => {
      const response = await axios.get(`${API_URL}/health`, {
        timeout: 10000,
        validateStatus: () => true
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'healthy'
      });
    }, TIMEOUT);

    test('Backend database connection should be healthy', async () => {
      const response = await axios.get(`${API_URL}/health/db`, {
        timeout: 10000,
        validateStatus: () => true
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        database: 'connected'
      });
    }, TIMEOUT);

    test('Backend Redis connection should be healthy', async () => {
      const response = await axios.get(`${API_URL}/health/redis`, {
        timeout: 10000,
        validateStatus: () => true
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        redis: 'connected'
      });
    }, TIMEOUT);

    test('Frontend should load successfully', async () => {
      const response = await page.goto(BASE_URL, {
        waitUntil: 'networkidle0',
        timeout: 20000
      });

      expect(response?.status()).toBe(200);

      // Check if the page contains expected content
      const title = await page.title();
      expect(title).toContain('BookedBarber');

      // Check for critical elements
      await page.waitForSelector('[data-testid="app-header"]', { timeout: 10000 });
    }, TIMEOUT);
  });

  describe('API Endpoints', () => {
    test('API version endpoint should return version info', async () => {
      const response = await axios.get(`${API_URL}/api/v1/version`, {
        timeout: 10000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('environment');
      expect(response.data.environment).toBe(ENVIRONMENT);
    }, TIMEOUT);

    test('Authentication endpoint should be accessible', async () => {
      const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
        email: 'test@example.com',
        password: 'invalidpassword'
      }, {
        timeout: 10000,
        validateStatus: () => true
      });

      // Should return 401 for invalid credentials, not 500 or connection error
      expect([400, 401, 422]).toContain(response.status);
    }, TIMEOUT);

    test('Appointments endpoint should be accessible', async () => {
      const response = await axios.get(`${API_URL}/api/v1/appointments/available`, {
        timeout: 10000,
        validateStatus: () => true
      });

      // Should return 401 (unauthorized) not 500 or connection error
      expect([401, 403]).toContain(response.status);
    }, TIMEOUT);

    test('Services endpoint should return service list', async () => {
      const response = await axios.get(`${API_URL}/api/v1/services`, {
        timeout: 10000
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    }, TIMEOUT);
  });

  describe('Frontend Critical Paths', () => {
    test('Homepage should load with all critical elements', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

      // Check navigation
      await page.waitForSelector('[data-testid="nav-menu"]', { timeout: 10000 });

      // Check hero section
      await page.waitForSelector('[data-testid="hero-section"]', { timeout: 10000 });

      // Check booking button
      const bookingButton = await page.$('[data-testid="book-appointment-btn"]');
      expect(bookingButton).toBeTruthy();

      // Check footer
      await page.waitForSelector('[data-testid="footer"]', { timeout: 10000 });
    }, TIMEOUT);

    test('Login page should be accessible', async () => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });

      // Check login form elements
      await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="password-input"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="login-button"]', { timeout: 10000 });

      // Check form submission (should show validation error)
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });
    }, TIMEOUT);

    test('Services page should display services', async () => {
      await page.goto(`${BASE_URL}/services`, { waitUntil: 'networkidle0' });

      // Check services container
      await page.waitForSelector('[data-testid="services-container"]', { timeout: 10000 });

      // Check if services are loaded
      const services = await page.$$('[data-testid="service-card"]');
      expect(services.length).toBeGreaterThan(0);
    }, TIMEOUT);

    test('Contact page should be functional', async () => {
      await page.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle0' });

      // Check contact form
      await page.waitForSelector('[data-testid="contact-form"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="contact-name"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="contact-email"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="contact-message"]', { timeout: 10000 });

      // Check map or location info
      const mapElement = await page.$('[data-testid="location-map"]');
      const locationInfo = await page.$('[data-testid="location-info"]');
      expect(mapElement || locationInfo).toBeTruthy();
    }, TIMEOUT);
  });

  describe('Performance Checks', () => {
    test('API response times should be under acceptable limits', async () => {
      const start = Date.now();
      const response = await axios.get(`${API_URL}/health`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Less than 1 second
    }, TIMEOUT);

    test('Frontend page load time should be acceptable', async () => {
      const start = Date.now();
      await page.goto(BASE_URL, { waitUntil: 'load' });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Less than 5 seconds
    }, TIMEOUT);

    test('Critical resources should load successfully', async () => {
      const response = await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      expect(response?.status()).toBe(200);

      // Check for JavaScript errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Wait a bit to catch any async errors
      await page.waitForTimeout(2000);

      // Filter out non-critical errors
      const criticalErrors = errors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('analytics') &&
        !error.includes('third-party')
      );

      expect(criticalErrors).toHaveLength(0);
    }, TIMEOUT);
  });

  describe('Security Checks', () => {
    test('Security headers should be present', async () => {
      const response = await axios.get(BASE_URL, {
        timeout: 10000
      });

      const headers = response.headers;

      // Check for security headers
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['x-content-type-options']).toBeDefined();
      expect(headers['referrer-policy']).toBeDefined();

      // In production, check for HTTPS redirect
      if (ENVIRONMENT === 'production') {
        expect(headers['strict-transport-security']).toBeDefined();
      }
    }, TIMEOUT);

    test('API should not expose sensitive information', async () => {
      const response = await axios.get(`${API_URL}/health`, {
        timeout: 10000
      });

      const responseText = JSON.stringify(response.data);

      // Should not contain sensitive info
      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('secret');
      expect(responseText).not.toContain('token');
      expect(responseText).not.toContain('key');
    }, TIMEOUT);
  });

  describe('Integration Checks', () => {
    test('Environment-specific configurations should be correct', async () => {
      // Check API URL configuration
      await page.goto(BASE_URL);
      
      const apiUrlConfig = await page.evaluate(() => {
        return (window as any).ENV?.NEXT_PUBLIC_API_URL || 
               document.querySelector('meta[name="api-url"]')?.getAttribute('content');
      });

      if (ENVIRONMENT === 'production') {
        expect(apiUrlConfig).toContain('api.bookedbarber.com');
      } else if (ENVIRONMENT === 'staging') {
        expect(apiUrlConfig).toContain('api-staging.bookedbarber.com');
      }
    }, TIMEOUT);

    test('External service connections should be functional', async () => {
      // Test Google Calendar integration health
      const calendarHealth = await axios.get(`${API_URL}/health/calendar`, {
        timeout: 10000,
        validateStatus: () => true
      });

      // Should return 200 (healthy) or 503 (service unavailable), not 500 (error)
      expect([200, 503]).toContain(calendarHealth.status);

      // Test Stripe integration health
      const stripeHealth = await axios.get(`${API_URL}/health/stripe`, {
        timeout: 10000,
        validateStatus: () => true
      });

      expect([200, 503]).toContain(stripeHealth.status);
    }, TIMEOUT);
  });

  describe('Database Integrity', () => {
    test('Database migrations should be up to date', async () => {
      const response = await axios.get(`${API_URL}/health/migrations`, {
        timeout: 10000
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        migrations: 'up-to-date'
      });
    }, TIMEOUT);

    test('Critical database tables should be accessible', async () => {
      const response = await axios.get(`${API_URL}/health/db/tables`, {
        timeout: 10000
      });

      expect(response.status).toBe(200);
      
      const tables = response.data.tables;
      expect(tables).toContain('users');
      expect(tables).toContain('appointments');
      expect(tables).toContain('services');
      expect(tables).toContain('payments');
    }, TIMEOUT);
  });

  describe('Monitoring and Observability', () => {
    test('Metrics endpoint should be accessible', async () => {
      const response = await axios.get(`${API_URL}/metrics`, {
        timeout: 10000,
        validateStatus: () => true
      });

      // Should be accessible (200) or protected (401/403)
      expect([200, 401, 403]).toContain(response.status);
    }, TIMEOUT);

    test('Sentry integration should be configured', async () => {
      await page.goto(BASE_URL);
      
      const sentryConfigured = await page.evaluate(() => {
        return !!(window as any).Sentry || 
               !!(window as any).__SENTRY__ ||
               document.querySelector('script[src*="sentry"]');
      });

      if (ENVIRONMENT === 'production' || ENVIRONMENT === 'staging') {
        expect(sentryConfigured).toBe(true);
      }
    }, TIMEOUT);
  });
});

// Utility function to wait for network idle
const waitForNetworkIdle = async (page: Page, timeout = 5000) => {
  await page.waitForLoadState('networkidle', { timeout });
};

// Utility function to take screenshot on failure
const takeScreenshotOnFailure = async (page: Page, testName: string) => {
  try {
    await page.screenshot({
      path: `./test-results/screenshots/${testName}-${Date.now()}.png`,
      fullPage: true
    });
  } catch (error) {
    console.warn('Failed to take screenshot:', error);
  }
};
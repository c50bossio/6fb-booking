/**
 * Test helpers and utilities for Six Figure Barber methodology testing.
 * Provides reusable functions for authentication, data setup, and test scenarios.
 */
import { Page, BrowserContext, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Types for test data
export interface SixFigureTestUser {
  id: number;
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'BARBER' | 'CLIENT';
  sixFigureEnrolled?: boolean;
  sixFigureTier?: 'STARTER' | 'GROWTH' | 'ELITE' | 'MASTER';
}

export interface SixFigureTestService {
  id: number;
  name: string;
  price: number;
  duration: number;
  category: string;
  sixFigureCompliant: boolean;
}

export interface SixFigureTestData {
  barber: SixFigureTestUser;
  client: SixFigureTestUser;
  client1?: SixFigureTestUser;
  client2?: SixFigureTestUser;
  services: SixFigureTestService[];
  analytics: any;
}

// Authentication helpers
export async function loginAsBarber(page: Page, barberData: SixFigureTestUser): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', barberData.email);
  await page.fill('[data-testid="password"]', barberData.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login
  await page.waitForURL('/dashboard*');
  await expect(page.locator('[data-testid="user-name"]')).toHaveText(barberData.name);
}

export async function loginAsClient(page: Page, clientData: SixFigureTestUser): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', clientData.email);
  await page.fill('[data-testid="password"]', clientData.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login
  await page.waitForURL('/*');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

// Data setup helpers
export async function setupSixFigureBarberTestData(): Promise<SixFigureTestData> {
  // Generate Six Figure Barber
  const barber: SixFigureTestUser = {
    id: faker.number.int({ min: 1, max: 1000 }),
    email: `sixfigure.${faker.internet.userName()}@test.com`,
    password: 'TestPassword123!',
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    phone: faker.phone.number(),
    role: 'BARBER',
    sixFigureEnrolled: true,
    sixFigureTier: faker.helpers.arrayElement(['STARTER', 'GROWTH', 'ELITE', 'MASTER']),
  };

  // Generate premium client
  const client: SixFigureTestUser = {
    id: faker.number.int({ min: 1001, max: 2000 }),
    email: `premium.client.${faker.internet.userName()}@test.com`,
    password: 'TestPassword123!',
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    phone: faker.phone.number(),
    role: 'CLIENT',
  };

  // Generate Six Figure compliant services
  const services: SixFigureTestService[] = [
    {
      id: 1,
      name: 'Executive Premium Cut',
      price: 175,
      duration: 90,
      category: 'HAIRCUT',
      sixFigureCompliant: true,
    },
    {
      id: 2,
      name: 'Luxury Grooming Package',
      price: 250,
      duration: 120,
      category: 'PACKAGE',
      sixFigureCompliant: true,
    },
    {
      id: 3,
      name: 'Premium Beard Sculpting',
      price: 125,
      duration: 60,
      category: 'BEARD',
      sixFigureCompliant: true,
    },
  ];

  // Generate analytics data
  const analytics = generateMockAnalyticsData(barber);

  return { barber, client, services, analytics };
}

export async function setupMobileSixFigureTestData(): Promise<SixFigureTestData> {
  const baseData = await setupSixFigureBarberTestData();
  
  // Add additional clients for mobile testing
  baseData.client1 = {
    id: faker.number.int({ min: 2001, max: 3000 }),
    email: `mobile.client1.${faker.internet.userName()}@test.com`,
    password: 'TestPassword123!',
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    phone: faker.phone.number(),
    role: 'CLIENT',
  };

  baseData.client2 = {
    id: faker.number.int({ min: 3001, max: 4000 }),
    email: `mobile.client2.${faker.internet.userName()}@test.com`,
    password: 'TestPassword123!',
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    phone: faker.phone.number(),
    role: 'CLIENT',
  };

  return baseData;
}

// Service creation helpers
export async function createPremiumService(
  page: Page, 
  serviceData: Partial<SixFigureTestService>
): Promise<SixFigureTestService> {
  await page.goto('/services/new');
  
  const service = {
    name: serviceData.name || 'Premium Test Service',
    price: serviceData.price || 150,
    duration: serviceData.duration || 75,
    category: serviceData.category || 'HAIRCUT',
    sixFigureCompliant: serviceData.sixFigureCompliant ?? true,
    ...serviceData,
  };

  await page.fill('[data-testid="service-name"]', service.name);
  await page.fill('[data-testid="service-price"]', service.price.toString());
  await page.fill('[data-testid="service-duration"]', service.duration.toString());
  await page.selectOption('[data-testid="service-category"]', service.category);
  
  if (service.sixFigureCompliant) {
    await page.check('[data-testid="six-figure-compliant"]');
  }
  
  await page.click('[data-testid="create-service"]');
  await expect(page.locator('text="Service created successfully"')).toBeVisible();

  return { id: faker.number.int({ min: 1, max: 1000 }), ...service };
}

// Payment simulation helpers
export async function simulatePaymentSuccess(
  page: Page, 
  paymentData: { amount: number; tip?: number; paymentMethod?: string }
): Promise<void> {
  const { amount, tip = 0, paymentMethod = 'card' } = paymentData;

  // Fill payment form
  if (paymentMethod === 'card') {
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'Test User');
  }

  if (tip > 0) {
    await page.fill('[data-testid="tip-amount"]', tip.toString());
  }

  await page.click('[data-testid="process-payment"]');
  
  // Wait for payment success
  await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
  await expect(page.locator(`text="$${amount + tip}"`)).toBeVisible();
}

export async function simulatePaymentFailure(
  page: Page, 
  errorType: 'card_declined' | 'network_error' | 'insufficient_funds' = 'card_declined'
): Promise<void> {
  // Use test card numbers that simulate specific failures
  const failureCards = {
    card_declined: '4000000000000002',
    insufficient_funds: '4000000000009995',
    network_error: '4000000000000119',
  };

  await page.fill('[data-testid="card-number"]', failureCards[errorType]);
  await page.fill('[data-testid="card-expiry"]', '12/25');
  await page.fill('[data-testid="card-cvc"]', '123');
  await page.fill('[data-testid="cardholder-name"]', 'Test Failure');

  await page.click('[data-testid="process-payment"]');
  
  // Wait for payment error
  await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
}

// Analytics data generators
export function generateMockAnalyticsData(barber: SixFigureTestUser) {
  const baseRevenue = barber.sixFigureTier === 'MASTER' ? 15000 : 
                     barber.sixFigureTier === 'ELITE' ? 12000 :
                     barber.sixFigureTier === 'GROWTH' ? 8000 : 5000;

  return {
    revenueMetrics: {
      monthlyRevenue: baseRevenue + faker.number.int({ min: -1000, max: 2000 }),
      revenuePerHour: 125 + faker.number.int({ min: -25, max: 50 }),
      yearToDateRevenue: baseRevenue * 8 + faker.number.int({ min: -5000, max: 10000 }),
      goalProgress: faker.number.float({ min: 55, max: 95, precision: 0.1 }),
    },
    clientMetrics: {
      totalClients: faker.number.int({ min: 80, max: 200 }),
      retentionRate: faker.number.float({ min: 75, max: 95, precision: 0.1 }),
      averageClientValue: faker.number.int({ min: 800, max: 2000 }),
      newClientsThisMonth: faker.number.int({ min: 5, max: 15 }),
    },
    serviceExcellence: {
      satisfactionScore: faker.number.float({ min: 4.2, max: 5.0, precision: 0.1 }),
      onTimePercentage: faker.number.float({ min: 85, max: 100, precision: 0.1 }),
      rebookingRate: faker.number.float({ min: 75, max: 95, precision: 0.1 }),
      referralRate: faker.number.float({ min: 15, max: 35, precision: 0.1 }),
    },
    goals: {
      annualTarget: barber.sixFigureTier === 'MASTER' ? 200000 :
                   barber.sixFigureTier === 'ELITE' ? 175000 :
                   barber.sixFigureTier === 'GROWTH' ? 150000 : 125000,
      currentProgress: baseRevenue * 8,
      monthlyTarget: baseRevenue,
      onTrackForGoal: faker.datatype.boolean(),
    },
  };
}

export function generateClientValueData(count: number = 20) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    tier: faker.helpers.arrayElement(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
    lifetimeValue: faker.number.int({ min: 500, max: 5000 }),
    lastVisit: faker.date.recent({ days: 60 }).toISOString().split('T')[0],
    valueScore: faker.number.int({ min: 60, max: 100 }),
    retentionProbability: faker.number.int({ min: 70, max: 95 }),
  }));
}

export function generateRevenueOpportunities(clientCount: number = 10) {
  return Array.from({ length: clientCount }, (_, i) => ({
    id: i + 1,
    clientId: faker.number.int({ min: 1, max: 100 }),
    opportunityType: faker.helpers.arrayElement([
      'UPSELL_SERVICE',
      'INCREASE_FREQUENCY',
      'REFERRAL_INCENTIVE',
      'PREMIUM_UPGRADE',
    ]),
    potentialRevenue: faker.number.int({ min: 50, max: 300 }),
    probability: faker.number.float({ min: 30, max: 85, precision: 0.1 }),
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['IDENTIFIED', 'PRESENTED', 'ACCEPTED', 'DECLINED']),
  }));
}

// Form helpers
export async function fillSixFigureConsultationForm(
  page: Page, 
  consultationData: {
    stylePreferences: string;
    lifestyleNotes: string;
    maintenancePreference: string;
    budgetRange: string;
  }
): Promise<void> {
  await page.fill('[data-testid="style-preferences"]', consultationData.stylePreferences);
  await page.fill('[data-testid="lifestyle-notes"]', consultationData.lifestyleNotes);
  await page.selectOption('[data-testid="maintenance-preference"]', consultationData.maintenancePreference);
  await page.selectOption('[data-testid="budget-range"]', consultationData.budgetRange);
}

export async function fillClientRegistrationForm(
  page: Page,
  clientData: Partial<SixFigureTestUser>
): Promise<void> {
  await page.fill('[data-testid="client-name"]', clientData.name || faker.person.fullName());
  await page.fill('[data-testid="client-email"]', clientData.email || faker.internet.email());
  await page.fill('[data-testid="client-phone"]', clientData.phone || faker.phone.number());
  
  if (clientData.password) {
    await page.fill('[data-testid="client-password"]', clientData.password);
    await page.fill('[data-testid="confirm-password"]', clientData.password);
  }
}

// Validation helpers
export async function validateSixFigureMetrics(page: Page) {
  // Validate that Six Figure specific metrics are present
  await expect(page.locator('[data-testid="six-figure-compliance-score"]')).toBeVisible();
  await expect(page.locator('[data-testid="premium-service-ratio"]')).toBeVisible();
  await expect(page.locator('[data-testid="client-value-tracking"]')).toBeVisible();
  await expect(page.locator('[data-testid="revenue-optimization-status"]')).toBeVisible();
}

export async function validateClientJourneyProgression(
  page: Page, 
  expectedStage: string
): Promise<void> {
  await expect(page.locator('[data-testid="client-journey-stage"]')).toHaveText(expectedStage);
  await expect(page.locator('[data-testid="value-score"]')).toBeVisible();
  await expect(page.locator('[data-testid="retention-probability"]')).toBeVisible();
}

// Time and date helpers
export function getNextAvailableDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export function getNextBusinessDay(): string {
  const date = new Date();
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() === 0 || date.getDay() === 6); // Skip weekends
  
  return date.toISOString().split('T')[0];
}

export function formatTimeSlot(hour: number, minute: number = 0): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Error simulation helpers
export async function simulateNetworkError(page: Page, url: string): Promise<void> {
  await page.route(url, route => route.abort());
}

export async function simulateSlowNetwork(page: Page, delayMs: number = 2000): Promise<void> {
  await page.route('**/*', route => 
    setTimeout(() => route.continue(), delayMs)
  );
}

// Browser storage helpers
export async function setTestAuthToken(page: Page, token: string): Promise<void> {
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, token);
}

export async function clearTestData(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

// Performance measurement helpers
export async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return Date.now() - startTime;
}

export async function measureRenderTime(page: Page, selector: string): Promise<number> {
  const startTime = Date.now();
  await page.waitForSelector(selector);
  return Date.now() - startTime;
}

// Accessibility helpers
export async function checkKeyboardNavigation(page: Page): Promise<void> {
  // Test tab navigation
  await page.keyboard.press('Tab');
  
  const focusedElement = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? {
      tagName: el.tagName,
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
    } : null;
  });

  expect(focusedElement).toBeTruthy();
  expect(['BUTTON', 'INPUT', 'A', 'SELECT']).toContain(focusedElement?.tagName);
}

export async function checkScreenReaderCompatibility(page: Page): Promise<void> {
  // Check for proper ARIA labels
  const ariaElements = await page.locator('[aria-label], [aria-labelledby], [role]').count();
  expect(ariaElements).toBeGreaterThan(0);
  
  // Check for heading hierarchy
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
  expect(headings).toBeGreaterThan(0);
}

// API mocking helpers
export async function mockSixFigureAnalyticsAPI(page: Page, mockData: any): Promise<void> {
  await page.route('**/api/v2/six-figure-barber/analytics/*', route => 
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(mockData),
    })
  );
}

export async function mockPaymentAPI(page: Page, shouldSucceed: boolean = true): Promise<void> {
  await page.route('**/api/v2/payments', route => {
    if (shouldSucceed) {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          paymentId: faker.string.uuid(),
          amount: 175,
          status: 'completed',
        }),
      });
    } else {
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Payment failed',
          code: 'card_declined',
        }),
      });
    }
  });
}

// Wait helpers
export async function waitForSixFigureMetricsLoad(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="six-figure-metrics-loaded"]');
  await page.waitForFunction(() => 
    !document.querySelector('[data-testid="metrics-loading"]')
  );
}

export async function waitForChartRender(page: Page, chartSelector: string): Promise<void> {
  await page.waitForSelector(chartSelector);
  await page.waitForFunction(
    (selector) => {
      const chart = document.querySelector(selector);
      return chart && chart.querySelector('svg, canvas');
    },
    chartSelector
  );
}

// Cleanup helpers
export async function cleanupTestData(page: Page): Promise<void> {
  // Clear any test data created during the test
  await clearTestData(page);
  
  // Reset any mocked routes
  await page.unrouteAll();
}

export default {
  loginAsBarber,
  loginAsClient,
  setupSixFigureBarberTestData,
  setupMobileSixFigureTestData,
  createPremiumService,
  simulatePaymentSuccess,
  simulatePaymentFailure,
  generateMockAnalyticsData,
  generateClientValueData,
  generateRevenueOpportunities,
  fillSixFigureConsultationForm,
  fillClientRegistrationForm,
  validateSixFigureMetrics,
  validateClientJourneyProgression,
  getNextAvailableDate,
  getNextBusinessDay,
  formatTimeSlot,
  simulateNetworkError,
  simulateSlowNetwork,
  setTestAuthToken,
  clearTestData,
  measurePageLoadTime,
  measureRenderTime,
  checkKeyboardNavigation,
  checkScreenReaderCompatibility,
  mockSixFigureAnalyticsAPI,
  mockPaymentAPI,
  waitForSixFigureMetricsLoad,
  waitForChartRender,
  cleanupTestData,
};
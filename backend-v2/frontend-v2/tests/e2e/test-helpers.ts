/**
 * Test Helper Utilities for E2E Appointment Testing
 */
import { Page, expect } from '@playwright/test';
import { TEST_CONFIG, SELECTORS } from './test-config';
import { format, addDays } from 'date-fns';

/**
 * Authentication helpers
 */
export class AuthHelper {
  constructor(private page: Page) {}

  async loginAsCustomer() {
    await this.page.goto(`${TEST_CONFIG.FRONTEND_URL}/login`);
    await this.page.fill(SELECTORS.emailInput, TEST_CONFIG.CUSTOMER.email);
    await this.page.fill(SELECTORS.passwordInput, TEST_CONFIG.CUSTOMER.password);
    await this.page.click(SELECTORS.loginButton);
    await this.page.waitForURL('**/dashboard', { timeout: TEST_CONFIG.TIMEOUTS.medium });
  }

  async loginAsBarber() {
    await this.page.goto(`${TEST_CONFIG.FRONTEND_URL}/barber/login`);
    await this.page.fill(SELECTORS.emailInput, TEST_CONFIG.BARBER.email);
    await this.page.fill(SELECTORS.passwordInput, TEST_CONFIG.BARBER.password);
    await this.page.click(SELECTORS.loginButton);
    await this.page.waitForURL('**/barber/dashboard', { timeout: TEST_CONFIG.TIMEOUTS.medium });
  }

  async loginAsAdmin() {
    await this.page.goto(`${TEST_CONFIG.FRONTEND_URL}/admin/login`);
    await this.page.fill(SELECTORS.emailInput, TEST_CONFIG.ADMIN.email);
    await this.page.fill(SELECTORS.passwordInput, TEST_CONFIG.ADMIN.password);
    await this.page.click(SELECTORS.loginButton);
    await this.page.waitForURL('**/admin/dashboard', { timeout: TEST_CONFIG.TIMEOUTS.medium });
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('text=Logout');
    await this.page.waitForURL('**/login');
  }
}

/**
 * Booking flow helpers
 */
export class BookingHelper {
  constructor(private page: Page) {}

  async selectService(serviceName: string = TEST_CONFIG.APPOINTMENT.service) {
    await this.page.waitForSelector(SELECTORS.serviceSelection);
    await this.page.click(`${SELECTORS.serviceCard}:has-text("${serviceName}")`);
    await this.page.waitForSelector('[data-testid="service-selected"]');
  }

  async selectDateTime(date?: string, time?: string) {
    const appointmentDate = date || format(addDays(new Date(), 3), 'yyyy-MM-dd');
    const appointmentTime = time || '14:00';

    // Select date
    await this.page.click(`[data-date="${appointmentDate}"]`);
    await this.page.waitForSelector(`[data-date="${appointmentDate}"].selected`);

    // Select time
    await this.page.click(`[data-time="${appointmentTime}"]`);
    await this.page.waitForSelector(`[data-time="${appointmentTime}"].selected`);

    return { date: appointmentDate, time: appointmentTime };
  }

  async fillCustomerDetails(customerData?: any) {
    const customer = customerData || TEST_CONFIG.CUSTOMER;
    
    await this.page.fill('input[name="customerName"]', customer.name);
    await this.page.fill('input[name="customerPhone"]', customer.phone);
    await this.page.fill('input[name="customerEmail"]', customer.email);
    
    if (TEST_CONFIG.APPOINTMENT.notes) {
      await this.page.fill('textarea[name="notes"]', TEST_CONFIG.APPOINTMENT.notes);
    }
  }

  async proceedToPayment() {
    await this.page.click('button:has-text("Continue to Payment")');
    await this.page.waitForSelector(SELECTORS.stripeCard, { timeout: TEST_CONFIG.TIMEOUTS.medium });
  }
}

/**
 * Payment helpers
 */
export class PaymentHelper {
  constructor(private page: Page) {}

  async fillStripeCard(cardData?: any) {
    const card = cardData || TEST_CONFIG.PAYMENT.testCard;
    
    // Wait for Stripe iframe to load
    await this.page.waitForSelector(SELECTORS.stripeCardFrame, { timeout: TEST_CONFIG.TIMEOUTS.medium });
    
    const cardFrame = this.page.frameLocator(SELECTORS.stripeCardFrame);
    
    // Fill card details
    await cardFrame.locator('input[name="cardnumber"]').fill(card.number);
    await cardFrame.locator('input[name="exp-date"]').fill(card.expiry);
    await cardFrame.locator('input[name="cvc"]').fill(card.cvc);
    await cardFrame.locator('input[name="postal"]').fill(card.postal);
  }

  async submitPayment() {
    await this.page.click(SELECTORS.paymentButton);
    await this.page.waitForSelector(SELECTORS.paymentSuccess, { 
      timeout: TEST_CONFIG.TIMEOUTS.payment 
    });
  }

  async getPaymentConfirmation() {
    // Extract appointment ID and payment details
    const appointmentId = await this.page.locator('[data-testid="appointment-id"]').textContent();
    const paymentId = await this.page.locator('[data-testid="payment-id"]').textContent();
    
    return { appointmentId, paymentId };
  }
}

/**
 * Calendar helpers
 */
export class CalendarHelper {
  constructor(private page: Page) {}

  async navigateToCalendar() {
    await this.page.click('text=Calendar');
    await this.page.waitForSelector('[data-testid="calendar-view"]');
  }

  async switchToMonthView() {
    await this.page.click('button:has-text("Month")');
    await this.page.waitForSelector(SELECTORS.monthlyCalendar);
  }

  async switchToWeekView() {
    await this.page.click('button:has-text("Week")');
    await this.page.waitForSelector(SELECTORS.weeklyCalendar);
  }

  async switchToDayView() {
    await this.page.click('button:has-text("Day")');
    await this.page.waitForSelector(SELECTORS.dailyCalendar);
  }

  async navigateToDate(date: string) {
    const targetDate = new Date(date);
    const today = new Date();
    
    // Calculate if we need to navigate forward or backward
    if (targetDate > today) {
      const monthsAhead = (targetDate.getFullYear() - today.getFullYear()) * 12 + 
                         (targetDate.getMonth() - today.getMonth());
      
      for (let i = 0; i < monthsAhead; i++) {
        await this.page.click(SELECTORS.nextButton);
        await this.page.waitForTimeout(500); // Small delay for navigation
      }
    }
  }

  async findAppointmentInView(appointmentId: string, view: 'month' | 'week' | 'day') {
    const selector = `[data-appointment-id="${appointmentId}"]`;
    await expect(this.page.locator(selector)).toBeVisible();
    return this.page.locator(selector);
  }

  async clickAppointment(appointmentId: string) {
    await this.page.click(`[data-appointment-id="${appointmentId}"]`);
    await this.page.waitForSelector(SELECTORS.appointmentModal);
  }

  async verifyAppointmentDetails(expectedData: any) {
    const modal = this.page.locator(SELECTORS.appointmentModal);
    
    await expect(modal).toContainText(expectedData.customerName);
    await expect(modal).toContainText(expectedData.service);
    await expect(modal).toContainText(expectedData.date);
    await expect(modal).toContainText(expectedData.time);
    
    if (expectedData.phone) {
      await expect(modal).toContainText(expectedData.phone);
    }
    
    if (expectedData.notes) {
      await expect(modal).toContainText(expectedData.notes);
    }
  }
}

/**
 * API verification helpers
 */
export class APIHelper {
  constructor(private page: Page) {}

  async verifyPaymentStatus(paymentId: string) {
    const response = await this.page.request.get(
      `${TEST_CONFIG.BACKEND_URL}/api/v1/payments/${paymentId}`
    );
    expect(response.status()).toBe(200);
    
    const payment = await response.json();
    expect(payment.status).toBe('completed');
    return payment;
  }

  async verifyAppointmentCreated(appointmentId: string) {
    const response = await this.page.request.get(
      `${TEST_CONFIG.BACKEND_URL}/api/v1/appointments/${appointmentId}`
    );
    expect(response.status()).toBe(200);
    
    const appointment = await response.json();
    expect(appointment.status).toBe('confirmed');
    return appointment;
  }

  async verifyWebhookDelivery() {
    const response = await this.page.request.get(
      `${TEST_CONFIG.BACKEND_URL}/api/v1/webhooks/recent?limit=5`
    );
    expect(response.status()).toBe(200);
    
    const webhooks = await response.json();
    const recentWebhook = webhooks.find((w: any) => 
      w.event_type === 'payment_intent.succeeded' && 
      new Date(w.created_at) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );
    
    expect(recentWebhook).toBeTruthy();
    return recentWebhook;
  }

  async cleanupTestAppointment(appointmentId: string) {
    const response = await this.page.request.delete(
      `${TEST_CONFIG.BACKEND_URL}/api/v1/appointments/${appointmentId}`
    );
    expect(response.status()).toBe(200);
  }
}

/**
 * Screenshot helpers
 */
export class ScreenshotHelper {
  constructor(private page: Page) {}

  async takeScreenshot(name: string, options?: any) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${name}.png`;
    
    await this.page.screenshot({
      path: `${TEST_CONFIG.SCREENSHOTS.path}/${filename}`,
      fullPage: TEST_CONFIG.SCREENSHOTS.fullPage,
      ...options
    });
    
    return filename;
  }

  async takeFullPageScreenshot(name: string) {
    return this.takeScreenshot(name, { fullPage: true });
  }

  async takeViewportScreenshot(name: string) {
    return this.takeScreenshot(name, { fullPage: false });
  }
}

/**
 * Wait helpers
 */
export class WaitHelper {
  constructor(private page: Page) {}

  async waitForPaymentProcessing() {
    // Wait for loading spinner to appear and disappear
    await this.page.waitForSelector(SELECTORS.loadingSpinner, { 
      timeout: TEST_CONFIG.TIMEOUTS.short 
    });
    await this.page.waitForSelector(SELECTORS.loadingSpinner, { 
      state: 'hidden', 
      timeout: TEST_CONFIG.TIMEOUTS.payment 
    });
  }

  async waitForCalendarLoad() {
    await this.page.waitForSelector('[data-testid="calendar-loaded"]', {
      timeout: TEST_CONFIG.TIMEOUTS.medium
    });
  }

  async waitForAppointmentUpdate() {
    await this.page.waitForSelector('[data-testid="appointment-updated"]', {
      timeout: TEST_CONFIG.TIMEOUTS.medium
    });
  }
}

/**
 * Combined test context helper
 */
export class TestContext {
  public auth: AuthHelper;
  public booking: BookingHelper;
  public payment: PaymentHelper;
  public calendar: CalendarHelper;
  public api: APIHelper;
  public screenshot: ScreenshotHelper;
  public wait: WaitHelper;

  constructor(private page: Page) {
    this.auth = new AuthHelper(page);
    this.booking = new BookingHelper(page);
    this.payment = new PaymentHelper(page);
    this.calendar = new CalendarHelper(page);
    this.api = new APIHelper(page);
    this.screenshot = new ScreenshotHelper(page);
    this.wait = new WaitHelper(page);
  }
}
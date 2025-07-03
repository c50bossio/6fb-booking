/**
 * Complete End-to-End Appointment Flow Testing
 * Tests customer booking → payment → barber calendar verification
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import { format, addDays } from 'date-fns';

// Test configuration
const CONFIG = {
  BASE_URL: 'http://localhost:3001', // Using staging frontend
  API_URL: 'http://localhost:8000',
  CUSTOMER_EMAIL: 'test.customer@bookedbarber.com',
  CUSTOMER_PASSWORD: 'testpass123',
  BARBER_EMAIL: 'test.barber@bookedbarber.com', 
  BARBER_PASSWORD: 'barberpass123',
  TEST_AMOUNT: 1.00, // $1.00 for live testing
  SCREENSHOT_PATH: './test-results/screenshots',
  TIMEOUT: 30000 // 30 seconds for slow operations
};

// Test data for appointment
const APPOINTMENT_DATA = {
  service: 'Haircut',
  amount: CONFIG.TEST_AMOUNT,
  date: format(addDays(new Date(), 3), 'yyyy-MM-dd'), // 3 days from now
  time: '14:00', // 2:00 PM
  customerName: 'Test Customer',
  customerPhone: '+1234567890',
  notes: 'E2E test appointment - safe to delete'
};

test.describe('Complete Appointment Flow', () => {
  let customerContext: BrowserContext;
  let barberContext: BrowserContext;
  let customerPage: Page;
  let barberPage: Page;
  let appointmentId: string;

  test.beforeAll(async ({ browser }) => {
    // Create separate contexts for customer and barber
    customerContext = await browser.newContext();
    barberContext = await browser.newContext();
    
    customerPage = await customerContext.newPage();
    barberPage = await barberContext.newPage();

    // Set timeouts
    customerPage.setDefaultTimeout(CONFIG.TIMEOUT);
    barberPage.setDefaultTimeout(CONFIG.TIMEOUT);
  });

  test.afterAll(async () => {
    await customerContext.close();
    await barberContext.close();
  });

  test('Phase 1: Customer Books Appointment with Live Payment', async () => {
    console.log('🚀 Starting customer booking flow...');

    // Step 1: Navigate to customer portal
    await customerPage.goto(CONFIG.BASE_URL);
    await customerPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/01-homepage.png`, fullPage: true });

    // Step 2: Login as customer (using auth bypass)
    await customerPage.click('text=Login');
    await customerPage.fill('input[type="email"]', CONFIG.CUSTOMER_EMAIL);
    await customerPage.fill('input[type="password"]', CONFIG.CUSTOMER_PASSWORD);
    await customerPage.click('button[type="submit"]');
    
    // Wait for dashboard or handle auth bypass
    await customerPage.waitForURL('**/dashboard', { timeout: 10000 });
    await customerPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/02-customer-dashboard.png`, fullPage: true });

    // Step 3: Navigate to booking
    await customerPage.click('text=Book Appointment');
    await customerPage.waitForSelector('[data-testid="service-selection"]', { timeout: 15000 });
    await customerPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/03-service-selection.png`, fullPage: true });

    // Step 4: Select service
    await customerPage.click(`text=${APPOINTMENT_DATA.service}`);
    await customerPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/04-service-selected.png`, fullPage: true });

    // Step 5: Select date and time
    await customerPage.click(`[data-date="${APPOINTMENT_DATA.date}"]`);
    await customerPage.click(`[data-time="${APPOINTMENT_DATA.time}"]`);
    await customerPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/05-datetime-selected.png`, fullPage: true });

    // Step 6: Fill customer details
    await customerPage.fill('input[name="customerName"]', APPOINTMENT_DATA.customerName);
    await customerPage.fill('input[name="customerPhone"]', APPOINTMENT_DATA.customerPhone);
    await customerPage.fill('textarea[name="notes"]', APPOINTMENT_DATA.notes);
    await customerPage.click('button:has-text("Continue to Payment")');
    
    await customerPage.waitForSelector('#stripe-card-element', { timeout: 15000 });
    await customerPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/06-payment-form.png`, fullPage: true });

    // Step 7: Live Stripe Payment
    console.log('💳 Processing live Stripe payment...');
    
    // Fill Stripe form with test card
    const cardFrame = customerPage.frameLocator('#stripe-card-element iframe');
    await cardFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await cardFrame.locator('input[name="exp-date"]').fill('12/25');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    await cardFrame.locator('input[name="postal"]').fill('12345');

    // Submit payment
    await customerPage.click('button:has-text("Pay Now")');
    
    // Wait for payment confirmation
    await customerPage.waitForSelector('.payment-success', { timeout: 30000 });
    await customerPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/07-payment-success.png`, fullPage: true });

    // Extract appointment ID for later verification
    const appointmentElement = await customerPage.locator('[data-testid="appointment-id"]');
    appointmentId = await appointmentElement.textContent();
    console.log(`✅ Appointment created with ID: ${appointmentId}`);

    // Verify appointment confirmation details
    await expect(customerPage.locator('text=' + APPOINTMENT_DATA.service)).toBeVisible();
    await expect(customerPage.locator('text=' + APPOINTMENT_DATA.date)).toBeVisible();
    await expect(customerPage.locator('text=' + APPOINTMENT_DATA.time)).toBeVisible();
  });

  test('Phase 2: Verify Appointment in Barber Monthly Calendar', async () => {
    console.log('📅 Testing monthly calendar view...');

    // Step 1: Login as barber
    await barberPage.goto(`${CONFIG.BASE_URL}/barber/login`);
    await barberPage.fill('input[type="email"]', CONFIG.BARBER_EMAIL);
    await barberPage.fill('input[type="password"]', CONFIG.BARBER_PASSWORD);
    await barberPage.click('button[type="submit"]');
    
    await barberPage.waitForURL('**/barber/dashboard');
    await barberPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/08-barber-dashboard.png`, fullPage: true });

    // Step 2: Navigate to monthly calendar
    await barberPage.click('text=Calendar');
    await barberPage.click('button:has-text("Month")');
    await barberPage.waitForSelector('.calendar-month-view', { timeout: 10000 });
    
    // Navigate to appointment month if needed
    const appointmentDate = new Date(APPOINTMENT_DATA.date);
    const currentDate = new Date();
    if (appointmentDate.getMonth() !== currentDate.getMonth()) {
      await barberPage.click('.calendar-nav-next');
    }

    await barberPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/09-monthly-calendar.png`, fullPage: true });

    // Step 3: Verify appointment appears in monthly view
    const appointmentSelector = `[data-date="${APPOINTMENT_DATA.date}"] .appointment`;
    await expect(barberPage.locator(appointmentSelector)).toBeVisible();
    
    // Verify appointment details in monthly view
    const appointmentInMonth = barberPage.locator(appointmentSelector);
    await expect(appointmentInMonth).toContainText(APPOINTMENT_DATA.service);
    await expect(appointmentInMonth).toContainText(APPOINTMENT_DATA.time);

    console.log('✅ Appointment verified in monthly calendar view');
  });

  test('Phase 3: Verify Appointment in Barber Weekly Calendar', async () => {
    console.log('📊 Testing weekly calendar view...');

    // Step 1: Switch to weekly view
    await barberPage.click('button:has-text("Week")');
    await barberPage.waitForSelector('.calendar-week-view', { timeout: 10000 });
    
    // Navigate to appointment week if needed
    const appointmentDate = new Date(APPOINTMENT_DATA.date);
    await barberPage.goto(`${CONFIG.BASE_URL}/barber/calendar/week/${format(appointmentDate, 'yyyy-MM-dd')}`);
    
    await barberPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/10-weekly-calendar.png`, fullPage: true });

    // Step 2: Verify appointment in weekly view
    const weeklyAppointmentSelector = `.time-slot[data-time="${APPOINTMENT_DATA.time}"] .appointment`;
    await expect(barberPage.locator(weeklyAppointmentSelector)).toBeVisible();
    
    // Verify appointment details in weekly view
    const appointmentInWeek = barberPage.locator(weeklyAppointmentSelector);
    await expect(appointmentInWeek).toContainText(APPOINTMENT_DATA.customerName);
    await expect(appointmentInWeek).toContainText(APPOINTMENT_DATA.service);

    console.log('✅ Appointment verified in weekly calendar view');
  });

  test('Phase 4: Verify Appointment in Barber Daily Calendar', async () => {
    console.log('📋 Testing daily calendar view...');

    // Step 1: Switch to daily view
    await barberPage.click('button:has-text("Day")');
    await barberPage.waitForSelector('.calendar-day-view', { timeout: 10000 });
    
    // Navigate to appointment day
    await barberPage.goto(`${CONFIG.BASE_URL}/barber/calendar/day/${APPOINTMENT_DATA.date}`);
    
    await barberPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/11-daily-calendar.png`, fullPage: true });

    // Step 2: Verify appointment in daily view
    const dailyAppointmentSelector = `.appointment[data-appointment-id="${appointmentId}"]`;
    await expect(barberPage.locator(dailyAppointmentSelector)).toBeVisible();
    
    // Step 3: Click appointment to view full details
    await barberPage.click(dailyAppointmentSelector);
    await barberPage.waitForSelector('.appointment-details-modal', { timeout: 5000 });
    
    // Verify all appointment details in daily view
    const modal = barberPage.locator('.appointment-details-modal');
    await expect(modal).toContainText(APPOINTMENT_DATA.customerName);
    await expect(modal).toContainText(APPOINTMENT_DATA.customerPhone);
    await expect(modal).toContainText(APPOINTMENT_DATA.service);
    await expect(modal).toContainText(APPOINTMENT_DATA.notes);
    await expect(modal).toContainText('Paid'); // Payment status

    await barberPage.screenshot({ path: `${CONFIG.SCREENSHOT_PATH}/12-appointment-details.png`, fullPage: true });

    console.log('✅ Appointment verified in daily calendar view with full details');
  });

  test('Phase 5: System Integration Verification', async () => {
    console.log('🔧 Verifying system integrations...');

    // Step 1: Verify payment in Stripe (via API check)
    const paymentCheck = await customerPage.request.get(`${CONFIG.API_URL}/api/v1/payments/${appointmentId}`);
    expect(paymentCheck.status()).toBe(200);
    
    const paymentData = await paymentCheck.json();
    expect(paymentData.status).toBe('completed');
    expect(paymentData.amount).toBe(CONFIG.TEST_AMOUNT * 100); // Stripe uses cents

    // Step 2: Verify webhook delivery
    const webhookCheck = await customerPage.request.get(`${CONFIG.API_URL}/api/v1/webhooks/status`);
    expect(webhookCheck.status()).toBe(200);

    // Step 3: Verify appointment in database
    const appointmentCheck = await customerPage.request.get(`${CONFIG.API_URL}/api/v1/appointments/${appointmentId}`);
    expect(appointmentCheck.status()).toBe(200);
    
    const appointmentData = await appointmentCheck.json();
    expect(appointmentData.service_name).toBe(APPOINTMENT_DATA.service);
    expect(appointmentData.customer_name).toBe(APPOINTMENT_DATA.customerName);
    expect(appointmentData.status).toBe('confirmed');

    console.log('✅ All system integrations verified successfully');
  });

  test('Phase 6: Cleanup Test Data', async () => {
    console.log('🧹 Cleaning up test data...');

    // Cancel the test appointment via barber interface
    await barberPage.goto(`${CONFIG.BASE_URL}/barber/appointments/${appointmentId}`);
    await barberPage.click('button:has-text("Cancel Appointment")');
    await barberPage.click('button:has-text("Confirm Cancellation")');
    
    // Verify cancellation
    await expect(barberPage.locator('text=Cancelled')).toBeVisible();
    
    console.log('✅ Test appointment cleaned up successfully');
  });
});

// Utility function for taking screenshot with timestamp
async function takeTimestampedScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `${CONFIG.SCREENSHOT_PATH}/${timestamp}-${name}.png`, 
    fullPage: true 
  });
}
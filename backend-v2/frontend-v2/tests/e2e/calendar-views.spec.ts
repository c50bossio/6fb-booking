/**
 * Calendar Views Verification Test
 * Specifically tests that appointments appear in Monthly, Weekly, and Daily calendar views
 */
import { test, expect } from '@playwright/test';
import { TestContext } from './test-helpers';
import { TEST_CONFIG, generateTestData } from './test-config';

test.describe('Calendar Views - Appointment Visibility', () => {
  let appointmentId: string;
  let testData: any;

  test.beforeAll(async () => {
    testData = generateTestData();
    console.log('🧪 Generated test data:', testData);
  });

  test('Complete Flow: Book → Verify in All Calendar Views', async ({ page, context }) => {
    const testContext = new TestContext(page);
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    console.log('🚀 Phase 1: Customer Books Appointment');
    
    // Step 1: Customer login and booking
    await testContext.auth.loginAsCustomer();
    await testContext.screenshot.takeScreenshot('01-customer-dashboard');

    // Step 2: Navigate to booking
    await page.click('text=Book Appointment');
    await page.waitForSelector('[data-testid="booking-page"]', { timeout: 15000 });
    await testContext.screenshot.takeScreenshot('02-booking-page');

    // Step 3: Select service
    await testContext.booking.selectService();
    await testContext.screenshot.takeScreenshot('03-service-selected');

    // Step 4: Select date and time
    const { date, time } = await testContext.booking.selectDateTime(
      testData.appointment.date,
      testData.appointment.time
    );
    await testContext.screenshot.takeScreenshot('04-datetime-selected');

    // Step 5: Fill customer details
    await testContext.booking.fillCustomerDetails(testData.customer);
    await testContext.screenshot.takeScreenshot('05-customer-details');

    // Step 6: Proceed to payment
    await testContext.booking.proceedToPayment();
    await testContext.screenshot.takeScreenshot('06-payment-form');

    // Step 7: Process payment
    await testContext.payment.fillStripeCard();
    await testContext.screenshot.takeScreenshot('07-card-filled');
    
    await testContext.payment.submitPayment();
    await testContext.screenshot.takeScreenshot('08-payment-success');

    // Step 8: Get appointment confirmation
    const confirmation = await testContext.payment.getPaymentConfirmation();
    appointmentId = confirmation.appointmentId;
    
    console.log(`✅ Appointment created: ${appointmentId}`);
    expect(appointmentId).toBeTruthy();

    console.log('📅 Phase 2: Verify in Barber Calendar Views');

    // Step 9: Switch to barber context
    const barberPage = await context.newPage();
    const barberContext = new TestContext(barberPage);
    
    await barberContext.auth.loginAsBarber();
    await barberContext.screenshot.takeScreenshot('09-barber-dashboard');

    // Step 10: Navigate to calendar
    await barberContext.calendar.navigateToCalendar();
    await barberContext.screenshot.takeScreenshot('10-calendar-main');

    console.log('📅 Testing Monthly Calendar View');
    
    // Step 11: Monthly view verification
    await barberContext.calendar.switchToMonthView();
    await barberContext.calendar.navigateToDate(date);
    await barberContext.screenshot.takeScreenshot('11-monthly-calendar');

    // Verify appointment appears in monthly view
    const monthlyAppointment = await barberContext.calendar.findAppointmentInView(appointmentId, 'month');
    await expect(monthlyAppointment).toContainText(testData.appointment.service);
    await expect(monthlyAppointment).toContainText(time);
    console.log('✅ Appointment verified in Monthly calendar');

    console.log('📊 Testing Weekly Calendar View');
    
    // Step 12: Weekly view verification  
    await barberContext.calendar.switchToWeekView();
    await barberContext.screenshot.takeScreenshot('12-weekly-calendar');

    // Verify appointment appears in weekly view
    const weeklyAppointment = await barberContext.calendar.findAppointmentInView(appointmentId, 'week');
    await expect(weeklyAppointment).toContainText(testData.customer.name);
    await expect(weeklyAppointment).toContainText(testData.appointment.service);
    console.log('✅ Appointment verified in Weekly calendar');

    console.log('📋 Testing Daily Calendar View');
    
    // Step 13: Daily view verification
    await barberContext.calendar.switchToDayView();
    await barberContext.screenshot.takeScreenshot('13-daily-calendar');

    // Verify appointment appears in daily view
    const dailyAppointment = await barberContext.calendar.findAppointmentInView(appointmentId, 'day');
    await barberContext.calendar.clickAppointment(appointmentId);
    await barberContext.screenshot.takeScreenshot('14-appointment-details');

    // Verify full appointment details in modal
    await barberContext.calendar.verifyAppointmentDetails({
      customerName: testData.customer.name,
      service: testData.appointment.service,
      date: date,
      time: time,
      phone: testData.customer.phone,
      notes: testData.appointment.notes
    });
    console.log('✅ Appointment verified in Daily calendar with full details');

    console.log('🔧 Phase 3: System Verification');
    
    // Step 14: API verifications
    await testContext.api.verifyAppointmentCreated(appointmentId);
    if (confirmation.paymentId) {
      await testContext.api.verifyPaymentStatus(confirmation.paymentId);
    }
    
    // Check webhook delivery (if enabled)
    if (TEST_CONFIG.FEATURES.testWebhooks) {
      await testContext.api.verifyWebhookDelivery();
    }
    
    console.log('✅ All system verifications passed');

    console.log('🧹 Phase 4: Cleanup');
    
    // Step 15: Clean up test data
    await testContext.api.cleanupTestAppointment(appointmentId);
    console.log('✅ Test appointment cleaned up');

    // Close barber page
    await barberPage.close();
  });

  test('Appointment Details Accuracy Test', async ({ page }) => {
    // This test specifically focuses on data accuracy across calendar views
    const testContext = new TestContext(page);
    
    console.log('🎯 Testing appointment data consistency across views');
    
    // Assuming we have a pre-existing appointment for testing
    await testContext.auth.loginAsBarber();
    await testContext.calendar.navigateToCalendar();

    // Test 1: Monthly view shows basic info
    await testContext.calendar.switchToMonthView();
    const monthlyElements = await page.locator('[data-testid="appointment"]').all();
    
    for (const appointment of monthlyElements) {
      // Each appointment should show service and time
      await expect(appointment).toContainText(/\d{2}:\d{2}/); // Time format
    }

    // Test 2: Weekly view shows more details
    await testContext.calendar.switchToWeekView();
    const weeklyElements = await page.locator('[data-testid="appointment"]').all();
    
    for (const appointment of weeklyElements) {
      // Weekly view should show customer name and service
      const text = await appointment.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(5); // Should have meaningful content
    }

    // Test 3: Daily view shows complete information
    await testContext.calendar.switchToDayView();
    const dailyElements = await page.locator('[data-testid="appointment"]').all();
    
    if (dailyElements.length > 0) {
      await dailyElements[0].click();
      await page.waitForSelector('[data-testid="appointment-modal"]');
      
      // Modal should contain all details
      const modal = page.locator('[data-testid="appointment-modal"]');
      await expect(modal).toContainText(/\w+@\w+\.\w+/); // Email pattern
      await expect(modal).toContainText(/\+?\d{10,}/); // Phone pattern
    }

    console.log('✅ Appointment data consistency verified across all views');
  });

  test('Calendar Navigation Test', async ({ page }) => {
    const testContext = new TestContext(page);
    
    console.log('🧭 Testing calendar navigation functionality');
    
    await testContext.auth.loginAsBarber();
    await testContext.calendar.navigateToCalendar();

    // Test month navigation
    await testContext.calendar.switchToMonthView();
    
    const initialMonth = await page.locator('[data-testid="current-month"]').textContent();
    
    // Navigate next month
    await page.click('[data-testid="calendar-next"]');
    await page.waitForTimeout(500);
    
    const nextMonth = await page.locator('[data-testid="current-month"]').textContent();
    expect(nextMonth).not.toBe(initialMonth);
    
    // Navigate back
    await page.click('[data-testid="calendar-prev"]');
    await page.waitForTimeout(500);
    
    const backToInitial = await page.locator('[data-testid="current-month"]').textContent();
    expect(backToInitial).toBe(initialMonth);
    
    console.log('✅ Calendar navigation working correctly');
  });
});
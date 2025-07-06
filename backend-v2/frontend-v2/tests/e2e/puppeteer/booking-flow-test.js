/**
 * Booking Flow Test Suite
 * 
 * Tests appointment booking functionality including service selection,
 * time slot selection, and payment processing
 */

const puppeteer = require('puppeteer');
const {
    CONFIG,
    TEST_USERS,
    SELECTORS,
    waitForSelector,
    clickElement,
    fillField,
    takeScreenshot,
    checkForConsoleErrors,
    setupNetworkMonitoring,
    login,
    waitForPageLoad,
    generateReport,
    TestResult
} = require('./test-utils');

class BookingFlowTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
    }

    async init() {
        console.log('🚀 Starting Booking Flow Tests...\n');
        
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            defaultViewport: { width: 1280, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Set up monitoring
        this.consoleErrors = await checkForConsoleErrors(this.page);
        this.networkMonitoring = setupNetworkMonitoring(this.page);
    }

    async testCompleteBookingFlow() {
        const result = new TestResult('Complete Booking Flow Test');
        
        try {
            console.log('📍 Test: Complete Booking Flow');
            
            // Login as client
            await login(this.page, 'client');
            result.addStep('Login successful', true);
            
            // Navigate to booking page
            await this.page.goto(`${CONFIG.baseUrl}/book`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to booking page', true);
            
            // Take screenshot of booking page
            const bookingPageScreenshot = await takeScreenshot(this.page, 'booking-page');
            result.addScreenshot(bookingPageScreenshot);
            
            // Step 1: Select service
            console.log('   Step 1: Select service');
            await this.page.waitForTimeout(1000);
            
            // Wait for services to load
            await waitForSelector(this.page, '.service-card, .service-option, .service-item');
            
            // Get available services
            const services = await this.page.$$eval('.service-card, .service-option, .service-item', els => 
                els.map(el => ({
                    name: el.querySelector('.service-name, h3, h4')?.textContent || '',
                    price: el.querySelector('.service-price, .price')?.textContent || '',
                    duration: el.querySelector('.service-duration, .duration')?.textContent || ''
                }))
            );
            
            result.addStep('Services loaded', services.length > 0, { count: services.length });
            
            // Click first service
            await clickElement(this.page, '.service-card:first-child, .service-option:first-child, .service-item:first-child');
            await this.page.waitForTimeout(500);
            result.addStep('Service selected', true, { service: services[0]?.name });
            
            // Step 2: Select barber (if applicable)
            const barberSelector = await this.page.$('.barber-card, .barber-option, .staff-member');
            if (barberSelector) {
                console.log('   Step 2: Select barber');
                await clickElement(this.page, '.barber-card:first-child, .barber-option:first-child, .staff-member:first-child');
                await this.page.waitForTimeout(500);
                result.addStep('Barber selected', true);
            }
            
            // Step 3: Select date and time
            console.log('   Step 3: Select date and time');
            
            // Check if there's a date picker
            const datePicker = await this.page.$('.date-picker, .calendar, input[type="date"]');
            if (datePicker) {
                // Select tomorrow's date
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dateString = tomorrow.toISOString().split('T')[0];
                
                if (await this.page.$('input[type="date"]')) {
                    await fillField(this.page, 'input[type="date"]', dateString);
                } else {
                    // Click on calendar day
                    const daySelector = `.calendar-day[data-date="${dateString}"], .day-${tomorrow.getDate()}`;
                    const dayElement = await this.page.$(daySelector);
                    if (dayElement) {
                        await dayElement.click();
                    }
                }
                result.addStep('Date selected', true, { date: dateString });
            }
            
            // Wait for time slots to load
            await this.page.waitForTimeout(1000);
            await waitForSelector(this.page, '.time-slot, .available-time, .time-option');
            
            // Get available time slots
            const timeSlots = await this.page.$$eval('.time-slot, .available-time, .time-option', els => 
                els.filter(el => !el.classList.contains('disabled') && !el.classList.contains('unavailable'))
                   .map(el => el.textContent.trim())
            );
            
            result.addStep('Time slots loaded', timeSlots.length > 0, { available: timeSlots.length });
            
            // Click first available time slot
            await clickElement(this.page, '.time-slot:not(.disabled):first-child, .available-time:first-child, .time-option:not(.unavailable):first-child');
            await this.page.waitForTimeout(500);
            result.addStep('Time slot selected', true, { time: timeSlots[0] });
            
            // Take screenshot after selection
            const selectionScreenshot = await takeScreenshot(this.page, 'booking-selections');
            result.addScreenshot(selectionScreenshot);
            
            // Step 4: Add notes (optional)
            const notesField = await this.page.$('textarea[name="notes"], .booking-notes, #notes');
            if (notesField) {
                console.log('   Step 4: Add booking notes');
                await fillField(this.page, 'textarea[name="notes"], .booking-notes, #notes', 'Test booking from automated test');
                result.addStep('Notes added', true);
            }
            
            // Step 5: Review and confirm
            console.log('   Step 5: Review and confirm booking');
            
            // Click continue/next if multi-step
            const continueButton = await this.page.$('button:has-text("Continue"), button:has-text("Next")');
            if (continueButton) {
                await continueButton.click();
                await this.page.waitForTimeout(1000);
            }
            
            // Check booking summary
            const summary = await this.page.evaluate(() => {
                const summaryEl = document.querySelector('.booking-summary, .appointment-details, .review-section');
                if (summaryEl) {
                    return {
                        service: summaryEl.querySelector('.service-name')?.textContent,
                        date: summaryEl.querySelector('.appointment-date')?.textContent,
                        time: summaryEl.querySelector('.appointment-time')?.textContent,
                        price: summaryEl.querySelector('.total-price, .price')?.textContent
                    };
                }
                return null;
            });
            
            if (summary) {
                result.addStep('Booking summary displayed', true, summary);
            }
            
            // Take screenshot of summary
            const summaryScreenshot = await takeScreenshot(this.page, 'booking-summary');
            result.addScreenshot(summaryScreenshot);
            
            // Confirm booking
            await clickElement(this.page, 'button:has-text("Confirm"), button:has-text("Book"), button:has-text("Complete"), .confirm-booking');
            
            // Wait for result
            await this.page.waitForTimeout(3000);
            
            // Check for success
            const successElement = await this.page.$(SELECTORS.successMessage);
            const currentUrl = this.page.url();
            
            if (successElement || currentUrl.includes('/bookings') || currentUrl.includes('/confirmation')) {
                result.addStep('Booking confirmed', true);
                
                // Get confirmation details
                const confirmation = await this.page.evaluate(() => {
                    const confirmationEl = document.querySelector('.confirmation, .booking-success');
                    if (confirmationEl) {
                        return {
                            message: confirmationEl.querySelector('h1, h2')?.textContent,
                            bookingId: confirmationEl.querySelector('.booking-id, .confirmation-number')?.textContent
                        };
                    }
                    return null;
                });
                
                if (confirmation) {
                    result.addStep('Confirmation displayed', true, confirmation);
                }
                
                // Take success screenshot
                const successScreenshot = await takeScreenshot(this.page, 'booking-success');
                result.addScreenshot(successScreenshot);
                
                result.finish(true);
                console.log('✅ Complete booking flow test passed');
            } else {
                // Check for errors
                const errorElement = await this.page.$(SELECTORS.errorMessage);
                if (errorElement) {
                    const errorText = await errorElement.evaluate(el => el.textContent);
                    throw new Error(`Booking failed: ${errorText}`);
                } else {
                    throw new Error('Booking confirmation not received');
                }
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Complete booking flow test failed:', error.message);
            
            // Take error screenshot
            const errorScreenshot = await takeScreenshot(this.page, 'booking-error');
            result.addScreenshot(errorScreenshot);
        }
        
        this.results.push(result);
        return result;
    }

    async testBookingWithPayment() {
        const result = new TestResult('Booking with Payment Test');
        
        try {
            console.log('\n📍 Test: Booking with Payment');
            
            // Login as client
            await login(this.page, 'client');
            result.addStep('Login successful', true);
            
            // Navigate to booking
            await this.page.goto(`${CONFIG.baseUrl}/book`, { waitUntil: 'networkidle2' });
            
            // Quick select service and time
            await this.page.waitForTimeout(1000);
            await clickElement(this.page, '.service-card:first-child, .service-option:first-child');
            await this.page.waitForTimeout(500);
            await clickElement(this.page, '.time-slot:not(.disabled):first-child, .available-time:first-child');
            await this.page.waitForTimeout(500);
            
            result.addStep('Service and time selected', true);
            
            // Continue to payment
            await clickElement(this.page, 'button:has-text("Continue"), button:has-text("Next")');
            await this.page.waitForTimeout(1000);
            
            // Check if payment is required
            const paymentSection = await this.page.$('.payment-section, .stripe-payment, #payment');
            if (paymentSection) {
                console.log('   Payment required for booking');
                result.addStep('Payment section found', true);
                
                // Wait for Stripe
                await this.page.waitForTimeout(3000);
                
                // Check for Stripe Elements
                const stripeFrame = await this.page.$('iframe[title*="Secure card"]');
                if (stripeFrame) {
                    console.log('   Filling payment details');
                    
                    // Fill card number
                    const cardFrame = await this.page.waitForSelector('iframe[title*="Secure card number"]', { timeout: 5000 });
                    const cardFrameContent = await cardFrame.contentFrame();
                    await cardFrameContent.type('input[name="cardnumber"]', '4242424242424242');
                    
                    // Fill expiry
                    const expiryFrame = await this.page.waitForSelector('iframe[title*="Secure expiration date"]', { timeout: 5000 });
                    const expiryFrameContent = await expiryFrame.contentFrame();
                    await expiryFrameContent.type('input[name="exp-date"]', '12/34');
                    
                    // Fill CVC
                    const cvcFrame = await this.page.waitForSelector('iframe[title*="Secure CVC"]', { timeout: 5000 });
                    const cvcFrameContent = await cvcFrame.contentFrame();
                    await cvcFrameContent.type('input[name="cvc"]', '123');
                    
                    result.addStep('Payment details filled', true);
                }
                
                // Take payment screenshot
                const paymentScreenshot = await takeScreenshot(this.page, 'booking-payment');
                result.addScreenshot(paymentScreenshot);
            } else {
                console.log('   No payment required');
                result.addStep('No payment required', true);
            }
            
            // Complete booking
            await clickElement(this.page, 'button:has-text("Confirm"), button:has-text("Pay"), button:has-text("Complete")');
            await this.page.waitForTimeout(5000);
            
            // Check success
            const successElement = await this.page.$(SELECTORS.successMessage);
            const currentUrl = this.page.url();
            
            if (successElement || currentUrl.includes('/confirmation')) {
                result.addStep('Booking with payment completed', true);
                result.finish(true);
                console.log('✅ Booking with payment test passed');
            } else {
                throw new Error('Payment booking failed');
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Booking with payment test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testBookingCancellation() {
        const result = new TestResult('Booking Cancellation Test');
        
        try {
            console.log('\n📍 Test: Booking Cancellation');
            
            // Login as client
            await login(this.page, 'client');
            result.addStep('Login successful', true);
            
            // Navigate to bookings
            await this.page.goto(`${CONFIG.baseUrl}/bookings`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to bookings', true);
            
            // Check if there are existing bookings
            const bookingCards = await this.page.$$('.booking-card, .appointment-card, .booking-item');
            
            if (bookingCards.length > 0) {
                console.log(`   Found ${bookingCards.length} existing bookings`);
                result.addStep('Existing bookings found', true, { count: bookingCards.length });
                
                // Find a cancellable booking
                let cancelButton = null;
                for (let i = 0; i < bookingCards.length; i++) {
                    const card = bookingCards[i];
                    cancelButton = await card.$('button:has-text("Cancel"), .cancel-booking');
                    if (cancelButton) {
                        const isDisabled = await cancelButton.evaluate(el => el.disabled);
                        if (!isDisabled) {
                            break;
                        }
                    }
                    cancelButton = null;
                }
                
                if (cancelButton) {
                    console.log('   Found cancellable booking');
                    
                    // Take screenshot before cancellation
                    const beforeScreenshot = await takeScreenshot(this.page, 'before-cancellation');
                    result.addScreenshot(beforeScreenshot);
                    
                    // Click cancel
                    await cancelButton.click();
                    await this.page.waitForTimeout(500);
                    
                    // Check for confirmation modal
                    const confirmModal = await this.page.$('[role="dialog"], .modal, .confirmation-dialog');
                    if (confirmModal) {
                        result.addStep('Cancellation confirmation shown', true);
                        
                        // Confirm cancellation
                        await clickElement(this.page, 'button:has-text("Confirm"), button:has-text("Yes"), .confirm-cancel');
                        await this.page.waitForTimeout(2000);
                        
                        // Check for success message
                        const successElement = await this.page.$(SELECTORS.successMessage);
                        if (successElement) {
                            const successText = await successElement.evaluate(el => el.textContent);
                            result.addStep('Booking cancelled', true, { message: successText });
                        }
                        
                        // Take screenshot after cancellation
                        const afterScreenshot = await takeScreenshot(this.page, 'after-cancellation');
                        result.addScreenshot(afterScreenshot);
                        
                        result.finish(true);
                        console.log('✅ Booking cancellation test passed');
                    } else {
                        throw new Error('No confirmation modal shown');
                    }
                } else {
                    console.log('   No cancellable bookings found');
                    result.addStep('No cancellable bookings', true);
                    result.finish(true);
                }
            } else {
                console.log('   No existing bookings to cancel');
                result.addStep('No bookings found', true);
                result.finish(true);
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Booking cancellation test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testBookingReschedule() {
        const result = new TestResult('Booking Reschedule Test');
        
        try {
            console.log('\n📍 Test: Booking Reschedule');
            
            // Login as client
            await login(this.page, 'client');
            result.addStep('Login successful', true);
            
            // Navigate to bookings
            await this.page.goto(`${CONFIG.baseUrl}/bookings`, { waitUntil: 'networkidle2' });
            
            // Find reschedulable booking
            const rescheduleButton = await this.page.$('button:has-text("Reschedule"), .reschedule-booking');
            
            if (rescheduleButton) {
                console.log('   Found reschedulable booking');
                result.addStep('Reschedulable booking found', true);
                
                // Click reschedule
                await rescheduleButton.click();
                await this.page.waitForTimeout(1000);
                
                // Select new time
                await waitForSelector(this.page, '.time-slot, .available-time');
                const newTimeSlot = await this.page.$('.time-slot:not(.disabled):nth-child(2), .available-time:nth-child(2)');
                
                if (newTimeSlot) {
                    await newTimeSlot.click();
                    result.addStep('New time selected', true);
                    
                    // Confirm reschedule
                    await clickElement(this.page, 'button:has-text("Confirm"), button:has-text("Reschedule")');
                    await this.page.waitForTimeout(2000);
                    
                    // Check for success
                    const successElement = await this.page.$(SELECTORS.successMessage);
                    if (successElement) {
                        result.addStep('Booking rescheduled', true);
                        
                        // Take screenshot
                        const rescheduleScreenshot = await takeScreenshot(this.page, 'booking-rescheduled');
                        result.addScreenshot(rescheduleScreenshot);
                        
                        result.finish(true);
                        console.log('✅ Booking reschedule test passed');
                    } else {
                        throw new Error('Reschedule confirmation not received');
                    }
                } else {
                    throw new Error('No alternative time slots available');
                }
            } else {
                console.log('   No reschedulable bookings found');
                result.addStep('No reschedulable bookings', true);
                result.finish(true);
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Booking reschedule test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testBookingValidation() {
        const result = new TestResult('Booking Validation Test');
        
        try {
            console.log('\n📍 Test: Booking Validation');
            
            // Login as client
            await login(this.page, 'client');
            result.addStep('Login successful', true);
            
            // Navigate to booking
            await this.page.goto(`${CONFIG.baseUrl}/book`, { waitUntil: 'networkidle2' });
            
            // Try to submit without selections
            console.log('   Testing empty submission');
            const submitButton = await this.page.$('button:has-text("Book"), button:has-text("Continue"), button[type="submit"]');
            if (submitButton) {
                await submitButton.click();
                await this.page.waitForTimeout(1000);
                
                // Check for validation errors
                const validationError = await this.page.$(SELECTORS.errorMessage);
                if (validationError) {
                    const errorText = await validationError.evaluate(el => el.textContent);
                    result.addStep('Validation error shown', true, { error: errorText });
                } else {
                    // Check if still on same page
                    const currentUrl = this.page.url();
                    if (currentUrl.includes('/book')) {
                        result.addStep('Submission blocked', true);
                    }
                }
            }
            
            // Test past date selection (if date picker available)
            const datePicker = await this.page.$('input[type="date"]');
            if (datePicker) {
                console.log('   Testing past date selection');
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const pastDate = yesterday.toISOString().split('T')[0];
                
                await fillField(this.page, 'input[type="date"]', pastDate);
                await this.page.keyboard.press('Tab');
                await this.page.waitForTimeout(500);
                
                // Check for date validation
                const dateError = await this.page.$(SELECTORS.errorMessage);
                result.addStep('Past date validation', !!dateError);
            }
            
            // Take screenshot of validation
            const validationScreenshot = await takeScreenshot(this.page, 'booking-validation');
            result.addScreenshot(validationScreenshot);
            
            result.finish(true);
            console.log('✅ Booking validation test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Booking validation test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async runAllTests() {
        try {
            await this.init();
            
            // Run all booking tests
            await this.testCompleteBookingFlow();
            await this.testBookingWithPayment();
            await this.testBookingCancellation();
            await this.testBookingReschedule();
            await this.testBookingValidation();
            
            // Generate report
            const report = generateReport('booking-flow', this.results);
            
            // Check console errors
            if (this.consoleErrors.length > 0) {
                console.log('\n⚠️  Console errors detected:');
                this.consoleErrors.forEach(error => {
                    console.log(`   - ${error.text}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new BookingFlowTester();
    tester.runAllTests().catch(console.error);
}

module.exports = BookingFlowTester;
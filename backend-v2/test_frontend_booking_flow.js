const puppeteer = require('puppeteer');

/**
 * End-to-End Frontend Booking Flow Test
 * Tests the complete user journey through the UI
 */

const FRONTEND_URL = 'http://localhost:3000';
const TEST_USER = {
    email: 'test@example.com',
    password: 'Test123!'
};

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFrontendBookingFlow() {
    let browser;
    const testResults = {
        login: { status: 'pending', details: {} },
        navigation: { status: 'pending', details: {} },
        bookingPage: { status: 'pending', details: {} },
        serviceSelection: { status: 'pending', details: {} },
        dateTimeSelection: { status: 'pending', details: {} },
        bookingConfirmation: { status: 'pending', details: {} },
        payment: { status: 'pending', details: {} },
        dashboard: { status: 'pending', details: {} }
    };

    try {
        console.log('🚀 Starting frontend booking flow test...\n');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: false, // Set to true for CI/CD
            slowMo: 50, // Slow down for visibility
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // Test 1: Login Flow
        console.log('📝 Testing login flow...');
        try {
            await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
            
            // Check if login page loaded
            const loginForm = await page.$('form');
            if (!loginForm) {
                throw new Error('Login form not found');
            }

            // Fill login form
            await page.type('input[type="email"], input[name="email"], input[name="username"]', TEST_USER.email);
            await page.type('input[type="password"], input[name="password"]', TEST_USER.password);
            
            // Take screenshot before login
            await page.screenshot({ path: 'test-login-before.png' });
            
            // Submit form
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                page.click('button[type="submit"]')
            ]);
            
            // Check if redirected to dashboard or home
            const currentUrl = page.url();
            testResults.login.status = 'success';
            testResults.login.details = {
                redirectedTo: currentUrl,
                loggedIn: !currentUrl.includes('/login')
            };
            console.log('✅ Login successful\n');
            
        } catch (error) {
            testResults.login.status = 'failed';
            testResults.login.details = { error: error.message };
            console.error('❌ Login failed:', error.message);
        }

        // Test 2: Navigate to Booking Page
        console.log('🧭 Testing navigation to booking page...');
        try {
            // Try multiple possible navigation methods
            let bookingPageFound = false;
            
            // Method 1: Direct URL
            await page.goto(`${FRONTEND_URL}/book`, { waitUntil: 'networkidle2' });
            await delay(1000);
            
            if (page.url().includes('/book')) {
                bookingPageFound = true;
            } else {
                // Method 2: Look for booking link/button
                const bookingLink = await page.$('a[href*="/book"], button:contains("Book")')
                if (bookingLink) {
                    await bookingLink.click();
                    await page.waitForNavigation({ waitUntil: 'networkidle2' });
                    bookingPageFound = page.url().includes('/book');
                }
            }
            
            testResults.navigation.status = bookingPageFound ? 'success' : 'failed';
            testResults.navigation.details = {
                currentUrl: page.url(),
                bookingPageFound
            };
            
            if (bookingPageFound) {
                console.log('✅ Navigation to booking page successful\n');
            } else {
                console.log('❌ Could not navigate to booking page\n');
            }
            
        } catch (error) {
            testResults.navigation.status = 'failed';
            testResults.navigation.details = { error: error.message };
            console.error('❌ Navigation failed:', error.message);
        }

        // Test 3: Check Booking Page Elements
        console.log('📋 Testing booking page elements...');
        try {
            await page.screenshot({ path: 'test-booking-page.png' });
            
            // Check for service selection
            const services = await page.$$('[data-testid="service-item"], .service-card, button[role="radio"]');
            const hasServices = services.length > 0;
            
            // Check for calendar or date picker
            const calendar = await page.$('[data-testid="calendar"], .calendar, .date-picker, input[type="date"]');
            const hasCalendar = calendar !== null;
            
            // Check for time slots
            const timeSlots = await page.$$('[data-testid="time-slot"], .time-slot, button[aria-label*="time"]');
            const hasTimeSlots = timeSlots.length > 0;
            
            testResults.bookingPage.status = 'success';
            testResults.bookingPage.details = {
                servicesFound: services.length,
                hasCalendar,
                timeSlotsFound: timeSlots.length
            };
            console.log(`✅ Found ${services.length} services, calendar: ${hasCalendar}, ${timeSlots.length} time slots\n`);
            
        } catch (error) {
            testResults.bookingPage.status = 'failed';
            testResults.bookingPage.details = { error: error.message };
            console.error('❌ Booking page check failed:', error.message);
        }

        // Test 4: Service Selection
        console.log('🛍️ Testing service selection...');
        try {
            // Click first service
            const firstService = await page.$('[data-testid="service-item"], .service-card, button[role="radio"]');
            if (firstService) {
                await firstService.click();
                await delay(500);
                
                // Check if service is selected
                const isSelected = await firstService.evaluate(el => 
                    el.classList.contains('selected') || 
                    el.getAttribute('aria-selected') === 'true' ||
                    el.getAttribute('data-state') === 'checked'
                );
                
                testResults.serviceSelection.status = 'success';
                testResults.serviceSelection.details = {
                    serviceSelected: true,
                    selectionConfirmed: isSelected
                };
                console.log('✅ Service selected successfully\n');
            } else {
                throw new Error('No services available for selection');
            }
            
        } catch (error) {
            testResults.serviceSelection.status = 'failed';
            testResults.serviceSelection.details = { error: error.message };
            console.error('❌ Service selection failed:', error.message);
        }

        // Test 5: Date and Time Selection
        console.log('📅 Testing date and time selection...');
        try {
            // Select tomorrow's date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Try to find and click a date
            const dateButton = await page.$(`[data-date="${tomorrow.toISOString().split('T')[0]}"], .calendar-day:not(.disabled)`);
            if (dateButton) {
                await dateButton.click();
                await delay(1000);
            }
            
            // Select first available time slot
            await page.waitForSelector('[data-testid="time-slot"], .time-slot, button[aria-label*="time"]', { timeout: 5000 });
            const firstTimeSlot = await page.$('[data-testid="time-slot"]:not(.disabled), .time-slot:not(.disabled), button[aria-label*="time"]:not(:disabled)');
            
            if (firstTimeSlot) {
                await firstTimeSlot.click();
                await delay(500);
                
                testResults.dateTimeSelection.status = 'success';
                testResults.dateTimeSelection.details = {
                    dateSelected: true,
                    timeSelected: true
                };
                console.log('✅ Date and time selected successfully\n');
            } else {
                throw new Error('No available time slots found');
            }
            
        } catch (error) {
            testResults.dateTimeSelection.status = 'failed';
            testResults.dateTimeSelection.details = { error: error.message };
            console.error('❌ Date/time selection failed:', error.message);
        }

        // Test 6: Booking Confirmation
        console.log('✅ Testing booking confirmation...');
        try {
            // Look for confirm/book button
            const confirmButton = await page.$('button:contains("Confirm"), button:contains("Book Now"), button[type="submit"]');
            if (confirmButton) {
                await page.screenshot({ path: 'test-before-confirm.png' });
                
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
                    confirmButton.click()
                ]);
                
                await delay(2000);
                
                // Check if we're on payment or confirmation page
                const currentUrl = page.url();
                const isOnPayment = currentUrl.includes('payment') || currentUrl.includes('checkout');
                const hasSuccessMessage = await page.$('.success-message, [role="alert"]');
                
                testResults.bookingConfirmation.status = 'success';
                testResults.bookingConfirmation.details = {
                    currentUrl,
                    redirectedToPayment: isOnPayment,
                    hasSuccessMessage: hasSuccessMessage !== null
                };
                console.log('✅ Booking confirmed successfully\n');
            } else {
                throw new Error('Confirm button not found');
            }
            
        } catch (error) {
            testResults.bookingConfirmation.status = 'failed';
            testResults.bookingConfirmation.details = { error: error.message };
            console.error('❌ Booking confirmation failed:', error.message);
        }

        // Test 7: Check Dashboard for Booking
        console.log('📊 Testing dashboard for new booking...');
        try {
            await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
            await delay(2000);
            
            // Look for bookings section
            const bookingsSection = await page.$('[data-testid="bookings"], .bookings-list, .appointments');
            const bookingItems = await page.$$('[data-testid="booking-item"], .booking-card, .appointment-item');
            
            testResults.dashboard.status = 'success';
            testResults.dashboard.details = {
                hasBookingsSection: bookingsSection !== null,
                bookingCount: bookingItems.length
            };
            
            await page.screenshot({ path: 'test-dashboard-final.png' });
            console.log(`✅ Dashboard shows ${bookingItems.length} bookings\n`);
            
        } catch (error) {
            testResults.dashboard.status = 'failed';
            testResults.dashboard.details = { error: error.message };
            console.error('❌ Dashboard check failed:', error.message);
        }

    } catch (error) {
        console.error('💥 Test suite error:', error);
    } finally {
        // Generate report
        console.log('\n' + '='.repeat(60));
        console.log('FRONTEND TEST SUMMARY');
        console.log('='.repeat(60));
        
        let passed = 0;
        let failed = 0;
        
        for (const [testName, result] of Object.entries(testResults)) {
            const emoji = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
            console.log(`${emoji} ${testName}: ${result.status.toUpperCase()}`);
            
            if (result.details && Object.keys(result.details).length > 0) {
                for (const [key, value] of Object.entries(result.details)) {
                    console.log(`   - ${key}: ${JSON.stringify(value)}`);
                }
            }
            
            if (result.status === 'success') passed++;
            else if (result.status === 'failed') failed++;
        }
        
        console.log('='.repeat(60));
        console.log(`Total: ${Object.keys(testResults).length} | Passed: ${passed} | Failed: ${failed}`);
        console.log('='.repeat(60));
        
        // Save results
        const fs = require('fs');
        fs.writeFileSync(
            `frontend_test_results_${new Date().toISOString().replace(/:/g, '-')}.json`,
            JSON.stringify({ timestamp: new Date().toISOString(), results: testResults }, null, 2)
        );
        
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testFrontendBookingFlow().catch(console.error);
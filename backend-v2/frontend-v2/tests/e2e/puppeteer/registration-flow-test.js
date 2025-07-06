/**
 * Registration Flow Test Suite
 * 
 * Tests complete registration journey including form validation, 
 * Stripe payment integration, and organization creation
 */

const puppeteer = require('puppeteer');
const {
    CONFIG,
    SELECTORS,
    generateTestUser,
    waitForSelector,
    clickElement,
    fillField,
    takeScreenshot,
    checkForConsoleErrors,
    setupNetworkMonitoring,
    waitForPageLoad,
    generateReport,
    TestResult
} = require('./test-utils');

// Stripe test cards
const STRIPE_TEST_CARDS = {
    success: '4242424242424242',
    declined: '4000000000000002',
    insufficientFunds: '4000000000009995',
    authRequired: '4000000000000119'
};

class RegistrationFlowTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
    }

    async init() {
        console.log('🚀 Starting Registration Flow Tests...\n');
        
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

    async testCompleteRegistration() {
        const result = new TestResult('Complete Registration Test');
        const testUser = generateTestUser();
        
        try {
            console.log('📍 Test: Complete Registration Journey');
            console.log(`   Using email: ${testUser.email}`);
            
            // Navigate to registration page
            await this.page.goto(`${CONFIG.baseUrl}/register`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to registration page', true);
            
            // Take screenshot of registration page
            const regScreenshot = await takeScreenshot(this.page, 'registration-page');
            result.addScreenshot(regScreenshot);
            
            // Step 1: Business Type Selection (if present)
            const businessTypeSelector = await this.page.$('.business-type-option, [data-business-type]');
            if (businessTypeSelector) {
                await businessTypeSelector.click();
                result.addStep('Select business type', true);
                await this.page.waitForTimeout(500);
            }
            
            // Step 2: Basic Information
            console.log('   Step 2: Fill basic information');
            
            // Fill user details
            await fillField(this.page, 'input[name="name"], input[placeholder*="name" i]', testUser.name);
            await fillField(this.page, 'input[name="email"], input[type="email"]', testUser.email);
            await fillField(this.page, 'input[name="phone"], input[type="tel"]', testUser.phone);
            await fillField(this.page, 'input[name="password"], input[type="password"]:first-of-type', testUser.password);
            
            // Confirm password if field exists
            const confirmPasswordField = await this.page.$('input[name="confirmPassword"], input[type="password"]:nth-of-type(2)');
            if (confirmPasswordField) {
                await fillField(this.page, 'input[name="confirmPassword"], input[type="password"]:nth-of-type(2)', testUser.password);
            }
            
            result.addStep('Fill basic information', true);
            
            // Take screenshot after filling
            const filledScreenshot = await takeScreenshot(this.page, 'registration-filled');
            result.addScreenshot(filledScreenshot);
            
            // Continue to next step
            await clickElement(this.page, 'button:has-text("Continue"), button:has-text("Next"), button[type="submit"]');
            await this.page.waitForTimeout(1000);
            
            // Step 3: Business Information (if multi-step)
            const businessNameField = await this.page.$('input[name="businessName"], input[placeholder*="business" i]');
            if (businessNameField) {
                console.log('   Step 3: Fill business information');
                await fillField(this.page, 'input[name="businessName"], input[placeholder*="business" i]', testUser.businessName);
                
                // Fill address if present
                const addressField = await this.page.$('input[name="address"], input[placeholder*="address" i]');
                if (addressField) {
                    await fillField(this.page, 'input[name="address"], input[placeholder*="address" i]', '123 Test Street');
                    await fillField(this.page, 'input[name="city"], input[placeholder*="city" i]', 'New York');
                    await fillField(this.page, 'input[name="state"], select[name="state"]', 'NY');
                    await fillField(this.page, 'input[name="zipCode"], input[name="zip"], input[placeholder*="zip" i]', '10001');
                }
                
                result.addStep('Fill business information', true);
                
                // Continue to payment
                await clickElement(this.page, 'button:has-text("Continue"), button:has-text("Next"), button[type="submit"]');
                await this.page.waitForTimeout(1000);
            }
            
            // Step 4: Payment Setup
            console.log('   Step 4: Payment setup');
            
            // Wait for Stripe iframe to load
            await this.page.waitForTimeout(3000); // Give Stripe time to load
            
            // Check if Stripe Elements is present
            const stripeFrame = await this.page.$('iframe[name*="__privateStripeFrame"]');
            if (stripeFrame) {
                console.log('   Stripe Elements detected');
                
                // Fill card number
                const cardFrame = await this.page.waitForSelector('iframe[title*="Secure card number"]', { timeout: 10000 });
                const cardFrameContent = await cardFrame.contentFrame();
                await cardFrameContent.type('input[name="cardnumber"]', STRIPE_TEST_CARDS.success);
                
                // Fill expiry
                const expiryFrame = await this.page.waitForSelector('iframe[title*="Secure expiration date"]', { timeout: 5000 });
                const expiryFrameContent = await expiryFrame.contentFrame();
                await expiryFrameContent.type('input[name="exp-date"]', '12/34');
                
                // Fill CVC
                const cvcFrame = await this.page.waitForSelector('iframe[title*="Secure CVC"]', { timeout: 5000 });
                const cvcFrameContent = await cvcFrame.contentFrame();
                await cvcFrameContent.type('input[name="cvc"]', '123');
                
                // Fill ZIP if required
                const zipFrame = await this.page.$('iframe[title*="Secure postal code"]');
                if (zipFrame) {
                    const zipFrameContent = await zipFrame.contentFrame();
                    await zipFrameContent.type('input[name="postal"]', '42424');
                }
                
                result.addStep('Fill payment information', true);
                
                // Take screenshot of payment form
                const paymentScreenshot = await takeScreenshot(this.page, 'registration-payment');
                result.addScreenshot(paymentScreenshot);
            } else {
                console.log('   No Stripe Elements found - may be using different payment flow');
                result.addStep('Payment step skipped', true);
            }
            
            // Submit registration
            console.log('   Submitting registration...');
            await clickElement(this.page, 'button:has-text("Complete"), button:has-text("Submit"), button:has-text("Start"), button[type="submit"]');
            
            // Wait for response
            await this.page.waitForTimeout(5000);
            
            // Check result
            const currentUrl = this.page.url();
            const registrationSuccess = currentUrl.includes('/dashboard') || 
                                       currentUrl.includes('/onboarding') || 
                                       currentUrl.includes('/welcome');
            
            if (registrationSuccess) {
                result.addStep('Registration completed', true, { redirectUrl: currentUrl });
                
                // Take success screenshot
                const successScreenshot = await takeScreenshot(this.page, 'registration-success');
                result.addScreenshot(successScreenshot);
                
                // Check for welcome message
                const welcomeMessage = await this.page.$('.welcome-message, h1:has-text("Welcome"), .onboarding-header');
                if (welcomeMessage) {
                    const welcomeText = await welcomeMessage.evaluate(el => el.textContent);
                    result.addStep('Welcome message displayed', true, { message: welcomeText });
                }
                
                result.finish(true);
                console.log('✅ Complete registration test passed');
            } else {
                // Check for error messages
                const errorElement = await this.page.$(SELECTORS.errorMessage);
                if (errorElement) {
                    const errorText = await errorElement.evaluate(el => el.textContent);
                    throw new Error(`Registration failed: ${errorText}`);
                } else {
                    throw new Error(`Registration failed - unexpected redirect to: ${currentUrl}`);
                }
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Complete registration test failed:', error.message);
            
            // Take error screenshot
            const errorScreenshot = await takeScreenshot(this.page, 'registration-error');
            result.addScreenshot(errorScreenshot);
        }
        
        this.results.push(result);
        return result;
    }

    async testFormValidation() {
        const result = new TestResult('Form Validation Test');
        
        try {
            console.log('\n📍 Test: Form Validation');
            
            // Navigate to registration page
            await this.page.goto(`${CONFIG.baseUrl}/register`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to registration page', true);
            
            // Test 1: Empty form submission
            console.log('   Testing empty form submission');
            await clickElement(this.page, 'button[type="submit"], button:has-text("Continue")');
            await this.page.waitForTimeout(1000);
            
            const emptyFormErrors = await this.page.$$eval(SELECTORS.errorMessage, els => 
                els.map(el => el.textContent.trim())
            );
            result.addStep('Empty form shows errors', emptyFormErrors.length > 0, { errors: emptyFormErrors });
            
            // Test 2: Invalid email
            console.log('   Testing invalid email');
            await fillField(this.page, 'input[type="email"]', 'invalidemail');
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(500);
            
            const emailError = await this.page.$(SELECTORS.errorMessage);
            result.addStep('Invalid email shows error', !!emailError);
            
            // Test 3: Weak password
            console.log('   Testing weak password');
            await fillField(this.page, 'input[type="email"]', 'test@example.com');
            await fillField(this.page, 'input[type="password"]:first-of-type', '123');
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(500);
            
            const passwordError = await this.page.$('.password-error, .text-red-600');
            result.addStep('Weak password shows error', !!passwordError);
            
            // Test 4: Password mismatch
            const confirmPasswordField = await this.page.$('input[name="confirmPassword"], input[type="password"]:nth-of-type(2)');
            if (confirmPasswordField) {
                console.log('   Testing password mismatch');
                await fillField(this.page, 'input[type="password"]:first-of-type', 'StrongPassword123!');
                await fillField(this.page, 'input[name="confirmPassword"], input[type="password"]:nth-of-type(2)', 'DifferentPassword123!');
                await this.page.keyboard.press('Tab');
                await this.page.waitForTimeout(500);
                
                const mismatchError = await this.page.$('.password-mismatch, .text-red-600');
                result.addStep('Password mismatch shows error', !!mismatchError);
            }
            
            // Take screenshot of validation errors
            const validationScreenshot = await takeScreenshot(this.page, 'form-validation-errors');
            result.addScreenshot(validationScreenshot);
            
            result.finish(true);
            console.log('✅ Form validation test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Form validation test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testPaymentFailure() {
        const result = new TestResult('Payment Failure Test');
        const testUser = generateTestUser();
        
        try {
            console.log('\n📍 Test: Payment Failure Handling');
            
            // Navigate to registration and fill basic info
            await this.page.goto(`${CONFIG.baseUrl}/register`, { waitUntil: 'networkidle2' });
            
            // Quick fill basic info
            await fillField(this.page, 'input[name="name"], input[placeholder*="name" i]', testUser.name);
            await fillField(this.page, 'input[name="email"], input[type="email"]', testUser.email);
            await fillField(this.page, 'input[name="phone"], input[type="tel"]', testUser.phone);
            await fillField(this.page, 'input[name="password"], input[type="password"]:first-of-type', testUser.password);
            
            const confirmPasswordField = await this.page.$('input[name="confirmPassword"], input[type="password"]:nth-of-type(2)');
            if (confirmPasswordField) {
                await fillField(this.page, 'input[name="confirmPassword"], input[type="password"]:nth-of-type(2)', testUser.password);
            }
            
            // Navigate to payment step
            await clickElement(this.page, 'button[type="submit"], button:has-text("Continue")');
            await this.page.waitForTimeout(1000);
            
            // Fill business info if present
            const businessNameField = await this.page.$('input[name="businessName"], input[placeholder*="business" i]');
            if (businessNameField) {
                await fillField(this.page, 'input[name="businessName"], input[placeholder*="business" i]', testUser.businessName);
                await clickElement(this.page, 'button[type="submit"], button:has-text("Continue")');
                await this.page.waitForTimeout(1000);
            }
            
            result.addStep('Navigate to payment step', true);
            
            // Wait for Stripe
            await this.page.waitForTimeout(3000);
            
            // Use declined card
            const cardFrame = await this.page.waitForSelector('iframe[title*="Secure card number"]', { timeout: 10000 });
            if (cardFrame) {
                console.log('   Using declined test card');
                const cardFrameContent = await cardFrame.contentFrame();
                await cardFrameContent.type('input[name="cardnumber"]', STRIPE_TEST_CARDS.declined);
                
                // Fill other fields
                const expiryFrame = await this.page.waitForSelector('iframe[title*="Secure expiration date"]');
                const expiryFrameContent = await expiryFrame.contentFrame();
                await expiryFrameContent.type('input[name="exp-date"]', '12/34');
                
                const cvcFrame = await this.page.waitForSelector('iframe[title*="Secure CVC"]');
                const cvcFrameContent = await cvcFrame.contentFrame();
                await cvcFrameContent.type('input[name="cvc"]', '123');
                
                result.addStep('Fill declined card details', true);
                
                // Submit payment
                await clickElement(this.page, 'button[type="submit"], button:has-text("Complete")');
                await this.page.waitForTimeout(5000);
                
                // Check for error message
                const paymentError = await this.page.$(SELECTORS.errorMessage);
                if (paymentError) {
                    const errorText = await paymentError.evaluate(el => el.textContent);
                    result.addStep('Payment error displayed', true, { error: errorText });
                    
                    // Take screenshot
                    const errorScreenshot = await takeScreenshot(this.page, 'payment-failure');
                    result.addScreenshot(errorScreenshot);
                    
                    // Check if retry is possible
                    const retryButton = await this.page.$('button:has-text("Try again"), button:has-text("Retry")');
                    result.addStep('Retry option available', !!retryButton);
                    
                    result.finish(true);
                    console.log('✅ Payment failure test passed');
                } else {
                    throw new Error('No error message shown for declined card');
                }
            } else {
                result.addStep('Stripe Elements not found', false);
                result.finish(false);
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Payment failure test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testDuplicateEmail() {
        const result = new TestResult('Duplicate Email Test');
        
        try {
            console.log('\n📍 Test: Duplicate Email Handling');
            
            // Navigate to registration page
            await this.page.goto(`${CONFIG.baseUrl}/register`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to registration page', true);
            
            // Use existing admin email
            await fillField(this.page, 'input[name="email"], input[type="email"]', 'admin.test@bookedbarber.com');
            await fillField(this.page, 'input[name="name"], input[placeholder*="name" i]', 'Test User');
            await fillField(this.page, 'input[name="password"], input[type="password"]:first-of-type', 'TestPassword123!');
            
            const confirmPasswordField = await this.page.$('input[name="confirmPassword"], input[type="password"]:nth-of-type(2)');
            if (confirmPasswordField) {
                await fillField(this.page, 'input[name="confirmPassword"], input[type="password"]:nth-of-type(2)', 'TestPassword123!');
            }
            
            result.addStep('Fill form with existing email', true);
            
            // Submit form
            await clickElement(this.page, 'button[type="submit"], button:has-text("Continue")');
            await this.page.waitForTimeout(2000);
            
            // Check for error
            const errorElement = await this.page.$(SELECTORS.errorMessage);
            if (errorElement) {
                const errorText = await errorElement.evaluate(el => el.textContent);
                const isDuplicateError = errorText.toLowerCase().includes('exist') || 
                                        errorText.toLowerCase().includes('already') ||
                                        errorText.toLowerCase().includes('taken');
                result.addStep('Duplicate email error shown', isDuplicateError, { error: errorText });
                
                // Take screenshot
                const duplicateScreenshot = await takeScreenshot(this.page, 'duplicate-email-error');
                result.addScreenshot(duplicateScreenshot);
                
                result.finish(isDuplicateError);
                console.log('✅ Duplicate email test passed');
            } else {
                // Check if we're still on registration page
                const currentUrl = this.page.url();
                if (currentUrl.includes('/register')) {
                    result.addStep('Registration blocked', true);
                    result.finish(true);
                } else {
                    throw new Error('Duplicate email was accepted');
                }
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Duplicate email test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testOrganizationCreation() {
        const result = new TestResult('Organization Creation Test');
        const testUser = generateTestUser();
        
        try {
            console.log('\n📍 Test: Organization Creation During Registration');
            
            // Complete a registration
            await this.page.goto(`${CONFIG.baseUrl}/register`, { waitUntil: 'networkidle2' });
            
            // Fill all required fields quickly
            await fillField(this.page, 'input[name="name"], input[placeholder*="name" i]', testUser.name);
            await fillField(this.page, 'input[name="email"], input[type="email"]', testUser.email);
            await fillField(this.page, 'input[name="phone"], input[type="tel"]', testUser.phone);
            await fillField(this.page, 'input[name="password"], input[type="password"]:first-of-type', testUser.password);
            
            const confirmPasswordField = await this.page.$('input[name="confirmPassword"], input[type="password"]:nth-of-type(2)');
            if (confirmPasswordField) {
                await fillField(this.page, 'input[name="confirmPassword"], input[type="password"]:nth-of-type(2)', testUser.password);
            }
            
            // Continue
            await clickElement(this.page, 'button[type="submit"], button:has-text("Continue")');
            await this.page.waitForTimeout(1000);
            
            // Fill business info
            const businessNameField = await this.page.$('input[name="businessName"], input[placeholder*="business" i]');
            if (businessNameField) {
                await fillField(this.page, 'input[name="businessName"], input[placeholder*="business" i]', testUser.businessName);
                
                // Check for additional org fields
                const chairsField = await this.page.$('input[name="chairs"], input[placeholder*="chair" i]');
                if (chairsField) {
                    await fillField(this.page, 'input[name="chairs"], input[placeholder*="chair" i]', '4');
                    result.addStep('Fill organization details', true);
                }
                
                await clickElement(this.page, 'button[type="submit"], button:has-text("Continue")');
                await this.page.waitForTimeout(1000);
            }
            
            result.addStep('Complete registration form', true);
            
            // Skip payment for this test or use success card
            await this.page.waitForTimeout(3000);
            const cardFrame = await this.page.$('iframe[title*="Secure card number"]');
            if (cardFrame) {
                const cardFrameContent = await cardFrame.contentFrame();
                await cardFrameContent.type('input[name="cardnumber"]', STRIPE_TEST_CARDS.success);
                
                const expiryFrame = await this.page.waitForSelector('iframe[title*="Secure expiration date"]');
                const expiryFrameContent = await expiryFrame.contentFrame();
                await expiryFrameContent.type('input[name="exp-date"]', '12/34');
                
                const cvcFrame = await this.page.waitForSelector('iframe[title*="Secure CVC"]');
                const cvcFrameContent = await cvcFrame.contentFrame();
                await cvcFrameContent.type('input[name="cvc"]', '123');
            }
            
            // Complete registration
            await clickElement(this.page, 'button[type="submit"], button:has-text("Complete"), button:has-text("Start")');
            await this.page.waitForTimeout(5000);
            
            // Check if redirected to dashboard/onboarding
            const currentUrl = this.page.url();
            if (currentUrl.includes('/dashboard') || currentUrl.includes('/onboarding')) {
                result.addStep('Registration successful', true);
                
                // Check for organization info on dashboard
                const orgName = await this.page.$('.organization-name, .business-name, h1:has-text("' + testUser.businessName + '")');
                if (orgName) {
                    result.addStep('Organization name displayed', true);
                }
                
                // Take screenshot
                const orgScreenshot = await takeScreenshot(this.page, 'organization-created');
                result.addScreenshot(orgScreenshot);
                
                result.finish(true);
                console.log('✅ Organization creation test passed');
            } else {
                throw new Error('Registration did not complete successfully');
            }
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Organization creation test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async runAllTests() {
        try {
            await this.init();
            
            // Run all registration tests
            await this.testFormValidation();
            await this.testDuplicateEmail();
            await this.testPaymentFailure();
            await this.testCompleteRegistration();
            await this.testOrganizationCreation();
            
            // Generate report
            const report = generateReport('registration-flow', this.results);
            
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
    const tester = new RegistrationFlowTester();
    tester.runAllTests().catch(console.error);
}

module.exports = RegistrationFlowTester;
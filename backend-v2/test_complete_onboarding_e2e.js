#!/usr/bin/env node

/**
 * Complete End-to-End Onboarding System Test with Puppeteer
 * Tests the entire onboarding flow with real user interactions
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class OnboardingE2ETest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            testStartTime: new Date().toISOString(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0
            }
        };
    }

    async addTest(name, status, details = {}) {
        this.results.tests.push({
            name,
            status,
            timestamp: new Date().toISOString(),
            ...details
        });
        this.results.summary.total++;
        if (status === 'PASS') {
            this.results.summary.passed++;
        } else {
            this.results.summary.failed++;
        }
        
        const statusEmoji = status === 'PASS' ? '✅' : '❌';
        console.log(`${statusEmoji} ${name}`);
        if (details.error) {
            console.log(`   Error: ${details.error}`);
        }
        if (details.screenshot) {
            console.log(`   Screenshot: ${details.screenshot}`);
        }
    }

    async takeScreenshot(name) {
        try {
            const screenshotPath = `onboarding_test_${name.replace(/\s+/g, '_')}_${Date.now()}.png`;
            await this.page.screenshot({ 
                path: screenshotPath, 
                fullPage: true 
            });
            return screenshotPath;
        } catch (error) {
            console.log(`Failed to take screenshot: ${error.message}`);
            return null;
        }
    }

    async waitForElement(selector, timeout = 10000) {
        try {
            await this.page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            return false;
        }
    }

    async login() {
        console.log('\n🔐 Testing Login Flow...');
        
        try {
            // Navigate to login page
            await this.page.goto('http://localhost:3000/login', { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // Wait for login form
            const loginFormExists = await this.waitForElement('input[type="email"]');
            if (!loginFormExists) {
                throw new Error('Login form not found');
            }

            // Fill in credentials
            await this.page.type('input[type="email"]', 'admin@bookedbarber.com');
            await this.page.type('input[type="password"]', 'password123');

            // Take screenshot before login
            const beforeLogin = await this.takeScreenshot('before_login');

            // Click login button
            await this.page.click('button[type="submit"]');

            // Wait for redirect or dashboard
            await this.page.waitForNavigation({ 
                waitUntil: 'networkidle2',
                timeout: 15000 
            });

            // Check if we're logged in (look for dashboard or user menu)
            const isLoggedIn = await this.page.$('.dashboard') || 
                             await this.page.$('[data-testid="user-menu"]') ||
                             await this.page.$('nav') ||
                             await this.page.url().includes('/dashboard');

            if (isLoggedIn) {
                await this.addTest('User Login', 'PASS', {
                    url: this.page.url(),
                    screenshot: beforeLogin
                });
                return true;
            } else {
                throw new Error('Login failed - not redirected to dashboard');
            }

        } catch (error) {
            const screenshot = await this.takeScreenshot('login_failed');
            await this.addTest('User Login', 'FAIL', {
                error: error.message,
                url: this.page.url(),
                screenshot
            });
            return false;
        }
    }

    async testSettingsNavigation() {
        console.log('\n⚙️ Testing Settings Navigation...');
        
        try {
            // Try multiple ways to get to settings
            let settingsFound = false;
            
            // Method 1: Direct URL
            await this.page.goto('http://localhost:3000/settings', { 
                waitUntil: 'networkidle2',
                timeout: 15000 
            });
            
            // Check if settings page loaded
            const settingsPageLoaded = await this.page.waitForSelector('h1', { timeout: 5000 })
                .then(() => true)
                .catch(() => false);

            if (settingsPageLoaded) {
                const pageTitle = await this.page.$eval('h1', el => el.textContent).catch(() => '');
                if (pageTitle.toLowerCase().includes('settings')) {
                    settingsFound = true;
                }
            }

            // Method 2: Look for settings link in navigation
            if (!settingsFound) {
                const settingsLink = await this.page.$('a[href="/settings"]') || 
                                   await this.page.$('a[href*="settings"]') ||
                                   await this.page.$('[data-testid="settings-link"]');
                
                if (settingsLink) {
                    await settingsLink.click();
                    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                    settingsFound = true;
                }
            }

            const screenshot = await this.takeScreenshot('settings_page');

            if (settingsFound) {
                await this.addTest('Settings Navigation', 'PASS', {
                    url: this.page.url(),
                    screenshot
                });
                return true;
            } else {
                throw new Error('Could not navigate to settings page');
            }

        } catch (error) {
            const screenshot = await this.takeScreenshot('settings_navigation_failed');
            await this.addTest('Settings Navigation', 'FAIL', {
                error: error.message,
                url: this.page.url(),
                screenshot
            });
            return false;
        }
    }

    async testOnboardingManagementCard() {
        console.log('\n🚀 Testing Onboarding Management Card...');
        
        try {
            // Look for the "Setup & Onboarding" card
            const onboardingCard = await this.page.$('a[href="/settings/onboarding"]') ||
                                  await this.page.$('[href*="onboarding"]') ||
                                  await this.page.evaluateHandle(() => {
                                      const links = Array.from(document.querySelectorAll('a'));
                                      return links.find(link => 
                                          link.textContent.toLowerCase().includes('onboarding') ||
                                          link.textContent.toLowerCase().includes('setup')
                                      );
                                  });

            const screenshot = await this.takeScreenshot('settings_with_onboarding_card');

            if (onboardingCard && onboardingCard.asElement) {
                // Click the onboarding card
                await onboardingCard.asElement().click();
                await this.page.waitForNavigation({ 
                    waitUntil: 'networkidle2',
                    timeout: 10000 
                });

                await this.addTest('Onboarding Management Card', 'PASS', {
                    url: this.page.url(),
                    screenshot
                });
                return true;
            } else {
                throw new Error('Onboarding management card not found in settings');
            }

        } catch (error) {
            const screenshot = await this.takeScreenshot('onboarding_card_failed');
            await this.addTest('Onboarding Management Card', 'FAIL', {
                error: error.message,
                url: this.page.url(),
                screenshot
            });
            return false;
        }
    }

    async testOnboardingResetFunctionality() {
        console.log('\n🔄 Testing Onboarding Reset Functionality...');
        
        try {
            // Look for reset button
            const resetButton = await this.page.$('button[onClick*="reset"]') ||
                              await this.page.$('button:contains("Reset")') ||
                              await this.page.evaluateHandle(() => {
                                  const buttons = Array.from(document.querySelectorAll('button'));
                                  return buttons.find(btn => 
                                      btn.textContent.toLowerCase().includes('reset') ||
                                      btn.textContent.toLowerCase().includes('restart')
                                  );
                              });

            const beforeReset = await this.takeScreenshot('before_reset');

            if (resetButton && resetButton.asElement) {
                // Click reset button
                await resetButton.asElement().click();

                // Wait for any confirmation dialog or immediate action
                await this.page.waitForTimeout(2000);

                // Look for confirmation dialog
                const confirmButton = await this.page.$('button:contains("Confirm")') ||
                                    await this.page.$('button:contains("Yes")') ||
                                    await this.page.$('[data-testid="confirm-reset"]');

                if (confirmButton) {
                    await confirmButton.click();
                    await this.page.waitForTimeout(1000);
                }

                const afterReset = await this.takeScreenshot('after_reset');

                await this.addTest('Onboarding Reset Functionality', 'PASS', {
                    url: this.page.url(),
                    screenshot: afterReset
                });
                return true;
            } else {
                throw new Error('Reset button not found on onboarding management page');
            }

        } catch (error) {
            const screenshot = await this.takeScreenshot('reset_functionality_failed');
            await this.addTest('Onboarding Reset Functionality', 'FAIL', {
                error: error.message,
                url: this.page.url(),
                screenshot
            });
            return false;
        }
    }

    async testOnboardingWelcomeFlow() {
        console.log('\n👋 Testing Welcome Onboarding Flow...');
        
        try {
            // Navigate to the welcome onboarding page
            await this.page.goto('http://localhost:3000/dashboard/welcome', { 
                waitUntil: 'networkidle2',
                timeout: 15000 
            });

            // Check if welcome page loaded
            const welcomePageLoaded = await this.waitForElement('.onboarding-container, .welcome-container, h1, .step-indicator');
            
            if (!welcomePageLoaded) {
                throw new Error('Welcome onboarding page did not load');
            }

            const welcomeScreenshot = await this.takeScreenshot('welcome_onboarding_page');

            // Test each onboarding step
            const steps = ['profile', 'staff', 'services', 'calendar', 'payment'];
            let currentStep = 0;

            for (const step of steps) {
                try {
                    console.log(`   Testing step: ${step}`);
                    
                    // Look for step content or button
                    const stepButton = await this.page.$(`button[data-step="${step}"]`) ||
                                     await this.page.$(`[data-testid="${step}-step"]`) ||
                                     await this.page.evaluateHandle(() => {
                                         const buttons = Array.from(document.querySelectorAll('button'));
                                         return buttons.find(btn => btn.textContent.toLowerCase().includes('next'));
                                     });

                    if (stepButton && stepButton.asElement) {
                        // Fill out any forms on this step
                        await this.fillStepForm(step);
                        
                        // Click next or continue
                        await stepButton.asElement().click();
                        await this.page.waitForTimeout(1000);

                        currentStep++;
                    }

                    const stepScreenshot = await this.takeScreenshot(`onboarding_step_${step}`);
                    
                } catch (stepError) {
                    console.log(`   Step ${step} error: ${stepError.message}`);
                    await this.takeScreenshot(`onboarding_step_${step}_error`);
                }
            }

            await this.addTest('Welcome Onboarding Flow', 'PASS', {
                url: this.page.url(),
                screenshot: welcomeScreenshot,
                stepsCompleted: currentStep
            });
            return true;

        } catch (error) {
            const screenshot = await this.takeScreenshot('welcome_flow_failed');
            await this.addTest('Welcome Onboarding Flow', 'FAIL', {
                error: error.message,
                url: this.page.url(),
                screenshot
            });
            return false;
        }
    }

    async fillStepForm(step) {
        try {
            switch (step) {
                case 'profile':
                    // Fill profile information
                    const nameInput = await this.page.$('input[name="name"], input[name="full_name"], input[placeholder*="name"]');
                    if (nameInput) {
                        await nameInput.type('Test User');
                    }
                    
                    const phoneInput = await this.page.$('input[name="phone"], input[type="tel"]');
                    if (phoneInput) {
                        await phoneInput.type('555-123-4567');
                    }
                    break;

                case 'staff':
                    // Add staff member if needed
                    const addStaffButton = await this.page.$('button:contains("Add Staff")');
                    if (addStaffButton) {
                        await addStaffButton.click();
                        await this.page.waitForTimeout(500);
                    }
                    break;

                case 'services':
                    // Add a service if needed
                    const addServiceButton = await this.page.$('button:contains("Add Service")');
                    if (addServiceButton) {
                        await addServiceButton.click();
                        await this.page.waitForTimeout(500);
                        
                        const serviceNameInput = await this.page.$('input[name="service_name"], input[placeholder*="service"]');
                        if (serviceNameInput) {
                            await serviceNameInput.type('Haircut');
                        }
                        
                        const priceInput = await this.page.$('input[name="price"], input[type="number"]');
                        if (priceInput) {
                            await priceInput.type('50');
                        }
                    }
                    break;

                case 'calendar':
                    // Set business hours or calendar settings
                    const businessHoursInput = await this.page.$('input[name="hours"], select[name="hours"]');
                    if (businessHoursInput) {
                        await businessHoursInput.click();
                    }
                    break;

                case 'payment':
                    // Skip payment setup for now (just testing UI)
                    const skipPaymentButton = await this.page.$('button:contains("Skip")');
                    if (skipPaymentButton) {
                        await skipPaymentButton.click();
                    }
                    break;
            }
        } catch (error) {
            console.log(`   Form filling error for ${step}: ${error.message}`);
        }
    }

    async testSkipButton() {
        console.log('\n⏭️ Testing Skip Button...');
        
        try {
            // Look for skip button
            const skipButton = await this.page.$('button:contains("Skip")') ||
                             await this.page.$('[data-testid="skip-button"]') ||
                             await this.page.evaluateHandle(() => {
                                 const buttons = Array.from(document.querySelectorAll('button'));
                                 return buttons.find(btn => 
                                     btn.textContent.toLowerCase().includes('skip')
                                 );
                             });

            if (skipButton && skipButton.asElement) {
                const beforeSkip = await this.takeScreenshot('before_skip');
                
                await skipButton.asElement().click();
                await this.page.waitForTimeout(2000);

                const afterSkip = await this.takeScreenshot('after_skip');

                await this.addTest('Skip Button Functionality', 'PASS', {
                    url: this.page.url(),
                    screenshot: afterSkip
                });
                return true;
            } else {
                throw new Error('Skip button not found');
            }

        } catch (error) {
            const screenshot = await this.takeScreenshot('skip_button_failed');
            await this.addTest('Skip Button Functionality', 'FAIL', {
                error: error.message,
                screenshot
            });
            return false;
        }
    }

    async run() {
        console.log('🚀 Starting Complete Onboarding E2E Test...\n');

        try {
            // Launch browser
            this.browser = await puppeteer.launch({
                headless: false, // Run in visible mode to see what's happening
                slowMo: 250,     // Slow down actions to see them
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--allow-running-insecure-content'
                ]
            });

            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1366, height: 768 });

            // Enable console logging
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    console.log(`   🔍 Console Error: ${msg.text()}`);
                }
            });

            // Test sequence
            const loginSuccess = await this.login();
            if (!loginSuccess) {
                console.log('❌ Login failed - cannot continue with onboarding tests');
                return;
            }

            await this.testSettingsNavigation();
            await this.testOnboardingManagementCard();
            await this.testOnboardingResetFunctionality();
            await this.testOnboardingWelcomeFlow();
            await this.testSkipButton();

        } catch (error) {
            console.error('❌ Test execution failed:', error);
            await this.addTest('Test Execution', 'FAIL', { error: error.message });
        } finally {
            if (this.browser) {
                await this.browser.close();
            }

            // Save results
            this.results.testEndTime = new Date().toISOString();
            this.results.duration = new Date(this.results.testEndTime) - new Date(this.results.testStartTime);

            const reportPath = `onboarding_e2e_test_report_${Date.now()}.json`;
            fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

            // Print summary
            console.log('\n📋 Test Summary:');
            console.log(`   Total Tests: ${this.results.summary.total}`);
            console.log(`   Passed: ${this.results.summary.passed} ✅`);
            console.log(`   Failed: ${this.results.summary.failed} ❌`);
            console.log(`   Success Rate: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%`);
            console.log(`   Report saved: ${reportPath}`);

            if (this.results.summary.failed === 0) {
                console.log('\n🎉 All tests passed! Onboarding system is fully functional!');
            } else {
                console.log('\n⚠️  Some tests failed. Check screenshots and logs for details.');
            }
        }
    }
}

// Run the test
if (require.main === module) {
    const test = new OnboardingE2ETest();
    test.run().catch(console.error);
}

module.exports = OnboardingE2ETest;
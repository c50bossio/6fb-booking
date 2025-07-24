#!/usr/bin/env node

/**
 * Simple Onboarding Test with manual verification
 * Tests critical functionality step by step
 */

const puppeteer = require('puppeteer');

async function testOnboardingFlow() {
    console.log('🚀 Starting Simple Onboarding Test...\n');
    
    let browser;
    try {
        // Launch browser with Chrome path
        browser = await puppeteer.launch({
            headless: false,
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            slowMo: 500,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });

        // Test 1: Login
        console.log('🔐 Testing Login...');
        await page.goto('http://localhost:3000/login');
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        
        await page.type('input[type="email"]', 'admin@bookedbarber.com');
        await page.type('input[type="password"]', 'password123');
        
        await page.screenshot({ path: 'test_1_login_form.png' });
        
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        
        console.log('✅ Login completed, current URL:', page.url());
        await page.screenshot({ path: 'test_2_after_login.png' });

        // Test 2: Navigate to Settings
        console.log('\n⚙️ Testing Settings Navigation...');
        await page.goto('http://localhost:3000/settings');
        await page.waitForSelector('h1, .settings-container', { timeout: 10000 });
        
        console.log('✅ Settings page loaded');
        await page.screenshot({ path: 'test_3_settings_page.png' });

        // Test 3: Find Onboarding Management
        console.log('\n🚀 Looking for Onboarding Management...');
        
        // Wait a bit for page to fully load
        await page.waitForTimeout(2000);
        
        // Look for onboarding-related links or cards
        const onboardingElements = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            const onboardingElements = allElements.filter(el => {
                const text = el.textContent.toLowerCase();
                return text.includes('onboarding') || text.includes('setup') || text.includes('welcome');
            });
            
            return onboardingElements.map(el => ({
                tagName: el.tagName,
                textContent: el.textContent.trim().substring(0, 100),
                href: el.href || null,
                id: el.id || null,
                className: el.className || null
            }));
        });

        console.log('Found onboarding-related elements:', onboardingElements);
        await page.screenshot({ path: 'test_4_onboarding_search.png' });

        // Test 4: Try to access onboarding management directly
        console.log('\n🎯 Testing Direct Onboarding Management Access...');
        try {
            await page.goto('http://localhost:3000/settings/onboarding');
            await page.waitForSelector('body', { timeout: 10000 });
            
            console.log('✅ Onboarding management page accessible');
            await page.screenshot({ path: 'test_5_onboarding_management.png' });
            
            // Look for reset button
            const resetButton = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const resetBtn = buttons.find(btn => 
                    btn.textContent.toLowerCase().includes('reset') ||
                    btn.textContent.toLowerCase().includes('restart')
                );
                return resetBtn ? {
                    text: resetBtn.textContent,
                    disabled: resetBtn.disabled,
                    visible: resetBtn.offsetParent !== null
                } : null;
            });

            if (resetButton) {
                console.log('✅ Reset button found:', resetButton);
            } else {
                console.log('❌ Reset button not found');
            }

        } catch (error) {
            console.log('❌ Could not access onboarding management:', error.message);
            await page.screenshot({ path: 'test_5_onboarding_management_error.png' });
        }

        // Test 5: Try welcome onboarding flow
        console.log('\n👋 Testing Welcome Onboarding Flow...');
        try {
            await page.goto('http://localhost:3000/dashboard/welcome');
            await page.waitForSelector('body', { timeout: 10000 });
            
            console.log('✅ Welcome onboarding page accessible');
            await page.screenshot({ path: 'test_6_welcome_onboarding.png' });

            // Check for onboarding steps
            const onboardingSteps = await page.evaluate(() => {
                const stepElements = Array.from(document.querySelectorAll('*')).filter(el => {
                    const text = el.textContent.toLowerCase();
                    return text.includes('step') || text.includes('profile') || 
                           text.includes('services') || text.includes('calendar') ||
                           text.includes('payment') || text.includes('staff');
                });
                
                return stepElements.map(el => ({
                    tagName: el.tagName,
                    textContent: el.textContent.trim().substring(0, 50),
                    className: el.className || null
                })).slice(0, 10); // Limit to first 10
            });

            console.log('Found onboarding step elements:', onboardingSteps);

        } catch (error) {
            console.log('❌ Could not access welcome onboarding:', error.message);
            await page.screenshot({ path: 'test_6_welcome_onboarding_error.png' });
        }

        // Test 6: Check for JavaScript errors
        console.log('\n🔍 Checking for JavaScript Errors...');
        const jsErrors = [];
        page.on('pageerror', error => {
            jsErrors.push(error.message);
        });

        // Navigate to a few pages to catch any errors
        await page.goto('http://localhost:3000/dashboard');
        await page.waitForTimeout(2000);
        await page.goto('http://localhost:3000/settings');
        await page.waitForTimeout(2000);

        if (jsErrors.length > 0) {
            console.log('❌ JavaScript errors found:');
            jsErrors.forEach(error => console.log('   -', error));
        } else {
            console.log('✅ No JavaScript errors detected');
        }

        console.log('\n🎉 Test completed! Check screenshots for visual verification.');
        console.log('\nScreenshots created:');
        console.log('  - test_1_login_form.png');
        console.log('  - test_2_after_login.png');
        console.log('  - test_3_settings_page.png');
        console.log('  - test_4_onboarding_search.png');
        console.log('  - test_5_onboarding_management.png');
        console.log('  - test_6_welcome_onboarding.png');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (browser) {
            const page = (await browser.pages())[0];
            if (page) {
                await page.screenshot({ path: 'test_error.png' });
                console.log('Error screenshot saved: test_error.png');
            }
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testOnboardingFlow();
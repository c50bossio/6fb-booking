#!/usr/bin/env node

/**
 * Simple Mobile UI Test for BookedBarber V2
 * Focused testing of key mobile improvements
 */

const puppeteer = require('puppeteer');

async function testMobileUI() {
    console.log('🚀 Testing Mobile UI Improvements at http://localhost:3001');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: {
            width: 375,
            height: 812,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true
        }
    });
    
    const page = await browser.newPage();
    
    try {
        // Test 1: Horizontal Scrolling
        console.log('\n📱 Testing Horizontal Scrolling...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
        
        const horizontalScrollTest = await page.evaluate(() => {
            const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
            const bodyOverflow = document.body.style.overflowX;
            const htmlOverflow = document.documentElement.style.overflowX;
            
            return {
                hasHorizontalScroll,
                bodyOverflow,
                htmlOverflow,
                viewportWidth: window.innerWidth,
                documentWidth: document.documentElement.scrollWidth
            };
        });
        
        console.log(`✅ Horizontal Scroll: ${horizontalScrollTest.hasHorizontalScroll ? 'DETECTED' : 'NONE'}`);
        console.log(`   Viewport Width: ${horizontalScrollTest.viewportWidth}px`);
        console.log(`   Document Width: ${horizontalScrollTest.documentWidth}px`);
        
        // Test 2: Touch Targets
        console.log('\n👆 Testing Touch Targets...');
        const touchTargets = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, a[role="button"], .btn');
            const results = [];
            
            buttons.forEach(button => {
                const rect = button.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    results.push({
                        text: button.textContent?.trim().substring(0, 20) || 'No text',
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        meetsTarget: rect.width >= 44 && rect.height >= 44
                    });
                }
            });
            
            return results;
        });
        
        touchTargets.forEach(target => {
            console.log(`   ${target.meetsTarget ? '✅' : '❌'} "${target.text}" - ${target.width}x${target.height}px`);
        });
        
        // Test 3: Navigation on Mobile
        console.log('\n🧭 Testing Navigation...');
        const navigation = await page.evaluate(() => {
            const nav = document.querySelector('nav');
            if (!nav) return null;
            
            const navRect = nav.getBoundingClientRect();
            const navItems = nav.querySelectorAll('a, button');
            
            return {
                width: Math.round(navRect.width),
                height: Math.round(navRect.height),
                itemCount: navItems.length,
                fitsScreen: navRect.width <= window.innerWidth
            };
        });
        
        if (navigation) {
            console.log(`✅ Navigation: ${navigation.width}x${navigation.height}px with ${navigation.itemCount} items`);
            console.log(`   Fits Screen: ${navigation.fitsScreen ? 'YES' : 'NO'}`);
        } else {
            console.log('❌ Navigation: Not found');
        }
        
        // Test 4: Check Calendar Page
        console.log('\n📅 Testing Calendar Page...');
        await page.goto('http://localhost:3001/calendar', { waitUntil: 'networkidle2' });
        
        const calendarTest = await page.evaluate(() => {
            const calendar = document.querySelector('[class*="calendar"], .calendar, .react-calendar');
            if (!calendar) return null;
            
            const calendarRect = calendar.getBoundingClientRect();
            return {
                found: true,
                width: Math.round(calendarRect.width),
                height: Math.round(calendarRect.height),
                fitsScreen: calendarRect.width <= window.innerWidth
            };
        });
        
        if (calendarTest) {
            console.log(`✅ Calendar: ${calendarTest.width}x${calendarTest.height}px`);
            console.log(`   Fits Screen: ${calendarTest.fitsScreen ? 'YES' : 'NO'}`);
        } else {
            console.log('❌ Calendar: Not found or not accessible');
        }
        
        // Test 5: Check Booking Form
        console.log('\n📋 Testing Booking Form...');
        await page.goto('http://localhost:3001/booking', { waitUntil: 'networkidle2' });
        
        const bookingTest = await page.evaluate(() => {
            const form = document.querySelector('form');
            if (!form) return null;
            
            const formRect = form.getBoundingClientRect();
            const inputs = form.querySelectorAll('input, select, textarea');
            
            return {
                found: true,
                width: Math.round(formRect.width),
                height: Math.round(formRect.height),
                inputCount: inputs.length,
                fitsScreen: formRect.width <= window.innerWidth
            };
        });
        
        if (bookingTest) {
            console.log(`✅ Booking Form: ${bookingTest.width}x${bookingTest.height}px with ${bookingTest.inputCount} inputs`);
            console.log(`   Fits Screen: ${bookingTest.fitsScreen ? 'YES' : 'NO'}`);
        } else {
            console.log('❌ Booking Form: Not found');
        }
        
        // Test 6: Test CSS Fixes
        console.log('\n🎨 Testing CSS Fixes...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
        
        const cssTest = await page.evaluate(() => {
            const bodyStyle = window.getComputedStyle(document.body);
            const htmlStyle = window.getComputedStyle(document.documentElement);
            
            return {
                bodyOverflowX: bodyStyle.overflowX,
                htmlOverflowX: htmlStyle.overflowX,
                bodyOverflow: bodyStyle.overflow,
                htmlOverflow: htmlStyle.overflow
            };
        });
        
        console.log(`✅ CSS Overflow Settings:`);
        console.log(`   Body overflow-x: ${cssTest.bodyOverflowX}`);
        console.log(`   HTML overflow-x: ${cssTest.htmlOverflowX}`);
        
        // Take screenshots
        console.log('\n📸 Taking Screenshots...');
        await page.screenshot({ path: 'mobile-homepage.png', fullPage: true });
        await page.goto('http://localhost:3001/booking', { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'mobile-booking.png', fullPage: true });
        await page.goto('http://localhost:3001/calendar', { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'mobile-calendar.png', fullPage: true });
        
        console.log('✅ Screenshots saved: mobile-homepage.png, mobile-booking.png, mobile-calendar.png');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
    
    console.log('\n🎉 Mobile UI Test Complete!');
}

testMobileUI().catch(console.error);
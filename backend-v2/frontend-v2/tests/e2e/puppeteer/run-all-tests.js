#!/usr/bin/env node

/**
 * Main Test Runner for all Puppeteer E2E Tests
 * 
 * Runs all test suites and generates a comprehensive report
 */

const AuthFlowTester = require('./auth-flow-test');
const RegistrationFlowTester = require('./registration-flow-test');
const BookingFlowTester = require('./booking-flow-test');
const DashboardTester = require('./dashboard-test');
const MobileResponsiveTester = require('./mobile-responsive-test');
const PerformanceTester = require('./performance-test');
const ErrorHandlingTester = require('./error-handling-test');

const fs = require('fs');
const path = require('path');

// Command line arguments
const args = process.argv.slice(2);
const testFilter = args[0];
const isHeadless = !args.includes('--headed');
const isQuick = args.includes('--quick');

// Override config if needed
if (isHeadless !== undefined) {
    process.env.TEST_HEADLESS = isHeadless.toString();
}

class TestRunner {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
        this.testSuites = [
            { name: 'Authentication Flow', class: AuthFlowTester, quick: true },
            { name: 'Registration Flow', class: RegistrationFlowTester, quick: false },
            { name: 'Booking Flow', class: BookingFlowTester, quick: true },
            { name: 'Dashboard', class: DashboardTester, quick: true },
            { name: 'Mobile Responsiveness', class: MobileResponsiveTester, quick: false },
            { name: 'Performance', class: PerformanceTester, quick: false },
            { name: 'Error Handling', class: ErrorHandlingTester, quick: true }
        ];
    }

    async runTestSuite(suite) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Running ${suite.name} Tests`);
        console.log(${'='.repeat(60)}`);
        
        const suiteStartTime = Date.now();
        const tester = new suite.class();
        
        try {
            await tester.runAllTests();
            
            // Collect results
            const suiteResult = {
                name: suite.name,
                duration: Date.now() - suiteStartTime,
                success: tester.results.every(r => r.success),
                results: tester.results,
                totalTests: tester.results.length,
                passedTests: tester.results.filter(r => r.success).length,
                failedTests: tester.results.filter(r => !r.success).length
            };
            
            this.results.push(suiteResult);
            
            console.log(`\n✅ ${suite.name} tests completed in ${Math.round(suiteResult.duration / 1000)}s`);
            console.log(`   Passed: ${suiteResult.passedTests}/${suiteResult.totalTests}`);
            
        } catch (error) {
            console.error(`\n❌ ${suite.name} tests failed with error:`, error.message);
            
            this.results.push({
                name: suite.name,
                duration: Date.now() - suiteStartTime,
                success: false,
                error: error.message,
                results: [],
                totalTests: 0,
                passedTests: 0,
                failedTests: 0
            });
        }
    }

    async runAllTests() {
        console.log('🚀 BookedBarber V2 - Comprehensive E2E Test Suite');
        console.log(`Mode: ${isHeadless ? 'Headless' : 'Headed'}`);
        console.log(`Type: ${isQuick ? 'Quick' : 'Full'}`);
        if (testFilter) {
            console.log(`Filter: ${testFilter}`);
        }
        console.log(`Started: ${new Date().toISOString()}\n`);

        // Filter test suites
        let suitesToRun = this.testSuites;
        
        if (testFilter) {
            suitesToRun = suitesToRun.filter(suite => 
                suite.name.toLowerCase().includes(testFilter.toLowerCase())
            );
        }
        
        if (isQuick) {
            suitesToRun = suitesToRun.filter(suite => suite.quick);
        }

        // Run selected test suites
        for (const suite of suitesToRun) {
            await this.runTestSuite(suite);
        }

        // Generate final report
        this.generateFinalReport();
    }

    generateFinalReport() {
        const totalDuration = Date.now() - this.startTime;
        
        // Calculate totals
        const totals = this.results.reduce((acc, suite) => {
            acc.totalTests += suite.totalTests;
            acc.passedTests += suite.passedTests;
            acc.failedTests += suite.failedTests;
            acc.successfulSuites += suite.success ? 1 : 0;
            return acc;
        }, {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            successfulSuites: 0
        });

        // Create report object
        const finalReport = {
            title: 'BookedBarber V2 E2E Test Report',
            timestamp: new Date().toISOString(),
            duration: totalDuration,
            environment: {
                headless: isHeadless,
                quick: isQuick,
                filter: testFilter || 'none',
                node: process.version,
                platform: process.platform
            },
            summary: {
                ...totals,
                totalSuites: this.results.length,
                passRate: ((totals.passedTests / totals.totalTests) * 100).toFixed(2) + '%'
            },
            suites: this.results,
            recommendations: this.generateRecommendations()
        };

        // Save JSON report
        const reportDir = './test-reports';
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        const reportPath = path.join(reportDir, `e2e-test-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL TEST REPORT');
        console.log('='.repeat(60));
        console.log(`Total Duration: ${Math.round(totalDuration / 1000)}s`);
        console.log(`Test Suites: ${totals.successfulSuites}/${this.results.length} passed`);
        console.log(`Test Cases: ${totals.passedTests}/${totals.totalTests} passed (${finalReport.summary.passRate})`);
        
        if (totals.failedTests > 0) {
            console.log(`\n❌ Failed Tests:`);
            this.results.forEach(suite => {
                if (!suite.success) {
                    console.log(`   - ${suite.name}: ${suite.error || 'Multiple failures'}`);
                    suite.results.forEach(test => {
                        if (!test.success) {
                            console.log(`     • ${test.name}`);
                        }
                    });
                }
            });
        } else {
            console.log('\n✅ All tests passed!');
        }

        // Print recommendations
        if (finalReport.recommendations.length > 0) {
            console.log('\n🔧 Recommendations:');
            finalReport.recommendations.forEach(rec => {
                console.log(`   - ${rec}`);
            });
        }

        console.log(`\nFull report saved to: ${reportPath}`);
        
        // Exit with appropriate code
        process.exit(totals.failedTests > 0 ? 1 : 0);
    }

    generateRecommendations() {
        const recommendations = [];
        
        this.results.forEach(suite => {
            if (!suite.success) {
                switch (suite.name) {
                    case 'Authentication Flow':
                        recommendations.push('Fix authentication issues before deployment');
                        break;
                    case 'Performance':
                        if (suite.results.some(r => r.name.includes('Page Load'))) {
                            recommendations.push('Optimize page load times for better user experience');
                        }
                        break;
                    case 'Mobile Responsiveness':
                        recommendations.push('Ensure mobile experience is fully functional');
                        break;
                    case 'Error Handling':
                        recommendations.push('Improve error handling and user feedback');
                        break;
                }
            }
        });

        // Add general recommendations based on patterns
        const allTests = this.results.flatMap(s => s.results);
        const apiFailures = allTests.filter(t => 
            t.name.toLowerCase().includes('api') && !t.success
        );
        
        if (apiFailures.length > 0) {
            recommendations.push('Review API integration and error handling');
        }

        const performanceIssues = allTests.filter(t => 
            t.name.toLowerCase().includes('performance') && !t.success
        );
        
        if (performanceIssues.length > 0) {
            recommendations.push('Consider performance optimization for production');
        }

        return [...new Set(recommendations)]; // Remove duplicates
    }
}

// Run tests
async function main() {
    const runner = new TestRunner();
    
    try {
        await runner.runAllTests();
    } catch (error) {
        console.error('Fatal error running tests:', error);
        process.exit(1);
    }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
});

// Check if we have the required modules installed
try {
    require('puppeteer');
} catch (error) {
    console.error('❌ Puppeteer is not installed. Please run: npm install puppeteer');
    process.exit(1);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = TestRunner;
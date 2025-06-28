#!/usr/bin/env node

/**
 * Next.js Server Stability Test
 *
 * Performs comprehensive load testing to ensure development server
 * stability during automated testing and development work.
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class ServerStabilityTest {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.results = {
            startTime: new Date().toISOString(),
            tests: [],
            summary: {},
            issues: [],
            recommendations: []
        };
    }

    async testBasicConnectivity() {
        console.log('🔍 Testing basic connectivity...');
        try {
            const start = performance.now();
            const response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 });
            const end = performance.now();

            const result = {
                test: 'Basic Connectivity',
                status: 'PASS',
                responseTime: Math.round(end - start),
                statusCode: response.status,
                healthy: response.data?.status === 'healthy'
            };

            this.results.tests.push(result);
            console.log(`✅ Basic connectivity: ${result.responseTime}ms`);
            return true;
        } catch (error) {
            const result = {
                test: 'Basic Connectivity',
                status: 'FAIL',
                error: error.message
            };
            this.results.tests.push(result);
            this.results.issues.push('Server not responding to basic requests');
            console.log('❌ Basic connectivity failed');
            return false;
        }
    }

    async testConcurrentRequests() {
        console.log('🔍 Testing concurrent request handling...');
        const concurrency = 10;
        const requests = [];

        for (let i = 0; i < concurrency; i++) {
            requests.push(axios.get(`${this.baseUrl}/api/health`, { timeout: 10000 }));
        }

        try {
            const start = performance.now();
            const responses = await Promise.all(requests);
            const end = performance.now();

            const successful = responses.filter(r => r.status === 200).length;
            const avgResponseTime = Math.round((end - start) / concurrency);

            const result = {
                test: 'Concurrent Requests',
                status: successful === concurrency ? 'PASS' : 'PARTIAL',
                successful: successful,
                total: concurrency,
                avgResponseTime: avgResponseTime,
                totalTime: Math.round(end - start)
            };

            this.results.tests.push(result);
            console.log(`✅ Concurrent requests: ${successful}/${concurrency} successful, ${avgResponseTime}ms avg`);

            if (successful < concurrency) {
                this.results.issues.push(`${concurrency - successful} requests failed under concurrent load`);
            }

            return successful === concurrency;
        } catch (error) {
            const result = {
                test: 'Concurrent Requests',
                status: 'FAIL',
                error: error.message
            };
            this.results.tests.push(result);
            this.results.issues.push('Server failed under concurrent load');
            console.log('❌ Concurrent request test failed');
            return false;
        }
    }

    async testPageLoading() {
        console.log('🔍 Testing page loading...');
        const pages = [
            '/',
            '/dashboard/calendar',
            '/api/health'
        ];

        const results = [];

        for (const page of pages) {
            try {
                const start = performance.now();
                const response = await axios.get(`${this.baseUrl}${page}`, {
                    timeout: 15000,
                    validateStatus: (status) => status < 500 // Accept redirects
                });
                const end = performance.now();

                results.push({
                    page,
                    status: 'PASS',
                    responseTime: Math.round(end - start),
                    statusCode: response.status
                });

            } catch (error) {
                results.push({
                    page,
                    status: 'FAIL',
                    error: error.message
                });
                this.results.issues.push(`Page ${page} failed to load: ${error.message}`);
            }
        }

        const successful = results.filter(r => r.status === 'PASS').length;
        const avgResponseTime = results
            .filter(r => r.responseTime)
            .reduce((sum, r) => sum + r.responseTime, 0) / results.length;

        const result = {
            test: 'Page Loading',
            status: successful === pages.length ? 'PASS' : 'PARTIAL',
            successful: successful,
            total: pages.length,
            avgResponseTime: Math.round(avgResponseTime || 0),
            details: results
        };

        this.results.tests.push(result);
        console.log(`✅ Page loading: ${successful}/${pages.length} pages, ${Math.round(avgResponseTime || 0)}ms avg`);

        return successful === pages.length;
    }

    async testMemoryStability() {
        console.log('🔍 Testing memory stability...');
        try {
            // Check Node.js process memory
            const { execSync } = require('child_process');
            const memoryBefore = execSync('ps aux | grep "next dev" | grep -v grep | awk \'{sum+=$6} END {print sum}\'', { encoding: 'utf8' });

            // Perform some memory-intensive operations
            const requests = [];
            for (let i = 0; i < 20; i++) {
                requests.push(axios.get(`${this.baseUrl}/api/health`));
            }
            await Promise.all(requests);

            // Wait a bit for garbage collection
            await new Promise(resolve => setTimeout(resolve, 2000));

            const memoryAfter = execSync('ps aux | grep "next dev" | grep -v grep | awk \'{sum+=$6} END {print sum}\'', { encoding: 'utf8' });

            const memoryGrowth = parseInt(memoryAfter) - parseInt(memoryBefore);
            const memoryGrowthMB = Math.round(memoryGrowth / 1024);

            const result = {
                test: 'Memory Stability',
                status: memoryGrowthMB < 50 ? 'PASS' : 'WARN',
                memoryBefore: Math.round(parseInt(memoryBefore) / 1024) + 'MB',
                memoryAfter: Math.round(parseInt(memoryAfter) / 1024) + 'MB',
                memoryGrowth: memoryGrowthMB + 'MB'
            };

            this.results.tests.push(result);

            if (memoryGrowthMB > 50) {
                this.results.issues.push(`High memory growth detected: ${memoryGrowthMB}MB`);
                this.results.recommendations.push('Consider restarting server periodically during long testing sessions');
            }

            console.log(`✅ Memory stability: ${memoryGrowthMB}MB growth (${result.status})`);
            return true;

        } catch (error) {
            const result = {
                test: 'Memory Stability',
                status: 'FAIL',
                error: error.message
            };
            this.results.tests.push(result);
            console.log('❌ Memory stability test failed');
            return false;
        }
    }

    async testHotReload() {
        console.log('🔍 Testing hot reload stability...');
        try {
            const fs = require('fs');
            const path = require('path');

            // Create a temporary test file
            const testFile = path.join(process.cwd(), 'src/components/test-stability.tsx');
            const testContent = `// Test file for stability - ${Date.now()}\nexport const TestStability = () => <div>Test</div>;\n`;

            fs.writeFileSync(testFile, testContent);

            // Wait for hot reload
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Test if server is still responsive
            const response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 10000 });

            // Clean up
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }

            const result = {
                test: 'Hot Reload Stability',
                status: response.status === 200 ? 'PASS' : 'FAIL',
                responseTime: 'N/A'
            };

            this.results.tests.push(result);
            console.log(`✅ Hot reload stability: Server remained responsive`);
            return true;

        } catch (error) {
            const result = {
                test: 'Hot Reload Stability',
                status: 'FAIL',
                error: error.message
            };
            this.results.tests.push(result);
            this.results.issues.push('Server became unresponsive during hot reload');
            console.log('❌ Hot reload stability test failed');
            return false;
        }
    }

    generateSummary() {
        const totalTests = this.results.tests.length;
        const passedTests = this.results.tests.filter(t => t.status === 'PASS').length;
        const failedTests = this.results.tests.filter(t => t.status === 'FAIL').length;
        const warnTests = this.results.tests.filter(t => t.status === 'WARN').length;

        const avgResponseTime = this.results.tests
            .filter(t => t.responseTime && typeof t.responseTime === 'number')
            .reduce((sum, t) => sum + t.responseTime, 0) /
            this.results.tests.filter(t => t.responseTime && typeof t.responseTime === 'number').length;

        this.results.summary = {
            totalTests,
            passedTests,
            failedTests,
            warnTests,
            successRate: Math.round((passedTests / totalTests) * 100) + '%',
            avgResponseTime: Math.round(avgResponseTime || 0) + 'ms',
            overallStatus: failedTests === 0 ? (warnTests === 0 ? 'STABLE' : 'STABLE_WITH_WARNINGS') : 'UNSTABLE'
        };

        // Add recommendations based on results
        if (this.results.summary.overallStatus === 'STABLE') {
            this.results.recommendations.push('Server is running optimally for development work');
        }

        if (avgResponseTime > 1000) {
            this.results.recommendations.push('Consider optimizing server configuration for better response times');
        }

        if (this.results.issues.length === 0) {
            this.results.recommendations.push('Current configuration is suitable for automated testing');
        }
    }

    printReport() {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 NEXT.JS DEVELOPMENT SERVER STABILITY REPORT');
        console.log('='.repeat(60));

        console.log(`\n📊 SUMMARY:`);
        console.log(`   Overall Status: ${this.results.summary.overallStatus}`);
        console.log(`   Success Rate: ${this.results.summary.successRate}`);
        console.log(`   Average Response Time: ${this.results.summary.avgResponseTime}`);
        console.log(`   Tests: ${this.results.summary.passedTests} passed, ${this.results.summary.failedTests} failed, ${this.results.summary.warnTests} warnings`);

        if (this.results.issues.length > 0) {
            console.log(`\n⚠️  ISSUES FOUND:`);
            this.results.issues.forEach((issue, i) => {
                console.log(`   ${i + 1}. ${issue}`);
            });
        }

        if (this.results.recommendations.length > 0) {
            console.log(`\n💡 RECOMMENDATIONS:`);
            this.results.recommendations.forEach((rec, i) => {
                console.log(`   ${i + 1}. ${rec}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log(`Report generated: ${new Date().toLocaleString()}`);
        console.log('='.repeat(60) + '\n');
    }

    async run() {
        console.log('🔧 Starting Next.js Development Server Stability Test...\n');

        const tests = [
            () => this.testBasicConnectivity(),
            () => this.testConcurrentRequests(),
            () => this.testPageLoading(),
            () => this.testMemoryStability(),
            () => this.testHotReload()
        ];

        for (const test of tests) {
            await test();
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.generateSummary();
        this.printReport();

        return this.results.summary.overallStatus === 'STABLE' ||
               this.results.summary.overallStatus === 'STABLE_WITH_WARNINGS';
    }
}

// Run the test if called directly
if (require.main === module) {
    const test = new ServerStabilityTest();
    test.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Test runner error:', error);
        process.exit(1);
    });
}

module.exports = ServerStabilityTest;

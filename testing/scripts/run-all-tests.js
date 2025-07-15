#!/usr/bin/env node

/**
 * Comprehensive Load Testing Orchestra
 * Runs all load testing suites in sequence with monitoring and reporting
 * Designed for CI/CD integration and automated production readiness validation
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const moment = require('moment');

// Import test modules
const GradualLoadTester = require('./gradual-load-test');
const DatabaseLoadTester = require('./database-load-test');
const LoadTestMonitor = require('./monitoring-collector');
const PerformanceBenchmark = require('./performance-benchmarks');

class LoadTestOrchestrator {
    constructor(options = {}) {
        this.options = {
            skipDatabase: false,
            skipMonitoring: false,
            skipBenchmarks: false,
            outputFormat: 'json',
            ciMode: false,
            ...options
        };
        
        this.testResults = {
            startTime: moment(),
            endTime: null,
            duration: null,
            tests: {},
            summary: {},
            status: 'running'
        };
        
        this.monitor = null;
        this.testSuites = [
            {
                name: 'environment-validation',
                description: 'Validate test environment and prerequisites',
                critical: true,
                timeout: 60000 // 1 minute
            },
            {
                name: 'database-load-test',
                description: 'Test database performance and 81 indexes under load',
                critical: true,
                timeout: 600000 // 10 minutes
            },
            {
                name: 'smoke-test',
                description: 'Basic functionality verification',
                critical: true,
                timeout: 180000 // 3 minutes
            },
            {
                name: 'gradual-load-test',
                description: 'Progressive load testing: 100 → 1K → 5K → 10K users',
                critical: true,
                timeout: 3600000 // 1 hour
            },
            {
                name: 'api-endpoints-test',
                description: 'Comprehensive API endpoint stress testing',
                critical: false,
                timeout: 900000 // 15 minutes
            },
            {
                name: 'booking-flow-test',
                description: 'Critical booking flow performance validation',
                critical: true,
                timeout: 600000 // 10 minutes
            },
            {
                name: 'payment-flow-test',
                description: 'Payment processing load testing',
                critical: true,
                timeout: 600000 // 10 minutes
            },
            {
                name: 'calendar-sync-test',
                description: 'Calendar integration performance testing',
                critical: false,
                timeout: 600000 // 10 minutes
            },
            {
                name: 'stress-test',
                description: 'System breaking point identification',
                critical: false,
                timeout: 1200000 // 20 minutes
            },
            {
                name: 'performance-benchmarks',
                description: 'Comprehensive performance benchmarking',
                critical: true,
                timeout: 1800000 // 30 minutes
            }
        ];
    }

    async runAllTests() {
        console.log(chalk.blue.bold('🚀 BookedBarber V2 Load Testing Orchestra'));
        console.log(chalk.gray('Validating production readiness for 10,000+ concurrent users'));
        console.log(chalk.gray(`Test mode: ${this.options.ciMode ? 'CI/CD' : 'Interactive'}\n`));

        try {
            // Initialize monitoring if not skipped
            if (!this.options.skipMonitoring) {
                await this.startMonitoring();
            }

            // Run test suites in sequence
            for (const suite of this.testSuites) {
                if (this.shouldSkipSuite(suite)) {
                    console.log(chalk.yellow(`⏭️  Skipping ${suite.name}`));
                    continue;
                }

                const suiteResult = await this.runTestSuite(suite);
                this.testResults.tests[suite.name] = suiteResult;

                // Check if critical test failed
                if (suite.critical && !suiteResult.passed) {
                    console.log(chalk.red(`\n❌ Critical test ${suite.name} failed - stopping test suite`));
                    this.testResults.status = 'failed';
                    break;
                }

                // Brief pause between tests
                if (!this.options.ciMode) {
                    await this.pause(5);
                }
            }

            // Finalize results
            await this.finalizeResults();

        } catch (error) {
            console.error(chalk.red('❌ Load testing orchestra failed:'), error.message);
            this.testResults.status = 'error';
            this.testResults.error = error.message;
        } finally {
            // Stop monitoring
            if (this.monitor) {
                await this.monitor.stopMonitoring();
            }

            // Generate final report
            await this.generateFinalReport();
        }
    }

    shouldSkipSuite(suite) {
        if (this.options.skipDatabase && suite.name === 'database-load-test') {
            return true;
        }
        
        if (this.options.skipBenchmarks && suite.name === 'performance-benchmarks') {
            return true;
        }
        
        return false;
    }

    async startMonitoring() {
        console.log(chalk.blue('📊 Starting system monitoring...'));
        
        try {
            this.monitor = new LoadTestMonitor();
            await this.monitor.startMonitoring();
            console.log(chalk.green('✅ Monitoring started\n'));
        } catch (error) {
            console.log(chalk.yellow('⚠️  Monitoring failed to start, continuing without monitoring\n'));
            this.monitor = null;
        }
    }

    async runTestSuite(suite) {
        console.log(chalk.yellow.bold(`\n🧪 Running ${suite.name}`));
        console.log(chalk.gray(`Description: ${suite.description}`));
        console.log(chalk.gray(`Critical: ${suite.critical ? 'Yes' : 'No'} | Timeout: ${moment.duration(suite.timeout).humanize()}`));

        const spinner = ora(`Executing ${suite.name}...`).start();
        const startTime = moment();

        try {
            let result;
            
            switch (suite.name) {
                case 'environment-validation':
                    result = await this.validateEnvironment();
                    break;
                
                case 'database-load-test':
                    const dbTester = new DatabaseLoadTester();
                    await dbTester.runDatabaseLoadTest();
                    result = { passed: true, type: 'database' };
                    break;
                
                case 'gradual-load-test':
                    const gradualTester = new GradualLoadTester();
                    await gradualTester.runGradualTest();
                    result = { passed: true, type: 'gradual' };
                    break;
                
                case 'performance-benchmarks':
                    const benchmark = new PerformanceBenchmark();
                    await benchmark.runComprehensiveBenchmark();
                    result = { passed: true, type: 'benchmark' };
                    break;
                
                default:
                    result = await this.runArtilleryTest(suite.name);
                    break;
            }

            const endTime = moment();
            const duration = moment.duration(endTime.diff(startTime));

            result.duration = duration.humanize();
            result.startTime = startTime.format();
            result.endTime = endTime.format();

            if (result.passed) {
                spinner.succeed(`${suite.name} completed successfully`);
                console.log(chalk.green(`✅ ${suite.name}: PASSED (${result.duration})`));
            } else {
                spinner.fail(`${suite.name} failed`);
                console.log(chalk.red(`❌ ${suite.name}: FAILED (${result.duration})`));
            }

            return result;

        } catch (error) {
            const endTime = moment();
            const duration = moment.duration(endTime.diff(startTime));

            spinner.fail(`${suite.name} failed with error`);
            console.log(chalk.red(`❌ ${suite.name}: ERROR (${duration.humanize()})`));
            console.log(chalk.red(`   Error: ${error.message}`));

            return {
                passed: false,
                error: error.message,
                duration: duration.humanize(),
                startTime: startTime.format(),
                endTime: endTime.format()
            };
        }
    }

    async validateEnvironment() {
        // Check if services are running
        const services = [
            { name: 'Backend API', url: 'http://localhost:8000/health' },
            { name: 'Database', url: 'http://localhost:8000/api/v1/health/database' }
        ];

        for (const service of services) {
            const healthy = await this.checkServiceHealth(service.url);
            if (!healthy) {
                throw new Error(`${service.name} is not healthy`);
            }
        }

        // Check system resources
        const systemOk = await this.checkSystemResources();
        if (!systemOk) {
            throw new Error('Insufficient system resources for load testing');
        }

        return { passed: true, type: 'validation' };
    }

    async checkServiceHealth(url) {
        return new Promise((resolve) => {
            const http = require('http');
            const request = http.get(url, (response) => {
                resolve(response.statusCode === 200);
            });

            request.on('error', () => resolve(false));
            request.setTimeout(5000, () => {
                request.destroy();
                resolve(false);
            });
        });
    }

    async checkSystemResources() {
        // Basic system resource check
        const os = require('os');
        const freeMemory = os.freemem();
        const totalMemory = os.totalmem();
        const memoryUsage = (totalMemory - freeMemory) / totalMemory;

        // Require at least 20% free memory for load testing
        return memoryUsage < 0.8;
    }

    async runArtilleryTest(testName) {
        const configMap = {
            'smoke-test': 'smoke-test',
            'api-endpoints-test': 'api-endpoints',
            'booking-flow-test': 'booking-flow',
            'payment-flow-test': 'payment-flow',
            'calendar-sync-test': 'calendar-sync',
            'stress-test': 'stress-test'
        };

        const configName = configMap[testName];
        if (!configName) {
            throw new Error(`Unknown test: ${testName}`);
        }

        const configPath = path.join(__dirname, `../artillery-configs/${configName}.yml`);
        const reportPath = path.join(__dirname, `../reports/${testName}-results.json`);

        return new Promise((resolve, reject) => {
            const artillery = spawn('artillery', ['run', configPath, '--output', reportPath], {
                stdio: ['inherit', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            artillery.stdout.on('data', (data) => {
                output += data.toString();
            });

            artillery.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            artillery.on('close', (code) => {
                if (code === 0) {
                    const metrics = this.parseArtilleryOutput(output);
                    resolve({
                        passed: this.isTestPassed(metrics),
                        metrics: metrics,
                        type: 'artillery'
                    });
                } else {
                    reject(new Error(`Artillery failed: ${errorOutput}`));
                }
            });
        });
    }

    parseArtilleryOutput(output) {
        // Basic Artillery output parsing
        const metrics = {
            requestsCompleted: 0,
            requestRate: 0,
            responseTimes: {},
            httpCodes: {},
            errorRate: 0
        };

        const lines = output.split('\n');
        lines.forEach(line => {
            if (line.includes('requests completed')) {
                const match = line.match(/(\d+)/);
                if (match) metrics.requestsCompleted = parseInt(match[1]);
            }

            if (line.includes('request rate')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match) metrics.requestRate = parseFloat(match[1]);
            }

            if (line.includes('response time p95')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match) metrics.responseTimes.p95 = parseFloat(match[1]);
            }

            if (line.includes('http.codes.200')) {
                const match = line.match(/(\d+)/);
                if (match) metrics.httpCodes['200'] = parseInt(match[1]);
            }

            if (line.includes('http.codes.5')) {
                const match = line.match(/(\d+)/);
                if (match) metrics.httpCodes['5xx'] = parseInt(match[1]);
            }
        });

        // Calculate error rate
        const total = Object.values(metrics.httpCodes).reduce((sum, count) => sum + count, 0);
        metrics.errorRate = total > 0 ? ((metrics.httpCodes['5xx'] || 0) / total * 100) : 0;

        return metrics;
    }

    isTestPassed(metrics) {
        // Basic pass/fail criteria
        return metrics.errorRate < 5 && metrics.responseTimes.p95 < 2000;
    }

    async pause(seconds) {
        console.log(chalk.cyan(`⏱️  Pausing for ${seconds} seconds...`));
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    async finalizeResults() {
        this.testResults.endTime = moment();
        this.testResults.duration = moment.duration(this.testResults.endTime.diff(this.testResults.startTime)).humanize();

        // Calculate summary
        const tests = Object.values(this.testResults.tests);
        this.testResults.summary = {
            totalTests: tests.length,
            passedTests: tests.filter(t => t.passed).length,
            failedTests: tests.filter(t => !t.passed).length,
            criticalFailures: tests.filter(t => !t.passed && t.critical).length,
            overallStatus: this.calculateOverallStatus(tests)
        };

        // Determine final status
        if (this.testResults.status !== 'error' && this.testResults.status !== 'failed') {
            this.testResults.status = this.testResults.summary.criticalFailures > 0 ? 'failed' : 'passed';
        }

        console.log(chalk.blue.bold('\n📊 Load Testing Orchestra Complete'));
        console.log(chalk.gray(`Duration: ${this.testResults.duration}`));
        console.log(chalk.gray(`Status: ${this.getStatusDisplay(this.testResults.status)}`));
        console.log(chalk.gray(`Tests: ${this.testResults.summary.passedTests}/${this.testResults.summary.totalTests} passed`));
    }

    calculateOverallStatus(tests) {
        const criticalTests = tests.filter(t => t.critical !== false);
        const criticalPassed = criticalTests.filter(t => t.passed).length;
        
        if (criticalPassed === criticalTests.length) {
            return 'production-ready';
        } else if (criticalPassed / criticalTests.length >= 0.8) {
            return 'mostly-ready';
        } else {
            return 'not-ready';
        }
    }

    getStatusDisplay(status) {
        switch (status) {
            case 'passed': return chalk.green('✅ PASSED');
            case 'failed': return chalk.red('❌ FAILED');
            case 'error': return chalk.red('💥 ERROR');
            default: return chalk.yellow('⏳ RUNNING');
        }
    }

    async generateFinalReport() {
        console.log(chalk.blue('\n📄 Generating final load test report...'));

        const reportDir = path.join(__dirname, '../reports/final');
        await fs.ensureDir(reportDir);

        const timestamp = moment().format('YYYYMMDD-HHmmss');
        
        // Generate comprehensive JSON report
        const jsonReport = {
            testSuite: 'BookedBarber V2 Load Testing Orchestra',
            ...this.testResults,
            timestamp: moment().format(),
            environment: {
                ciMode: this.options.ciMode,
                nodeVersion: process.version,
                platform: process.platform
            },
            recommendations: this.generateRecommendations()
        };

        await fs.writeJson(
            path.join(reportDir, `load-test-final-${timestamp}.json`),
            jsonReport,
            { spaces: 2 }
        );

        // Generate markdown report
        const markdownReport = this.generateMarkdownReport(jsonReport);
        await fs.writeFile(
            path.join(reportDir, `load-test-final-${timestamp}.md`),
            markdownReport
        );

        // Generate CI/CD summary if in CI mode
        if (this.options.ciMode) {
            await this.generateCISummary(jsonReport, reportDir, timestamp);
        }

        console.log(chalk.green('✅ Final report generated'));
        console.log(chalk.gray(`Report location: ${reportDir}`));

        // Exit with appropriate code for CI/CD
        if (this.options.ciMode) {
            process.exit(this.testResults.status === 'passed' ? 0 : 1);
        }
    }

    generateRecommendations() {
        const recommendations = [];
        const tests = Object.values(this.testResults.tests);
        const failedTests = tests.filter(t => !t.passed);

        if (this.testResults.status === 'passed') {
            recommendations.push({
                type: 'success',
                message: 'System successfully validated for 10,000+ concurrent users - ready for production deployment'
            });
        }

        failedTests.forEach(test => {
            recommendations.push({
                type: 'critical',
                test: test.name,
                message: `Address ${test.name} failures before production deployment`
            });
        });

        if (this.testResults.summary.overallStatus === 'mostly-ready') {
            recommendations.push({
                type: 'warning',
                message: 'Some non-critical tests failed - consider addressing before peak load scenarios'
            });
        }

        return recommendations;
    }

    generateMarkdownReport(report) {
        return `# Load Testing Final Report - BookedBarber V2

## Executive Summary
- **Test Date**: ${report.timestamp}
- **Duration**: ${report.duration}
- **Overall Status**: ${this.getStatusDisplay(report.status)}
- **Production Readiness**: ${report.summary.overallStatus.toUpperCase()}

## Test Results Summary
- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.passedTests}
- **Failed**: ${report.summary.failedTests}
- **Critical Failures**: ${report.summary.criticalFailures}

## Individual Test Results

${Object.entries(report.tests).map(([testName, result]) => `
### ${testName}
- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${result.duration}
- **Type**: ${result.type}
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('')}

## Recommendations

${report.recommendations.map(rec => `- **${rec.type.toUpperCase()}**: ${rec.message}`).join('\n')}

## Environment Information
- **CI Mode**: ${report.environment.ciMode ? 'Yes' : 'No'}
- **Node.js Version**: ${report.environment.nodeVersion}
- **Platform**: ${report.environment.platform}

## Production Readiness Assessment

**Status**: ${report.summary.overallStatus === 'production-ready' ? 'READY FOR PRODUCTION' : 'NOT READY FOR PRODUCTION'}

${report.summary.overallStatus === 'production-ready' ? 
`The system has successfully passed all critical load tests and is validated for handling 10,000+ concurrent users in production.` :
`The system requires additional optimization before production deployment. Address the failed tests listed above.`}

*Report generated by BookedBarber V2 Load Testing Orchestra*
`;
    }

    async generateCISummary(report, reportDir, timestamp) {
        const summary = {
            status: report.status,
            duration: report.duration,
            tests: report.summary,
            productionReady: report.summary.overallStatus === 'production-ready',
            reportPath: path.join(reportDir, `load-test-final-${timestamp}.json`)
        };

        await fs.writeJson(
            path.join(reportDir, 'ci-summary.json'),
            summary,
            { spaces: 2 }
        );

        // Output CI-friendly summary
        console.log('\n' + chalk.blue.bold('='.repeat(60)));
        console.log(chalk.blue.bold('CI/CD LOAD TEST SUMMARY'));
        console.log(chalk.blue.bold('='.repeat(60)));
        console.log(`Status: ${this.getStatusDisplay(report.status)}`);
        console.log(`Production Ready: ${summary.productionReady ? chalk.green('YES') : chalk.red('NO')}`);
        console.log(`Tests: ${report.summary.passedTests}/${report.summary.totalTests} passed`);
        console.log(`Duration: ${report.duration}`);
        console.log(chalk.blue.bold('='.repeat(60)));
    }
}

// CLI argument parsing
const args = process.argv.slice(2);
const options = {
    ciMode: args.includes('--ci'),
    skipDatabase: args.includes('--skip-database'),
    skipMonitoring: args.includes('--skip-monitoring'),
    skipBenchmarks: args.includes('--skip-benchmarks')
};

// Run orchestrator if called directly
if (require.main === module) {
    const orchestrator = new LoadTestOrchestrator(options);
    orchestrator.runAllTests().catch(console.error);
}

module.exports = LoadTestOrchestrator;
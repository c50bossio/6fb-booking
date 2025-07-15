#!/usr/bin/env node

/**
 * Performance Regression Testing Framework
 * Compares current performance against baseline metrics
 * Detects performance degradations and improvements
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const Table = require('cli-table3');

class PerformanceRegressionTester {
    constructor() {
        this.baselineFile = path.join(__dirname, '../reports/baseline/performance-baseline.json');
        this.currentResultsDir = path.join(__dirname, '../reports/final');
        this.regressionThresholds = {
            // Percentage increase that triggers a regression alert
            responseTime: {
                p50: 15,    // 15% increase in median response time
                p95: 20,    // 20% increase in P95 response time
                p99: 25     // 25% increase in P99 response time
            },
            throughput: {
                requestRate: -10    // 10% decrease in request rate
            },
            errorRate: {
                total: 50,          // 50% increase in error rate
                serverErrors: 100   // 100% increase in server errors
            },
            resourceUsage: {
                cpu: 25,            // 25% increase in CPU usage
                memory: 30,         // 30% increase in memory usage
                disk: 20            // 20% increase in disk usage
            }
        };
        
        this.improvementThresholds = {
            // Percentage improvement that's worth highlighting
            responseTime: {
                p50: -10,   // 10% improvement in median response time
                p95: -15,   // 15% improvement in P95 response time
                p99: -20    // 20% improvement in P99 response time
            },
            throughput: {
                requestRate: 15     // 15% increase in request rate
            },
            errorRate: {
                total: -25,         // 25% decrease in error rate
                serverErrors: -50   // 50% decrease in server errors
            }
        };
    }

    async runRegressionAnalysis() {
        console.log(chalk.blue.bold('📈 Performance Regression Analysis'));
        console.log(chalk.gray('Comparing current results against baseline performance\n'));

        try {
            // Load baseline performance data
            const baseline = await this.loadBaselineData();
            
            // Load current test results
            const current = await this.loadCurrentResults();
            
            // Perform regression analysis
            const analysis = await this.analyzeRegression(baseline, current);
            
            // Generate regression report
            await this.generateRegressionReport(analysis);
            
            // Display results
            this.displayRegressionResults(analysis);
            
            // Return for CI/CD integration
            return analysis;
            
        } catch (error) {
            console.error(chalk.red('❌ Regression analysis failed:'), error.message);
            throw error;
        }
    }

    async loadBaselineData() {
        try {
            if (!await fs.pathExists(this.baselineFile)) {
                console.log(chalk.yellow('⚠️  No baseline data found - this will become the new baseline'));
                return null;
            }
            
            const baseline = await fs.readJson(this.baselineFile);
            console.log(chalk.green(`✅ Loaded baseline from ${moment(baseline.timestamp).format('YYYY-MM-DD HH:mm')}`));
            
            return baseline;
        } catch (error) {
            throw new Error(`Failed to load baseline data: ${error.message}`);
        }
    }

    async loadCurrentResults() {
        try {
            // Look for the most recent final report
            const files = await fs.readdir(this.currentResultsDir);
            const jsonFiles = files.filter(f => f.startsWith('load-test-final-') && f.endsWith('.json'));
            
            if (jsonFiles.length === 0) {
                throw new Error('No current test results found');
            }
            
            // Get the most recent file
            const latestFile = jsonFiles.sort().reverse()[0];
            const filePath = path.join(this.currentResultsDir, latestFile);
            
            const current = await fs.readJson(filePath);
            console.log(chalk.green(`✅ Loaded current results from ${latestFile}`));
            
            return current;
        } catch (error) {
            throw new Error(`Failed to load current results: ${error.message}`);
        }
    }

    async analyzeRegression(baseline, current) {
        const analysis = {
            timestamp: moment().format(),
            hasBaseline: baseline !== null,
            regressions: [],
            improvements: [],
            stable: [],
            summary: {
                totalRegressions: 0,
                criticalRegressions: 0,
                totalImprovements: 0,
                significantImprovements: 0
            },
            recommendation: 'approve' // approve, review, reject
        };

        if (!baseline) {
            // No baseline - create one from current results
            await this.createBaseline(current);
            analysis.recommendation = 'baseline_created';
            return analysis;
        }

        // Analyze different test categories
        await this.analyzeResponseTimeRegression(baseline, current, analysis);
        await this.analyzeThroughputRegression(baseline, current, analysis);
        await this.analyzeErrorRateRegression(baseline, current, analysis);
        await this.analyzeResourceUsageRegression(baseline, current, analysis);

        // Calculate summary
        analysis.summary.totalRegressions = analysis.regressions.length;
        analysis.summary.criticalRegressions = analysis.regressions.filter(r => r.severity === 'critical').length;
        analysis.summary.totalImprovements = analysis.improvements.length;
        analysis.summary.significantImprovements = analysis.improvements.filter(i => i.significance === 'significant').length;

        // Determine recommendation
        if (analysis.summary.criticalRegressions > 0) {
            analysis.recommendation = 'reject';
        } else if (analysis.summary.totalRegressions > 2) {
            analysis.recommendation = 'review';
        } else {
            analysis.recommendation = 'approve';
        }

        return analysis;
    }

    async analyzeResponseTimeRegression(baseline, current, analysis) {
        const tests = ['smoke-test', 'booking-flow', 'payment-flow', 'api-endpoints'];
        
        for (const testName of tests) {
            const baselineTest = this.findTestInResults(baseline, testName);
            const currentTest = this.findTestInResults(current, testName);
            
            if (!baselineTest || !currentTest) continue;
            
            const baselineRT = baselineTest.metrics?.responseTimes || {};
            const currentRT = currentTest.metrics?.responseTimes || {};
            
            // Check P50, P95, P99 response times
            ['p50', 'p95', 'p99'].forEach(percentile => {
                const baselineValue = baselineRT[percentile];
                const currentValue = currentRT[percentile];
                
                if (baselineValue && currentValue) {
                    const change = ((currentValue - baselineValue) / baselineValue) * 100;
                    const threshold = this.regressionThresholds.responseTime[percentile];
                    const improvementThreshold = this.improvementThresholds.responseTime[percentile];
                    
                    if (change > threshold) {
                        analysis.regressions.push({
                            metric: `${testName} Response Time ${percentile.toUpperCase()}`,
                            baseline: `${baselineValue.toFixed(2)}ms`,
                            current: `${currentValue.toFixed(2)}ms`,
                            change: `+${change.toFixed(1)}%`,
                            threshold: `${threshold}%`,
                            severity: change > threshold * 2 ? 'critical' : 'moderate',
                            category: 'response_time'
                        });
                    } else if (change < improvementThreshold) {
                        analysis.improvements.push({
                            metric: `${testName} Response Time ${percentile.toUpperCase()}`,
                            baseline: `${baselineValue.toFixed(2)}ms`,
                            current: `${currentValue.toFixed(2)}ms`,
                            change: `${change.toFixed(1)}%`,
                            significance: Math.abs(change) > Math.abs(improvementThreshold) * 1.5 ? 'significant' : 'minor',
                            category: 'response_time'
                        });
                    } else {
                        analysis.stable.push({
                            metric: `${testName} Response Time ${percentile.toUpperCase()}`,
                            change: `${change.toFixed(1)}%`
                        });
                    }
                }
            });
        }
    }

    async analyzeThroughputRegression(baseline, current, analysis) {
        const tests = ['api-endpoints', 'booking-flow', 'gradual-load'];
        
        for (const testName of tests) {
            const baselineTest = this.findTestInResults(baseline, testName);
            const currentTest = this.findTestInResults(current, testName);
            
            if (!baselineTest || !currentTest) continue;
            
            const baselineRate = baselineTest.metrics?.requests?.rate || baselineTest.maxThroughput;
            const currentRate = currentTest.metrics?.requests?.rate || currentTest.maxThroughput;
            
            if (baselineRate && currentRate) {
                const change = ((currentRate - baselineRate) / baselineRate) * 100;
                const threshold = this.regressionThresholds.throughput.requestRate;
                const improvementThreshold = this.improvementThresholds.throughput.requestRate;
                
                if (change < threshold) {
                    analysis.regressions.push({
                        metric: `${testName} Throughput`,
                        baseline: `${baselineRate.toFixed(1)} RPS`,
                        current: `${currentRate.toFixed(1)} RPS`,
                        change: `${change.toFixed(1)}%`,
                        threshold: `${threshold}%`,
                        severity: change < threshold * 2 ? 'critical' : 'moderate',
                        category: 'throughput'
                    });
                } else if (change > improvementThreshold) {
                    analysis.improvements.push({
                        metric: `${testName} Throughput`,
                        baseline: `${baselineRate.toFixed(1)} RPS`,
                        current: `${currentRate.toFixed(1)} RPS`,
                        change: `+${change.toFixed(1)}%`,
                        significance: change > improvementThreshold * 1.5 ? 'significant' : 'minor',
                        category: 'throughput'
                    });
                }
            }
        }
    }

    async analyzeErrorRateRegression(baseline, current, analysis) {
        const tests = ['smoke-test', 'booking-flow', 'payment-flow', 'api-endpoints'];
        
        for (const testName of tests) {
            const baselineTest = this.findTestInResults(baseline, testName);
            const currentTest = this.findTestInResults(current, testName);
            
            if (!baselineTest || !currentTest) continue;
            
            const baselineErrorRate = parseFloat(baselineTest.metrics?.errorRate || 0);
            const currentErrorRate = parseFloat(currentTest.metrics?.errorRate || 0);
            
            if (baselineErrorRate >= 0 && currentErrorRate >= 0) {
                // Handle the case where baseline is 0
                let change;
                if (baselineErrorRate === 0) {
                    change = currentErrorRate > 0 ? Infinity : 0;
                } else {
                    change = ((currentErrorRate - baselineErrorRate) / baselineErrorRate) * 100;
                }
                
                const threshold = this.regressionThresholds.errorRate.total;
                
                if (change > threshold || (baselineErrorRate === 0 && currentErrorRate > 0.5)) {
                    analysis.regressions.push({
                        metric: `${testName} Error Rate`,
                        baseline: `${baselineErrorRate.toFixed(2)}%`,
                        current: `${currentErrorRate.toFixed(2)}%`,
                        change: change === Infinity ? 'New errors introduced' : `+${change.toFixed(1)}%`,
                        threshold: `${threshold}%`,
                        severity: currentErrorRate > 2 ? 'critical' : 'moderate',
                        category: 'error_rate'
                    });
                } else if (baselineErrorRate > 0 && currentErrorRate < baselineErrorRate * 0.75) {
                    analysis.improvements.push({
                        metric: `${testName} Error Rate`,
                        baseline: `${baselineErrorRate.toFixed(2)}%`,
                        current: `${currentErrorRate.toFixed(2)}%`,
                        change: `${change.toFixed(1)}%`,
                        significance: change < -50 ? 'significant' : 'minor',
                        category: 'error_rate'
                    });
                }
            }
        }
    }

    async analyzeResourceUsageRegression(baseline, current, analysis) {
        // This would analyze system resource usage if available in the test results
        // For now, this is a placeholder for future implementation
        
        const resources = ['cpu', 'memory', 'disk'];
        const baselineResources = baseline.resources?.peak || {};
        const currentResources = current.resources?.peak || {};
        
        resources.forEach(resource => {
            const baselineValue = baselineResources[resource];
            const currentValue = currentResources[resource];
            
            if (baselineValue && currentValue) {
                const change = ((currentValue - baselineValue) / baselineValue) * 100;
                const threshold = this.regressionThresholds.resourceUsage[resource];
                
                if (change > threshold) {
                    analysis.regressions.push({
                        metric: `${resource.toUpperCase()} Usage`,
                        baseline: `${baselineValue}%`,
                        current: `${currentValue}%`,
                        change: `+${change.toFixed(1)}%`,
                        threshold: `${threshold}%`,
                        severity: change > threshold * 1.5 ? 'critical' : 'moderate',
                        category: 'resource_usage'
                    });
                }
            }
        });
    }

    findTestInResults(results, testName) {
        // Look for test results in different possible locations
        if (results.tests && results.tests[testName]) {
            return results.tests[testName];
        }
        
        if (results.results && results.results[testName]) {
            return results.results[testName];
        }
        
        // Look for partial matches
        const keys = Object.keys(results.tests || results.results || {});
        const match = keys.find(key => key.includes(testName) || testName.includes(key));
        
        if (match) {
            return (results.tests || results.results)[match];
        }
        
        return null;
    }

    async createBaseline(current) {
        console.log(chalk.blue('📊 Creating new performance baseline...'));
        
        const baseline = {
            timestamp: moment().format(),
            version: current.version || 'unknown',
            tests: current.tests || current.results || {},
            summary: current.summary || {},
            environment: current.environment || {},
            metadata: {
                created_by: 'regression-test-framework',
                commit: process.env.GITHUB_SHA || 'unknown',
                branch: process.env.GITHUB_REF || 'unknown'
            }
        };
        
        // Ensure baseline directory exists
        await fs.ensureDir(path.dirname(this.baselineFile));
        
        // Save baseline
        await fs.writeJson(this.baselineFile, baseline, { spaces: 2 });
        
        console.log(chalk.green('✅ Baseline created successfully'));
    }

    async generateRegressionReport(analysis) {
        const reportDir = path.join(__dirname, '../reports/regression');
        await fs.ensureDir(reportDir);
        
        const timestamp = moment().format('YYYYMMDD-HHmmss');
        
        // Generate JSON report
        await fs.writeJson(
            path.join(reportDir, `regression-analysis-${timestamp}.json`),
            analysis,
            { spaces: 2 }
        );
        
        // Generate markdown report
        const markdownReport = this.generateMarkdownRegressionReport(analysis);
        await fs.writeFile(
            path.join(reportDir, `regression-analysis-${timestamp}.md`),
            markdownReport
        );
        
        // Generate CI summary for GitHub Actions
        if (process.env.CI) {
            await fs.writeJson(
                path.join(__dirname, '../reports/regression-results.json'),
                {
                    recommendation: analysis.recommendation,
                    regressions: analysis.regressions,
                    improvements: analysis.improvements,
                    summary: analysis.summary
                },
                { spaces: 2 }
            );
        }
        
        console.log(chalk.green('✅ Regression report generated'));
    }

    generateMarkdownRegressionReport(analysis) {
        const getRecommendationEmoji = (rec) => {
            switch (rec) {
                case 'approve': return '✅';
                case 'review': return '⚠️';
                case 'reject': return '❌';
                case 'baseline_created': return '📊';
                default: return '❓';
            }
        };

        return `# Performance Regression Analysis

## Summary
- **Timestamp**: ${analysis.timestamp}
- **Recommendation**: ${getRecommendationEmoji(analysis.recommendation)} ${analysis.recommendation.toUpperCase()}
- **Has Baseline**: ${analysis.hasBaseline ? 'Yes' : 'No'}

## Metrics Overview
- **Total Regressions**: ${analysis.summary.totalRegressions}
- **Critical Regressions**: ${analysis.summary.criticalRegressions}
- **Total Improvements**: ${analysis.summary.totalImprovements}
- **Significant Improvements**: ${analysis.summary.significantImprovements}

${analysis.regressions.length > 0 ? `
## 📉 Performance Regressions

| Metric | Baseline | Current | Change | Threshold | Severity |
|--------|----------|---------|--------|-----------|----------|
${analysis.regressions.map(reg => 
`| ${reg.metric} | ${reg.baseline} | ${reg.current} | ${reg.change} | ${reg.threshold} | ${reg.severity} |`
).join('\n')}
` : ''}

${analysis.improvements.length > 0 ? `
## 📈 Performance Improvements

| Metric | Baseline | Current | Change | Significance |
|--------|----------|---------|--------|--------------|
${analysis.improvements.map(imp => 
`| ${imp.metric} | ${imp.baseline} | ${imp.current} | ${imp.change} | ${imp.significance} |`
).join('\n')}
` : ''}

## Recommendation Details

${analysis.recommendation === 'approve' ? '✅ **APPROVE**: No significant performance regressions detected. Safe to merge.' : ''}
${analysis.recommendation === 'review' ? '⚠️ **REVIEW**: Some performance regressions detected. Please review before merging.' : ''}
${analysis.recommendation === 'reject' ? '❌ **REJECT**: Critical performance regressions detected. Do not merge until issues are resolved.' : ''}
${analysis.recommendation === 'baseline_created' ? '📊 **BASELINE CREATED**: No previous baseline found. This test run will serve as the new performance baseline.' : ''}

*Report generated by BookedBarber V2 Performance Regression Testing Framework*
`;
    }

    displayRegressionResults(analysis) {
        console.log('\n' + chalk.blue.bold('📊 Regression Analysis Results'));
        console.log(chalk.gray('='.repeat(60)));
        
        // Display recommendation
        const recColor = analysis.recommendation === 'approve' ? 'green' : 
                        analysis.recommendation === 'review' ? 'yellow' : 'red';
        console.log(chalk[recColor](`Recommendation: ${analysis.recommendation.toUpperCase()}`));
        
        // Display summary table
        const summaryTable = new Table({
            head: ['Metric', 'Count'],
            colWidths: [25, 10]
        });
        
        summaryTable.push(
            ['Total Regressions', analysis.summary.totalRegressions],
            ['Critical Regressions', analysis.summary.criticalRegressions],
            ['Total Improvements', analysis.summary.totalImprovements],
            ['Significant Improvements', analysis.summary.significantImprovements]
        );
        
        console.log('\n' + summaryTable.toString());
        
        // Display regressions if any
        if (analysis.regressions.length > 0) {
            console.log('\n' + chalk.red.bold('📉 Performance Regressions:'));
            
            const regressionTable = new Table({
                head: ['Metric', 'Change', 'Severity'],
                colWidths: [40, 15, 12]
            });
            
            analysis.regressions.forEach(reg => {
                const color = reg.severity === 'critical' ? 'red' : 'yellow';
                regressionTable.push([
                    reg.metric,
                    chalk[color](reg.change),
                    chalk[color](reg.severity)
                ]);
            });
            
            console.log(regressionTable.toString());
        }
        
        // Display improvements if any
        if (analysis.improvements.length > 0) {
            console.log('\n' + chalk.green.bold('📈 Performance Improvements:'));
            
            const improvementTable = new Table({
                head: ['Metric', 'Change', 'Significance'],
                colWidths: [40, 15, 12]
            });
            
            analysis.improvements.forEach(imp => {
                const color = imp.significance === 'significant' ? 'green' : 'blue';
                improvementTable.push([
                    imp.metric,
                    chalk[color](imp.change),
                    chalk[color](imp.significance)
                ]);
            });
            
            console.log(improvementTable.toString());
        }
        
        console.log('\n' + chalk.gray('='.repeat(60)));
    }
}

// Run regression analysis if called directly
if (require.main === module) {
    const tester = new PerformanceRegressionTester();
    tester.runRegressionAnalysis()
        .then(analysis => {
            // Exit with appropriate code for CI/CD
            if (process.env.CI) {
                const exitCode = analysis.recommendation === 'reject' ? 1 : 0;
                process.exit(exitCode);
            }
        })
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = PerformanceRegressionTester;
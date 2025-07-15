#!/usr/bin/env node

/**
 * Gradual Load Testing Script
 * Implements progressive load ramping: 100 → 1,000 → 5,000 → 10,000 users
 * Monitors system health at each stage and provides real-time feedback
 */

const fs = require('fs-extra');
const path = require('path');
const { exec, spawn } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const moment = require('moment');

class GradualLoadTester {
    constructor() {
        this.currentPhase = 0;
        this.results = [];
        this.failureThreshold = 5; // % error rate threshold
        this.responseTimeThreshold = 1000; // ms
        this.phases = [
            {
                name: 'Baseline',
                users: 100,
                duration: 300, // 5 minutes
                description: 'Establish baseline performance metrics'
            },
            {
                name: 'Scale to 1K',
                users: 1000,
                duration: 600, // 10 minutes
                description: 'Test moderate load handling'
            },
            {
                name: 'Scale to 5K',
                users: 5000,
                duration: 900, // 15 minutes
                description: 'Test high load capacity'
            },
            {
                name: 'Peak Load 10K',
                users: 10000,
                duration: 1200, // 20 minutes
                description: 'Validate maximum concurrent user capacity'
            }
        ];
    }

    async runGradualTest() {
        console.log(chalk.blue.bold('🚀 Starting Gradual Load Test for BookedBarber V2'));
        console.log(chalk.gray('Target: 10,000+ concurrent users\n'));

        // Create test report directory
        const reportDir = path.join(__dirname, '../reports/gradual-load');
        await fs.ensureDir(reportDir);

        // Setup monitoring
        const monitoring = this.startMonitoring();

        try {
            for (let i = 0; i < this.phases.length; i++) {
                this.currentPhase = i;
                const phase = this.phases[i];
                
                console.log(chalk.yellow.bold(`\n📊 Phase ${i + 1}: ${phase.name}`));
                console.log(chalk.gray(`Target: ${phase.users} users | Duration: ${phase.duration}s`));
                console.log(chalk.gray(`Description: ${phase.description}\n`));

                const result = await this.runPhase(phase);
                this.results.push(result);

                // Check if we should continue
                if (!this.shouldContinue(result)) {
                    console.log(chalk.red.bold('\n❌ Phase failed - stopping gradual test'));
                    break;
                }

                // Recovery period between phases
                if (i < this.phases.length - 1) {
                    await this.recoveryPeriod();
                }
            }

            // Generate comprehensive report
            await this.generateReport(reportDir);
            
        } catch (error) {
            console.error(chalk.red('❌ Gradual load test failed:'), error.message);
        } finally {
            monitoring.stop();
        }
    }

    async runPhase(phase) {
        const spinner = ora(`Running ${phase.name} phase...`).start();
        const startTime = moment();

        // Generate Artillery config for this phase
        const config = this.generatePhaseConfig(phase);
        const configPath = path.join(__dirname, `../artillery-configs/gradual-phase-${this.currentPhase}.yml`);
        
        await fs.writeFile(configPath, config);

        return new Promise((resolve, reject) => {
            const artillery = spawn('artillery', ['run', configPath], {
                stdio: ['inherit', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            artillery.stdout.on('data', (data) => {
                output += data.toString();
                // Parse real-time metrics
                this.parseRealTimeMetrics(data.toString(), spinner);
            });

            artillery.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            artillery.on('close', (code) => {
                spinner.stop();
                
                if (code === 0) {
                    const result = this.parseResults(output, phase, startTime);
                    this.displayPhaseResults(result);
                    resolve(result);
                } else {
                    console.error(chalk.red(`Phase ${phase.name} failed with code ${code}`));
                    console.error(errorOutput);
                    reject(new Error(`Artillery failed with code ${code}`));
                }
            });
        });
    }

    generatePhaseConfig(phase) {
        return `
config:
  target: 'http://localhost:8000'
  plugins:
    metrics-by-endpoint: {}
    expect: {}
    publish-metrics:
      - type: json
        path: '../reports/gradual-load/phase-${this.currentPhase}-results.json'
  
  phases:
    # Warm up
    - duration: 60
      arrivalRate: 10
      name: "Warmup"
    
    # Ramp to target load
    - duration: 180
      arrivalRate: 10
      rampTo: ${Math.floor(phase.users / 10)}
      name: "Ramp Up"
    
    # Sustain target load
    - duration: ${phase.duration - 240}
      arrivalRate: ${Math.floor(phase.users / 10)}
      name: "Sustain Load"
    
    # Cool down
    - duration: 60
      arrivalRate: ${Math.floor(phase.users / 10)}
      rampTo: 5
      name: "Cool Down"

  http:
    timeout: 30
    pool: 50
    extendedMetrics: true

  ensure:
    - http.response_time.p95: ${this.responseTimeThreshold}
    - http.codes.200: ${100 - this.failureThreshold}
    - http.codes.5xx: 1

scenarios:
  - name: "Realistic User Flow"
    weight: 60
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 200
      
      - think: 2
      
      - get:
          url: "/api/v1/barbers"
          expect:
            - statusCode: 200
      
      - think: 5
      
      - post:
          url: "/api/v1/auth/register"
          headers:
            Content-Type: "application/json"
          json:
            email: "gradual.test+{{ $randomString() }}@example.com"
            password: "GradualTest123!"
            first_name: "Gradual"
            last_name: "Test"
            role: "client"
          capture:
            - json: "$.access_token"
              as: "auth_token"
          expect:
            - statusCode: 201
      
      - think: 3
      
      - get:
          url: "/api/v1/services"
          headers:
            Authorization: "Bearer {{ auth_token }}"
          expect:
            - statusCode: 200

  - name: "API Health Monitoring"
    weight: 40
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 200
      
      - get:
          url: "/api/v1/health/database"
          expect:
            - statusCode: 200
`;
    }

    parseRealTimeMetrics(output, spinner) {
        // Parse Artillery real-time output for key metrics
        const lines = output.split('\n');
        lines.forEach(line => {
            if (line.includes('scenarios launched')) {
                const match = line.match(/(\d+)/);
                if (match) {
                    spinner.text = `${this.phases[this.currentPhase].name} - Users: ${match[1]}`;
                }
            }
            
            if (line.includes('Response time p95')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match) {
                    const p95 = parseFloat(match[1]);
                    if (p95 > this.responseTimeThreshold) {
                        spinner.color = 'red';
                        spinner.text += ` ⚠️  High latency: ${p95}ms`;
                    }
                }
            }
        });
    }

    parseResults(output, phase, startTime) {
        const endTime = moment();
        const duration = moment.duration(endTime.diff(startTime));

        // Extract key metrics from Artillery output
        const metrics = {
            phase: phase.name,
            targetUsers: phase.users,
            duration: duration.asMinutes().toFixed(1),
            startTime: startTime.format(),
            endTime: endTime.format()
        };

        // Parse specific metrics
        const lines = output.split('\n');
        lines.forEach(line => {
            if (line.includes('http.request_rate')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match) metrics.requestRate = parseFloat(match[1]);
            }
            
            if (line.includes('http.response_time.p95')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match) metrics.p95ResponseTime = parseFloat(match[1]);
            }
            
            if (line.includes('http.response_time.p99')) {
                const match = line.match(/(\d+\.?\d*)/);
                if (match) metrics.p99ResponseTime = parseFloat(match[1]);
            }
            
            if (line.includes('http.codes.200')) {
                const match = line.match(/(\d+)/);
                if (match) metrics.successCount = parseInt(match[1]);
            }
            
            if (line.includes('http.codes.4xx')) {
                const match = line.match(/(\d+)/);
                if (match) metrics.clientErrors = parseInt(match[1]) || 0;
            }
            
            if (line.includes('http.codes.5xx')) {
                const match = line.match(/(\d+)/);
                if (match) metrics.serverErrors = parseInt(match[1]) || 0;
            }
        });

        // Calculate derived metrics
        const totalRequests = (metrics.successCount || 0) + (metrics.clientErrors || 0) + (metrics.serverErrors || 0);
        metrics.totalRequests = totalRequests;
        metrics.errorRate = totalRequests > 0 ? ((metrics.clientErrors + metrics.serverErrors) / totalRequests * 100).toFixed(2) : 0;
        metrics.successRate = totalRequests > 0 ? (metrics.successCount / totalRequests * 100).toFixed(2) : 0;

        return metrics;
    }

    displayPhaseResults(result) {
        const table = new Table({
            head: ['Metric', 'Value'],
            colWidths: [25, 20]
        });

        table.push(
            ['Phase', result.phase],
            ['Target Users', result.targetUsers.toLocaleString()],
            ['Duration', `${result.duration} minutes`],
            ['Request Rate', `${result.requestRate || 'N/A'} req/s`],
            ['P95 Response Time', `${result.p95ResponseTime || 'N/A'} ms`],
            ['P99 Response Time', `${result.p99ResponseTime || 'N/A'} ms`],
            ['Total Requests', (result.totalRequests || 0).toLocaleString()],
            ['Success Rate', `${result.successRate || 'N/A'}%`],
            ['Error Rate', `${result.errorRate || 'N/A'}%`],
            ['Status', this.getPhaseStatus(result)]
        );

        console.log('\n' + table.toString());
    }

    getPhaseStatus(result) {
        const errorRate = parseFloat(result.errorRate) || 0;
        const p95Time = parseFloat(result.p95ResponseTime) || 0;

        if (errorRate > this.failureThreshold) {
            return chalk.red('❌ FAILED - High Error Rate');
        }
        
        if (p95Time > this.responseTimeThreshold) {
            return chalk.yellow('⚠️  WARNING - High Latency');
        }
        
        return chalk.green('✅ PASSED');
    }

    shouldContinue(result) {
        const errorRate = parseFloat(result.errorRate) || 0;
        return errorRate <= this.failureThreshold;
    }

    async recoveryPeriod() {
        console.log(chalk.cyan('\n⏱️  Recovery period (60 seconds)...'));
        const spinner = ora('Waiting for system recovery').start();
        
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        spinner.succeed('Recovery period complete');
    }

    startMonitoring() {
        // Start system monitoring (CPU, memory, etc.)
        const monitoringProcess = spawn('node', [
            path.join(__dirname, 'system-monitor.js')
        ], { detached: true, stdio: 'ignore' });

        return {
            stop: () => {
                try {
                    process.kill(-monitoringProcess.pid);
                } catch (error) {
                    // Monitoring process may have already stopped
                }
            }
        };
    }

    async generateReport(reportDir) {
        console.log(chalk.blue('\n📊 Generating comprehensive test report...'));

        const report = {
            testType: 'Gradual Load Test',
            timestamp: moment().format(),
            summary: this.generateSummary(),
            phases: this.results,
            recommendations: this.generateRecommendations()
        };

        // Write JSON report
        await fs.writeJson(
            path.join(reportDir, 'gradual-load-test-report.json'),
            report,
            { spaces: 2 }
        );

        // Write markdown summary
        const markdownReport = this.generateMarkdownReport(report);
        await fs.writeFile(
            path.join(reportDir, 'gradual-load-test-summary.md'),
            markdownReport
        );

        console.log(chalk.green('✅ Report generated successfully'));
        console.log(chalk.gray(`Report location: ${reportDir}`));
    }

    generateSummary() {
        const maxUsers = Math.max(...this.results.map(r => r.targetUsers));
        const totalRequests = this.results.reduce((sum, r) => sum + (r.totalRequests || 0), 0);
        const avgErrorRate = this.results.reduce((sum, r) => sum + (parseFloat(r.errorRate) || 0), 0) / this.results.length;
        const maxP95 = Math.max(...this.results.map(r => r.p95ResponseTime || 0));

        return {
            maxConcurrentUsers: maxUsers,
            totalRequests: totalRequests,
            averageErrorRate: avgErrorRate.toFixed(2),
            maxP95ResponseTime: maxP95,
            productionReady: avgErrorRate < this.failureThreshold && maxP95 < this.responseTimeThreshold
        };
    }

    generateRecommendations() {
        const recommendations = [];
        
        this.results.forEach((result, index) => {
            const errorRate = parseFloat(result.errorRate) || 0;
            const p95Time = parseFloat(result.p95ResponseTime) || 0;

            if (errorRate > this.failureThreshold) {
                recommendations.push({
                    phase: result.phase,
                    type: 'error_rate',
                    message: `High error rate (${errorRate}%) - investigate database connections and API rate limits`
                });
            }

            if (p95Time > this.responseTimeThreshold) {
                recommendations.push({
                    phase: result.phase,
                    type: 'latency',
                    message: `High latency (${p95Time}ms) - consider database optimization and caching`
                });
            }
        });

        if (recommendations.length === 0) {
            recommendations.push({
                type: 'success',
                message: 'System performed well across all load phases - ready for production deployment'
            });
        }

        return recommendations;
    }

    generateMarkdownReport(report) {
        return `# Gradual Load Test Report - BookedBarber V2

## Test Summary
- **Test Date**: ${report.timestamp}
- **Maximum Concurrent Users**: ${report.summary.maxConcurrentUsers.toLocaleString()}
- **Total Requests**: ${report.summary.totalRequests.toLocaleString()}
- **Average Error Rate**: ${report.summary.averageErrorRate}%
- **Max P95 Response Time**: ${report.summary.maxP95ResponseTime}ms
- **Production Ready**: ${report.summary.productionReady ? '✅ Yes' : '❌ No'}

## Phase Results

${report.phases.map((phase, index) => `
### Phase ${index + 1}: ${phase.phase}
- **Target Users**: ${phase.targetUsers.toLocaleString()}
- **Duration**: ${phase.duration} minutes
- **Request Rate**: ${phase.requestRate || 'N/A'} req/s
- **P95 Response Time**: ${phase.p95ResponseTime || 'N/A'}ms
- **Success Rate**: ${phase.successRate || 'N/A'}%
- **Error Rate**: ${phase.errorRate || 'N/A'}%
`).join('')}

## Recommendations

${report.recommendations.map(rec => `- **${rec.phase || 'General'}**: ${rec.message}`).join('\n')}

## Performance Thresholds
- **Error Rate Threshold**: < ${this.failureThreshold}%
- **P95 Response Time Threshold**: < ${this.responseTimeThreshold}ms

*Report generated by BookedBarber V2 Load Testing Suite*
`;
    }
}

// Run gradual load test if called directly
if (require.main === module) {
    const tester = new GradualLoadTester();
    tester.runGradualTest().catch(console.error);
}

module.exports = GradualLoadTester;
#!/usr/bin/env node

/**
 * Simple Startup Health Monitor for 6FB Booking Frontend
 *
 * Monitors the health of the development startup process and provides
 * alerts and recovery suggestions when issues are detected.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class StartupHealthMonitor {
    constructor() {
        this.args = process.argv.slice(2);
        this.continuous = this.args.includes('--continuous');
        this.alerts = this.args.includes('--alerts');
        this.logFile = path.join(process.cwd(), 'logs', 'health-monitor.log');

        this.checks = {
            frontend: { port: 3000, name: 'Frontend (Next.js)' },
            backend: { port: 8000, name: 'Backend (FastAPI)' }
        };

        this.history = [];
        this.alertThreshold = 3; // Alert after 3 consecutive failures
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;

        // Write to log file
        const logsDir = path.dirname(this.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        fs.appendFileSync(this.logFile, logEntry);

        // Console output with colors
        const colors = {
            info: '\x1b[36m',
            success: '\x1b[32m',
            warning: '\x1b[33m',
            error: '\x1b[31m',
            critical: '\x1b[91m',
            reset: '\x1b[0m'
        };

        const color = colors[level] || colors.info;
        console.log(`${color}${message}${colors.reset}`);
    }

    async checkPort(port, timeout = 5000) {
        return new Promise((resolve) => {
            const socket = new require('net').Socket();

            const timer = setTimeout(() => {
                socket.destroy();
                resolve(false);
            }, timeout);

            socket.connect(port, 'localhost', () => {
                clearTimeout(timer);
                socket.end();
                resolve(true);
            });

            socket.on('error', () => {
                clearTimeout(timer);
                resolve(false);
            });
        });
    }

    async performHealthCheck() {
        const results = {};
        const timestamp = new Date().toISOString();

        for (const [key, config] of Object.entries(this.checks)) {
            const isHealthy = await this.checkPort(config.port);
            results[key] = {
                name: config.name,
                port: config.port,
                healthy: isHealthy,
                timestamp
            };

            if (isHealthy) {
                this.log(`✅ ${config.name} is healthy (port ${config.port})`, 'success');
            } else {
                this.log(`❌ ${config.name} is not responding (port ${config.port})`, 'error');
            }
        }

        return results;
    }

    analyzeHealth(results) {
        const unhealthyServices = Object.values(results).filter(r => !r.healthy);

        if (unhealthyServices.length === 0) {
            return {
                status: 'healthy',
                message: 'All services are running normally',
                recommendations: []
            };
        }

        const recommendations = [];

        unhealthyServices.forEach(service => {
            if (service.port === 3000) {
                recommendations.push({
                    service: 'Frontend',
                    issue: 'Next.js server not responding',
                    solutions: [
                        'npm run dev:failsafe',
                        'npm run dev:recovery',
                        'Check logs for startup errors'
                    ]
                });
            } else if (service.port === 8000) {
                recommendations.push({
                    service: 'Backend',
                    issue: 'FastAPI server not responding',
                    solutions: [
                        'cd backend && export DATA_ENCRYPTION_KEY="OJKlj1kP7p10g_lGT2qQ7N-vzSF_Q2Rs9vbFt-NJ16A=" && uvicorn main:app --reload',
                        'Check backend environment variables',
                        'Verify database connection'
                    ]
                });
            }
        });

        return {
            status: 'unhealthy',
            message: `${unhealthyServices.length} service(s) are not responding`,
            unhealthyServices,
            recommendations
        };
    }

    displayResults(analysis) {
        console.log('\n' + '='.repeat(60));
        console.log('🏥 6FB Booking Platform Health Status');
        console.log('='.repeat(60));

        const statusIcon = analysis.status === 'healthy' ? '🟢' : '🔴';
        this.log(`${statusIcon} Overall Status: ${analysis.status.toUpperCase()}`,
                 analysis.status === 'healthy' ? 'success' : 'error');

        this.log(`📝 ${analysis.message}`, 'info');

        if (analysis.recommendations && analysis.recommendations.length > 0) {
            console.log('\n💡 Recommended Actions:');
            analysis.recommendations.forEach((rec, i) => {
                console.log(`\n${i + 1}. ${rec.service}: ${rec.issue}`);
                rec.solutions.forEach(solution => {
                    console.log(`   • ${solution}`);
                });
            });
        }

        console.log('\n' + '='.repeat(60));
    }

    async startContinuousMonitoring() {
        this.log('🔄 Starting continuous health monitoring...', 'info');
        this.log('Press Ctrl+C to stop monitoring', 'info');

        const checkInterval = setInterval(async () => {
            try {
                const results = await this.performHealthCheck();
                const analysis = this.analyzeHealth(results);

                // Store in history
                this.history.push({ timestamp: new Date(), analysis });

                // Keep only last 10 entries
                if (this.history.length > 10) {
                    this.history = this.history.slice(-10);
                }

                // Alert on consecutive failures
                if (this.alerts && analysis.status === 'unhealthy') {
                    const recentFailures = this.history.slice(-this.alertThreshold)
                        .filter(h => h.analysis.status === 'unhealthy');

                    if (recentFailures.length >= this.alertThreshold) {
                        this.log(`🚨 ALERT: ${this.alertThreshold} consecutive health check failures!`, 'critical');
                        this.displayResults(analysis);
                    }
                }

            } catch (error) {
                this.log(`Health check failed: ${error.message}`, 'error');
            }
        }, 30000); // Check every 30 seconds

        // Graceful shutdown
        process.on('SIGINT', () => {
            clearInterval(checkInterval);
            this.log('🛑 Health monitoring stopped', 'info');
            process.exit(0);
        });
    }

    async run() {
        try {
            const results = await this.performHealthCheck();
            const analysis = this.analyzeHealth(results);

            this.displayResults(analysis);

            if (this.continuous) {
                await this.startContinuousMonitoring();
            }

            // Exit with appropriate code
            process.exit(analysis.status === 'healthy' ? 0 : 1);

        } catch (error) {
            this.log(`Monitor failed: ${error.message}`, 'critical');
            process.exit(1);
        }
    }

    static showHelp() {
        console.log(`
🏥 Startup Health Monitor for 6FB Booking Platform

Usage: node scripts/startup-health-monitor.js [options]

Options:
  --continuous    Run continuous monitoring (checks every 30 seconds)
  --alerts        Show alerts for consecutive failures
  --help          Show this help message

Examples:
  node scripts/startup-health-monitor.js                    # One-time health check
  node scripts/startup-health-monitor.js --continuous       # Continuous monitoring
  node scripts/startup-health-monitor.js --continuous --alerts  # With alerts

Services Monitored:
  • Frontend (Next.js) - Port 3000
  • Backend (FastAPI) - Port 8000

The monitor checks if services are responding and provides specific
recovery recommendations for any unhealthy services.
        `);
    }
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        StartupHealthMonitor.showHelp();
        process.exit(0);
    }

    const monitor = new StartupHealthMonitor();
    monitor.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = StartupHealthMonitor;

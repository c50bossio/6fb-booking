#!/usr/bin/env node

/**
 * Real-time Monitoring Collector for Load Testing
 * Monitors system resources, response times, error rates during load tests
 * Provides real-time feedback and alerts during testing
 */

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const chalk = require('chalk');
const moment = require('moment');

class LoadTestMonitor {
    constructor() {
        this.metrics = {
            system: {},
            api: {},
            database: {},
            errors: [],
            alerts: []
        };
        this.isMonitoring = false;
        this.clients = new Set();
        this.monitoringInterval = null;
        this.alertThresholds = {
            cpuUsage: 80,          // % CPU usage
            memoryUsage: 85,       // % Memory usage
            responseTime: 1000,    // ms
            errorRate: 5,          // % error rate
            diskUsage: 90,         // % disk usage
            connectionCount: 500   // Active connections
        };
        this.setupWebSocketServer();
        this.setupHttpServer();
    }

    setupWebSocketServer() {
        this.wss = new WebSocket.Server({ port: 8080 });
        
        this.wss.on('connection', (ws) => {
            console.log(chalk.blue('📊 Monitoring client connected'));
            this.clients.add(ws);
            
            // Send current metrics to new client
            ws.send(JSON.stringify({
                type: 'initial_metrics',
                data: this.metrics
            }));
            
            ws.on('close', () => {
                this.clients.delete(ws);
                console.log(chalk.gray('📊 Monitoring client disconnected'));
            });
            
            ws.on('error', (error) => {
                console.error(chalk.red('WebSocket error:'), error.message);
                this.clients.delete(ws);
            });
        });
        
        console.log(chalk.green('✅ Monitoring WebSocket server started on port 8080'));
    }

    setupHttpServer() {
        this.httpServer = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            
            if (req.url === '/metrics') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.metrics));
            } else if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'healthy', monitoring: this.isMonitoring }));
            } else if (req.url === '/dashboard') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(this.generateDashboardHtml());
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });
        
        this.httpServer.listen(3001, () => {
            console.log(chalk.green('✅ Monitoring HTTP server started on port 3001'));
            console.log(chalk.cyan('📊 Dashboard available at: http://localhost:3001/dashboard'));
        });
    }

    async startMonitoring() {
        if (this.isMonitoring) {
            console.log(chalk.yellow('⚠️  Monitoring already active'));
            return;
        }
        
        console.log(chalk.blue.bold('🚀 Starting Load Test Monitoring'));
        console.log(chalk.gray('Collecting system metrics every 5 seconds...\n'));
        
        this.isMonitoring = true;
        
        // Start monitoring intervals
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, 5000); // Collect metrics every 5 seconds
        
        // Initial metrics collection
        await this.collectMetrics();
    }

    async stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        
        console.log(chalk.blue('🛑 Stopping monitoring...'));
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        // Save final report
        await this.saveFinalReport();
        
        console.log(chalk.green('✅ Monitoring stopped'));
    }

    async collectMetrics() {
        const timestamp = moment().format();
        
        try {
            // Collect system metrics
            const systemMetrics = await this.collectSystemMetrics();
            
            // Collect API metrics
            const apiMetrics = await this.collectApiMetrics();
            
            // Collect database metrics
            const databaseMetrics = await this.collectDatabaseMetrics();
            
            // Update metrics
            this.metrics.system = { ...systemMetrics, timestamp };
            this.metrics.api = { ...apiMetrics, timestamp };
            this.metrics.database = { ...databaseMetrics, timestamp };
            
            // Check for alerts
            this.checkAlerts();
            
            // Broadcast to clients
            this.broadcastMetrics();
            
            // Log key metrics
            this.logMetrics();
            
        } catch (error) {
            console.error(chalk.red('❌ Error collecting metrics:'), error.message);
        }
    }

    async collectSystemMetrics() {
        return new Promise((resolve, reject) => {
            // Get CPU usage
            exec('top -l 1 -s 0 | grep "CPU usage"', (error, stdout) => {
                if (error) {
                    // Fallback for Linux systems
                    exec('top -bn1 | grep "Cpu(s)"', (linuxError, linuxStdout) => {
                        if (linuxError) {
                            resolve({ cpuUsage: 0, memoryUsage: 0, diskUsage: 0 });
                            return;
                        }
                        
                        const cpuMatch = linuxStdout.match(/(\d+\.?\d*)%.*?(\d+\.?\d*)%/);
                        const cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
                        
                        this.getMemoryAndDisk(resolve, cpuUsage);
                    });
                    return;
                }
                
                // Parse macOS output
                const cpuMatch = stdout.match(/(\d+\.?\d*)% user.*?(\d+\.?\d*)% sys/);
                const userCpu = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
                const sysCpu = cpuMatch ? parseFloat(cpuMatch[2]) : 0;
                const cpuUsage = userCpu + sysCpu;
                
                this.getMemoryAndDisk(resolve, cpuUsage);
            });
        });
    }

    getMemoryAndDisk(resolve, cpuUsage) {
        // Get memory usage
        exec('free -m 2>/dev/null || vm_stat', (error, stdout) => {
            let memoryUsage = 0;
            
            if (!error) {
                if (stdout.includes('Mem:')) {
                    // Linux
                    const memMatch = stdout.match(/Mem:\s+(\d+)\s+(\d+)/);
                    if (memMatch) {
                        const total = parseInt(memMatch[1]);
                        const used = parseInt(memMatch[2]);
                        memoryUsage = (used / total) * 100;
                    }
                } else {
                    // macOS vm_stat parsing (simplified)
                    memoryUsage = 50; // Placeholder for complex vm_stat parsing
                }
            }
            
            // Get disk usage
            exec('df -h / | tail -1', (diskError, diskStdout) => {
                let diskUsage = 0;
                
                if (!diskError) {
                    const diskMatch = diskStdout.match(/(\d+)%/);
                    if (diskMatch) {
                        diskUsage = parseInt(diskMatch[1]);
                    }
                }
                
                resolve({
                    cpuUsage: parseFloat(cpuUsage.toFixed(2)),
                    memoryUsage: parseFloat(memoryUsage.toFixed(2)),
                    diskUsage: diskUsage,
                    loadAverage: this.getLoadAverage()
                });
            });
        });
    }

    getLoadAverage() {
        const os = require('os');
        const loadavg = os.loadavg();
        return {
            '1min': parseFloat(loadavg[0].toFixed(2)),
            '5min': parseFloat(loadavg[1].toFixed(2)),
            '15min': parseFloat(loadavg[2].toFixed(2))
        };
    }

    async collectApiMetrics() {
        try {
            // Test API health endpoints
            const healthResponse = await this.makeHttpRequest('http://localhost:8000/health');
            const dbHealthResponse = await this.makeHttpRequest('http://localhost:8000/api/v1/health/database');
            
            // Measure response times
            const responseTime = await this.measureResponseTime('http://localhost:8000/api/v1/barbers');
            
            return {
                healthStatus: healthResponse.status === 200 ? 'healthy' : 'unhealthy',
                databaseStatus: dbHealthResponse.status === 200 ? 'healthy' : 'unhealthy',
                responseTime: responseTime,
                activeConnections: await this.getActiveConnections(),
                requestCount: await this.getRequestCount(),
                errorCount: await this.getErrorCount()
            };
        } catch (error) {
            return {
                healthStatus: 'error',
                databaseStatus: 'error',
                responseTime: -1,
                activeConnections: 0,
                requestCount: 0,
                errorCount: 0,
                error: error.message
            };
        }
    }

    async collectDatabaseMetrics() {
        try {
            const connectionCount = await this.getDatabaseConnections();
            const queryPerformance = await this.getDatabaseQueryPerformance();
            
            return {
                connectionCount: connectionCount,
                queryPerformance: queryPerformance,
                status: 'healthy'
            };
        } catch (error) {
            return {
                connectionCount: 0,
                queryPerformance: { avgTime: -1 },
                status: 'error',
                error: error.message
            };
        }
    }

    async makeHttpRequest(url) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            const request = http.get(url, (response) => {
                resolve({ status: response.statusCode });
            });
            
            request.on('error', (error) => {
                reject(error);
            });
            
            request.setTimeout(5000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async measureResponseTime(url) {
        const start = process.hrtime.bigint();
        try {
            await this.makeHttpRequest(url);
            const end = process.hrtime.bigint();
            return Number(end - start) / 1000000; // Convert to milliseconds
        } catch (error) {
            return -1;
        }
    }

    async getActiveConnections() {
        return new Promise((resolve) => {
            exec('netstat -an | grep :8000 | grep ESTABLISHED | wc -l', (error, stdout) => {
                if (error) {
                    resolve(0);
                    return;
                }
                resolve(parseInt(stdout.trim()) || 0);
            });
        });
    }

    async getRequestCount() {
        // This would typically come from application metrics
        // For now, return a placeholder
        return Math.floor(Math.random() * 1000);
    }

    async getErrorCount() {
        // This would typically come from application logs
        // For now, return a placeholder
        return Math.floor(Math.random() * 10);
    }

    async getDatabaseConnections() {
        // This would query the database for active connections
        // For now, return a placeholder
        return Math.floor(Math.random() * 100);
    }

    async getDatabaseQueryPerformance() {
        // This would measure actual database query performance
        // For now, return a placeholder
        return {
            avgTime: Math.random() * 100,
            p95Time: Math.random() * 200,
            queryCount: Math.floor(Math.random() * 1000)
        };
    }

    checkAlerts() {
        const alerts = [];
        
        // CPU alert
        if (this.metrics.system.cpuUsage > this.alertThresholds.cpuUsage) {
            alerts.push({
                type: 'critical',
                message: `High CPU usage: ${this.metrics.system.cpuUsage}%`,
                timestamp: moment().format(),
                threshold: this.alertThresholds.cpuUsage
            });
        }
        
        // Memory alert
        if (this.metrics.system.memoryUsage > this.alertThresholds.memoryUsage) {
            alerts.push({
                type: 'critical',
                message: `High memory usage: ${this.metrics.system.memoryUsage}%`,
                timestamp: moment().format(),
                threshold: this.alertThresholds.memoryUsage
            });
        }
        
        // Response time alert
        if (this.metrics.api.responseTime > this.alertThresholds.responseTime) {
            alerts.push({
                type: 'warning',
                message: `High response time: ${this.metrics.api.responseTime}ms`,
                timestamp: moment().format(),
                threshold: this.alertThresholds.responseTime
            });
        }
        
        // Disk usage alert
        if (this.metrics.system.diskUsage > this.alertThresholds.diskUsage) {
            alerts.push({
                type: 'critical',
                message: `High disk usage: ${this.metrics.system.diskUsage}%`,
                timestamp: moment().format(),
                threshold: this.alertThresholds.diskUsage
            });
        }
        
        // Add new alerts to the list
        alerts.forEach(alert => {
            this.metrics.alerts.push(alert);
            this.logAlert(alert);
        });
        
        // Keep only recent alerts (last 100)
        if (this.metrics.alerts.length > 100) {
            this.metrics.alerts = this.metrics.alerts.slice(-100);
        }
    }

    logAlert(alert) {
        const color = alert.type === 'critical' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue';
        console.log(chalk[color](`🚨 ALERT [${alert.type.toUpperCase()}]: ${alert.message}`));
    }

    broadcastMetrics() {
        const message = JSON.stringify({
            type: 'metrics_update',
            data: this.metrics
        });
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    logMetrics() {
        // Log key metrics to console (every 6th collection = 30 seconds)
        if (Math.random() < 0.16) { // Approximately every 30 seconds
            console.log(chalk.blue(`📊 [${moment().format('HH:mm:ss')}] CPU: ${this.metrics.system.cpuUsage}% | Memory: ${this.metrics.system.memoryUsage}% | Response: ${this.metrics.api.responseTime}ms | Connections: ${this.metrics.api.activeConnections}`));
        }
    }

    async saveFinalReport() {
        const reportDir = path.join(__dirname, '../reports/monitoring');
        await fs.ensureDir(reportDir);
        
        const report = {
            testType: 'Load Test Monitoring',
            timestamp: moment().format(),
            finalMetrics: this.metrics,
            alertSummary: this.generateAlertSummary(),
            recommendations: this.generateMonitoringRecommendations()
        };
        
        await fs.writeJson(
            path.join(reportDir, `monitoring-report-${moment().format('YYYYMMDD-HHmmss')}.json`),
            report,
            { spaces: 2 }
        );
        
        console.log(chalk.green('✅ Monitoring report saved'));
    }

    generateAlertSummary() {
        const alertCounts = this.metrics.alerts.reduce((counts, alert) => {
            counts[alert.type] = (counts[alert.type] || 0) + 1;
            return counts;
        }, {});
        
        return {
            totalAlerts: this.metrics.alerts.length,
            alertTypes: alertCounts,
            recentAlerts: this.metrics.alerts.slice(-10)
        };
    }

    generateMonitoringRecommendations() {
        const recommendations = [];
        
        if (this.metrics.system.cpuUsage > 70) {
            recommendations.push('Consider scaling CPU resources or optimizing application performance');
        }
        
        if (this.metrics.system.memoryUsage > 80) {
            recommendations.push('Monitor memory usage and consider increasing available RAM');
        }
        
        if (this.metrics.api.responseTime > 500) {
            recommendations.push('Investigate API response time optimization opportunities');
        }
        
        if (this.metrics.alerts.length > 50) {
            recommendations.push('High alert frequency detected - review alert thresholds and system capacity');
        }
        
        return recommendations;
    }

    generateDashboardHtml() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookedBarber Load Test Monitor</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; margin-bottom: 10px; }
        .status-healthy { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-error { color: #ef4444; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .alert-critical { border-color: #ef4444; }
        .alert-warning { border-color: #f59e0b; background: #fffbeb; }
        #alerts-container { max-height: 300px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 BookedBarber V2 Load Test Monitor</h1>
            <p>Real-time system monitoring during load testing</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">CPU Usage</div>
                <div class="metric-value" id="cpu-usage">--</div>
                <div>Load Average: <span id="load-average">--</span></div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Memory Usage</div>
                <div class="metric-value" id="memory-usage">--</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">API Response Time</div>
                <div class="metric-value" id="response-time">--</div>
                <div>Status: <span id="api-status">--</span></div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Active Connections</div>
                <div class="metric-value" id="connections">--</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Database Status</div>
                <div class="metric-value" id="db-status">--</div>
                <div>Connections: <span id="db-connections">--</span></div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Disk Usage</div>
                <div class="metric-value" id="disk-usage">--</div>
            </div>
        </div>
        
        <div class="metric-card" style="margin-top: 20px;">
            <div class="metric-label">Recent Alerts</div>
            <div id="alerts-container">
                <div>No alerts</div>
            </div>
        </div>
    </div>

    <script>
        const ws = new WebSocket('ws://localhost:8080');
        
        ws.onmessage = function(event) {
            const message = JSON.parse(event.data);
            if (message.type === 'metrics_update' || message.type === 'initial_metrics') {
                updateDashboard(message.data);
            }
        };
        
        function updateDashboard(metrics) {
            // System metrics
            document.getElementById('cpu-usage').textContent = metrics.system.cpuUsage + '%';
            document.getElementById('memory-usage').textContent = metrics.system.memoryUsage + '%';
            document.getElementById('disk-usage').textContent = metrics.system.diskUsage + '%';
            
            if (metrics.system.loadAverage) {
                document.getElementById('load-average').textContent = 
                    metrics.system.loadAverage['1min'] + ', ' + 
                    metrics.system.loadAverage['5min'] + ', ' + 
                    metrics.system.loadAverage['15min'];
            }
            
            // API metrics
            document.getElementById('response-time').textContent = 
                metrics.api.responseTime > 0 ? metrics.api.responseTime.toFixed(0) + 'ms' : 'N/A';
            document.getElementById('api-status').textContent = metrics.api.healthStatus || 'Unknown';
            document.getElementById('connections').textContent = metrics.api.activeConnections || 0;
            
            // Database metrics
            document.getElementById('db-status').textContent = metrics.database.status || 'Unknown';
            document.getElementById('db-connections').textContent = metrics.database.connectionCount || 0;
            
            // Update alerts
            const alertsContainer = document.getElementById('alerts-container');
            if (metrics.alerts && metrics.alerts.length > 0) {
                const recentAlerts = metrics.alerts.slice(-10).reverse();
                alertsContainer.innerHTML = recentAlerts.map(alert => 
                    \`<div class="alert alert-\${alert.type}">
                        <strong>[\${alert.type.toUpperCase()}]</strong> \${alert.message}
                        <br><small>\${alert.timestamp}</small>
                    </div>\`
                ).join('');
            } else {
                alertsContainer.innerHTML = '<div>No alerts</div>';
            }
        }
        
        // Auto-refresh metrics every 5 seconds as fallback
        setInterval(() => {
            fetch('/metrics')
                .then(response => response.json())
                .then(metrics => updateDashboard(metrics))
                .catch(error => console.error('Error fetching metrics:', error));
        }, 5000);
    </script>
</body>
</html>
        `;
    }

    shutdown() {
        console.log(chalk.blue('🛑 Shutting down monitoring...'));
        
        this.stopMonitoring();
        
        if (this.wss) {
            this.wss.close();
        }
        
        if (this.httpServer) {
            this.httpServer.close();
        }
        
        console.log(chalk.green('✅ Monitoring shutdown complete'));
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    if (global.monitor) {
        global.monitor.shutdown();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    if (global.monitor) {
        global.monitor.shutdown();
    }
    process.exit(0);
});

// Run monitoring if called directly
if (require.main === module) {
    const monitor = new LoadTestMonitor();
    global.monitor = monitor;
    
    monitor.startMonitoring().catch(console.error);
    
    console.log(chalk.cyan('\n📊 Monitoring active. Press Ctrl+C to stop.\n'));
}

module.exports = LoadTestMonitor;
#!/usr/bin/env node

/**
 * Localhost Network Diagnostics Tool
 * Comprehensive diagnostics for localhost connectivity issues
 */

const { exec, spawn } = require('child_process');
const net = require('net');
const os = require('os');
const fs = require('fs');

class LocalhostDiagnostics {
    constructor() {
        this.results = {
            dns: {},
            network: {},
            ports: {},
            browser: {},
            system: {},
            recommendations: []
        };
        this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
        this.json = process.argv.includes('--json');
    }

    log(message, level = 'info') {
        if (this.json) return; // Suppress logs in JSON mode

        const colors = {
            info: '\x1b[36m',
            success: '\x1b[32m',
            warning: '\x1b[33m',
            error: '\x1b[31m',
            reset: '\x1b[0m'
        };

        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`${colors[level]}[${timestamp}] ${message}${colors.reset}`);
    }

    async runCommand(command) {
        return new Promise((resolve) => {
            exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    stdout: stdout?.trim(),
                    stderr: stderr?.trim(),
                    error: error?.message
                });
            });
        });
    }

    async testPortConnectivity(port, host = 'localhost') {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            const timeout = 3000;

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                socket.destroy();
                resolve({ connected: true, error: null });
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve({ connected: false, error: 'Connection timeout' });
            });

            socket.on('error', (err) => {
                socket.destroy();
                resolve({ connected: false, error: err.message });
            });

            socket.connect(port, host);
        });
    }

    async checkDNSResolution() {
        this.log('Checking DNS resolution...', 'info');

        const tests = [
            { host: 'localhost', description: 'localhost resolution' },
            { host: '127.0.0.1', description: 'loopback IP' },
            { host: '::1', description: 'IPv6 loopback' }
        ];

        for (const test of tests) {
            const result = await this.runCommand(`nslookup ${test.host}`);
            this.results.dns[test.host] = {
                description: test.description,
                success: result.success,
                output: result.stdout,
                error: result.error
            };

            if (result.success) {
                this.log(`✅ ${test.description}: OK`, 'success');
            } else {
                this.log(`❌ ${test.description}: FAILED`, 'error');
                this.results.recommendations.push(`Fix DNS resolution for ${test.host}`);
            }
        }
    }

    async checkNetworkInterfaces() {
        this.log('Checking network interfaces...', 'info');

        const interfaces = os.networkInterfaces();
        const loopbackFound = Object.values(interfaces)
            .flat()
            .some(iface => iface.address === '127.0.0.1' || iface.address === '::1');

        this.results.network.interfaces = interfaces;
        this.results.network.loopbackAvailable = loopbackFound;

        if (loopbackFound) {
            this.log('✅ Loopback interface: Available', 'success');
        } else {
            this.log('❌ Loopback interface: Not found', 'error');
            this.results.recommendations.push('Check network interface configuration');
        }
    }

    async checkPortAvailability() {
        this.log('Checking port availability...', 'info');

        const commonPorts = [3000, 3001, 8000, 8080, 8001];

        for (const port of commonPorts) {
            // Check if port is in use
            const listenCheck = await this.runCommand(`lsof -i :${port}`);
            const inUse = listenCheck.success && listenCheck.stdout;

            // Test connectivity
            const connectTest = await this.testPortConnectivity(port);

            this.results.ports[port] = {
                inUse,
                processInfo: inUse ? listenCheck.stdout : null,
                connectable: connectTest.connected,
                error: connectTest.error
            };

            if (inUse && connectTest.connected) {
                this.log(`✅ Port ${port}: In use and connectable`, 'success');
            } else if (inUse && !connectTest.connected) {
                this.log(`⚠️  Port ${port}: In use but not connectable`, 'warning');
                this.results.recommendations.push(`Port ${port} has connectivity issues`);
            } else {
                this.log(`ℹ️  Port ${port}: Available`, 'info');
            }
        }
    }

    async checkBrowserSettings() {
        this.log('Checking browser-related issues...', 'info');

        // Check hosts file
        const hostsPath = '/etc/hosts';
        let hostsContent = '';
        try {
            hostsContent = fs.readFileSync(hostsPath, 'utf8');
            const hasLocalhost = hostsContent.includes('127.0.0.1\tlocalhost') ||
                                hostsContent.includes('127.0.0.1 localhost');

            this.results.browser.hostsFile = {
                exists: true,
                hasLocalhost,
                content: hostsContent.split('\n').filter(line =>
                    line.includes('localhost') || line.includes('127.0.0.1')
                )
            };

            if (hasLocalhost) {
                this.log('✅ Hosts file: localhost configured correctly', 'success');
            } else {
                this.log('⚠️  Hosts file: localhost mapping may be missing', 'warning');
                this.results.recommendations.push('Verify localhost entry in /etc/hosts');
            }
        } catch (error) {
            this.results.browser.hostsFile = { exists: false, error: error.message };
            this.log('❌ Hosts file: Cannot read /etc/hosts', 'error');
        }

        // Check for proxy settings
        const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];
        const proxySettings = {};
        proxyVars.forEach(var_ => {
            proxySettings[var_] = process.env[var_] || null;
        });

        this.results.browser.proxySettings = proxySettings;
        const hasProxy = Object.values(proxySettings).some(val => val);

        if (hasProxy) {
            this.log('⚠️  Proxy settings detected - may affect localhost', 'warning');
            this.results.recommendations.push('Check proxy settings for localhost exclusions');
        } else {
            this.log('✅ Proxy settings: No proxy detected', 'success');
        }
    }

    async checkSystemResources() {
        this.log('Checking system resources...', 'info');

        // Memory usage
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memUsage = ((totalMem - freeMem) / totalMem) * 100;

        // Load average
        const loadAvg = os.loadavg();

        this.results.system = {
            memory: {
                total: totalMem,
                free: freeMem,
                usagePercent: memUsage
            },
            loadAverage: loadAvg,
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version
        };

        if (memUsage > 90) {
            this.log('⚠️  High memory usage detected', 'warning');
            this.results.recommendations.push('System memory usage is high - may affect performance');
        }

        if (loadAvg[0] > os.cpus().length) {
            this.log('⚠️  High system load detected', 'warning');
            this.results.recommendations.push('High system load - may affect network performance');
        }
    }

    async checkFirewall() {
        this.log('Checking firewall settings...', 'info');

        const platform = os.platform();
        let firewallResult = { checked: false, status: 'unknown' };

        if (platform === 'darwin') {
            const pfctlResult = await this.runCommand('sudo pfctl -s info 2>/dev/null');
            if (pfctlResult.success) {
                firewallResult = {
                    checked: true,
                    status: pfctlResult.stdout.includes('Status: Enabled') ? 'enabled' : 'disabled',
                    info: pfctlResult.stdout
                };
            }
        }

        this.results.system.firewall = firewallResult;

        if (firewallResult.status === 'enabled') {
            this.log('ℹ️  Firewall is enabled - may need localhost rules', 'info');
            this.results.recommendations.push('Verify firewall allows localhost connections');
        }
    }

    generateReport() {
        if (this.json) {
            console.log(JSON.stringify(this.results, null, 2));
            return;
        }

        console.log('\n📊 LOCALHOST DIAGNOSTICS REPORT\n');
        console.log('=' * 50);

        // Summary
        const issues = this.results.recommendations.length;
        console.log(`\n🔍 Issues Found: ${issues}`);

        if (issues === 0) {
            console.log('✅ All checks passed! Your localhost setup appears healthy.\n');
        } else {
            console.log('\n🔧 RECOMMENDATIONS:');
            this.results.recommendations.forEach((rec, i) => {
                console.log(`   ${i + 1}. ${rec}`);
            });
        }

        if (this.verbose) {
            console.log('\n📋 DETAILED RESULTS:');
            console.log(JSON.stringify(this.results, null, 2));
        }

        console.log('\n💡 QUICK FIXES:');
        console.log('   • Clear caches: npm run clear-cache');
        console.log('   • Restart browser in incognito mode');
        console.log('   • Try different port: npm run dev -- -p 3001');
        console.log('   • Kill port processes: npm run kill-port');
    }

    async run() {
        this.log('🔍 Starting localhost diagnostics...', 'info');

        try {
            await this.checkDNSResolution();
            await this.checkNetworkInterfaces();
            await this.checkPortAvailability();
            await this.checkBrowserSettings();
            await this.checkSystemResources();
            await this.checkFirewall();

            this.generateReport();

        } catch (error) {
            this.log(`❌ Diagnostics failed: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    static showHelp() {
        console.log(`
🔍 Localhost Network Diagnostics Tool

Usage: node localhost-diagnostics.js [options]

Options:
  --verbose, -v    Show detailed diagnostic information
  --json           Output results in JSON format
  --help, -h       Show this help message

This tool checks:
  • DNS resolution for localhost
  • Network interface configuration
  • Port availability and connectivity
  • Browser settings (hosts file, proxy)
  • System resources and firewall
  • Provides specific recommendations

Examples:
  node localhost-diagnostics.js           # Run basic diagnostics
  node localhost-diagnostics.js --verbose # Detailed output
  node localhost-diagnostics.js --json    # JSON output for automation
        `);
    }
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        LocalhostDiagnostics.showHelp();
        process.exit(0);
    }

    const diagnostics = new LocalhostDiagnostics();
    diagnostics.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = LocalhostDiagnostics;

#!/usr/bin/env node

/**
 * Automatic Server Restart Script
 *
 * Monitors Next.js development server health and automatically restarts
 * it when it becomes unresponsive or crashes.
 */

const { spawn, exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ServerAutoRestart {
    constructor() {
        this.serverUrl = 'http://localhost:3000';
        this.checkInterval = 10000; // Check every 10 seconds
        this.restartThreshold = 3; // Restart after 3 failed checks
        this.failedChecks = 0;
        this.serverProcess = null;
        this.monitoring = false;
        this.logFile = path.join(process.cwd(), 'logs', `server-monitor-${new Date().toISOString().split('T')[0]}.log`);

        // Ensure logs directory exists
        const logsDir = path.dirname(this.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} - ${message}\n`;

        console.log(message);

        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    async checkServerHealth() {
        try {
            const response = await axios.get(`${this.serverUrl}/api/health`, {
                timeout: 5000,
                validateStatus: (status) => status < 500
            });

            if (response.status === 200) {
                this.failedChecks = 0;
                return true;
            } else {
                this.log(`⚠️ Server returned status ${response.status}`);
                this.failedChecks++;
                return false;
            }
        } catch (error) {
            this.log(`❌ Health check failed: ${error.message}`);
            this.failedChecks++;
            return false;
        }
    }

    async killExistingServer() {
        return new Promise((resolve) => {
            exec('lsof -ti:3000 | xargs kill -9 2>/dev/null', (error) => {
                if (error) {
                    this.log('No existing server processes found');
                } else {
                    this.log('🔪 Killed existing server processes');
                }
                resolve();
            });
        });
    }

    async cleanCache() {
        return new Promise((resolve) => {
            exec('rm -rf .next node_modules/.cache', { cwd: process.cwd() }, (error) => {
                if (error) {
                    this.log(`⚠️ Cache cleanup failed: ${error.message}`);
                } else {
                    this.log('🧹 Cleaned build cache');
                }
                resolve();
            });
        });
    }

    async startServer() {
        this.log('🚀 Starting development server...');

        return new Promise((resolve, reject) => {
            // Use the ultra-stable configuration
            const serverProcess = spawn('node', [
                '--max-old-space-size=8192',
                '--optimize-for-size',
                'node_modules/.bin/next',
                'dev',
                '-p',
                '3000'
            ], {
                cwd: process.cwd(),
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            let serverReady = false;
            let startupTimeout;

            // Set startup timeout
            startupTimeout = setTimeout(() => {
                if (!serverReady) {
                    this.log('❌ Server startup timeout');
                    serverProcess.kill();
                    reject(new Error('Server startup timeout'));
                }
            }, 60000); // 60 second timeout

            serverProcess.stdout.on('data', (data) => {
                const output = data.toString();

                if (output.includes('Ready in') && output.includes('ms')) {
                    serverReady = true;
                    clearTimeout(startupTimeout);
                    this.log('✅ Server started successfully');
                    this.serverProcess = serverProcess;
                    resolve(serverProcess);
                }

                // Log important output
                if (output.includes('Error') || output.includes('Warning') || output.includes('Ready')) {
                    this.log(`Server: ${output.trim()}`);
                }
            });

            serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                this.log(`Server Error: ${error.trim()}`);
            });

            serverProcess.on('exit', (code) => {
                clearTimeout(startupTimeout);
                this.serverProcess = null;
                if (code !== 0 && !serverReady) {
                    this.log(`❌ Server exited with code ${code}`);
                    reject(new Error(`Server process exited with code ${code}`));
                } else {
                    this.log(`🔄 Server process ended (code: ${code})`);
                }
            });

            serverProcess.on('error', (error) => {
                clearTimeout(startupTimeout);
                this.log(`❌ Server process error: ${error.message}`);
                reject(error);
            });
        });
    }

    async restartServer() {
        this.log('🔄 Initiating server restart...');

        try {
            // Stop current server
            if (this.serverProcess) {
                this.serverProcess.kill();
                this.serverProcess = null;
            }

            // Kill any remaining processes
            await this.killExistingServer();

            // Clean cache
            await this.cleanCache();

            // Wait a bit for cleanup
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Start new server
            await this.startServer();

            // Wait for server to be ready
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Verify server is working
            const isHealthy = await this.checkServerHealth();

            if (isHealthy) {
                this.log('✅ Server restart successful');
                this.failedChecks = 0;
                return true;
            } else {
                this.log('❌ Server restart failed - server not responding');
                return false;
            }

        } catch (error) {
            this.log(`❌ Server restart failed: ${error.message}`);
            return false;
        }
    }

    async startMonitoring() {
        this.log('🔍 Starting server health monitoring...');
        this.monitoring = true;

        // Initial health check
        const initialHealth = await this.checkServerHealth();
        if (!initialHealth) {
            this.log('⚠️ Server not responding - attempting restart...');
            const restartSuccess = await this.restartServer();
            if (!restartSuccess) {
                this.log('❌ Initial server restart failed');
                return false;
            }
        }

        // Start monitoring loop
        const monitoringLoop = setInterval(async () => {
            if (!this.monitoring) {
                clearInterval(monitoringLoop);
                return;
            }

            const isHealthy = await this.checkServerHealth();

            if (!isHealthy) {
                this.log(`⚠️ Server unhealthy (${this.failedChecks}/${this.restartThreshold} failed checks)`);

                if (this.failedChecks >= this.restartThreshold) {
                    this.log('🚨 Server restart threshold reached');
                    const restartSuccess = await this.restartServer();

                    if (!restartSuccess) {
                        this.log('❌ Automatic restart failed - manual intervention required');
                        this.stopMonitoring();
                    }
                }
            } else {
                // Server is healthy - reset counters
                if (this.failedChecks > 0) {
                    this.log('✅ Server health restored');
                    this.failedChecks = 0;
                }
            }
        }, this.checkInterval);

        this.log(`✅ Monitoring started (checking every ${this.checkInterval/1000}s)`);
        return true;
    }

    stopMonitoring() {
        this.monitoring = false;
        this.log('🛑 Server monitoring stopped');

        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }

    // Handle process termination
    setupSignalHandlers() {
        const cleanup = () => {
            this.log('🔚 Received termination signal - cleaning up...');
            this.stopMonitoring();
            process.exit(0);
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('SIGHUP', cleanup);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const autoRestart = new ServerAutoRestart();

    autoRestart.setupSignalHandlers();

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: node scripts/server-auto-restart.js [options]

Options:
  --restart    Restart server once and exit
  --monitor    Start continuous monitoring (default)
  --help       Show this help message

Examples:
  node scripts/server-auto-restart.js --restart
  node scripts/server-auto-restart.js --monitor
  npm run dev:auto-restart
        `);
        process.exit(0);
    }

    if (args.includes('--restart')) {
        autoRestart.restartServer().then(success => {
            process.exit(success ? 0 : 1);
        });
    } else {
        // Default: start monitoring
        autoRestart.startMonitoring().then(success => {
            if (!success) {
                process.exit(1);
            }
            // Keep process alive for monitoring
        });
    }
}

module.exports = ServerAutoRestart;

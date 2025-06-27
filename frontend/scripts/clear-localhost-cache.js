#!/usr/bin/env node

/**
 * Localhost Cache Management Script
 * Comprehensive cache clearing for localhost development issues
 */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

class LocalhostCacheManager {
    constructor() {
        this.platform = os.platform();
        this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
        this.dryRun = process.argv.includes('--dry-run');
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            warning: '\x1b[33m', // Yellow
            error: '\x1b[31m',   // Red
            reset: '\x1b[0m'
        };

        if (this.verbose || level !== 'info') {
            console.log(`${colors[level]}[${timestamp}] ${message}${colors.reset}`);
        }
    }

    async executeCommand(command, description) {
        this.log(`${description}: ${command}`, 'info');

        if (this.dryRun) {
            this.log('DRY RUN - Command not executed', 'warning');
            return;
        }

        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    this.log(`Error executing: ${error.message}`, 'error');
                    resolve(false);
                } else {
                    this.log(`Success: ${description}`, 'success');
                    if (this.verbose && stdout) {
                        console.log(stdout);
                    }
                    resolve(true);
                }
            });
        });
    }

    async clearDNSCache() {
        this.log('Clearing DNS cache...', 'info');

        const commands = {
            darwin: [
                'sudo dscacheutil -flushcache',
                'sudo killall -HUP mDNSResponder'
            ],
            linux: [
                'sudo systemctl restart systemd-resolved',
                'sudo service networking restart'
            ],
            win32: [
                'ipconfig /flushdns'
            ]
        };

        const platformCommands = commands[this.platform] || [];

        for (const command of platformCommands) {
            await this.executeCommand(command, `DNS cache flush (${this.platform})`);
        }
    }

    async clearBrowserCaches() {
        this.log('Clearing browser caches...', 'info');

        const userHome = os.homedir();
        const browserPaths = {
            chrome: {
                darwin: `${userHome}/Library/Caches/Google/Chrome/Default/Cache`,
                linux: `${userHome}/.cache/google-chrome/Default/Cache`,
                win32: `${userHome}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache`
            },
            safari: {
                darwin: `${userHome}/Library/Caches/com.apple.Safari`
            },
            firefox: {
                darwin: `${userHome}/Library/Caches/Firefox/Profiles`,
                linux: `${userHome}/.cache/mozilla/firefox`,
                win32: `${userHome}\\AppData\\Local\\Mozilla\\Firefox\\Profiles`
            }
        };

        for (const [browser, paths] of Object.entries(browserPaths)) {
            const path = paths[this.platform];
            if (path && fs.existsSync(path)) {
                await this.executeCommand(
                    `rm -rf "${path}"/*`,
                    `Clear ${browser} cache`
                );
            }
        }
    }

    async clearNetworkState() {
        this.log('Clearing network state...', 'info');

        if (this.platform === 'darwin') {
            await this.executeCommand(
                'sudo route -n flush',
                'Flush routing table'
            );
        }
    }

    async clearNodeCache() {
        this.log('Clearing Node.js and development caches...', 'info');

        const commands = [
            'npm cache clean --force',
            'rm -rf node_modules/.cache',
            'rm -rf .next',
            'rm -rf .cache'
        ];

        for (const command of commands) {
            await this.executeCommand(command, `Node.js cache cleaning`);
        }
    }

    async verifyLocalhost() {
        this.log('Verifying localhost connectivity...', 'info');

        const tests = [
            'ping -c 1 localhost',
            'ping -c 1 127.0.0.1',
            'nslookup localhost'
        ];

        for (const test of tests) {
            await this.executeCommand(test, `Connectivity test: ${test}`);
        }
    }

    async checkPortConflicts() {
        this.log('Checking for port conflicts...', 'info');

        const commonPorts = [3000, 3001, 8000, 8080];

        for (const port of commonPorts) {
            try {
                const output = execSync(`lsof -i :${port}`, { encoding: 'utf8' });
                if (output.trim()) {
                    this.log(`Port ${port} is in use:`, 'warning');
                    console.log(output);
                }
            } catch (error) {
                this.log(`Port ${port} is available`, 'success');
            }
        }
    }

    async run() {
        console.log('\n🧹 Localhost Cache Management Tool\n');

        if (this.dryRun) {
            this.log('Running in DRY RUN mode - no changes will be made', 'warning');
        }

        try {
            await this.clearNodeCache();
            await this.clearDNSCache();
            await this.clearBrowserCaches();
            await this.clearNetworkState();
            await this.verifyLocalhost();
            await this.checkPortConflicts();

            this.log('\n✅ Cache clearing completed successfully!', 'success');
            this.log('💡 Tip: Restart your browser for best results', 'info');

        } catch (error) {
            this.log(`❌ Error during cache clearing: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    static showHelp() {
        console.log(`
🧹 Localhost Cache Management Tool

Usage: node clear-localhost-cache.js [options]

Options:
  --verbose, -v    Show detailed output
  --dry-run        Show what would be done without executing
  --help, -h       Show this help message

Examples:
  node clear-localhost-cache.js                    # Clear all caches
  node clear-localhost-cache.js --verbose          # Verbose output
  node clear-localhost-cache.js --dry-run          # Preview actions

This tool clears:
- DNS cache (system-wide)
- Browser caches (Chrome, Safari, Firefox)
- Node.js and npm caches
- Development server caches (.next, .cache)
- Network routing state
- Verifies localhost connectivity
- Checks for port conflicts
        `);
    }
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        LocalhostCacheManager.showHelp();
        process.exit(0);
    }

    const manager = new LocalhostCacheManager();
    manager.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = LocalhostCacheManager;

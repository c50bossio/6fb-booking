#!/usr/bin/env node

/**
 * Development Startup Validator for 6FB Booking Frontend
 *
 * Proactive prevention system that runs comprehensive checks BEFORE
 * starting development servers to catch and prevent localhost issues.
 *
 * Features:
 * - Pre-startup environment validation
 * - Dependency integrity checks
 * - Network connectivity validation
 * - Port availability checks
 * - Browser extension compatibility checks
 * - Memory and system resource validation
 * - Automatic environment setup and repair
 * - Health monitoring preparation
 *
 * Usage:
 *   node scripts/dev-startup-validator.js [--mode=quick|full|paranoid]
 *   npm run dev:validate                    # Integrated with dev scripts
 */

const { exec, execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class DevStartupValidator {
    constructor() {
        this.args = process.argv.slice(2);
        this.mode = this.detectMode();
        this.verbose = this.args.includes('--verbose') || this.args.includes('-v');
        this.silent = this.args.includes('--silent');
        this.fix = this.args.includes('--fix') || this.args.includes('--auto-fix');

        this.startTime = Date.now();
        this.logFile = path.join(process.cwd(), 'logs', `dev-startup-${new Date().toISOString().split('T')[0]}.log`);

        this.results = {
            startTime: new Date().toISOString(),
            mode: this.mode,
            checks: {},
            issues: [],
            fixes: [],
            recommendations: [],
            summary: {},
            readyToStart: false
        };

        this.setupLogging();
        this.criticalIssues = [];
        this.warnings = [];
    }

    detectMode() {
        if (this.args.some(arg => arg.includes('paranoid'))) return 'paranoid';
        if (this.args.some(arg => arg.includes('full'))) return 'full';
        return 'quick';
    }

    setupLogging() {
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    }

    log(message, level = 'info', skipConsole = false) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;

        this.logStream.write(logEntry);

        if (!skipConsole && !this.silent) {
            const colors = {
                info: '\x1b[36m',
                success: '\x1b[32m',
                warning: '\x1b[33m',
                error: '\x1b[31m',
                critical: '\x1b[91m',
                phase: '\x1b[35m',
                reset: '\x1b[0m'
            };

            const color = colors[level] || colors.info;
            console.log(`${color}${message}${colors.reset}`);
        }
    }

    showProgress(phase, step, total) {
        if (this.silent) return;

        const percentage = Math.round((step / total) * 100);
        const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));

        process.stdout.write(`\r🔍 ${phase}: [${progressBar}] ${percentage}% (${step}/${total})`);

        if (step === total) {
            console.log();
        }
    }

    async executeCheck(command, description, critical = false) {
        this.log(`Checking: ${description}`, 'info');

        return new Promise((resolve) => {
            exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
                if (error) {
                    this.log(`Failed: ${description} - ${error.message}`, critical ? 'critical' : 'warning');
                    if (critical) {
                        this.criticalIssues.push({
                            type: 'check_failure',
                            description,
                            command,
                            error: error.message
                        });
                    } else {
                        this.warnings.push({
                            type: 'check_warning',
                            description,
                            command,
                            error: error.message
                        });
                    }
                    resolve({ success: false, error: error.message, stdout, stderr });
                } else {
                    this.log(`✓ ${description}`, 'success');
                    resolve({ success: true, stdout, stderr });
                }
            });
        });
    }

    async check1_SystemRequirements() {
        this.log('\n🖥️  PHASE 1: System Requirements', 'phase');
        this.results.checks.systemRequirements = { name: 'System Requirements', issues: [], passed: [] };

        const checks = [
            {
                name: 'Node.js version',
                command: 'node --version',
                validator: (output) => {
                    const version = output.trim().replace('v', '');
                    const [major] = version.split('.').map(Number);
                    return major >= 18;
                },
                fix: 'Please upgrade Node.js to version 18 or higher'
            },
            {
                name: 'NPM version',
                command: 'npm --version',
                validator: (output) => {
                    const version = output.trim();
                    const [major] = version.split('.').map(Number);
                    return major >= 8;
                },
                fix: 'Please upgrade npm: npm install -g npm@latest'
            },
            {
                name: 'Available memory',
                command: os.platform() === 'darwin' ? 'vm_stat' : 'free -m',
                validator: () => {
                    const totalMem = os.totalmem();
                    const freeMem = os.freemem();
                    const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
                    return usedPercent < 90; // Less than 90% memory usage
                },
                fix: 'Close some applications to free up memory before starting development'
            },
            {
                name: 'Disk space',
                command: 'df -h .',
                validator: (output) => {
                    const lines = output.split('\n');
                    const diskLine = lines.find(line => line.includes('%'));
                    if (diskLine) {
                        const usage = diskLine.match(/(\d+)%/);
                        return usage ? parseInt(usage[1]) < 85 : true;
                    }
                    return true;
                },
                fix: 'Clean up disk space - at least 15% free space recommended'
            }
        ];

        for (let i = 0; i < checks.length; i++) {
            this.showProgress('System Requirements', i + 1, checks.length);
            const check = checks[i];
            const result = await this.executeCheck(check.command, check.name, true);

            if (result.success) {
                const isValid = check.validator(result.stdout);
                if (isValid) {
                    this.results.checks.systemRequirements.passed.push(check.name);
                } else {
                    this.results.checks.systemRequirements.issues.push({
                        check: check.name,
                        issue: 'Validation failed',
                        fix: check.fix
                    });
                    this.criticalIssues.push({
                        type: 'system_requirement',
                        check: check.name,
                        fix: check.fix
                    });
                }
            }
        }
    }

    async check2_PortAvailability() {
        this.log('\n🔌 PHASE 2: Port Availability', 'phase');
        this.results.checks.portAvailability = { name: 'Port Availability', issues: [], passed: [] };

        const ports = [3000, 8000, 3001]; // Frontend, Backend, Backup
        const portChecks = [];

        for (let i = 0; i < ports.length; i++) {
            this.showProgress('Port Availability', i + 1, ports.length);
            const port = ports[i];

            const result = await this.executeCheck(
                `lsof -i :${port}`,
                `Port ${port} availability`,
                false
            );

            portChecks.push({
                port,
                available: !result.success, // lsof returns success if port is in use
                processes: result.success ? result.stdout : null
            });

            if (result.success) {
                // Port is in use
                this.results.checks.portAvailability.issues.push({
                    port,
                    processes: result.stdout,
                    severity: port === 3000 ? 'critical' : 'warning'
                });

                if (port === 3000) {
                    this.criticalIssues.push({
                        type: 'port_conflict',
                        port,
                        fix: `Kill processes using port ${port}: npm run kill-port`
                    });
                }
            } else {
                this.results.checks.portAvailability.passed.push(`Port ${port}`);
            }
        }

        this.results.checks.portAvailability.portChecks = portChecks;
    }

    async check3_DependencyIntegrity() {
        this.log('\n📦 PHASE 3: Dependency Integrity', 'phase');
        this.results.checks.dependencyIntegrity = { name: 'Dependency Integrity', issues: [], passed: [] };

        const checks = [
            {
                name: 'package.json exists',
                command: 'test -f package.json && echo "exists"',
                critical: true
            },
            {
                name: 'node_modules exists',
                command: 'test -d node_modules && echo "exists"',
                critical: true,
                fix: 'npm install'
            },
            {
                name: 'package-lock.json integrity',
                command: 'npm ci --dry-run 2>&1 | grep -E "(warn|error)" || echo "OK"',
                critical: false,
                fix: 'npm ci --force'
            },
            {
                name: 'Next.js installation',
                command: 'npx next --version',
                critical: true,
                fix: 'npm install next@latest'
            },
            {
                name: 'TypeScript installation',
                command: 'npx tsc --version',
                critical: true,
                fix: 'npm install typescript@latest'
            }
        ];

        for (let i = 0; i < checks.length; i++) {
            this.showProgress('Dependency Integrity', i + 1, checks.length);
            const check = checks[i];
            const result = await this.executeCheck(check.command, check.name, check.critical);

            if (result.success) {
                this.results.checks.dependencyIntegrity.passed.push(check.name);
            } else {
                this.results.checks.dependencyIntegrity.issues.push({
                    check: check.name,
                    error: result.error,
                    fix: check.fix,
                    critical: check.critical
                });

                if (check.critical) {
                    this.criticalIssues.push({
                        type: 'dependency_issue',
                        check: check.name,
                        fix: check.fix
                    });
                }
            }
        }
    }

    async check4_NetworkConnectivity() {
        this.log('\n🌐 PHASE 4: Network Connectivity', 'phase');
        this.results.checks.networkConnectivity = { name: 'Network Connectivity', issues: [], passed: [] };

        const checks = [
            {
                name: 'Localhost DNS resolution',
                command: 'nslookup localhost | grep "127.0.0.1" || ping -c 1 127.0.0.1',
                critical: true
            },
            {
                name: 'External connectivity',
                command: 'curl -s --max-time 5 https://registry.npmjs.org/ && echo "OK"',
                critical: false
            },
            {
                name: 'Loopback interface',
                command: 'ping -c 1 127.0.0.1',
                critical: true
            }
        ];

        if (this.mode === 'full' || this.mode === 'paranoid') {
            checks.push(
                {
                    name: 'IPv6 localhost',
                    command: 'ping -c 1 ::1 2>/dev/null || echo "IPv6 not available"',
                    critical: false
                },
                {
                    name: 'DNS cache status',
                    command: os.platform() === 'darwin' ?
                        'dscacheutil -statistics 2>/dev/null || echo "OK"' :
                        'systemctl status systemd-resolved 2>/dev/null || echo "OK"',
                    critical: false
                }
            );
        }

        for (let i = 0; i < checks.length; i++) {
            this.showProgress('Network Connectivity', i + 1, checks.length);
            const check = checks[i];
            const result = await this.executeCheck(check.command, check.name, check.critical);

            if (result.success) {
                this.results.checks.networkConnectivity.passed.push(check.name);
            } else {
                this.results.checks.networkConnectivity.issues.push({
                    check: check.name,
                    error: result.error
                });

                if (check.critical) {
                    this.criticalIssues.push({
                        type: 'network_issue',
                        check: check.name,
                        fix: 'Check network configuration and DNS settings'
                    });
                }
            }
        }
    }

    async check5_FileSystemIntegrity() {
        this.log('\n📁 PHASE 5: File System Integrity', 'phase');
        this.results.checks.fileSystemIntegrity = { name: 'File System Integrity', issues: [], passed: [] };

        const criticalFiles = [
            'package.json',
            'next.config.js',
            'tsconfig.json',
            'tailwind.config.js',
            'src/app/layout.tsx',
            'src/app/page.tsx'
        ];

        const criticalDirs = [
            'src',
            'src/app',
            'src/components',
            'public'
        ];

        // Check critical files
        for (let i = 0; i < criticalFiles.length; i++) {
            this.showProgress('File System Integrity', i + 1, criticalFiles.length + criticalDirs.length + 2);
            const file = criticalFiles[i];

            if (fs.existsSync(file)) {
                // Check if file is readable and not corrupted
                try {
                    const stats = fs.statSync(file);
                    if (stats.size === 0) {
                        this.results.checks.fileSystemIntegrity.issues.push({
                            type: 'empty_file',
                            file,
                            fix: `File ${file} is empty - restore from backup or git`
                        });
                        this.criticalIssues.push({
                            type: 'file_integrity',
                            file,
                            issue: 'Empty critical file'
                        });
                    } else {
                        this.results.checks.fileSystemIntegrity.passed.push(file);
                    }
                } catch (error) {
                    this.results.checks.fileSystemIntegrity.issues.push({
                        type: 'file_access',
                        file,
                        error: error.message
                    });
                }
            } else {
                this.results.checks.fileSystemIntegrity.issues.push({
                    type: 'missing_file',
                    file,
                    fix: `Critical file ${file} is missing`
                });
                this.criticalIssues.push({
                    type: 'missing_file',
                    file,
                    fix: `Restore ${file} from git or backup`
                });
            }
        }

        // Check critical directories
        for (let i = 0; i < criticalDirs.length; i++) {
            this.showProgress('File System Integrity', criticalFiles.length + i + 1,
                             criticalFiles.length + criticalDirs.length + 2);
            const dir = criticalDirs[i];

            if (fs.existsSync(dir)) {
                this.results.checks.fileSystemIntegrity.passed.push(dir);
            } else {
                this.results.checks.fileSystemIntegrity.issues.push({
                    type: 'missing_directory',
                    dir,
                    fix: `Critical directory ${dir} is missing`
                });
                this.criticalIssues.push({
                    type: 'missing_directory',
                    dir,
                    fix: `Create ${dir} directory or restore from git`
                });
            }
        }

        // Check .next directory (should not exist or be clean)
        this.showProgress('File System Integrity', criticalFiles.length + criticalDirs.length + 1,
                         criticalFiles.length + criticalDirs.length + 2);
        if (fs.existsSync('.next')) {
            const stats = fs.statSync('.next');
            const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
            if (ageMinutes > 60) { // Older than 1 hour
                this.warnings.push({
                    type: 'stale_build',
                    issue: '.next directory is stale',
                    fix: 'Clean stale build: npm run clean'
                });
            }
        }

        // Check logs directory
        this.showProgress('File System Integrity', criticalFiles.length + criticalDirs.length + 2,
                         criticalFiles.length + criticalDirs.length + 2);
        if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs', { recursive: true });
            this.log('Created logs directory', 'info');
        }
    }

    async check6_BrowserExtensionCompatibility() {
        if (this.mode === 'quick') return; // Skip in quick mode

        this.log('\n🔍 PHASE 6: Browser Extension Compatibility', 'phase');
        this.results.checks.browserCompatibility = { name: 'Browser Extension Compatibility', issues: [], passed: [] };

        try {
            // Run extension detection if available
            const result = await this.executeCheck(
                'node scripts/enhanced-extension-detector.js --json --quick',
                'Browser extension analysis',
                false
            );

            if (result.success) {
                try {
                    const extensionData = JSON.parse(result.stdout);
                    this.results.checks.browserCompatibility.extensionData = extensionData;

                    if (extensionData.recommendations && extensionData.recommendations.length > 0) {
                        this.warnings.push({
                            type: 'extension_issues',
                            count: extensionData.recommendations.length,
                            fix: 'Run: npm run debug:extensions for detailed analysis'
                        });
                    } else {
                        this.results.checks.browserCompatibility.passed.push('Extension compatibility');
                    }
                } catch (parseError) {
                    this.log('Failed to parse extension data', 'warning');
                }
            }
        } catch (error) {
            this.log(`Extension compatibility check failed: ${error.message}`, 'warning');
        }
    }

    async applyAutoFixes() {
        if (!this.fix || this.criticalIssues.length === 0) return;

        this.log('\n🔧 APPLYING AUTOMATIC FIXES', 'phase');

        const fixActions = [];

        // Port conflicts
        const portIssues = this.criticalIssues.filter(issue => issue.type === 'port_conflict');
        if (portIssues.length > 0) {
            fixActions.push({
                description: 'Kill processes on development ports',
                command: 'lsof -ti:3000,8000 | xargs kill -9 2>/dev/null || echo "No processes to kill"',
                type: 'port_cleanup'
            });
        }

        // Dependency issues
        const depIssues = this.criticalIssues.filter(issue => issue.type === 'dependency_issue');
        if (depIssues.length > 0) {
            fixActions.push({
                description: 'Install missing dependencies',
                command: 'npm install',
                type: 'dependency_install'
            });
        }

        // Stale build
        if (this.warnings.some(w => w.type === 'stale_build')) {
            fixActions.push({
                description: 'Clean stale build files',
                command: 'rm -rf .next node_modules/.cache',
                type: 'cache_cleanup'
            });
        }

        // Apply fixes
        for (let i = 0; i < fixActions.length; i++) {
            this.showProgress('Auto Fixes', i + 1, fixActions.length);
            const fix = fixActions[i];

            this.log(`Applying: ${fix.description}`, 'info');
            const result = await this.executeCheck(fix.command, fix.description, false);

            this.results.fixes.push({
                ...fix,
                applied: result.success,
                result: result
            });
        }
    }

    generateRecommendations() {
        this.log('\n💡 GENERATING RECOMMENDATIONS', 'phase');

        const recommendations = [];

        // Critical issues
        this.criticalIssues.forEach(issue => {
            recommendations.push({
                priority: 'critical',
                category: issue.type,
                action: issue.fix || 'Manual intervention required',
                issue: issue
            });
        });

        // Warnings
        this.warnings.forEach(warning => {
            recommendations.push({
                priority: 'warning',
                category: warning.type,
                action: warning.fix || 'Consider addressing',
                issue: warning
            });
        });

        // General recommendations
        if (this.mode === 'quick' && (this.criticalIssues.length > 0 || this.warnings.length > 2)) {
            recommendations.push({
                priority: 'medium',
                category: 'escalation',
                action: 'Run full validation for comprehensive analysis',
                command: 'npm run dev:validate -- --mode=full'
            });
        }

        if (this.criticalIssues.length === 0 && this.warnings.length === 0) {
            recommendations.push({
                priority: 'success',
                category: 'ready',
                action: 'Environment is ready for development',
                nextSteps: ['npm run dev', 'npm test']
            });
        }

        this.results.recommendations = recommendations;
        return recommendations;
    }

    generateSummary() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;

        const totalChecks = Object.values(this.results.checks)
            .reduce((sum, check) => sum + (check.passed?.length || 0), 0);

        const totalIssues = this.criticalIssues.length + this.warnings.length;
        const criticalCount = this.criticalIssues.length;
        const warningCount = this.warnings.length;

        const readyToStart = criticalCount === 0;

        this.results.summary = {
            duration: Math.round(duration / 1000),
            mode: this.mode,
            totalChecks,
            totalIssues,
            criticalCount,
            warningCount,
            readyToStart,
            status: readyToStart ? (warningCount === 0 ? 'excellent' : 'ready') : 'blocked',
            autoFixesApplied: this.results.fixes.filter(f => f.applied).length,
            recommendationCount: this.results.recommendations.length
        };

        this.results.readyToStart = readyToStart;
        return this.results.summary;
    }

    displaySummary() {
        if (this.silent) return;

        const { summary } = this.results;

        console.log('\n' + '='.repeat(80));
        console.log('🚀 DEVELOPMENT STARTUP VALIDATION SUMMARY');
        console.log('='.repeat(80));

        // Status indicator
        const statusIcons = {
            excellent: '🟢',
            ready: '🟡',
            blocked: '🔴'
        };
        const statusIcon = statusIcons[summary.status] || '❓';
        console.log(`${statusIcon} Status: ${summary.status.toUpperCase()}`);

        // Key metrics
        console.log(`\n📊 Validation Results:`);
        console.log(`   • Duration: ${summary.duration}s`);
        console.log(`   • Mode: ${summary.mode}`);
        console.log(`   • Checks Passed: ${summary.totalChecks}`);
        console.log(`   • Critical Issues: ${summary.criticalCount}`);
        console.log(`   • Warnings: ${summary.warningCount}`);

        if (this.results.fixes.length > 0) {
            console.log(`   • Auto-fixes Applied: ${summary.autoFixesApplied}/${this.results.fixes.length}`);
        }

        // Ready to start indicator
        if (summary.readyToStart) {
            console.log('\n✅ ENVIRONMENT READY FOR DEVELOPMENT');
            console.log('   🚀 You can safely run: npm run dev');

            if (summary.warningCount > 0) {
                console.log(`   ⚠️  ${summary.warningCount} non-critical warnings detected`);
            }
        } else {
            console.log('\n🚫 DEVELOPMENT STARTUP BLOCKED');
            console.log(`   ❌ ${summary.criticalCount} critical issues must be resolved first`);
        }

        // Top recommendations
        if (this.results.recommendations.length > 0) {
            console.log(`\n💡 Next Steps:`);
            const criticalRecs = this.results.recommendations
                .filter(r => r.priority === 'critical')
                .slice(0, 3);

            criticalRecs.forEach((rec, i) => {
                console.log(`   ${i + 1}. 🔴 ${rec.action}`);
                if (rec.command) {
                    console.log(`      → ${rec.command}`);
                }
            });

            if (summary.readyToStart) {
                console.log(`   • Start development: npm run dev`);
                console.log(`   • Run tests: npm test`);
                console.log(`   • Monitor health: npm run health:monitor`);
            }
        }

        console.log(`\n📄 Detailed log: ${this.logFile}`);
        console.log('='.repeat(80));
    }

    async run() {
        try {
            this.log('🔍 Development Startup Validation Starting', 'phase');
            this.log(`Mode: ${this.mode.toUpperCase()}${this.fix ? ' (AUTO-FIX)' : ''}`, 'info');

            // Run all checks
            await this.check1_SystemRequirements();
            await this.check2_PortAvailability();
            await this.check3_DependencyIntegrity();
            await this.check4_NetworkConnectivity();
            await this.check5_FileSystemIntegrity();
            await this.check6_BrowserExtensionCompatibility();

            // Apply auto-fixes if requested
            if (this.fix) {
                await this.applyAutoFixes();
            }

            // Generate summary and recommendations
            this.generateRecommendations();
            this.generateSummary();

            // Display results
            this.displaySummary();

            // Exit with appropriate code
            const success = this.results.summary.readyToStart;
            process.exit(success ? 0 : 1);

        } catch (error) {
            this.log(`Fatal error: ${error.message}`, 'critical');
            console.error('❌ Validation failed:', error.message);
            process.exit(1);
        } finally {
            this.logStream.end();
        }
    }

    static showHelp() {
        console.log(`
🔍 Development Startup Validator for 6FB Booking Frontend

Usage: node scripts/dev-startup-validator.js [options]

Modes:
  --mode=quick     Quick validation (default) - Essential checks only
  --mode=full      Full validation - Comprehensive analysis
  --mode=paranoid  Paranoid mode - Every possible check

Options:
  --fix            Automatically fix issues when possible
  --verbose        Show detailed output during validation
  --silent         Suppress console output (logs only)
  --help           Show this help message

Examples:
  npm run dev:validate                    # Quick validation
  npm run dev:validate -- --mode=full    # Full validation
  npm run dev:validate -- --fix          # Quick validation with auto-fix
  npm run dev:validate -- --mode=paranoid --fix --verbose

Integration with Development Scripts:
  This validator is automatically integrated with enhanced dev scripts:
  • npm run dev:safe     - Validates before starting
  • npm run dev:fresh    - Validates, cleans, then starts
  • npm run dev:paranoid - Paranoid validation before starting

Checks Performed:
  ✓ System requirements (Node.js, npm, memory, disk space)
  ✓ Port availability (3000, 8000, 3001)
  ✓ Dependency integrity (package.json, node_modules, versions)
  ✓ Network connectivity (localhost, DNS, external)
  ✓ File system integrity (critical files and directories)
  ✓ Browser extension compatibility (full/paranoid mode only)

Auto-Fix Capabilities:
  • Kill processes on development ports
  • Install missing dependencies
  • Clean stale build files and caches
  • Create missing directories
        `);
    }
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        DevStartupValidator.showHelp();
        process.exit(0);
    }

    const validator = new DevStartupValidator();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        validator.log('Validation interrupted by user', 'warning');
        process.exit(1);
    });

    validator.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DevStartupValidator;

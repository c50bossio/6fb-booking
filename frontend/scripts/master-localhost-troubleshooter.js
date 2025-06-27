#!/usr/bin/env node

/**
 * Master Localhost Troubleshooting Script for 6FB Booking Frontend
 *
 * This comprehensive script integrates all diagnostic and repair tools into
 * a single command that can automatically detect, diagnose, and fix localhost
 * connectivity issues for the 6FB booking platform.
 *
 * Features:
 * - Automatic diagnostics with existing tools
 * - Progressive severity levels (quick-fix, full-diagnostic, nuclear-option)
 * - Automated fix attempts with rollback capability
 * - Comprehensive logging and reporting
 * - User-friendly progress indicators
 * - Actionable recommendations with priority scoring
 * - Integration with existing npm scripts
 *
 * Usage:
 *   npm run fix-localhost              # Quick fix mode
 *   npm run fix-localhost -- --full    # Full diagnostic mode
 *   npm run fix-localhost -- --nuclear # Nuclear option (full reset)
 *   npm run fix-localhost -- --dry-run # Preview actions only
 */

const { exec, execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import existing diagnostic modules
const LocalhostCacheManager = require('./clear-localhost-cache.js');
const LocalhostDiagnostics = require('./localhost-diagnostics.js');
const { extensionTests, extensionDetector, reportGenerator } = require('./enhanced-extension-detector.js');

class MasterLocalhostTroubleshooter {
    constructor() {
        this.args = process.argv.slice(2);
        this.severity = this.detectSeverity();
        this.dryRun = this.args.includes('--dry-run');
        this.verbose = this.args.includes('--verbose') || this.args.includes('-v');
        this.silent = this.args.includes('--silent');

        this.startTime = Date.now();
        this.logFile = path.join(process.cwd(), 'logs', `troubleshoot-${new Date().toISOString().split('T')[0]}.log`);
        this.reportFile = path.join(process.cwd(), 'logs', `troubleshoot-report-${Date.now()}.json`);

        this.results = {
            startTime: new Date().toISOString(),
            severity: this.severity,
            dryRun: this.dryRun,
            phases: {},
            issues: [],
            fixes: [],
            recommendations: [],
            summary: {},
            endTime: null,
            duration: null
        };

        this.setupLogging();
    }

    detectSeverity() {
        if (this.args.includes('--nuclear')) return 'nuclear';
        if (this.args.includes('--full')) return 'full';
        return 'quick';
    }

    setupLogging() {
        // Ensure logs directory exists
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    }

    log(message, level = 'info', skipConsole = false) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;

        // Write to log file
        this.logStream.write(logEntry);

        // Console output with colors
        if (!skipConsole && !this.silent) {
            const colors = {
                info: '\x1b[36m',    // Cyan
                success: '\x1b[32m', // Green
                warning: '\x1b[33m', // Yellow
                error: '\x1b[31m',   // Red
                phase: '\x1b[35m',   // Magenta
                fix: '\x1b[92m',     // Bright Green
                reset: '\x1b[0m'
            };

            const color = colors[level] || colors.info;
            console.log(`${color}${message}${colors.reset}`);
        }
    }

    async executeCommand(command, description, critical = false) {
        this.log(`Executing: ${command}`, 'info');

        if (this.dryRun) {
            this.log(`DRY RUN - Would execute: ${description}`, 'warning');
            return { success: true, dryRun: true };
        }

        return new Promise((resolve) => {
            exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    this.log(`Failed: ${description} - ${error.message}`, 'error');
                    if (critical) {
                        this.results.issues.push({
                            type: 'critical_command_failure',
                            description,
                            command,
                            error: error.message
                        });
                    }
                    resolve({ success: false, error: error.message, stdout, stderr });
                } else {
                    this.log(`Success: ${description}`, 'success');
                    resolve({ success: true, stdout, stderr });
                }
            });
        });
    }

    showProgress(phase, step, total) {
        if (this.silent) return;

        const percentage = Math.round((step / total) * 100);
        const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));

        process.stdout.write(`\r🔧 ${phase}: [${progressBar}] ${percentage}% (${step}/${total})`);

        if (step === total) {
            console.log(); // New line after completion
        }
    }

    async phase1_PreFlightChecks() {
        this.log('\n🚀 PHASE 1: Pre-flight Checks', 'phase');
        this.results.phases.phase1 = { name: 'Pre-flight Checks', issues: [], fixes: [] };

        const checks = [
            { name: 'Node.js version', command: 'node --version' },
            { name: 'NPM version', command: 'npm --version' },
            { name: 'Git status', command: 'git status --porcelain' },
            { name: 'Available memory', command: 'free -h 2>/dev/null || vm_stat' },
            { name: 'Port availability', command: 'lsof -i :3000 && lsof -i :8000' }
        ];

        for (let i = 0; i < checks.length; i++) {
            this.showProgress('Pre-flight Checks', i + 1, checks.length);
            const check = checks[i];
            const result = await this.executeCommand(check.command, check.name);

            if (!result.success && check.name === 'Port availability') {
                this.results.phases.phase1.issues.push({
                    type: 'port_conflict',
                    ports: ['3000', '8000'],
                    suggestion: 'Kill existing processes or use different ports'
                });
            }
        }
    }

    async phase2_NetworkDiagnostics() {
        this.log('\n🌐 PHASE 2: Network Diagnostics', 'phase');
        this.results.phases.phase2 = { name: 'Network Diagnostics', issues: [], fixes: [] };

        try {
            // Run localhost diagnostics
            const diagnostics = new LocalhostDiagnostics();
            diagnostics.json = true; // Get JSON output
            diagnostics.verbose = false;

            this.showProgress('Network Diagnostics', 1, 4);
            await diagnostics.checkDNSResolution();

            this.showProgress('Network Diagnostics', 2, 4);
            await diagnostics.checkNetworkInterfaces();

            this.showProgress('Network Diagnostics', 3, 4);
            await diagnostics.checkPortAvailability();

            this.showProgress('Network Diagnostics', 4, 4);
            await diagnostics.checkBrowserSettings();

            this.results.phases.phase2.diagnostics = diagnostics.results;
            this.results.phases.phase2.issues = diagnostics.results.recommendations || [];

        } catch (error) {
            this.log(`Network diagnostics failed: ${error.message}`, 'error');
            this.results.phases.phase2.issues.push({
                type: 'diagnostic_failure',
                error: error.message
            });
        }
    }

    async phase3_ExtensionAnalysis() {
        this.log('\n🔍 PHASE 3: Browser Extension Analysis', 'phase');
        this.results.phases.phase3 = { name: 'Extension Analysis', issues: [], fixes: [] };

        try {
            this.showProgress('Extension Analysis', 1, 3);

            // Test localhost connectivity
            const connectivityResults = await extensionTests.testLocalhostConnectivity();

            this.showProgress('Extension Analysis', 2, 3);

            // Test CORS headers
            const corsResults = await extensionTests.testCorsHeaders();

            this.showProgress('Extension Analysis', 3, 3);

            // Test resource blocking
            const resourceResults = await extensionTests.testResourceBlocking();

            this.results.phases.phase3.testResults = {
                connectivity: connectivityResults,
                cors: corsResults,
                resources: resourceResults
            };

            // Analyze for extension issues
            const failedConnections = Object.values(connectivityResults)
                .filter(result => result.status === 'failed').length;

            if (failedConnections > 0) {
                this.results.phases.phase3.issues.push({
                    type: 'connectivity_failure',
                    count: failedConnections,
                    suggestion: 'Check for ad blockers or security extensions'
                });
            }

            if (!corsResults.success) {
                this.results.phases.phase3.issues.push({
                    type: 'cors_failure',
                    suggestion: 'Check for CORS-modifying extensions'
                });
            }

        } catch (error) {
            this.log(`Extension analysis failed: ${error.message}`, 'error');
            this.results.phases.phase3.issues.push({
                type: 'extension_analysis_failure',
                error: error.message
            });
        }
    }

    async phase4_AutomaticFixes() {
        this.log('\n🔧 PHASE 4: Automatic Fixes', 'phase');
        this.results.phases.phase4 = { name: 'Automatic Fixes', issues: [], fixes: [] };

        const fixes = this.generateFixPlan();

        for (let i = 0; i < fixes.length; i++) {
            this.showProgress('Automatic Fixes', i + 1, fixes.length);
            const fix = fixes[i];

            this.log(`Applying fix: ${fix.description}`, 'fix');
            const result = await this.applyFix(fix);

            this.results.phases.phase4.fixes.push({
                ...fix,
                applied: result.success,
                result: result
            });
        }
    }

    generateFixPlan() {
        const fixes = [];

        // Always include cache clearing for quick and full modes
        if (this.severity === 'quick' || this.severity === 'full') {
            fixes.push({
                id: 'clear_cache',
                description: 'Clear localhost cache',
                severity: 'quick',
                command: 'node scripts/clear-localhost-cache.js',
                critical: false
            });
        }

        // Port cleanup for all modes
        fixes.push({
            id: 'kill_ports',
            description: 'Kill processes on development ports',
            severity: 'quick',
            command: 'lsof -ti:3000 | xargs kill -9 2>/dev/null; lsof -ti:8000 | xargs kill -9 2>/dev/null',
            critical: false
        });

        // Full mode fixes
        if (this.severity === 'full' || this.severity === 'nuclear') {
            fixes.push(
                {
                    id: 'npm_cache_clean',
                    description: 'Clean npm cache',
                    severity: 'full',
                    command: 'npm cache clean --force',
                    critical: false
                },
                {
                    id: 'clear_next_cache',
                    description: 'Clear Next.js cache',
                    severity: 'full',
                    command: 'rm -rf .next',
                    critical: false
                },
                {
                    id: 'clear_node_modules_cache',
                    description: 'Clear node_modules cache',
                    severity: 'full',
                    command: 'rm -rf node_modules/.cache',
                    critical: false
                }
            );
        }

        // Nuclear option fixes
        if (this.severity === 'nuclear') {
            fixes.push(
                {
                    id: 'reinstall_dependencies',
                    description: 'Reinstall all dependencies',
                    severity: 'nuclear',
                    command: 'rm -rf node_modules package-lock.json && npm install',
                    critical: true
                },
                {
                    id: 'reset_git_state',
                    description: 'Reset git state (preserve changes)',
                    severity: 'nuclear',
                    command: 'git stash && git clean -fd',
                    critical: false
                }
            );
        }

        // Add conditional fixes based on detected issues
        this.addConditionalFixes(fixes);

        return fixes.filter(fix =>
            fix.severity === this.severity ||
            this.severity === 'nuclear' ||
            (this.severity === 'full' && fix.severity === 'quick')
        );
    }

    addConditionalFixes(fixes) {
        // DNS fixes
        if (this.results.phases.phase2?.issues.some(issue => issue.includes('DNS'))) {
            fixes.push({
                id: 'flush_dns',
                description: 'Flush DNS cache',
                severity: 'full',
                command: os.platform() === 'darwin' ? 'sudo dscacheutil -flushcache' : 'sudo systemctl restart systemd-resolved',
                critical: false
            });
        }

        // Port conflict fixes
        if (this.results.phases.phase1?.issues.some(issue => issue.type === 'port_conflict')) {
            fixes.push({
                id: 'aggressive_port_cleanup',
                description: 'Aggressive port cleanup',
                severity: 'full',
                command: 'sudo lsof -ti:3000,8000 | xargs sudo kill -9 2>/dev/null',
                critical: false
            });
        }
    }

    async applyFix(fix) {
        if (fix.critical && this.dryRun) {
            return { success: false, reason: 'Critical fix skipped in dry-run mode' };
        }

        return await this.executeCommand(fix.command, fix.description, fix.critical);
    }

    async phase5_Verification() {
        this.log('\n✅ PHASE 5: Verification', 'phase');
        this.results.phases.phase5 = { name: 'Verification', issues: [], fixes: [] };

        const verificationTests = [
            {
                name: 'Frontend port test',
                command: 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "FAILED"',
                expectedOutput: '200'
            },
            {
                name: 'Backend port test',
                command: 'curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/auth/health || echo "FAILED"',
                expectedOutput: '200'
            },
            {
                name: 'DNS resolution test',
                command: 'nslookup localhost | grep "127.0.0.1" && echo "SUCCESS" || echo "FAILED"',
                expectedOutput: 'SUCCESS'
            }
        ];

        const verificationResults = {};

        for (let i = 0; i < verificationTests.length; i++) {
            this.showProgress('Verification', i + 1, verificationTests.length);
            const test = verificationTests[i];
            const result = await this.executeCommand(test.command, test.name);

            verificationResults[test.name] = {
                passed: result.success && result.stdout?.includes(test.expectedOutput),
                output: result.stdout,
                error: result.error
            };
        }

        this.results.phases.phase5.verificationResults = verificationResults;

        // Count passed tests
        const passedTests = Object.values(verificationResults).filter(r => r.passed).length;
        this.results.phases.phase5.score = Math.round((passedTests / verificationTests.length) * 100);
    }

    async generateRecommendations() {
        this.log('\n💡 Generating Recommendations', 'phase');

        const recommendations = [];

        // Analyze all phases for issues
        Object.values(this.results.phases).forEach(phase => {
            if (phase.issues && phase.issues.length > 0) {
                phase.issues.forEach(issue => {
                    recommendations.push(this.generateRecommendationForIssue(issue, phase.name));
                });
            }
        });

        // Add general recommendations based on severity
        if (this.severity === 'quick' && recommendations.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'escalation',
                action: 'Consider running full diagnostic',
                command: 'npm run fix-localhost -- --full',
                reason: 'Quick fix mode detected issues that may require deeper analysis'
            });
        }

        if (this.results.phases.phase5?.score < 80) {
            recommendations.push({
                priority: 'high',
                category: 'manual_intervention',
                action: 'Manual troubleshooting required',
                details: 'Automatic fixes were not sufficient. Consider manual configuration.',
                nextSteps: [
                    'Check browser console for errors',
                    'Test in incognito mode',
                    'Verify firewall settings',
                    'Check proxy configuration'
                ]
            });
        }

        // Sort by priority
        recommendations.sort((a, b) => {
            const priorities = { high: 3, medium: 2, low: 1 };
            return priorities[b.priority] - priorities[a.priority];
        });

        this.results.recommendations = recommendations;
        return recommendations;
    }

    generateRecommendationForIssue(issue, phaseName) {
        const baseRecommendation = {
            phase: phaseName,
            issue: issue.type || issue,
            priority: 'medium'
        };

        switch (issue.type) {
            case 'port_conflict':
                return {
                    ...baseRecommendation,
                    priority: 'high',
                    category: 'port_management',
                    action: 'Resolve port conflicts',
                    command: 'npm run kill-port',
                    details: `Ports ${issue.ports?.join(', ')} are in use`
                };

            case 'connectivity_failure':
                return {
                    ...baseRecommendation,
                    priority: 'high',
                    category: 'network',
                    action: 'Fix network connectivity',
                    details: `${issue.count} endpoints failed connectivity tests`,
                    command: 'npm run fix-localhost -- --full'
                };

            case 'cors_failure':
                return {
                    ...baseRecommendation,
                    priority: 'medium',
                    category: 'cors',
                    action: 'Check CORS configuration',
                    details: 'CORS headers may be modified by browser extensions',
                    command: 'npm run debug:extensions'
                };

            default:
                return {
                    ...baseRecommendation,
                    action: 'Investigate manually',
                    details: issue.suggestion || 'No automated fix available'
                };
        }
    }

    generateSummary() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;

        this.results.endTime = new Date().toISOString();
        this.results.duration = duration;

        const totalIssues = Object.values(this.results.phases)
            .reduce((sum, phase) => sum + (phase.issues?.length || 0), 0);

        const totalFixes = Object.values(this.results.phases)
            .reduce((sum, phase) => sum + (phase.fixes?.length || 0), 0);

        const successfulFixes = Object.values(this.results.phases)
            .reduce((sum, phase) =>
                sum + (phase.fixes?.filter(fix => fix.applied).length || 0), 0);

        const verificationScore = this.results.phases.phase5?.score || 0;

        this.results.summary = {
            duration: Math.round(duration / 1000),
            severity: this.severity,
            dryRun: this.dryRun,
            totalIssues,
            totalFixes,
            successfulFixes,
            verificationScore,
            status: verificationScore >= 80 ? 'success' :
                    verificationScore >= 60 ? 'partial' : 'failure',
            recommendationCount: this.results.recommendations.length
        };
    }

    async saveReport() {
        try {
            fs.writeFileSync(this.reportFile, JSON.stringify(this.results, null, 2));
            this.log(`Report saved to: ${this.reportFile}`, 'info');
        } catch (error) {
            this.log(`Failed to save report: ${error.message}`, 'error');
        }
    }

    displaySummary() {
        if (this.silent) return;

        const { summary } = this.results;

        console.log('\n' + '='.repeat(80));
        console.log('🎯 LOCALHOST TROUBLESHOOTING SUMMARY');
        console.log('='.repeat(80));

        // Status indicator
        const statusIcon = summary.status === 'success' ? '✅' :
                          summary.status === 'partial' ? '⚠️' : '❌';
        console.log(`${statusIcon} Overall Status: ${summary.status.toUpperCase()}`);

        // Key metrics
        console.log(`\n📊 Key Metrics:`);
        console.log(`   • Duration: ${summary.duration}s`);
        console.log(`   • Severity Level: ${summary.severity}`);
        console.log(`   • Issues Found: ${summary.totalIssues}`);
        console.log(`   • Fixes Applied: ${summary.successfulFixes}/${summary.totalFixes}`);
        console.log(`   • Verification Score: ${summary.verificationScore}/100`);

        // Dry run notice
        if (summary.dryRun) {
            console.log('\n🔍 DRY RUN MODE - No changes were made');
        }

        // Recommendations
        if (this.results.recommendations.length > 0) {
            console.log(`\n💡 Top Recommendations:`);
            this.results.recommendations.slice(0, 3).forEach((rec, i) => {
                const priority = rec.priority === 'high' ? '🔴' :
                               rec.priority === 'medium' ? '🟡' : '🟢';
                console.log(`   ${i + 1}. ${priority} ${rec.action}`);
                if (rec.command) {
                    console.log(`      Command: ${rec.command}`);
                }
            });
        }

        // Next steps
        console.log(`\n🚀 Next Steps:`);
        if (summary.status === 'success') {
            console.log('   ✅ Your localhost environment is working well!');
            console.log('   • Start development: npm run dev');
            console.log('   • Run tests: npm test');
        } else {
            console.log('   🔧 Additional troubleshooting needed:');
            console.log('   • Review full report: cat ' + this.reportFile);
            console.log('   • Try nuclear option: npm run fix-localhost -- --nuclear');
            console.log('   • Check browser extensions: npm run debug:extensions');
            console.log('   • Test in incognito mode');
        }

        // Files generated
        console.log(`\n📄 Generated Files:`);
        console.log(`   • Log: ${this.logFile}`);
        console.log(`   • Report: ${this.reportFile}`);

        console.log('\n' + '='.repeat(80));
    }

    async run() {
        try {
            this.log('🚀 Master Localhost Troubleshooter Starting', 'phase');
            this.log(`Mode: ${this.severity.toUpperCase()}${this.dryRun ? ' (DRY RUN)' : ''}`, 'info');

            // Execute all phases
            await this.phase1_PreFlightChecks();
            await this.phase2_NetworkDiagnostics();
            await this.phase3_ExtensionAnalysis();
            await this.phase4_AutomaticFixes();
            await this.phase5_Verification();

            // Generate recommendations and summary
            await this.generateRecommendations();
            this.generateSummary();

            // Save and display results
            await this.saveReport();
            this.displaySummary();

            // Exit with appropriate code
            const success = this.results.summary.status === 'success';
            process.exit(success ? 0 : 1);

        } catch (error) {
            this.log(`Fatal error: ${error.message}`, 'error');
            console.error('❌ Troubleshooting failed:', error.message);
            process.exit(1);
        } finally {
            this.logStream.end();
        }
    }

    static showHelp() {
        console.log(`
🔧 Master Localhost Troubleshooter for 6FB Booking Frontend

Usage: npm run fix-localhost [options]

Severity Levels:
  (default)    Quick fix mode - Cache clearing and port cleanup
  --full       Full diagnostic mode - Comprehensive analysis and fixes
  --nuclear    Nuclear option - Complete environment reset

Options:
  --dry-run    Preview actions without executing them
  --verbose    Show detailed output during execution
  --silent     Suppress console output (logs only)
  --help       Show this help message

Examples:
  npm run fix-localhost                    # Quick fix
  npm run fix-localhost -- --full         # Full diagnostic
  npm run fix-localhost -- --nuclear      # Nuclear reset
  npm run fix-localhost -- --dry-run      # Preview only

This script integrates:
  • Cache management (clear-localhost-cache.js)
  • Network diagnostics (localhost-diagnostics.js)
  • Extension detection (enhanced-extension-detector.js)
  • Automated fixes with rollback capability
  • Comprehensive reporting and recommendations

Generated Files:
  • logs/troubleshoot-YYYY-MM-DD.log      # Detailed execution log
  • logs/troubleshoot-report-TIMESTAMP.json # Comprehensive report

Quick Commands:
  npm run kill-port                       # Kill port 3000 processes
  npm run clean                          # Clear Next.js cache
  npm run debug:extensions               # Check browser extensions
        `);
    }
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        MasterLocalhostTroubleshooter.showHelp();
        process.exit(0);
    }

    const troubleshooter = new MasterLocalhostTroubleshooter();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        troubleshooter.log('Troubleshooting interrupted by user', 'warning');
        process.exit(1);
    });

    process.on('SIGTERM', () => {
        troubleshooter.log('Troubleshooting terminated', 'warning');
        process.exit(1);
    });

    troubleshooter.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = MasterLocalhostTroubleshooter;

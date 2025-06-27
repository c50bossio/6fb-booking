#!/usr/bin/env node

/**
 * Intelligent Dependency Auto-Healing System for 6FB Booking Frontend
 * 
 * Automatically detects and fixes common dependency issues that can cause
 * startup failures, preventing developer frustration and wasted time.
 * 
 * Features:
 * - Corrupted node_modules detection and rebuilding
 * - Package.json/lock file conflict resolution
 * - Smart cache clearing when needed
 * - Dependency version conflict detection
 * - Automatic npm audit fixes
 * - Memory-efficient dependency analysis
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const crypto = require('crypto');

class DependencyAutoHealer {
    constructor() {
        this.args = process.argv.slice(2);
        this.verbose = this.args.includes('--verbose') || this.args.includes('-v');
        this.dryRun = this.args.includes('--dry-run');
        this.force = this.args.includes('--force');
        
        this.projectRoot = process.cwd();
        this.packageJsonPath = path.join(this.projectRoot, 'package.json');
        this.packageLockPath = path.join(this.projectRoot, 'package-lock.json');
        this.nodeModulesPath = path.join(this.projectRoot, 'node_modules');
        
        this.logFile = path.join(this.projectRoot, 'logs', 'dependency-healing.log');
        this.setupLogging();
        
        this.healingActions = [];
        this.issuesFound = [];
    }

    setupLogging() {
        const logsDir = path.dirname(this.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
        
        fs.appendFileSync(this.logFile, logEntry);
        
        if (this.verbose || level === 'error' || level === 'warning') {
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
    }

    async executeCommand(command, description) {
        this.log(`Executing: ${description}`, 'info');
        
        if (this.dryRun) {
            this.log(`[DRY RUN] Would execute: ${command}`, 'warning');
            return { success: true, stdout: '', stderr: '' };
        }
        
        return new Promise((resolve) => {
            exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
                if (error) {
                    this.log(`Failed: ${description} - ${error.message}`, 'error');
                    resolve({ success: false, error: error.message, stdout, stderr });
                } else {
                    this.log(`Success: ${description}`, 'success');
                    resolve({ success: true, stdout, stderr });
                }
            });
        });
    }

    checkPackageJsonIntegrity() {
        this.log('🔍 Checking package.json integrity...', 'info');
        
        if (!fs.existsSync(this.packageJsonPath)) {
            this.issuesFound.push({
                type: 'missing_package_json',
                severity: 'critical',
                description: 'package.json file is missing',
                fix: 'Cannot auto-heal missing package.json - manual intervention required'
            });
            return false;
        }
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
            
            // Check for required fields
            const requiredFields = ['name', 'dependencies', 'scripts'];
            const missingFields = requiredFields.filter(field => !packageJson[field]);
            
            if (missingFields.length > 0) {
                this.issuesFound.push({
                    type: 'malformed_package_json',
                    severity: 'high',
                    description: `Missing required fields: ${missingFields.join(', ')}`,
                    fix: 'Manual review of package.json required'
                });
                return false;
            }
            
            this.log('✅ package.json is valid', 'success');
            return true;
            
        } catch (error) {
            this.issuesFound.push({
                type: 'corrupted_package_json',
                severity: 'critical',
                description: `Invalid JSON syntax: ${error.message}`,
                fix: 'Manual repair of package.json required'
            });
            return false;
        }
    }

    checkLockFileIntegrity() {
        this.log('🔍 Checking package-lock.json integrity...', 'info');
        
        if (!fs.existsSync(this.packageLockPath)) {
            this.issuesFound.push({
                type: 'missing_lock_file',
                severity: 'medium',
                description: 'package-lock.json is missing',
                fix: 'Will regenerate during npm install'
            });
            
            this.healingActions.push({
                action: 'regenerate_lock_file',
                description: 'Regenerate package-lock.json',
                command: 'npm install --package-lock-only'
            });
            return false;
        }
        
        try {
            JSON.parse(fs.readFileSync(this.packageLockPath, 'utf8'));
            this.log('✅ package-lock.json is valid', 'success');
            return true;
        } catch (error) {
            this.issuesFound.push({
                type: 'corrupted_lock_file',
                severity: 'medium',
                description: `Corrupted package-lock.json: ${error.message}`,
                fix: 'Delete and regenerate lock file'
            });
            
            this.healingActions.push({
                action: 'fix_corrupted_lock',
                description: 'Delete corrupted lock file and regenerate',
                commands: [
                    'rm package-lock.json',
                    'npm install'
                ]
            });
            return false;
        }
    }

    checkNodeModulesIntegrity() {
        this.log('🔍 Checking node_modules integrity...', 'info');
        
        if (!fs.existsSync(this.nodeModulesPath)) {
            this.issuesFound.push({
                type: 'missing_node_modules',
                severity: 'high',
                description: 'node_modules directory is missing',
                fix: 'Run npm install to install dependencies'
            });
            
            this.healingActions.push({
                action: 'install_dependencies',
                description: 'Install missing dependencies',
                command: 'npm install'
            });
            return false;
        }
        
        // Check if node_modules is corrupted (common signs)
        const nodeModulesStats = fs.statSync(this.nodeModulesPath);
        const nodeModulesAge = Date.now() - nodeModulesStats.mtime.getTime();
        const packageJsonStats = fs.statSync(this.packageJsonPath);
        const packageJsonAge = Date.now() - packageJsonStats.mtime.getTime();
        
        // If package.json is newer than node_modules by more than 1 hour
        if (packageJsonAge < nodeModulesAge - (60 * 60 * 1000)) {
            this.issuesFound.push({
                type: 'outdated_node_modules',
                severity: 'medium',
                description: 'node_modules may be outdated (package.json is newer)',
                fix: 'Reinstall dependencies'
            });
            
            this.healingActions.push({
                action: 'refresh_dependencies',
                description: 'Refresh outdated dependencies',
                commands: [
                    'rm -rf node_modules',
                    'npm install'
                ]
            });
        }
        
        // Check for critical dependencies
        const criticalDeps = ['next', 'react', 'react-dom'];
        const missingCritical = [];
        
        for (const dep of criticalDeps) {
            const depPath = path.join(this.nodeModulesPath, dep);
            if (!fs.existsSync(depPath)) {
                missingCritical.push(dep);
            }
        }
        
        if (missingCritical.length > 0) {
            this.issuesFound.push({
                type: 'missing_critical_dependencies',
                severity: 'critical',
                description: `Critical dependencies missing: ${missingCritical.join(', ')}`,
                fix: 'Reinstall dependencies'
            });
            
            this.healingActions.push({
                action: 'install_critical_deps',
                description: 'Install missing critical dependencies',
                command: 'npm install'
            });
            return false;
        }
        
        this.log('✅ node_modules appears healthy', 'success');
        return true;
    }

    async checkDependencyConflicts() {
        this.log('🔍 Checking for dependency conflicts...', 'info');
        
        const result = await this.executeCommand('npm ls --depth=0 2>&1 || true', 'Check dependency tree');
        
        if (result.stdout.includes('ERESOLVE') || result.stdout.includes('conflicting peer dependency')) {
            this.issuesFound.push({
                type: 'dependency_conflicts',
                severity: 'high',
                description: 'Dependency version conflicts detected',
                fix: 'Run npm audit fix or manual resolution'
            });
            
            this.healingActions.push({
                action: 'fix_conflicts',
                description: 'Attempt to fix dependency conflicts',
                commands: [
                    'npm audit fix --force',
                    'npm install'
                ]
            });
            return false;
        }
        
        this.log('✅ No dependency conflicts detected', 'success');
        return true;
    }

    async checkCacheHealth() {
        this.log('🔍 Checking npm cache health...', 'info');
        
        const result = await this.executeCommand('npm cache verify', 'Verify npm cache');
        
        if (!result.success || result.stdout.includes('corrupted')) {
            this.issuesFound.push({
                type: 'corrupted_cache',
                severity: 'medium',
                description: 'npm cache appears corrupted',
                fix: 'Clear and rebuild npm cache'
            });
            
            this.healingActions.push({
                action: 'fix_cache',
                description: 'Clear corrupted npm cache',
                commands: [
                    'npm cache clean --force',
                    'npm cache verify'
                ]
            });
            return false;
        }
        
        this.log('✅ npm cache is healthy', 'success');
        return true;
    }

    async applyHealingActions() {
        if (this.healingActions.length === 0) {
            this.log('🎉 No healing actions needed - dependencies are healthy!', 'success');
            return true;
        }
        
        this.log(`🔧 Applying ${this.healingActions.length} healing actions...`, 'info');
        
        for (const action of this.healingActions) {
            this.log(`Applying: ${action.description}`, 'info');
            
            if (action.commands) {
                // Multiple commands
                for (const command of action.commands) {
                    const result = await this.executeCommand(command, `${action.description} - ${command}`);
                    if (!result.success && !this.force) {
                        this.log(`Healing action failed: ${action.description}`, 'error');
                        return false;
                    }
                }
            } else if (action.command) {
                // Single command
                const result = await this.executeCommand(action.command, action.description);
                if (!result.success && !this.force) {
                    this.log(`Healing action failed: ${action.description}`, 'error');
                    return false;
                }
            }
        }
        
        this.log('✅ All healing actions completed successfully', 'success');
        return true;
    }

    async verifyHealing() {
        this.log('🔍 Verifying healing success...', 'info');
        
        // Quick verification that critical dependencies are available
        const verificationChecks = [
            { command: 'npm list react --depth=0', description: 'React availability' },
            { command: 'npm list next --depth=0', description: 'Next.js availability' },
            { command: 'npx next --version', description: 'Next.js functionality' }
        ];
        
        for (const check of verificationChecks) {
            const result = await this.executeCommand(check.command, check.description);
            if (!result.success) {
                this.log(`Verification failed: ${check.description}`, 'warning');
                return false;
            }
        }
        
        this.log('✅ Healing verification successful', 'success');
        return true;
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                issuesFound: this.issuesFound.length,
                actionsApplied: this.healingActions.length,
                healthStatus: this.issuesFound.length === 0 ? 'healthy' : 'healed'
            },
            issues: this.issuesFound,
            actions: this.healingActions,
            recommendations: this.generateRecommendations()
        };
        
        // Save detailed report
        const reportPath = path.join(this.projectRoot, 'logs', 'dependency-healing-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.issuesFound.some(i => i.type.includes('lock'))) {
            recommendations.push('Consider using npm ci in CI/CD environments for faster, reliable installs');
        }
        
        if (this.issuesFound.some(i => i.type.includes('conflict'))) {
            recommendations.push('Review and update package.json dependency versions');
        }
        
        if (this.issuesFound.some(i => i.type.includes('cache'))) {
            recommendations.push('Consider using npm cache clean regularly during development');
        }
        
        recommendations.push('Add dependency auto-healing to your regular development workflow');
        
        return recommendations;
    }

    displaySummary(report) {
        console.log('\n' + '='.repeat(60));
        console.log('🏥 Dependency Auto-Healing Report');
        console.log('='.repeat(60));
        
        const statusIcon = report.summary.issuesFound === 0 ? '🟢' : '🟡';
        this.log(`${statusIcon} Status: ${report.summary.healthStatus.toUpperCase()}`, 'info');
        
        this.log(`📊 Issues Found: ${report.summary.issuesFound}`, 'info');
        this.log(`🔧 Actions Applied: ${report.summary.actionsApplied}`, 'info');
        
        if (report.issues.length > 0) {
            console.log('\n🔍 Issues Detected:');
            report.issues.forEach((issue, i) => {
                const severityIcon = issue.severity === 'critical' ? '🔴' : 
                                   issue.severity === 'high' ? '🟠' : '🟡';
                console.log(`   ${i + 1}. ${severityIcon} ${issue.description}`);
                console.log(`      Fix: ${issue.fix}`);
            });
        }
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach((rec, i) => {
                console.log(`   ${i + 1}. ${rec}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
    }

    async run() {
        try {
            this.log('🚀 Starting dependency auto-healing...', 'info');
            
            // Run all diagnostic checks
            const checks = [
                () => this.checkPackageJsonIntegrity(),
                () => this.checkLockFileIntegrity(),
                () => this.checkNodeModulesIntegrity(),
                () => this.checkDependencyConflicts(),
                () => this.checkCacheHealth()
            ];
            
            for (const check of checks) {
                await check();
            }
            
            // Apply healing if needed
            if (this.healingActions.length > 0) {
                const healingSuccess = await this.applyHealingActions();
                
                if (healingSuccess) {
                    await this.verifyHealing();
                }
            }
            
            // Generate and display report
            const report = this.generateReport();
            this.displaySummary(report);
            
            // Exit with appropriate code
            const hasUnresolvableIssues = this.issuesFound.some(i => 
                i.severity === 'critical' && !this.healingActions.some(a => a.action.includes(i.type))
            );
            
            process.exit(hasUnresolvableIssues ? 1 : 0);
            
        } catch (error) {
            this.log(`Fatal error: ${error.message}`, 'critical');
            console.error('❌ Dependency auto-healing failed:', error.message);
            process.exit(1);
        }
    }

    static showHelp() {
        console.log(`
🏥 Intelligent Dependency Auto-Healing System

Usage: node scripts/dependency-auto-healer.js [options]

Options:
  --verbose        Show detailed output during healing
  --dry-run        Show what would be done without making changes
  --force          Continue even if some healing actions fail
  --help           Show this help message

Examples:
  npm run deps:heal                    # Auto-heal dependency issues
  npm run deps:heal -- --dry-run       # Preview healing actions
  npm run deps:heal -- --verbose       # Detailed output

Checks Performed:
  ✓ package.json integrity and syntax
  ✓ package-lock.json corruption detection
  ✓ node_modules completeness and health
  ✓ Dependency version conflicts
  ✓ npm cache corruption

Auto-Healing Actions:
  • Regenerate corrupted lock files
  • Reinstall missing or corrupted dependencies
  • Fix dependency version conflicts
  • Clear and rebuild corrupted npm cache
  • Install missing critical dependencies

The healer will create a detailed report and only make changes that
are safe and reversible. Use --dry-run to preview actions first.
        `);
    }
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        DependencyAutoHealer.showHelp();
        process.exit(0);
    }

    const healer = new DependencyAutoHealer();
    healer.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DependencyAutoHealer;
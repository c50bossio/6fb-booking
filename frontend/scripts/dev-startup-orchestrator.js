#!/usr/bin/env node

/**
 * Development Startup Orchestrator for 6FB Booking Frontend
 *
 * Master script that coordinates all prevention checks, monitoring, and
 * development server startup in the optimal sequence to prevent issues.
 *
 * Features:
 * - Pre-startup validation with auto-fixing
 * - Progressive startup with health monitoring
 * - Automatic troubleshooting on failures
 * - Background health monitoring
 * - Graceful error handling and recovery
 * - Integration with all existing tools
 * - Real-time status reporting
 *
 * Usage:
 *   node scripts/dev-startup-orchestrator.js [--mode=safe|paranoid|express]
 *   npm run dev:orchestrated          # Full orchestrated startup
 *   npm run dev:express              # Fast startup with minimal checks
 */

const { exec, spawn, fork } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class DevStartupOrchestrator extends EventEmitter {
    constructor() {
        super();
        this.args = process.argv.slice(2);
        this.mode = this.detectMode();
        this.verbose = this.args.includes('--verbose') || this.args.includes('-v');
        this.silent = this.args.includes('--silent');
        this.noMonitoring = this.args.includes('--no-monitoring');

        this.startTime = Date.now();
        this.logFile = path.join(process.cwd(), 'logs', `dev-startup-${new Date().toISOString().split('T')[0]}.log`);

        this.state = {
            phase: 'initializing',
            steps: [],
            processes: {
                validator: null,
                monitor: null,
                devServer: null,
                troubleshooter: null
            },
            metrics: {
                startTime: new Date().toISOString(),
                mode: this.mode,
                validationTime: 0,
                startupTime: 0,
                totalTime: 0,
                issuesFound: 0,
                issuesFixed: 0,
                status: 'starting'
            }
        };

        this.phases = {
            safe: [
                { name: 'validation', script: 'dev-startup-validator.js', args: ['--mode=full', '--fix'] },
                { name: 'troubleshooting', script: 'master-localhost-troubleshooter.js', args: ['--quick'], optional: true },
                { name: 'monitoring', script: 'dev-health-monitor.js', args: ['--alerts'], background: true },
                { name: 'dev-server', command: 'next dev -p 3000' }
            ],
            paranoid: [
                { name: 'validation', script: 'dev-startup-validator.js', args: ['--mode=paranoid', '--fix'] },
                { name: 'troubleshooting', script: 'master-localhost-troubleshooter.js', args: ['--full'] },
                { name: 'monitoring', script: 'dev-health-monitor.js', args: ['--dashboard', '--alerts'], background: true },
                { name: 'dev-server', command: 'next dev -p 3000' }
            ],
            express: [
                { name: 'validation', script: 'dev-startup-validator.js', args: ['--mode=quick', '--fix', '--silent'] },
                { name: 'dev-server', command: 'next dev -p 3000' }
            ],
            emergency: [
                { name: 'cleanup', command: 'lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No processes to kill"' },
                { name: 'cache-clean', command: 'rm -rf .next node_modules/.cache' },
                { name: 'dev-server', command: 'next dev -p 3000' }
            ]
        };

        this.setupLogging();
        this.setupEventHandlers();
    }

    detectMode() {
        if (this.args.some(arg => arg.includes('paranoid'))) return 'paranoid';
        if (this.args.some(arg => arg.includes('express'))) return 'express';
        return 'safe';
    }

    setupLogging() {
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    }

    setupEventHandlers() {
        this.on('phase_start', (phase) => this.handlePhaseStart(phase));
        this.on('phase_complete', (phase, result) => this.handlePhaseComplete(phase, result));
        this.on('phase_error', (phase, error) => this.handlePhaseError(phase, error));
        this.on('validation_issues', (issues) => this.handleValidationIssues(issues));
        this.on('fallback_triggered', (data) => this.handleFallback(data));

        // Graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
        process.on('exit', () => this.cleanup());
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
                phase: '\x1b[35m',
                reset: '\x1b[0m'
            };

            const color = colors[level] || colors.info;
            console.log(`${color}${message}${colors.reset}`);
        }
    }

    showProgress(step, total, message) {
        if (this.silent) return;

        const percentage = Math.round((step / total) * 100);
        const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));

        process.stdout.write(`\r🚀 [${progressBar}] ${percentage}% - ${message}`);

        if (step === total) {
            console.log();
        }
    }

    async executeScript(scriptPath, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const scriptFullPath = path.join(process.cwd(), 'scripts', scriptPath);

            if (!fs.existsSync(scriptFullPath)) {
                reject(new Error(`Script not found: ${scriptPath}`));
                return;
            }

            const childProcess = spawn('node', [scriptFullPath, ...args], {
                stdio: options.background ? 'pipe' : 'inherit',
                cwd: process.cwd()
            });

            let stdout = '';
            let stderr = '';

            if (options.background) {
                childProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                childProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            childProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, stdout, stderr, process: childProcess });
                } else {
                    reject(new Error(`Script ${scriptPath} failed with code ${code}`));
                }
            });

            childProcess.on('error', (error) => {
                reject(error);
            });

            // Store process reference for cleanup
            if (options.background) {
                return { success: true, stdout: '', stderr: '', process: childProcess };
            }
        });
    }

    async executeCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            const childProcess = spawn('sh', ['-c', command], {
                stdio: options.background ? 'pipe' : 'inherit',
                cwd: process.cwd()
            });

            let stdout = '';
            let stderr = '';

            if (options.background) {
                childProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                childProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            childProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, stdout, stderr, process: childProcess });
                } else {
                    reject(new Error(`Command failed with code ${code}: ${command}`));
                }
            });

            childProcess.on('error', (error) => {
                reject(error);
            });

            return childProcess;
        });
    }

    async runPhase(phase) {
        this.emit('phase_start', phase);

        try {
            let result;

            if (phase.script) {
                this.log(`Executing script: ${phase.script}`, 'info');
                result = await this.executeScript(phase.script, phase.args, { background: phase.background });

                if (phase.background) {
                    this.state.processes[phase.name] = result.process;
                }
            } else if (phase.command) {
                this.log(`Executing command: ${phase.command}`, 'info');
                result = await this.executeCommand(phase.command, { background: phase.background });

                if (phase.background) {
                    this.state.processes[phase.name] = result.process;
                }
            }

            this.emit('phase_complete', phase, result);
            return result;

        } catch (error) {
            if (phase.optional) {
                this.log(`Optional phase ${phase.name} failed: ${error.message}`, 'warning');
                return { success: false, error, optional: true };
            } else {
                this.emit('phase_error', phase, error);
                throw error;
            }
        }
    }

    handlePhaseStart(phase) {
        this.log(`🚀 Starting phase: ${phase.name}`, 'phase');
        this.state.phase = phase.name;
        this.state.steps.push({
            name: phase.name,
            startTime: Date.now(),
            status: 'running'
        });
    }

    handlePhaseComplete(phase, result) {
        const step = this.state.steps.find(s => s.name === phase.name && s.status === 'running');
        if (step) {
            step.endTime = Date.now();
            step.duration = step.endTime - step.startTime;
            step.status = 'completed';
            step.success = result.success;
        }

        this.log(`✅ Completed phase: ${phase.name} (${step?.duration}ms)`, 'success');

        // Handle validation results
        if (phase.name === 'validation' && result.stdout) {
            try {
                const validationData = JSON.parse(result.stdout);
                if (validationData.issues) {
                    this.emit('validation_issues', validationData.issues);
                }
            } catch (e) {
                // Validation output might not be JSON
            }
        }
    }

    handlePhaseError(phase, error) {
        const step = this.state.steps.find(s => s.name === phase.name && s.status === 'running');
        if (step) {
            step.endTime = Date.now();
            step.duration = step.endTime - step.startTime;
            step.status = 'failed';
            step.error = error.message;
        }

        this.log(`❌ Phase failed: ${phase.name} - ${error.message}`, 'error');
        this.state.metrics.status = 'failed';

        // Trigger automatic fallback for critical failures
        if (phase.name === 'validation' && this.mode !== 'emergency') {
            this.log('🔧 Attempting automatic fallback to emergency mode', 'warning');
            this.emit('fallback_triggered', { failedPhase: phase.name, originalMode: this.mode });
        }
    }

    handleValidationIssues(issues) {
        this.state.metrics.issuesFound = issues.length;

        if (issues.length > 0) {
            this.log(`Found ${issues.length} validation issues`, 'warning');

            // Check if we should escalate to troubleshooting
            const criticalIssues = issues.filter(issue => issue.critical);
            if (criticalIssues.length > 0 && this.mode === 'express') {
                this.log('Critical issues detected - escalating to safe mode', 'warning');
                this.mode = 'safe';
            }
        }
    }

    async handleFallback(data) {
        this.log('🚨 Initiating emergency startup sequence', 'warning');

        try {
            // Switch to emergency mode
            const originalMode = this.mode;
            this.mode = 'emergency';
            const emergencyPhases = this.phases.emergency;

            this.log(`Falling back from ${originalMode} to emergency mode due to ${data.failedPhase} failure`, 'warning');

            for (const phase of emergencyPhases) {
                this.log(`Emergency phase: ${phase.name}`, 'warning');
                const result = await this.runPhase(phase);

                if (phase.name === 'dev-server') {
                    this.log('✅ Emergency startup successful!', 'success');
                    this.state.metrics.status = 'emergency_success';
                    this.state.metrics.fallbackUsed = true;
                    return { success: true, mode: 'emergency', fallback: true };
                }
            }
        } catch (error) {
            this.log(`Emergency startup failed: ${error.message}`, 'critical');
            this.state.metrics.status = 'critical_failure';
            throw new Error(`All startup methods failed. Last error: ${error.message}`);
        }
    }

    async attemptRecovery(failedPhase, error) {
        this.log(`🔧 Attempting recovery from ${failedPhase.name} failure`, 'warning');

        const recoveryStrategies = {
            validation: async () => {
                this.log('Running emergency troubleshooter', 'info');
                return await this.executeScript('master-localhost-troubleshooter.js', ['--quick']);
            },
            'dev-server': async () => {
                this.log('Attempting port cleanup and restart', 'info');
                await this.executeCommand('lsof -ti:3000 | xargs kill -9 2>/dev/null || true');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                return await this.executeCommand('next dev -p 3000', { background: true });
            }
        };

        const recovery = recoveryStrategies[failedPhase.name];
        if (recovery) {
            try {
                const result = await recovery();
                this.log(`✅ Recovery successful for ${failedPhase.name}`, 'success');
                return result;
            } catch (recoveryError) {
                this.log(`❌ Recovery failed for ${failedPhase.name}: ${recoveryError.message}`, 'error');
                throw recoveryError;
            }
        } else {
            throw new Error(`No recovery strategy available for ${failedPhase.name}`);
        }
    }

    displayStartupSummary() {
        if (this.silent) return;

        const totalTime = Date.now() - this.startTime;
        const completedSteps = this.state.steps.filter(s => s.status === 'completed').length;
        const failedSteps = this.state.steps.filter(s => s.status === 'failed').length;

        console.log('\n' + '='.repeat(80));
        console.log('🚀 DEVELOPMENT STARTUP SUMMARY');
        console.log('='.repeat(80));

        // Overall status
        const statusIcon = failedSteps === 0 ? '✅' : '❌';
        const status = failedSteps === 0 ? 'SUCCESS' : 'FAILED';
        console.log(`${statusIcon} Status: ${status}`);

        // Metrics
        console.log(`\n📊 Startup Metrics:`);
        console.log(`   • Total Time: ${Math.round(totalTime / 1000)}s`);
        console.log(`   • Mode: ${this.mode}`);
        console.log(`   • Steps Completed: ${completedSteps}/${this.state.steps.length}`);
        console.log(`   • Issues Found: ${this.state.metrics.issuesFound}`);
        console.log(`   • Issues Fixed: ${this.state.metrics.issuesFixed}`);

        // Step breakdown
        if (this.verbose) {
            console.log(`\n📋 Step Breakdown:`);
            this.state.steps.forEach(step => {
                const icon = step.status === 'completed' ? '✅' :
                           step.status === 'failed' ? '❌' : '⏳';
                const duration = step.duration ? `${step.duration}ms` : 'N/A';
                console.log(`   ${icon} ${step.name}: ${step.status} (${duration})`);
            });
        }

        // Running processes
        const runningProcesses = Object.entries(this.state.processes)
            .filter(([name, process]) => process && !process.killed)
            .map(([name]) => name);

        if (runningProcesses.length > 0) {
            console.log(`\n🔄 Running Processes:`);
            runningProcesses.forEach(name => {
                console.log(`   • ${name}`);
            });
        }

        // Next steps
        console.log(`\n🎯 Next Steps:`);
        if (failedSteps === 0) {
            console.log('   ✅ Development environment is ready!');
            console.log('   🌐 Frontend: http://localhost:3000');
            console.log('   📊 Monitor: npm run dev:dashboard');
        } else {
            console.log('   🔧 Fix remaining issues');
            console.log('   🚨 Check logs for details');
            console.log('   🛠️  Try: npm run emergency:fix');
        }

        console.log(`\n📄 Detailed log: ${this.logFile}`);
        console.log('='.repeat(80));
    }

    cleanup() {
        // Kill background processes if orchestrator is shutting down
        Object.entries(this.state.processes).forEach(([name, process]) => {
            if (process && !process.killed) {
                this.log(`Cleaning up process: ${name}`, 'info');
                process.kill('SIGTERM');
            }
        });
    }

    shutdown() {
        this.log('Orchestrator shutting down...', 'info');
        this.displayStartupSummary();
        this.cleanup();
        this.logStream.end();
        process.exit(0);
    }

    async run() {
        try {
            this.log('🎼 Development Startup Orchestrator Starting', 'phase');
            this.log(`Mode: ${this.mode.toUpperCase()}`, 'info');

            const phaseSequence = this.phases[this.mode];

            for (let i = 0; i < phaseSequence.length; i++) {
                const phase = phaseSequence[i];

                this.showProgress(i + 1, phaseSequence.length, `${phase.name}`);

                try {
                    await this.runPhase(phase);
                } catch (error) {
                    this.log(`Phase ${phase.name} failed: ${error.message}`, 'error');

                    // Attempt recovery
                    try {
                        await this.attemptRecovery(phase, error);
                    } catch (recoveryError) {
                        this.log(`Recovery failed for ${phase.name}`, 'error');

                        // If this is a critical phase, abort
                        if (!phase.optional && phase.name !== 'monitoring') {
                            throw new Error(`Critical phase ${phase.name} failed and recovery was unsuccessful`);
                        }
                    }
                }
            }

            this.state.metrics.status = 'success';
            this.state.metrics.totalTime = Date.now() - this.startTime;

            this.displayStartupSummary();

            // Keep process running to maintain background processes
            if (!this.noMonitoring && this.state.processes.monitor) {
                this.log('Orchestrator will continue running to maintain background processes', 'info');
                this.log('Press Ctrl+C to stop all processes', 'info');

                // Don't exit - keep background processes running
                process.stdin.resume();
            }

        } catch (error) {
            this.log(`Fatal error: ${error.message}`, 'error');
            this.state.metrics.status = 'failed';
            this.displayStartupSummary();
            process.exit(1);
        }
    }

    static showHelp() {
        console.log(`
🎼 Development Startup Orchestrator for 6FB Booking Frontend

Usage: node scripts/dev-startup-orchestrator.js [options]

Modes:
  --mode=safe      Safe mode (default) - Full validation + monitoring
  --mode=paranoid  Paranoid mode - Comprehensive checks and troubleshooting
  --mode=express   Express mode - Minimal checks for fast startup

Options:
  --no-monitoring  Skip background health monitoring
  --verbose        Show detailed step breakdown
  --silent         Suppress console output (logs only)
  --help           Show this help message

Examples:
  npm run dev:orchestrated                 # Safe mode startup
  npm run dev:orchestrated -- --mode=paranoid  # Paranoid mode
  npm run dev:express                      # Express mode

Phase Sequences:

Safe Mode:
  1. Full validation with auto-fix
  2. Quick troubleshooting (optional)
  3. Background health monitoring
  4. Development server startup

Paranoid Mode:
  1. Paranoid validation with auto-fix
  2. Full troubleshooting
  3. Dashboard monitoring
  4. Development server startup

Express Mode:
  1. Quick validation with auto-fix
  2. Development server startup

Features:
  ✓ Automatic issue detection and fixing
  ✓ Progressive startup with recovery
  ✓ Background health monitoring
  ✓ Graceful error handling
  ✓ Comprehensive logging
  ✓ Real-time progress tracking
        `);
    }
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        DevStartupOrchestrator.showHelp();
        process.exit(0);
    }

    const orchestrator = new DevStartupOrchestrator();
    orchestrator.run().catch(error => {
        console.error('❌ Orchestration failed:', error);
        process.exit(1);
    });
}

module.exports = DevStartupOrchestrator;

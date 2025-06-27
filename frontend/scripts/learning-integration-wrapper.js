#!/usr/bin/env node

/**
 * Learning Integration Wrapper for 6FB Booking Frontend
 *
 * Automatically integrates the cross-session learning system with existing
 * development scripts to track success/failure patterns seamlessly.
 *
 * This wrapper can be used to automatically record learning data when
 * development scripts succeed or fail, providing passive learning without
 * manual intervention.
 *
 * Usage:
 *   node scripts/learning-integration-wrapper.js --method=dev:safe --command="npm run dev:validate && npm run dev:raw"
 *   node scripts/learning-integration-wrapper.js --auto-detect [original_command]
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const CrossSessionLearningSystem = require('./cross-session-learning');

class LearningIntegrationWrapper {
    constructor() {
        this.args = process.argv.slice(2);
        this.verbose = this.args.includes('--verbose') || this.args.includes('-v');
        this.learningSystem = new CrossSessionLearningSystem();
        this.startTime = Date.now();
    }

    detectMethodFromCommand(command) {
        const methodMap = {
            'npm run dev:safe': 'dev:safe',
            'npm run dev:fresh': 'dev:fresh',
            'npm run dev:paranoid': 'dev:paranoid',
            'npm run dev:raw': 'dev:raw',
            'npm run dev:failsafe': 'dev:failsafe',
            'npm run dev:recovery': 'dev:recovery',
            'npm run dev:skip-validation': 'dev:skip-validation',
            'npm run dev:validate': 'dev:validate',
            'npm run dev:with-monitoring': 'dev:with-monitoring'
        };

        for (const [cmdPattern, method] of Object.entries(methodMap)) {
            if (command.includes(cmdPattern)) {
                return method;
            }
        }

        return 'unknown';
    }

    extractValidationMode(command) {
        if (command.includes('paranoid')) return 'paranoid';
        if (command.includes('full')) return 'full';
        if (command.includes('quick')) return 'quick';
        if (command.includes('skip-validation')) return 'none';
        return 'unknown';
    }

    async executeWithLearning(command, method = null, additionalDetails = {}) {
        const detectedMethod = method || this.detectMethodFromCommand(command);
        const validationMode = this.extractValidationMode(command);

        if (this.verbose) {
            console.log(`🧠 Learning Wrapper: Executing '${command}' (method: ${detectedMethod})`);
        }

        return new Promise((resolve) => {
            const startTime = Date.now();

            exec(command, { timeout: 300000 }, async (error, stdout, stderr) => {
                const duration = (Date.now() - startTime) / 1000;
                const outcome = error ? 'failure' : 'success';

                const details = {
                    startup_method: detectedMethod,
                    validation_mode: validationMode,
                    duration: duration,
                    ...additionalDetails
                };

                if (error) {
                    details.error_type = this.categorizeError(error.message, stderr);
                    details.exit_code = error.code;

                    // Try to detect resolution hints
                    const resolution = this.suggestResolution(error.message, stderr);
                    if (resolution) {
                        details.suggested_resolution = resolution;
                    }
                }

                // Record the session
                try {
                    await this.learningSystem.recordSession(outcome, details);

                    if (this.verbose) {
                        console.log(`📚 Recorded ${outcome} session for method: ${detectedMethod}`);
                    }
                } catch (learningError) {
                    console.warn('⚠️ Could not record learning session:', learningError.message);
                }

                resolve({
                    success: !error,
                    outcome,
                    duration,
                    stdout,
                    stderr,
                    error: error?.message,
                    details
                });
            });
        });
    }

    categorizeError(errorMessage, stderr) {
        const errorPatterns = {
            port_conflict: /port.*already.*use|EADDRINUSE|listen EADDRINUSE/i,
            dependency_issue: /module.*not.*found|cannot.*resolve|npm.*install/i,
            network_issue: /network.*error|ENOTFOUND|ECONNREFUSED|timeout/i,
            permission_issue: /permission.*denied|EACCES|EPERM/i,
            memory_issue: /out.*of.*memory|heap.*out.*of.*memory|killed.*signal.*9/i,
            validation_failure: /validation.*failed|check.*failed|lint.*error/i,
            cache_issue: /cache.*corrupt|cache.*invalid|stale.*cache/i,
            build_error: /build.*failed|compilation.*error|syntax.*error/i,
            extension_conflict: /extension.*conflict|browser.*extension/i
        };

        const combinedText = `${errorMessage} ${stderr}`.toLowerCase();

        for (const [category, pattern] of Object.entries(errorPatterns)) {
            if (pattern.test(combinedText)) {
                return category;
            }
        }

        return 'unknown_error';
    }

    suggestResolution(errorMessage, stderr) {
        const errorType = this.categorizeError(errorMessage, stderr);

        const resolutionMap = {
            port_conflict: 'kill_port',
            dependency_issue: 'npm_install',
            network_issue: 'check_network',
            cache_issue: 'clear_cache',
            validation_failure: 'fix_validation',
            build_error: 'clean_rebuild',
            extension_conflict: 'disable_extensions'
        };

        return resolutionMap[errorType] || null;
    }

    async showPreStartRecommendations() {
        if (this.verbose) {
            console.log('🧠 Checking for personalized recommendations...\n');
        }

        const recommendations = this.learningSystem.generatePersonalizedRecommendations();
        const highPriorityRecs = recommendations.filter(rec =>
            ['critical', 'high'].includes(rec.priority)
        );

        if (highPriorityRecs.length > 0) {
            console.log('💡 Before you start, here are some recommendations based on your patterns:\n');

            highPriorityRecs.forEach((rec, index) => {
                const icons = { critical: '🚨', high: '🔴', medium: '🟡' };
                const icon = icons[rec.priority] || '💡';

                console.log(`   ${icon} ${rec.message}`);
                if (rec.command) {
                    console.log(`      Suggested: ${rec.command}`);
                }
                if (rec.suggestion) {
                    console.log(`      Tip: ${rec.suggestion}`);
                }
                console.log('');
            });
        }
    }

    async createSmartDevScript(method = 'dev:safe') {
        // Create a smart wrapper that uses learning recommendations
        const recommendations = this.learningSystem.generatePersonalizedRecommendations();
        const bestMethod = recommendations.find(rec => rec.type === 'startup_method');

        const recommendedMethod = bestMethod ? bestMethod.command : `npm run ${method}`;

        console.log(`🧠 Smart Development Script Recommendation:`);
        console.log(`   Based on your learning data, try: ${recommendedMethod}`);

        if (bestMethod) {
            console.log(`   Success Rate: ${Math.round(bestMethod.success_rate * 100)}%`);
            console.log(`   Confidence: ${Math.round(bestMethod.confidence * 100)}%`);
        }

        return recommendedMethod;
    }

    async run() {
        try {
            if (this.args.includes('--help') || this.args.includes('-h')) {
                this.showHelp();
                return;
            }

            // Smart development mode
            if (this.args.includes('--smart-dev')) {
                await this.showPreStartRecommendations();
                const smartCommand = await this.createSmartDevScript();
                console.log(`\n🚀 Executing: ${smartCommand}\n`);

                const result = await this.executeWithLearning(smartCommand);

                if (result.success) {
                    console.log('✅ Development server started successfully!');
                } else {
                    console.log('❌ Failed to start development server');
                    console.log('💡 Check recommendations with: npm run learn:recommend');
                }

                return;
            }

            // Manual command execution with learning
            const methodIndex = this.args.indexOf('--method');
            const commandIndex = this.args.indexOf('--command');

            if (methodIndex !== -1 && commandIndex !== -1) {
                const method = this.args[methodIndex + 1];
                const command = this.args[commandIndex + 1];

                if (!method || !command) {
                    console.error('❌ --method and --command require values');
                    process.exit(1);
                }

                const result = await this.executeWithLearning(command, method);
                process.exit(result.success ? 0 : 1);
            }

            // Auto-detect mode
            if (this.args.includes('--auto-detect')) {
                const command = this.args.slice(this.args.indexOf('--auto-detect') + 1).join(' ');
                if (!command) {
                    console.error('❌ --auto-detect requires a command');
                    process.exit(1);
                }

                const result = await this.executeWithLearning(command);
                process.exit(result.success ? 0 : 1);
            }

            // Default: show usage
            console.log('🧠 Learning Integration Wrapper');
            console.log('Use --help for usage information or --smart-dev for intelligent development mode');

        } catch (error) {
            console.error('❌ Wrapper error:', error.message);
            process.exit(1);
        }
    }

    showHelp() {
        console.log(`
🧠 Learning Integration Wrapper for 6FB Booking Frontend

Usage: node scripts/learning-integration-wrapper.js [options]

Smart Development Mode:
  --smart-dev                     Automatically use best method based on learning

Manual Execution:
  --method=METHOD --command=CMD   Execute command with specified method tracking
  --auto-detect COMMAND           Auto-detect method from command and execute

Options:
  --verbose, -v                   Show detailed output
  --help, -h                      Show this help message

Examples:

Smart Development (Recommended):
  node scripts/learning-integration-wrapper.js --smart-dev
  # Analyzes your patterns and uses the best startup method

Manual Learning Integration:
  node scripts/learning-integration-wrapper.js --method=dev:safe --command="npm run dev:safe"
  node scripts/learning-integration-wrapper.js --auto-detect "npm run dev:fresh"

Integration with npm scripts:
  Add to package.json:
  "dev:smart": "node scripts/learning-integration-wrapper.js --smart-dev"
  "dev:learn": "node scripts/learning-integration-wrapper.js --auto-detect"

Benefits:
  • Automatically tracks success/failure patterns
  • Provides pre-start recommendations
  • Learns optimal methods for your environment
  • Suggests resolutions for common issues
  • Builds personalized development workflows

Learning Data Integration:
  This wrapper automatically feeds data to the cross-session learning system,
  eliminating the need for manual session recording while providing intelligent
  recommendations based on your actual usage patterns.
        `);
    }
}

// Main execution
if (require.main === module) {
    const wrapper = new LearningIntegrationWrapper();
    wrapper.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = LearningIntegrationWrapper;

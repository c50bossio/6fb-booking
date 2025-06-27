#!/usr/bin/env node

/**
 * Cross-Session Learning System for 6FB Booking Frontend
 *
 * Intelligent learning system that tracks developer patterns, environment factors,
 * and success/failure patterns to provide personalized development recommendations.
 *
 * Features:
 * - Pattern recognition for startup success/failure
 * - Environmental factor correlation analysis
 * - Personalized workflow recommendations
 * - Historical trend analysis
 * - Smart defaults that improve over time
 * - Configuration optimization suggestions
 * - Time-of-day and day-of-week pattern analysis
 * - Memory and system performance correlation tracking
 *
 * Usage:
 *   node scripts/cross-session-learning.js --learn [success|failure] [--data="details"]
 *   node scripts/cross-session-learning.js --recommend
 *   node scripts/cross-session-learning.js --analyze
 *   node scripts/cross-session-learning.js --optimize
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class CrossSessionLearningSystem {
    constructor() {
        this.dataDir = path.join(process.cwd(), 'learning-data');
        this.learningDataFile = path.join(this.dataDir, 'learning-data.json');
        this.userPreferencesFile = path.join(this.dataDir, 'user-preferences.json');
        this.patternsFile = path.join(this.dataDir, 'success-patterns.json');
        this.environmentalFactorsFile = path.join(this.dataDir, 'environmental-factors.json');
        this.recommendationsFile = path.join(this.dataDir, 'recommendations-history.json');

        this.args = process.argv.slice(2);
        this.verbose = this.args.includes('--verbose') || this.args.includes('-v');

        this.initializeDataStructures();
        this.loadExistingData();
    }

    initializeDataStructures() {
        // Create learning data directory if it doesn't exist
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }

        this.defaultLearningData = {
            sessions: [],
            patterns: {
                startup_methods: {},
                time_patterns: {},
                environmental_correlations: {},
                failure_patterns: {},
                success_sequences: []
            },
            statistics: {
                total_sessions: 0,
                success_rate: 0,
                most_successful_method: null,
                most_problematic_factors: [],
                learning_confidence: 0
            },
            metadata: {
                created: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                version: '1.0.0'
            }
        };

        this.defaultUserPreferences = {
            preferred_startup_methods: [],
            skip_validation_conditions: [],
            optimal_work_times: {},
            environment_preferences: {
                memory_threshold: 85,
                port_preferences: [3000, 3001, 3002],
                validation_mode_preference: 'quick'
            },
            notification_preferences: {
                remind_cache_clear: true,
                suggest_port_changes: true,
                performance_warnings: true
            },
            learning_settings: {
                auto_learn: true,
                confidence_threshold: 0.7,
                pattern_sensitivity: 'medium'
            }
        };

        this.defaultPatterns = {
            success_indicators: [],
            failure_predictors: [],
            correlation_matrix: {},
            temporal_patterns: {},
            environmental_patterns: {},
            sequence_patterns: []
        };

        this.defaultEnvironmentalFactors = {
            system_metrics: [],
            network_conditions: [],
            process_states: [],
            memory_usage_history: [],
            disk_usage_history: [],
            port_usage_patterns: []
        };
    }

    loadExistingData() {
        this.learningData = this.loadJSONFile(this.learningDataFile, this.defaultLearningData);
        this.userPreferences = this.loadJSONFile(this.userPreferencesFile, this.defaultUserPreferences);
        this.patterns = this.loadJSONFile(this.patternsFile, this.defaultPatterns);
        this.environmentalFactors = this.loadJSONFile(this.environmentalFactorsFile, this.defaultEnvironmentalFactors);
    }

    loadJSONFile(filePath, defaultData) {
        try {
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return { ...defaultData, ...data };
            }
        } catch (error) {
            console.warn(`⚠️ Could not load ${path.basename(filePath)}, using defaults:`, error.message);
        }
        return defaultData;
    }

    saveData() {
        try {
            this.learningData.metadata.last_updated = new Date().toISOString();

            fs.writeFileSync(this.learningDataFile, JSON.stringify(this.learningData, null, 2));
            fs.writeFileSync(this.userPreferencesFile, JSON.stringify(this.userPreferences, null, 2));
            fs.writeFileSync(this.patternsFile, JSON.stringify(this.patterns, null, 2));
            fs.writeFileSync(this.environmentalFactorsFile, JSON.stringify(this.environmentalFactors, null, 2));
        } catch (error) {
            console.error('❌ Error saving learning data:', error.message);
        }
    }

    async captureEnvironmentalSnapshot() {
        const snapshot = {
            timestamp: new Date().toISOString(),
            system: {
                platform: os.platform(),
                arch: os.arch(),
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    usage_percent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
                },
                load_average: os.loadavg(),
                uptime: os.uptime()
            },
            time_context: {
                hour: new Date().getHours(),
                day_of_week: new Date().getDay(),
                day_of_month: new Date().getDate(),
                is_weekend: [0, 6].includes(new Date().getDay()),
                time_of_day: this.categorizeTimeOfDay(new Date().getHours())
            },
            network: {},
            processes: {},
            disk_usage: null,
            port_usage: []
        };

        try {
            // Network connectivity
            const pingResult = await this.executeCommand('ping -c 1 8.8.8.8', 3000);
            snapshot.network.connectivity = pingResult.success;
            snapshot.network.latency = this.extractLatency(pingResult.stdout);

            // Disk usage
            const diskResult = await this.executeCommand('df -h .', 3000);
            if (diskResult.success) {
                snapshot.disk_usage = this.parseDiskUsage(diskResult.stdout);
            }

            // Port usage patterns
            const portResult = await this.executeCommand('lsof -i :3000,3001,3002,8000', 3000);
            snapshot.port_usage = this.parsePortUsage(portResult.stdout);

            // Running processes count
            const processResult = await this.executeCommand('ps aux | wc -l', 3000);
            if (processResult.success) {
                snapshot.processes.count = parseInt(processResult.stdout.trim());
            }

        } catch (error) {
            console.warn('⚠️ Could not capture some environmental data:', error.message);
        }

        return snapshot;
    }

    categorizeTimeOfDay(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 22) return 'evening';
        return 'night';
    }

    extractLatency(pingOutput) {
        const match = pingOutput.match(/time=(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
    }

    parseDiskUsage(diskOutput) {
        const lines = diskOutput.split('\n');
        const diskLine = lines.find(line => line.includes('%'));
        if (diskLine) {
            const parts = diskLine.split(/\s+/);
            const usageIndex = parts.findIndex(part => part.includes('%'));
            if (usageIndex >= 0) {
                return {
                    usage_percent: parseInt(parts[usageIndex].replace('%', '')),
                    available: parts[usageIndex - 1],
                    used: parts[usageIndex - 2],
                    total: parts[usageIndex - 3]
                };
            }
        }
        return null;
    }

    parsePortUsage(lsofOutput) {
        const lines = lsofOutput.split('\n').filter(line => line.trim());
        return lines.map(line => {
            const parts = line.split(/\s+/);
            const portMatch = line.match(/:(\d+)/);
            return {
                process: parts[0],
                pid: parts[1],
                port: portMatch ? parseInt(portMatch[1]) : null
            };
        }).filter(item => item.port);
    }

    async executeCommand(command, timeout = 5000) {
        try {
            const { stdout, stderr } = await execAsync(command, { timeout });
            return { success: true, stdout, stderr };
        } catch (error) {
            return { success: false, error: error.message, stdout: '', stderr: '' };
        }
    }

    async recordSession(outcome, details = {}) {
        const environmentalSnapshot = await this.captureEnvironmentalSnapshot();

        const session = {
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            outcome, // 'success' or 'failure'
            details: {
                startup_method: details.startup_method || 'unknown',
                validation_mode: details.validation_mode || 'unknown',
                duration: details.duration || null,
                error_type: details.error_type || null,
                resolution_method: details.resolution_method || null,
                user_intervention: details.user_intervention || false,
                auto_fix_applied: details.auto_fix_applied || false,
                ...details
            },
            environment: environmentalSnapshot,
            learned_from: true
        };

        this.learningData.sessions.push(session);
        this.learningData.statistics.total_sessions++;

        // Update success rate
        const successCount = this.learningData.sessions.filter(s => s.outcome === 'success').length;
        this.learningData.statistics.success_rate = successCount / this.learningData.statistics.total_sessions;

        // Learn from this session
        await this.learnFromSession(session);

        this.saveData();

        if (this.verbose) {
            console.log(`📚 Recorded ${outcome} session:`, session.id);
        }

        return session.id;
    }

    async learnFromSession(session) {
        // Update startup method success rates
        const method = session.details.startup_method;
        if (method && method !== 'unknown') {
            if (!this.learningData.patterns.startup_methods[method]) {
                this.learningData.patterns.startup_methods[method] = {
                    total_attempts: 0,
                    successes: 0,
                    failures: 0,
                    success_rate: 0,
                    average_duration: 0,
                    common_issues: [],
                    optimal_conditions: []
                };
            }

            const methodStats = this.learningData.patterns.startup_methods[method];
            methodStats.total_attempts++;

            if (session.outcome === 'success') {
                methodStats.successes++;
                if (session.details.duration) {
                    methodStats.average_duration =
                        (methodStats.average_duration * (methodStats.successes - 1) + session.details.duration) / methodStats.successes;
                }
            } else {
                methodStats.failures++;
                if (session.details.error_type) {
                    const existingIssue = methodStats.common_issues.find(issue => issue.type === session.details.error_type);
                    if (existingIssue) {
                        existingIssue.count++;
                    } else {
                        methodStats.common_issues.push({
                            type: session.details.error_type,
                            count: 1,
                            last_seen: session.timestamp
                        });
                    }
                }
            }

            methodStats.success_rate = methodStats.successes / methodStats.total_attempts;
        }

        // Learn time patterns
        const timeKey = `${session.environment.time_context.day_of_week}_${session.environment.time_context.hour}`;
        if (!this.learningData.patterns.time_patterns[timeKey]) {
            this.learningData.patterns.time_patterns[timeKey] = {
                attempts: 0,
                successes: 0,
                success_rate: 0
            };
        }

        const timePattern = this.learningData.patterns.time_patterns[timeKey];
        timePattern.attempts++;
        if (session.outcome === 'success') {
            timePattern.successes++;
        }
        timePattern.success_rate = timePattern.successes / timePattern.attempts;

        // Learn environmental correlations
        this.learnEnvironmentalCorrelations(session);

        // Update most successful method
        const bestMethod = Object.entries(this.learningData.patterns.startup_methods)
            .filter(([_, stats]) => stats.total_attempts >= 3)
            .sort(([_, a], [__, b]) => b.success_rate - a.success_rate)[0];

        if (bestMethod) {
            this.learningData.statistics.most_successful_method = bestMethod[0];
        }

        // Update learning confidence
        this.updateLearningConfidence();
    }

    learnEnvironmentalCorrelations(session) {
        const env = session.environment;
        const outcome = session.outcome;

        // Memory usage correlation
        const memoryBucket = this.bucketizeMemoryUsage(env.system.memory.usage_percent);
        if (!this.learningData.patterns.environmental_correlations.memory) {
            this.learningData.patterns.environmental_correlations.memory = {};
        }
        if (!this.learningData.patterns.environmental_correlations.memory[memoryBucket]) {
            this.learningData.patterns.environmental_correlations.memory[memoryBucket] = {
                attempts: 0,
                successes: 0,
                success_rate: 0
            };
        }

        const memoryCorr = this.learningData.patterns.environmental_correlations.memory[memoryBucket];
        memoryCorr.attempts++;
        if (outcome === 'success') {
            memoryCorr.successes++;
        }
        memoryCorr.success_rate = memoryCorr.successes / memoryCorr.attempts;

        // Time of day correlation
        const timeOfDay = env.time_context.time_of_day;
        if (!this.learningData.patterns.environmental_correlations.time_of_day) {
            this.learningData.patterns.environmental_correlations.time_of_day = {};
        }
        if (!this.learningData.patterns.environmental_correlations.time_of_day[timeOfDay]) {
            this.learningData.patterns.environmental_correlations.time_of_day[timeOfDay] = {
                attempts: 0,
                successes: 0,
                success_rate: 0
            };
        }

        const timeCorr = this.learningData.patterns.environmental_correlations.time_of_day[timeOfDay];
        timeCorr.attempts++;
        if (outcome === 'success') {
            timeCorr.successes++;
        }
        timeCorr.success_rate = timeCorr.successes / timeCorr.attempts;

        // Port usage correlation
        if (env.port_usage && env.port_usage.length > 0) {
            const portKey = 'ports_in_use';
            if (!this.learningData.patterns.environmental_correlations[portKey]) {
                this.learningData.patterns.environmental_correlations[portKey] = {
                    attempts: 0,
                    successes: 0,
                    success_rate: 0
                };
            }

            const portCorr = this.learningData.patterns.environmental_correlations[portKey];
            portCorr.attempts++;
            if (outcome === 'success') {
                portCorr.successes++;
            }
            portCorr.success_rate = portCorr.successes / portCorr.attempts;
        }
    }

    bucketizeMemoryUsage(percentage) {
        if (percentage < 50) return 'low';
        if (percentage < 70) return 'medium';
        if (percentage < 85) return 'high';
        return 'critical';
    }

    updateLearningConfidence() {
        const totalSessions = this.learningData.statistics.total_sessions;
        const methodsWithSufficientData = Object.values(this.learningData.patterns.startup_methods)
            .filter(method => method.total_attempts >= 3).length;

        // Base confidence on amount of data and consistency
        let confidence = Math.min(totalSessions / 50, 1); // Max confidence at 50 sessions
        confidence *= Math.min(methodsWithSufficientData / 3, 1); // Need at least 3 methods with data

        // Reduce confidence if success rate is very inconsistent
        const successRateVariance = this.calculateSuccessRateVariance();
        if (successRateVariance > 0.3) {
            confidence *= 0.7;
        }

        this.learningData.statistics.learning_confidence = Math.round(confidence * 100) / 100;
    }

    calculateSuccessRateVariance() {
        const methods = Object.values(this.learningData.patterns.startup_methods)
            .filter(method => method.total_attempts >= 3);

        if (methods.length < 2) return 0;

        const rates = methods.map(method => method.success_rate);
        const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;

        return Math.sqrt(variance);
    }

    generatePersonalizedRecommendations() {
        const recommendations = [];
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();
        const confidence = this.learningData.statistics.learning_confidence;

        // Only provide confident recommendations if we have enough data
        if (confidence < 0.3) {
            return [{
                type: 'learning',
                priority: 'info',
                message: 'Still learning your patterns. Keep using the system to get personalized recommendations.',
                confidence: confidence
            }];
        }

        // Startup method recommendations
        const bestMethod = this.getBestStartupMethodForCurrentContext();
        if (bestMethod) {
            recommendations.push({
                type: 'startup_method',
                priority: 'high',
                message: `Based on your history, '${bestMethod.method}' works best ${bestMethod.context}`,
                command: this.getCommandForMethod(bestMethod.method),
                confidence: bestMethod.confidence,
                success_rate: bestMethod.success_rate
            });
        }

        // Time-based recommendations
        const timeRecommendation = this.getTimeBasedRecommendation(currentHour, currentDay);
        if (timeRecommendation) {
            recommendations.push(timeRecommendation);
        }

        // Environmental recommendations
        const envRecommendations = this.getEnvironmentalRecommendations();
        recommendations.push(...envRecommendations);

        // Memory-based recommendations
        const memoryRecommendation = this.getMemoryBasedRecommendation();
        if (memoryRecommendation) {
            recommendations.push(memoryRecommendation);
        }

        // Port conflict recommendations
        const portRecommendation = this.getPortRecommendation();
        if (portRecommendation) {
            recommendations.push(portRecommendation);
        }

        // Cache and cleanup recommendations
        const cleanupRecommendation = this.getCleanupRecommendation();
        if (cleanupRecommendation) {
            recommendations.push(cleanupRecommendation);
        }

        return recommendations.sort((a, b) => this.priorityOrder(a.priority) - this.priorityOrder(b.priority));
    }

    getBestStartupMethodForCurrentContext() {
        const methods = this.learningData.patterns.startup_methods;
        const currentHour = new Date().getHours();
        const timeOfDay = this.categorizeTimeOfDay(currentHour);

        // Filter methods with sufficient data
        const viableMethods = Object.entries(methods)
            .filter(([_, stats]) => stats.total_attempts >= 3)
            .map(([method, stats]) => ({
                method,
                success_rate: stats.success_rate,
                confidence: Math.min(stats.total_attempts / 10, 1)
            }))
            .filter(m => m.confidence >= 0.3)
            .sort((a, b) => b.success_rate - a.success_rate);

        if (viableMethods.length === 0) return null;

        const bestMethod = viableMethods[0];
        let context = '';

        // Add temporal context if we have time-based patterns
        const timePattern = this.learningData.patterns.environmental_correlations.time_of_day?.[timeOfDay];
        if (timePattern && timePattern.attempts >= 3) {
            if (timePattern.success_rate > 0.8) {
                context = `during ${timeOfDay} hours`;
            } else if (timePattern.success_rate < 0.5) {
                context = `(note: ${timeOfDay} hours typically have lower success rates)`;
            }
        }

        return {
            ...bestMethod,
            context
        };
    }

    getTimeBasedRecommendation(currentHour, currentDay) {
        const timePatterns = this.learningData.patterns.time_patterns;
        const currentTimeKey = `${currentDay}_${currentHour}`;
        const pattern = timePatterns[currentTimeKey];

        if (pattern && pattern.attempts >= 3) {
            if (pattern.success_rate < 0.5) {
                return {
                    type: 'time_pattern',
                    priority: 'medium',
                    message: `Your success rate is typically lower at this time (${Math.round(pattern.success_rate * 100)}%). Consider extra validation or cleanup.`,
                    confidence: Math.min(pattern.attempts / 10, 1)
                };
            } else if (pattern.success_rate > 0.8) {
                return {
                    type: 'time_pattern',
                    priority: 'low',
                    message: `Good timing! You typically have high success rates at this hour (${Math.round(pattern.success_rate * 100)}%).`,
                    confidence: Math.min(pattern.attempts / 10, 1)
                };
            }
        }

        // Check for patterns in similar time slots
        const similarTimePatterns = Object.entries(timePatterns)
            .filter(([key, _]) => {
                const [day, hour] = key.split('_').map(Number);
                return Math.abs(hour - currentHour) <= 1;
            })
            .filter(([_, pattern]) => pattern.attempts >= 3);

        if (similarTimePatterns.length > 0) {
            const avgSuccessRate = similarTimePatterns.reduce((sum, [_, pattern]) =>
                sum + pattern.success_rate, 0) / similarTimePatterns.length;

            if (avgSuccessRate < 0.5) {
                return {
                    type: 'time_pattern',
                    priority: 'medium',
                    message: `Time period typically has challenges. Consider using 'dev:safe' or 'dev:paranoid' mode.`,
                    confidence: 0.6
                };
            }
        }

        return null;
    }

    getEnvironmentalRecommendations() {
        const recommendations = [];
        const envCorrelations = this.learningData.patterns.environmental_correlations;

        // Memory recommendations
        if (envCorrelations.memory) {
            const criticalMemory = envCorrelations.memory.critical;
            if (criticalMemory && criticalMemory.attempts >= 3 && criticalMemory.success_rate < 0.5) {
                recommendations.push({
                    type: 'memory',
                    priority: 'high',
                    message: `High memory usage (>85%) correlates with ${Math.round((1 - criticalMemory.success_rate) * 100)}% failure rate. Consider closing applications.`,
                    confidence: Math.min(criticalMemory.attempts / 10, 1)
                });
            }
        }

        // Port usage recommendations
        if (envCorrelations.ports_in_use &&
            envCorrelations.ports_in_use.attempts >= 3 &&
            envCorrelations.ports_in_use.success_rate < 0.6) {
            recommendations.push({
                type: 'ports',
                priority: 'medium',
                message: `Port conflicts detected frequently. Success rate drops to ${Math.round(envCorrelations.ports_in_use.success_rate * 100)}% when ports are in use.`,
                suggestion: 'Run: npm run kill-port before starting development',
                confidence: Math.min(envCorrelations.ports_in_use.attempts / 10, 1)
            });
        }

        return recommendations;
    }

    getMemoryBasedRecommendation() {
        const currentMemoryUsage = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
        const threshold = this.userPreferences.environment_preferences.memory_threshold;

        if (currentMemoryUsage > threshold) {
            const memoryPattern = this.learningData.patterns.environmental_correlations.memory?.critical;
            if (memoryPattern && memoryPattern.success_rate < 0.6) {
                return {
                    type: 'memory_current',
                    priority: 'high',
                    message: `Current memory usage (${Math.round(currentMemoryUsage)}%) exceeds your threshold. Historical data shows ${Math.round((1 - memoryPattern.success_rate) * 100)}% higher failure rate.`,
                    suggestion: 'Close applications or use npm run dev:skip-validation for faster startup',
                    confidence: Math.min(memoryPattern.attempts / 10, 1)
                };
            }
        }

        return null;
    }

    getPortRecommendation() {
        const recentSessions = this.learningData.sessions.slice(-10);
        const portConflictSessions = recentSessions.filter(session =>
            session.details.error_type === 'port_conflict' ||
            session.environment.port_usage?.length > 0
        );

        if (portConflictSessions.length >= 3) {
            const hoursSinceLastConflict = (Date.now() - new Date(portConflictSessions[0].timestamp).getTime()) / (1000 * 60 * 60);

            if (hoursSinceLastConflict < 24) {
                return {
                    type: 'port_conflict_pattern',
                    priority: 'medium',
                    message: `Port conflicts detected in ${portConflictSessions.length} of your last 10 sessions. Consider using alternative ports.`,
                    suggestion: 'Try: npm run dev:safe (includes automatic port cleanup)',
                    confidence: 0.8
                };
            }
        }

        return null;
    }

    getCleanupRecommendation() {
        const recentFailures = this.learningData.sessions
            .filter(session => session.outcome === 'failure')
            .slice(-5);

        const cacheIssues = recentFailures.filter(session =>
            session.details.error_type?.includes('cache') ||
            session.details.resolution_method === 'cache_clear'
        );

        if (cacheIssues.length >= 2) {
            const daysSinceLastCacheIssue = (Date.now() - new Date(cacheIssues[0].timestamp).getTime()) / (1000 * 60 * 60 * 24);

            if (daysSinceLastCacheIssue < 7) {
                return {
                    type: 'cache_pattern',
                    priority: 'medium',
                    message: `Cache issues detected in recent failures. Consider proactive cleanup.`,
                    suggestion: 'Run: npm run clean && npm run clear-cache',
                    confidence: 0.7
                };
            }
        }

        return null;
    }

    getCommandForMethod(method) {
        const commandMap = {
            'dev:safe': 'npm run dev:safe',
            'dev:fresh': 'npm run dev:fresh',
            'dev:paranoid': 'npm run dev:paranoid',
            'dev:raw': 'npm run dev:raw',
            'dev:failsafe': 'npm run dev:failsafe',
            'dev:recovery': 'npm run dev:recovery',
            'dev:skip-validation': 'npm run dev:skip-validation'
        };

        return commandMap[method] || `npm run ${method}`;
    }

    priorityOrder(priority) {
        const order = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4 };
        return order[priority] || 5;
    }

    analyzeHistoricalTrends() {
        const sessions = this.learningData.sessions;
        if (sessions.length < 10) {
            return {
                message: 'Not enough historical data for trend analysis',
                data_points: sessions.length,
                recommendation: 'Continue using the system to gather more data'
            };
        }

        const analysis = {
            total_sessions: sessions.length,
            overall_success_rate: this.learningData.statistics.success_rate,
            trends: {},
            insights: []
        };

        // Weekly trend analysis
        const weeklyData = this.groupSessionsByWeek(sessions);
        analysis.trends.weekly = weeklyData;

        // Method effectiveness over time
        const methodTrends = this.analyzeMethodTrendsOverTime(sessions);
        analysis.trends.methods = methodTrends;

        // Environmental factor trends
        const envTrends = this.analyzeEnvironmentalTrends(sessions);
        analysis.trends.environmental = envTrends;

        // Generate insights
        analysis.insights = this.generateInsights(analysis);

        return analysis;
    }

    groupSessionsByWeek(sessions) {
        const weeks = {};
        sessions.forEach(session => {
            const date = new Date(session.timestamp);
            const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weeks[weekKey]) {
                weeks[weekKey] = { total: 0, successes: 0, failures: 0, success_rate: 0 };
            }

            weeks[weekKey].total++;
            if (session.outcome === 'success') {
                weeks[weekKey].successes++;
            } else {
                weeks[weekKey].failures++;
            }
            weeks[weekKey].success_rate = weeks[weekKey].successes / weeks[weekKey].total;
        });

        return weeks;
    }

    analyzeMethodTrendsOverTime(sessions) {
        const methodData = {};
        const timeWindows = ['last_week', 'last_month', 'all_time'];

        timeWindows.forEach(window => {
            const filteredSessions = this.filterSessionsByTimeWindow(sessions, window);
            methodData[window] = this.calculateMethodStats(filteredSessions);
        });

        return methodData;
    }

    filterSessionsByTimeWindow(sessions, window) {
        const now = new Date();
        const cutoffDate = new Date();

        switch (window) {
            case 'last_week':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case 'last_month':
                cutoffDate.setDate(now.getDate() - 30);
                break;
            default:
                return sessions;
        }

        return sessions.filter(session => new Date(session.timestamp) >= cutoffDate);
    }

    calculateMethodStats(sessions) {
        const stats = {};
        sessions.forEach(session => {
            const method = session.details.startup_method;
            if (method && method !== 'unknown') {
                if (!stats[method]) {
                    stats[method] = { total: 0, successes: 0, success_rate: 0 };
                }
                stats[method].total++;
                if (session.outcome === 'success') {
                    stats[method].successes++;
                }
                stats[method].success_rate = stats[method].successes / stats[method].total;
            }
        });

        return stats;
    }

    analyzeEnvironmentalTrends(sessions) {
        const trends = {
            memory_usage_over_time: [],
            success_by_time_of_day: {},
            success_by_day_of_week: {}
        };

        sessions.forEach(session => {
            if (session.environment) {
                // Memory usage trend
                trends.memory_usage_over_time.push({
                    timestamp: session.timestamp,
                    memory_usage: session.environment.system?.memory?.usage_percent,
                    success: session.outcome === 'success'
                });

                // Time of day success patterns
                const timeOfDay = session.environment.time_context?.time_of_day;
                if (timeOfDay) {
                    if (!trends.success_by_time_of_day[timeOfDay]) {
                        trends.success_by_time_of_day[timeOfDay] = { total: 0, successes: 0 };
                    }
                    trends.success_by_time_of_day[timeOfDay].total++;
                    if (session.outcome === 'success') {
                        trends.success_by_time_of_day[timeOfDay].successes++;
                    }
                }

                // Day of week patterns
                const dayOfWeek = session.environment.time_context?.day_of_week;
                if (dayOfWeek !== undefined) {
                    if (!trends.success_by_day_of_week[dayOfWeek]) {
                        trends.success_by_day_of_week[dayOfWeek] = { total: 0, successes: 0 };
                    }
                    trends.success_by_day_of_week[dayOfWeek].total++;
                    if (session.outcome === 'success') {
                        trends.success_by_day_of_week[dayOfWeek].successes++;
                    }
                }
            }
        });

        // Calculate success rates
        Object.keys(trends.success_by_time_of_day).forEach(timeOfDay => {
            const data = trends.success_by_time_of_day[timeOfDay];
            data.success_rate = data.successes / data.total;
        });

        Object.keys(trends.success_by_day_of_week).forEach(day => {
            const data = trends.success_by_day_of_week[day];
            data.success_rate = data.successes / data.total;
        });

        return trends;
    }

    generateInsights(analysis) {
        const insights = [];

        // Overall performance insight
        const successRate = analysis.overall_success_rate;
        if (successRate > 0.8) {
            insights.push({
                type: 'performance',
                level: 'positive',
                message: `Excellent success rate of ${Math.round(successRate * 100)}%! Your development environment is well-optimized.`
            });
        } else if (successRate < 0.6) {
            insights.push({
                type: 'performance',
                level: 'concern',
                message: `Success rate of ${Math.round(successRate * 100)}% indicates room for improvement. Consider using more reliable startup methods.`
            });
        }

        // Method effectiveness insights
        const currentMethods = analysis.trends.methods.last_month;
        if (currentMethods) {
            const bestMethod = Object.entries(currentMethods)
                .filter(([_, stats]) => stats.total >= 3)
                .sort(([_, a], [__, b]) => b.success_rate - a.success_rate)[0];

            if (bestMethod && bestMethod[1].success_rate > 0.8) {
                insights.push({
                    type: 'method',
                    level: 'positive',
                    message: `'${bestMethod[0]}' has been your most reliable method this month (${Math.round(bestMethod[1].success_rate * 100)}% success rate).`
                });
            }
        }

        // Time-based insights
        const timeData = analysis.trends.environmental.success_by_time_of_day;
        const bestTimeOfDay = Object.entries(timeData)
            .filter(([_, data]) => data.total >= 3)
            .sort(([_, a], [__, b]) => b.success_rate - a.success_rate)[0];

        if (bestTimeOfDay && bestTimeOfDay[1].success_rate > 0.8) {
            insights.push({
                type: 'timing',
                level: 'tip',
                message: `You're most productive during ${bestTimeOfDay[0]} hours (${Math.round(bestTimeOfDay[1].success_rate * 100)}% success rate).`
            });
        }

        // Environmental insights
        const memoryTrend = analysis.trends.environmental.memory_usage_over_time.slice(-10);
        if (memoryTrend.length > 0) {
            const avgMemoryUsage = memoryTrend.reduce((sum, point) =>
                sum + (point.memory_usage || 0), 0) / memoryTrend.length;

            if (avgMemoryUsage > 85) {
                insights.push({
                    type: 'environment',
                    level: 'concern',
                    message: `Recent average memory usage is ${Math.round(avgMemoryUsage)}%. Consider closing applications for better performance.`
                });
            }
        }

        return insights;
    }

    optimizeUserPreferences() {
        const analysis = this.analyzeHistoricalTrends();
        const optimizations = [];

        // Optimize validation mode preference
        const currentMethods = analysis.trends?.methods?.last_month || {};
        const fastMethods = ['dev:raw', 'dev:skip-validation'];
        const safeMethods = ['dev:safe', 'dev:paranoid'];

        const fastMethodsSuccess = fastMethods.reduce((sum, method) =>
            sum + (currentMethods[method]?.success_rate || 0), 0) / fastMethods.length;
        const safeMethodsSuccess = safeMethods.reduce((sum, method) =>
            sum + (currentMethods[method]?.success_rate || 0), 0) / safeMethods.length;

        if (fastMethodsSuccess > safeMethodsSuccess + 0.1) {
            this.userPreferences.environment_preferences.validation_mode_preference = 'quick';
            optimizations.push({
                setting: 'validation_mode_preference',
                old_value: this.userPreferences.environment_preferences.validation_mode_preference,
                new_value: 'quick',
                reason: 'Fast methods show higher success rate in your environment'
            });
        } else if (safeMethodsSuccess > fastMethodsSuccess + 0.1) {
            this.userPreferences.environment_preferences.validation_mode_preference = 'full';
            optimizations.push({
                setting: 'validation_mode_preference',
                old_value: this.userPreferences.environment_preferences.validation_mode_preference,
                new_value: 'full',
                reason: 'Safe methods show higher success rate in your environment'
            });
        }

        // Optimize memory threshold
        const memoryData = this.learningData.patterns.environmental_correlations.memory;
        if (memoryData) {
            const criticalFailureRate = 1 - (memoryData.critical?.success_rate || 0.5);
            const highFailureRate = 1 - (memoryData.high?.success_rate || 0.5);

            if (criticalFailureRate > 0.5 && this.userPreferences.environment_preferences.memory_threshold > 75) {
                this.userPreferences.environment_preferences.memory_threshold = 75;
                optimizations.push({
                    setting: 'memory_threshold',
                    old_value: this.userPreferences.environment_preferences.memory_threshold,
                    new_value: 75,
                    reason: 'High failure rate detected at critical memory levels'
                });
            } else if (highFailureRate > 0.3 && this.userPreferences.environment_preferences.memory_threshold > 70) {
                this.userPreferences.environment_preferences.memory_threshold = 70;
                optimizations.push({
                    setting: 'memory_threshold',
                    old_value: this.userPreferences.environment_preferences.memory_threshold,
                    new_value: 70,
                    reason: 'Moderate failure rate detected at high memory usage'
                });
            }
        }

        // Save optimized preferences
        if (optimizations.length > 0) {
            this.saveData();
        }

        return optimizations;
    }

    displayRecommendations() {
        console.log('\n' + '='.repeat(80));
        console.log('🧠 PERSONALIZED DEVELOPMENT RECOMMENDATIONS');
        console.log('='.repeat(80));

        const recommendations = this.generatePersonalizedRecommendations();
        const confidence = this.learningData.statistics.learning_confidence;

        console.log(`📊 Learning Confidence: ${Math.round(confidence * 100)}% (${this.learningData.statistics.total_sessions} sessions analyzed)`);
        console.log(`📈 Overall Success Rate: ${Math.round(this.learningData.statistics.success_rate * 100)}%`);

        if (this.learningData.statistics.most_successful_method) {
            const methodStats = this.learningData.patterns.startup_methods[this.learningData.statistics.most_successful_method];
            console.log(`🏆 Most Successful Method: ${this.learningData.statistics.most_successful_method} (${Math.round(methodStats.success_rate * 100)}% success rate)`);
        }

        console.log('\n💡 Current Recommendations:');

        if (recommendations.length === 0) {
            console.log('   No specific recommendations at this time.');
        } else {
            recommendations.forEach((rec, index) => {
                const icons = {
                    critical: '🚨',
                    high: '🔴',
                    medium: '🟡',
                    low: '🟢',
                    info: 'ℹ️'
                };
                const icon = icons[rec.priority] || '💡';

                console.log(`\n   ${index + 1}. ${icon} ${rec.message}`);
                if (rec.command) {
                    console.log(`      Command: ${rec.command}`);
                }
                if (rec.suggestion) {
                    console.log(`      Suggestion: ${rec.suggestion}`);
                }
                if (rec.confidence) {
                    console.log(`      Confidence: ${Math.round(rec.confidence * 100)}%`);
                }
                if (rec.success_rate) {
                    console.log(`      Success Rate: ${Math.round(rec.success_rate * 100)}%`);
                }
            });
        }

        console.log('\n' + '='.repeat(80));
    }

    displayAnalysis() {
        const analysis = this.analyzeHistoricalTrends();

        console.log('\n' + '='.repeat(80));
        console.log('📊 HISTORICAL TREND ANALYSIS');
        console.log('='.repeat(80));

        console.log(`📈 Overall Statistics:`);
        console.log(`   • Total Sessions: ${analysis.total_sessions}`);
        console.log(`   • Success Rate: ${Math.round(analysis.overall_success_rate * 100)}%`);

        if (analysis.trends.methods.last_month) {
            console.log(`\n🚀 Method Performance (Last Month):`);
            Object.entries(analysis.trends.methods.last_month)
                .filter(([_, stats]) => stats.total >= 2)
                .sort(([_, a], [__, b]) => b.success_rate - a.success_rate)
                .forEach(([method, stats]) => {
                    console.log(`   • ${method}: ${Math.round(stats.success_rate * 100)}% (${stats.successes}/${stats.total})`);
                });
        }

        if (analysis.trends.environmental.success_by_time_of_day) {
            console.log(`\n🕐 Success by Time of Day:`);
            Object.entries(analysis.trends.environmental.success_by_time_of_day)
                .filter(([_, data]) => data.total >= 2)
                .sort(([_, a], [__, b]) => b.success_rate - a.success_rate)
                .forEach(([timeOfDay, data]) => {
                    console.log(`   • ${timeOfDay}: ${Math.round(data.success_rate * 100)}% (${data.successes}/${data.total})`);
                });
        }

        if (analysis.insights.length > 0) {
            console.log(`\n💡 Key Insights:`);
            analysis.insights.forEach((insight, index) => {
                const icons = {
                    positive: '✅',
                    concern: '⚠️',
                    tip: '💡'
                };
                const icon = icons[insight.level] || '•';
                console.log(`   ${icon} ${insight.message}`);
            });
        }

        console.log('\n' + '='.repeat(80));
    }

    displayOptimizations() {
        const optimizations = this.optimizeUserPreferences();

        console.log('\n' + '='.repeat(80));
        console.log('⚙️  USER PREFERENCE OPTIMIZATIONS');
        console.log('='.repeat(80));

        if (optimizations.length === 0) {
            console.log('✅ Your preferences are already optimized based on your usage patterns.');
        } else {
            console.log('🔧 Applied the following optimizations:');
            optimizations.forEach((opt, index) => {
                console.log(`\n   ${index + 1}. ${opt.setting}`);
                console.log(`      • Changed from: ${opt.old_value}`);
                console.log(`      • Changed to: ${opt.new_value}`);
                console.log(`      • Reason: ${opt.reason}`);
            });
            console.log('\n💾 Optimizations saved to user preferences.');
        }

        console.log('\n' + '='.repeat(80));
    }

    showHelp() {
        console.log(`
🧠 Cross-Session Learning System for 6FB Booking Frontend

Usage: node scripts/cross-session-learning.js [command] [options]

Commands:
  --learn success [--data="details"]     Record a successful session
  --learn failure [--data="details"]     Record a failed session
  --recommend                            Show personalized recommendations
  --analyze                              Display historical trend analysis
  --optimize                             Optimize user preferences based on patterns
  --help                                 Show this help message

Learning Commands:
  node scripts/cross-session-learning.js --learn success --data='{"startup_method":"dev:safe","duration":5.2}'
  node scripts/cross-session-learning.js --learn failure --data='{"startup_method":"dev:raw","error_type":"port_conflict"}'

Analysis Commands:
  node scripts/cross-session-learning.js --recommend    # Get current recommendations
  node scripts/cross-session-learning.js --analyze      # View historical trends
  node scripts/cross-session-learning.js --optimize     # Optimize preferences

Options:
  --verbose, -v                          Show detailed output
  --data="json"                          Additional session details for learning

Integration with Development Scripts:
  This learning system can be integrated with your existing development scripts
  to automatically track success and failure patterns.

Features:
  • Tracks startup method effectiveness over time
  • Learns optimal timing patterns for development
  • Correlates environmental factors with success rates
  • Provides personalized recommendations based on your patterns
  • Optimizes preferences automatically
  • Remembers what works best for your specific environment

Data Storage:
  • learning-data/learning-data.json      # Session history and patterns
  • learning-data/user-preferences.json  # Personal preferences and settings
  • learning-data/success-patterns.json  # Learned success patterns
  • learning-data/environmental-factors.json # Environmental correlations

Examples of Recommendations:
  • "Based on your history, npm run dev:safe works best on Monday mornings"
  • "You typically have port conflicts after 2 PM - suggest using different ports"
  • "Your system performs better with validation skipped when memory usage > 85%"
  • "Consider clearing cache - last 3 failures resolved with cache cleanup"
        `);
    }

    async run() {
        try {
            if (this.args.includes('--help') || this.args.includes('-h')) {
                this.showHelp();
                return;
            }

            if (this.args.includes('--learn')) {
                const learnIndex = this.args.indexOf('--learn');
                const outcome = this.args[learnIndex + 1];

                if (!outcome || !['success', 'failure'].includes(outcome)) {
                    console.error('❌ --learn requires "success" or "failure" as the next argument');
                    process.exit(1);
                }

                let details = {};
                const dataArg = this.args.find(arg => arg.startsWith('--data='));
                if (dataArg) {
                    try {
                        details = JSON.parse(dataArg.split('=')[1]);
                    } catch (error) {
                        console.warn('⚠️ Could not parse --data argument, using empty details');
                    }
                }

                const sessionId = await this.recordSession(outcome, details);
                console.log(`✅ Recorded ${outcome} session: ${sessionId}`);

                if (this.verbose) {
                    console.log(`📊 Updated learning confidence: ${Math.round(this.learningData.statistics.learning_confidence * 100)}%`);
                    console.log(`📈 Overall success rate: ${Math.round(this.learningData.statistics.success_rate * 100)}%`);
                }

            } else if (this.args.includes('--recommend')) {
                this.displayRecommendations();

            } else if (this.args.includes('--analyze')) {
                this.displayAnalysis();

            } else if (this.args.includes('--optimize')) {
                this.displayOptimizations();

            } else {
                console.log('🧠 Cross-Session Learning System');
                console.log('Use --help for usage information');
                console.log('\nQuick start:');
                console.log('  --recommend    Show current recommendations');
                console.log('  --analyze      View your development patterns');
                console.log('  --optimize     Optimize your preferences');
            }

        } catch (error) {
            console.error('❌ Error:', error.message);
            if (this.verbose) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }
}

// Main execution
if (require.main === module) {
    const learningSystem = new CrossSessionLearningSystem();
    learningSystem.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = CrossSessionLearningSystem;

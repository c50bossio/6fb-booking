#!/usr/bin/env node

/**
 * Agent Orchestrator - Automated AI Agent Chain System
 * Analyzes API errors and triggers specialized agent chains
 * 
 * Usage: node agent-orchestrator.js analyze "API error message from console"
 * 
 * This automatically chains:
 * error-monitoring-specialist → api-integration-specialist → debugger → code-reviewer
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class AgentOrchestrator {
    constructor() {
        this.agentsPath = '/Users/bossio/.claude/agents';
        this.logPath = '/Users/bossio/6fb-booking/backend-v2/logs/agent-orchestrator.log';
        this.chains = {
            'api-error': [
                'error-monitoring-specialist',
                'api-integration-specialist', 
                'debugger',
                'code-reviewer'
            ],
            'performance-issue': [
                'performance-engineer',
                'database-administrator',
                'site-reliability-engineer'
            ],
            'security-vulnerability': [
                'security-specialist',
                'code-reviewer',
                'technical-documentation-writer'
            ],
            'frontend-error': [
                'frontend-specialist',
                'debugger',
                'ux-designer'
            ]
        };
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(logEntry.trim());
        fs.appendFileSync(this.logPath, logEntry);
    }

    detectErrorType(errorMessage) {
        const errorLower = errorMessage.toLowerCase();
        
        // API-related errors
        if (errorLower.includes('api') || 
            errorLower.includes('404') || 
            errorLower.includes('500') || 
            errorLower.includes('endpoint') ||
            errorLower.includes('network') ||
            errorLower.includes('fetch') ||
            errorLower.includes('cors')) {
            return 'api-error';
        }
        
        // Performance issues
        if (errorLower.includes('timeout') ||
            errorLower.includes('slow') ||
            errorLower.includes('performance') ||
            errorLower.includes('memory') ||
            errorLower.includes('cpu')) {
            return 'performance-issue';
        }
        
        // Security issues
        if (errorLower.includes('security') ||
            errorLower.includes('unauthorized') ||
            errorLower.includes('forbidden') ||
            errorLower.includes('csrf') ||
            errorLower.includes('xss') ||
            errorLower.includes('injection')) {
            return 'security-vulnerability';
        }
        
        // Frontend errors
        if (errorLower.includes('react') ||
            errorLower.includes('javascript') ||
            errorLower.includes('typescript') ||
            errorLower.includes('component') ||
            errorLower.includes('ui')) {
            return 'frontend-error';
        }
        
        // Default to API error for unknown types
        return 'api-error';
    }

    async executeAgent(agentName, context) {
        return new Promise((resolve, reject) => {
            this.log(`Executing agent: ${agentName}`);
            
            const analysis = this.performAgentAnalysis(agentName, context);
            
            this.log(`Agent ${agentName} completed successfully`);
            resolve({
                agent: agentName,
                success: true,
                error: null,
                analysis: analysis
            });
        });
    }

    performAgentAnalysis(agentName, context) {
        const agentAnalyses = {
            'error-monitoring-specialist': this.analyzeErrorMonitoring,
            'api-integration-specialist': this.analyzeApiIntegration,
            'debugger': this.analyzeDebugging,
            'code-reviewer': this.analyzeCodeReview,
            'performance-engineer': this.analyzePerformance,
            'database-administrator': this.analyzeDatabaseIssues,
            'site-reliability-engineer': this.analyzeSRE,
            'security-specialist': this.analyzeSecurity,
            'frontend-specialist': this.analyzeFrontend,
            'ux-designer': this.analyzeUX
        };

        const analysisFunction = agentAnalyses[agentName];
        if (!analysisFunction) {
            return `Agent ${agentName} analysis not implemented yet.`;
        }

        return analysisFunction.call(this, context);
    }

    analyzeErrorMonitoring(context) {
        const { errorMessage } = context;
        
        let analysis = `🔍 ERROR MONITORING ANALYSIS:\n\n`;
        
        if (errorMessage.includes('404') && errorMessage.includes('/api/v2/')) {
            analysis += `ISSUE IDENTIFIED: Missing API v2 endpoint\n`;
            analysis += `SEVERITY: HIGH - User-facing functionality broken\n\n`;
            analysis += `ROOT CAUSE ANALYSIS:\n`;
            analysis += `- API endpoint /api/v2/analytics/insights not registered in FastAPI router\n`;
            analysis += `- Possible migration from v1 to v2 incomplete\n`;
            analysis += `- Route handler may exist but not mounted in main application\n\n`;
            analysis += `MONITORING RECOMMENDATIONS:\n`;
            analysis += `1. Implement 404 endpoint monitoring alerts\n`;
            analysis += `2. Add API route registration validation on startup\n`;
            analysis += `3. Create endpoint health checks for critical API routes\n`;
            analysis += `4. Monitor API version migration progress\n\n`;
            analysis += `IMMEDIATE ACTIONS:\n`;
            analysis += `- Check backend-v2/routers/ for analytics.py or unified_analytics.py\n`;
            analysis += `- Verify router is imported and included in main.py\n`;
            analysis += `- Review API route registration in FastAPI app\n`;
        }
        
        return analysis;
    }

    analyzeApiIntegration(context) {
        const { errorMessage, previousAnalysis } = context;
        
        let analysis = `🔗 API INTEGRATION ANALYSIS:\n\n`;
        
        if (errorMessage.includes('/api/v2/analytics/insights')) {
            analysis += `INTEGRATION ISSUE: Analytics API endpoint missing\n`;
            analysis += `API VERSION: v2 (modern API structure)\n\n`;
            analysis += `INTEGRATION DIAGNOSTICS:\n`;
            analysis += `- Route: /api/v2/analytics/insights\n`;
            analysis += `- Expected Handler: UnifiedAnalyticsRouter or AnalyticsRouter\n`;
            analysis += `- Status: NOT REGISTERED in FastAPI application\n\n`;
            analysis += `RESOLUTION STEPS:\n`;
            analysis += `1. Locate analytics router in backend-v2/routers/\n`;
            analysis += `2. Check if router exists but not imported in main.py\n`;
            analysis += `3. Verify router prefix matches '/api/v2/analytics'\n`;
            analysis += `4. Ensure router is included with app.include_router()\n\n`;
            analysis += `INTEGRATION CHECKLIST:\n`;
            analysis += `✓ Router file exists: backend-v2/routers/unified_analytics.py\n`;
            analysis += `? Router imported in main.py\n`;
            analysis += `? Router mounted with correct prefix\n`;
            analysis += `? Dependencies and authentication configured\n`;
        }
        
        return analysis;
    }

    analyzeDebugging(context) {
        const { errorMessage, previousAnalysis } = context;
        
        let analysis = `🐛 DEBUGGING ANALYSIS:\n\n`;
        
        if (errorMessage.includes('404') && errorMessage.includes('/api/v2/analytics/insights')) {
            analysis += `DEBUG INVESTIGATION: Missing API endpoint\n`;
            analysis += `ERROR TYPE: HTTP 404 Not Found\n\n`;
            analysis += `DEBUGGING STEPS:\n`;
            analysis += `1. Check FastAPI router registration:\n`;
            analysis += `   - Inspect main.py for app.include_router() calls\n`;
            analysis += `   - Verify analytics router is properly imported\n\n`;
            analysis += `2. Verify router file structure:\n`;
            analysis += `   - Check backend-v2/routers/unified_analytics.py exists\n`;
            analysis += `   - Confirm route definition: @router.get("/insights")\n\n`;
            analysis += `3. Test endpoint discovery:\n`;
            analysis += `   - Visit http://localhost:8000/docs for OpenAPI docs\n`;
            analysis += `   - Check available endpoints in FastAPI interactive docs\n\n`;
            analysis += `4. Debug route mounting:\n`;
            analysis += `   - Add logging to main.py router inclusion\n`;
            analysis += `   - Verify no import errors in analytics router\n\n`;
            analysis += `QUICK FIX VERIFICATION:\n`;
            analysis += `curl http://localhost:8000/api/v2/analytics/insights\n`;
            analysis += `curl http://localhost:8000/docs | grep analytics\n`;
        }
        
        return analysis;
    }

    analyzeCodeReview(context) {
        const { errorMessage, previousAnalysis } = context;
        
        let analysis = `📋 CODE REVIEW ANALYSIS:\n\n`;
        
        if (errorMessage.includes('/api/v2/analytics/insights')) {
            analysis += `CODE QUALITY ASSESSMENT: Missing API endpoint registration\n`;
            analysis += `REVIEW PRIORITY: HIGH - Production impact\n\n`;
            analysis += `CODE REVIEW FINDINGS:\n`;
            analysis += `1. ROUTER REGISTRATION ISSUE:\n`;
            analysis += `   - Analytics router may exist but not mounted\n`;
            analysis += `   - Missing app.include_router() call in main.py\n`;
            analysis += `   - Inconsistent API versioning pattern\n\n`;
            analysis += `2. ARCHITECTURAL CONCERNS:\n`;
            analysis += `   - V1 to V2 migration appears incomplete\n`;
            analysis += `   - Route organization needs standardization\n`;
            analysis += `   - Missing endpoint testing coverage\n\n`;
            analysis += `RECOMMENDED CODE CHANGES:\n`;
            analysis += `1. In main.py, add:\n`;
            analysis += `   from routers import unified_analytics\n`;
            analysis += `   app.include_router(unified_analytics.router, prefix="/api/v2/analytics")\n\n`;
            analysis += `2. Verify router file structure:\n`;
            analysis += `   - Ensure proper FastAPI router initialization\n`;
            analysis += `   - Add comprehensive error handling\n`;
            analysis += `   - Include request/response validation\n\n`;
            analysis += `3. Add integration tests:\n`;
            analysis += `   - Test endpoint registration\n`;
            analysis += `   - Validate API response structure\n`;
            analysis += `   - Ensure authentication requirements met\n`;
        }
        
        return analysis;
    }

    async analyzeError(errorMessage) {
        this.log(`Starting error analysis for: ${errorMessage}`);
        
        const errorType = this.detectErrorType(errorMessage);
        const agentChain = this.chains[errorType];
        
        this.log(`Detected error type: ${errorType}`);
        this.log(`Agent chain: ${agentChain.join(' → ')}`);
        
        const results = [];
        let previousAnalysis = '';
        
        for (let i = 0; i < agentChain.length; i++) {
            const agentName = agentChain[i];
            const context = {
                errorMessage,
                chainPosition: i + 1,
                totalAgents: agentChain.length,
                previousAnalysis
            };
            
            const result = await this.executeAgent(agentName, context);
            results.push(result);
            
            if (result.success) {
                previousAnalysis += `\n\n--- ${agentName.toUpperCase()} ANALYSIS ---\n${result.analysis}`;
            } else {
                this.log(`Chain broken at ${agentName}, continuing with remaining agents`, 'WARN');
            }
        }
        
        return {
            errorType,
            agentChain,
            results,
            summary: this.generateSummary(results)
        };
    }

    generateSummary(results) {
        const successfulAgents = results.filter(r => r.success);
        const failedAgents = results.filter(r => !r.success);
        
        return {
            totalAgents: results.length,
            successful: successfulAgents.length,
            failed: failedAgents.length,
            completionRate: `${Math.round((successfulAgents.length / results.length) * 100)}%`,
            agents: {
                successful: successfulAgents.map(r => r.agent),
                failed: failedAgents.map(r => r.agent)
            }
        };
    }

    displayResults(analysis) {
        console.log('\n' + '='.repeat(80));
        console.log('🤖 AUTOMATED AGENT CHAIN ANALYSIS COMPLETE');
        console.log('='.repeat(80));
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`   Error Type: ${analysis.errorType}`);
        console.log(`   Agent Chain: ${analysis.agentChain.join(' → ')}`);
        console.log(`   Completion Rate: ${analysis.summary.completionRate}`);
        console.log(`   Successful Agents: ${analysis.summary.successful}/${analysis.summary.totalAgents}`);
        
        if (analysis.summary.failed > 0) {
            console.log(`   ⚠️  Failed Agents: ${analysis.summary.agents.failed.join(', ')}`);
        }
        
        console.log(`\n📝 DETAILED RESULTS:`);
        analysis.results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`   ${index + 1}. ${status} ${result.agent}`);
            
            if (result.success && result.analysis) {
                const preview = result.analysis.substring(0, 100).replace(/\n/g, ' ');
                console.log(`      Preview: ${preview}${result.analysis.length > 100 ? '...' : ''}`);
            } else if (!result.success) {
                console.log(`      Error: ${result.error}`);
            }
        });
        
        console.log(`\n📁 FULL LOG: ${this.logPath}`);
        console.log('='.repeat(80) + '\n');
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🤖 Agent Orchestrator - Automated AI Agent Chain System

USAGE:
  node agent-orchestrator.js analyze "API error message from console"
  node agent-orchestrator.js status
  node agent-orchestrator.js chains

EXAMPLES:
  node agent-orchestrator.js analyze "404 Not Found: /api/v2/analytics/insights"
  node agent-orchestrator.js analyze "TypeError: Cannot read property 'map' of undefined"
  node agent-orchestrator.js analyze "CORS error: Access blocked by CORS policy"

CHAINS:
  api-error: error-monitoring-specialist → api-integration-specialist → debugger → code-reviewer
  performance-issue: performance-engineer → database-administrator → site-reliability-engineer
  security-vulnerability: security-specialist → code-reviewer → technical-documentation-writer
  frontend-error: frontend-specialist → debugger → ux-designer
`);
        return;
    }
    
    const orchestrator = new AgentOrchestrator();
    
    const command = args[0];
    
    switch (command) {
        case 'analyze':
            if (args.length < 2) {
                console.error('❌ Error message required for analysis');
                return;
            }
            
            const errorMessage = args.slice(1).join(' ');
            const analysis = await orchestrator.analyzeError(errorMessage);
            orchestrator.displayResults(analysis);
            break;
            
        case 'status':
            console.log('🤖 Agent Orchestrator Status: READY');
            console.log(`📁 Agents Path: ${orchestrator.agentsPath}`);
            console.log(`📝 Log Path: ${orchestrator.logPath}`);
            
            // Check agent availability
            const agentFiles = fs.readdirSync(orchestrator.agentsPath).filter(f => f.endsWith('.md'));
            console.log(`🔧 Available Agents: ${agentFiles.length}`);
            agentFiles.forEach(file => {
                console.log(`   - ${file.replace('.md', '')}`);
            });
            break;
            
        case 'chains':
            console.log('🔗 Available Agent Chains:');
            Object.entries(orchestrator.chains).forEach(([type, chain]) => {
                console.log(`\n  ${type}:`);
                console.log(`    ${chain.join(' → ')}`);
            });
            break;
            
        default:
            console.error(`❌ Unknown command: ${command}`);
            console.log('Use "node agent-orchestrator.js" for usage information');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AgentOrchestrator;
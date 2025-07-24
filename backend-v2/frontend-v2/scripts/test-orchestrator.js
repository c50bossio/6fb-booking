#!/usr/bin/env node

/**
 * Test Orchestrator - Phase 4 Testing & Validation
 * Coordinates all testing suites and generates unified reports
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TestOrchestrator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      suites: {},
      summary: {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        totalTests: 0,
        totalDuration: 0
      },
      errors: []
    };
    
    this.outputDir = path.join(__dirname, '../test-results/orchestrator');
    
    // Test suites to run
    this.testSuites = [
      {
        name: 'performance',
        command: 'npm run performance:test',
        description: 'Performance & Bundle Analysis',
        timeout: 300000, // 5 minutes
        critical: true
      },
      {
        name: 'accessibility',
        command: 'npm run accessibility:test',
        description: 'WCAG 2.2 AA Accessibility Testing',
        timeout: 180000, // 3 minutes
        critical: true
      },
      {
        name: 'cross-browser',
        command: 'npm run cross-browser:test',
        description: 'Cross-Browser Compatibility',
        timeout: 600000, // 10 minutes
        critical: false
      },
      {
        name: 'integration',
        command: 'npm run integration:test',
        description: 'API Integration & Real Data',
        timeout: 240000, // 4 minutes
        critical: true
      },
      {
        name: 'lighthouse',
        command: 'npm run lighthouse:calendar',
        description: 'Lighthouse Performance Audit',
        timeout: 120000, // 2 minutes
        critical: false
      }
    ];
  }

  async init() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.log('Test orchestrator initialized');
    } catch (error) {
      console.error('Failed to initialize test orchestrator:', error);
      throw error;
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, description, timeout = 60000) {
    this.log(`Running: ${description}`);
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const childProcess = exec(command, { 
        cwd: path.join(__dirname, '..'),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout
      }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          this.log(`Failed: ${description} - ${error.message}`, 'error');
          resolve({
            success: false,
            duration,
            error: error.message,
            stdout,
            stderr,
            exitCode: error.code
          });
        } else {
          this.log(`Completed: ${description} (${Math.round(duration / 1000)}s)`, 'success');
          resolve({
            success: true,
            duration,
            stdout,
            stderr,
            exitCode: 0
          });
        }
      });

      // Handle timeout
      childProcess.on('error', (error) => {
        resolve({
          success: false,
          duration: Date.now() - startTime,
          error: `Process error: ${error.message}`,
          stdout: '',
          stderr: '',
          exitCode: -1
        });
      });
    });
  }

  async checkPrerequisites() {
    this.log('🔍 Checking prerequisites...');
    
    // Check if Node.js dependencies are installed
    try {
      await this.runCommand('npm list --depth=0', 'Dependency check', 30000);
    } catch (error) {
      this.log('Installing missing dependencies...', 'warning');
      await this.runCommand('npm install', 'Install dependencies', 120000);
    }

    // Check if backend is accessible
    try {
      const response = await fetch('http://localhost:8000/health').catch(() => null);
      if (!response || !response.ok) {
        this.log('Backend not accessible - some tests may fail', 'warning');
      } else {
        this.log('Backend accessible', 'success');
      }
    } catch (error) {
      this.log('Backend health check failed', 'warning');
    }

    // Check if frontend is accessible
    try {
      const response = await fetch('http://localhost:3000').catch(() => null);
      if (!response || !response.ok) {
        this.log('Frontend not accessible - tests may fail', 'warning');
      } else {
        this.log('Frontend accessible', 'success');
      }
    } catch (error) {
      this.log('Frontend health check failed', 'warning');
    }
  }

  async runTestSuite(suite) {
    this.log(`\n🧪 Starting ${suite.description}...`);
    
    const startTime = Date.now();
    const result = await this.runCommand(suite.command, suite.description, suite.timeout);
    
    const suiteResult = {
      name: suite.name,
      description: suite.description,
      command: suite.command,
      critical: suite.critical,
      success: result.success,
      duration: result.duration,
      exitCode: result.exitCode,
      error: result.error,
      timestamp: new Date(startTime).toISOString()
    };

    this.results.suites[suite.name] = suiteResult;
    this.results.summary.totalSuites++;
    this.results.summary.totalDuration += result.duration;

    if (result.success) {
      this.results.summary.passedSuites++;
    } else {
      this.results.summary.failedSuites++;
      if (suite.critical) {
        this.results.errors.push({
          suite: suite.name,
          error: result.error,
          critical: true
        });
      }
    }

    return suiteResult;
  }

  async aggregateTestResults() {
    this.log('📊 Aggregating detailed test results...');
    
    // Try to read individual test reports
    const reportDirs = [
      'test-results/performance',
      'test-results/accessibility', 
      'test-results/cross-browser',
      'test-results/integration'
    ];

    for (const dir of reportDirs) {
      try {
        const fullPath = path.join(__dirname, '..', dir);
        const files = await fs.readdir(fullPath).catch(() => []);
        
        // Find the most recent report file
        const reportFiles = files.filter(f => f.endsWith('.json') && f.includes('report'));
        if (reportFiles.length > 0) {
          const latestReport = reportFiles.sort().pop();
          const reportPath = path.join(fullPath, latestReport);
          const reportData = JSON.parse(await fs.readFile(reportPath, 'utf8'));
          
          // Add detailed results to orchestrator results
          const suiteName = dir.split('/').pop();
          if (this.results.suites[suiteName]) {
            this.results.suites[suiteName].detailedResults = reportData;
          }
        }
      } catch (error) {
        this.log(`Could not read ${dir} results: ${error.message}`, 'warning');
      }
    }
  }

  async generateUnifiedReport() {
    const reportPath = path.join(this.outputDir, `unified-test-report-${Date.now()}.json`);
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      this.log(`Unified report saved: ${reportPath}`, 'success');
      
      // Generate HTML dashboard
      await this.generateHtmlDashboard();
      
      // Generate executive summary
      await this.generateExecutiveSummary();
      
    } catch (error) {
      this.log('Failed to generate unified report', 'error');
    }
  }

  async generateHtmlDashboard() {
    const passRate = Math.round((this.results.summary.passedSuites / this.results.summary.totalSuites) * 100);
    const durationMinutes = Math.round(this.results.summary.totalDuration / 1000 / 60);
    
    const htmlDashboard = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendar System Test Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
        .dashboard { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; text-align: center; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 3em; font-weight: bold; margin-bottom: 10px; }
        .metric-value.success { color: #10b981; }
        .metric-value.warning { color: #f59e0b; }
        .metric-value.error { color: #ef4444; }
        .metric-label { color: #6b7280; font-weight: 500; }
        .suites { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .suite { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .suite-header { padding: 20px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .suite-title { font-size: 1.3em; font-weight: bold; margin-bottom: 5px; }
        .suite-description { color: #6b7280; }
        .suite-body { padding: 20px; }
        .suite-status { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9em; margin-bottom: 15px; }
        .status-pass { background: #dcfce7; color: #166534; }
        .status-fail { background: #fef2f2; color: #991b1b; }
        .suite-meta { color: #6b7280; font-size: 0.9em; }
        .recommendations { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .recommendations h2 { margin-bottom: 20px; color: #374151; }
        .recommendation { padding: 15px; margin-bottom: 15px; border-left: 4px solid #3b82f6; background: #eff6ff; border-radius: 0 4px 4px 0; }
        .critical-error { border-left-color: #ef4444; background: #fef2f2; }
        .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%); transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>📅 Calendar System Test Dashboard</h1>
            <p>Comprehensive Testing & Validation Results</p>
            <small>Generated: ${this.results.timestamp}</small>
        </div>

        <div class="metrics">
            <div class="metric">
                <div class="metric-value ${passRate >= 80 ? 'success' : passRate >= 60 ? 'warning' : 'error'}">${passRate}%</div>
                <div class="metric-label">Overall Pass Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value success">${this.results.summary.passedSuites}</div>
                <div class="metric-label">Suites Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value ${this.results.summary.failedSuites > 0 ? 'error' : 'success'}">${this.results.summary.failedSuites}</div>
                <div class="metric-label">Suites Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${durationMinutes}m</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>

        <div class="progress-bar">
            <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>

        <div class="suites">
            ${Object.values(this.results.suites).map(suite => `
            <div class="suite">
                <div class="suite-header">
                    <div class="suite-title">${suite.description}</div>
                    <div class="suite-description">${suite.name}</div>
                </div>
                <div class="suite-body">
                    <div class="suite-status ${suite.success ? 'status-pass' : 'status-fail'}">
                        ${suite.success ? '✅ PASSED' : '❌ FAILED'}
                        ${suite.critical ? ' (Critical)' : ''}
                    </div>
                    <div class="suite-meta">
                        <div><strong>Duration:</strong> ${Math.round(suite.duration / 1000)}s</div>
                        <div><strong>Exit Code:</strong> ${suite.exitCode}</div>
                        ${suite.error ? `<div style="color: #ef4444; margin-top: 10px;"><strong>Error:</strong> ${suite.error}</div>` : ''}
                    </div>
                </div>
            </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h2>📋 Recommendations & Next Steps</h2>
            ${this.generateDashboardRecommendations().map(rec => `
            <div class="recommendation ${rec.critical ? 'critical-error' : ''}">
                ${rec.text}
            </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const dashboardPath = path.join(this.outputDir, 'test-dashboard.html');
    await fs.writeFile(dashboardPath, htmlDashboard);
    this.log(`HTML dashboard saved: ${dashboardPath}`, 'success');
  }

  async generateExecutiveSummary() {
    const passRate = Math.round((this.results.summary.passedSuites / this.results.summary.totalSuites) * 100);
    const criticalFailures = this.results.errors.filter(e => e.critical).length;
    
    const summary = `
# 📅 Calendar System Testing - Executive Summary

**Date:** ${this.results.timestamp}  
**Testing Phase:** Phase 4 - Testing & Validation  
**Duration:** ${Math.round(this.results.summary.totalDuration / 1000 / 60)} minutes  

## 🎯 Overall Results

### Success Rate: ${passRate}%
- **Test Suites:** ${this.results.summary.totalSuites}
- **Passed:** ${this.results.summary.passedSuites} ✅
- **Failed:** ${this.results.summary.failedSuites} ❌
- **Critical Failures:** ${criticalFailures} 🚨

## 📊 Test Suite Results

${Object.values(this.results.suites).map(suite => `
### ${suite.description}
- **Status:** ${suite.success ? '✅ PASSED' : '❌ FAILED'}
- **Duration:** ${Math.round(suite.duration / 1000)}s
- **Critical:** ${suite.critical ? 'Yes' : 'No'}
${suite.error ? `- **Error:** ${suite.error}` : ''}
`).join('')}

## 🏆 Quality Assessment

${this.generateQualityAssessment()}

## 🚀 Production Readiness

${this.generateProductionReadiness()}

## 📋 Action Items

${this.generateActionItems()}

## 🎯 Next Steps

${this.generateNextSteps()}

---

**Dashboard:** View detailed results in \`test-dashboard.html\`  
**Reports:** Individual test reports available in \`test-results/\` directories
`;

    const summaryPath = path.join(this.outputDir, 'executive-summary.md');
    await fs.writeFile(summaryPath, summary);
    this.log(`Executive summary saved: ${summaryPath}`, 'success');
  }

  generateDashboardRecommendations() {
    const recommendations = [];
    
    Object.values(this.results.suites).forEach(suite => {
      if (!suite.success) {
        recommendations.push({
          text: `🔧 **${suite.description}:** ${suite.error || 'Test suite failed'}`,
          critical: suite.critical
        });
      }
    });
    
    if (this.results.summary.failedSuites === 0) {
      recommendations.push({
        text: '🎉 **Excellent!** All test suites passed. The calendar system is ready for production.',
        critical: false
      });
    }
    
    return recommendations;
  }

  generateQualityAssessment() {
    const passRate = Math.round((this.results.summary.passedSuites / this.results.summary.totalSuites) * 100);
    
    if (passRate >= 90) {
      return `
**🌟 EXCELLENT QUALITY**
- All or nearly all tests passing
- Calendar system meets high quality standards
- Ready for production deployment
`;
    } else if (passRate >= 70) {
      return `
**✅ GOOD QUALITY**
- Most tests passing with minor issues
- Calendar system is functional with room for improvement
- Address failing tests before production
`;
    } else if (passRate >= 50) {
      return `
**⚠️ MODERATE QUALITY**
- Significant issues found in testing
- Calendar system needs attention before production
- Focus on critical failures first
`;
    } else {
      return `
**❌ POOR QUALITY**
- Multiple test failures indicate serious issues
- Calendar system not ready for production
- Requires immediate attention and fixes
`;
    }
  }

  generateProductionReadiness() {
    const criticalFailures = this.results.errors.filter(e => e.critical).length;
    const passRate = Math.round((this.results.summary.passedSuites / this.results.summary.totalSuites) * 100);
    
    if (criticalFailures === 0 && passRate >= 80) {
      return `
**✅ PRODUCTION READY**
- No critical failures detected
- High pass rate across all test suites
- Calendar system meets production standards
`;
    } else if (criticalFailures <= 1 && passRate >= 60) {
      return `
**⚠️ NEEDS MINOR FIXES**
- Few critical issues to address
- Generally stable but requires attention
- Fix critical issues before production deployment
`;
    } else {
      return `
**❌ NOT PRODUCTION READY**
- ${criticalFailures} critical failure(s) detected
- Pass rate of ${passRate}% below production threshold
- Significant issues must be resolved before deployment
`;
    }
  }

  generateActionItems() {
    const actionItems = [];
    
    Object.values(this.results.suites).forEach(suite => {
      if (!suite.success && suite.critical) {
        actionItems.push(`- **HIGH PRIORITY:** Fix ${suite.description} (${suite.error || 'unknown error'})`);
      }
    });
    
    Object.values(this.results.suites).forEach(suite => {
      if (!suite.success && !suite.critical) {
        actionItems.push(`- **MEDIUM PRIORITY:** Address ${suite.description} issues`);
      }
    });
    
    if (actionItems.length === 0) {
      actionItems.push('- No critical action items - all tests passed! 🎉');
    }
    
    return actionItems.join('\n');
  }

  generateNextSteps() {
    const criticalFailures = this.results.errors.filter(e => e.critical).length;
    const passRate = Math.round((this.results.summary.passedSuites / this.results.summary.totalSuites) * 100);
    
    if (criticalFailures === 0 && passRate >= 90) {
      return `
1. **Deploy to staging** for final validation
2. **Conduct user acceptance testing** with real barbers
3. **Schedule production deployment**
4. **Set up monitoring and alerts**
`;
    } else if (criticalFailures <= 1) {
      return `
1. **Fix critical issues** identified in failed test suites
2. **Re-run comprehensive test suite** to validate fixes
3. **Review and address** any remaining moderate priority issues
4. **Schedule follow-up testing** once fixes are complete
`;
    } else {
      return `
1. **IMMEDIATE:** Address all critical failures
2. **Review architecture** for fundamental issues
3. **Implement fixes** systematically
4. **Run individual test suites** to validate each fix
5. **Re-run comprehensive testing** when critical issues resolved
`;
    }
  }

  async runComprehensiveTesting() {
    await this.init();
    
    this.log('🚀 Starting comprehensive calendar system testing...');
    this.log(`Running ${this.testSuites.length} test suites\n`);
    
    try {
      // Check prerequisites
      await this.checkPrerequisites();
      
      // Run all test suites
      for (const suite of this.testSuites) {
        const result = await this.runTestSuite(suite);
        
        // Stop on critical failures if specified
        if (!result.success && result.critical) {
          this.log(`\n⚠️ Critical test suite failed: ${suite.name}`, 'warning');
          this.log('Consider fixing critical issues before proceeding', 'warning');
        }
      }
      
      // Aggregate detailed results
      await this.aggregateTestResults();
      
      // Generate unified reports
      await this.generateUnifiedReport();
      
      // Print final summary
      const passRate = Math.round((this.results.summary.passedSuites / this.results.summary.totalSuites) * 100);
      const criticalFailures = this.results.errors.filter(e => e.critical).length;
      
      this.log('\n🏁 Comprehensive Testing Complete!');
      this.log('=====================================');
      this.log(`Overall Pass Rate: ${passRate}%`);
      this.log(`Suites Passed: ${this.results.summary.passedSuites}/${this.results.summary.totalSuites}`);
      this.log(`Critical Failures: ${criticalFailures}`);
      this.log(`Total Duration: ${Math.round(this.results.summary.totalDuration / 1000 / 60)} minutes`);
      
      if (criticalFailures === 0 && passRate >= 80) {
        this.log('\n🎉 TESTING SUCCESSFUL! Calendar system ready for production.', 'success');
        return 0;
      } else if (criticalFailures === 0 && passRate >= 60) {
        this.log('\n⚠️ TESTING MOSTLY SUCCESSFUL with minor issues to address.', 'warning');
        return 1;
      } else {
        this.log('\n❌ TESTING FAILED with critical issues requiring attention.', 'error');
        return 2;
      }
      
    } catch (error) {
      this.log(`\nComprehensive testing failed: ${error.message}`, 'error');
      return 1;
    }
  }
}

// Run comprehensive testing if called directly
if (require.main === module) {
  const orchestrator = new TestOrchestrator();
  orchestrator.runComprehensiveTesting().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Test orchestrator failed:', error);
    process.exit(1);
  });
}

module.exports = TestOrchestrator;
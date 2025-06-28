#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
  constructor(config) {
    this.config = config;
  }

  async generate(metrics, previousMetrics = null) {
    console.log('📄 Generating reports...');

    const reports = {};

    if (this.config.reports.formats.includes('markdown')) {
      reports.markdown = await this.generateMarkdownReport(metrics, previousMetrics);
    }

    if (this.config.reports.formats.includes('json')) {
      reports.json = await this.generateJsonReport(metrics, previousMetrics);
    }

    if (this.config.reports.formats.includes('html')) {
      reports.html = await this.generateHtmlReport(metrics, previousMetrics);
    }

    return reports;
  }

  async generateMarkdownReport(metrics, previousMetrics) {
    const issues = this.analyzeIssues(metrics);
    const trends = previousMetrics ? this.analyzeTrends(metrics, previousMetrics) : null;

    let report = `# 🏥 Codebase Health Report

**Generated:** ${new Date(metrics.timestamp).toLocaleString()}

## 📊 Executive Summary

${this.generateExecutiveSummary(metrics, issues)}

## 🚨 Critical Issues

${issues.critical.length > 0 ? issues.critical.map(issue => `- 🔴 ${issue}`).join('\n') : '✅ No critical issues found'}

## ⚠️  Warnings

${issues.warnings.length > 0 ? issues.warnings.map(warning => `- 🟡 ${warning}`).join('\n') : '✅ No warnings'}

## 📈 Metrics Overview

### 📁 File Statistics
- **Total Files:** ${metrics.files.totalCount.toLocaleString()}
- **Total Size:** ${this.formatBytes(metrics.files.totalSize)}

| File Type | Count | Size |
|-----------|-------|------|
${Object.entries(metrics.files.byType)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([ext, count]) => `| ${ext || 'no extension'} | ${count} | ${this.formatBytes(metrics.files.sizeByType[ext] || 0)} |`)
  .join('\n')}

### 🔍 Duplicate Detection
- **Duplicate Files:** ${metrics.duplicates.filter(d => !d.type).length}
- **Similar Named Components:** ${metrics.duplicates.filter(d => d.type === 'similar-name').length}

${metrics.duplicates.length > 0 ? `
#### Duplicates Found:
${metrics.duplicates.slice(0, 10).map(dup => {
  if (dup.type === 'similar-name') {
    return `- **${dup.name}** found in:
${dup.files.map(f => `  - ${f}`).join('\n')}`;
  } else {
    return `- **Identical content** (${this.formatBytes(dup.size)}):
${dup.files.map(f => `  - ${f}`).join('\n')}`;
  }
}).join('\n\n')}
` : ''}

### 📦 Bundle Size Analysis
${metrics.bundleSize.error ? `
⚠️  Could not analyze bundle size: ${metrics.bundleSize.error}
` : `
- **Frontend Total:** ${this.formatBytes(metrics.bundleSize.totalSize || 0)}
- **Backend Size:** ${this.formatBytes(metrics.bundleSize.backend || 0)}

${metrics.bundleSize.pages ? `
#### Page Bundle Sizes:
| Page | Size |
|------|------|
${Object.entries(metrics.bundleSize.pages)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([page, size]) => `| ${page} | ${this.formatBytes(size)} |`)
  .join('\n')}
` : ''}
`}

### 🔧 Dependencies
#### Frontend
- **Dependencies:** ${metrics.dependencies.frontend.dependencies || 0}
- **Dev Dependencies:** ${metrics.dependencies.frontend.devDependencies || 0}
- **Outdated:** ${metrics.dependencies.frontend.outdated || 0}
${metrics.dependencies.frontend.vulnerabilities ? `
- **Vulnerabilities:**
  - Critical: ${metrics.dependencies.frontend.vulnerabilities.critical || 0}
  - High: ${metrics.dependencies.frontend.vulnerabilities.high || 0}
  - Moderate: ${metrics.dependencies.frontend.vulnerabilities.moderate || 0}
  - Low: ${metrics.dependencies.frontend.vulnerabilities.low || 0}
` : ''}

#### Backend
- **Dependencies:** ${metrics.dependencies.backend.dependencies || 0}
- **Outdated:** ${metrics.dependencies.backend.outdated || 0}

### 🧩 Code Complexity
- **Total Files Analyzed:** ${metrics.complexity.summary.totalFiles}
- **Average Complexity:** ${metrics.complexity.summary.avgComplexity.toFixed(2)}
- **Max Complexity:** ${metrics.complexity.summary.maxComplexity}
- **Files Over Threshold:** ${metrics.complexity.summary.filesOverThreshold}

${metrics.complexity.summary.filesOverThreshold > 0 ? `
#### Most Complex Files:
${metrics.complexity.files
  .sort((a, b) => b.complexity - a.complexity)
  .slice(0, 10)
  .map(file => `- ${file.path} (complexity: ${file.complexity}, lines: ${file.lines})`)
  .join('\n')}
` : ''}

### 🧪 Test Coverage
${Object.keys(metrics.testCoverage).length === 0 ? '⚠️  No test coverage data found' : ''}
${metrics.testCoverage.frontend ? `
#### Frontend Coverage
- **Lines:** ${metrics.testCoverage.frontend.lines || 0}%
- **Statements:** ${metrics.testCoverage.frontend.statements || 0}%
- **Functions:** ${metrics.testCoverage.frontend.functions || 0}%
- **Branches:** ${metrics.testCoverage.frontend.branches || 0}%
` : ''}

${metrics.testCoverage.backend ? `
#### Backend Coverage
${metrics.testCoverage.backend.error ? metrics.testCoverage.backend.error : JSON.stringify(metrics.testCoverage.backend, null, 2)}
` : ''}

### 📝 TODO/FIXME Comments
- **Total:** ${metrics.todos.length}

${metrics.todos.length > 0 ? `
#### By Type:
${Object.entries(
  metrics.todos.reduce((acc, todo) => {
    acc[todo.type] = (acc[todo.type] || 0) + 1;
    return acc;
  }, {})
).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

#### Recent TODOs:
${metrics.todos.slice(0, 10).map(todo =>
  `- [${todo.type}] ${todo.file}:${todo.line} - ${todo.message}`
).join('\n')}
` : ''}

${trends ? `
## 📈 Trends (vs Previous Report)

${this.generateTrendsSection(trends)}
` : ''}

## 💡 Recommendations

${this.generateRecommendations(metrics, issues)}

---
*Report generated by Codebase Health Monitor*
`;

    return report;
  }

  async generateJsonReport(metrics, previousMetrics) {
    const issues = this.analyzeIssues(metrics);
    const trends = previousMetrics ? this.analyzeTrends(metrics, previousMetrics) : null;

    return {
      metadata: {
        timestamp: metrics.timestamp,
        version: '1.0.0'
      },
      metrics,
      issues,
      trends,
      recommendations: this.generateRecommendationsJson(metrics, issues)
    };
  }

  async generateHtmlReport(metrics, previousMetrics) {
    const issues = this.analyzeIssues(metrics);
    const trends = previousMetrics ? this.analyzeTrends(metrics, previousMetrics) : null;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codebase Health Report - ${new Date(metrics.timestamp).toLocaleDateString()}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }

        .timestamp {
            color: #7f8c8d;
            font-size: 14px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .metric-card h3 {
            color: #34495e;
            margin-bottom: 10px;
            font-size: 16px;
        }

        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
        }

        .metric-label {
            color: #7f8c8d;
            font-size: 14px;
        }

        .status-good { color: #27ae60; }
        .status-warning { color: #f39c12; }
        .status-critical { color: #e74c3c; }

        .issues-section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        .issue-list {
            list-style: none;
            margin-top: 15px;
        }

        .issue-item {
            padding: 10px;
            margin-bottom: 5px;
            border-radius: 5px;
            display: flex;
            align-items: center;
        }

        .issue-critical {
            background: #ffe5e5;
            color: #c0392b;
        }

        .issue-warning {
            background: #fff3cd;
            color: #856404;
        }

        .issue-icon {
            margin-right: 10px;
            font-size: 20px;
        }

        .chart-container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }

        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }

        .trend-up { color: #e74c3c; }
        .trend-down { color: #27ae60; }
        .trend-neutral { color: #95a5a6; }

        .recommendations {
            background: #e8f5e9;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
        }

        .recommendations h3 {
            color: #27ae60;
            margin-bottom: 10px;
        }

        .recommendations ul {
            margin-left: 20px;
        }

        canvas {
            max-width: 100%;
            height: auto;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Codebase Health Report</h1>
            <div class="timestamp">Generated: ${new Date(metrics.timestamp).toLocaleString()}</div>
        </div>

        <div class="summary-grid">
            <div class="metric-card">
                <h3>Total Files</h3>
                <div class="metric-value">${metrics.files.totalCount.toLocaleString()}</div>
                <div class="metric-label">${this.formatBytes(metrics.files.totalSize)}</div>
            </div>

            <div class="metric-card">
                <h3>Code Quality Score</h3>
                <div class="metric-value ${this.getScoreClass(this.calculateHealthScore(metrics))}">${this.calculateHealthScore(metrics)}%</div>
                <div class="metric-label">Overall Health</div>
            </div>

            <div class="metric-card">
                <h3>Issues Found</h3>
                <div class="metric-value">${issues.critical.length + issues.warnings.length}</div>
                <div class="metric-label">${issues.critical.length} critical, ${issues.warnings.length} warnings</div>
            </div>

            <div class="metric-card">
                <h3>TODOs</h3>
                <div class="metric-value">${metrics.todos.length}</div>
                <div class="metric-label">Pending tasks</div>
            </div>
        </div>

        ${issues.critical.length > 0 || issues.warnings.length > 0 ? `
        <div class="issues-section">
            <h2>🚨 Issues</h2>

            ${issues.critical.length > 0 ? `
            <h3 style="margin-top: 20px;">Critical Issues</h3>
            <ul class="issue-list">
                ${issues.critical.map(issue => `
                <li class="issue-item issue-critical">
                    <span class="issue-icon">🔴</span>
                    ${issue}
                </li>
                `).join('')}
            </ul>
            ` : ''}

            ${issues.warnings.length > 0 ? `
            <h3 style="margin-top: 20px;">Warnings</h3>
            <ul class="issue-list">
                ${issues.warnings.map(warning => `
                <li class="issue-item issue-warning">
                    <span class="issue-icon">⚠️</span>
                    ${warning}
                </li>
                `).join('')}
            </ul>
            ` : ''}
        </div>
        ` : ''}

        <div class="chart-container">
            <h2>📊 File Distribution</h2>
            <canvas id="fileChart"></canvas>
        </div>

        <div class="chart-container">
            <h2>📈 Complexity Analysis</h2>
            <canvas id="complexityChart"></canvas>
        </div>

        ${metrics.duplicates.length > 0 ? `
        <div class="chart-container">
            <h2>🔍 Duplicate Files</h2>
            <table>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Files</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
                    ${metrics.duplicates.slice(0, 10).map(dup => `
                    <tr>
                        <td>${dup.type || 'Identical Content'}</td>
                        <td>${dup.files.join('<br>')}</td>
                        <td>${dup.size ? this.formatBytes(dup.size) : '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
                ${this.generateRecommendations(metrics, issues).split('\n').filter(r => r.trim()).map(r => `<li>${r.replace(/^- /, '')}</li>`).join('')}
            </ul>
        </div>
    </div>

    <script>
        // File distribution chart
        const fileCtx = document.getElementById('fileChart').getContext('2d');
        const fileData = ${JSON.stringify(Object.entries(metrics.files.byType).slice(0, 10))};

        new Chart(fileCtx, {
            type: 'doughnut',
            data: {
                labels: fileData.map(([ext]) => ext || 'no extension'),
                datasets: [{
                    data: fileData.map(([, count]) => count),
                    backgroundColor: [
                        '#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6',
                        '#1abc9c', '#34495e', '#f39c12', '#d35400', '#c0392b'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

        // Complexity chart
        const complexityCtx = document.getElementById('complexityChart').getContext('2d');
        const complexityData = ${JSON.stringify(
            metrics.complexity.files
                .sort((a, b) => b.complexity - a.complexity)
                .slice(0, 10)
                .map(f => ({
                    file: f.path.split('/').pop(),
                    complexity: f.complexity
                }))
        )};

        new Chart(complexityCtx, {
            type: 'bar',
            data: {
                labels: complexityData.map(d => d.file),
                datasets: [{
                    label: 'Complexity Score',
                    data: complexityData.map(d => d.complexity),
                    backgroundColor: complexityData.map(d =>
                        d.complexity > ${this.config.thresholds.complexity.maxCyclomaticComplexity} ? '#e74c3c' : '#3498db'
                    )
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }

  analyzeIssues(metrics) {
    const issues = {
      critical: [],
      warnings: []
    };

    // Check file count thresholds
    if (metrics.files.totalCount > this.config.thresholds.files.total) {
      issues.warnings.push(`Total file count (${metrics.files.totalCount}) exceeds threshold (${this.config.thresholds.files.total})`);
    }

    // Check file type thresholds
    Object.entries(this.config.thresholds.files.perType).forEach(([ext, threshold]) => {
      const count = metrics.files.byType[`.${ext}`] || 0;
      if (count > threshold) {
        issues.warnings.push(`${ext.toUpperCase()} file count (${count}) exceeds threshold (${threshold})`);
      }
    });

    // Check duplicates
    if (metrics.duplicates.length > this.config.thresholds.duplicates.maxAllowed) {
      issues.critical.push(`Found ${metrics.duplicates.length} duplicate files/components (max allowed: ${this.config.thresholds.duplicates.maxAllowed})`);
    }

    // Check bundle sizes
    if (metrics.bundleSize.totalSize > this.config.thresholds.bundleSize.frontend.total) {
      issues.critical.push(`Frontend bundle size (${this.formatBytes(metrics.bundleSize.totalSize)}) exceeds threshold (${this.formatBytes(this.config.thresholds.bundleSize.frontend.total)})`);
    }

    // Check dependencies
    if (metrics.dependencies.frontend.outdated > this.config.thresholds.dependencies.maxOutdated) {
      issues.warnings.push(`Frontend has ${metrics.dependencies.frontend.outdated} outdated packages (max: ${this.config.thresholds.dependencies.maxOutdated})`);
    }

    if (metrics.dependencies.frontend.vulnerabilities &&
        (metrics.dependencies.frontend.vulnerabilities.critical > 0 ||
         metrics.dependencies.frontend.vulnerabilities.high > 0)) {
      issues.critical.push(`Security vulnerabilities found in frontend dependencies`);
    }

    // Check complexity
    if (metrics.complexity.summary.filesOverThreshold > 0) {
      issues.warnings.push(`${metrics.complexity.summary.filesOverThreshold} files exceed complexity threshold`);
    }

    // Check TODOs
    if (metrics.todos.length > this.config.thresholds.todos.maxAllowed) {
      issues.warnings.push(`Too many TODOs (${metrics.todos.length}) in codebase (max: ${this.config.thresholds.todos.maxAllowed})`);
    }

    // Check test coverage
    if (metrics.testCoverage.frontend && metrics.testCoverage.frontend.lines < this.config.thresholds.testCoverage.minimum) {
      issues.critical.push(`Frontend test coverage (${metrics.testCoverage.frontend.lines}%) below minimum (${this.config.thresholds.testCoverage.minimum}%)`);
    }

    return issues;
  }

  analyzeTrends(current, previous) {
    return {
      files: {
        total: current.files.totalCount - previous.files.totalCount,
        size: current.files.totalSize - previous.files.totalSize
      },
      duplicates: current.duplicates.length - previous.duplicates.length,
      todos: current.todos.length - previous.todos.length,
      complexity: current.complexity.summary.avgComplexity - previous.complexity.summary.avgComplexity
    };
  }

  generateExecutiveSummary(metrics, issues) {
    const healthScore = this.calculateHealthScore(metrics);
    const status = healthScore >= 80 ? '🟢 Healthy' : healthScore >= 60 ? '🟡 Needs Attention' : '🔴 Critical';

    return `
**Overall Status:** ${status} (${healthScore}%)

- **Files:** ${metrics.files.totalCount.toLocaleString()} files, ${this.formatBytes(metrics.files.totalSize)}
- **Issues:** ${issues.critical.length} critical, ${issues.warnings.length} warnings
- **Duplicates:** ${metrics.duplicates.length} found
- **TODOs:** ${metrics.todos.length} pending
- **Complexity:** Average ${metrics.complexity.summary.avgComplexity.toFixed(2)}
`;
  }

  generateTrendsSection(trends) {
    const items = [];

    if (trends.files.total !== 0) {
      const icon = trends.files.total > 0 ? '📈' : '📉';
      items.push(`${icon} Files: ${trends.files.total > 0 ? '+' : ''}${trends.files.total} (${trends.files.size > 0 ? '+' : ''}${this.formatBytes(trends.files.size)})`);
    }

    if (trends.duplicates !== 0) {
      const icon = trends.duplicates > 0 ? '⚠️' : '✅';
      items.push(`${icon} Duplicates: ${trends.duplicates > 0 ? '+' : ''}${trends.duplicates}`);
    }

    if (trends.todos !== 0) {
      const icon = trends.todos > 0 ? '📝' : '✅';
      items.push(`${icon} TODOs: ${trends.todos > 0 ? '+' : ''}${trends.todos}`);
    }

    if (trends.complexity !== 0) {
      const icon = trends.complexity > 0 ? '⚠️' : '✅';
      items.push(`${icon} Complexity: ${trends.complexity > 0 ? '+' : ''}${trends.complexity.toFixed(2)}`);
    }

    return items.join('\n');
  }

  generateRecommendations(metrics, issues) {
    const recommendations = [];

    if (issues.critical.length > 0) {
      recommendations.push('- 🚨 Address critical issues immediately');
    }

    if (metrics.duplicates.length > 5) {
      recommendations.push('- 🔄 Refactor duplicate components into shared modules');
    }

    if (metrics.complexity.summary.filesOverThreshold > 0) {
      recommendations.push('- 🧩 Refactor complex files to improve maintainability');
    }

    if (metrics.todos.length > this.config.thresholds.todos.warningLevel) {
      recommendations.push('- 📝 Schedule time to address accumulated TODOs');
    }

    if (metrics.dependencies.frontend.outdated > 10) {
      recommendations.push('- 📦 Update outdated dependencies to get latest features and security fixes');
    }

    if (!metrics.testCoverage.frontend && !metrics.testCoverage.backend) {
      recommendations.push('- 🧪 Set up test coverage reporting to track code quality');
    }

    if (metrics.files.totalSize > 100000000) { // 100MB
      recommendations.push('- 🗑️ Clean up unnecessary files and optimize asset sizes');
    }

    return recommendations.join('\n');
  }

  generateRecommendationsJson(metrics, issues) {
    const recommendations = [];

    if (issues.critical.length > 0) {
      recommendations.push({
        priority: 'critical',
        type: 'issues',
        message: 'Address critical issues immediately',
        details: issues.critical
      });
    }

    if (metrics.duplicates.length > 5) {
      recommendations.push({
        priority: 'high',
        type: 'refactoring',
        message: 'Refactor duplicate components into shared modules',
        details: `Found ${metrics.duplicates.length} duplicates`
      });
    }

    return recommendations;
  }

  calculateHealthScore(metrics) {
    let score = 100;

    // Deduct points for issues
    const issues = this.analyzeIssues(metrics);
    score -= issues.critical.length * 10;
    score -= issues.warnings.length * 5;

    // Deduct for duplicates
    score -= Math.min(metrics.duplicates.length * 2, 20);

    // Deduct for TODOs
    score -= Math.min(metrics.todos.length * 0.5, 10);

    // Deduct for complexity
    if (metrics.complexity.summary.avgComplexity > 10) {
      score -= 10;
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  getScoreClass(score) {
    if (score >= 80) return 'status-good';
    if (score >= 60) return 'status-warning';
    return 'status-critical';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = ReportGenerator;

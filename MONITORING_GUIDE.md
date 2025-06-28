# 🏥 Codebase Health Monitoring Guide

## Overview

The Codebase Health Monitoring System tracks code quality metrics over time and alerts when issues arise. It provides comprehensive insights into your codebase's health through automated analysis and reporting.

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Make scripts executable
chmod +x codebase-monitor.js
chmod +x setup-monitoring-cron.sh

# Run setup for automated monitoring
./setup-monitoring-cron.sh

# Or run manually
node codebase-monitor.js
```

### 2. View Reports

Reports are generated in multiple formats:
- **Markdown**: `monitoring/reports/health-report-latest.md`
- **HTML**: Open `monitoring/reports/health-report-latest.html` in browser
- **JSON**: `monitoring/reports/metrics-latest.json` for programmatic access

## 📊 Metrics Tracked

### 1. File Metrics
- Total file count by type (.js, .ts, .tsx, .py, etc.)
- Total codebase size
- File distribution analysis

### 2. Duplicate Detection
- Identical file content detection
- Similar component name detection
- Duplicate code identification

### 3. Bundle Size Analysis
- Frontend bundle sizes per page
- Backend directory size
- Asset optimization opportunities

### 4. Dependencies
- Total dependency count
- Outdated packages
- Security vulnerabilities
- Dev vs. production dependencies

### 5. Code Complexity
- Cyclomatic complexity per file
- Lines of code metrics
- Function count and size
- Files exceeding complexity thresholds

### 6. Test Coverage
- Line coverage percentage
- Statement coverage
- Function coverage
- Branch coverage

### 7. Technical Debt
- TODO/FIXME comment tracking
- HACK/BUG/OPTIMIZE markers
- Location and context of each item

### 8. Performance Metrics
- Load time analysis (if available)
- API response times (if logged)
- Database query performance (if tracked)

## 🎯 Thresholds and Alerts

### Default Thresholds (configurable in `monitoring-config.json`):

```json
{
  "files": {
    "total": 5000,
    "perType": {
      "js": 1000,
      "ts": 1000,
      "tsx": 1000,
      "py": 500
    }
  },
  "duplicates": {
    "maxAllowed": 10
  },
  "bundleSize": {
    "frontend": {
      "total": 2000000  // 2MB
    }
  },
  "complexity": {
    "maxCyclomaticComplexity": 15,
    "maxLinesPerFile": 500
  },
  "testCoverage": {
    "minimum": 60
  },
  "todos": {
    "maxAllowed": 50
  }
}
```

### Alert Levels:
- **🔴 Critical**: Immediate action required
- **🟡 Warning**: Should be addressed soon
- **🟢 Info**: For awareness only

## 📈 Understanding the Reports

### Health Score
A percentage score (0-100%) indicating overall codebase health:
- **80-100%**: 🟢 Healthy
- **60-79%**: 🟡 Needs Attention
- **0-59%**: 🔴 Critical

### Executive Summary
Quick overview of:
- Overall status and score
- Key metrics at a glance
- Critical issues count
- Trend indicators

### Issues Section
Categorized list of problems:
- Security vulnerabilities
- Performance bottlenecks
- Code quality issues
- Technical debt items

### Recommendations
AI-generated suggestions based on:
- Current metrics
- Historical trends
- Best practices
- Project-specific patterns

## 🔧 Configuration

### Edit Configuration
```bash
# Open configuration file
vim monitoring-config.json
```

### Key Configuration Options:

1. **Project Root**: Base directory for analysis
2. **Thresholds**: Customize limits for each metric
3. **Ignore Patterns**: Exclude files/directories
4. **Report Formats**: Choose output formats
5. **Alert Channels**: Configure notifications
6. **Schedule**: Set automation frequency

### Example Custom Configuration:
```json
{
  "projectRoot": "./",
  "thresholds": {
    "files": {
      "total": 3000,
      "perType": {
        "js": 500,
        "ts": 800
      }
    }
  },
  "ignore": {
    "directories": ["vendor", "tmp"],
    "files": ["*.generated.js"]
  },
  "alerts": {
    "emailTo": ["team@example.com"],
    "slackWebhook": "https://hooks.slack.com/..."
  }
}
```

## 📅 Automation

### Cron Schedule
Default: Weekly on Mondays at 9 AM

```bash
# View current cron jobs
crontab -l

# Edit schedule
crontab -e
```

### Manual Scheduling Options:
```bash
# Daily at 2 AM
0 2 * * * cd /path/to/project && node codebase-monitor.js

# Every 6 hours
0 */6 * * * cd /path/to/project && node codebase-monitor.js

# First of every month
0 0 1 * * cd /path/to/project && node codebase-monitor.js
```

## 📊 Comparing Reports

### Compare Two Metrics Files:
```bash
node codebase-monitor.js compare metrics-2024-01-01.json metrics-2024-01-08.json
```

### Track Trends Over Time:
```bash
# Generate trend report
ls monitoring/reports/metrics-*.json | xargs -I {} node codebase-monitor.js compare {} monitoring/reports/metrics-latest.json
```

## 🛠️ Troubleshooting

### Common Issues:

1. **"Cannot find module" error**
   ```bash
   # Ensure you're in the project root
   cd /Users/bossio/6fb-booking
   ```

2. **Permission denied**
   ```bash
   chmod +x codebase-monitor.js
   chmod +x setup-monitoring-cron.sh
   ```

3. **No test coverage data**
   ```bash
   # Generate coverage first
   cd frontend && npm test -- --coverage
   cd backend && pytest --cov
   ```

4. **Bundle size not analyzed**
   ```bash
   # Build the project first
   cd frontend && npm run build
   ```

## 🔄 Integration

### CI/CD Integration

Add to your CI pipeline:
```yaml
# GitHub Actions example
- name: Run Codebase Health Check
  run: |
    node codebase-monitor.js
    if [ -f monitoring/reports/health-report-latest.md ]; then
      cat monitoring/reports/health-report-latest.md >> $GITHUB_STEP_SUMMARY
    fi
```

### Git Hooks

Add to `.git/hooks/pre-push`:
```bash
#!/bin/bash
node codebase-monitor.js
if [ $? -ne 0 ]; then
  echo "❌ Codebase health check failed"
  exit 1
fi
```

### VS Code Integration

Add to `.vscode/tasks.json`:
```json
{
  "label": "Health Check",
  "type": "shell",
  "command": "node codebase-monitor.js",
  "problemMatcher": []
}
```

## 📚 Best Practices

1. **Regular Reviews**: Check reports weekly
2. **Act on Alerts**: Address critical issues immediately
3. **Track Trends**: Monitor metrics over time
4. **Customize Thresholds**: Adjust based on project needs
5. **Automate Fixes**: Create scripts for common issues
6. **Team Involvement**: Share reports with the team
7. **Document Decisions**: Record why certain thresholds were chosen

## 🎯 Action Items by Metric

### High File Count
- Review and remove unused files
- Archive old code
- Split large modules

### Many Duplicates
- Extract common components
- Create shared utilities
- Use composition patterns

### Large Bundle Size
- Implement code splitting
- Optimize images
- Remove unused dependencies

### High Complexity
- Refactor complex functions
- Extract helper methods
- Simplify logic flow

### Low Test Coverage
- Add unit tests
- Implement integration tests
- Set coverage requirements

### Many TODOs
- Schedule technical debt sprints
- Prioritize by impact
- Convert to tickets

## 🔗 Related Tools

- **ESLint**: For code style enforcement
- **Prettier**: For code formatting
- **Lighthouse**: For performance metrics
- **Bundlephobia**: For package size analysis
- **Snyk**: For security scanning

---

*Last Updated: 2025-06-28*
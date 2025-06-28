#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const HealthMetricsCollector = require('./health-metrics-collector');
const ReportGenerator = require('./report-generator');

class CodebaseMonitor {
  constructor(configPath = './monitoring-config.json') {
    this.configPath = configPath;
    this.config = null;
  }

  async init() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configContent);
      
      // Ensure reports directory exists
      const reportsDir = path.join(this.config.projectRoot, this.config.reports.outputDirectory);
      await fs.mkdir(reportsDir, { recursive: true });
      
      console.log('✅ Codebase Monitor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      throw error;
    }
  }

  async run() {
    console.log('🚀 Starting codebase health monitoring...\n');
    
    try {
      // Load previous metrics for comparison
      const previousMetrics = await this.loadPreviousMetrics();
      
      // Collect current metrics
      const collector = new HealthMetricsCollector(this.config);
      const metrics = await collector.collect();
      
      // Generate reports
      const reportGenerator = new ReportGenerator(this.config);
      const reports = await reportGenerator.generate(metrics, previousMetrics);
      
      // Save reports
      await this.saveReports(metrics, reports);
      
      // Check for alerts
      await this.checkAlerts(metrics, reports);
      
      // Clean up old reports
      await this.cleanupOldReports();
      
      console.log('\n✅ Monitoring complete!');
      console.log(`📄 Reports saved to: ${this.config.reports.outputDirectory}`);
      
      return { metrics, reports };
    } catch (error) {
      console.error('❌ Monitoring failed:', error);
      throw error;
    }
  }

  async loadPreviousMetrics() {
    try {
      const metricsDir = path.join(this.config.projectRoot, this.config.reports.outputDirectory);
      const files = await fs.readdir(metricsDir);
      
      // Find the most recent metrics file
      const metricsFiles = files
        .filter(f => f.startsWith('metrics-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (metricsFiles.length > 0) {
        const previousPath = path.join(metricsDir, metricsFiles[0]);
        const content = await fs.readFile(previousPath, 'utf8');
        return JSON.parse(content).metrics;
      }
    } catch (error) {
      console.log('ℹ️  No previous metrics found for comparison');
    }
    
    return null;
  }

  async saveReports(metrics, reports) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportsDir = path.join(this.config.projectRoot, this.config.reports.outputDirectory);
    
    // Save raw metrics
    if (reports.json) {
      const metricsPath = path.join(reportsDir, `metrics-${timestamp}.json`);
      await fs.writeFile(metricsPath, JSON.stringify(reports.json, null, 2));
    }
    
    // Save markdown report
    if (reports.markdown) {
      const markdownPath = path.join(reportsDir, `health-report-${timestamp}.md`);
      await fs.writeFile(markdownPath, reports.markdown);
      
      // Also save as latest
      const latestPath = path.join(reportsDir, 'health-report-latest.md');
      await fs.writeFile(latestPath, reports.markdown);
    }
    
    // Save HTML report
    if (reports.html) {
      const htmlPath = path.join(reportsDir, `health-report-${timestamp}.html`);
      await fs.writeFile(htmlPath, reports.html);
      
      // Also save as latest
      const latestPath = path.join(reportsDir, 'health-report-latest.html');
      await fs.writeFile(latestPath, reports.html);
    }
  }

  async checkAlerts(metrics, reports) {
    const issues = this.analyzeIssuesForAlerts(metrics);
    
    if (issues.length === 0) {
      console.log('✅ No alerts triggered');
      return;
    }
    
    console.log(`\n🚨 ${issues.length} alerts triggered:`);
    issues.forEach(issue => {
      console.log(`  - ${issue.level}: ${issue.message}`);
    });
    
    // Send alerts based on configuration
    if (this.config.alerts.consoleOutput) {
      // Already logged above
    }
    
    if (this.config.alerts.emailTo && this.config.alerts.emailTo.length > 0) {
      console.log('📧 Email alerts configured but not implemented');
    }
    
    if (this.config.alerts.slackWebhook) {
      console.log('💬 Slack alerts configured but not implemented');
    }
  }

  analyzeIssuesForAlerts(metrics) {
    const alerts = [];
    
    // Check critical thresholds
    if (metrics.files.totalCount > this.config.thresholds.files.total * 1.5) {
      alerts.push({
        level: 'critical',
        message: `File count critically high: ${metrics.files.totalCount}`
      });
    }
    
    if (metrics.dependencies.frontend?.vulnerabilities?.critical > 0) {
      alerts.push({
        level: 'critical',
        message: `Critical security vulnerabilities found in dependencies`
      });
    }
    
    if (metrics.duplicates.length > this.config.thresholds.duplicates.maxAllowed * 2) {
      alerts.push({
        level: 'warning',
        message: `Excessive duplicates found: ${metrics.duplicates.length}`
      });
    }
    
    if (metrics.todos.length > this.config.thresholds.todos.maxAllowed * 2) {
      alerts.push({
        level: 'warning',
        message: `TODO count very high: ${metrics.todos.length}`
      });
    }
    
    return alerts;
  }

  async cleanupOldReports() {
    try {
      const reportsDir = path.join(this.config.projectRoot, this.config.reports.outputDirectory);
      const files = await fs.readdir(reportsDir);
      
      const reportFiles = files
        .filter(f => f.includes('-20') && !f.includes('latest'))
        .map(f => ({
          name: f,
          path: path.join(reportsDir, f),
          timestamp: this.extractTimestamp(f)
        }))
        .filter(f => f.timestamp)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only the configured number of historical reports
      const toDelete = reportFiles.slice(this.config.reports.keepHistory * 3); // 3 files per report
      
      for (const file of toDelete) {
        await fs.unlink(file.path);
      }
      
      if (toDelete.length > 0) {
        console.log(`🗑️  Cleaned up ${toDelete.length} old report files`);
      }
    } catch (error) {
      console.warn('⚠️  Could not clean up old reports:', error.message);
    }
  }

  extractTimestamp(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
    if (match) {
      return new Date(match[1].replace(/T/, ' ').replace(/-/g, ':')).getTime();
    }
    return null;
  }

  async compare(file1, file2) {
    try {
      const metrics1 = JSON.parse(await fs.readFile(file1, 'utf8'));
      const metrics2 = JSON.parse(await fs.readFile(file2, 'utf8'));
      
      console.log('\n📊 Comparison Report\n');
      console.log(`File 1: ${path.basename(file1)}`);
      console.log(`File 2: ${path.basename(file2)}\n`);
      
      // Compare key metrics
      const m1 = metrics1.metrics || metrics1;
      const m2 = metrics2.metrics || metrics2;
      
      console.log('File Count:');
      console.log(`  Before: ${m1.files.totalCount}`);
      console.log(`  After: ${m2.files.totalCount}`);
      console.log(`  Change: ${m2.files.totalCount - m1.files.totalCount}\n`);
      
      console.log('Duplicates:');
      console.log(`  Before: ${m1.duplicates.length}`);
      console.log(`  After: ${m2.duplicates.length}`);
      console.log(`  Change: ${m2.duplicates.length - m1.duplicates.length}\n`);
      
      console.log('TODOs:');
      console.log(`  Before: ${m1.todos.length}`);
      console.log(`  After: ${m2.todos.length}`);
      console.log(`  Change: ${m2.todos.length - m1.todos.length}\n`);
      
      console.log('Average Complexity:');
      console.log(`  Before: ${m1.complexity.summary.avgComplexity.toFixed(2)}`);
      console.log(`  After: ${m2.complexity.summary.avgComplexity.toFixed(2)}`);
      console.log(`  Change: ${(m2.complexity.summary.avgComplexity - m1.complexity.summary.avgComplexity).toFixed(2)}`);
      
    } catch (error) {
      console.error('❌ Comparison failed:', error.message);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const monitor = new CodebaseMonitor();
  
  try {
    await monitor.init();
    
    switch (command) {
      case 'compare':
        if (args.length < 3) {
          console.error('Usage: codebase-monitor compare <file1> <file2>');
          process.exit(1);
        }
        await monitor.compare(args[1], args[2]);
        break;
        
      case 'help':
        console.log(`
Codebase Health Monitor

Usage:
  codebase-monitor              Run health check and generate reports
  codebase-monitor compare      Compare two metrics files
  codebase-monitor help         Show this help message

Configuration:
  Edit monitoring-config.json to customize thresholds and settings
        `);
        break;
        
      default:
        await monitor.run();
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = CodebaseMonitor;

// Run if called directly
if (require.main === module) {
  main();
}
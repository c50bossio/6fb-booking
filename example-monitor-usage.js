#!/usr/bin/env node

/**
 * Example of using the Codebase Monitor programmatically
 */

const CodebaseMonitor = require('./codebase-monitor');

async function runCustomMonitoring() {
  console.log('🎯 Running custom monitoring example...\n');

  // Create monitor instance
  const monitor = new CodebaseMonitor();

  try {
    // Initialize
    await monitor.init();

    // Run monitoring
    const { metrics, reports } = await monitor.run();

    // Access specific metrics
    console.log('\n📊 Custom Analysis:');
    console.log(`Total Files: ${metrics.files.totalCount}`);
    console.log(`Codebase Size: ${(metrics.files.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Duplicates Found: ${metrics.duplicates.length}`);
    console.log(`Average Complexity: ${metrics.complexity.summary.avgComplexity.toFixed(2)}`);
    console.log(`TODOs: ${metrics.todos.length}`);

    // Check specific conditions
    if (metrics.duplicates.length > 5) {
      console.log('\n⚠️  High number of duplicates detected!');
      console.log('Consider refactoring these components:');
      metrics.duplicates.slice(0, 5).forEach(dup => {
        if (dup.type === 'similar-name') {
          console.log(`  - ${dup.name} (${dup.files.length} instances)`);
        }
      });
    }

    // Find most complex files
    console.log('\n🧩 Most Complex Files:');
    metrics.complexity.files
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 5)
      .forEach(file => {
        console.log(`  - ${file.path}: complexity ${file.complexity}`);
      });

    // Check for specific TODOs
    const bugTodos = metrics.todos.filter(todo => todo.type === 'BUG');
    if (bugTodos.length > 0) {
      console.log(`\n🐛 Found ${bugTodos.length} BUG markers:`);
      bugTodos.slice(0, 3).forEach(bug => {
        console.log(`  - ${bug.file}:${bug.line} - ${bug.message}`);
      });
    }

    // Custom health score calculation
    const customScore = calculateCustomHealthScore(metrics);
    console.log(`\n🎯 Custom Health Score: ${customScore}%`);

  } catch (error) {
    console.error('❌ Monitoring failed:', error);
    process.exit(1);
  }
}

function calculateCustomHealthScore(metrics) {
  let score = 100;

  // Custom scoring logic
  score -= metrics.duplicates.length * 2;
  score -= Math.min(metrics.todos.length * 0.5, 20);
  score -= metrics.complexity.summary.filesOverThreshold * 0.5;

  // Bonus points for good practices
  if (metrics.testCoverage.frontend?.lines > 70) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Example: Monitor specific directories
async function monitorSpecificPaths() {
  console.log('\n🔍 Monitoring specific paths...\n');

  const HealthMetricsCollector = require('./health-metrics-collector');

  // Custom config for specific monitoring
  const customConfig = {
    projectRoot: './backend-v2/frontend-v2/src/components',
    thresholds: {
      complexity: {
        maxCyclomaticComplexity: 10
      }
    },
    ignore: {
      directories: ['__tests__', '.storybook'],
      files: ['*.test.js', '*.spec.ts']
    }
  };

  const collector = new HealthMetricsCollector(customConfig);
  const metrics = await collector.collect();

  console.log('Component Library Metrics:');
  console.log(`  Total Components: ${metrics.files.byType['.tsx'] || 0}`);
  console.log(`  Average Complexity: ${metrics.complexity.summary.avgComplexity.toFixed(2)}`);
  console.log(`  Duplicates: ${metrics.duplicates.length}`);
}

// Example: Generate custom report
async function generateCustomReport() {
  console.log('\n📄 Generating custom report...\n');

  const ReportGenerator = require('./report-generator');
  const fs = require('fs').promises;

  // Load latest metrics
  const metricsPath = './monitoring/reports/metrics-2025-06-28T02-53-10-757Z.json';
  const metricsData = JSON.parse(await fs.readFile(metricsPath, 'utf8'));

  // Custom report config
  const customConfig = {
    thresholds: {
      complexity: { maxCyclomaticComplexity: 10 },
      todos: { maxAllowed: 30 }
    },
    reports: {
      formats: ['markdown']
    }
  };

  const generator = new ReportGenerator(customConfig);
  const reports = await generator.generate(metricsData.metrics);

  // Save custom report
  await fs.writeFile('./custom-health-report.md', reports.markdown);
  console.log('✅ Custom report saved to: custom-health-report.md');
}

// Run examples
async function main() {
  await runCustomMonitoring();
  await monitorSpecificPaths();
  await generateCustomReport();
}

if (require.main === module) {
  main();
}

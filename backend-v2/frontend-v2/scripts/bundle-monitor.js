/**
 * Bundle Size Monitoring Script
 * Tracks bundle sizes and alerts on significant increases
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUNDLE_SIZE_THRESHOLD = 50 * 1024; // 50KB threshold for alerts
const INCREASE_THRESHOLD = 0.1; // 10% increase threshold

/**
 * Get directory size in bytes
 */
function getDirSize(dirPath) {
  try {
    // Use -k for macOS compatibility (1K blocks), multiply by 1024 for bytes
    const result = execSync(`du -sk "${dirPath}"`, { encoding: 'utf8' });
    return parseInt(result.split('\t')[0]) * 1024;
  } catch (error) {
    return 0;
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Analyze bundle composition
 */
function analyzeBundles() {
  const nextDir = '.next';
  const staticDir = path.join(nextDir, 'static', 'chunks');
  const appDir = path.join(staticDir, 'app');
  
  if (!fs.existsSync(staticDir)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  const analysis = {
    timestamp: new Date().toISOString(),
    total: getDirSize(nextDir),
    static: getDirSize(staticDir),
    app: getDirSize(appDir),
    chunks: {},
    largestChunks: [],
    warnings: []
  };

  // Analyze app directory chunks
  if (fs.existsSync(appDir)) {
    const appChunks = fs.readdirSync(appDir, { withFileTypes: true });
    
    appChunks.forEach(chunk => {
      const chunkPath = path.join(appDir, chunk.name);
      const size = chunk.isDirectory() ? getDirSize(chunkPath) : getFileSize(chunkPath);
      
      analysis.chunks[chunk.name] = {
        size,
        type: chunk.isDirectory() ? 'directory' : 'file',
        path: chunkPath
      };

      // Check for large chunks
      if (size > BUNDLE_SIZE_THRESHOLD) {
        analysis.warnings.push({
          type: 'large_chunk',
          message: `Large chunk detected: ${chunk.name} (${formatBytes(size)})`,
          size,
          path: chunkPath
        });
      }
    });

    // Sort chunks by size
    analysis.largestChunks = Object.entries(analysis.chunks)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);
  }

  return analysis;
}

/**
 * Compare with previous analysis
 */
function compareWithPrevious(current) {
  const historyFile = 'bundle-size-history.json';
  let history = [];
  
  if (fs.existsSync(historyFile)) {
    try {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Could not read bundle history file');
    }
  }

  if (history.length > 0) {
    const previous = history[history.length - 1];
    const totalIncrease = (current.total - previous.total) / previous.total;
    const appIncrease = (current.app - previous.app) / previous.app;

    if (Math.abs(totalIncrease) > INCREASE_THRESHOLD) {
      const direction = totalIncrease > 0 ? 'increased' : 'decreased';
      current.warnings.push({
        type: 'size_change',
        message: `Total bundle size ${direction} by ${Math.abs(totalIncrease * 100).toFixed(1)}%`,
        change: totalIncrease,
        previous: previous.total,
        current: current.total
      });
    }

    if (Math.abs(appIncrease) > INCREASE_THRESHOLD) {
      const direction = appIncrease > 0 ? 'increased' : 'decreased';
      current.warnings.push({
        type: 'size_change',
        message: `App bundle size ${direction} by ${Math.abs(appIncrease * 100).toFixed(1)}%`,
        change: appIncrease,
        previous: previous.app,
        current: current.app
      });
    }
  }

  // Add to history and keep last 10 entries
  history.push(current);
  history = history.slice(-10);
  
  try {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  } catch (error) {
    console.warn('⚠️  Could not write bundle history file');
  }

  return current;
}

/**
 * Generate report
 */
function generateReport(analysis) {
  console.log('\n📊 Bundle Size Analysis Report');
  console.log('================================');
  console.log(`🕐 Generated: ${new Date(analysis.timestamp).toLocaleString()}`);
  console.log(`📦 Total Build Size: ${formatBytes(analysis.total)}`);
  console.log(`📱 App Bundle Size: ${formatBytes(analysis.app)}`);
  console.log(`🔧 Static Assets: ${formatBytes(analysis.static - analysis.app)}`);

  if (analysis.largestChunks.length > 0) {
    console.log('\n🔍 Largest App Chunks:');
    analysis.largestChunks.forEach((chunk, index) => {
      const icon = chunk.type === 'directory' ? '📁' : '📄';
      console.log(`  ${index + 1}. ${icon} ${chunk.name}: ${formatBytes(chunk.size)}`);
    });
  }

  if (analysis.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    analysis.warnings.forEach(warning => {
      console.log(`  • ${warning.message}`);
    });
  } else {
    console.log('\n✅ No bundle size warnings');
  }

  // Performance recommendations
  console.log('\n💡 Optimization Recommendations:');
  const largeChunks = analysis.largestChunks.filter(chunk => chunk.size > BUNDLE_SIZE_THRESHOLD);
  
  if (largeChunks.length > 0) {
    console.log('  • Consider code splitting for large chunks:');
    largeChunks.slice(0, 3).forEach(chunk => {
      console.log(`    - ${chunk.name} (${formatBytes(chunk.size)})`);
    });
  }

  if (analysis.app > 2 * 1024 * 1024) { // 2MB
    console.log('  • App bundle is large (>2MB). Consider:');
    console.log('    - Dynamic imports for heavy components');
    console.log('    - Route-based code splitting');
    console.log('    - Removing unused dependencies');
  }

  console.log('  • Use "npm run build:analyze" to analyze bundle composition');
  console.log('  • Monitor bundle size changes in CI/CD pipeline');
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing bundle sizes...');
  
  const analysis = analyzeBundles();
  const finalAnalysis = compareWithPrevious(analysis);
  
  generateReport(finalAnalysis);

  // Exit with error code if there are warnings (for CI/CD)
  if (process.env.CI && finalAnalysis.warnings.length > 0) {
    console.log('\n❌ Bundle size warnings detected in CI environment');
    process.exit(1);
  }

  console.log('\n✅ Bundle analysis complete\n');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeBundles, compareWithPrevious, generateReport };
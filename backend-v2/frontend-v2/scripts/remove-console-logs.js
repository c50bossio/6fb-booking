#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Directories to clean
const PRODUCTION_DIRS = [
  'app/**/*.{ts,tsx,js,jsx}',
  'components/**/*.{ts,tsx,js,jsx}',
  'lib/**/*.{ts,tsx,js,jsx}',
  'hooks/**/*.{ts,tsx,js,jsx}'
];

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  '**/*.test.*',
  '**/*.spec.*',
  '**/test/**',
  '**/__tests__/**',
  '**/*.md',
  '**/debug-*',
  '**/scripts/**'
];

// Pattern to match console.log statements
const CONSOLE_LOG_PATTERN = /console\.(log|debug|info|warn|error)\s*\([^)]*\);?\s*\n?/g;
const MULTILINE_CONSOLE_PATTERN = /console\.(log|debug|info|warn|error)\s*\([^)]*\n[^)]*\);?\s*\n?/g;

let totalRemoved = 0;
let filesProcessed = 0;

function removeConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalLength = content.length;
    
    // Remove single-line console statements
    content = content.replace(CONSOLE_LOG_PATTERN, '');
    
    // Remove multi-line console statements
    content = content.replace(MULTILINE_CONSOLE_PATTERN, '');
    
    // Clean up any double empty lines left behind
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content.length !== originalLength) {
      fs.writeFileSync(filePath, content);
      const removed = (originalLength - content.length);
      totalRemoved += removed;
      filesProcessed++;
      console.log(`✅ Cleaned ${filePath} (removed ~${removed} chars)`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🧹 Starting console.log cleanup...\n');
  
  let allFiles = [];
  
  // Collect all files from production directories
  for (const pattern of PRODUCTION_DIRS) {
    const files = glob.sync(pattern, {
      ignore: EXCLUDE_PATTERNS,
      nodir: true
    });
    allFiles = allFiles.concat(files);
  }
  
  // Remove duplicates
  allFiles = [...new Set(allFiles)];
  
  console.log(`📁 Found ${allFiles.length} production files to process\n`);
  
  // Process each file
  for (const file of allFiles) {
    removeConsoleLogs(file);
  }
  
  console.log('\n✨ Cleanup complete!');
  console.log(`📊 Processed ${filesProcessed} files`);
  console.log(`🗑️  Removed approximately ${totalRemoved} characters of console statements`);
  
  // Remind to run tests
  console.log('\n⚠️  Remember to:');
  console.log('   1. Review the changes with: git diff');
  console.log('   2. Run tests to ensure nothing broke');
  console.log('   3. Commit the changes');
}

// Check if glob is installed
try {
  require.resolve('glob');
  main();
} catch (e) {
  console.log('📦 Installing required dependency: glob');
  const { execSync } = require('child_process');
  execSync('npm install glob', { stdio: 'inherit' });
  console.log('✅ Dependency installed. Please run the script again.');
}
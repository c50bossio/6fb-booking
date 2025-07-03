#!/usr/bin/env node

/**
 * Port Availability Checker
 * 
 * Checks port availability and identifies conflicts
 * Usage: npm run env:check
 */

const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.bold.blue('\n🔍 Port Availability Check\n'));

// Define expected ports and their purposes
const portConfig = [
  { 
    port: 3000, 
    name: 'Development Frontend', 
    service: 'Next.js Dev Server',
    color: chalk.green,
    expected: true
  },
  { 
    port: 3001, 
    name: 'Staging Frontend', 
    service: 'Next.js Staging Server',
    color: chalk.yellow,
    expected: false
  },
  { 
    port: 8000, 
    name: 'Development Backend', 
    service: 'FastAPI Dev Server',
    color: chalk.green,
    expected: true
  },
  { 
    port: 8001, 
    name: 'Staging Backend', 
    service: 'FastAPI Staging Server',
    color: chalk.yellow,
    expected: false
  },
  { 
    port: 6379, 
    name: 'Redis Server', 
    service: 'Redis Cache',
    color: chalk.blue,
    expected: false
  },
  { 
    port: 5432, 
    name: 'PostgreSQL', 
    service: 'Database Server',
    color: chalk.blue,
    expected: false
  }
];

// Check each port
console.log('📊 Port Status:');
console.log('┌──────┬─────────────────────────┬─────────────┬────────────────────────┬─────────┐');
console.log('│ Port │ Service                 │ Status      │ Process                │ PID     │');
console.log('├──────┼─────────────────────────┼─────────────┼────────────────────────┼─────────┤');

let conflicts = [];
let recommendations = [];

portConfig.forEach(({ port, name, service, color, expected }) => {
  try {
    const result = execSync(`lsof -i :${port}`, { encoding: 'utf8', stdio: 'pipe' });
    
    if (result.trim()) {
      const lines = result.trim().split('\n');
      const processInfo = lines[1] ? lines[1].split(/\s+/) : ['', '', ''];
      const processName = processInfo[0] || 'Unknown';
      const pid = processInfo[1] || 'Unknown';
      
      const status = expected ? chalk.green('RUNNING') : chalk.yellow('RUNNING');
      const servicePadded = name.padEnd(23);
      const processPadded = processName.padEnd(22);
      const pidPadded = pid.padEnd(7);
      
      console.log(`│ ${port.toString().padEnd(4)} │ ${servicePadded} │ ${status}   │ ${processPadded} │ ${pidPadded} │`);
      
      // Check for conflicts (unexpected processes)
      if (!expected && !['node', 'next-server', 'uvicorn', 'python'].some(exp => processName.toLowerCase().includes(exp.toLowerCase()))) {
        conflicts.push({ port, name, process: processName, pid });
      }
    } else {
      const status = expected ? chalk.red('STOPPED') : chalk.gray('AVAILABLE');
      const servicePadded = name.padEnd(23);
      
      console.log(`│ ${port.toString().padEnd(4)} │ ${servicePadded} │ ${status}    │ ${'-'.padEnd(22)} │ ${'-'.padEnd(7)} │`);
      
      if (expected) {
        recommendations.push(`Start ${name}: port ${port} should be running`);
      }
    }
  } catch (error) {
    const status = expected ? chalk.red('STOPPED') : chalk.gray('AVAILABLE');
    const servicePadded = name.padEnd(23);
    
    console.log(`│ ${port.toString().padEnd(4)} │ ${servicePadded} │ ${status}    │ ${'-'.padEnd(22)} │ ${'-'.padEnd(7)} │`);
    
    if (expected) {
      recommendations.push(`Start ${name}: port ${port} should be running`);
    }
  }
});

console.log('└──────┴─────────────────────────┴─────────────┴────────────────────────┴─────────┘');

// Show conflicts
if (conflicts.length > 0) {
  console.log(chalk.bold.red('\n⚠️  Port Conflicts Detected:'));
  conflicts.forEach(({ port, name, process, pid }) => {
    console.log(`  ${chalk.red('●')} Port ${port} (${name}) occupied by unexpected process: ${process} (PID: ${pid})`);
    console.log(`    ${chalk.yellow('Fix:')} Kill process with: ${chalk.cyan(`kill ${pid}`)}`);
  });
}

// Show recommendations
if (recommendations.length > 0) {
  console.log(chalk.bold.yellow('\n💡 Recommendations:'));
  recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec}`);
  });
}

// Port usage guide
console.log(chalk.bold('\n📋 Port Usage Guide:'));
console.log(`  ${chalk.green('3000')} - Development frontend (npm run dev)`);
console.log(`  ${chalk.yellow('3001')} - Staging frontend (npm run staging)`);
console.log(`  ${chalk.green('8000')} - Development backend (uvicorn main:app --reload)`);
console.log(`  ${chalk.yellow('8001')} - Staging backend (uvicorn main:app --reload --port 8001 --env-file .env.staging)`);
console.log(`  ${chalk.blue('6379')} - Redis server (redis-server)`);
console.log(`  ${chalk.blue('5432')} - PostgreSQL (psql)`);

// Quick commands
console.log(chalk.bold('\n⚡ Quick Commands:'));
console.log(`  ${chalk.cyan('npm run ports')}      - Show detailed port usage`);
console.log(`  ${chalk.cyan('npm run kill:staging')} - Kill staging processes (ports 3001, 8001)`);
console.log(`  ${chalk.cyan('lsof -i :<port>')}    - Check specific port usage`);
console.log(`  ${chalk.cyan('kill <pid>')}         - Kill specific process`);

// Environment status
console.log(chalk.bold('\n🌍 Environment Status:'));
try {
  const devFrontend = execSync('lsof -i :3000', { encoding: 'utf8', stdio: 'pipe' });
  const devBackend = execSync('lsof -i :8000', { encoding: 'utf8', stdio: 'pipe' });
  const stagingFrontend = execSync('lsof -i :3001', { encoding: 'utf8', stdio: 'pipe' });
  const stagingBackend = execSync('lsof -i :8001', { encoding: 'utf8', stdio: 'pipe' });
  
  const devRunning = devFrontend.trim() && devBackend.trim();
  const stagingRunning = stagingFrontend.trim() && stagingBackend.trim();
  
  console.log(`  ${chalk.green('Development:')} ${devRunning ? chalk.green('RUNNING') : chalk.gray('STOPPED')} (ports 3000, 8000)`);
  console.log(`  ${chalk.yellow('Staging:')}     ${stagingRunning ? chalk.yellow('RUNNING') : chalk.gray('STOPPED')} (ports 3001, 8001)`);
  
  if (devRunning && stagingRunning) {
    console.log(`  ${chalk.blue('●')} Both environments running in parallel ${chalk.green('✓')}`);
  } else if (devRunning) {
    console.log(`  ${chalk.blue('●')} Development only ${chalk.yellow('(staging available)')}`);
  } else if (stagingRunning) {
    console.log(`  ${chalk.blue('●')} Staging only ${chalk.yellow('(development available)')}`);
  } else {
    console.log(`  ${chalk.blue('●')} No environments running ${chalk.gray('(both available)')}`);
  }
} catch (error) {
  console.log(`  ${chalk.gray('○')} Unable to determine environment status`);
}

console.log('\n' + chalk.bold.green('✅ Port check complete!'));
console.log(chalk.dim('💡 Run this script anytime with: npm run env:check\n'));
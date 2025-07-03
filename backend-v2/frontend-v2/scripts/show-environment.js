#!/usr/bin/env node

/**
 * Environment Status Display Script
 * 
 * Shows current environment status and running processes
 * Usage: npm run env
 */

const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.bold.blue('\n🌍 BookedBarber V2 - Environment Status\n'));

// Environment configuration
const environments = {
  development: {
    name: 'Development',
    frontend: 'localhost:3000',
    backend: 'localhost:8000',
    database: '6fb_booking.db',
    redis: 'Database 0',
    purpose: 'Daily development work'
  },
  staging: {
    name: 'Staging (Local)',
    frontend: 'localhost:3001', 
    backend: 'localhost:8001',
    database: 'staging_6fb_booking.db',
    redis: 'Database 1',
    purpose: 'Testing & validation'
  },
  cloud: {
    name: 'Staging (Cloud)',
    frontend: 'staging.bookedbarber.com',
    backend: 'api-staging.bookedbarber.com', 
    database: 'PostgreSQL staging',
    redis: 'ElastiCache staging',
    purpose: 'Team demos & collaboration'
  },
  production: {
    name: 'Production',
    frontend: 'bookedbarber.com',
    backend: 'api.bookedbarber.com',
    database: 'PostgreSQL production',
    redis: 'ElastiCache production', 
    purpose: 'Live customer environment'
  }
};

// Display environment table
console.log(chalk.bold('📋 Environment Overview:'));
console.log('┌─────────────────────┬─────────────────────────┬─────────────────────────┬──────────────────────────┐');
console.log('│ Environment         │ Frontend                │ Backend                 │ Purpose                  │');
console.log('├─────────────────────┼─────────────────────────┼─────────────────────────┼──────────────────────────┤');

Object.entries(environments).forEach(([key, env]) => {
  const envName = env.name.padEnd(19);
  const frontend = env.frontend.padEnd(23);
  const backend = env.backend.padEnd(23);
  const purpose = env.purpose.padEnd(24);
  
  let color = chalk.white;
  if (key === 'development') color = chalk.green;
  if (key === 'staging') color = chalk.yellow;
  if (key === 'cloud') color = chalk.blue;
  if (key === 'production') color = chalk.red;
  
  console.log(`│ ${color(envName)} │ ${color(frontend)} │ ${color(backend)} │ ${purpose} │`);
});

console.log('└─────────────────────┴─────────────────────────┴─────────────────────────┴──────────────────────────┘');

// Check running processes
console.log(chalk.bold('\n🔍 Port Status:'));

const ports = [
  { port: 3000, name: 'Development Frontend', color: chalk.green },
  { port: 3001, name: 'Staging Frontend', color: chalk.yellow },
  { port: 8000, name: 'Development Backend', color: chalk.green },
  { port: 8001, name: 'Staging Backend', color: chalk.yellow }
];

ports.forEach(({ port, name, color }) => {
  try {
    const result = execSync(`lsof -i :${port}`, { encoding: 'utf8', stdio: 'pipe' });
    if (result.trim()) {
      const lines = result.trim().split('\n');
      const processInfo = lines[1] ? lines[1].split(/\s+/) : ['', '', ''];
      const process = processInfo[0] || 'Unknown';
      const pid = processInfo[1] || 'Unknown';
      
      console.log(`  ${color('●')} ${name} (${color(`:${port}`)}) - ${color('RUNNING')} (PID: ${pid}, Process: ${process})`);
    }
  } catch (error) {
    console.log(`  ${chalk.gray('○')} ${name} (${chalk.gray(`:${port}`)}) - ${chalk.gray('NOT RUNNING')}`);
  }
});

// Show quick commands
console.log(chalk.bold('\n⚡ Quick Commands:'));
console.log(`  ${chalk.cyan('npm run dev')}        - Start development (port 3000)`);
console.log(`  ${chalk.cyan('npm run staging')}    - Start staging (port 3001)`);
console.log(`  ${chalk.cyan('npm run ports')}      - Check all port usage`);
console.log(`  ${chalk.cyan('npm run kill:staging')} - Kill staging processes`);

// Show environment variables
console.log(chalk.bold('\n🔧 Current Environment Variables:'));
console.log(`  NODE_ENV: ${chalk.cyan(process.env.NODE_ENV || 'undefined')}`);
console.log(`  PORT: ${chalk.cyan(process.env.PORT || 'undefined')}`);
console.log(`  NEXT_PUBLIC_API_URL: ${chalk.cyan(process.env.NEXT_PUBLIC_API_URL || 'undefined')}`);

// Show helpful URLs
console.log(chalk.bold('\n🌐 Quick Access URLs:'));
console.log(`  ${chalk.green('Development Frontend:')} http://localhost:3000`);
console.log(`  ${chalk.green('Development Backend:')}  http://localhost:8000`);
console.log(`  ${chalk.green('Development API Docs:')} http://localhost:8000/docs`);
console.log(`  ${chalk.yellow('Staging Frontend:')}     http://localhost:3001`);
console.log(`  ${chalk.yellow('Staging Backend:')}      http://localhost:8001`);
console.log(`  ${chalk.yellow('Staging API Docs:')}     http://localhost:8001/docs`);

// Check Docker containers
console.log(chalk.bold('\n🐳 Docker Containers:'));
try {
  const dockerResult = execSync('docker-compose -f docker-compose.staging.yml ps', { 
    encoding: 'utf8', 
    stdio: 'pipe',
    cwd: process.cwd().replace('/frontend-v2/scripts', '').replace('/frontend-v2', '')
  });
  
  if (dockerResult.includes('Up')) {
    console.log(`  ${chalk.green('●')} Staging containers are ${chalk.green('RUNNING')}`);
    console.log('    Use: docker-compose -f docker-compose.staging.yml ps');
  } else {
    console.log(`  ${chalk.gray('○')} Staging containers are ${chalk.gray('NOT RUNNING')}`);
    console.log('    Start: docker-compose -f docker-compose.staging.yml up -d');
  }
} catch (error) {
  console.log(`  ${chalk.gray('○')} Docker Compose not available or staging not configured`);
}

console.log('\n' + chalk.bold.green('✅ Environment status check complete!'));
console.log(chalk.dim('💡 Run this script anytime with: npm run env\n'));
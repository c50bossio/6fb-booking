#!/usr/bin/env node
/**
 * Health Check Script for BookedBarber Development Environment
 * Monitors the health of all services and reports issues
 */

const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Service configuration
const services = [
  {
    name: 'Frontend (Next.js)',
    url: 'http://localhost:3000',
    port: 3000,
    critical: true
  },
  {
    name: 'Backend (FastAPI)',
    url: 'http://localhost:8000/docs',
    port: 8000,
    critical: true
  },
  {
    name: 'Redis',
    port: 6379,
    command: 'redis-cli ping',
    expectedOutput: 'PONG',
    critical: true
  }
];

// Check HTTP service
async function checkHttpService(service) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: service.port,
      path: service.url ? new URL(service.url).pathname : '/',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve({
        ...service,
        status: 'up',
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime
      });
    });

    const startTime = Date.now();

    req.on('error', () => {
      resolve({
        ...service,
        status: 'down',
        error: 'Connection failed'
      });
    });

    req.on('timeout', () => {
      resolve({
        ...service,
        status: 'down',
        error: 'Timeout'
      });
    });

    req.end();
  });
}

// Check command-based service
async function checkCommandService(service) {
  try {
    const { stdout } = await execPromise(service.command);
    const success = stdout.trim() === service.expectedOutput;
    
    return {
      ...service,
      status: success ? 'up' : 'down',
      output: stdout.trim()
    };
  } catch (error) {
    return {
      ...service,
      status: 'down',
      error: error.message
    };
  }
}

// Check system resources
async function checkSystemResources() {
  const resources = {};

  try {
    // Check memory usage
    if (process.platform === 'darwin') {
      const { stdout: vmStat } = await execPromise('vm_stat');
      const lines = vmStat.split('\n');
      const pageSize = parseInt(lines[0].match(/\d+/)[0]);
      
      const stats = {};
      lines.slice(1).forEach(line => {
        const match = line.match(/(.+?):\s+(\d+)/);
        if (match) {
          stats[match[1]] = parseInt(match[2]) * pageSize / 1024 / 1024 / 1024; // GB
        }
      });

      resources.memory = {
        free: stats['Pages free'] || 0,
        active: stats['Pages active'] || 0,
        inactive: stats['Pages inactive'] || 0,
        wired: stats['Pages wired down'] || 0
      };
    } else {
      const { stdout: memInfo } = await execPromise('free -m');
      const memLine = memInfo.split('\n')[1].split(/\s+/);
      resources.memory = {
        total: parseInt(memLine[1]),
        used: parseInt(memLine[2]),
        free: parseInt(memLine[3])
      };
    }

    // Check CPU usage
    const { stdout: cpuInfo } = await execPromise('ps aux | awk \'{print $3}\' | tail -n +2 | awk \'{s+=$1} END {print s}\'');
    resources.cpu = parseFloat(cpuInfo.trim());

    // Check disk usage
    const { stdout: diskInfo } = await execPromise('df -h / | tail -1');
    const diskParts = diskInfo.trim().split(/\s+/);
    resources.disk = {
      used: diskParts[4],
      available: diskParts[3]
    };

  } catch (error) {
    console.error('Error checking system resources:', error);
  }

  return resources;
}

// Check port usage
async function checkPort(port) {
  try {
    const { stdout } = await execPromise(`lsof -i :${port} | grep LISTEN | head -1`);
    if (stdout) {
      const parts = stdout.trim().split(/\s+/);
      return {
        inUse: true,
        process: parts[0],
        pid: parts[1]
      };
    }
    return { inUse: false };
  } catch {
    return { inUse: false };
  }
}

// Main health check function
async function runHealthCheck() {
  console.clear();
  console.log(`${colors.blue}🏥 BookedBarber Health Check${colors.reset}`);
  console.log('=' .repeat(50));
  console.log(`Time: ${new Date().toLocaleString()}\n`);

  // Check services
  console.log(`${colors.magenta}📡 Service Status:${colors.reset}`);
  const results = [];
  let allHealthy = true;

  for (const service of services) {
    let result;
    if (service.command) {
      result = await checkCommandService(service);
    } else {
      result = await checkHttpService(service);
    }

    results.push(result);

    const statusIcon = result.status === 'up' ? '✅' : '❌';
    const statusColor = result.status === 'up' ? colors.green : colors.red;
    
    console.log(`${statusIcon} ${service.name}: ${statusColor}${result.status.toUpperCase()}${colors.reset}`);
    
    if (result.responseTime) {
      console.log(`   Response time: ${result.responseTime}ms`);
    }
    if (result.error) {
      console.log(`   ${colors.red}Error: ${result.error}${colors.reset}`);
    }

    if (result.status === 'down' && service.critical) {
      allHealthy = false;
    }
  }

  // Check system resources
  console.log(`\n${colors.magenta}💻 System Resources:${colors.reset}`);
  const resources = await checkSystemResources();
  
  if (resources.memory) {
    if (process.platform === 'darwin') {
      const total = resources.memory.free + resources.memory.active + resources.memory.inactive + resources.memory.wired;
      const usedPercent = ((resources.memory.active + resources.memory.wired) / total * 100).toFixed(1);
      console.log(`Memory: ${usedPercent}% used`);
    } else {
      const usedPercent = (resources.memory.used / resources.memory.total * 100).toFixed(1);
      console.log(`Memory: ${usedPercent}% used (${resources.memory.used}MB / ${resources.memory.total}MB)`);
    }
  }
  
  if (resources.cpu !== undefined) {
    const cpuColor = resources.cpu > 80 ? colors.red : resources.cpu > 50 ? colors.yellow : colors.green;
    console.log(`CPU: ${cpuColor}${resources.cpu.toFixed(1)}%${colors.reset}`);
  }
  
  if (resources.disk) {
    console.log(`Disk: ${resources.disk.used} used`);
  }

  // Check ports
  console.log(`\n${colors.magenta}🔌 Port Status:${colors.reset}`);
  const ports = [3000, 3001, 8000, 8001, 6379];
  
  for (const port of ports) {
    const portInfo = await checkPort(port);
    if (portInfo.inUse) {
      console.log(`Port ${port}: ${colors.green}In use${colors.reset} by ${portInfo.process} (PID: ${portInfo.pid})`);
    } else {
      console.log(`Port ${port}: ${colors.yellow}Available${colors.reset}`);
    }
  }

  // Overall status
  console.log(`\n${colors.magenta}📊 Overall Status:${colors.reset}`);
  if (allHealthy) {
    console.log(`${colors.green}✅ All systems operational!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Some services are down. Run 'npm run dev:clean' to restart.${colors.reset}`);
  }

  // Recommendations
  if (!allHealthy) {
    console.log(`\n${colors.yellow}💡 Recommendations:${colors.reset}`);
    console.log('1. Run: npm run clean');
    console.log('2. Run: npm run dev');
    console.log('3. Check logs: npm run logs');
  }

  console.log('\n' + '=' .repeat(50));
  
  return allHealthy;
}

// Run health check
if (require.main === module) {
  runHealthCheck().then(healthy => {
    process.exit(healthy ? 0 : 1);
  });
}

module.exports = { runHealthCheck };
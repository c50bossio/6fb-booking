#!/usr/bin/env node

/**
 * Rollback Plan for 6FB Booking Frontend
 * Provides automated rollback capabilities for failed deployments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const config = {
  rollbackStrategies: {
    git: {
      name: 'Git Revert',
      description: 'Revert to previous Git commit',
      supported: ['render', 'vercel', 'railway'],
    },
    deployment: {
      name: 'Platform Rollback',
      description: 'Use platform-specific rollback features',
      supported: ['render', 'vercel'],
    },
    manual: {
      name: 'Manual Rollback',
      description: 'Manual steps to restore previous version',
      supported: ['all'],
    },
  },
  healthCheckRetries: 3,
  healthCheckDelay: 30000, // 30 seconds
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: `${colors.blue}ℹ️ `,
    success: `${colors.green}✅ `,
    warning: `${colors.yellow}⚠️  `,
    error: `${colors.red}❌ `,
    action: `${colors.magenta}🔧 `,
  }[type] || '';
  
  console.log(`[${timestamp}] ${prefix}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function executeCommand(command, options = {}) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question}${colors.reset} `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Rollback functions
async function detectDeploymentPlatform() {
  logSection('Detecting Deployment Platform');
  
  // Check for platform-specific files
  const platformChecks = [
    { file: 'render.yaml', platform: 'render' },
    { file: 'vercel.json', platform: 'vercel' },
    { file: 'railway.toml', platform: 'railway' },
    { file: 'netlify.toml', platform: 'netlify' },
  ];
  
  for (const check of platformChecks) {
    if (fs.existsSync(path.join(process.cwd(), check.file))) {
      log(`Detected platform: ${check.platform}`, 'success');
      return check.platform;
    }
  }
  
  // Check environment variables
  if (process.env.RENDER) {
    log('Detected platform: Render (from environment)', 'success');
    return 'render';
  }
  
  if (process.env.VERCEL) {
    log('Detected platform: Vercel (from environment)', 'success');
    return 'vercel';
  }
  
  log('Could not detect deployment platform', 'warning');
  return 'unknown';
}

async function createRollbackCheckpoint() {
  logSection('Creating Rollback Checkpoint');
  
  // Get current git info
  const gitStatus = executeCommand('git status --porcelain', { silent: true });
  if (gitStatus.output && gitStatus.output.trim()) {
    log('Uncommitted changes detected', 'warning');
    const proceed = await promptUser('Create checkpoint with uncommitted changes? (y/n)');
    if (proceed.toLowerCase() !== 'y') {
      return null;
    }
  }
  
  // Get current commit hash
  const currentCommit = executeCommand('git rev-parse HEAD', { silent: true });
  if (!currentCommit.success) {
    log('Failed to get current commit', 'error');
    return null;
  }
  
  const commitHash = currentCommit.output.trim();
  const branch = executeCommand('git branch --show-current', { silent: true });
  const branchName = branch.success ? branch.output.trim() : 'unknown';
  
  // Create checkpoint file
  const checkpoint = {
    timestamp: new Date().toISOString(),
    commit: commitHash,
    branch: branchName,
    platform: await detectDeploymentPlatform(),
    environment: {
      node: process.version,
      npm: executeCommand('npm -v', { silent: true }).output?.trim(),
    },
    buildInfo: {},
  };
  
  // Get build info if available
  if (fs.existsSync('.next')) {
    const buildId = path.join('.next', 'BUILD_ID');
    if (fs.existsSync(buildId)) {
      checkpoint.buildInfo.buildId = fs.readFileSync(buildId, 'utf8').trim();
    }
  }
  
  // Save checkpoint
  const checkpointPath = path.join(process.cwd(), '.rollback-checkpoint.json');
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  
  log(`Checkpoint created: ${checkpointPath}`, 'success');
  log(`Commit: ${commitHash.substring(0, 8)} on ${branchName}`, 'info');
  
  return checkpoint;
}

async function performGitRollback(checkpoint) {
  logSection('Git-based Rollback');
  
  if (!checkpoint || !checkpoint.commit) {
    log('No valid checkpoint found', 'error');
    return false;
  }
  
  log(`Rolling back to commit: ${checkpoint.commit.substring(0, 8)}`, 'action');
  
  // Check current branch
  const currentBranch = executeCommand('git branch --show-current', { silent: true });
  if (currentBranch.output.trim() !== checkpoint.branch) {
    log(`Switching to branch: ${checkpoint.branch}`, 'action');
    const checkout = executeCommand(`git checkout ${checkpoint.branch}`, { silent: true });
    if (!checkout.success) {
      log('Failed to switch branch', 'error');
      return false;
    }
  }
  
  // Create rollback branch
  const rollbackBranch = `rollback-${Date.now()}`;
  log(`Creating rollback branch: ${rollbackBranch}`, 'action');
  
  const createBranch = executeCommand(`git checkout -b ${rollbackBranch}`, { silent: true });
  if (!createBranch.success) {
    log('Failed to create rollback branch', 'error');
    return false;
  }
  
  // Revert to checkpoint commit
  log('Reverting to checkpoint commit...', 'action');
  const revert = executeCommand(`git reset --hard ${checkpoint.commit}`, { silent: true });
  
  if (!revert.success) {
    log('Failed to revert commit', 'error');
    return false;
  }
  
  log('Git rollback completed', 'success');
  log(`Current branch: ${rollbackBranch}`, 'info');
  log('Next steps:', 'info');
  log('1. Test the application locally', 'info');
  log('2. Push the rollback branch: git push origin ' + rollbackBranch, 'info');
  log('3. Deploy from the rollback branch', 'info');
  
  return true;
}

async function performRenderRollback() {
  logSection('Render Platform Rollback');
  
  log('Render rollback instructions:', 'info');
  console.log(`
${colors.cyan}Manual Steps:${colors.reset}
1. Log in to Render Dashboard: https://dashboard.render.com
2. Navigate to your service
3. Go to "Events" tab
4. Find the last successful deploy
5. Click "Rollback to this deploy"

${colors.cyan}CLI Steps (if render-cli is installed):${colors.reset}
1. Install Render CLI: npm install -g @render/cli
2. Login: render login
3. List services: render services list
4. Rollback: render deploy rollback <service-id> <deploy-id>
  `);
  
  const hasRenderCli = executeCommand('which render', { silent: true }).success;
  
  if (hasRenderCli) {
    const useCliPrompt = await promptUser('Use Render CLI for rollback? (y/n)');
    if (useCliPrompt.toLowerCase() === 'y') {
      log('Listing recent deploys...', 'action');
      executeCommand('render deploys list --limit 10');
      
      const deployId = await promptUser('Enter deploy ID to rollback to:');
      if (deployId) {
        log(`Rolling back to deploy: ${deployId}`, 'action');
        const rollback = executeCommand(`render deploy rollback ${deployId}`);
        
        if (rollback.success) {
          log('Rollback initiated', 'success');
          return true;
        } else {
          log('Rollback failed', 'error');
        }
      }
    }
  } else {
    log('Render CLI not installed', 'info');
    log('Install with: npm install -g @render/cli', 'info');
  }
  
  return false;
}

async function performVercelRollback() {
  logSection('Vercel Platform Rollback');
  
  log('Vercel rollback instructions:', 'info');
  console.log(`
${colors.cyan}Using Vercel CLI:${colors.reset}
1. Install Vercel CLI: npm install -g vercel
2. Login: vercel login
3. List deployments: vercel list
4. Rollback: vercel rollback <deployment-url>

${colors.cyan}Using Vercel Dashboard:${colors.reset}
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to "Deployments" tab
4. Find previous working deployment
5. Click "..." menu → "Promote to Production"
  `);
  
  const hasVercelCli = executeCommand('which vercel', { silent: true }).success;
  
  if (hasVercelCli) {
    const useCliPrompt = await promptUser('Use Vercel CLI for rollback? (y/n)');
    if (useCliPrompt.toLowerCase() === 'y') {
      log('Listing recent deployments...', 'action');
      executeCommand('vercel list --limit 10');
      
      const deployUrl = await promptUser('Enter deployment URL to rollback to:');
      if (deployUrl) {
        log(`Rolling back to: ${deployUrl}`, 'action');
        const rollback = executeCommand(`vercel rollback ${deployUrl}`);
        
        if (rollback.success) {
          log('Rollback completed', 'success');
          return true;
        } else {
          log('Rollback failed', 'error');
        }
      }
    }
  } else {
    log('Vercel CLI not installed', 'info');
    log('Install with: npm install -g vercel', 'info');
  }
  
  return false;
}

async function performHealthCheck(url) {
  log(`Checking health: ${url}`, 'info');
  
  // Use the health check monitor if available
  const healthCheckScript = path.join(process.cwd(), 'scripts', 'health-check-monitor.js');
  if (fs.existsSync(healthCheckScript)) {
    const check = executeCommand(`node ${healthCheckScript} ${url}`, { silent: true });
    return check.success;
  }
  
  // Simple HTTP check
  const https = require('https');
  const http = require('http');
  
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    client.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function createRollbackPlan() {
  logSection('Creating Rollback Plan');
  
  const platform = await detectDeploymentPlatform();
  const checkpoint = await createRollbackCheckpoint();
  
  const plan = {
    created: new Date().toISOString(),
    platform,
    checkpoint,
    strategies: [],
    healthChecks: [],
    contacts: [],
  };
  
  // Add platform-specific strategies
  if (platform === 'render') {
    plan.strategies.push({
      name: 'Render Platform Rollback',
      priority: 1,
      steps: [
        'Access Render Dashboard',
        'Navigate to Events tab',
        'Select previous successful deployment',
        'Click "Rollback to this deploy"',
      ],
      estimatedTime: '5 minutes',
    });
  } else if (platform === 'vercel') {
    plan.strategies.push({
      name: 'Vercel Instant Rollback',
      priority: 1,
      steps: [
        'Access Vercel Dashboard',
        'Go to Deployments tab',
        'Find previous production deployment',
        'Click "Promote to Production"',
      ],
      estimatedTime: '2 minutes',
    });
  }
  
  // Add git strategy
  plan.strategies.push({
    name: 'Git Revert Strategy',
    priority: 2,
    steps: [
      `git checkout -b rollback-${Date.now()}`,
      `git reset --hard ${checkpoint?.commit || 'PREVIOUS_COMMIT'}`,
      'git push origin rollback-branch',
      'Deploy from rollback branch',
    ],
    estimatedTime: '10-15 minutes',
  });
  
  // Add manual strategy
  plan.strategies.push({
    name: 'Manual Recovery',
    priority: 3,
    steps: [
      'Identify the issue in error logs',
      'Create hotfix branch',
      'Apply minimal fix',
      'Test locally',
      'Deploy hotfix',
    ],
    estimatedTime: '30-60 minutes',
  });
  
  // Add health checks
  plan.healthChecks = [
    { name: 'Homepage loads', endpoint: '/', critical: true },
    { name: 'API responds', endpoint: '/api/health', critical: true },
    { name: 'Authentication works', endpoint: '/login', critical: true },
    { name: 'Static assets load', endpoint: '/_next/static', critical: false },
  ];
  
  // Save plan
  const planPath = path.join(process.cwd(), 'rollback-plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  
  log(`Rollback plan saved to: ${planPath}`, 'success');
  
  // Generate markdown documentation
  const markdown = `# Rollback Plan for 6FB Booking Frontend

Generated: ${plan.created}
Platform: ${plan.platform}
${checkpoint ? `Last Checkpoint: ${checkpoint.commit.substring(0, 8)}` : 'No checkpoint available'}

## Quick Rollback Strategies

${plan.strategies.map((strategy, index) => `
### ${index + 1}. ${strategy.name} (Priority: ${strategy.priority})
**Estimated Time:** ${strategy.estimatedTime}

Steps:
${strategy.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}
`).join('\n')}

## Health Checks After Rollback

${plan.healthChecks.map(check => 
  `- [ ] ${check.name} (${check.endpoint}) ${check.critical ? '**CRITICAL**' : ''}`
).join('\n')}

## Emergency Contacts

- DevOps Lead: [Add contact]
- Platform Support: [Add contact]
- Team Chat: [Add channel]

## Post-Rollback Actions

1. **Notify Team**: Inform all stakeholders about the rollback
2. **Document Issue**: Create incident report with root cause
3. **Monitor Metrics**: Watch error rates and performance
4. **Plan Fix**: Schedule proper fix for the issue
5. **Update Tests**: Add tests to prevent recurrence

## Platform-Specific Notes

${platform === 'render' ? `
### Render
- Rollbacks are instant and don't require rebuilding
- Previous 10 deployments are kept by default
- Can rollback via dashboard or CLI
- Environment variables are preserved
` : ''}

${platform === 'vercel' ? `
### Vercel
- Instant rollbacks without rebuilding
- Unlimited deployment history
- Can promote any previous deployment
- Preview URLs remain accessible
` : ''}

## Command Reference

\`\`\`bash
# Create checkpoint before deployment
node scripts/rollback-plan.js --checkpoint

# Execute rollback
node scripts/rollback-plan.js --execute

# Verify rollback
node scripts/rollback-plan.js --verify <url>
\`\`\`
`;
  
  const mdPath = path.join(process.cwd(), 'ROLLBACK_PLAN.md');
  fs.writeFileSync(mdPath, markdown);
  log(`Rollback documentation saved to: ${mdPath}`, 'success');
  
  return plan;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log(`${colors.magenta}🔄 6FB Booking Frontend Rollback Manager${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
  
  if (!command || command === '--help') {
    console.log('Usage: node rollback-plan.js [command] [options]');
    console.log('\nCommands:');
    console.log('  --create        Create rollback plan and checkpoint');
    console.log('  --checkpoint    Create deployment checkpoint only');
    console.log('  --execute       Execute rollback procedure');
    console.log('  --verify <url>  Verify deployment health');
    console.log('  --help          Show this help message');
    process.exit(0);
  }
  
  switch (command) {
    case '--create':
      await createRollbackPlan();
      break;
      
    case '--checkpoint':
      const checkpoint = await createRollbackCheckpoint();
      if (checkpoint) {
        log('Checkpoint created successfully', 'success');
        log('Run deployment with confidence!', 'info');
      }
      break;
      
    case '--execute':
      logSection('Executing Rollback');
      
      // Load checkpoint
      const checkpointPath = path.join(process.cwd(), '.rollback-checkpoint.json');
      if (!fs.existsSync(checkpointPath)) {
        log('No rollback checkpoint found', 'error');
        log('Create one with: node rollback-plan.js --checkpoint', 'info');
        process.exit(1);
      }
      
      const savedCheckpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
      const platform = savedCheckpoint.platform || await detectDeploymentPlatform();
      
      log(`Platform: ${platform}`, 'info');
      log(`Checkpoint: ${savedCheckpoint.timestamp}`, 'info');
      
      // Choose rollback strategy
      console.log(`\n${colors.cyan}Choose rollback strategy:${colors.reset}`);
      console.log('1. Platform-specific rollback (recommended)');
      console.log('2. Git-based rollback');
      console.log('3. Manual instructions');
      
      const choice = await promptUser('Select option (1-3):');
      
      let success = false;
      switch (choice) {
        case '1':
          if (platform === 'render') {
            success = await performRenderRollback();
          } else if (platform === 'vercel') {
            success = await performVercelRollback();
          } else {
            log('Platform rollback not available', 'warning');
          }
          break;
          
        case '2':
          success = await performGitRollback(savedCheckpoint);
          break;
          
        case '3':
          const planPath = path.join(process.cwd(), 'ROLLBACK_PLAN.md');
          if (fs.existsSync(planPath)) {
            log(`Rollback instructions available in: ${planPath}`, 'info');
            executeCommand(`cat ${planPath}`);
          } else {
            log('No rollback plan found. Create one with: node rollback-plan.js --create', 'warning');
          }
          break;
          
        default:
          log('Invalid option', 'error');
      }
      
      if (success) {
        log('Rollback completed', 'success');
        log('Remember to verify the deployment and notify your team', 'info');
      }
      break;
      
    case '--verify':
      const url = args[1];
      if (!url) {
        log('URL required for verification', 'error');
        console.log('Usage: node rollback-plan.js --verify <url>');
        process.exit(1);
      }
      
      logSection('Verifying Deployment');
      
      let healthy = false;
      for (let i = 0; i < config.healthCheckRetries; i++) {
        log(`Health check attempt ${i + 1}/${config.healthCheckRetries}`, 'info');
        healthy = await performHealthCheck(url);
        
        if (healthy) {
          log('Deployment is healthy', 'success');
          break;
        } else if (i < config.healthCheckRetries - 1) {
          log(`Waiting ${config.healthCheckDelay / 1000}s before retry...`, 'info');
          await new Promise(resolve => setTimeout(resolve, config.healthCheckDelay));
        }
      }
      
      if (!healthy) {
        log('Deployment verification failed', 'error');
        log('Consider rolling back to previous version', 'warning');
        process.exit(1);
      }
      break;
      
    default:
      log(`Unknown command: ${command}`, 'error');
      console.log('Run with --help for usage information');
      process.exit(1);
  }
}

// Run the rollback manager
main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
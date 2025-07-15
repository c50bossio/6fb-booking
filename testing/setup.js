#!/usr/bin/env node

/**
 * Load Testing Suite Setup Script
 * Initializes the complete load testing environment for BookedBarber V2
 */

const fs = require('fs-extra');
const path = require('path');
const { exec, spawn } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const moment = require('moment');

class LoadTestSetup {
    constructor() {
        this.baseDir = __dirname;
        this.backendDir = path.join(__dirname, '../backend-v2');
        this.setupSteps = [
            {
                name: 'Environment Validation',
                description: 'Check system requirements and dependencies',
                function: this.validateEnvironment.bind(this)
            },
            {
                name: 'Dependencies Installation',
                description: 'Install Artillery.js and testing dependencies',
                function: this.installDependencies.bind(this)
            },
            {
                name: 'Directory Structure',
                description: 'Create required directories and files',
                function: this.createDirectories.bind(this)
            },
            {
                name: 'Backend Setup',
                description: 'Setup backend server for testing',
                function: this.setupBackend.bind(this)
            },
            {
                name: 'Database Setup',
                description: 'Initialize test database and sample data',
                function: this.setupDatabase.bind(this)
            },
            {
                name: 'Test Data Creation',
                description: 'Create test users and sample data',
                function: this.createTestData.bind(this)
            },
            {
                name: 'Configuration Files',
                description: 'Generate environment and config files',
                function: this.createConfigFiles.bind(this)
            },
            {
                name: 'Baseline Setup',
                description: 'Prepare performance baseline directory',
                function: this.setupBaseline.bind(this)
            },
            {
                name: 'System Validation',
                description: 'Validate complete setup',
                function: this.validateSetup.bind(this)
            }
        ];
    }

    async runSetup() {
        console.log(chalk.blue.bold('🚀 BookedBarber V2 Load Testing Suite Setup'));
        console.log(chalk.gray('Initializing comprehensive load testing environment\n'));

        const startTime = moment();
        let completedSteps = 0;

        try {
            for (const step of this.setupSteps) {
                console.log(chalk.yellow(`\n📋 Step ${completedSteps + 1}/${this.setupSteps.length}: ${step.name}`));
                console.log(chalk.gray(`Description: ${step.description}`));

                const spinner = ora(`Executing ${step.name}...`).start();

                try {
                    await step.function();
                    spinner.succeed(`${step.name} completed`);
                    completedSteps++;
                } catch (error) {
                    spinner.fail(`${step.name} failed`);
                    console.error(chalk.red(`❌ Error: ${error.message}`));
                    throw error;
                }
            }

            const duration = moment.duration(moment().diff(startTime));
            console.log(chalk.green.bold(`\n✅ Setup completed successfully in ${duration.humanize()}`));
            console.log(chalk.cyan('\n🎯 Next Steps:'));
            console.log(chalk.cyan('1. Run smoke tests: npm run test:smoke'));
            console.log(chalk.cyan('2. Start monitoring: npm run monitor:start'));
            console.log(chalk.cyan('3. Run full test suite: npm run test:all'));
            console.log(chalk.cyan('4. View dashboard: http://localhost:3001/dashboard'));

        } catch (error) {
            console.error(chalk.red.bold('\n❌ Setup failed'));
            console.error(chalk.red(`Completed ${completedSteps}/${this.setupSteps.length} steps`));
            process.exit(1);
        }
    }

    async validateEnvironment() {
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 18) {
            throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
        }

        // Check Python availability
        await this.executeCommand('python3 --version', 'Python 3 not found');

        // Check if ports are available
        await this.checkPortAvailability(8000, 'Backend port');
        await this.checkPortAvailability(3001, 'Monitoring port');
        await this.checkPortAvailability(8080, 'WebSocket port');

        // Check system resources
        const freeMemory = require('os').freemem();
        const totalMemory = require('os').totalmem();
        const memoryUsage = (totalMemory - freeMemory) / totalMemory;

        if (memoryUsage > 0.9) {
            console.log(chalk.yellow('⚠️  Warning: High memory usage detected. Load testing may be affected.'));
        }
    }

    async installDependencies() {
        // Install NPM dependencies
        await this.executeCommand('npm install', 'Failed to install NPM dependencies', { cwd: this.baseDir });

        // Install Artillery globally
        try {
            await this.executeCommand('npm list -g artillery', 'Checking Artillery installation');
        } catch (error) {
            console.log(chalk.blue('Installing Artillery globally...'));
            await this.executeCommand('npm install -g artillery@latest', 'Failed to install Artillery');
        }

        // Install backend dependencies if needed
        if (await fs.pathExists(path.join(this.backendDir, 'requirements.txt'))) {
            console.log(chalk.blue('Setting up Python virtual environment...'));
            
            const venvPath = path.join(this.backendDir, 'venv');
            if (!await fs.pathExists(venvPath)) {
                await this.executeCommand('python3 -m venv venv', 'Failed to create virtual environment', { cwd: this.backendDir });
            }
            
            await this.executeCommand('source venv/bin/activate && pip install -r requirements.txt', 'Failed to install Python dependencies', { 
                cwd: this.backendDir,
                shell: '/bin/bash'
            });
        }
    }

    async createDirectories() {
        const directories = [
            'reports',
            'reports/baseline',
            'reports/final',
            'reports/monitoring',
            'reports/regression',
            'reports/gradual-load',
            'reports/database-load',
            'reports/benchmarks',
            'data',
            'logs'
        ];

        for (const dir of directories) {
            const dirPath = path.join(this.baseDir, dir);
            await fs.ensureDir(dirPath);
            console.log(chalk.gray(`Created directory: ${dir}`));
        }

        // Create .gitkeep files for empty directories
        for (const dir of directories) {
            const gitkeepPath = path.join(this.baseDir, dir, '.gitkeep');
            if (!await fs.pathExists(gitkeepPath)) {
                await fs.writeFile(gitkeepPath, '# Keep this directory in git\n');
            }
        }
    }

    async setupBackend() {
        if (!await fs.pathExists(this.backendDir)) {
            console.log(chalk.yellow('⚠️  Backend directory not found, skipping backend setup'));
            return;
        }

        // Check if backend is already running
        try {
            const response = await this.makeHttpRequest('http://localhost:8000/health');
            if (response.status === 200) {
                console.log(chalk.green('✅ Backend is already running'));
                return;
            }
        } catch (error) {
            // Backend not running, continue with setup
        }

        // Create environment file for testing
        const envContent = `
# Load Testing Environment Configuration
ENVIRONMENT=testing
DATABASE_URL=sqlite:///./test_6fb_booking.db
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=load-testing-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Disable external services for testing
SENDGRID_API_KEY=test-key
STRIPE_SECRET_KEY=sk_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_key

# Logging configuration
LOG_LEVEL=INFO
`;

        await fs.writeFile(path.join(this.backendDir, '.env.testing'), envContent);
        console.log(chalk.gray('Created testing environment file'));
    }

    async setupDatabase() {
        if (!await fs.pathExists(this.backendDir)) {
            console.log(chalk.yellow('⚠️  Backend directory not found, skipping database setup'));
            return;
        }

        const dbPath = path.join(this.backendDir, 'test_6fb_booking.db');
        
        // Remove existing test database
        if (await fs.pathExists(dbPath)) {
            await fs.remove(dbPath);
            console.log(chalk.gray('Removed existing test database'));
        }

        // Run database migrations
        await this.executeCommand(
            'source venv/bin/activate && alembic upgrade head',
            'Failed to run database migrations',
            { 
                cwd: this.backendDir,
                shell: '/bin/bash',
                env: { ...process.env, DATABASE_URL: `sqlite:///${dbPath}` }
            }
        );

        console.log(chalk.gray('Database migrations completed'));
    }

    async createTestData() {
        // Create test data setup script
        const testDataScript = `#!/usr/bin/env python3
"""
Test Data Setup for Load Testing
Creates sample users, barbers, services, and appointments
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from database import engine, Base
from models import User, Barber, Service, Appointment
from utils.auth import hash_password
import datetime

def create_test_data():
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Create test client
        client = User(
            email="client.test@example.com",
            password_hash=hash_password("ClientTest123!"),
            first_name="Test",
            last_name="Client",
            role="client",
            is_active=True
        )
        session.add(client)
        session.flush()
        
        # Create test barber user
        barber_user = User(
            email="barber.test@example.com",
            password_hash=hash_password("BarberTest123!"),
            first_name="Test",
            last_name="Barber",
            role="barber",
            is_active=True
        )
        session.add(barber_user)
        session.flush()
        
        # Create barber profile
        barber = Barber(
            user_id=barber_user.id,
            name="Test Barber",
            description="Load testing barber",
            is_active=True
        )
        session.add(barber)
        session.flush()
        
        # Create test service
        service = Service(
            barber_id=barber.id,
            name="Standard Haircut",
            description="Load testing service",
            price=2500,  # $25.00
            duration=30,
            is_active=True
        )
        session.add(service)
        
        # Create additional test users for load testing
        for i in range(10):
            user = User(
                email=f"loadtest{i}@example.com",
                password_hash=hash_password("LoadTest123!"),
                first_name=f"Load{i}",
                last_name="Test",
                role="client",
                is_active=True
            )
            session.add(user)
        
        session.commit()
        print("✅ Test data created successfully")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Failed to create test data: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    create_test_data()
`;

        const scriptPath = path.join(this.baseDir, 'scripts/setup-test-data.py');
        await fs.writeFile(scriptPath, testDataScript);
        await fs.chmod(scriptPath, '755');

        // Run test data creation
        if (await fs.pathExists(this.backendDir)) {
            try {
                await this.executeCommand(
                    'source venv/bin/activate && python ../testing/scripts/setup-test-data.py',
                    'Failed to create test data',
                    { 
                        cwd: this.backendDir,
                        shell: '/bin/bash'
                    }
                );
            } catch (error) {
                console.log(chalk.yellow('⚠️  Could not create test data automatically'));
                console.log(chalk.gray('Manual test data creation may be required'));
            }
        }
    }

    async createConfigFiles() {
        // Create npm scripts configuration
        const packageJsonPath = path.join(this.baseDir, 'package.json');
        const packageJson = await fs.readJson(packageJsonPath);

        // Ensure all scripts are present
        const requiredScripts = {
            "setup": "node setup.js",
            "test:smoke": "artillery run artillery-configs/smoke-test.yml",
            "test:load": "artillery run artillery-configs/load-test-comprehensive.yml",
            "test:stress": "artillery run artillery-configs/stress-test.yml",
            "test:api": "artillery run artillery-configs/api-endpoints.yml",
            "test:booking": "artillery run artillery-configs/booking-flow.yml",
            "test:payment": "artillery run artillery-configs/payment-flow.yml",
            "test:calendar": "artillery run artillery-configs/calendar-sync.yml",
            "test:database": "node scripts/database-load-test.js",
            "test:gradual": "node scripts/gradual-load-test.js",
            "test:performance": "node scripts/performance-benchmarks.js",
            "test:regression": "node scripts/regression-test.js",
            "test:all": "node scripts/run-all-tests.js",
            "monitor:start": "node scripts/monitoring-collector.js",
            "monitor:dashboard": "open http://localhost:3001/dashboard",
            "report:generate": "node scripts/generate-reports.js",
            "validate:system": "node scripts/system-validation.js"
        };

        packageJson.scripts = { ...packageJson.scripts, ...requiredScripts };
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

        // Create environment validation script
        const envValidationScript = `#!/usr/bin/env node
const chalk = require('chalk');

console.log(chalk.blue('🔍 System Validation'));

// Check Artillery
try {
    require('child_process').execSync('artillery --version', { stdio: 'pipe' });
    console.log(chalk.green('✅ Artillery: Available'));
} catch (error) {
    console.log(chalk.red('❌ Artillery: Not available'));
}

// Check ports
const net = require('net');
const ports = [8000, 3001, 8080];

ports.forEach(port => {
    const server = net.createServer();
    server.listen(port, () => {
        console.log(chalk.green(\`✅ Port \${port}: Available\`));
        server.close();
    });
    server.on('error', () => {
        console.log(chalk.red(\`❌ Port \${port}: In use\`));
    });
});

console.log(chalk.blue('\\n🚀 Run npm run test:smoke to start testing'));
`;

        await fs.writeFile(path.join(this.baseDir, 'scripts/system-validation.js'), envValidationScript);
        await fs.chmod(path.join(this.baseDir, 'scripts/system-validation.js'), '755');
    }

    async setupBaseline() {
        const baselineDir = path.join(this.baseDir, 'reports/baseline');
        
        // Create baseline README
        const baselineReadme = `# Performance Baseline

This directory contains performance baseline data for regression testing.

## Files
- \`performance-baseline.json\`: Current performance baseline
- \`baseline-history/\`: Historical baseline data

## Usage
\`\`\`bash
# Create new baseline
npm run test:performance

# Run regression test
npm run test:regression
\`\`\`

## Baseline Metrics
- Response times (P50, P95, P99)
- Throughput (requests per second)  
- Error rates
- Resource utilization

Baselines are automatically updated when performance improvements are detected.
`;

        await fs.writeFile(path.join(baselineDir, 'README.md'), baselineReadme);
        await fs.ensureDir(path.join(baselineDir, 'baseline-history'));
    }

    async validateSetup() {
        const validations = [];

        // Check directory structure
        const requiredDirs = ['reports', 'scripts', 'artillery-configs'];
        for (const dir of requiredDirs) {
            const exists = await fs.pathExists(path.join(this.baseDir, dir));
            validations.push({ name: `Directory: ${dir}`, passed: exists });
        }

        // Check Artillery installation
        try {
            await this.executeCommand('artillery --version', 'Artillery check');
            validations.push({ name: 'Artillery Installation', passed: true });
        } catch (error) {
            validations.push({ name: 'Artillery Installation', passed: false });
        }

        // Check scripts
        const requiredScripts = [
            'gradual-load-test.js',
            'monitoring-collector.js',
            'performance-benchmarks.js',
            'run-all-tests.js'
        ];

        for (const script of requiredScripts) {
            const exists = await fs.pathExists(path.join(this.baseDir, 'scripts', script));
            validations.push({ name: `Script: ${script}`, passed: exists });
        }

        // Check Artillery configs
        const requiredConfigs = [
            'smoke-test.yml',
            'load-test-comprehensive.yml',
            'booking-flow.yml'
        ];

        for (const config of requiredConfigs) {
            const exists = await fs.pathExists(path.join(this.baseDir, 'artillery-configs', config));
            validations.push({ name: `Config: ${config}`, passed: exists });
        }

        // Display validation results
        console.log(chalk.blue('\\n📋 Setup Validation:'));
        const failed = validations.filter(v => !v.passed);
        
        if (failed.length === 0) {
            console.log(chalk.green('✅ All validations passed'));
        } else {
            console.log(chalk.red(\`❌ \${failed.length} validations failed:\`));
            failed.forEach(v => console.log(chalk.red(\`   - \${v.name}\`)));
            throw new Error('Setup validation failed');
        }
    }

    async executeCommand(command, errorMessage, options = {}) {
        return new Promise((resolve, reject) => {
            const process = exec(command, options, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(\`\${errorMessage}: \${error.message}\`));
                } else {
                    resolve(stdout);
                }
            });

            // Handle timeout
            setTimeout(() => {
                process.kill();
                reject(new Error(\`\${errorMessage}: Command timeout\`));
            }, 60000); // 60 second timeout
        });
    }

    async checkPortAvailability(port, description) {
        return new Promise((resolve, reject) => {
            const net = require('net');
            const server = net.createServer();
            
            server.listen(port, () => {
                server.close();
                resolve();
            });
            
            server.on('error', () => {
                reject(new Error(\`\${description} (port \${port}) is already in use\`));
            });
        });
    }

    async makeHttpRequest(url) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            const request = http.get(url, (response) => {
                resolve({ status: response.statusCode });
            });
            
            request.on('error', reject);
            request.setTimeout(5000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new LoadTestSetup();
    setup.runSetup().catch(console.error);
}

module.exports = LoadTestSetup;
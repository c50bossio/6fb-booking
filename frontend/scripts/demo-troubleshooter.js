#!/usr/bin/env node

/**
 * Demo script to showcase the Master Localhost Troubleshooter
 * This script demonstrates all the available commands and their outputs
 */

const { execSync } = require('child_process');

console.log(`
🎪 Master Localhost Troubleshooter Demo
=======================================

This demo showcases all available troubleshooting commands for the 6FB Booking Frontend.

📋 Available Commands:
`);

const commands = [
    {
        command: 'npm run fix-localhost -- --help',
        description: '📖 Show help information',
        demo: true
    },
    {
        command: 'npm run fix-localhost -- --dry-run',
        description: '🔍 Preview what would be done (safe)',
        demo: true
    },
    {
        command: 'npm run fix-localhost',
        description: '⚡ Quick fix mode (automatic)',
        demo: false,
        note: 'Will attempt actual fixes'
    },
    {
        command: 'npm run fix-localhost -- --full',
        description: '🔬 Full diagnostic mode (comprehensive)',
        demo: false,
        note: 'Will run extensive diagnostics and fixes'
    },
    {
        command: 'npm run fix-localhost -- --nuclear',
        description: '💣 Nuclear option (complete reset)',
        demo: false,
        note: 'Will reinstall dependencies - use with caution'
    },
    {
        command: 'npm run diagnose',
        description: '📊 Network diagnostics only',
        demo: true
    },
    {
        command: 'npm run debug:extensions',
        description: '🧩 Browser extension analysis',
        demo: false,
        note: 'Requires browser automation'
    },
    {
        command: 'npm run clear-cache',
        description: '🧹 Clear localhost caches',
        demo: false,
        note: 'Will clear actual caches'
    }
];

commands.forEach((cmd, index) => {
    console.log(`${index + 1}. ${cmd.description}`);
    console.log(`   Command: ${cmd.command}`);
    if (cmd.note) {
        console.log(`   Note: ${cmd.note}`);
    }
    console.log();
});

console.log(`
🚀 To run a demo, use one of these commands:

# Safe demos (no changes made):
npm run fix-localhost -- --help
npm run fix-localhost -- --dry-run
npm run diagnose

# Active fixes (will make changes):
npm run fix-localhost                    # Quick fix
npm run fix-localhost -- --full         # Full diagnostic
npm run fix-localhost -- --nuclear      # Nuclear option

🔧 Common Workflow:

1. Start with dry-run to see what would be done:
   npm run fix-localhost -- --dry-run

2. If issues found, run quick fix:
   npm run fix-localhost

3. If problems persist, run full diagnostic:
   npm run fix-localhost -- --full

4. For severe issues, use nuclear option:
   npm run fix-localhost -- --nuclear

📄 Generated Files:
All troubleshooting runs generate detailed logs and reports in:
• logs/troubleshoot-YYYY-MM-DD.log      # Execution log
• logs/troubleshoot-report-TIMESTAMP.json # Structured report

📖 Documentation:
See LOCALHOST_TROUBLESHOOTING_GUIDE.md for complete documentation.

🎯 Quick Start:
If you just want to fix localhost issues right now:
npm run fix-localhost

Happy troubleshooting! 🛠️
`);

// If run with --run-demo, actually run a safe demo
if (process.argv.includes('--run-demo')) {
    console.log('\n🎪 Running Safe Demo...\n');

    try {
        console.log('1. Showing help information:');
        console.log('=' * 40);
        execSync('npm run fix-localhost -- --help', { stdio: 'inherit' });

        console.log('\n2. Running dry-run mode:');
        console.log('=' * 40);
        execSync('npm run fix-localhost -- --dry-run', { stdio: 'inherit' });

    } catch (error) {
        console.log('Demo completed with some expected errors (no dev servers running)');
    }
}

# 6FB Booking Monorepo Migration Tools

This set of tools helps migrate the 6FB Booking platform from its current structure to a clean, organized monorepo architecture.

## Overview

The migration process consists of three main components:

1. **Migration Analyzer** - Analyzes the current codebase
2. **Migration Script** - Performs the actual migration
3. **Migration Config** - Defines what and how to migrate

## Quick Start

```bash
# 1. Make scripts executable
./setup-migration.sh

# 2. Run analysis to understand current codebase
node migration-analyzer.js

# 3. Review the analysis report
cat migration-analysis.json

# 4. Perform a dry-run migration
node migrate-to-monorepo.js

# 5. If everything looks good, execute the migration
node migrate-to-monorepo.js --execute
```

## Tools Description

### migration-analyzer.js

Analyzes your current codebase and generates a detailed report including:
- File statistics and categorization
- Essential vs archivable files
- Shared code identification
- Dependency analysis
- Dead code detection
- Recommendations for improvement

**Output:** `migration-analysis.json`

### migrate-to-monorepo.js

Performs the actual migration based on the configuration and analysis:
- Creates monorepo structure
- Migrates essential files
- Extracts shared packages
- Archives old/test files
- Updates import paths
- Generates migration report

**Options:**
- `--analyze` - Run analysis before migration
- `--execute` - Perform actual migration (default is dry-run)
- `--verbose` - Show detailed output

**Output:** `migration-report.json`

### migration-config.json

Configuration file that defines:
- Target monorepo structure
- File inclusion/exclusion rules
- Package extraction patterns
- Import mapping rules
- Archive settings

## Monorepo Structure

The migration creates the following structure:

```
6fb-platform/
├── apps/
│   ├── backend/          # FastAPI backend
│   ├── frontend/         # Next.js frontend
│   └── dashboard/        # Analytics dashboard
├── packages/
│   ├── shared/           # Shared types/schemas
│   ├── ui-components/    # Reusable UI components
│   ├── utils/            # Shared utilities
│   └── api-client/       # API client library
├── tools/
│   └── scripts/          # Dev/deployment scripts
├── docs/                 # Documentation
└── config/              # Shared configuration
```

## What Gets Migrated

### Essential Files (Migrated)
- Source code (`.py`, `.ts`, `.tsx`, `.js`, `.jsx`)
- Configuration files
- Package manifests
- Documentation
- Assets and public files

### Archived Files (Moved to archive)
- Test scripts (`test_*.py`, `test-*.js`)
- Utility scripts (`create_*.py`, `seed_*.py`)
- Reports and results
- Experimental code

### Ignored Files (Not migrated)
- Virtual environments (`venv/`)
- Node modules
- Build artifacts
- Logs and temporary files
- Database files

## Safety Features

1. **Dry-run by default** - See what will happen before executing
2. **Git status check** - Warns about uncommitted changes
3. **Detailed logging** - Track every operation
4. **Archive preservation** - Nothing is deleted, only moved
5. **Rollback plan** - Original repo remains intact

## Post-Migration Steps

After successful migration:

1. **Install dependencies:**
   ```bash
   cd /Users/bossio/6fb-platform
   npm install
   ```

2. **Update environment variables:**
   - Copy `.env.template` files
   - Update API endpoints
   - Configure secrets

3. **Test the monorepo:**
   ```bash
   npm run dev    # Start all apps
   npm test       # Run tests
   npm run build  # Build all apps
   ```

4. **Update CI/CD:**
   - Update pipeline configurations
   - Adjust deployment scripts
   - Configure monorepo-aware builds

## Customization

Edit `migration-config.json` to customize:
- File patterns to include/exclude
- Package extraction rules
- Import mappings
- Archive locations

## Troubleshooting

### Common Issues

1. **Permission errors**
   - Run `./setup-migration.sh` first
   - Check file permissions

2. **Missing analysis file**
   - Run `node migration-analyzer.js` first
   - Or use `--analyze` flag

3. **Target directory exists**
   - Migration will warn but continue
   - Existing files may be overwritten

### Getting Help

1. Review the generated reports
2. Check migration logs
3. Run with `--verbose` for detailed output
4. Original code remains in source directory

## Best Practices

1. **Always run analysis first** - Understand what will be migrated
2. **Do a dry-run** - Verify the migration plan
3. **Commit changes** - Ensure git status is clean
4. **Back up if needed** - Though original remains intact
5. **Test thoroughly** - After migration, test all functionality

## Architecture Benefits

The monorepo structure provides:
- **Code sharing** - Eliminate duplication
- **Atomic changes** - Related changes in one commit
- **Consistent tooling** - Unified build/test/lint
- **Better refactoring** - Cross-project changes
- **Simplified deps** - Single node_modules

---

For questions or issues, refer to the migration reports or contact the development team.
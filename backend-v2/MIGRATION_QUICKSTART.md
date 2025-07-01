# BookedBarber.com V2 Migration Quick Start Guide

## Overview

This guide provides quick steps to start migrating BookedBarber.com to the clean V2 architecture using the automated migration system.

## Prerequisites

1. Ensure you're on the migration branch:
   ```bash
   git checkout -b migration/v2-phase-0-setup
   ```

2. Install required dependencies in backend-v2:
   ```bash
   cd backend-v2
   pip install -r requirements.txt
   ```

## Migration Commands

### 1. Check Current Status
```bash
python migrate.py status
```

### 2. Generate Phase Execution Plan
```bash
# Plan Phase 1 (Core Features)
python migrate.py plan --phase 1
```

### 3. Migrate a Single Feature (Dry Run)
```bash
# Test migration without making changes
python migrate.py migrate --phase 1 --feature enhanced_auth --dry-run
```

### 4. Migrate a Single Feature
```bash
# Actually perform the migration
python migrate.py migrate --phase 1 --feature enhanced_auth
```

### 5. Migrate Entire Phase
```bash
# Migrate all features in Phase 1
python migrate.py migrate --phase 1
```

### 6. Validate Migration
```bash
# Validate a specific feature
python migrate.py validate --phase 1 --feature enhanced_auth
```

### 7. Generate Dashboard
```bash
# View overall migration progress
python migrate.py dashboard
```

## Migration Phases

### Phase 1: Core Features (Weeks 1-2)
- **enhanced_auth**: MFA, PIN auth, RBAC
- **advanced_booking**: Rules, constraints, recurring appointments
- **client_management**: Profiles, preferences, communication

### Phase 2: Calendar & Scheduling (Weeks 3-4)
- **unified_calendar**: Drag-and-drop, conflict detection
- **google_calendar**: Two-way sync integration
- **availability_management**: Working hours, breaks, holidays

### Phase 3: Payment & Financial (Weeks 5-6)
- **payment_processing**: Multi-processor support
- **stripe_connect**: Barber payouts
- **gift_certificates**: Purchase and redemption

### Phase 4: Communication & Marketing (Weeks 7-8)
- **notification_system**: Email, SMS, Push
- **email_campaigns**: Campaign management
- **customer_communication**: Reminders, follow-ups

### Phase 5: Analytics & Reporting (Weeks 9-10)
- **business_analytics**: 6FB metrics, dashboards
- **ai_revenue_analytics**: Predictions, optimization

## Sub-Agent Task Allocation

The system automatically allocates tasks to 3 parallel agents:

1. **Agent 1**: Typically handles models and core services
2. **Agent 2**: Handles additional services and business logic
3. **Agent 3**: Handles endpoints, tests, and documentation

View allocated tasks:
```bash
ls backend-v2/migrations/task_logs/agent_*_instructions.md
```

## Safety Features

### Duplication Detection
- Automatically checks for existing features
- Prevents duplicate code
- Maintains feature registry

### Validation Gates
- Pre-migration checks
- Post-migration validation
- Automated rollback on failure

### File Locking
- Prevents conflicts between agents
- Ensures clean parallel execution

## Troubleshooting

### Migration Failed
1. Check logs: `backend-v2/migrations/migration_logs/`
2. Review validation report: `backend-v2/migrations/validation_reports/`
3. Rollback if needed: `git reset --hard HEAD~1`

### Dependency Issues
1. Ensure all dependencies from previous phases are migrated
2. Check feature registry: `backend-v2/migrations/feature_registry.json`

### Test Failures
1. Run tests manually: `pytest backend-v2/tests/test_[feature].py -v`
2. Check coverage: `python -m coverage run -m pytest`

## Best Practices

1. **Always run dry-run first** before actual migration
2. **Migrate in order** - respect phase dependencies
3. **Check validation** after each feature migration
4. **Commit frequently** after successful migrations
5. **Monitor the dashboard** for overall progress

## Example Workflow

```bash
# 1. Start fresh
git checkout -b migration/v2-phase-1
cd backend-v2

# 2. Check status
python migrate.py status

# 3. Plan Phase 1
python migrate.py plan --phase 1

# 4. Migrate first feature (dry run)
python migrate.py migrate --phase 1 --feature enhanced_auth --dry-run

# 5. If dry run succeeds, do actual migration
python migrate.py migrate --phase 1 --feature enhanced_auth

# 6. Validate the migration
python migrate.py validate --phase 1 --feature enhanced_auth

# 7. Commit if successful
git add .
git commit -m "migrate: enhanced_auth to v2 architecture"

# 8. Continue with next feature
python migrate.py migrate --phase 1 --feature advanced_booking

# 9. Check dashboard
python migrate.py dashboard
```

## Support

For issues or questions:
1. Check migration logs
2. Review validation reports
3. Consult MIGRATION_STRATEGY_V2.md for detailed information
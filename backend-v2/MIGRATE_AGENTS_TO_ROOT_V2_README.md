# MIGRATE_AGENTS_TO_ROOT_V2.sh - Multi-Agent Migration Coordinator

## Overview

The MIGRATE_AGENTS_TO_ROOT_V2.sh script is a sophisticated multi-agent coordination system designed to manage parallel migration of features from BookedBarber V1 to V2 architecture. It orchestrates multiple Claude agents working simultaneously while preventing conflicts and ensuring dependency resolution.

## Features

### 🚀 **Multi-Agent Coordination**
- Coordinates up to 3 parallel Claude agents
- Distributes migration tasks evenly across agents
- Prevents file conflicts through exclusive locking
- Ensures proper dependency resolution

### 🔒 **Conflict Prevention**
- File-level locking prevents simultaneous modifications
- Dependency-aware task scheduling
- Cross-agent coordination with status monitoring
- Automatic conflict detection and resolution

### 📊 **Comprehensive Monitoring**
- Real-time agent status monitoring
- Detailed execution logging
- Automated progress reporting
- Failure detection and recovery

### 🔄 **Phase-Based Migration**
- Organized migration in 5 distinct phases
- Each phase contains logically related features
- Dependencies respected across phases
- Rollback capabilities for failed migrations

## Architecture

### Components

1. **MIGRATE_AGENTS_TO_ROOT_V2.sh** - Main coordination script
2. **migrate.py** - Python migration orchestrator
3. **utils/sub_agent_manager.py** - Task allocation and agent management
4. **utils/migration_validator.py** - Pre/post migration validation
5. **utils/duplication_detector.py** - Prevents duplicate implementations
6. **migrations/migration_runner.py** - Individual migration execution

### Migration Phases

#### Phase 1: Core Features (Weeks 1-2)
- **enhanced_auth**: Multi-factor authentication with PIN and RBAC
- **advanced_booking**: Advanced booking with rules and constraints  
- **client_management**: Comprehensive client profiles and preferences

#### Phase 2: Calendar & Scheduling (Weeks 3-4)
- **unified_calendar**: Drag-and-drop calendar with conflict detection
- **google_calendar**: Two-way Google Calendar synchronization
- **availability_management**: Working hours, breaks, and holiday management

#### Phase 3: Payment & Financial (Weeks 5-6)
- **payment_processing**: Multi-processor payment support
- **stripe_connect**: Stripe Connect for barber payouts
- **gift_certificates**: Gift certificate purchase and redemption

#### Phase 4: Communication & Marketing (Weeks 7-8)
- **notification_system**: Email, SMS, and push notification system
- **email_campaigns**: Email campaign management and automation
- **customer_communication**: Automated reminders and follow-ups

#### Phase 5: Analytics & Reporting (Weeks 9-10)
- **business_analytics**: 6FB methodology metrics and dashboards
- **ai_revenue_analytics**: AI-powered revenue predictions and optimization

## Usage

### Prerequisites

1. **Environment Setup**:
   ```bash
   cd backend-v2
   pip install -r requirements.txt
   ```

2. **Branch Setup**:
   ```bash
   git checkout -b feature/migrate-agents-to-root-v2-implementation
   ```

3. **Permissions**:
   ```bash
   chmod +x MIGRATE_AGENTS_TO_ROOT_V2.sh
   ```

### Basic Commands

#### Check System Status
```bash
./MIGRATE_AGENTS_TO_ROOT_V2.sh --check-status
```

#### Run Dry Migration (Recommended First)
```bash
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 1 --dry-run
```

#### Execute Real Migration
```bash
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 1
```

#### Verbose Monitoring
```bash
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 1 --dry-run --verbose
```

#### Emergency Operations
```bash
# Kill all running agents
./MIGRATE_AGENTS_TO_ROOT_V2.sh --kill-agents

# Reset coordination state
./MIGRATE_AGENTS_TO_ROOT_V2.sh --reset

# Kill and reset together
./MIGRATE_AGENTS_TO_ROOT_V2.sh --kill-agents --reset
```

### Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `-p, --phase PHASE` | Migration phase number (1-5) | `--phase 1` |
| `-d, --dry-run` | Perform dry run without making changes | `--dry-run` |
| `-v, --verbose` | Enable verbose logging | `--verbose` |
| `-c, --check-status` | Check current agent coordination status | `--check-status` |
| `-k, --kill-agents` | Kill all running migration agents | `--kill-agents` |
| `-r, --reset` | Reset coordination state | `--reset` |
| `-h, --help` | Show help message | `--help` |

## Task Distribution

### Task Types

1. **model_migration**: Database model creation/migration
2. **service_migration**: Business logic service implementation
3. **endpoint_migration**: API endpoint creation
4. **test_creation**: Comprehensive test suite development
5. **documentation**: API and feature documentation

### Load Balancing Algorithm

The system uses an intelligent load balancing algorithm that:
- Distributes tasks evenly across available agents
- Respects file-level conflicts and dependencies
- Prioritizes agents with fewer assigned tasks
- Maintains dependency order through topological sorting

### Example Task Distribution

For Phase 1 with 24 tasks across 3 agents:

```
Agent 1: 8 tasks
- enhanced_auth: User model, AuthService, endpoints, tests, docs
- advanced_booking: Booking model, SchedulingService  
- client_management: Client model

Agent 2: 8 tasks  
- enhanced_auth: Role model, RoleService
- advanced_booking: BookingRule model, endpoints, tests, docs
- client_management: ClientPreference model, PreferenceService

Agent 3: 8 tasks
- enhanced_auth: Permission model
- advanced_booking: TimeSlot model
- client_management: ClientHistory model, endpoints, tests, docs
```

## Agent Instructions

Each agent receives detailed markdown instructions including:

### Task Structure
```markdown
### Task 1: Migrate User model for enhanced_auth
- **ID**: enhanced_auth_model_User
- **Type**: model_migration
- **Feature**: enhanced_auth
- **Files**: models/user.py
- **Dependencies**: []

#### Implementation Steps:
1. Copy the model from the original codebase
2. Update imports to use v2 structure
3. Simplify relationships if needed
4. Add proper type hints
5. Ensure SQLAlchemy 2.0 compatibility
6. Add model to `models/__init__.py`
7. Create or update Alembic migration
```

### Coordination Rules
1. **File Locking**: Exclusive access to assigned files
2. **Dependencies**: Complete tasks in dependency order
3. **Communication**: Log progress after each task completion
4. **Testing**: Run tests after each implementation
5. **No Scope Creep**: Only implement specified functionality

## Monitoring and Reporting

### Real-Time Monitoring

The script provides real-time monitoring with color-coded status:
- 🟢 **A1:RUN** - Agent 1 running
- 🔵 **A1:DONE** - Agent 1 completed
- 🔴 **A1:NONE** - Agent 1 not running

### Generated Reports

#### 1. Agent Instructions
- Location: `migrations/task_logs/agent_N_instructions.md`
- Contains: Detailed task breakdown with implementation steps

#### 2. Allocation Plans
- Location: `migrations/task_logs/allocation_plan_TIMESTAMP.json`
- Contains: Complete task distribution across agents

#### 3. Coordination Reports
- Location: `migrations/coordination/phase_N_coordination_report.md`
- Contains: Execution summary, timing, and status for all agents

#### 4. Agent Logs
- Location: `migrations/agent_logs/agent_N.log`
- Contains: Individual agent execution logs

### Sample Report Output

```markdown
# Phase 1 Multi-Agent Coordination Report

**Generated**: 2025-07-19 08:28:42
**Script**: ./MIGRATE_AGENTS_TO_ROOT_V2.sh
**Dry Run**: true

## Execution Summary

### Agent Execution Status

#### Agent 1 (agent_1)
- **Start Time**: 2025-07-19 08:28:34
- **End Time**: 2025-07-19 08:28:39
- **Log Entries**: 8
- **Status**: ✅ Completed successfully
```

## Error Handling and Recovery

### Common Issues and Solutions

#### 1. No Agent Instructions Generated
```bash
# Check phase configuration
cat migrations/phase_config.json

# Verify Python dependencies
python -c "import utils.sub_agent_manager"

# Re-run with verbose logging
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 1 --dry-run --verbose
```

#### 2. Agent Conflicts
```bash
# Check for running processes
./MIGRATE_AGENTS_TO_ROOT_V2.sh --check-status

# Kill conflicting agents
./MIGRATE_AGENTS_TO_ROOT_V2.sh --kill-agents

# Reset coordination state
./MIGRATE_AGENTS_TO_ROOT_V2.sh --reset
```

#### 3. Task Allocation Failures
- Verify phase configuration in `migrations/phase_config.json`
- Check for circular dependencies in task definitions
- Ensure all required Python modules are installed

### Emergency Recovery

#### Complete Reset
```bash
# Kill all agents and reset state
./MIGRATE_AGENTS_TO_ROOT_V2.sh --kill-agents --reset

# Clean up any orphaned processes
pkill -f "agent_.*_executor"

# Restart coordination
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 1 --dry-run
```

#### Partial Recovery
```bash
# Check which agents are still running
./MIGRATE_AGENTS_TO_ROOT_V2.sh --check-status

# Kill specific problematic agent
kill -TERM <PID>

# Resume coordination
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 1
```

## File Structure

```
backend-v2/
├── MIGRATE_AGENTS_TO_ROOT_V2.sh          # Main coordination script
├── migrate.py                            # Python orchestrator
├── migrations/
│   ├── phase_config.json                 # Phase and feature definitions
│   ├── feature_registry.json             # Migrated features registry
│   ├── task_logs/                        # Agent instructions and plans
│   │   ├── agent_1_instructions.md
│   │   ├── agent_2_instructions.md
│   │   ├── agent_3_instructions.md
│   │   └── allocation_plan_*.json
│   ├── coordination/                     # Coordination state and reports
│   │   ├── coordinator.log
│   │   ├── agent_*.pid
│   │   └── phase_*_coordination_report.md
│   ├── agent_logs/                       # Individual agent logs
│   │   ├── agent_1.log
│   │   ├── agent_2.log
│   │   └── agent_3.log
│   └── validation_logs/                  # Migration validation reports
└── utils/
    ├── sub_agent_manager.py              # Task allocation and coordination
    ├── migration_validator.py            # Pre/post migration validation
    └── duplication_detector.py           # Duplicate prevention
```

## Best Practices

### 1. **Always Start with Dry Run**
```bash
# Test coordination before actual migration
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 1 --dry-run
```

### 2. **Monitor Progress Actively**
```bash
# Use verbose mode for detailed monitoring
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 1 --verbose

# Check status during execution
./MIGRATE_AGENTS_TO_ROOT_V2.sh --check-status
```

### 3. **Follow Phase Dependencies**
```bash
# Complete phases in order
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 1  # Complete first
./MIGRATE_AGENTS_TO_ROOT_V2.sh --phase 2  # Then second
# ... and so on
```

### 4. **Review Generated Instructions**
```bash
# Check agent tasks before execution
cat migrations/task_logs/agent_1_instructions.md
cat migrations/task_logs/agent_2_instructions.md
cat migrations/task_logs/agent_3_instructions.md
```

### 5. **Clean Up Between Phases**
```bash
# Reset state between phase migrations
./MIGRATE_AGENTS_TO_ROOT_V2.sh --reset

# Verify clean state
./MIGRATE_AGENTS_TO_ROOT_V2.sh --check-status
```

## Integration with BookedBarber V2

This migration coordinator is specifically designed for the BookedBarber V2 migration project and integrates with:

- **Six Figure Barber Methodology**: All features align with 6FB business principles
- **Production Readiness**: Automated testing and validation for production deployment
- **FastAPI + Next.js Architecture**: Modern API and frontend framework migration
- **PostgreSQL Database**: Production-ready database schema migration
- **Stripe Connect Integration**: Payment processing and payout system migration

## Contributing

When modifying the migration system:

1. **Test Thoroughly**: Always test with dry-run first
2. **Document Changes**: Update this README for any new features
3. **Maintain Compatibility**: Ensure backward compatibility with existing phases
4. **Follow Conventions**: Use established naming and structure patterns
5. **Validate Dependencies**: Ensure proper dependency resolution

## Support and Troubleshooting

For issues or questions:

1. **Check Logs**: Review coordination and agent logs for errors
2. **Verify Configuration**: Ensure phase_config.json is valid
3. **Test Dependencies**: Confirm all Python dependencies are installed
4. **Use Verbose Mode**: Run with --verbose for detailed debugging
5. **Reset State**: Use --reset to clear any corrupted state

---

**Last Updated**: 2025-07-19  
**Version**: 2.0.0  
**Compatible with**: BookedBarber V2 Migration Project
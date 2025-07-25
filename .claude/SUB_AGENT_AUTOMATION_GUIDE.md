# Sub-Agent Automation System Guide

## Overview

The Sub-Agent Automation System makes custom sub-agents work proactively by automatically triggering them based on real-time system events, errors, and conditions. This eliminates the need for manual intervention and provides 24/7 automated monitoring and response.

## Architecture

### Core Components

1. **Sub-Agent Automation Engine** (`sub-agent-automation.py`)
   - Main orchestration system
   - Monitors system events and triggers
   - Manages rate limiting and safety mechanisms
   - Executes sub-agents based on configured conditions

2. **Hook Bridge** (`sub-agent-hook-bridge.sh`)
   - Integrates with existing Claude hooks system
   - Monitors hook execution results
   - Triggers sub-agents based on hook failures

3. **Browser Logs Integration** (`browser-logs-integration.py`)
   - Real-time JavaScript error monitoring
   - Connects to Chrome DevTools Protocol
   - Automatically triggers debugger agent for frontend issues

4. **Control Interface** (`sub-agent-control.py`)
   - Command-line management tool
   - Start/stop automation system
   - Configure agents and triggers
   - View status and metrics

### Configuration System

The system is configured via `/Users/bossio/6fb-booking/.claude/sub-agent-automation.json`:

```json
{
  "enabled": true,
  "sub_agents": {
    "debugger": { ... },
    "code-reviewer": { ... },
    "data-scientist": { ... },
    "general-purpose": { ... }
  },
  "safety_mechanisms": { ... },
  "monitoring": { ... }
}
```

## Available Sub-Agents

### 1. Debugger Agent
**Purpose**: Automatically investigates and provides debugging steps for critical issues

**Auto-triggers on**:
- Test failures (pytest, npm test)
- HTTP 500/404 errors
- JavaScript console errors
- Deployment failures
- CORS issues

**Safety limits**:
- Cooldown: 2-5 minutes between triggers
- Max executions: 10-20 per hour

### 2. Code Reviewer Agent
**Purpose**: Automatically reviews code for security, performance, and best practices

**Auto-triggers on**:
- Security-sensitive file changes (auth, payment, security)
- Large code modifications (>100 lines)
- Commits to staging/production branches
- Changes to critical system files

**Safety limits**:
- Cooldown: 15-30 minutes between triggers
- Max executions: 4-8 per hour

### 3. Data Scientist Agent
**Purpose**: Automatically analyzes performance issues and provides optimization recommendations

**Auto-triggers on**:
- Database query performance degradation
- Analytics dashboard failures
- SQL errors or timeouts
- Data integrity issues

**Safety limits**:
- Cooldown: 10-15 minutes between triggers
- Max executions: 6-8 per hour

### 4. General Purpose Agent
**Purpose**: Handles complex multi-system issues requiring comprehensive analysis

**Auto-triggers on**:
- Multiple simultaneous system failures
- Complex integration problems
- Cross-system dependency issues

**Safety limits**:
- Cooldown: 30-45 minutes between triggers
- Max executions: 2-3 per hour

## Safety Mechanisms

### Rate Limiting
- **Global limits**: 50 executions/hour, 200 executions/day
- **Agent-specific cooldowns**: Prevent rapid repeated triggers
- **Concurrent limit**: Maximum 1 agent running at a time

### Emergency Stop
- **Environment variable**: `CLAUDE_STOP_SUB_AGENTS=true`
- **Emergency file**: `.claude/EMERGENCY_STOP`
- **Emergency command**: `python3 .claude/scripts/sub-agent-control.py emergency-stop`

### Resource Protection
- **Execution timeout**: 10 minutes maximum
- **Memory limit**: 512MB per agent
- **CPU limit**: 50% maximum usage

## Usage Commands

### Basic Operations
```bash
# Check system status
python3 .claude/scripts/sub-agent-control.py status

# Start automation system
python3 .claude/scripts/sub-agent-control.py start

# Stop automation system
python3 .claude/scripts/sub-agent-control.py stop

# Restart automation system
python3 .claude/scripts/sub-agent-control.py restart
```

### Configuration Management
```bash
# Enable automation
python3 .claude/scripts/sub-agent-control.py enable

# Disable automation
python3 .claude/scripts/sub-agent-control.py disable

# List all available agents
python3 .claude/scripts/sub-agent-control.py list-agents

# Enable specific agent
python3 .claude/scripts/sub-agent-control.py enable-agent debugger

# Disable specific agent
python3 .claude/scripts/sub-agent-control.py disable-agent code-reviewer
```

### Monitoring and Metrics
```bash
# View detailed metrics
python3 .claude/scripts/sub-agent-control.py metrics

# Show current configuration
python3 .claude/scripts/sub-agent-control.py show-config
```

### Emergency Controls
```bash
# Emergency stop (creates stop file and kills processes)
python3 .claude/scripts/sub-agent-control.py emergency-stop

# Clear emergency stop condition
python3 .claude/scripts/sub-agent-control.py clear-emergency-stop
```

## Integration with Existing Hooks

The system automatically integrates with existing Claude hooks:

1. **Frontend verification failures** → Trigger debugger agent
2. **API endpoint failures** → Trigger debugger agent
3. **Test failures** → Trigger debugger agent
4. **Security scan failures** → Trigger code reviewer agent
5. **Performance issues** → Trigger data scientist agent
6. **Integration failures** → Trigger general purpose agent

## Browser Logs Integration

### Setup Requirements
```bash
# Start Chrome with debugging enabled
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb
```

### Monitored JavaScript Errors
- ReferenceError, TypeError, SyntaxError
- React errors and component failures
- "Cannot read property" errors
- Function not defined errors
- Uncaught exceptions

### Monitored URLs
- `http://localhost:3000` (development)
- `https://staging.bookedbarber.com` (staging)
- `https://bookedbarber.com` (production)

## Configuration Examples

### Enable Only Critical Agents
```bash
python3 .claude/scripts/sub-agent-control.py disable-agent data-scientist
python3 .claude/scripts/sub-agent-control.py disable-agent general-purpose
```

### Adjust Trigger Sensitivity
Edit `.claude/sub-agent-automation.json`:
```json
{
  "sub_agents": {
    "debugger": {
      "triggers": [
        {
          "name": "test_failures",
          "cooldown_minutes": 10,
          "max_triggers_per_hour": 5
        }
      ]
    }
  }
}
```

## Testing and Validation

### Quick Validation
```bash
python3 .claude/scripts/test-sub-agent-automation.py --quick
```

### Comprehensive Testing
```bash
python3 .claude/scripts/test-sub-agent-automation.py --comprehensive
```

### Manual Testing
1. Trigger a test failure: `python3 -c "assert False"`
2. Check if debugger agent was triggered
3. Review logs: `tail -f .claude/sub-agent-automation.log`

## Monitoring and Logs

### Log Files
- **Main log**: `.claude/sub-agent-automation.log`
- **Bridge log**: `.claude/sub-agent-bridge.log`
- **Metrics**: `.claude/sub-agent-metrics.json`

### Key Metrics
- Total executions
- Success rate per agent
- Trigger accuracy
- Average execution time
- Resource usage

### Health Monitoring
```bash
# Watch logs in real-time
tail -f .claude/sub-agent-automation.log

# Check system status
python3 .claude/scripts/sub-agent-control.py status

# View recent metrics
python3 .claude/scripts/sub-agent-control.py metrics
```

## Troubleshooting

### Common Issues

#### Automation Not Starting
1. Check if enabled: `python3 .claude/scripts/sub-agent-control.py status`
2. Enable if needed: `python3 .claude/scripts/sub-agent-control.py enable`
3. Check for emergency stop file: `ls .claude/EMERGENCY_STOP`

#### Too Many Triggers
1. Check recent executions: `python3 .claude/scripts/sub-agent-control.py metrics`
2. Increase cooldown periods in configuration
3. Temporarily disable sensitive agents

#### Browser Integration Not Working
1. Ensure Chrome is running with debug port: `lsof -i :9222`
2. Start Chrome manually: `google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb`
3. Check browser integration logs

#### Emergency Situations
```bash
# Kill all automation processes
python3 .claude/scripts/sub-agent-control.py emergency-stop

# Or manually
pkill -f sub-agent-automation
rm .claude/EMERGENCY_STOP
```

## Best Practices

### Development Workflow
1. Start automation system at beginning of development session
2. Monitor logs for excessive triggers
3. Adjust sensitivity if needed
4. Use emergency stop during intensive debugging

### Production Deployment
1. Test automation system in staging first
2. Enable only essential agents initially
3. Monitor resource usage and trigger rates
4. Gradually enable additional agents

### Customization
1. Create custom trigger conditions in configuration
2. Adjust cooldown periods based on project needs
3. Add new error patterns for specific use cases
4. Configure custom prompt templates for agents

## Security Considerations

- All triggered executions are logged with timestamps
- Rate limiting prevents resource exhaustion
- Emergency stop provides immediate halt capability
- Configuration changes require file system access
- Agent executions run with same permissions as Claude

## Future Enhancements

- Integration with external monitoring systems (DataDog, Sentry)
- Custom webhook triggers for external events
- Machine learning-based trigger sensitivity adjustment
- Multi-project configuration support
- Advanced filtering and routing rules

---

Last Updated: 2025-07-25
Version: 1.0.0
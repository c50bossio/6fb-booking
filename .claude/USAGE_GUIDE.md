# BookedBarber V2 - Claude Code Hooks Usage Guide

## Overview
This project is configured with comprehensive Claude Code hooks that integrate with the git hooks system to provide automated validation, security scanning, and quality assurance.

## Hooks Configured

### Pre-Tool Hooks (Before Code Changes)
1. **V1 Prevention** - Blocks modifications to deprecated V1 directories
2. **Security Scanning** - Scans code for secrets and vulnerabilities

### Post-Tool Hooks (After Code Changes)
1. **API Documentation** - Validates API docs when backend changes
2. **Database Migrations** - Checks for required migrations
3. **Performance Monitoring** - Monitors frontend performance impact
4. **Integration Health** - Validates third-party service integrations
5. **Compliance Validation** - GDPR/PCI checks for sensitive data
6. **Dependency Security** - Scans package dependencies
7. **Smart Testing** - Runs relevant tests based on changes

### Stop Hooks (End of Session)
1. **Development Summary** - Provides session summary and next steps

## Usage

### Normal Development
Claude Code hooks run automatically when you use Claude Code tools. No special action required.

### Emergency Bypass
If you need to bypass hooks in an emergency:
```bash
export CLAUDE_BYPASS_HOOKS=true
# Your Claude Code session
unset CLAUDE_BYPASS_HOOKS
```

### Hook Logs
Check hook activity: `tail -f /Users/bossio/6fb-booking/.claude/hooks.log`

### Manual Hook Testing
Test individual hooks:
```bash
# Test V2-only enforcement
/Users/bossio/6fb-booking/hooks/pre-commit-v2-only

# Test security scanning
/Users/bossio/6fb-booking/hooks/pre-commit-secrets

# Test smart test runner
/Users/bossio/6fb-booking/.claude/hooks/smart-test-runner.sh
```

## Integration with Git Hooks

Claude Code hooks work alongside the git hooks system:
- **Git Hooks**: Run during git operations (commit, push)
- **Claude Code Hooks**: Run during Claude Code operations (edit, write)

Both systems use the same underlying validation scripts for consistency.

## Configuration

### Project Configuration
- Main config: `.claude/hooks.json`
- Environment: `.claude/.env`
- Project settings: `.claude/project-settings.json`

### Global Configuration
- Global settings: `~/.claude/settings.local.json`
- Add project-specific permissions as needed

## Best Practices

1. **Keep hooks enabled** - They catch issues early
2. **Review hook logs** - Understand what's being validated
3. **Use bypass sparingly** - Only for true emergencies
4. **Update configurations** - As project needs evolve
5. **Test changes** - Use smart test runner for confidence

## Troubleshooting

### Hooks Not Running
1. Check if `.claude/hooks.json` exists
2. Verify file permissions on hook scripts
3. Check environment variables in `.claude/.env`
4. Review Claude Code global settings

### Hook Failures
1. Read the error message carefully
2. Check hook logs for details
3. Fix the underlying issue rather than bypassing
4. Test the fix manually

### Performance Issues
1. Check hook timeout settings
2. Review log files for slow operations  
3. Consider excluding large files from scanning
4. Optimize hook scripts if needed

## Support

For issues with:
- **Git Hooks**: Check `/Users/bossio/6fb-booking/hooks/README.md`
- **Claude Code Hooks**: Check this guide and logs
- **Project Issues**: Review the main project documentation

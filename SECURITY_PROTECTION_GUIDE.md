# Security Protection System - Claude Code Environment Variable Protection

## Overview

A comprehensive security hook system has been implemented to prevent Claude Code from accidentally sharing sensitive information like API keys, environment variables, and other credentials in chat responses or logs.

## Protection Features

### 🔒 Automatic Blocking
- **Environment Files**: All `.env`, `.env.local`, `.env.production` files are protected
- **API Keys**: Detects Stripe keys, OpenAI tokens, database URLs, JWT secrets
- **Response Validation**: Scans all Claude Code responses before sending
- **Real-time Detection**: Uses pattern matching for various credential formats

### 🛡️ Security Patterns Detected
- `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `DATABASE_URL`
- Generic patterns: `*_API_KEY`, `*_SECRET`, `*_TOKEN`, `*_PASSWORD`
- Specific formats: `sk-*`, `pk-*`, `ey*` (JWT), `ghp_*` (GitHub)
- Environment file content: `VARIABLE=value` patterns

### 📁 Protected Files
- `/Users/bossio/6fb-booking/.env*`
- `/Users/bossio/6fb-booking/backend-v2/.env*`
- `/Users/bossio/6fb-booking/backend-v2/frontend-v2/.env*`
- Any file containing sensitive credential patterns

## How It Works

### Hook Integration
The system integrates with Claude Code through two main hooks:

1. **Pre-Tool Use Hook**: Intercepts file read operations
   ```json
   {
     "name": "environment_security_protection",
     "event": "PreToolUse",
     "matchers": ["Read(file_path:*.env*)"],
     "blocking": true
   }
   ```

2. **Pre-Response Hook**: Validates all responses for sensitive content
   ```json
   {
     "name": "sensitive_content_validation", 
     "event": "PreResponse",
     "matchers": ["*"],
     "blocking": true
   }
   ```

### Security Flow
1. **File Access**: When Claude Code tries to read a protected file, the hook blocks access
2. **Template Redirect**: If available, redirects to `.template` version with masked values
3. **Response Scanning**: All responses are scanned for credential patterns
4. **Blocking**: If sensitive content is detected, response is replaced with security warning

## Files Created

### Core Security Scripts
- `/Users/bossio/6fb-booking/.claude/hooks/security-env-blocker.sh` - Main security engine
- `/Users/bossio/6fb-booking/.claude/hooks/claude-code-security-wrapper.sh` - Claude Code integration

### Templates Created
- `.env.local.template` - Masked version of actual environment files
- `.env.production.example.template` - Production environment template
- Additional templates for discovered environment files

### Logs
- `/Users/bossio/6fb-booking/.claude/logs/security-env-blocker.log` - Security events
- `/Users/bossio/6fb-booking/.claude/logs/security-alerts.log` - Security violations
- `/Users/bossio/6fb-booking/.claude/logs/claude-security-wrapper.log` - Integration logs

## Usage Examples

### Safe Reference Patterns ✅
```bash
# Reference variable names without values
echo "Set your STRIPE_SECRET_KEY environment variable"

# Use template files
cat .env.template

# Generic examples
STRIPE_SECRET_KEY=<your-stripe-secret-key>
DATABASE_URL=<your-database-connection-string>
```

### Blocked Patterns ❌
```bash
# Actual environment values (examples blocked by security)
STRIPE_SECRET_KEY=sk_test_[actual-key-blocked]
DATABASE_URL=postgresql://user:pass@host:5432/db

# Reading actual .env files
cat .env

# Sharing database URLs with credentials
DATABASE_URL=postgresql://user:password@host:5432/db
```

## Testing the Protection

### Test File Access Blocking
```bash
# This should be blocked
/Users/bossio/6fb-booking/.claude/hooks/claude-code-security-wrapper.sh check-file /Users/bossio/6fb-booking/.env

# Expected output: Security block message
```

### Test Content Validation
```bash
# This should be blocked
/Users/bossio/6fb-booking/.claude/hooks/claude-code-security-wrapper.sh check-content "STRIPE_SECRET_KEY=sk_test_[blocked]"

# Expected output: Security alert
```

### Test Response Validation
```bash
# This should be blocked if contains sensitive data
/Users/bossio/6fb-booking/.claude/hooks/claude-code-security-wrapper.sh check-response "Response containing API_KEY=abc123"
```

## Security Events Monitoring

### Real-time Monitoring
```bash
# Watch security events in real-time
tail -f /Users/bossio/6fb-booking/.claude/logs/security-alerts.log

# Check recent security events
tail -20 /Users/bossio/6fb-booking/.claude/logs/security-env-blocker.log
```

### Security Metrics
The system logs:
- File access attempts to protected files
- Content validation results
- Pattern matching results
- Blocked operations with context

## Emergency Bypass

### For Critical Situations Only
```bash
# Temporarily disable hooks (emergency only)
export CLAUDE_BYPASS_HOOKS=true

# Remember to re-enable after emergency
unset CLAUDE_BYPASS_HOOKS
```

### When to Use Bypass
- Production outages requiring immediate access
- Security system malfunction
- Critical debugging scenarios

**⚠️ Warning**: Bypass should only be used in genuine emergencies and security should be re-enabled immediately after.

## Maintenance

### Adding New Patterns
Edit `/Users/bossio/6fb-booking/.claude/hooks/security-env-blocker.sh` and add to `SENSITIVE_PATTERNS` array:
```bash
declare -a SENSITIVE_PATTERNS=(
    # Add new patterns here
    "NEW_SERVICE_API_KEY"
    "CUSTOM_SECRET_*"
)
```

### Updating Protected Paths
Modify the hook matchers in `/Users/bossio/6fb-booking/.claude/hooks.json`:
```json
"matchers": [
    "Read(file_path:*.env*)",
    "Read(file_path:*/new-secret-dir/*)"
]
```

## Benefits

1. **Prevents Accidental Exposure**: Blocks sharing of credentials in chat logs
2. **Automatic Protection**: No manual intervention required
3. **Comprehensive Coverage**: Detects various credential formats
4. **Real-time Validation**: Scans all content before transmission
5. **Audit Trail**: Complete logging of security events
6. **Developer Friendly**: Provides clear guidance when blocked

## Troubleshooting

### Hook Not Working
1. Check hook is executable: `ls -la /Users/bossio/6fb-booking/.claude/hooks/security-env-blocker.sh`
2. Verify hooks.json syntax: `python -m json.tool /Users/bossio/6fb-booking/.claude/hooks.json`
3. Check logs for errors: `tail /Users/bossio/6fb-booking/.claude/logs/security-env-blocker.log`

### False Positives
1. Review patterns in security script
2. Add exceptions if needed (carefully)
3. Use template files for reference instead

### Performance Issues
1. Monitor hook execution time in logs
2. Optimize pattern matching if needed
3. Consider caching for frequently accessed files

---

**Security is paramount. This system prevents accidental credential exposure while maintaining development productivity.**
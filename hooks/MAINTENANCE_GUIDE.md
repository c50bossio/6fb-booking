# BookedBarber V2 - Hooks System Maintenance Guide

This guide provides comprehensive maintenance procedures for the BookedBarber V2 hooks system to ensure optimal performance, security, and reliability.

## 📋 Table of Contents

1. [Regular Maintenance Schedule](#regular-maintenance-schedule)
2. [Performance Monitoring](#performance-monitoring)
3. [Log Analysis](#log-analysis)
4. [Update Procedures](#update-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Backup and Recovery](#backup-and-recovery)
7. [Security Updates](#security-updates)
8. [Team Management](#team-management)

## 📅 Regular Maintenance Schedule

### Daily Tasks
- [ ] Check hook execution logs for errors
- [ ] Monitor CI/CD pipeline success rates
- [ ] Review bypass usage (if any)
- [ ] Verify critical hooks are functioning

### Weekly Tasks
- [ ] Analyze hook performance metrics
- [ ] Review and address any logged warnings
- [ ] Update hook configurations if needed
- [ ] Check for new security patterns to add

### Monthly Tasks
- [ ] Full audit of bypass usage
- [ ] Update security detection patterns
- [ ] Review and adjust performance thresholds
- [ ] Team feedback session on hook effectiveness

### Quarterly Tasks
- [ ] Comprehensive hook system review
- [ ] Update documentation
- [ ] Security pattern overhaul
- [ ] Team training on new features

## 📊 Performance Monitoring

### Monitoring Hook Execution Times

Run the performance analysis script:
```bash
./hooks/analyze-performance.sh
```

Expected output:
```
Hook Performance Analysis (Last 7 Days)
=====================================
commit-msg:           avg: 0.05s, max: 0.12s, calls: 234
pre-commit-v2-only:   avg: 0.08s, max: 0.15s, calls: 156
pre-commit-security:  avg: 2.30s, max: 5.10s, calls: 89
pre-commit-api-docs:  avg: 0.45s, max: 1.20s, calls: 67
pre-push:             avg: 0.15s, max: 0.30s, calls: 78

Performance Status: ✅ HEALTHY
```

### Performance Thresholds

| Hook | Target Avg | Max Allowed | Action if Exceeded |
|------|------------|-------------|-------------------|
| commit-msg | < 0.1s | 0.5s | Optimize regex patterns |
| pre-commit-* | < 2s | 5s | Review hook logic |
| pre-push | < 0.5s | 2s | Check network calls |
| security scans | < 5s | 10s | Update scan tools |

### Optimizing Slow Hooks

1. **Identify bottlenecks**
   ```bash
   # Profile hook execution
   time ./hooks/pre-commit-security
   
   # Add debug logging
   export HOOK_DEBUG=true
   ./hooks/pre-commit-security
   ```

2. **Common optimizations**
   - Cache expensive operations
   - Parallelize independent checks
   - Skip unchanged files
   - Use more efficient tools

3. **Example optimization**
   ```bash
   # Before: Scanning all files
   find . -name "*.py" | xargs grep -n "password"
   
   # After: Only scan changed files
   git diff --cached --name-only | grep "\.py$" | xargs grep -n "password"
   ```

## 📝 Log Analysis

### Log Locations

- Git hooks: `/Users/bossio/6fb-booking/hooks/hooks.log`
- Claude Code hooks: `/Users/bossio/6fb-booking/.claude/hooks.log`
- CI/CD: GitHub Actions logs
- Performance: `/Users/bossio/6fb-booking/hooks/performance.log`

### Analyzing Logs

1. **Check for errors**
   ```bash
   # Find all errors in last 24 hours
   grep "ERROR" hooks/hooks.log | grep "$(date -d '1 day ago' '+%Y-%m-%d')"
   
   # Count hook failures by type
   grep "FAIL" hooks/hooks.log | awk '{print $3}' | sort | uniq -c
   ```

2. **Identify patterns**
   ```bash
   # Most common failure reasons
   grep "Invalid" hooks/hooks.log | sort | uniq -c | sort -rn | head -10
   
   # Bypass usage analysis
   grep "BYPASS" hooks/hooks.log | awk '{print $4, $5}' | sort | uniq -c
   ```

3. **Performance trends**
   ```bash
   # Average execution times by day
   awk '/execution_time/ {print $1, $5}' performance.log | \
     awk '{date=$1; time=$2; sum[date]+=time; count[date]++} \
     END {for (d in sum) print d, sum[d]/count[d]}' | sort
   ```

### Log Rotation

Set up automatic log rotation:
```bash
# /etc/logrotate.d/bookedbarber-hooks
/Users/bossio/6fb-booking/hooks/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 user group
}
```

## 🔄 Update Procedures

### Updating Individual Hooks

1. **Test new version**
   ```bash
   # Backup current hook
   cp hooks/pre-commit-security hooks/pre-commit-security.backup
   
   # Test new version
   ./new-hooks/pre-commit-security --test
   ```

2. **Deploy update**
   ```bash
   # Replace hook
   cp new-hooks/pre-commit-security hooks/pre-commit-security
   chmod +x hooks/pre-commit-security
   
   # Update all installations
   ./hooks/install-hooks.sh --update
   ```

3. **Verify update**
   ```bash
   # Run test suite
   ./hooks/test-hooks-system.sh
   
   # Check version
   ./hooks/pre-commit-security --version
   ```

### Updating Hook Configurations

1. **Security patterns**
   ```bash
   # Edit patterns file
   vim hooks/config/security-patterns.json
   
   # Validate JSON
   python -m json.tool hooks/config/security-patterns.json
   
   # Test with sample files
   ./hooks/test-security-patterns.sh
   ```

2. **Performance thresholds**
   ```bash
   # Update thresholds
   vim hooks/config/performance-thresholds.json
   
   # Apply to monitoring
   ./hooks/update-monitoring-config.sh
   ```

### Rolling Back Updates

If an update causes issues:
```bash
# Quick rollback
./hooks/rollback-hooks.sh

# Manual rollback
cp hooks/*.backup hooks/
./hooks/install-hooks.sh --force
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Hook Not Executing
**Symptoms**: Changes committed without validation

**Diagnosis**:
```bash
# Check if hook is installed
ls -la .git/hooks/

# Verify hook is executable
test -x .git/hooks/pre-commit && echo "Executable" || echo "Not executable"

# Check git config
git config --get core.hooksPath
```

**Solution**:
```bash
# Reinstall hooks
./hooks/install-hooks.sh --force

# Fix permissions
chmod +x .git/hooks/*
```

#### 2. Hook Timeout
**Symptoms**: Hook hangs or times out

**Diagnosis**:
```bash
# Run with timeout debugging
HOOK_DEBUG=true HOOK_TIMEOUT=60 ./hooks/pre-commit-security
```

**Solution**:
```bash
# Increase timeout
export HOOK_TIMEOUT=120

# Skip slow checks temporarily
export SKIP_DEEP_SCAN=true
```

#### 3. False Positives
**Symptoms**: Valid code flagged as problematic

**Diagnosis**:
```bash
# Test specific pattern
echo "your code" | ./hooks/test-pattern.sh security
```

**Solution**:
```bash
# Add exclusion pattern
echo "pattern:exclude" >> hooks/config/exclusions.txt

# Or inline exclusion
# your_code  # hook-ignore: security
```

#### 4. Performance Degradation
**Symptoms**: Hooks running slowly over time

**Diagnosis**:
```bash
# Check cache size
du -sh hooks/.cache/

# Profile execution
/usr/bin/time -v ./hooks/pre-commit-security
```

**Solution**:
```bash
# Clear cache
rm -rf hooks/.cache/*

# Optimize file scanning
./hooks/optimize-file-scan.sh
```

### Debug Mode

Enable comprehensive debugging:
```bash
# Set all debug flags
export HOOK_DEBUG=true
export HOOK_LOG_LEVEL=DEBUG
export HOOK_TRACE=true
export HOOK_PROFILE=true

# Run hook
./hooks/pre-commit-security

# Check debug output
tail -f hooks/debug.log
```

## 💾 Backup and Recovery

### Backup Strategy

1. **Automated backups**
   ```bash
   # Daily backup script
   #!/bin/bash
   BACKUP_DIR="/backups/hooks/$(date +%Y%m%d)"
   mkdir -p "$BACKUP_DIR"
   
   # Backup hooks
   cp -r hooks/ "$BACKUP_DIR/"
   
   # Backup configurations
   cp -r .claude/ "$BACKUP_DIR/"
   
   # Backup logs
   tar -czf "$BACKUP_DIR/logs.tar.gz" hooks/*.log
   ```

2. **Version control**
   ```bash
   # Tag stable versions
   git tag -a hooks-v1.2.0 -m "Stable hooks release"
   git push origin hooks-v1.2.0
   ```

### Recovery Procedures

1. **From backup**
   ```bash
   # List available backups
   ls -la /backups/hooks/
   
   # Restore from specific date
   ./hooks/restore-from-backup.sh 20250630
   ```

2. **From git**
   ```bash
   # List tagged versions
   git tag -l "hooks-*"
   
   # Restore specific version
   git checkout hooks-v1.1.0 -- hooks/
   ```

3. **Emergency recovery**
   ```bash
   # Disable all hooks temporarily
   export DISABLE_ALL_HOOKS=true
   
   # Fix issues
   # ...
   
   # Re-enable hooks
   unset DISABLE_ALL_HOOKS
   ./hooks/install-hooks.sh
   ```

## 🔐 Security Updates

### Security Pattern Updates

1. **Monitor for new patterns**
   - Subscribe to security advisories
   - Review OWASP updates
   - Check language-specific security guides

2. **Test new patterns**
   ```bash
   # Add pattern to test config
   echo 'new_pattern: "regex_here"' >> hooks/config/test-patterns.yml
   
   # Run against test files
   ./hooks/test-security-patterns.sh --new-only
   ```

3. **Deploy patterns**
   ```bash
   # Add to production config
   ./hooks/add-security-pattern.sh "pattern_name" "regex"
   
   # Notify team
   ./hooks/notify-team.sh "New security pattern added: pattern_name"
   ```

### Vulnerability Response

When a new vulnerability is discovered:

1. **Immediate response**
   ```bash
   # Add emergency pattern
   ./hooks/emergency-pattern.sh "CVE-2025-XXXX" "detection_regex"
   
   # Force update all installations
   ./hooks/force-update-all.sh
   ```

2. **Team notification**
   ```bash
   # Send alert
   ./hooks/security-alert.sh "Critical: New vulnerability pattern added"
   ```

3. **Audit existing code**
   ```bash
   # Scan entire codebase
   ./hooks/security-audit.sh --full --pattern="CVE-2025-XXXX"
   ```

## 👥 Team Management

### Onboarding New Team Members

1. **Setup checklist**
   - [ ] Install hooks: `./hooks/install-hooks.sh`
   - [ ] Read onboarding guide
   - [ ] Run test commits
   - [ ] Review recent commits for examples
   - [ ] Attend hooks training session

2. **Training materials**
   - Developer onboarding guide
   - Video tutorials
   - Practice exercises
   - FAQ document

### Team Metrics

Track team adoption and effectiveness:
```bash
# Generate team metrics report
./hooks/team-metrics.sh --last-month

# Sample output:
Team Hooks Usage Report
======================
Total commits: 1,234
Hooks passed: 1,180 (95.6%)
Hooks failed: 54 (4.4%)
Bypasses used: 3 (0.2%)

Top failure reasons:
1. Invalid commit message format (23)
2. Missing API documentation (15)
3. Security pattern detected (10)

Most active contributors:
1. developer1 (234 commits, 98% pass rate)
2. developer2 (189 commits, 96% pass rate)
```

### Feedback Loop

1. **Monthly survey**
   ```bash
   # Send feedback survey
   ./hooks/send-feedback-survey.sh
   
   # Analyze responses
   ./hooks/analyze-feedback.sh
   ```

2. **Improvement tracking**
   - Log enhancement requests
   - Prioritize based on impact
   - Implement iteratively
   - Measure effectiveness

### Policy Updates

When updating hook policies:

1. **Announce changes**
   ```bash
   # Draft announcement
   ./hooks/draft-policy-update.sh
   
   # Review with team leads
   # Deploy in stages
   ```

2. **Grace period**
   ```bash
   # Enable warning mode
   ./hooks/set-mode.sh --warning-only --days=7
   
   # Then enforce
   ./hooks/set-mode.sh --enforce
   ```

## 📈 Continuous Improvement

### Metrics to Track

1. **Hook effectiveness**
   - False positive rate
   - True positive rate
   - Developer satisfaction
   - Time saved from prevented issues

2. **Performance metrics**
   - Average execution time
   - 95th percentile time
   - Resource usage
   - Cache hit rates

3. **Adoption metrics**
   - Hook bypass frequency
   - First-time failure rate
   - Time to resolution
   - Training effectiveness

### Improvement Process

1. **Collect data**
   ```bash
   # Weekly metrics collection
   ./hooks/collect-metrics.sh --week
   ```

2. **Analyze trends**
   ```bash
   # Generate trend report
   ./hooks/trend-analysis.sh --last-quarter
   ```

3. **Implement improvements**
   - Optimize slow hooks
   - Reduce false positives
   - Enhance user messages
   - Simplify complex checks

4. **Measure impact**
   ```bash
   # Before/after comparison
   ./hooks/impact-analysis.sh --change="optimization-xyz"
   ```

---

## 🚀 Quick Reference

### Essential Commands

```bash
# Test all hooks
./hooks/test-hooks-system.sh

# Check performance
./hooks/analyze-performance.sh

# Update hooks
./hooks/install-hooks.sh --update

# Full system audit
./hooks/audit-system.sh

# Emergency disable
export DISABLE_ALL_HOOKS=true

# Generate report
./hooks/generate-report.sh --monthly
```

### Important Files

- Main config: `hooks/config/hooks.yml`
- Security patterns: `hooks/config/security-patterns.json`
- Performance thresholds: `hooks/config/performance.json`
- Team policies: `hooks/config/policies.md`
- Logs: `hooks/*.log`

### Support Contacts

- Technical issues: dev-hooks@bookedbarber.com
- Security concerns: security@bookedbarber.com
- Feature requests: Submit via GitHub issues

---

*Last Updated: 2025-07-02*
*Version: 1.0.0*
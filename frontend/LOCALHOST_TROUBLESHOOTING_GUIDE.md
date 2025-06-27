# 6FB Booking Frontend - Localhost Troubleshooting Guide

This comprehensive guide provides everything you need to diagnose and fix localhost connectivity issues for the 6FB booking platform frontend.

## 🚀 Quick Start

**One-Command Solution:**
```bash
npm run fix-localhost
```

This master command automatically detects, diagnoses, and fixes common localhost issues.

## 📋 Available Commands

### Primary Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run fix-localhost` | Quick fix mode - automatic diagnosis and repair | First line of defense |
| `npm run fix-localhost -- --full` | Full diagnostic mode - comprehensive analysis | When quick fix isn't enough |
| `npm run fix-localhost -- --nuclear` | Nuclear option - complete environment reset | Last resort |
| `npm run fix-localhost -- --dry-run` | Preview mode - shows what would be done | Safe testing |

### Diagnostic Commands

| Command | Description | Output |
|---------|-------------|--------|
| `npm run diagnose` | Network and connectivity diagnostics | Detailed analysis report |
| `npm run debug:extensions` | Browser extension compatibility check | Extension conflict report |
| `npm run clear-cache` | Clear all localhost caches | Cache cleanup log |

### Utility Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run kill-port` | Kill processes on port 3000 | Port conflicts |
| `npm run clean` | Clear Next.js build cache | Build issues |
| `npm run dev:safe` | Safe development start | Clean startup |

## 🎯 Troubleshooting Modes

### Quick Fix Mode (Default)
- **Duration:** 30-60 seconds
- **Actions:** Cache clearing, port cleanup, basic diagnostics
- **Best for:** Common daily issues

```bash
npm run fix-localhost
```

### Full Diagnostic Mode
- **Duration:** 2-5 minutes
- **Actions:** Comprehensive analysis, advanced fixes, detailed reporting
- **Best for:** Persistent issues, thorough investigation

```bash
npm run fix-localhost -- --full
```

### Nuclear Option
- **Duration:** 5-10 minutes
- **Actions:** Complete environment reset, dependency reinstall
- **Best for:** Severely corrupted development environment

```bash
npm run fix-localhost -- --nuclear
```

⚠️ **Warning:** Nuclear option will reinstall all dependencies and may take significant time.

## 🔍 What Gets Checked

### Phase 1: Pre-flight Checks
- [ ] Node.js and npm versions
- [ ] Git repository status
- [ ] Available system memory
- [ ] Port availability (3000, 8000)

### Phase 2: Network Diagnostics
- [ ] DNS resolution (localhost, 127.0.0.1)
- [ ] Network interface configuration
- [ ] Hosts file entries
- [ ] Proxy settings detection
- [ ] Firewall status

### Phase 3: Extension Analysis
- [ ] Browser extension detection
- [ ] CORS header testing
- [ ] Resource blocking analysis
- [ ] Connectivity testing to all endpoints

### Phase 4: Automatic Fixes
- [ ] Cache clearing (DNS, browser, npm, Next.js)
- [ ] Port conflict resolution
- [ ] Network state reset
- [ ] Dependency issues (if needed)

### Phase 5: Verification
- [ ] Frontend connectivity (http://localhost:3000)
- [ ] Backend connectivity (http://localhost:8000)
- [ ] API endpoint testing
- [ ] Overall system health score

## 📊 Understanding the Results

### Success Indicators
- ✅ **Verification Score: 80-100** - Environment is healthy
- ✅ **All endpoints responding** - Connectivity established
- ✅ **No critical issues found** - Ready for development

### Warning Signs
- ⚠️ **Verification Score: 60-79** - Some issues remain
- ⚠️ **Browser extensions detected** - May cause interference
- ⚠️ **Port conflicts present** - May need manual resolution

### Failure Indicators
- ❌ **Verification Score: 0-59** - Manual intervention required
- ❌ **Critical endpoints failing** - Development not possible
- ❌ **System resource issues** - Hardware/configuration problems

## 🛠️ Manual Troubleshooting

### Common Issues and Solutions

#### Port 3000 Already in Use
```bash
# Kill the process
npm run kill-port

# Or find and kill manually
lsof -ti:3000 | xargs kill -9

# Use alternative port
npm run dev -- -p 3001
```

#### API Connection Failed (Port 8000)
```bash
# Check if backend is running
curl -I http://localhost:8000/api/v1/auth/health

# Start backend (from backend directory)
cd ../backend && uvicorn main:app --reload --port 8000
```

#### DNS Resolution Issues
```bash
# Check hosts file
cat /etc/hosts | grep localhost

# Should contain:
# 127.0.0.1 localhost

# Clear DNS cache (macOS)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Clear DNS cache (Linux)
sudo systemctl restart systemd-resolved
```

#### Browser Extension Conflicts
```bash
# Test for extension issues
npm run debug:extensions

# Test in incognito mode
# Chrome: Cmd+Shift+N
# Firefox: Cmd+Shift+P
# Safari: Cmd+Shift+N
```

#### Next.js Build Issues
```bash
# Clear all caches
npm run clean

# Rebuild from scratch
rm -rf .next node_modules/.cache
npm run build
```

#### Complete Environment Reset
```bash
# Nuclear option - use with caution
npm run fix-localhost -- --nuclear

# Manual nuclear option
rm -rf node_modules package-lock.json .next
npm install
```

## 📄 Generated Reports

The troubleshooter generates detailed reports for analysis:

### Log Files
- **Location:** `logs/troubleshoot-YYYY-MM-DD.log`
- **Content:** Detailed execution log with timestamps
- **Use:** Debugging, sharing with team

### Report Files
- **Location:** `logs/troubleshoot-report-TIMESTAMP.json`
- **Content:** Structured data with all diagnostic results
- **Use:** Automated analysis, integration with tools

### Sample Report Structure
```json
{
  "startTime": "2025-06-27T10:30:00.000Z",
  "severity": "full",
  "phases": {
    "phase1": { "name": "Pre-flight Checks", "issues": [], "fixes": [] },
    "phase2": { "name": "Network Diagnostics", "issues": [], "fixes": [] },
    "phase3": { "name": "Extension Analysis", "issues": [], "fixes": [] },
    "phase4": { "name": "Automatic Fixes", "issues": [], "fixes": [] },
    "phase5": { "name": "Verification", "score": 95 }
  },
  "summary": {
    "status": "success",
    "verificationScore": 95,
    "totalIssues": 2,
    "successfulFixes": 2
  },
  "recommendations": []
}
```

## 🔧 Browser-Specific Configuration

### Chrome
```bash
# Disable web security for development
chrome --disable-web-security --disable-features=VizDisplayCompositor --user-data-dir=/tmp/chrome_dev

# Common extension settings
# uBlock Origin: Dashboard → Whitelist → Add localhost domains
# Privacy Badger: Click icon → Disable on this site
```

### Firefox
```bash
# about:config settings
dom.security.https_only_mode = false
security.tls.insecure_fallback_hosts = localhost,127.0.0.1
```

### Safari
```bash
# Develop menu (enable in Preferences)
# Develop → Disable Local File Restrictions
# Develop → Disable Cross-Origin Restrictions
```

## 🚨 Emergency Procedures

### Complete System Recovery
If all else fails, use this nuclear recovery procedure:

```bash
# 1. Stop all development processes
pkill -f "next\|npm\|node"

# 2. Clean everything
rm -rf node_modules package-lock.json .next logs

# 3. Reset git state (optional)
git stash
git clean -fd

# 4. Fresh install
npm install

# 5. Test installation
npm run fix-localhost -- --full

# 6. Start development
npm run dev
```

### Rollback Procedure
If troubleshooting breaks your environment:

```bash
# Restore from git
git stash pop  # If you stashed changes
git checkout -- .  # Reset any modified files

# Or restore from backup
npm run rollback:execute  # If you have rollback checkpoints
```

## 📞 Getting Help

### Self-Diagnosis Checklist
Before asking for help, run through this checklist:

- [ ] Ran `npm run fix-localhost -- --full`
- [ ] Checked generated log files
- [ ] Tested in incognito mode
- [ ] Verified both frontend and backend are running
- [ ] Checked for system updates
- [ ] Reviewed browser extension list

### Sharing Diagnostic Information
When requesting help, provide:

1. **Command used:** Full command with arguments
2. **Log file:** `logs/troubleshoot-YYYY-MM-DD.log`
3. **Report file:** `logs/troubleshoot-report-TIMESTAMP.json`
4. **Environment:** OS, Node version, browser version
5. **Error messages:** Exact error text from console

### Quick Support Commands
```bash
# Generate support package
npm run fix-localhost -- --full --verbose > support-info.log 2>&1

# System information
node --version && npm --version && uname -a

# Network configuration
ifconfig | grep inet && cat /etc/hosts | grep localhost
```

## 🔄 Integration with Development Workflow

### Pre-Development Routine
```bash
# Quick health check before starting work
npm run fix-localhost

# If issues found, run full diagnostic
npm run fix-localhost -- --full

# Start development
npm run dev
```

### CI/CD Integration
The troubleshooter can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Troubleshoot localhost
  run: npm run fix-localhost -- --full --silent
  continue-on-error: true
```

### Team Onboarding
New team members should run:

```bash
# Initial setup verification
npm install
npm run fix-localhost -- --full
npm run dev
```

## 📈 Performance Considerations

### Resource Usage
- **Quick mode:** Minimal resource usage
- **Full mode:** Moderate CPU/network usage
- **Nuclear mode:** High resource usage during reinstall

### Timing Guidelines
- **Daily use:** Quick mode (30-60s)
- **Weekly maintenance:** Full mode (2-5min)
- **Emergency recovery:** Nuclear mode (5-10min)

### Automation Tips
```bash
# Add to shell profile for daily use
alias fix-local="cd /path/to/frontend && npm run fix-localhost"

# Cron job for maintenance (optional)
0 9 * * 1 cd /path/to/frontend && npm run fix-localhost -- --full --silent
```

---

## 🤝 Contributing

To extend the troubleshooting system:

1. **Add new diagnostic checks** in `localhost-diagnostics.js`
2. **Add new fix procedures** in `master-localhost-troubleshooter.js`
3. **Update this guide** with new procedures
4. **Test thoroughly** across different environments

## 📚 Related Documentation

- [Browser Extension Troubleshooting](./BROWSER_EXTENSION_TROUBLESHOOTING.md)
- [Development Setup Guide](../README.md)
- [Deployment Guide](../../DEPLOYMENT_GUIDE.md)

---

*Last updated: 2025-06-27*
*Version: 1.0.0*

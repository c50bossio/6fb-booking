# 🚨 Localhost Emergency Procedures & Escalation Guide

This guide provides step-by-step emergency procedures for critical localhost failures and clear escalation paths when standard troubleshooting fails.

## 🎯 Quick Emergency Reference

### Severity Levels
- **🟢 Level 1**: Minor issue (5 min fix)
- **🟡 Level 2**: Moderate issue (15 min fix)
- **🟠 Level 3**: Major issue (30 min fix)
- **🔴 Level 4**: Critical failure (1+ hour fix)
- **⚫ Level 5**: Complete system failure (requires team help)

### Emergency Hotkeys
```bash
# Copy these to your terminal now!
alias emergency-fix='npm run emergency:fix'
alias nuclear-fix='npm run fix-localhost -- --nuclear'
alias save-work='git stash push -m "Emergency stash $(date +%Y%m%d-%H%M%S)"'
alias kill-all='pkill -f "next|npm|node"'
```

---

## 🔴 Critical Failure Scenarios

### Scenario 1: Complete Development Environment Failure
**Symptoms**: Nothing works, all commands fail, can't start any servers

**Emergency Response**:
```bash
# Step 1: Save your work
git stash push -m "Emergency: Complete failure $(date)"

# Step 2: Nuclear cleanup
pkill -f "next|npm|node|localhost"
rm -rf node_modules package-lock.json .next .cache logs

# Step 3: System cleanup
# macOS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Step 4: Fresh install
npm cache clean --force
npm install

# Step 5: Validate
npm run dev:validate:paranoid

# Step 6: Attempt recovery
npm run fix-localhost -- --nuclear
```

### Scenario 2: Corrupted Node Modules
**Symptoms**: Strange errors, missing modules, version conflicts

**Emergency Response**:
```bash
# Quick attempt
rm -rf node_modules/.cache
npm run emergency:fix

# If that fails - Manual nuclear
rm -rf node_modules package-lock.json
rm -rf ~/.npm/_cacache
npm install --force
```

### Scenario 3: Port Apocalypse
**Symptoms**: No ports available, kill-port not working

**Emergency Response**:
```bash
# Find all Node processes
lsof -i :3000-8000 | grep LISTEN

# Nuclear port cleanup
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:8000 | xargs kill -9

# Verify ports are free
nc -zv localhost 3000 2>&1 | grep -q "refused" && echo "Port 3000 is free"
nc -zv localhost 8000 2>&1 | grep -q "refused" && echo "Port 8000 is free"

# System restart if needed
sudo killall -9 node
```

### Scenario 4: DNS/Network Complete Failure
**Symptoms**: Cannot resolve localhost, no network connectivity

**Emergency Response**:
```bash
# Step 1: Verify hosts file
cat /etc/hosts | grep localhost
# Should show: 127.0.0.1 localhost

# Step 2: Reset if missing
echo "127.0.0.1 localhost" | sudo tee -a /etc/hosts

# Step 3: Flush all DNS
# macOS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
sudo killall -HUP mDNSResponderHelper

# Step 4: Reset network interfaces
sudo ifconfig lo0 down
sudo ifconfig lo0 up

# Step 5: Test
ping -c 1 localhost
```

---

## 📞 Escalation Procedures

### Level 1 Escalation: Self-Service (0-15 minutes)
```bash
# Try these in order:
npm run fix-localhost
npm run fix-localhost -- --full
npm run fix-localhost -- --nuclear
npm run emergency:fix
```

### Level 2 Escalation: Team Resources (15-30 minutes)
1. **Check Team Knowledge Base**
   - Slack: Search #6fb-localhost-help
   - Wiki: Development → Localhost Issues
   - Previous issue tickets

2. **Run Diagnostic Package**
   ```bash
   # Generate full diagnostic report
   npm run fix-localhost -- --full --verbose > diagnostic-report.txt 2>&1
   npm run debug:extensions >> diagnostic-report.txt
   npm run diagnose >> diagnostic-report.txt
   echo "=== System Info ===" >> diagnostic-report.txt
   node --version >> diagnostic-report.txt
   npm --version >> diagnostic-report.txt
   uname -a >> diagnostic-report.txt
   ```

3. **Share in Team Channel**
   ```
   @here Localhost Emergency - Level 2
   Environment: [Dev/Staging/Local]
   Duration: [How long has it been down]
   Tried: [What you've tried]
   Diagnostic: [Attach diagnostic-report.txt]
   ```

### Level 3 Escalation: Senior Developer (30-60 minutes)
1. **Prepare Detailed Report**
   ```bash
   # Create emergency report
   mkdir emergency-$(date +%Y%m%d-%H%M%S)
   cd emergency-*

   # Collect all logs
   cp ../logs/* .
   npm run fix-localhost -- --full --verbose > full-diagnostic.log 2>&1

   # System state
   ps aux | grep -E "node|npm|next" > processes.txt
   lsof -i :3000-8000 > ports.txt

   # Git state
   git status > git-status.txt
   git log --oneline -10 > git-log.txt
   ```

2. **Contact Senior Developer**
   - Slack DM with @senior-dev
   - Include emergency report
   - Be available for screen share

### Level 4 Escalation: Team Lead (1+ hours)
1. **Business Impact Assessment**
   ```markdown
   ## Emergency Escalation Report

   **Impact Level**: Critical
   **Duration**: X hours
   **Affected**: [Who/What is blocked]
   **Business Impact**: [Deliverables at risk]

   **Attempted Solutions**:
   1. All standard troubleshooting (failed)
   2. Senior developer assistance (failed)
   3. Fresh environment setup (failed)

   **Recommendation**: [Your suggested next steps]
   ```

2. **Initiate Emergency Protocol**
   - Schedule emergency team call
   - Consider alternative environments
   - Evaluate rollback options

### Level 5 Escalation: Infrastructure Team (2+ hours)
- System-level issues
- Network infrastructure problems
- Security software interference
- Hardware failures

---

## 🛠️ Emergency Recovery Toolbox

### The Nuclear Option Script
```bash
#!/bin/bash
# save as: nuclear-recovery.sh

echo "🔴 NUCLEAR RECOVERY INITIATED 🔴"
echo "This will destroy your local environment!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo "Step 1: Saving work..."
git stash push -m "Nuclear recovery $(date)"

echo "Step 2: Killing all processes..."
pkill -f "node|npm|next|react|webpack"

echo "Step 3: Removing EVERYTHING..."
rm -rf node_modules package-lock.json .next .cache logs
rm -rf ~/.npm ~/.cache/typescript ~/.cache/webpack

echo "Step 4: Clean install..."
npm cache clean --force
npm install

echo "Step 5: Full validation..."
npm run dev:validate:paranoid

echo "✅ Nuclear recovery complete"
```

### Quick Recovery Checklist
```bash
# Save this as: quick-recovery.sh
#!/bin/bash

echo "🚑 Quick Recovery Checklist"
echo "=========================="

# Check basics
echo -n "✓ Node installed: "
node --version

echo -n "✓ NPM installed: "
npm --version

echo -n "✓ Git status clean: "
git status --porcelain | wc -l

echo -n "✓ Port 3000 free: "
lsof -ti:3000 > /dev/null 2>&1 && echo "NO ❌" || echo "YES ✅"

echo -n "✓ Port 8000 free: "
lsof -ti:8000 > /dev/null 2>&1 && echo "NO ❌" || echo "YES ✅"

echo -n "✓ Localhost resolves: "
ping -c 1 localhost > /dev/null 2>&1 && echo "YES ✅" || echo "NO ❌"

echo -n "✓ node_modules exists: "
[ -d "node_modules" ] && echo "YES ✅" || echo "NO ❌"

echo -n "✓ .next exists: "
[ -d ".next" ] && echo "YES ✅" || echo "NO ❌"
```

---

## 🔄 Recovery Procedures by Time

### 1-Minute Recovery
```bash
npm run fix-localhost
```

### 5-Minute Recovery
```bash
npm run kill-port
npm run clear-cache
npm run fix-localhost -- --full
```

### 15-Minute Recovery
```bash
git stash
npm run emergency:fix
npm run dev:validate:full
git stash pop
```

### 30-Minute Recovery
```bash
# Full environment reset
./nuclear-recovery.sh
```

### 1-Hour Recovery
```bash
# Complete fresh start
cd ..
mv 6fb-booking 6fb-booking-broken-$(date +%Y%m%d)
git clone [repository] 6fb-booking
cd 6fb-booking/frontend
npm install
npm run dev:orchestrated
```

---

## 📊 Emergency Decision Matrix

| Symptom | First Try | If Fails | Last Resort |
|---------|-----------|----------|-------------|
| Port conflict | `kill-port` | Manual kill | Restart machine |
| API not working | Check backend | `fix-localhost` | Fresh clone |
| Extensions blocking | Incognito mode | Disable all | New browser |
| Build errors | `clean` | `emergency:fix` | Delete .next |
| Network errors | `diagnose` | Reset DNS | Check firewall |
| Everything broken | `nuclear` | Fresh clone | Call for help |

---

## 🚁 Emergency Communication Templates

### Slack Emergency Message
```
🚨 **LOCALHOST EMERGENCY** 🚨

**Severity**: [1-5]
**Duration**: [time down]
**Impact**: [what's blocked]

**Issue**: [brief description]

**Tried**:
- ✅ fix-localhost
- ✅ fix-localhost --full
- ❌ fix-localhost --nuclear (failed)

**Need**: [what help you need]

**Diagnostic**: [attach report]
```

### Email Escalation Template
```
Subject: [URGENT] Localhost Development Environment Critical Failure

Team,

I'm experiencing a critical localhost environment failure that is blocking development.

IMPACT:
- Duration: X hours
- Blocked: [feature/task]
- Deadline risk: [yes/no]

ATTEMPTED SOLUTIONS:
1. Standard troubleshooting (failed)
2. Nuclear recovery (failed)
3. Fresh environment (failed)

NEXT STEPS NEEDED:
- [Suggested action]

Diagnostic report attached.

[Your name]
```

---

## 🔧 Post-Emergency Actions

### After Recovery
1. **Document the issue**
   ```bash
   echo "Date: $(date)" >> emergency-log.md
   echo "Issue: [description]" >> emergency-log.md
   echo "Solution: [what worked]" >> emergency-log.md
   echo "Prevention: [how to avoid]" >> emergency-log.md
   ```

2. **Update team knowledge base**
   - Add to troubleshooting guide
   - Share in team channel
   - Create prevention task

3. **Implement prevention**
   - Add check to validation
   - Update monitoring rules
   - Enhance troubleshooting tools

### Root Cause Analysis Template
```markdown
## Localhost Emergency RCA

**Date**:
**Duration**:
**Severity**:

**What Happened**:
[Timeline of events]

**Root Cause**:
[Actual cause discovered]

**Impact**:
[What was affected]

**Resolution**:
[How it was fixed]

**Prevention**:
[Steps to prevent recurrence]

**Action Items**:
- [ ] Update documentation
- [ ] Add validation check
- [ ] Share with team
```

---

## 🎯 Emergency Prevention

### Daily Habits
1. Commit work frequently
2. Run validation before important work
3. Monitor system resources
4. Keep logs of issues

### Weekly Tasks
1. Clean environment
2. Update dependencies
3. Review error logs
4. Test emergency procedures

### Monthly Reviews
1. Analyze emergency frequency
2. Update procedures
3. Train team members
4. Improve tools

---

## 📱 Emergency Contacts

### Internal Resources
- Team Slack: #6fb-localhost-help
- Senior Dev: @senior-dev-username
- Team Lead: @team-lead-username
- DevOps: @devops-username

### External Resources
- Next.js Discord: https://nextjs.org/discord
- Stack Overflow: Tag [nextjs] [localhost]
- GitHub Issues: [repository]/issues

### Documentation
- This guide: LOCALHOST_EMERGENCY_PROCEDURES.md
- Main guide: LOCALHOST_PREVENTION_SYSTEM_GUIDE.md
- Quick ref: LOCALHOST_QUICK_REFERENCE.md

---

**Remember**: Stay calm, follow procedures, and don't hesitate to escalate. Every emergency is a learning opportunity to improve our systems.

*Emergency Guide Version 1.0.0 | Last Updated: 2025-06-27*

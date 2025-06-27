# 🎯 Localhost Prevention System - Team Onboarding Guide

Welcome to the 6FB Booking development team! This guide will help you set up and understand our localhost connectivity prevention system, ensuring you have a smooth development experience from day one.

## 📚 Table of Contents
1. [System Overview](#system-overview)
2. [Day 1: Initial Setup](#day-1-initial-setup)
3. [Day 2: Understanding the Tools](#day-2-understanding-the-tools)
4. [Day 3: Practice Scenarios](#day-3-practice-scenarios)
5. [Week 1: Daily Workflows](#week-1-daily-workflows)
6. [Common Scenarios](#common-scenarios)
7. [Team Resources](#team-resources)
8. [Certification Checklist](#certification-checklist)

---

## 🌟 System Overview

### Why We Built This
Before this system, developers lost hours debugging localhost connectivity issues caused by:
- Port conflicts
- Browser extensions
- DNS cache problems
- Build cache corruption
- Network configuration issues

### What It Does
Our prevention system:
- **Prevents** issues before they happen
- **Detects** problems automatically
- **Diagnoses** root causes quickly
- **Fixes** issues with one command
- **Monitors** health continuously

### Core Philosophy
1. **Prevention First** - Catch issues before they impact you
2. **Progressive Solutions** - Start simple, escalate if needed
3. **One Command** - Most problems solved with a single command
4. **Team Consistency** - Everyone uses the same tools and workflows

---

## 🚀 Day 1: Initial Setup

### Prerequisites Checklist
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 8+ installed (`npm --version`)
- [ ] Git configured
- [ ] Access to 6FB repository
- [ ] Chrome or Firefox installed

### Step 1: Clone and Install
```bash
# Clone the repository
git clone [repository-url]
cd 6fb-booking/frontend

# Install dependencies
npm install
```

### Step 2: Initial Validation
```bash
# Run comprehensive validation
npm run dev:validate:full

# If any issues are found, fix them
npm run fix-localhost -- --full
```

### Step 3: Configure Your Browser
```bash
# Run interactive browser configuration
./scripts/configure-development-browser.sh

# This will:
# - Create a development browser profile
# - Configure extension settings
# - Generate launch scripts
```

### Step 4: First Development Start
```bash
# Use the orchestrated startup (recommended)
npm run dev:orchestrated

# This will:
# 1. Validate your environment
# 2. Fix any issues found
# 3. Start health monitoring
# 4. Launch the development server
```

### Step 5: Verify Everything Works
1. Open http://localhost:3000 in your browser
2. Check for the Extension Detector popup (if you have extensions)
3. Verify you can see the application
4. Check console for any errors

### End of Day 1 Checklist
- [ ] Development environment running
- [ ] Browser configured for development
- [ ] Can access localhost:3000
- [ ] Understand basic `npm run dev:orchestrated` command

---

## 🛠️ Day 2: Understanding the Tools

### Morning: The Master Troubleshooter
Our primary tool for fixing issues:

```bash
# Three severity levels
npm run fix-localhost              # Quick (30-60s)
npm run fix-localhost -- --full    # Full (2-5min)
npm run fix-localhost -- --nuclear # Nuclear (5-10min)

# Safe preview mode
npm run fix-localhost -- --dry-run
```

**Exercise 1**: Run each mode in dry-run to see what they do

### Afternoon: Development Startup Modes
Different ways to start development:

```bash
# Four startup modes
npm run dev:orchestrated   # Recommended: Full protection
npm run dev:express       # Fast: Minimal checks
npm run dev:safe         # Balanced: Standard checks
npm run dev:bulletproof  # Paranoid: Maximum protection
```

**Exercise 2**: Try each startup mode and note the differences

### Understanding Health Monitoring
```bash
# Start monitoring in background
npm run dev:monitor

# View monitoring dashboard
npm run dev:dashboard

# Check logs
tail -f logs/dev-health-*.log
```

**Exercise 3**: Start monitoring and trigger some issues to see alerts

### Extension Detection
```bash
# Run extension compatibility check
npm run debug:extensions

# In browser console
window.runExtensionDetection()
```

**Exercise 4**: Identify any problematic extensions you have

### End of Day 2 Checklist
- [ ] Understand troubleshooter severity levels
- [ ] Know different startup modes
- [ ] Can run health monitoring
- [ ] Checked browser extensions

---

## 🎮 Day 3: Practice Scenarios

### Scenario 1: Port Conflict
**Setup**: Start another process on port 3000
```bash
# In another terminal
npx http-server -p 3000
```

**Fix**:
```bash
npm run kill-port
# or
npm run fix-localhost
```

### Scenario 2: Extension Blocking
**Setup**: Enable an ad blocker without localhost whitelist

**Fix**:
```bash
# Detect the issue
npm run debug:extensions

# Test in incognito
# Configure the extension for localhost
```

### Scenario 3: Cache Corruption
**Setup**: Manually corrupt .next directory

**Fix**:
```bash
npm run clean
# or
npm run fix-localhost -- --full
```

### Scenario 4: Complete Failure
**Setup**: Delete node_modules

**Fix**:
```bash
npm run emergency:fix
# or
npm run fix-localhost -- --nuclear
```

### End of Day 3 Checklist
- [ ] Successfully resolved port conflict
- [ ] Fixed extension blocking issue
- [ ] Cleared corrupted cache
- [ ] Recovered from major failure

---

## 📅 Week 1: Daily Workflows

### Monday: Standard Development
```bash
# Morning startup
npm run dev:orchestrated

# If issues during the day
npm run fix-localhost

# End of day
# Commit your work
# No special shutdown needed
```

### Tuesday: Working with Backend
```bash
# Start backend first
cd ../backend && uvicorn main:app --reload

# Then frontend with validation
cd ../frontend && npm run dev:orchestrated

# Monitor both
npm run dev:monitor
```

### Wednesday: Heavy Development Day
```bash
# Use bulletproof mode for important work
npm run dev:bulletproof

# Keep dashboard open
npm run dev:dashboard

# Quick health check
curl -I http://localhost:3000
curl -I http://localhost:8000/api/v1/auth/health
```

### Thursday: Testing and Debugging
```bash
# Fresh start for testing
npm run dev:fresh

# If testing payments/auth
# Use incognito mode to avoid extension issues

# Debug specific issues
npm run diagnose
npm run debug:extensions
```

### Friday: Maintenance
```bash
# Weekly cleanup
npm run fix-localhost -- --full
npm run clean
npm update

# Review the week's logs
ls -la logs/
```

---

## 🎯 Common Scenarios

### "I just installed a new browser extension"
```bash
# Check compatibility immediately
npm run debug:extensions

# Configure if needed
# Add to whitelist for localhost
```

### "My colleague's code works but not on my machine"
```bash
# Full environment check
npm run fix-localhost -- --full

# Compare extension reports
npm run debug:extensions > my-extensions.txt
# Share and compare with colleague
```

### "Everything was working yesterday"
```bash
# Quick fix usually works
npm run fix-localhost

# If not, check what changed
git status
npm list
```

### "I need to demo to stakeholders"
```bash
# Pre-demo checklist
npm run dev:validate:paranoid
npm run fix-localhost -- --full
npm run validate:build

# Use incognito for demos
# Or use the demo browser profile
```

### "Backend team updated API"
```bash
# Restart both services
cd ../backend && git pull && uvicorn main:app --reload
cd ../frontend && npm run dev:orchestrated

# Clear any API caches
npm run clear-cache
```

---

## 📚 Team Resources

### Documentation
- **Main Guide**: [LOCALHOST_PREVENTION_SYSTEM_GUIDE.md](./LOCALHOST_PREVENTION_SYSTEM_GUIDE.md)
- **Quick Reference**: [LOCALHOST_QUICK_REFERENCE.md](./LOCALHOST_QUICK_REFERENCE.md)
- **Troubleshooting**: [LOCALHOST_TROUBLESHOOTING_GUIDE.md](./LOCALHOST_TROUBLESHOOTING_GUIDE.md)
- **Browser Config**: [BROWSER_CONFIGURATION_GUIDE.md](./BROWSER_CONFIGURATION_GUIDE.md)

### Team Channels
- **Slack Channel**: #6fb-localhost-help
- **Issue Tracking**: Tag with 'localhost-prevention'
- **Knowledge Base**: Internal wiki → Development → Localhost

### Approved Tools
- **Browsers**: Chrome Dev, Firefox Dev Edition
- **Extensions**: React DevTools, Redux DevTools
- **Monitoring**: Built-in health dashboard
- **API Testing**: Postman, Insomnia

### Team Standards
1. Always use `npm run dev:orchestrated` for daily work
2. Run `npm run fix-localhost -- --full` weekly
3. Report new issues to the team
4. Document unique solutions
5. Keep browser extensions minimal

---

## ✅ Certification Checklist

Complete these tasks to be certified in the localhost prevention system:

### Basic Proficiency
- [ ] Set up development environment from scratch
- [ ] Configure browser for development
- [ ] Run all startup modes successfully
- [ ] Fix a port conflict
- [ ] Clear various caches
- [ ] Use health monitoring

### Intermediate Skills
- [ ] Diagnose extension conflicts
- [ ] Recover from build corruption
- [ ] Use all troubleshooter modes
- [ ] Read and understand log files
- [ ] Help another developer with issues

### Advanced Knowledge
- [ ] Perform emergency recovery
- [ ] Configure custom browser profile
- [ ] Modify troubleshooting scripts
- [ ] Document a new issue/solution
- [ ] Train a new team member

### Certification Levels
- **Bronze**: Complete Basic Proficiency (Day 1-3)
- **Silver**: Complete Intermediate Skills (Week 1)
- **Gold**: Complete Advanced Knowledge (Month 1)

---

## 🎉 Welcome to the Team!

### Your First Week Goals
1. **Day 1-3**: Complete basic setup and exercises
2. **Day 4-5**: Practice daily workflows
3. **Week 1**: Achieve Bronze certification

### Tips for Success
- Don't hesitate to ask questions
- Document any issues you encounter
- Share solutions with the team
- Use the tools proactively
- Keep your environment clean

### Remember
- **Prevention is easier than fixing**
- **The tools are here to help you**
- **When in doubt, run fix-localhost**
- **The team is here to support you**

---

## 📝 Notes Section

Use this space to document your learning:

### My Browser Extensions
```
1.
2.
3.
```

### My Preferred Startup Mode
```
npm run dev:
```

### Issues I've Encountered
```
1.
2.
3.
```

### Solutions I've Found
```
1.
2.
3.
```

---

*Welcome aboard! We're excited to have you on the team.*

*Last Updated: 2025-06-27*
*Onboarding Version: 1.0.0*

# 🔄 Localhost Troubleshooting Flowcharts & Decision Trees

This document provides visual decision trees and flowcharts to quickly diagnose and resolve localhost connectivity issues.

## 📊 Master Troubleshooting Decision Tree

```
┌─────────────────────────┐
│   Localhost Issue?      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Can access localhost?  │
└───────┬─────────┬───────┘
        │ NO      │ YES
        ▼         ▼
┌───────────┐ ┌──────────────┐
│   Go to   │ │ API working? │
│ Network   │ └──┬────────┬──┘
│ Issues    │    │ NO     │ YES
└───────────┘    ▼        ▼
              ┌──────┐ ┌─────────────┐
              │Go to │ │ Resources   │
              │ API  │ │  loading?   │
              │Issues│ └──┬───────┬──┘
              └──────┘    │ NO    │ YES
                          ▼       ▼
                     ┌────────┐ ┌──────────┐
                     │ Go to  │ │ Check    │
                     │Browser │ │ Console  │
                     │ Issues │ │ Errors   │
                     └────────┘ └──────────┘
```

## 🌐 Network Issues Flowchart

```
┌─────────────────────────┐
│   Network Issues        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Port 3000 available?   │
└───────┬─────────┬───────┘
        │ NO      │ YES
        ▼         ▼
┌───────────────┐ ┌────────────────┐
│ npm run       │ │ DNS resolving  │
│ kill-port     │ │   localhost?   │
└───────┬───────┘ └───┬─────────┬──┘
        │ FIXED       │ NO      │ YES
        ▼             ▼         ▼
    ┌───────┐   ┌──────────┐ ┌─────────────┐
    │ START │   │Clear DNS │ │ Check hosts │
    │  DEV  │   │  Cache   │ │    file     │
    └───────┘   └────┬─────┘ └──┬──────────┘
                     │ FIXED     │ FIXED
                     ▼           ▼
                 ┌───────┐   ┌───────┐
                 │ START │   │ START │
                 │  DEV  │   │  DEV  │
                 └───────┘   └───────┘
```

## 🔌 API Connection Issues

```
┌─────────────────────────┐
│    API Issues (8000)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Backend running?       │
└───────┬─────────┬───────┘
        │ NO      │ YES
        ▼         ▼
┌──────────────┐ ┌────────────────┐
│Start Backend │ │ CORS headers   │
│ cd ../backend│ │   correct?     │
│uvicorn main: │ └───┬─────────┬──┘
│app --reload  │     │ NO      │ YES
└──────┬───────┘     ▼         ▼
       │ DONE   ┌──────────┐ ┌─────────────┐
       ▼        │ Check    │ │ Extensions  │
   ┌───────┐    │ Backend  │ │ blocking?   │
   │ RETRY │    │  Config  │ └──┬───────┬──┘
   └───────┘    └──────────┘    │ NO    │ YES
                                 ▼       ▼
                            ┌────────┐ ┌──────────┐
                            │ Check  │ │Configure │
                            │ Auth   │ │Extensions│
                            └────────┘ └──────────┘
```

## 🌍 Browser/Extension Issues

```
┌─────────────────────────┐
│  Browser/Extension      │
│      Issues             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Test in Incognito?     │
└───────┬─────────┬───────┘
        │ WORKS   │ FAILS
        ▼         ▼
┌──────────────┐ ┌────────────────┐
│ Extension    │ │ Not extension  │
│  Problem     │ │    related     │
└──────┬───────┘ └───────┬────────┘
       │                  │
       ▼                  ▼
┌──────────────┐ ┌────────────────┐
│ npm run      │ │ npm run        │
│ debug:       │ │ fix-localhost  │
│ extensions   │ │    --full      │
└──────┬───────┘ └────────────────┘
       │
       ▼
┌──────────────────────┐
│ Follow extension     │
│ recommendations      │
└──────────────────────┘
```

## 🚀 Quick Fix Decision Path

```
Start Here
    │
    ▼
Try: npm run fix-localhost
    │
    ├─── WORKS ──→ Continue Development
    │
    └─── FAILS ──→ Try: npm run fix-localhost -- --full
            │
            ├─── WORKS ──→ Continue Development
            │
            └─── FAILS ──→ Try: npm run fix-localhost -- --nuclear
                    │
                    ├─── WORKS ──→ Continue Development
                    │
                    └─── FAILS ──→ Manual Diagnosis Required
                            │
                            ▼
                    ┌─────────────────┐
                    │ 1. Check logs   │
                    │ 2. Test parts   │
                    │ 3. Get help     │
                    └─────────────────┘
```

## 🔍 Diagnostic Command Tree

```
Issue Type?
    │
    ├─── Port Conflict
    │       └──→ npm run kill-port
    │
    ├─── Cache Problems
    │       └──→ npm run clear-cache
    │
    ├─── Network Issues
    │       └──→ npm run diagnose
    │
    ├─── Extension Conflicts
    │       └──→ npm run debug:extensions
    │
    ├─── Build Problems
    │       └──→ npm run clean
    │
    └─── Unknown/Multiple
            └──→ npm run fix-localhost -- --full
```

## 📋 Startup Mode Selection

```
What's your priority?
    │
    ├─── Speed (< 10s startup)
    │       └──→ npm run dev:express
    │
    ├─── Balance (~ 30s startup)
    │       └──→ npm run dev:orchestrated (RECOMMENDED)
    │
    ├─── Safety (~ 45s startup)
    │       └──→ npm run dev:safe
    │
    └─── Maximum Protection (~ 60s startup)
            └──→ npm run dev:bulletproof
```

## 🏥 Emergency Recovery Path

```
System Completely Broken?
    │
    ▼
Save your work: git stash
    │
    ▼
Try: npm run emergency:fix
    │
    ├─── WORKS ──→ git stash pop → Continue
    │
    └─── FAILS ──→ Manual Nuclear Option
            │
            ▼
        pkill -f "next|npm|node"
            │
            ▼
        rm -rf node_modules package-lock.json .next logs
            │
            ▼
        npm install
            │
            ▼
        npm run dev:validate:full
            │
            ▼
        npm run dev
```

## 🎯 Issue-Specific Flowcharts

### "Cannot GET /" Error
```
Cannot GET / Error
    │
    ├─── Check if Next.js is running
    │       └──→ ps aux | grep next
    │
    ├─── Check correct port
    │       └──→ Should be :3000 not :8000
    │
    └─── Restart with validation
            └──→ npm run dev:orchestrated
```

### CORS Errors
```
CORS Error in Console
    │
    ├─── Backend running?
    │       └──→ curl -I http://localhost:8000/api/v1/auth/health
    │
    ├─── Extension modifying headers?
    │       └──→ npm run debug:extensions
    │
    └─── Backend CORS config?
            └──→ Check backend/.env for CORS settings
```

### Authentication Failures
```
Auth/Login Issues
    │
    ├─── Clear browser data
    │       └──→ Clear cookies/localStorage for localhost
    │
    ├─── Check API connection
    │       └──→ npm run diagnose
    │
    └─── Disable header-modifying extensions
            └──→ Test in incognito mode
```

## 🔄 Daily Workflow Decision Tree

```
Starting Development
    │
    ▼
First time today? ─── YES ──→ npm run dev:orchestrated
    │ NO                            │
    ▼                               ▼
Had issues yesterday? ─── YES ──→ Continue Development
    │ NO                    │
    ▼                       ▼
Just keep using ←──────────┘
previous session
```

## 📊 Performance Degradation Path

```
Development Feels Slow?
    │
    ▼
Check memory usage ──→ Activity Monitor / Task Manager
    │
    ├─── High Memory (>85%)
    │       └──→ npm run clean && npm run fix-localhost
    │
    ├─── Many Chrome processes
    │       └──→ Restart browser with dev profile
    │
    └─── Long running session
            └──→ Restart dev server: Ctrl+C → npm run dev
```

## 🎮 Interactive Troubleshooting

When using the Extension Detector UI:

```
Extension Detector Shows Warning
    │
    ▼
Click "Advanced Mode"
    │
    ▼
Review Risk Level
    │
    ├─── HIGH Risk (Red)
    │       └──→ Follow "Configure" instructions immediately
    │
    ├─── MEDIUM Risk (Yellow)
    │       └──→ Configure when convenient
    │
    └─── LOW Risk (Blue)
            └──→ Monitor for issues
```

## 📝 Logging and Reporting Path

```
Need to Report Issue?
    │
    ▼
Collect Information
    │
    ├──→ Run: npm run fix-localhost -- --full --verbose > debug.log
    │
    ├──→ Save: logs/troubleshoot-*.log
    │
    ├──→ Export: logs/troubleshoot-report-*.json
    │
    └──→ Screenshot: Extension Detector warnings
            │
            ▼
        Share with team via Slack/Issue
```

---

## 🚦 Quick Decision Rules

### Rule 1: Progressive Escalation
```
Always try in this order:
1. Quick fix (30s)
2. Full fix (2-5min)
3. Nuclear fix (5-10min)
4. Manual intervention
```

### Rule 2: Test Isolation
```
If frontend issues:
1. Test in incognito
2. Test with different browser
3. Test with minimal extensions
```

### Rule 3: Validation First
```
Before starting development:
1. Validate environment
2. Fix any issues
3. Then start coding
```

### Rule 4: Monitor Continuously
```
During development:
1. Watch console for errors
2. Check Extension Detector
3. Monitor performance
```

---

*Use these flowcharts to quickly navigate through troubleshooting scenarios. Print them out or keep them open while developing!*

*Version 1.0.0 | Last Updated: 2025-06-27*

# 🚀 Localhost Prevention System - Quick Reference

## One-Command Solutions

### Daily Development
```bash
npm run dev:orchestrated    # Recommended: Full validation + monitoring
npm run dev:express        # Fast: Minimal checks
npm run dev:safe          # Balanced: Standard checks
npm run dev:bulletproof   # Maximum: All protections
```

### When Issues Occur
```bash
npm run fix-localhost              # Quick fix (30-60s)
npm run fix-localhost -- --full    # Full diagnostic (2-5min)
npm run fix-localhost -- --nuclear # Complete reset (5-10min)
```

### Specific Problems
```bash
npm run kill-port          # Port 3000 in use
npm run clear-cache        # Cache issues
npm run diagnose          # Network problems
npm run debug:extensions   # Extension conflicts
npm run clean             # Build issues
```

### Emergency Recovery
```bash
npm run emergency:fix      # Nuclear reset
npm run emergency:recover  # Recover from failures
```

## Quick Diagnosis

### Check Frontend
```bash
curl -I http://localhost:3000
```

### Check Backend
```bash
curl -I http://localhost:8000/api/v1/auth/health
```

### Check Extensions
```bash
npm run debug:extensions
# Or test in incognito: Cmd+Shift+N
```

### Check Ports
```bash
lsof -ti:3000  # See what's using port 3000
lsof -ti:8000  # See what's using port 8000
```

## Common Fixes

### "Port already in use"
```bash
npm run kill-port
# or
npm run fix-localhost
```

### "API requests failing"
```bash
# 1. Check backend is running
cd ../backend && uvicorn main:app --reload

# 2. Fix connectivity
npm run fix-localhost -- --full

# 3. Check extensions
npm run debug:extensions
```

### "Extensions blocking resources"
```bash
# Test in incognito first
# Then configure extensions:
./scripts/configure-development-browser.sh
```

### "Build/cache issues"
```bash
npm run clean
npm run fix-localhost
```

### "DNS resolution failures"
```bash
# macOS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Then
npm run fix-localhost -- --full
```

## Prevention Checklist

### Daily Startup
- [ ] Use `npm run dev:orchestrated`
- [ ] Check Extension Detector popup
- [ ] Verify both servers are running
- [ ] Monitor console for warnings

### Weekly Maintenance
- [ ] Run `npm run fix-localhost -- --full`
- [ ] Clear caches with `npm run clean`
- [ ] Update dependencies with `npm update`
- [ ] Review health monitor logs

### Before Important Sessions
- [ ] Run `npm run dev:validate:paranoid`
- [ ] Test in clean browser profile
- [ ] Have emergency commands ready
- [ ] Commit/stash current work

## Browser Shortcuts

### Test in Incognito/Private
- **Chrome/Edge:** Cmd+Shift+N
- **Firefox:** Cmd+Shift+P
- **Safari:** Cmd+Shift+N

### Clear Site Data
- **Chrome:** chrome://settings/content/all → Find localhost → Clear
- **Firefox:** about:preferences#privacy → Manage Data
- **Safari:** Develop → Empty Caches

### Developer Tools
- **All Browsers:** Cmd+Option+I (Mac) / Ctrl+Shift+I (Win/Linux)
- **Network Tab:** Cmd+Option+E (Chrome/Edge)
- **Console:** Cmd+Option+J (Chrome) / Cmd+Option+K (Firefox)

## Console Helpers

```javascript
// Toggle extension error debugging
window.toggleExtensionDebug()

// Quick extension check
window.runExtensionDetection()

// Test connectivity
window.testConnectivity()
```

## Emergency Contacts

### Log Locations
```bash
logs/dev-startup-*.log      # Startup logs
logs/troubleshoot-*.log     # Troubleshooting logs
logs/dev-health-*.log       # Health monitoring
```

### Quick Status Check
```bash
# See latest issues
tail -f logs/troubleshoot-*.log

# Check health status
tail -f logs/dev-health-*.log

# View last report
cat logs/troubleshoot-report-*.json | jq '.summary'
```

## Progressive Response

1. **Quick** → `npm run fix-localhost` (30-60s)
2. **Full** → `npm run fix-localhost -- --full` (2-5min)
3. **Nuclear** → `npm run fix-localhost -- --nuclear` (5-10min)
4. **Emergency** → `npm run emergency:fix` (10-15min)

## Remember

- **Prevention > Fixing**: Use orchestrated startup
- **Progressive Response**: Start with quick fixes
- **Test Incrementally**: Verify each fix works
- **Document Issues**: Help the team learn
- **Stay Calm**: We have tools for every situation

---

**Pro Tip**: Print this and keep it visible during development!

*Version 1.0.0 | Updated: 2025-06-27*

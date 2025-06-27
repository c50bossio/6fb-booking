# Browser Configuration Guide for 6FB Booking Development

This guide provides specific browser configurations to optimize your development experience and prevent extension conflicts with the 6FB Booking Platform.

## Table of Contents
1. [Chrome/Chromium Configuration](#chrome-chromium-configuration)
2. [Firefox Configuration](#firefox-configuration)
3. [Safari Configuration](#safari-configuration)
4. [Edge Configuration](#edge-configuration)
5. [Extension-Specific Configurations](#extension-specific-configurations)
6. [Development Profiles](#development-profiles)
7. [Troubleshooting](#troubleshooting)

---

## Chrome/Chromium Configuration

### Developer Flags (Advanced Users)
Add these flags when launching Chrome for development:

```bash
# Launch Chrome with development-friendly flags
google-chrome \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --allow-running-insecure-content \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --user-data-dir=/tmp/chrome-dev-profile
```

### Chrome Settings
1. **Navigate to:** `chrome://settings/content/all`
2. **Configure these settings:**
   - **Cookies:** Allow all cookies for `localhost` and `127.0.0.1`
   - **JavaScript:** Allow JavaScript on all sites
   - **Pop-ups:** Allow pop-ups for localhost domains
   - **Sound:** Allow sound for localhost (for notification testing)

### Chrome Security Settings
1. **Navigate to:** `chrome://settings/privacy`
2. **Configure:**
   - **Safe Browsing:** Standard protection (not Enhanced)
   - **Always use secure connections:** Disabled for development
   - **Privacy Sandbox Ad topics:** Disabled for consistent testing

---

## Firefox Configuration

### about:config Settings
Navigate to `about:config` and modify these preferences:

```
# Security and HTTPS
dom.security.https_only_mode = false
security.tls.insecure_fallback_hosts = localhost,127.0.0.1
network.stricttransportsecurity.preloadlist = false

# CORS and Security
network.cors.disable = false
security.csp.enable = true
security.fileuri.strict_origin_policy = false

# Privacy and Tracking
privacy.trackingprotection.enabled = false
privacy.trackingprotection.pbmode.enabled = true
network.cookie.cookieBehavior = 0

# Development-specific
devtools.netmonitor.persistlog = true
devtools.console.persistlog = true
browser.cache.disk.enable = false
browser.cache.memory.enable = true
```

### Firefox Privacy Settings
1. **Navigate to:** `about:preferences#privacy`
2. **Enhanced Tracking Protection:** Custom
   - **Trackers:** Disabled for localhost
   - **Cookies:** Don't block cookies
   - **Cryptominers:** Enabled (doesn't affect development)
   - **Fingerprinters:** Enabled (doesn't affect development)

---

## Safari Configuration

### Safari Developer Menu
1. **Enable Developer Menu:**
   - Safari → Preferences → Advanced
   - Check "Show Develop menu in menu bar"

2. **Developer Settings:**
   - Develop → Disable Cross-Origin Restrictions
   - Develop → Disable Local File Restrictions

### Safari Privacy Settings
1. **Navigate to:** Safari → Preferences → Privacy
2. **Configure:**
   - **Prevent cross-site tracking:** Disabled for development
   - **Block all cookies:** Never
   - **Website tracking:** Allow for localhost

### Safari Security Settings
1. **Navigate to:** Safari → Preferences → Security
2. **Configure:**
   - **Fraudulent sites:** Disabled for development
   - **JavaScript:** Enabled
   - **Block pop-up windows:** Disabled for localhost

---

## Edge Configuration

Edge follows similar patterns to Chrome since it's Chromium-based.

### Edge Flags
```bash
# Launch Edge with development flags
msedge \
  --disable-web-security \
  --allow-running-insecure-content \
  --disable-features=VizDisplayCompositor \
  --user-data-dir=/tmp/edge-dev-profile
```

### Edge Settings
Similar to Chrome, but navigate to `edge://settings/` instead.

---

## Extension-Specific Configurations

### uBlock Origin
1. **Open uBlock Origin Dashboard**
2. **Whitelist tab → Add these entries:**
   ```
   localhost
   127.0.0.1
   localhost:3000
   localhost:8000
   127.0.0.1:3000
   127.0.0.1:8000
   ```
3. **My filters → Add custom filters:**
   ```
   @@||localhost^$document
   @@||127.0.0.1^$document
   ```

### Privacy Badger
1. **Click Privacy Badger icon**
2. **Settings → Manage Data**
3. **Add to "Allow on these sites":**
   ```
   localhost:3000
   localhost:8000
   127.0.0.1:3000
   127.0.0.1:8000
   ```

### ModHeader
1. **Open ModHeader extension**
2. **Create Profile:** "Development - Localhost"
3. **Filters → Add URL filters:**
   ```
   localhost:*
   127.0.0.1:*
   ```
4. **Headers:** Remove all custom headers for localhost

### CORS Extensions (Disable for Development)
For any CORS-modifying extensions:
1. **Disable completely** for localhost
2. **Or create exception rules** for development domains
3. **Common extensions to configure:**
   - CORS Unblock
   - Allow CORS
   - CORS Everywhere

### Password Managers
#### 1Password
1. **Settings → Websites**
2. **Add localhost to "Never fill on these sites"** (optional)
3. **Disable autofill** for development forms

#### LastPass
1. **Account Options → Site Preferences**
2. **Add localhost** with "Never" autofill setting

#### Bitwarden (Generally Safe)
1. **Settings → Options**
2. **Auto-fill on page load:** Disabled for localhost (optional)

---

## Development Profiles

### Create Dedicated Development Profiles

#### Chrome
```bash
# Create development profile
google-chrome --user-data-dir="/tmp/chrome-dev" --new-window
```

#### Firefox
```bash
# Create development profile
firefox -CreateProfile development
firefox -P development
```

#### Safari
Create a separate user account on macOS for development use.

### Profile Configuration Checklist
- [ ] Minimal extensions (only development tools)
- [ ] Disabled ad blockers or whitelisted localhost
- [ ] Relaxed security settings for development
- [ ] Persistent developer tools
- [ ] Disabled caching for development

---

## Troubleshooting

### Quick Diagnostic Commands

```bash
# Test connectivity
curl -I http://localhost:3000
curl -I http://localhost:8000/api/v1/auth/health

# Test with specific headers
curl -H "Origin: http://localhost:3000" -I http://localhost:8000/api/v1/auth/health

# Enhanced extension detection
node scripts/enhanced-extension-detector.js
```

### Common Issues and Solutions

#### 1. API Requests Blocked
**Symptoms:** 404, 403, or network errors on API calls
**Solutions:**
- Check ad blocker whitelist
- Disable CORS extensions
- Verify backend is running on port 8000

#### 2. CSS/JS Not Loading
**Symptoms:** Unstyled page, JavaScript errors
**Solutions:**
- Clear browser cache
- Disable content-modifying extensions
- Check network tab for blocked resources

#### 3. Authentication Issues
**Symptoms:** Login failures, session problems
**Solutions:**
- Clear cookies and localStorage
- Disable header-modifying extensions
- Check for CORS errors in console

#### 4. Performance Issues
**Symptoms:** Slow page loads, laggy interactions
**Solutions:**
- Disable performance monitoring extensions
- Use production builds for performance testing
- Check React Developer Tools configuration

### Browser-Specific Troubleshooting

#### Chrome
- Check `chrome://settings/content/all` for blocked content
- Verify `chrome://flags/` don't interfere with development
- Use `chrome://net-internals/#dns` to clear DNS cache

#### Firefox
- Check `about:preferences#privacy` for tracking protection
- Verify `about:config` settings are development-friendly
- Use `about:networking#dns` to clear DNS cache

#### Safari
- Check Develop menu for disabled restrictions
- Verify Privacy & Security settings allow localhost
- Clear website data for localhost specifically

---

## Testing Your Configuration

### 1. Run the Enhanced Extension Detector
```bash
cd /Users/bossio/6fb-booking/frontend
node scripts/enhanced-extension-detector.js
```

### 2. Manual Testing Checklist
- [ ] Load http://localhost:3000 without errors
- [ ] API calls to http://localhost:8000 work
- [ ] No CORS errors in console
- [ ] Authentication flow works
- [ ] File uploads work (if applicable)
- [ ] Stripe payment forms load correctly

### 3. Incognito/Private Mode Test
Always test in incognito/private mode to isolate extension issues:
- **Chrome:** Ctrl+Shift+N (Cmd+Shift+N on Mac)
- **Firefox:** Ctrl+Shift+P (Cmd+Shift+P on Mac)
- **Safari:** Cmd+Shift+N
- **Edge:** Ctrl+Shift+N (Cmd+Shift+N on Mac)

---

## Maintenance

### Weekly Development Environment Check
1. Update browser to latest version
2. Update development extensions
3. Run enhanced extension detector
4. Clear browser cache and data for localhost
5. Test full application flow

### When Adding New Extensions
1. Test immediately after installation
2. Configure for localhost compatibility
3. Run compatibility tests
4. Document any required configuration

### Before Important Development Sessions
1. Run quick connectivity test
2. Check extension detector for warnings
3. Clear cache if needed
4. Verify both frontend and backend are accessible

---

For additional help or if you encounter issues not covered here, run the enhanced extension detector script or consult the main troubleshooting guide.

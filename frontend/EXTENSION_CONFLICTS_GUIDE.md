# Browser Extension Conflicts Guide

This guide helps developers resolve common issues caused by browser extensions when developing the 6FB Booking Platform.

## Common Issues

### 1. CSP (Content Security Policy) Violations
**Symptoms:**
- Console errors about "Refused to load script"
- Resources blocked by Content Security Policy
- Extension scripts failing to inject

**Solution:**
The application automatically uses a relaxed CSP in development mode that allows extension scripts.

### 2. CORS Extension Conflicts
**Symptoms:**
- API requests behaving unexpectedly
- Headers being modified
- Authentication failures

**Solutions:**
1. Disable CORS extensions for localhost
2. Add localhost to the extension's exception list
3. Test in incognito mode with extensions disabled

### 3. Ad Blocker Interference
**Symptoms:**
- API endpoints being blocked
- Styles not loading correctly
- Missing UI elements

**Solutions:**
1. Add localhost to your ad blocker's allowlist
2. Disable ad blocker for development
3. Use the Extension Detector component to identify the issue

## Built-in Solutions

### 1. Extension Detector Component
The app includes an Extension Detector that:
- Identifies common problematic extensions
- Provides specific recommendations
- Shows only in development mode
- Can be dismissed if not needed

### 2. Extension Error Handler
Automatically filters out extension-related errors in development:
- Prevents console spam from extension errors
- Maintains clean error logs
- Can be toggled with `window.toggleExtensionDebug()`

### 3. Smart CSP Headers
The middleware automatically:
- Relaxes CSP in development to allow extensions
- Maintains strict CSP in production
- Allows chrome-extension:// and moz-extension:// protocols

### 4. Webpack Configuration
The build system:
- Ignores extension-injected scripts
- Filters out extension-related warnings
- Handles extension protocols gracefully

## Quick Fixes

### Test in Incognito Mode
The fastest way to check if an extension is causing issues:

**Chrome/Edge:** Ctrl+Shift+N (Windows/Linux) or Cmd+Shift+N (Mac)
**Firefox:** Ctrl+Shift+P (Windows/Linux) or Cmd+Shift+P (Mac)
**Safari:** Cmd+Shift+N

### Disable Problematic Extensions
Common extensions that may cause issues:
- CORS Unblock / Allow CORS
- ModHeader
- Privacy Badger
- uBlock Origin (if not configured properly)

### Debug Extension Errors
To see filtered extension errors:
```javascript
// Enable extension error debugging
window.toggleExtensionDebug()

// Check current status
console.log(window.__DEBUG_EXTENSION_ERRORS__)
```

## Development Best Practices

1. **Use Extension Profiles**
   - Create a development browser profile with minimal extensions
   - Keep only essential developer tools

2. **Configure Extensions Properly**
   - Add localhost to allowlists
   - Disable header modifications for local development
   - Turn off CORS modifications

3. **Monitor the Console**
   - Watch for the Extension Detector popup
   - Check for filtered errors using debug mode
   - Look for CSP violations

4. **Test Regularly**
   - Periodically test in incognito mode
   - Verify functionality with extensions disabled
   - Ensure production builds work correctly

## Troubleshooting Checklist

- [ ] Check Extension Detector for warnings
- [ ] Test in incognito/private mode
- [ ] Disable CORS extensions
- [ ] Add localhost to ad blocker allowlist
- [ ] Clear browser cache and cookies
- [ ] Check for CSP violations in console
- [ ] Enable extension debug mode if needed
- [ ] Verify no custom headers are being injected

## Need Help?

If you're still experiencing issues:
1. Take a screenshot of the console errors
2. Note which extensions are installed
3. Document the specific behavior
4. Test in multiple browsers
5. Check if the issue occurs in production builds

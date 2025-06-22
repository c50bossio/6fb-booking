# Browser Extension Conflicts - Troubleshooting Guide

## 🚨 Common Browser Extension Conflicts

Browser extensions can interfere with the 6FB Booking Platform's functionality. This guide provides comprehensive solutions for identifying and resolving these conflicts.

## 🎯 Quick Diagnosis Steps

### 1. **Test in Incognito/Private Mode**
```bash
# Start the application
cd /Users/bossio/6fb-booking/frontend && npm run dev
cd /Users/bossio/6fb-booking/backend && uvicorn main:app --reload
```

Then open:
- **Chrome**: `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
- **Firefox**: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
- **Safari**: `Cmd+Shift+N` (Mac)

Navigate to `http://localhost:3000` (or the port shown in terminal).

**If the app works in incognito mode, the issue is caused by browser extensions.**

### 2. **Identify Problematic Extensions**

#### Most Common Problematic Extensions:
1. **React Developer Tools** - Can interfere with React state
2. **Redux DevTools** - May conflict with state management
3. **Ad Blockers** (uBlock Origin, AdBlock Plus) - Can block legitimate API calls
4. **Privacy Extensions** (Privacy Badger, Ghostery) - May block tracking or analytics
5. **CORS Extensions** - Can interfere with API requests
6. **Script Blockers** (NoScript, ScriptSafe) - Block JavaScript execution
7. **Content Security Policy Extensions** - Override CSP headers
8. **Developer Extensions** (Postman Interceptor, ModHeader) - Modify requests

#### Extensions That Are Generally Safe:
- **1Password** / **Bitwarden** (password managers)
- **Grammarly** (unless injecting into forms)
- **Dark Reader** (with proper configuration)
- **LastPass** (password manager)

## 🔧 Step-by-Step Resolution

### Step 1: Disable All Extensions
1. **Chrome**:
   - Go to `chrome://extensions/`
   - Turn off all extensions using the toggle switches
   - Refresh the 6FB app

2. **Firefox**:
   - Go to `about:addons`
   - Disable all extensions
   - Refresh the 6FB app

3. **Safari**:
   - Safari → Preferences → Extensions
   - Uncheck all extensions
   - Refresh the 6FB app

### Step 2: Test Core Functionality
With all extensions disabled, test these critical features:
- [ ] Login/logout functionality
- [ ] Dashboard loading
- [ ] API calls (check Network tab in DevTools)
- [ ] Payment forms (if applicable)
- [ ] WebSocket connections
- [ ] File uploads (if any)

### Step 3: Re-enable Extensions One by One
1. Enable one extension at a time
2. Test the app after each enablement
3. When you find the problematic extension, proceed to Step 4

### Step 4: Configure Problematic Extensions

#### For React Developer Tools:
```javascript
// Add this to your browser console to disable React DevTools interference
window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = null;
window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount = null;
```

#### For Ad Blockers (uBlock Origin):
1. Click the uBlock Origin icon
2. Click the power button to disable for `localhost`
3. Add these to whitelist:
   - `localhost:3000`
   - `localhost:8000`
   - `127.0.0.1:3000`
   - `127.0.0.1:8000`

#### For Privacy Extensions:
Add localhost domains to the whitelist:
- `localhost`
- `127.0.0.1`
- `0.0.0.0` (if applicable)

## 🛡️ Content Security Policy Issues

### Symptoms of CSP Conflicts:
- Console errors mentioning "Content Security Policy"
- Blocked inline scripts or styles
- Failed resource loading

### CSP Configuration
The app now includes a middleware file (`middleware.ts`) with proper CSP headers:

```typescript
// CSP allows these sources:
script-src: 'self', 'unsafe-inline', 'unsafe-eval', Stripe, Tailwind
style-src: 'self', 'unsafe-inline', Google Fonts
connect-src: 'self', localhost:8000, Stripe API, WebSocket connections
```

### Override CSP Extensions:
If you have CSP-modifying extensions:
1. **ModHeader**: Clear all CSP-related rules
2. **CORS Everywhere**: Disable for localhost
3. **Requestly**: Remove CSP modification rules

## 🧹 Complete Browser Reset

### Clear All Browser Data:
1. **Chrome**:
   - Settings → Advanced → Reset and clean up → Clear browsing data
   - Select "All time" and check all boxes

2. **Firefox**:
   - Settings → Privacy & Security → Clear Data
   - Select all options

3. **Safari**:
   - Safari → Clear History → All History

### Reset Browser Settings:
1. **Chrome**: Settings → Advanced → Reset settings to original defaults
2. **Firefox**: Help → More Troubleshooting Information → Refresh Firefox
3. **Safari**: Safari → Reset Safari (select all options)

## 🌐 Test in Multiple Browsers

Test the 6FB app in different browsers to isolate the issue:

### Primary Testing Browsers:
1. **Chrome** (latest stable)
2. **Firefox** (latest stable)
3. **Safari** (latest stable - Mac only)
4. **Edge** (latest stable)

### Browser-Specific Issues:

#### Chrome-Specific:
- React DevTools integration issues
- Manifest V3 extension compatibility
- Performance monitoring extensions

#### Firefox-Specific:
- Enhanced Tracking Protection
- Strict security settings
- Add-on compatibility issues

#### Safari-Specific:
- Intelligent Tracking Prevention
- Website tracking settings
- Extension sandboxing

## 🚀 Development Environment Setup

### Recommended Development Browser Configuration:

#### Chrome Development Profile:
1. Create a new Chrome profile for development
2. Install only essential extensions:
   - React Developer Tools (configured properly)
   - Redux DevTools (if using Redux)
   - 1Password/Bitwarden

#### Firefox Development Profile:
1. Create a new Firefox profile: `firefox -ProfileManager`
2. Set `dom.security.https_only_mode` to `false` in `about:config`
3. Install minimal extensions

### Environment Variables:
```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export BROWSER=chrome
export BROWSER_ARGS="--disable-web-security --disable-features=VizDisplayCompositor --user-data-dir=/tmp/chrome-dev-session"
```

## 🔍 Debugging Tools

### Browser DevTools Debugging:
1. **Open DevTools**: `F12` or `Cmd+Option+I`
2. **Console Tab**: Look for JavaScript errors
3. **Network Tab**: Check for failed API requests
4. **Security Tab**: Verify CSP and SSL issues
5. **Application Tab**: Check localStorage/sessionStorage

### Console Commands for Debugging:
```javascript
// Check if React is properly loaded
console.log(window.React);

// Check CSP violations
window.addEventListener('securitypolicyviolation', (e) => {
  console.log('CSP Violation:', e);
});

// Monitor fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch request:', args);
  return originalFetch.apply(this, arguments);
};

// Check extension interference
console.log('Extensions affecting page:', {
  reactDevTools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
  reduxDevTools: !!window.__REDUX_DEVTOOLS_EXTENSION__,
  customExtensions: Object.keys(window).filter(key => key.includes('extension'))
});
```

## 📱 Mobile Testing

### Mobile Browser Testing:
1. **iOS Safari**: Test on actual device or simulator
2. **Android Chrome**: Test on actual device or emulator
3. **Mobile Extensions**: Generally fewer conflicts

### Mobile-Specific Issues:
- Viewport settings
- Touch event handling
- iOS Safari private mode limitations

## 🆘 Emergency Workarounds

### Temporary Development Fixes:

#### 1. Disable CSP Temporarily:
```typescript
// In middleware.ts - ONLY for development
if (process.env.NODE_ENV === 'development') {
  response.headers.delete('Content-Security-Policy');
}
```

#### 2. Override Extension Scripts:
```html
<!-- Add to layout.tsx head section - DEVELOPMENT ONLY -->
<script dangerouslySetInnerHTML={{
  __html: `
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.isDisabled = true;
    }
  `
}} />
```

#### 3. Alternative Development Server:
```bash
# Use different port to avoid conflicts
npm run dev -- --port 3001
```

## 📞 Getting Help

### When to Escalate:
1. Issue persists across all browsers
2. Incognito mode doesn't resolve the issue
3. Complete browser reset doesn't help
4. API calls fail even with all extensions disabled

### Information to Collect:
- Browser version and operating system
- List of installed extensions
- Console error messages
- Network tab status codes
- Steps to reproduce the issue

### Test Commands:
```bash
# Test API connectivity directly
curl -X GET "http://localhost:8000/api/v1/auth/health"

# Test frontend build
cd /Users/bossio/6fb-booking/frontend && npm run build

# Check for TypeScript errors
cd /Users/bossio/6fb-booking/frontend && npx tsc --noEmit
```

## ✅ Success Checklist

After resolving extension conflicts, verify:
- [ ] Login/logout works correctly
- [ ] Dashboard loads without errors
- [ ] API calls succeed (check Network tab)
- [ ] WebSocket connections establish
- [ ] No console errors related to extensions
- [ ] All interactive elements function properly
- [ ] Payment forms work (if applicable)
- [ ] Real-time updates function (WebSocket)

---

*Last Updated: 2025-06-22*
*6FB Booking Platform - Browser Extension Troubleshooting Guide*

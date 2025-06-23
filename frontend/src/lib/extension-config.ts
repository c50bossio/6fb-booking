/**
 * Configuration for handling browser extension conflicts in development
 */

export const extensionConfig = {
  // List of known problematic extensions that may interfere
  problematicExtensions: [
    {
      name: 'CORS Unblock',
      patterns: ['cors-unblock', 'cors-extension'],
      recommendation: 'Disable when developing locally',
    },
    {
      name: 'ModHeader',
      patterns: ['modheader', 'modify-header'],
      recommendation: 'Clear all custom headers for localhost',
    },
    {
      name: 'Allow CORS',
      patterns: ['allow-cors', 'cors-everywhere'],
      recommendation: 'Disable for localhost development',
    },
    {
      name: 'Privacy Badger',
      patterns: ['privacy-badger', 'privacybadger'],
      recommendation: 'Add localhost to allow list',
    },
    {
      name: 'uBlock Origin',
      patterns: ['ublock', 'adblock'],
      recommendation: 'Add localhost to trusted sites',
    },
  ],

  // Safe extensions that generally don't cause issues
  safeExtensions: [
    'React Developer Tools',
    'Redux DevTools',
    'Vue.js devtools',
    'Angular DevTools',
    'Lighthouse',
    'Wappalyzer',
    'JSON Viewer',
  ],

  // Console message filters
  consoleFilters: [
    /chrome-extension:\/\//i,
    /moz-extension:\/\//i,
    /Failed to load resource.*extension/i,
    /DevTools failed to load source map/i,
    /Extension context invalidated/i,
    /chrome\.runtime/i,
    /Access-Control-Allow-Origin.*extension/i,
  ],

  // Development tips
  tips: {
    general: 'If experiencing issues, try testing in incognito/private mode',
    chrome: 'Chrome: Ctrl+Shift+N (Windows/Linux) or Cmd+Shift+N (Mac)',
    firefox: 'Firefox: Ctrl+Shift+P (Windows/Linux) or Cmd+Shift+P (Mac)',
    safari: 'Safari: Cmd+Shift+N',
    edge: 'Edge: Ctrl+Shift+N (Windows/Linux) or Cmd+Shift+N (Mac)',
  },
};

/**
 * Check if an error is likely caused by a browser extension
 */
export function isExtensionError(error: Error | string): boolean {
  const errorString = typeof error === 'string' ? error : error.toString();
  return extensionConfig.consoleFilters.some(pattern => pattern.test(errorString));
}

/**
 * Get development mode detection script
 */
export function getDevModeScript(): string {
  return `
    // Development mode extension conflict detection
    (function() {
      if (process.env.NODE_ENV !== 'development') return;

      // Set flag for debugging extension errors
      window.__DEBUG_EXTENSION_ERRORS__ = localStorage.getItem('debug_extensions') === 'true';

      // Add helper to toggle extension error debugging
      window.toggleExtensionDebug = function() {
        const current = window.__DEBUG_EXTENSION_ERRORS__;
        window.__DEBUG_EXTENSION_ERRORS__ = !current;
        localStorage.setItem('debug_extensions', (!current).toString());
        console.log('Extension error debugging:', !current ? 'enabled' : 'disabled');
      };

      console.log('%c🛠️ Development Mode', 'color: #4CAF50; font-weight: bold');
      console.log('Having extension issues? Try window.toggleExtensionDebug()');
    })();
  `;
}

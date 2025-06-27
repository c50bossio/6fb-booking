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

      // Add helper to run enhanced detection
      window.runExtensionDetection = function() {
        console.log('🔍 Running enhanced extension detection...');
        console.log('To run the full detector, use: node scripts/enhanced-extension-detector.js');

        // Quick client-side detection
        const detected = [];
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) detected.push('React DevTools');
        if (window.__REDUX_DEVTOOLS_EXTENSION__) detected.push('Redux DevTools');
        if (document.querySelector('.adsbygoogle') && document.querySelector('.adsbygoogle').style.display === 'none') {
          detected.push('Ad Blocker');
        }

        console.log('Detected extensions:', detected.length > 0 ? detected : 'None');
        return detected;
      };

      // Add helper to test connectivity
      window.testConnectivity = async function() {
        const endpoints = ['http://localhost:3000', 'http://localhost:8000', 'http://localhost:8000/api/v1/auth/health'];
        const results = {};

        for (const endpoint of endpoints) {
          try {
            const start = Date.now();
            const response = await fetch(endpoint);
            const time = Date.now() - start;
            results[endpoint] = { status: response.ok ? 'success' : 'failed', time: time + 'ms' };
          } catch (error) {
            results[endpoint] = { status: 'failed', error: error.message };
          }
        }

        console.log('Connectivity test results:', results);
        return results;
      };

      console.log('%c🛠️ Development Mode', 'color: #4CAF50; font-weight: bold');
      console.log('Available commands:');
      console.log('• window.toggleExtensionDebug() - Toggle extension error debugging');
      console.log('• window.runExtensionDetection() - Quick extension detection');
      console.log('• window.testConnectivity() - Test localhost connectivity');
    })();
  `;
}

/**
 * Enhanced extension compatibility database
 */
export const extensionCompatibilityDB = {
  categories: {
    adBlockers: {
      description: 'Ad blockers can interfere with localhost development by blocking API requests',
      commonIssues: ['API requests blocked', 'CSS/JS resources blocked', 'localhost connectivity issues'],
      solutions: ['Add localhost to whitelist', 'Disable for development domain', 'Create exception rules']
    },
    corsModifiers: {
      description: 'CORS-modifying extensions can corrupt API requests and responses',
      commonIssues: ['Modified request headers', 'Authentication bypass', 'API response corruption'],
      solutions: ['Disable for localhost', 'Clear all custom headers', 'Add development domain exceptions']
    },
    privacyTools: {
      description: 'Privacy extensions may block tracking or modify requests in development',
      commonIssues: ['Request blocking', 'Tracking prevention conflicts', 'localhost security warnings'],
      solutions: ['Add localhost to trusted sites', 'Disable tracking protection for development', 'Configure security exceptions']
    },
    developerTools: {
      description: 'Developer tools are generally safe but may impact performance',
      commonIssues: ['Performance impact', 'State mutation', 'Hook interference'],
      solutions: ['Configure to minimize interference', 'Disable strict mode warnings', 'Use production builds for testing']
    },
    contentModifiers: {
      description: 'Extensions that modify page content can interfere with forms and inputs',
      commonIssues: ['Form injection', 'DOM modification', 'Input interference'],
      solutions: ['Disable form injection', 'Add development domain to ignore list', 'Use manual mode for testing']
    }
  },

  knownExtensions: {
    // Safe extensions
    'react-developer-tools': { category: 'developerTools', safe: true, chromeId: 'fmkadmapgofadopljbjfkapdkoienihi' },
    'redux-devtools': { category: 'developerTools', safe: true, chromeId: 'lmhkpmbekcpmknklioeibfkpmmfibljd' },
    '1password': { category: 'contentModifiers', safe: true, chromeId: 'aeblfdkhhhdcdjpifhhbdiojplfjncoa' },
    'bitwarden': { category: 'contentModifiers', safe: true, chromeId: 'nngceckbapebfimnlniiiahkandclblb' },
    'lighthouse': { category: 'developerTools', safe: true, chromeId: 'blipmdconlkpinefehnmjammfjpmpbjk' },

    // Warning extensions
    'ublock-origin': { category: 'adBlockers', safe: false, chromeId: 'cjpalhdlnbpafiamejdnhcphjbkeiagm' },
    'adblock-plus': { category: 'adBlockers', safe: false, chromeId: 'cfhdojbkjhnklbpkdaibdccddilifddb' },
    'privacy-badger': { category: 'privacyTools', safe: false, chromeId: 'pkehgijcmpdhfbdbbnkijodmdjhbjlgp' },
    'ghostery': { category: 'privacyTools', safe: false, chromeId: 'mlomiejdfkolichcflejclcbmpeaniij' },
    'grammarly': { category: 'contentModifiers', safe: false, chromeId: 'kbfnbcaeplbcioakkpcpgfkobkghlhen' },

    // Problematic extensions
    'cors-unblock': { category: 'corsModifiers', safe: false, chromeId: 'lfhmikememgdcahcdlaciloancbhjino' },
    'modheader': { category: 'corsModifiers', safe: false, chromeId: 'idgpnmonknjnojddfkpgkljpfnnfcklj' },
    'requestly': { category: 'corsModifiers', safe: false, chromeId: 'mdnleldcmiljblolnjhpnblkcekpdkpa' },
    'cors-everywhere': { category: 'corsModifiers', safe: false, chromeId: 'dboaklophljenpcjkbbibpkbkpnigdda' }
  }
};

/**
 * Get specific configuration instructions for an extension
 */
export function getExtensionConfig(extensionName: string): string | null {
  const configs: Record<string, string> = {
    'ublock-origin': `
1. Click uBlock Origin icon → Dashboard
2. Whitelist tab → Add: localhost, 127.0.0.1, localhost:3000, localhost:8000
3. My filters tab → Add: @@||localhost^$document, @@||127.0.0.1^$document
4. Apply changes`,

    'privacy-badger': `
1. Click Privacy Badger icon → Settings
2. Manage Data → Add to "Allow on these domains":
   - localhost:3000
   - localhost:8000
   - 127.0.0.1:3000
   - 127.0.0.1:8000`,

    'modheader': `
1. Open ModHeader extension
2. Create Profile: "Development - Localhost"
3. Filters → Add URL filters: localhost:*, 127.0.0.1:*
4. Headers → Remove all custom headers for localhost`,

    'grammarly': `
1. Grammarly Settings → Website Preferences
2. Add localhost to "Never check on these sites"
3. Or disable "Check for writing suggestions as you type" for development`
  };

  return configs[extensionName.toLowerCase()] || null;
}

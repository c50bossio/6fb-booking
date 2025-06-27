'use client';

import { useEffect, useState } from 'react';

interface ExtensionInfo {
  name: string;
  detected: boolean;
  status: 'safe' | 'warning' | 'problematic';
  recommendation?: string;
  category?: string;
  risks?: string[];
  solutions?: string[];
}

interface ConnectivityTest {
  endpoint: string;
  status: 'success' | 'failed' | 'testing';
  responseTime?: number;
  error?: string;
}

export default function ExtensionDetector() {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [showDetector, setShowDetector] = useState(false);
  const [connectivityTests, setConnectivityTests] = useState<ConnectivityTest[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(null);

  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const runConnectivityTests = async () => {
      const endpoints = [
        'http://localhost:3000',
        'http://localhost:8000',
        'http://localhost:8000/api/v1/auth/health'
      ];

      const tests = endpoints.map(endpoint => ({
        endpoint,
        status: 'testing' as const
      }));

      setConnectivityTests(tests);

      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        const startTime = Date.now();

        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });

          const responseTime = Date.now() - startTime;

          setConnectivityTests(prev => prev.map((test, index) =>
            index === i ? {
              ...test,
              status: response.ok ? 'success' : 'failed',
              responseTime: response.ok ? responseTime : undefined,
              error: response.ok ? undefined : `HTTP ${response.status}`
            } : test
          ));
        } catch (error) {
          setConnectivityTests(prev => prev.map((test, index) =>
            index === i ? {
              ...test,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Network error'
            } : test
          ));
        }
      }
    };

    const detectExtensions = () => {
      const detectedExtensions: ExtensionInfo[] = [];

      // Enhanced extension detection with categories and detailed information

      // Developer Tools (Safe Extensions)
      const devToolChecks = [
        {
          name: 'React Developer Tools',
          indicator: '__REACT_DEVTOOLS_GLOBAL_HOOK__',
          category: 'Developer Tools',
          risks: ['Performance impact during development'],
          solutions: ['Configure to hide console logs in strict mode', 'Disable for performance testing']
        },
        {
          name: 'Redux DevTools',
          indicator: '__REDUX_DEVTOOLS_EXTENSION__',
          category: 'Developer Tools',
          risks: ['State inspection overhead'],
          solutions: ['Use only when debugging state', 'Disable in production builds']
        }
      ];

      devToolChecks.forEach(check => {
        if ((window as any)[check.indicator]) {
          detectedExtensions.push({
            name: check.name,
            detected: true,
            status: 'safe',
            category: check.category,
            risks: check.risks,
            solutions: check.solutions,
            recommendation: `Safe to use. ${check.solutions[0]}`
          });
        }
      });

      // Enhanced Ad Blocker Detection
      const testElement = document.createElement('div');
      testElement.className = 'ad advertisement ads banner doubleclick adsystem';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      testElement.style.height = '100px';
      testElement.style.width = '100px';
      document.body.appendChild(testElement);

      setTimeout(() => {
        const isBlocked = testElement.offsetHeight === 0 ||
                         testElement.style.display === 'none' ||
                         testElement.offsetWidth === 0;

        if (isBlocked) {
          detectedExtensions.push({
            name: 'Ad Blocker (uBlock/AdBlock/etc.)',
            detected: true,
            status: 'warning',
            category: 'Ad Blocker',
            risks: ['API requests blocked', 'CSS/JS resources blocked', 'localhost connectivity issues'],
            solutions: ['Add localhost to whitelist', 'Disable for development domain', 'Create exception rules'],
            recommendation: 'Add localhost (ports 3000, 8000) to ad blocker whitelist.'
          });
        }
        document.body.removeChild(testElement);
      }, 100);

      // Enhanced CORS Extension Detection
      const corsIndicators = [
        { indicator: 'corsExtension', name: 'CORS Unblock' },
        { indicator: 'corsEnabled', name: 'Allow CORS' },
        { indicator: 'modHeader', name: 'ModHeader' },
        { indicator: 'requestly', name: 'Requestly' }
      ];

      corsIndicators.forEach(({ indicator, name }) => {
        if ((window as any)[indicator]) {
          detectedExtensions.push({
            name,
            detected: true,
            status: 'problematic',
            category: 'CORS Modifier',
            risks: ['Modified request headers', 'Authentication bypass', 'API response corruption'],
            solutions: ['Disable for localhost', 'Clear all custom headers', 'Add development domain exceptions'],
            recommendation: `Disable ${name} for localhost to prevent API conflicts.`
          });
        }
      });

      // Enhanced Privacy Extension Detection
      const privacyIndicators = [
        { indicator: 'privacyBadger', name: 'Privacy Badger' },
        { indicator: 'ghostery', name: 'Ghostery' },
        { indicator: 'disconnect', name: 'Disconnect' },
        { indicator: 'trackingProtection', name: 'Tracking Protection' },
        { indicator: 'duckduckgo', name: 'DuckDuckGo Privacy Essentials' }
      ];

      privacyIndicators.forEach(({ indicator, name }) => {
        if ((window as any)[indicator]) {
          detectedExtensions.push({
            name,
            detected: true,
            status: 'warning',
            category: 'Privacy Extension',
            risks: ['Request blocking', 'Tracking prevention conflicts', 'localhost security warnings'],
            solutions: ['Add localhost to trusted sites', 'Disable tracking protection for development', 'Configure security exceptions'],
            recommendation: `Add localhost to ${name} trusted sites or disable for development.`
          });
        }
      });

      // Enhanced Developer Tools Extension Detection
      const devExtensionIndicators = [
        { indicator: 'postman', name: 'Postman Interceptor' },
        { indicator: 'modHeader', name: 'ModHeader' },
        { indicator: 'requestly', name: 'Requestly' },
        { indicator: 'lighthouse', name: 'Lighthouse' }
      ];

      devExtensionIndicators.forEach(({ indicator, name }) => {
        if ((window as any)[indicator]) {
          const isSafe = name === 'Lighthouse';
          detectedExtensions.push({
            name,
            detected: true,
            status: isSafe ? 'safe' : 'warning',
            category: 'Developer Tools',
            risks: isSafe ? ['Performance impact during audits'] : ['Header modification', 'Request interception', 'CSP conflicts'],
            solutions: isSafe ? ['Use sparingly during development'] : ['Clear any CSP or header modification rules', 'Disable request interception for localhost'],
            recommendation: isSafe ? 'Safe to use for performance audits.' : 'Clear any custom headers or request modifications for localhost.'
          });
        }
      });

      // Content Modifier Detection (Grammarly, password managers, etc.)
      const contentModifiers = [
        { indicator: 'grammarly', name: 'Grammarly', safe: false },
        { indicator: 'honey', name: 'Honey', safe: false },
        { indicator: 'lastpass', name: 'LastPass', safe: false },
        { indicator: 'onepassword', name: '1Password', safe: true },
        { indicator: 'bitwarden', name: 'Bitwarden', safe: true }
      ];

      contentModifiers.forEach(({ indicator, name, safe }) => {
        if ((window as any)[indicator] || document.querySelector(`[data-${indicator}]`)) {
          detectedExtensions.push({
            name,
            detected: true,
            status: safe ? 'safe' : 'warning',
            category: 'Content Modifier',
            risks: safe ? ['Minor DOM modifications'] : ['Form injection', 'DOM modification', 'Input interference'],
            solutions: safe ? ['Generally safe for development'] : ['Disable form injection', 'Add development domain to ignore list', 'Use manual mode for testing'],
            recommendation: safe ? `${name} is generally safe for development.` : `Configure ${name} to ignore localhost or disable form injection.`
          });
        }
      });

      // Calculate compatibility score
      const calculateCompatibilityScore = () => {
        let score = 100;
        const problematicCount = detectedExtensions.filter(ext => ext.status === 'problematic').length;
        const warningCount = detectedExtensions.filter(ext => ext.status === 'warning').length;

        score -= problematicCount * 20; // 20 points per problematic extension
        score -= warningCount * 10; // 10 points per warning extension

        return Math.max(0, score);
      };

      setExtensions(detectedExtensions);
      setCompatibilityScore(calculateCompatibilityScore());
      setShowDetector(detectedExtensions.length > 0);
    };

    // Run detection and connectivity tests
    const timer = setTimeout(() => {
      detectExtensions();
      runConnectivityTests();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'problematic': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe': return '✅';
      case 'warning': return '⚠️';
      case 'problematic': return '❌';
      default: return '❓';
    }
  };

  if (!showDetector || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConnectivityColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'testing': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg z-50">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white text-sm">Extension Detector</h3>
          {compatibilityScore !== null && (
            <span className={`text-xs font-mono ${getScoreColor(compatibilityScore)}`}>
              {compatibilityScore}/100
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 bg-slate-700 rounded"
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
          <button
            onClick={() => setShowDetector(false)}
            className="text-gray-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Connectivity Status */}
      {showAdvanced && connectivityTests.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-300 mb-2">Connectivity Tests</h4>
          {connectivityTests.map((test, index) => (
            <div key={index} className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400 truncate flex-1">
                {test.endpoint.replace('http://localhost:', ':')}
              </span>
              <span className={`font-mono ml-2 ${getConnectivityColor(test.status)}`}>
                {test.status === 'success' && test.responseTime ? `${test.responseTime}ms` : test.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Extensions List */}
      <div className="space-y-2">
        {extensions.map((ext, index) => (
          <div key={index} className="text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span>{getStatusIcon(ext.status)}</span>
                <span className={`font-medium ${getStatusColor(ext.status)}`}>
                  {ext.name}
                </span>
                {showAdvanced && ext.category && (
                  <span className="text-xs text-gray-500">({ext.category})</span>
                )}
              </div>
            </div>

            {showAdvanced ? (
              <div className="mt-1 ml-4 space-y-1">
                {ext.risks && ext.risks.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs">Risks: </span>
                    <span className="text-red-300 text-xs">{ext.risks.join(', ')}</span>
                  </div>
                )}
                {ext.solutions && ext.solutions.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs">Solutions: </span>
                    <span className="text-green-300 text-xs">{ext.solutions[0]}</span>
                  </div>
                )}
              </div>
            ) : (
              ext.recommendation && (
                <p className="text-gray-300 mt-1 text-xs leading-tight ml-4">
                  {ext.recommendation}
                </p>
              )
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-600 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              alert('Test in incognito/private mode:\n• Chrome: Ctrl+Shift+N\n• Firefox: Ctrl+Shift+P\n• Safari: Cmd+Shift+N');
            }}
            className="text-blue-400 hover:text-blue-300 text-xs underline"
          >
            Incognito Test
          </button>
          <button
            onClick={() => {
              if (window.__DEBUG_EXTENSION_ERRORS__ !== undefined) {
                (window as any).toggleExtensionDebug();
                alert(`Extension error debugging ${(window as any).__DEBUG_EXTENSION_ERRORS__ ? 'enabled' : 'disabled'}`);
              } else {
                alert('Extension debugging not available. Make sure the ExtensionErrorHandler is loaded.');
              }
            }}
            className="text-yellow-400 hover:text-yellow-300 text-xs underline"
          >
            Toggle Debug
          </button>
          {showAdvanced && (
            <button
              onClick={async () => {
                try {
                  // Re-run detection
                  const timer = setTimeout(() => {
                    window.location.reload();
                  }, 100);
                  alert('Re-running detection tests...');
                } catch (error) {
                  alert('Could not re-run tests. Try refreshing the page.');
                }
              }}
              className="text-green-400 hover:text-green-300 text-xs underline"
            >
              Re-test
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="text-xs text-gray-400">
            <p className="mb-1">Quick Commands:</p>
            <div className="font-mono text-xs bg-slate-900 p-2 rounded">
              <div>Frontend: npm run dev</div>
              <div>Backend: uvicorn main:app --reload</div>
              <div>Enhanced Test: node scripts/enhanced-extension-detector.js</div>
            </div>
          </div>
        )}

        {compatibilityScore !== null && compatibilityScore < 70 && (
          <div className="text-xs text-orange-300 bg-orange-900/20 p-2 rounded">
            ⚠️ Low compatibility score detected. Consider running the enhanced detector script or testing in incognito mode.
          </div>
        )}
      </div>
    </div>
  );
}

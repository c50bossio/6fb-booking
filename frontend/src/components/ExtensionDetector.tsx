'use client';

import { useEffect, useState } from 'react';

interface ExtensionInfo {
  name: string;
  detected: boolean;
  status: 'safe' | 'warning' | 'problematic';
  recommendation?: string;
}

export default function ExtensionDetector() {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [showDetector, setShowDetector] = useState(false);

  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const detectExtensions = () => {
      const detectedExtensions: ExtensionInfo[] = [];

      // React Developer Tools
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        detectedExtensions.push({
          name: 'React Developer Tools',
          detected: true,
          status: 'safe',
          recommendation: 'Safe to use. Configure to hide console logs in strict mode.'
        });
      }

      // Redux DevTools
      if ((window as any).__REDUX_DEVTOOLS_EXTENSION__) {
        detectedExtensions.push({
          name: 'Redux DevTools',
          detected: true,
          status: 'safe',
          recommendation: 'Safe to use for state management debugging.'
        });
      }

      // Check for common ad blockers by testing blocked elements
      const testElement = document.createElement('div');
      testElement.className = 'ad advertisement ads';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      document.body.appendChild(testElement);
      
      setTimeout(() => {
        if (testElement.offsetHeight === 0 || testElement.style.display === 'none') {
          detectedExtensions.push({
            name: 'Ad Blocker (uBlock/AdBlock)',
            detected: true,
            status: 'warning',
            recommendation: 'Add localhost to whitelist to prevent API blocking.'
          });
        }
        document.body.removeChild(testElement);
      }, 100);

      // Check for CORS extensions
      if ((window as any).corsExtension || (window as any).corsEnabled) {
        detectedExtensions.push({
          name: 'CORS Extension',
          detected: true,
          status: 'problematic',
          recommendation: 'Disable for localhost to prevent API conflicts.'
        });
      }

      // Check for privacy extensions (generic detection)
      const privacyIndicators = [
        'privacyBadger',
        'ghostery',
        'disconnect',
        'trackingProtection'
      ];

      privacyIndicators.forEach(indicator => {
        if ((window as any)[indicator]) {
          detectedExtensions.push({
            name: 'Privacy Extension',
            detected: true,
            status: 'warning',
            recommendation: 'Add localhost to privacy exception list.'
          });
        }
      });

      // Check for developer tools extensions
      if ((window as any).postman || (window as any).modHeader) {
        detectedExtensions.push({
          name: 'HTTP/API Extension',
          detected: true,
          status: 'warning',
          recommendation: 'Clear any CSP or header modification rules.'
        });
      }

      setExtensions(detectedExtensions);
      setShowDetector(detectedExtensions.length > 0);
    };

    // Run detection after a short delay
    const timer = setTimeout(detectExtensions, 1000);
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

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-white text-sm">Extension Detector</h3>
        <button
          onClick={() => setShowDetector(false)}
          className="text-gray-400 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        {extensions.map((ext, index) => (
          <div key={index} className="text-xs">
            <div className="flex items-center gap-1">
              <span>{getStatusIcon(ext.status)}</span>
              <span className={`font-medium ${getStatusColor(ext.status)}`}>
                {ext.name}
              </span>
            </div>
            {ext.recommendation && (
              <p className="text-gray-300 mt-1 text-xs leading-tight">
                {ext.recommendation}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-600">
        <p className="text-xs text-gray-400">
          Having issues? Try{' '}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Window/open"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
            onClick={(e) => {
              e.preventDefault();
              // Open incognito instructions
              alert('Test in incognito/private mode:\n• Chrome: Ctrl+Shift+N\n• Firefox: Ctrl+Shift+P\n• Safari: Cmd+Shift+N');
            }}
          >
            incognito mode
          </a>
        </p>
      </div>
    </div>
  );
}
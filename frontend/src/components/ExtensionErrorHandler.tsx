'use client';

import { useEffect } from 'react';

export default function ExtensionErrorHandler() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Override console.error to filter out extension-related errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorString = args.join(' ');
      
      // Filter out common extension-related errors
      const extensionPatterns = [
        /chrome-extension:\/\//i,
        /moz-extension:\/\//i,
        /extension:\/\//i,
        /Failed to load resource.*extension/i,
        /DevTools failed to load source map/i,
        /Cannot load extension/i,
        /Extension context invalidated/i,
        /chrome\.runtime\.sendMessage/i,
        /chrome\.runtime\.connect/i,
        /Access to script.*blocked by CORS/i,
        /Refused to load.*violates.*Content Security Policy/i,
      ];

      const shouldFilter = extensionPatterns.some(pattern => pattern.test(errorString));
      
      if (!shouldFilter) {
        originalError.apply(console, args);
      } else {
        // Log to a custom debug channel instead
        if ((window as any).__DEBUG_EXTENSION_ERRORS__) {
          console.debug('[Extension Error Filtered]:', errorString);
        }
      }
    };

    // Handle unhandled rejections from extensions
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorString = event.reason?.toString() || '';
      if (errorString.includes('chrome-extension') || 
          errorString.includes('moz-extension') ||
          errorString.includes('Extension context')) {
        event.preventDefault();
        console.debug('[Extension Promise Rejection Filtered]:', errorString);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Handle global errors from extensions
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.filename?.includes('extension://') || 
          event.message?.includes('extension') ||
          event.source?.toString().includes('extension')) {
        event.preventDefault();
        console.debug('[Extension Global Error Filtered]:', event.message);
        return false;
      }
    };

    window.addEventListener('error', handleGlobalError, true);

    // Cleanup
    return () => {
      console.error = originalError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError, true);
    };
  }, []);

  return null;
}
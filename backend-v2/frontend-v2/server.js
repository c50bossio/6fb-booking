/**
 * Custom server wrapper for Vercel deployment
 * Ensures polyfills are loaded before Next.js starts
 */

// CRITICAL: Apply polyfills before ANYTHING else
(function() {
  if (typeof global !== 'undefined' && typeof window === 'undefined') {
    // We're in a server environment
    if (typeof self === 'undefined') {
      Object.defineProperty(global, 'self', {
        value: global,
        writable: true,
        configurable: true
      });
    }
    
    if (typeof window === 'undefined') {
      Object.defineProperty(global, 'window', {
        value: global,
        writable: true,
        configurable: true
      });
    }
    
    if (typeof document === 'undefined') {
      Object.defineProperty(global, 'document', {
        value: {
          createElement: (tag) => ({
            tagName: tag ? tag.toUpperCase() : 'DIV',
            style: {},
            setAttribute: () => {},
            getAttribute: () => null,
            appendChild: (child) => child,
            removeChild: (child) => child
          }),
          createTextNode: (text) => ({ textContent: text || '', nodeType: 3 }),
          querySelector: () => null,
          querySelectorAll: () => [],
          getElementById: () => null,
          getElementsByTagName: () => [],
          getElementsByClassName: () => [],
          head: { appendChild: (child) => child },
          body: { appendChild: (child) => child },
          documentElement: { style: {} },
          styleSheets: []
        },
        writable: true,
        configurable: true
      });
    }
    
    if (typeof navigator === 'undefined') {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Node.js/Vercel SSR',
          platform: 'server',
          language: 'en-US'
        },
        writable: true,
        configurable: true
      });
    }
  }
})();

// Load Next.js after polyfills are applied
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
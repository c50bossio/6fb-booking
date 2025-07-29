// Add polyfills for Node.js SSR environment
if (typeof global !== 'undefined') {
  // Fix 'self is not defined' error
  if (typeof self === 'undefined') {
    global.self = global;
  }
  
  // Fix 'window is not defined' error
  if (typeof window === 'undefined') {
    global.window = global;
  }
  
  // Fix 'document is not defined' error
  if (typeof document === 'undefined') {
    global.document = {
      createElement: () => ({}),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      body: {},
      head: {}
    };
  }
  
  // Fix 'navigator is not defined' error
  if (typeof navigator === 'undefined') {
    global.navigator = {
      userAgent: 'SSR',
      onLine: true
    };
  }
  
  // Fix 'location is not defined' error
  if (typeof location === 'undefined') {
    global.location = {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: ''
    };
  }
}
/**
 * Vercel/AWS Lambda Specific Polyfills
 * Addresses the unique constraints of AWS Lambda runtime environment
 */

// Detect AWS Lambda environment
const isVercelLambda = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV;

// Define critical globals using Object.defineProperty for AWS Lambda compatibility
function defineGlobalSafely(name, value) {
  try {
    if (typeof global !== 'undefined' && !(name in global)) {
      Object.defineProperty(global, name, {
        value: value,
        writable: true,
        enumerable: false,
        configurable: true
      });
    }
  } catch (error) {
    // Fallback for read-only global environments
    try {
      global[name] = value;
    } catch (fallbackError) {
      // Last resort - define on globalThis
      if (typeof globalThis !== 'undefined') {
        globalThis[name] = value;
      }
    }
  }
}

// AWS Lambda compatible global definitions
if (isVercelLambda && typeof global !== 'undefined') {
  // Critical browser globals that cause "self is not defined"
  defineGlobalSafely('self', global);
  defineGlobalSafely('window', global);
  
  // Enhanced navigator for Chart.js compatibility
  defineGlobalSafely('navigator', {
    userAgent: 'AWS Lambda/Vercel SSR',
    platform: 'linux',
    language: 'en-US',
    languages: ['en-US'],
    onLine: true,
    cookieEnabled: false,
    doNotTrack: null,
    maxTouchPoints: 0,
    hardwareConcurrency: 1,
    deviceMemory: 4,
    connection: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50
    }
  });
  
  // Enhanced document object for DOM operations (styled-jsx compatible)
  defineGlobalSafely('document', {
    createElement: (tag) => ({
      tagName: tag ? tag.toUpperCase() : 'DIV',
      nodeName: tag ? tag.toUpperCase() : 'DIV',
      nodeType: 1,
      setAttribute: () => {},
      getAttribute: () => null,
      hasAttribute: () => false,
      removeAttribute: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      style: new Proxy({}, {
        get: () => '',
        set: () => true,
        has: () => true
      }),
      className: '',
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => false,
        length: 0
      },
      innerHTML: '',
      outerHTML: '',
      textContent: '',
      appendChild: function(child) { return child; },
      removeChild: function(child) { return child; },
      insertBefore: function(newNode, referenceNode) { return newNode; },
      replaceChild: function(newChild, oldChild) { return oldChild; },
      cloneNode: function() { return this; },
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      getElementsByTagName: () => [],
      getElementsByClassName: () => [],
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 }),
      offsetWidth: 0,
      offsetHeight: 0,
      scrollTop: 0,
      scrollLeft: 0,
      clientWidth: 0,
      clientHeight: 0
    }),
    createTextNode: (text) => ({ 
      textContent: text || '', 
      nodeType: 3,
      nodeName: '#text',
      parentNode: null,
      cloneNode: function() { return this; }
    }),
    createDocumentFragment: () => ({
      nodeType: 11,
      nodeName: '#document-fragment',
      appendChild: function(child) { return child; },
      removeChild: function(child) { return child; },
      querySelector: () => null,
      querySelectorAll: () => [],
      children: [],
      childNodes: []
    }),
    body: {
      nodeType: 1,
      nodeName: 'BODY',
      tagName: 'BODY',
      appendChild: function(child) { return child; },
      removeChild: function(child) { return child; },
      insertBefore: function(newNode, referenceNode) { return newNode; },
      addEventListener: () => {},
      removeEventListener: () => {},
      style: new Proxy({}, {
        get: () => '',
        set: () => true,
        has: () => true
      }),
      className: '',
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => false,
        length: 0
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
      children: [],
      childNodes: []
    },
    head: {
      nodeType: 1,
      nodeName: 'HEAD', 
      tagName: 'HEAD',
      appendChild: function(child) { return child; },
      removeChild: function(child) { return child; },
      insertBefore: function(newNode, referenceNode) { return newNode; },
      querySelector: () => null,
      querySelectorAll: () => [],
      children: [],
      childNodes: []
    },
    documentElement: {
      nodeType: 1,
      nodeName: 'HTML',
      tagName: 'HTML',
      style: new Proxy({}, {
        get: () => '',
        set: () => true,
        has: () => true
      }),
      setAttribute: () => {},
      getAttribute: () => null,
      hasAttribute: () => false,
      querySelector: () => null,
      querySelectorAll: () => [],
      className: '',
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => false
      }
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    cookie: '',
    title: 'BookedBarber',
    readyState: 'complete',
    URL: 'https://bookedbarber.com',
    domain: 'bookedbarber.com',
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    getElementsByName: () => [],
    createEvent: () => ({
      initEvent: () => {},
      preventDefault: () => {},
      stopPropagation: () => {}
    }),
    // styled-jsx specific compatibility
    styleSheets: [],
    implementation: {
      createHTMLDocument: () => global.document,
      hasFeature: () => false
    }
  });
  
  // Location object for routing compatibility
  defineGlobalSafely('location', {
    href: 'https://bookedbarber.com',
    origin: 'https://bookedbarber.com',
    protocol: 'https:',
    host: 'bookedbarber.com',
    hostname: 'bookedbarber.com',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    assign: () => {},
    replace: () => {},
    reload: () => {},
    toString: () => 'https://bookedbarber.com'
  });
  
  // Storage interfaces for client-side compatibility
  const createStorage = () => ({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0
  });
  
  defineGlobalSafely('localStorage', createStorage());
  defineGlobalSafely('sessionStorage', createStorage());
  
  // Screen object for responsive design
  defineGlobalSafely('screen', {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    colorDepth: 24,
    pixelDepth: 24,
    orientation: {
      type: 'landscape-primary',
      angle: 0
    }
  });
  
  // Animation frame functions
  defineGlobalSafely('requestAnimationFrame', (callback) => setTimeout(callback, 16));
  defineGlobalSafely('cancelAnimationFrame', (id) => clearTimeout(id));
  
  // WebSocket mock for real-time features
  defineGlobalSafely('WebSocket', class WebSocket {
    constructor() {
      this.readyState = 3; // CLOSED
      this.CONNECTING = 0;
      this.OPEN = 1;
      this.CLOSING = 2;
      this.CLOSED = 3;
    }
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  });
  
  // Observer APIs for modern web features
  defineGlobalSafely('IntersectionObserver', class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  
  defineGlobalSafely('MutationObserver', class MutationObserver {
    constructor() {}
    observe() {}
    disconnect() {}
  });
  
  defineGlobalSafely('ResizeObserver', class ResizeObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  
  // Crypto API for security features
  defineGlobalSafely('crypto', {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  });
  
  // Canvas API for Chart.js compatibility
  defineGlobalSafely('HTMLCanvasElement', class HTMLCanvasElement {
    constructor() {
      this.width = 300;
      this.height = 150;
      this.style = {};
    }
    getContext() {
      return {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        createImageData: () => ({ data: [] }),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        rect: () => {},
        clip: () => {}
      };
    }
    toDataURL() {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
    getBoundingClientRect() {
      return { top: 0, left: 0, width: this.width, height: this.height };
    }
  });
  
  // Image API for dynamic loading
  defineGlobalSafely('Image', class Image {
    constructor() {
      this.width = 0;
      this.height = 0;
      this.onload = () => {};
      this.onerror = () => {};
    }
  });
  
  // Console compatibility (usually available but ensure it exists)
  if (!global.console) {
    defineGlobalSafely('console', {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
      trace: () => {},
      group: () => {},
      groupEnd: () => {},
      time: () => {},
      timeEnd: () => {}
    });
  }
}

// Export for webpack alias compatibility
module.exports = global;

// Also ensure immediate execution for require() calls
if (typeof global !== 'undefined' && typeof self === 'undefined') {
  global.self = global;
}
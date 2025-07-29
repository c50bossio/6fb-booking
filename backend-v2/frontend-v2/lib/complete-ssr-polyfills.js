/**
 * Complete SSR Polyfills for Next.js on Vercel
 * 
 * This file provides comprehensive polyfills for all browser APIs
 * that might be accessed during server-side rendering on Vercel/AWS Lambda
 */

// Import existing polyfills
require('./vercel-polyfills');
require('./global-polyfills');
require('./ssr-polyfills');

// Additional polyfills for libraries that might access browser APIs
if (typeof global !== 'undefined' && typeof window === 'undefined') {
  // Ensure all browser globals are defined
  const browserGlobals = [
    'window', 'document', 'navigator', 'location', 'history',
    'localStorage', 'sessionStorage', 'screen', 'alert', 'confirm',
    'prompt', 'fetch', 'XMLHttpRequest', 'FormData', 'Blob',
    'File', 'FileReader', 'URL', 'URLSearchParams', 'Headers',
    'Request', 'Response', 'AbortController', 'AbortSignal',
    'crypto', 'performance', 'console', 'self'
  ];

  browserGlobals.forEach(globalName => {
    if (!(globalName in global)) {
      try {
        // Use the polyfilled values from vercel-polyfills if available
        if (globalName === 'self') {
          Object.defineProperty(global, 'self', {
            value: global,
            writable: true,
            enumerable: false,
            configurable: true
          });
        }
      } catch (e) {
        // Ignore errors for already defined globals
      }
    }
  });

  // Additional polyfills for Chart.js specific requirements
  if (!global.HTMLCanvasElement) {
    global.HTMLCanvasElement = class HTMLCanvasElement {
      constructor() {
        this.width = 300;
        this.height = 150;
        this.style = {};
        this._context = null;
      }
      
      getContext(type) {
        if (!this._context) {
          this._context = {
            canvas: this,
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            lineCap: 'butt',
            lineJoin: 'miter',
            font: '10px sans-serif',
            textAlign: 'start',
            textBaseline: 'alphabetic',
            fillRect: () => {},
            clearRect: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(4) }),
            putImageData: () => {},
            createImageData: () => ({ data: new Uint8ClampedArray(4) }),
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
            measureText: (text) => ({ width: text ? text.length * 6 : 0 }),
            transform: () => {},
            rect: () => {},
            clip: () => {},
            quadraticCurveTo: () => {},
            bezierCurveTo: () => {},
            arcTo: () => {},
            isPointInPath: () => false,
            isPointInStroke: () => false,
            createLinearGradient: () => ({
              addColorStop: () => {}
            }),
            createRadialGradient: () => ({
              addColorStop: () => {}
            }),
            createPattern: () => null,
            getLineDash: () => [],
            setLineDash: () => {}
          };
        }
        return this._context;
      }
      
      toDataURL() {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      }
      
      toBlob(callback) {
        if (callback) {
          callback(new Blob([''], { type: 'image/png' }));
        }
      }
      
      getBoundingClientRect() {
        return { 
          top: 0, 
          left: 0, 
          width: this.width, 
          height: this.height,
          right: this.width,
          bottom: this.height,
          x: 0,
          y: 0
        };
      }
    };
  }

  // Enhanced Image constructor for better compatibility
  if (!global.Image) {
    global.Image = class Image extends EventTarget {
      constructor(width, height) {
        super();
        this.width = width || 0;
        this.height = height || 0;
        this.naturalWidth = this.width;
        this.naturalHeight = this.height;
        this.complete = false;
        this.src = '';
        this.alt = '';
        this.crossOrigin = null;
        this.loading = 'auto';
      }
      
      addEventListener(type, listener) {
        super.addEventListener(type, listener);
        // Simulate immediate load for SSR
        if (type === 'load' && this.src) {
          setTimeout(() => {
            this.complete = true;
            this.dispatchEvent(new Event('load'));
          }, 0);
        }
      }
    };
  }

  // EventTarget polyfill if not available
  if (!global.EventTarget) {
    global.EventTarget = class EventTarget {
      constructor() {
        this._listeners = {};
      }
      
      addEventListener(type, listener) {
        if (!this._listeners[type]) {
          this._listeners[type] = [];
        }
        this._listeners[type].push(listener);
      }
      
      removeEventListener(type, listener) {
        if (!this._listeners[type]) return;
        const index = this._listeners[type].indexOf(listener);
        if (index !== -1) {
          this._listeners[type].splice(index, 1);
        }
      }
      
      dispatchEvent(event) {
        if (!this._listeners[event.type]) return true;
        this._listeners[event.type].forEach(listener => {
          listener.call(this, event);
        });
        return true;
      }
    };
  }

  // Event constructor
  if (!global.Event) {
    global.Event = class Event {
      constructor(type, options = {}) {
        this.type = type;
        this.bubbles = options.bubbles || false;
        this.cancelable = options.cancelable || false;
        this.composed = options.composed || false;
        this.defaultPrevented = false;
        this.eventPhase = 0;
        this.target = null;
        this.currentTarget = null;
        this.timeStamp = Date.now();
      }
      
      preventDefault() {
        this.defaultPrevented = true;
      }
      
      stopPropagation() {}
      stopImmediatePropagation() {}
    };
  }

  // CustomEvent constructor
  if (!global.CustomEvent) {
    global.CustomEvent = class CustomEvent extends Event {
      constructor(type, options = {}) {
        super(type, options);
        this.detail = options.detail || null;
      }
    };
  }

  // Performance API polyfill
  if (!global.performance) {
    global.performance = {
      now: () => Date.now(),
      mark: () => {},
      measure: () => {},
      clearMarks: () => {},
      clearMeasures: () => {},
      getEntriesByName: () => [],
      getEntriesByType: () => [],
      getEntries: () => []
    };
  }

  // Blob constructor enhancement
  if (!global.Blob || typeof global.Blob !== 'function') {
    global.Blob = class Blob {
      constructor(parts = [], options = {}) {
        this.size = parts.reduce((acc, part) => {
          if (typeof part === 'string') return acc + part.length;
          if (part instanceof ArrayBuffer) return acc + part.byteLength;
          if (part instanceof Blob) return acc + part.size;
          return acc;
        }, 0);
        this.type = options.type || '';
        this._parts = parts;
      }
      
      async text() {
        return this._parts.map(part => {
          if (typeof part === 'string') return part;
          return '';
        }).join('');
      }
      
      async arrayBuffer() {
        const text = await this.text();
        const buffer = new ArrayBuffer(text.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < text.length; i++) {
          view[i] = text.charCodeAt(i);
        }
        return buffer;
      }
      
      slice(start, end, type) {
        return new Blob([], { type: type || this.type });
      }
    };
  }

  // File constructor
  if (!global.File) {
    global.File = class File extends Blob {
      constructor(parts, name, options = {}) {
        super(parts, options);
        this.name = name;
        this.lastModified = options.lastModified || Date.now();
        this.lastModifiedDate = new Date(this.lastModified);
      }
    };
  }

  // FileReader polyfill
  if (!global.FileReader) {
    global.FileReader = class FileReader extends EventTarget {
      constructor() {
        super();
        this.error = null;
        this.readyState = 0;
        this.result = null;
      }
      
      abort() {
        this.readyState = 2;
      }
      
      readAsArrayBuffer(blob) {
        this._read(blob, 'arraybuffer');
      }
      
      readAsDataURL(blob) {
        this._read(blob, 'dataurl');
      }
      
      readAsText(blob) {
        this._read(blob, 'text');
      }
      
      _read(blob, type) {
        this.readyState = 1;
        setTimeout(async () => {
          try {
            if (type === 'text') {
              this.result = await blob.text();
            } else if (type === 'dataurl') {
              this.result = `data:${blob.type};base64,`;
            } else if (type === 'arraybuffer') {
              this.result = await blob.arrayBuffer();
            }
            this.readyState = 2;
            this.dispatchEvent(new Event('load'));
            this.dispatchEvent(new Event('loadend'));
          } catch (error) {
            this.error = error;
            this.readyState = 2;
            this.dispatchEvent(new Event('error'));
            this.dispatchEvent(new Event('loadend'));
          }
        }, 0);
      }
    };
  }

  // URL polyfill enhancement
  if (!global.URL || !global.URL.createObjectURL) {
    const OriginalURL = global.URL || class URL {
      constructor(url, base) {
        this.href = url;
        this.protocol = 'https:';
        this.host = 'bookedbarber.com';
        this.hostname = 'bookedbarber.com';
        this.port = '';
        this.pathname = '/';
        this.search = '';
        this.hash = '';
        this.origin = 'https://bookedbarber.com';
      }
      
      toString() {
        return this.href;
      }
    };
    
    OriginalURL.createObjectURL = (obj) => {
      return `blob:https://bookedbarber.com/${Math.random().toString(36).substr(2, 9)}`;
    };
    
    OriginalURL.revokeObjectURL = (url) => {
      // No-op
    };
    
    global.URL = OriginalURL;
  }

  // Ensure atob and btoa are available
  if (!global.atob) {
    global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
  }
  
  if (!global.btoa) {
    global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
  }

  // TextEncoder/TextDecoder polyfills
  if (!global.TextEncoder) {
    global.TextEncoder = class TextEncoder {
      encode(str) {
        const buf = Buffer.from(str, 'utf8');
        const arr = new Uint8Array(buf.length);
        for (let i = 0; i < buf.length; i++) {
          arr[i] = buf[i];
        }
        return arr;
      }
    };
  }

  if (!global.TextDecoder) {
    global.TextDecoder = class TextDecoder {
      constructor(encoding = 'utf-8') {
        this.encoding = encoding;
      }
      
      decode(input) {
        if (input instanceof ArrayBuffer) {
          input = new Uint8Array(input);
        }
        return Buffer.from(input).toString(this.encoding);
      }
    };
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = global;
}
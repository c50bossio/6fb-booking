/**
 * CORS Helper for 6FB Booking Platform
 *
 * This utility helps switch between direct API calls and proxy calls
 * to work around CORS issues during development and deployment.
 */

// Environment variables and configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sixfb-backend.onrender.com/api/v1';
const USE_PROXY = process.env.NEXT_PUBLIC_USE_CORS_PROXY === 'true';
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

// CORS status tracking
interface CorsStatus {
  isWorking: boolean;
  lastChecked: number;
  testResults: {
    health: boolean;
    auth: boolean;
    preflight: boolean;
  };
}

let corsStatus: CorsStatus = {
  isWorking: false,  // Force proxy usage due to intermittent CORS preflight issues
  lastChecked: Date.now() - 3 * 60 * 1000,  // Pretend we checked 3 minutes ago to reduce initial requests
  testResults: {
    health: false,
    auth: false,
    preflight: false
  }
};

/**
 * Get the appropriate API base URL based on CORS status
 */
export function getApiBaseUrl(): string {
  // Force proxy mode if environment variable is set
  if (USE_PROXY) {
    console.log('[CORS Helper] Using proxy mode (forced by environment variable)');
    return '/api/proxy/api/v1';
  }

  // In development, prefer direct calls unless CORS is broken
  if (ENVIRONMENT === 'development') {
    return corsStatus.isWorking ? BACKEND_URL : '/api/proxy/api/v1';
  }

  // In production, check CORS status and fall back to proxy if needed
  return corsStatus.isWorking ? BACKEND_URL : '/api/proxy/api/v1';
}

/**
 * Test CORS functionality with the backend
 */
export async function testCors(): Promise<CorsStatus> {
  const results = {
    health: false,
    auth: false,
    preflight: false
  };

  console.log('[CORS Helper] Testing CORS functionality...');

  try {
    // Test 1: Simple GET request to health endpoint
    try {
      const healthResponse = await fetch(`${BACKEND_URL.replace('/api/v1', '')}/health`, {
        method: 'GET',
        mode: 'cors'
      });
      results.health = healthResponse.ok;
      console.log(`[CORS Helper] Health test: ${results.health ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log('[CORS Helper] Health test: FAIL (CORS error)');
      results.health = false;
    }

    // Test 2: OPTIONS preflight request
    try {
      const preflightResponse = await fetch(`${BACKEND_URL}/auth/token`, {
        method: 'OPTIONS',
        mode: 'cors',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      results.preflight = preflightResponse.ok || preflightResponse.status === 204;
      console.log(`[CORS Helper] Preflight test: ${results.preflight ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log('[CORS Helper] Preflight test: FAIL (CORS error)');
      results.preflight = false;
    }

    // Test 3: POST request to auth endpoint (expect 422 with invalid data)
    try {
      const authResponse = await fetch(`${BACKEND_URL}/auth/token`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'cors-test@example.com',
          password: 'cors-test-pass' // pragma: allowlist secret
        })
      });
      // 422 is expected for invalid credentials, but means CORS is working
      results.auth = authResponse.status === 422 || authResponse.ok;
      console.log(`[CORS Helper] Auth test: ${results.auth ? 'PASS' : 'FAIL'} (status: ${authResponse.status})`);
    } catch (error) {
      console.log('[CORS Helper] Auth test: FAIL (CORS error)');
      results.auth = false;
    }

  } catch (globalError) {
    console.error('[CORS Helper] Global test error:', globalError);
  }

  // Update CORS status
  const isWorking = results.health && (results.preflight || results.auth);
  corsStatus = {
    isWorking,
    lastChecked: Date.now(),
    testResults: results
  };

  console.log(`[CORS Helper] Overall CORS status: ${isWorking ? 'WORKING' : 'BROKEN'}`);

  return corsStatus;
}

/**
 * Check if CORS testing is needed (throttled to avoid spam)
 */
export function shouldTestCors(): boolean {
  const fifteenMinutes = 15 * 60 * 1000;  // Increased from 5 to 15 minutes
  return Date.now() - corsStatus.lastChecked > fifteenMinutes;
}

/**
 * Get current CORS status without testing
 */
export function getCorsStatus(): CorsStatus {
  return { ...corsStatus };
}

/**
 * Force CORS retest (useful for debugging)
 */
export async function retestCors(): Promise<CorsStatus> {
  corsStatus.lastChecked = 0; // Force retest
  return testCors();
}

/**
 * Initialize CORS checking (call this on app startup)
 */
export async function initializeCors(): Promise<void> {
  // Only test in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Skip if recently tested
  if (!shouldTestCors()) {
    console.log('[CORS Helper] Skipping CORS test (recently tested)');
    return;
  }

  // Test CORS in background
  testCors().catch(error => {
    console.warn('[CORS Helper] CORS test failed:', error);
  });
}

/**
 * Create fetch wrapper that automatically uses proxy if CORS fails
 */
export async function corsAwareFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Determine which URL to use
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;

  try {
    // If using direct backend URL, test CORS periodically
    if (fullUrl.includes('sixfb-backend.onrender.com') && shouldTestCors()) {
      // Test CORS in background (don't wait for it)
      testCors().catch(() => {});
    }

    const response = await fetch(fullUrl, {
      ...options,
      mode: 'cors'
    });

    return response;

  } catch (error) {
    // If this was a direct call and it failed with CORS, try proxy
    if (fullUrl.includes('sixfb-backend.onrender.com') &&
        error instanceof TypeError &&
        error.message.includes('cors')) {

      console.log('[CORS Helper] Direct call failed, trying proxy...');

      // Update CORS status
      corsStatus.isWorking = false;
      corsStatus.lastChecked = Date.now();

      // Retry with proxy
      const proxyUrl = url.startsWith('/') ? `/api/proxy/api/v1${url}` : url;
      return fetch(proxyUrl, {
        ...options,
        mode: 'cors' // Still use CORS mode for proxy
      });
    }

    // Re-throw the error if it's not a CORS issue or proxy failed
    throw error;
  }
}

/**
 * Utility to log CORS debug information
 */
export function logCorsDebugInfo(): void {
  console.group('[CORS Helper] Debug Information');
  console.log('Environment:', ENVIRONMENT);
  console.log('Backend URL:', BACKEND_URL);
  console.log('Use Proxy:', USE_PROXY);
  console.log('Current API Base URL:', getApiBaseUrl());
  console.log('CORS Status:', corsStatus);
  console.log('Last Checked:', new Date(corsStatus.lastChecked).toISOString());
  console.groupEnd();
}

/**
 * Quick CORS fix instructions for users
 */
export function getCorsFixInstructions(): {
  problem: string;
  solutions: string[];
  testUrl: string;
} {
  return {
    problem: 'CORS (Cross-Origin Resource Sharing) is blocking requests between your frontend and backend.',
    solutions: [
      '1. Update Render environment variables: ALLOWED_ORIGINS=https://bookbarber-fz9nh51da-6fb.vercel.app',
      '2. Restart your Render backend service (Manual Deploy → Deploy latest commit)',
      '3. Wait 2-3 minutes for changes to take effect',
      '4. Refresh this page to test again',
      '5. If still broken, the proxy mode will automatically activate'
    ],
    testUrl: `${BACKEND_URL.replace('/api/v1', '')}/health`
  };
}

/**
 * Export configuration for easy access
 */
export const corsConfig = {
  backendUrl: BACKEND_URL,
  useProxy: USE_PROXY,
  environment: ENVIRONMENT,
  proxyPath: '/api/proxy/api/v1'
};

// Auto-initialize CORS checking on module load
if (typeof window !== 'undefined') {
  // Delay initialization more to avoid rate limiting
  setTimeout(initializeCors, 5000);  // Increased from 1s to 5s
}

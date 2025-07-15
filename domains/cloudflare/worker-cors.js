/**
 * BookedBarber V2 CloudFlare Worker for CORS and Security
 * Handles CORS, security headers, and request routing
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://bookedbarber.com',
    'https://www.bookedbarber.com',
    'https://app.bookedbarber.com',
    'https://admin.bookedbarber.com',
    'http://localhost:3000',  // Development
    'http://localhost:3001'   // Staging
];

// Security headers to add to all responses
const SECURITY_HEADERS = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
    'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://www.googletagmanager.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https:;
        connect-src 'self' https://api.bookedbarber.com https://api.stripe.com;
        frame-src https://js.stripe.com;
        object-src 'none';
        base-uri 'self';
        form-action 'self' https://js.stripe.com;
    `.replace(/\s+/g, ' ').trim()
};

// Rate limiting configuration
const RATE_LIMITS = {
    api: { requests: 100, window: 60 }, // 100 requests per minute for API
    auth: { requests: 10, window: 60 }, // 10 requests per minute for auth
    general: { requests: 200, window: 60 } // 200 requests per minute for general
};

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return handlePreflight(request, origin);
    }
    
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }
    
    // Geo-blocking for admin routes (optional)
    if (url.hostname === 'admin.bookedbarber.com') {
        const geoResponse = await checkGeolocation(request);
        if (geoResponse) {
            return geoResponse;
        }
    }
    
    // Bot protection
    const botResponse = await checkBotProtection(request);
    if (botResponse) {
        return botResponse;
    }
    
    // Forward request to origin
    let response = await fetch(request);
    
    // Clone response to modify headers
    response = new Response(response.body, response);
    
    // Add security headers
    addSecurityHeaders(response);
    
    // Add CORS headers if origin is allowed
    if (isOriginAllowed(origin)) {
        addCORSHeaders(response, origin);
    }
    
    // Add performance headers
    addPerformanceHeaders(response);
    
    return response;
}

function handlePreflight(request, origin) {
    if (!isOriginAllowed(origin)) {
        return new Response('CORS not allowed', { status: 403 });
    }
    
    const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
        'Vary': 'Origin'
    };
    
    // Add security headers to preflight responses too
    Object.assign(headers, SECURITY_HEADERS);
    
    return new Response(null, {
        status: 204,
        headers: headers
    });
}

function isOriginAllowed(origin) {
    return ALLOWED_ORIGINS.includes(origin);
}

function addSecurityHeaders(response) {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
}

function addCORSHeaders(response, origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
}

function addPerformanceHeaders(response) {
    response.headers.set('X-Edge-Location', 'CloudFlare');
    response.headers.set('X-Cache', 'HIT');
    response.headers.set('X-Content-Type-Options', 'nosniff');
}

async function checkRateLimit(request) {
    const url = new URL(request.url);
    const clientIP = request.headers.get('CF-Connecting-IP');
    
    let rateLimitKey;
    let config;
    
    // Determine rate limit type based on path
    if (url.pathname.startsWith('/api/v1/auth') || url.pathname.includes('/login') || url.pathname.includes('/register')) {
        rateLimitKey = `auth:${clientIP}`;
        config = RATE_LIMITS.auth;
    } else if (url.pathname.startsWith('/api/')) {
        rateLimitKey = `api:${clientIP}`;
        config = RATE_LIMITS.api;
    } else {
        rateLimitKey = `general:${clientIP}`;
        config = RATE_LIMITS.general;
    }
    
    // Simple in-memory rate limiting (in production, use CloudFlare's rate limiting or external storage)
    const currentTime = Math.floor(Date.now() / 1000);
    const windowStart = currentTime - config.window;
    
    // In a real implementation, you would use CloudFlare KV or Durable Objects for persistence
    // This is a simplified example
    
    return null; // No rate limit exceeded
}

async function checkGeolocation(request) {
    const country = request.cf?.country;
    
    // Example: Only allow US, CA, UK, AU for admin access
    const allowedCountries = ['US', 'CA', 'GB', 'AU'];
    
    if (country && !allowedCountries.includes(country)) {
        return new Response('Access denied from this geographic location', {
            status: 403,
            headers: {
                'Content-Type': 'text/plain',
                ...SECURITY_HEADERS
            }
        });
    }
    
    return null; // Access allowed
}

async function checkBotProtection(request) {
    const userAgent = request.headers.get('User-Agent') || '';
    const cfThreatScore = parseInt(request.headers.get('CF-Threat-Score') || '0');
    
    // Block high threat scores (CloudFlare provides this)
    if (cfThreatScore > 50) {
        return new Response('Request blocked due to threat score', {
            status: 403,
            headers: {
                'Content-Type': 'text/plain',
                ...SECURITY_HEADERS
            }
        });
    }
    
    // Block known bad bots (basic check)
    const badBots = [
        'masscan',
        'zmap',
        'nmap',
        'sqlmap',
        'nikto',
        'acunetix',
        'netsparker'
    ];
    
    const isBot = badBots.some(bot => userAgent.toLowerCase().includes(bot));
    if (isBot) {
        return new Response('Bot access denied', {
            status: 403,
            headers: {
                'Content-Type': 'text/plain',
                ...SECURITY_HEADERS
            }
        });
    }
    
    return null; // Request allowed
}

// Handle specific API endpoints with custom logic
async function handleAPIRequest(request) {
    const url = new URL(request.url);
    
    // Example: Handle webhook verification
    if (url.pathname.includes('/webhooks/stripe')) {
        return handleStripeWebhook(request);
    }
    
    // Example: Handle health checks
    if (url.pathname === '/health') {
        return new Response(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            worker: 'cloudflare-cors'
        }), {
            headers: {
                'Content-Type': 'application/json',
                ...SECURITY_HEADERS
            }
        });
    }
    
    return null; // Continue with normal processing
}

async function handleStripeWebhook(request) {
    // Verify Stripe webhook signature
    const signature = request.headers.get('stripe-signature');
    const endpointSecret = 'whsec_...'; // Your Stripe webhook secret
    
    if (!signature) {
        return new Response('Missing signature', { status: 400 });
    }
    
    // In a real implementation, verify the signature here
    // For now, just pass through
    return null;
}

// Security monitoring and logging
function logSecurityEvent(type, details, request) {
    const logData = {
        timestamp: new Date().toISOString(),
        type: type,
        details: details,
        ip: request.headers.get('CF-Connecting-IP'),
        userAgent: request.headers.get('User-Agent'),
        url: request.url,
        country: request.cf?.country,
        threatScore: request.headers.get('CF-Threat-Score')
    };
    
    // In production, send to logging service
    console.log('Security Event:', JSON.stringify(logData));
}

// Performance monitoring
function addPerformanceMetrics(response, startTime) {
    const processingTime = Date.now() - startTime;
    response.headers.set('X-Processing-Time', `${processingTime}ms`);
    response.headers.set('X-Worker-Version', '1.0.0');
}

// Custom error handling
function createErrorResponse(status, message, details = null) {
    const errorResponse = {
        error: {
            status: status,
            message: message,
            timestamp: new Date().toISOString(),
            details: details
        }
    };
    
    return new Response(JSON.stringify(errorResponse), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
            ...SECURITY_HEADERS
        }
    });
}
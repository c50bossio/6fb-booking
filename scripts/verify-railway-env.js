// Railway Environment Variables Verification Script
// Run this in your browser console or add to your frontend to verify env vars

console.log('🔍 Railway Environment Variables Verification');
console.log('===============================================');

// Required environment variables
const requiredEnvVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'NEXT_PUBLIC_WS_URL',
    'NEXT_PUBLIC_APP_URL'
];

// Optional but recommended environment variables
const recommendedEnvVars = [
    'NEXT_PUBLIC_ENABLE_ANALYTICS',
    'NEXT_PUBLIC_ENABLE_WEBSOCKET',
    'NEXT_PUBLIC_ENABLE_PAYMENTS',
    'NEXT_PUBLIC_ENVIRONMENT',
    'NEXT_PUBLIC_DEMO_MODE',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_IMAGE_DOMAINS',
    'NEXT_PUBLIC_CACHE_TTL'
];

// Check if running in browser environment
const isBrowser = typeof window !== 'undefined';

function checkEnvironmentVariables() {
    console.log('\n✅ Checking Required Environment Variables:');
    console.log('─'.repeat(50));
    
    let missingRequired = [];
    
    requiredEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        if (value) {
            console.log(`✅ ${envVar}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
        } else {
            console.log(`❌ ${envVar}: NOT SET`);
            missingRequired.push(envVar);
        }
    });
    
    console.log('\n📋 Checking Recommended Environment Variables:');
    console.log('─'.repeat(50));
    
    let missingRecommended = [];
    
    recommendedEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        if (value) {
            console.log(`✅ ${envVar}: ${value}`);
        } else {
            console.log(`⚠️  ${envVar}: NOT SET`);
            missingRecommended.push(envVar);
        }
    });
    
    // Summary
    console.log('\n📊 Summary:');
    console.log('─'.repeat(50));
    
    if (missingRequired.length === 0) {
        console.log('✅ All required environment variables are set!');
    } else {
        console.log('❌ Missing required environment variables:');
        missingRequired.forEach(envVar => {
            console.log(`   - ${envVar}`);
        });
    }
    
    if (missingRecommended.length === 0) {
        console.log('✅ All recommended environment variables are set!');
    } else {
        console.log('⚠️  Missing recommended environment variables:');
        missingRecommended.forEach(envVar => {
            console.log(`   - ${envVar}`);
        });
    }
    
    // Validation checks
    console.log('\n🔍 Validation Checks:');
    console.log('─'.repeat(50));
    
    // Check API URL format
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
        if (apiUrl.startsWith('https://') && apiUrl.includes('railway.app')) {
            console.log('✅ API URL format looks correct');
        } else {
            console.log('⚠️  API URL should be https://your-app.railway.app/api/v1');
        }
    }
    
    // Check Stripe key format  
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (stripeKey) {
        if (stripeKey.startsWith('pk_')) {
            const keyType = stripeKey.includes('test') ? 'test' : 'live';
            console.log(`✅ Stripe publishable key format correct (${keyType} key)`);
        } else {
            console.log('❌ Stripe publishable key should start with "pk_"');
        }
    }
    
    // Check WebSocket URL format
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (wsUrl) {
        if (wsUrl.startsWith('wss://') && wsUrl.includes('railway.app')) {
            console.log('✅ WebSocket URL format looks correct');
        } else {
            console.log('⚠️  WebSocket URL should be wss://your-app.railway.app/ws');
        }
    }
    
    // Check environment setting
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
    if (environment) {
        if (environment === 'production') {
            console.log('✅ Environment is set to production');
        } else {
            console.log(`⚠️  Environment is set to "${environment}" - should be "production" for Railway`);
        }
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('─'.repeat(50));
    
    if (missingRequired.length > 0) {
        console.log('1. Set missing required environment variables in Railway dashboard');
        console.log('2. Redeploy your frontend service');
        console.log('3. Run this verification script again');
    } else {
        console.log('1. Test your application functionality');
        console.log('2. Verify API connectivity');
        console.log('3. Test authentication and payment flows');
    }
    
    return {
        requiredComplete: missingRequired.length === 0,
        recommendedComplete: missingRecommended.length === 0,
        missingRequired,
        missingRecommended
    };
}

// Export for Node.js environment or run immediately in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkEnvironmentVariables };
} else {
    // Run immediately if in browser
    checkEnvironmentVariables();
}

// Additional helper function for Railway CLI users
function generateRailwayCommands() {
    console.log('\n🚀 Railway CLI Commands:');
    console.log('─'.repeat(50));
    console.log('Copy and paste these commands to set variables via Railway CLI:\n');
    
    const commands = [
        'railway variables set NEXT_PUBLIC_API_URL="https://your-backend-railway-app.railway.app/api/v1"',
        'railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE"',
        'railway variables set NEXT_PUBLIC_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"',
        'railway variables set GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE"',
        'railway variables set NEXTAUTH_URL="https://your-frontend-railway-app.railway.app"',
        'railway variables set NEXTAUTH_SECRET="your-secure-nextauth-secret-key"',
        'railway variables set NEXT_PUBLIC_WS_URL="wss://your-backend-railway-app.railway.app/ws"',
        'railway variables set NEXT_PUBLIC_ENABLE_ANALYTICS="true"',
        'railway variables set NEXT_PUBLIC_ENABLE_WEBSOCKET="true"',
        'railway variables set NEXT_PUBLIC_ENABLE_PAYMENTS="true"',
        'railway variables set NEXT_PUBLIC_ENVIRONMENT="production"',
        'railway variables set NEXT_PUBLIC_DEMO_MODE="false"',
        'railway variables set NEXT_PUBLIC_APP_NAME="6FB Booking Platform"',
        'railway variables set NEXT_PUBLIC_APP_URL="https://your-frontend-railway-app.railway.app"',
        'railway variables set NEXT_PUBLIC_IMAGE_DOMAINS="your-backend-railway-app.railway.app,stripe.com"',
        'railway variables set NEXT_PUBLIC_CACHE_TTL="300000"'
    ];
    
    commands.forEach(cmd => {
        console.log(cmd);
    });
    
    console.log('\n⚠️  Remember to replace the placeholder URLs with your actual Railway URLs!');
}

// Run the Railway commands generator if requested
if (isBrowser && window.location.search.includes('railway-commands')) {
    generateRailwayCommands();
}
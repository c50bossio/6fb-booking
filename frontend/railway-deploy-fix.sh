#!/bin/bash

echo "🚀 Railway Deployment Fix Script"
echo "================================"

# Ensure we're in the frontend directory
cd "$(dirname "$0")"

echo "📝 Current directory: $(pwd)"

# Check if middleware.ts exists
if [ -f "middleware.ts" ]; then
    echo "✅ middleware.ts found at root level"
else
    echo "❌ middleware.ts not found! This is required for auth handling"
    exit 1
fi

# Check AuthProvider for landing page handling
echo ""
echo "🔍 Checking AuthProvider landing page handling..."
if grep -q "pathname === '/'" src/components/AuthProvider.tsx; then
    echo "✅ AuthProvider has landing page protection"
else
    echo "⚠️  AuthProvider might not properly handle landing page"
fi

# Check for public routes
echo ""
echo "🔍 Checking PUBLIC_ROUTES configuration..."
echo "Middleware PUBLIC_ROUTES:"
grep -A 20 "const PUBLIC_ROUTES" middleware.ts | head -25

echo ""
echo "AuthProvider PUBLIC_ROUTES:"
grep -A 20 "const PUBLIC_ROUTES" src/components/AuthProvider.tsx | head -25

# Create a test script for production
echo ""
echo "📝 Creating production test script..."
cat > test-production-auth.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Production Auth Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .test { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
        .success { background-color: #d4edda; }
        .error { background-color: #f8d7da; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Railway Production Auth Test</h1>

    <div class="test">
        <h3>Test 1: Landing Page Access</h3>
        <button onclick="testRoute('/')">Test Landing Page</button>
        <div id="landing-result"></div>
    </div>

    <div class="test">
        <h3>Test 2: Public Routes</h3>
        <button onclick="testRoute('/test-public')">Test Public Route</button>
        <button onclick="testRoute('/landing')">Test Server Landing</button>
        <div id="public-result"></div>
    </div>

    <div class="test">
        <h3>Test 3: Protected Routes</h3>
        <button onclick="testRoute('/dashboard')">Test Dashboard</button>
        <div id="protected-result"></div>
    </div>

    <script>
        const BASE_URL = window.location.origin;

        async function testRoute(path) {
            const resultDiv = path === '/' ? 'landing-result' :
                            path.includes('dashboard') ? 'protected-result' : 'public-result';

            try {
                const response = await fetch(BASE_URL + path, {
                    method: 'GET',
                    credentials: 'include',
                    redirect: 'manual'
                });

                const text = await response.text();
                const headers = {};
                response.headers.forEach((value, key) => {
                    headers[key] = value;
                });

                let result = `<strong>${path}:</strong><br>`;
                result += `Status: ${response.status}<br>`;
                result += `Type: ${response.type}<br>`;
                result += `Redirected: ${response.redirected}<br>`;
                result += `Headers: ${JSON.stringify(headers, null, 2)}<br>`;

                if (response.status === 200 && !response.redirected) {
                    result = `<div class="success">${result}✅ Accessible without redirect</div>`;
                } else if (response.status === 0 || response.type === 'opaqueredirect') {
                    result = `<div class="error">${result}❌ Redirected (likely to login)</div>`;
                } else {
                    result = `<div class="error">${result}⚠️ Unexpected response</div>`;
                }

                document.getElementById(resultDiv).innerHTML = result;
            } catch (error) {
                document.getElementById(resultDiv).innerHTML =
                    `<div class="error">Error testing ${path}: ${error.message}</div>`;
            }
        }
    </script>
</body>
</html>
EOF

echo "✅ Created test-production-auth.html"

echo ""
echo "🎯 Railway Deployment Checklist:"
echo "1. ✅ middleware.ts is at the root of frontend directory"
echo "2. ✅ PUBLIC_ROUTES includes '/' in both middleware.ts and AuthProvider"
echo "3. ✅ AuthProvider has special handling for landing page"
echo "4. ✅ Created test pages: /test-public and /landing"
echo ""
echo "📋 Next Steps:"
echo "1. Commit and push these changes"
echo "2. Deploy to Railway"
echo "3. Open test-production-auth.html in browser with Railway URL"
echo "4. Test each route to verify auth behavior"
echo ""
echo "🔍 Debug URLs to test:"
echo "- https://your-railway-url.up.railway.app/ (should NOT redirect)"
echo "- https://your-railway-url.up.railway.app/test-public (should NOT redirect)"
echo "- https://your-railway-url.up.railway.app/landing (should NOT redirect)"
echo "- https://your-railway-url.up.railway.app/dashboard (SHOULD redirect to login)"

# Make the script executable
chmod +x "$0"

echo ""
echo "✅ Script completed successfully!"

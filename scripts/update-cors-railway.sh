#!/bin/bash

# Script to update CORS configuration for Railway deployment
# This adds the Railway frontend URL to the allowed origins

echo "=== Updating CORS Configuration for Railway ==="

# The Railway frontend URL
RAILWAY_URL="https://web-production-92a6c.up.railway.app"

# Backend directory
BACKEND_DIR="backend"

# Check if we're in the right directory
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: backend directory not found. Please run from project root."
    exit 1
fi

echo "1. Current ALLOWED_ORIGINS in .env:"
grep "ALLOWED_ORIGINS" backend/.env || echo "ALLOWED_ORIGINS not found in .env"

# Update .env file
echo ""
echo "2. Updating backend/.env to include Railway URL..."

# Check if ALLOWED_ORIGINS exists in .env
if grep -q "^ALLOWED_ORIGINS=" backend/.env; then
    # Append Railway URL to existing ALLOWED_ORIGINS
    sed -i.bak "s|^ALLOWED_ORIGINS=.*|&,${RAILWAY_URL}|" backend/.env
    echo "   - Added Railway URL to existing ALLOWED_ORIGINS"
else
    # Add ALLOWED_ORIGINS with Railway URL
    echo "" >> backend/.env
    echo "# Railway Frontend URL" >> backend/.env
    echo "ALLOWED_ORIGINS=${RAILWAY_URL}" >> backend/.env
    echo "   - Created new ALLOWED_ORIGINS with Railway URL"
fi

# Show updated value
echo ""
echo "3. Updated ALLOWED_ORIGINS:"
grep "ALLOWED_ORIGINS" backend/.env

# Create environment variable update guide for Render
echo ""
echo "4. Creating Render environment variable update guide..."

cat > backend/RENDER_ENV_UPDATE.md << 'EOF'
# Render Environment Variable Update Guide

To fix CORS for Railway frontend, add this environment variable to your Render service:

## Environment Variable to Add:

```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://bookbarber-6fb.vercel.app,https://web-production-92a6c.up.railway.app
```

## Steps to Update on Render:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service (sixfb-backend)
3. Go to "Environment" tab
4. Add or update the `ALLOWED_ORIGINS` variable
5. Include all necessary URLs separated by commas:
   - Local development: `http://localhost:3000,http://localhost:3001`
   - Vercel deployments: `https://bookbarber-6fb.vercel.app`
   - Railway frontend: `https://web-production-92a6c.up.railway.app`
6. Click "Save Changes"
7. The service will automatically redeploy

## Additional CORS-friendly URLs to consider:

If you have other frontend deployments, add them to the comma-separated list:
- Staging: `https://staging.bookbarber.com`
- Production: `https://bookbarber.com`
- Other Vercel previews: `https://bookbarber-*.vercel.app`

## Testing CORS:

After deployment, test with:

```bash
curl -I -X OPTIONS https://sixfb-backend.onrender.com/api/v1/health \
  -H "Origin: https://web-production-92a6c.up.railway.app" \
  -H "Access-Control-Request-Method: GET"
```

You should see `Access-Control-Allow-Origin: https://web-production-92a6c.up.railway.app` in the response headers.
EOF

echo "   - Created RENDER_ENV_UPDATE.md with instructions"

# Update settings.py to ensure Railway URLs are included
echo ""
echo "5. Checking if settings.py needs updates..."

# Add Railway pattern to settings.py if not present
if ! grep -q "railway.app" backend/config/settings.py; then
    echo "   - Adding Railway pattern to settings.py..."
    
    # Create a temporary update file
    cat > backend/config/settings_railway_update.py << 'EOF'
# Add this to the is_allowed_origin method in settings.py

        # Check Railway deployment patterns
        if origin.startswith("https://") and origin.endswith(".railway.app"):
            # Allow any Railway deployment URL
            logger.info(f"Allowing Railway origin: {origin}")
            return True
            
        # Specific Railway URLs
        railway_urls = [
            "https://web-production-92a6c.up.railway.app",
            "https://6fb-booking-frontend.up.railway.app",
        ]
        if origin in railway_urls:
            logger.info(f"Allowing specific Railway origin: {origin}")
            return True
EOF
    
    echo "   - Created settings_railway_update.py with Railway patterns to add"
else
    echo "   - Railway patterns already present in settings.py"
fi

echo ""
echo "=== Summary ==="
echo "1. ✅ Updated local .env file with Railway URL"
echo "2. ✅ Created RENDER_ENV_UPDATE.md with deployment instructions"
echo "3. ✅ Prepared settings.py updates for Railway support"
echo ""
echo "=== Next Steps ==="
echo "1. Review the changes in backend/.env"
echo "2. Follow instructions in backend/RENDER_ENV_UPDATE.md to update Render"
echo "3. If needed, manually add Railway patterns to settings.py"
echo "4. Commit and deploy the updated configuration"
echo ""
echo "To test locally with Railway URL:"
echo "cd backend && uvicorn main:app --reload"
#!/usr/bin/env python3
"""
Test Server for OAuth and Cache Optimization Features
Minimal FastAPI app to demonstrate the new features
"""

import os
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import logging

# Import our new features
from api.v1 import oauth, cache_optimization
from database import get_db
from services.enhanced_redis_service import enhanced_redis_service
from services.oauth_service import validate_oauth_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BookedBarber V2 - OAuth & Cache Test Server",
    description="Test server for OAuth integration and cache optimization features",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include our new routers
app.include_router(oauth.router, prefix="/api/v1", tags=["OAuth"])
app.include_router(cache_optimization.router, prefix="/api/v1", tags=["Cache"])

@app.get("/", response_class=HTMLResponse)
async def root():
    """Main page with links to test features"""
    
    # Get current status
    oauth_status = validate_oauth_config()
    cache_metrics = enhanced_redis_service.get_cache_metrics()
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>BookedBarber V2 - OAuth & Cache Test</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #333; text-align: center; }}
            .feature {{ background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #007bff; }}
            .status {{ padding: 10px; margin: 10px 0; border-radius: 4px; }}
            .success {{ background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }}
            .warning {{ background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }}
            .error {{ background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }}
            .api-link {{ display: inline-block; background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; margin: 5px; }}
            .api-link:hover {{ background: #0056b3; }}
            .metric {{ display: inline-block; background: #e9ecef; padding: 8px 12px; margin: 5px; border-radius: 4px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 BookedBarber V2 - New Features Test</h1>
            
            <div class="feature">
                <h2>🔐 OAuth Integration Status</h2>
                <div class="status {'success' if any(oauth_status.values()) else 'warning'}">
                    <strong>Google OAuth:</strong> {'✅ Configured' if oauth_status['google'] else '⚠️ Not configured (add GOOGLE_CLIENT_ID to .env)'}
                </div>
                <div class="status {'success' if any(oauth_status.values()) else 'warning'}">
                    <strong>Facebook OAuth:</strong> {'✅ Configured' if oauth_status['facebook'] else '⚠️ Not configured (add FACEBOOK_APP_ID to .env)'}
                </div>
                
                <h3>🔗 OAuth API Endpoints:</h3>
                <a href="/api/v1/oauth/providers" class="api-link">View Providers</a>
                <a href="/api/v1/oauth/config/status" class="api-link">Config Status</a>
                <a href="/api/v1/oauth/config/template" class="api-link">Setup Template</a>
                <a href="/docs#/OAuth" class="api-link">API Documentation</a>
            </div>
            
            <div class="feature">
                <h2>⚡ Cache Optimization Status</h2>
                <div class="status {'success' if cache_metrics['hit_rate'] >= 80 else 'warning' if cache_metrics['hit_rate'] >= 70 else 'error'}">
                    <strong>Performance:</strong> {'🎉 Excellent' if cache_metrics['hit_rate'] >= 80 else '⚠️ Good' if cache_metrics['hit_rate'] >= 70 else '❌ Needs improvement'}
                </div>
                
                <div style="margin: 15px 0;">
                    <span class="metric"><strong>Hit Rate:</strong> {cache_metrics['hit_rate']:.1f}%</span>
                    <span class="metric"><strong>Operations:</strong> {cache_metrics['total_operations']}</span>
                    <span class="metric"><strong>Redis:</strong> {'✅ Connected' if cache_metrics['redis_info'].get('connected') else '❌ Disconnected'}</span>
                </div>
                
                <h3>📊 Cache API Endpoints:</h3>
                <a href="/api/v1/cache-optimization/metrics" class="api-link">View Metrics</a>
                <a href="/api/v1/cache-optimization/health" class="api-link">Health Status</a>
                <a href="/api/v1/cache-optimization/strategies" class="api-link">Cache Strategies</a>
                <a href="/docs#/Cache%20Optimization" class="api-link">API Documentation</a>
            </div>
            
            <div class="feature">
                <h2>📋 Quick Actions</h2>
                <p>Use these buttons to test the new features:</p>
                
                <h3>Cache Optimization:</h3>
                <button onclick="runCacheOptimization()" class="api-link">🚀 Run Cache Optimization</button>
                <button onclick="preloadHotData()" class="api-link">🔥 Preload Hot Data</button>
                <button onclick="clearCache()" class="api-link">🧹 Clear Cache</button>
                
                <h3>OAuth Testing:</h3>
                <button onclick="testOAuthProviders()" class="api-link">🔍 Test OAuth Providers</button>
                <button onclick="showSetupInstructions()" class="api-link">📖 Setup Instructions</button>
            </div>
            
            <div class="feature">
                <h2>🔗 Important Links</h2>
                <a href="/docs" class="api-link">📚 Full API Documentation</a>
                <a href="/docs/OAUTH_CACHE_SETUP_GUIDE.md" class="api-link">📋 Setup Guide</a>
                <a href="http://localhost:3000" class="api-link">🎨 Frontend (if running)</a>
            </div>
        </div>
        
        <script>
            async function runCacheOptimization() {{
                try {{
                    const response = await fetch('/api/v1/cache-optimization/optimize', {{ method: 'POST' }});
                    const result = await response.json();
                    alert('Cache optimization started! Check the metrics endpoint for results.');
                }} catch (e) {{
                    alert('Error: ' + e.message);
                }}
            }}
            
            async function preloadHotData() {{
                try {{
                    const response = await fetch('/api/v1/cache-optimization/preload-hot-data', {{ method: 'POST' }});
                    const result = await response.json();
                    alert('Hot data preload started! This will improve cache hit rates.');
                }} catch (e) {{
                    alert('Error: ' + e.message);
                }}
            }}
            
            async function clearCache() {{
                try {{
                    const response = await fetch('/api/v1/cache-optimization/clear/all', {{ method: 'DELETE' }});
                    const result = await response.json();
                    alert('Cache cleared! Hit rates will be reset.');
                }} catch (e) {{
                    alert('Error: ' + e.message);
                }}
            }}
            
            async function testOAuthProviders() {{
                try {{
                    const response = await fetch('/api/v1/oauth/providers');
                    const providers = await response.json();
                    alert('OAuth Providers: ' + JSON.stringify(providers, null, 2));
                }} catch (e) {{
                    alert('Error: ' + e.message);
                }}
            }}
            
            function showSetupInstructions() {{
                alert(`OAuth Setup Instructions:

1. Google OAuth:
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add to .env: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

2. Facebook OAuth:
   - Go to Facebook Developer Console
   - Create Facebook app with Login product
   - Add to .env: FACEBOOK_APP_ID and FACEBOOK_APP_SECRET

3. See docs/OAUTH_CACHE_SETUP_GUIDE.md for detailed instructions`);
            }}
        </script>
    </body>
    </html>
    """
    
    return html_content

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "features": {
            "oauth": "enabled",
            "cache_optimization": "enabled"
        },
        "endpoints": {
            "oauth_providers": "/api/v1/oauth/providers",
            "cache_metrics": "/api/v1/cache-optimization/metrics",
            "api_docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting BookedBarber V2 OAuth & Cache Test Server...")
    print("📊 Dashboard: http://localhost:8001")
    print("📚 API Docs: http://localhost:8001/docs")
    print("🔐 OAuth Endpoints: http://localhost:8001/api/v1/oauth/")
    print("⚡ Cache Endpoints: http://localhost:8001/api/v1/cache-optimization/")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)
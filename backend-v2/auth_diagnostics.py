#!/usr/bin/env python3
"""
Authentication Diagnostics Tool for BookedBarber V2
Identifies common auth issues and provides solutions
"""

import asyncio
import json
import sys
from datetime import datetime, timezone
from config import settings
from utils.session_manager import session_manager
from utils.auth_enhanced import decode_token_with_retry
import redis
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuthDiagnostics:
    def __init__(self):
        self.issues = []
        self.solutions = []
        
    def add_issue(self, category: str, issue: str, solution: str):
        self.issues.append(f"[{category}] {issue}")
        self.solutions.append(f"[{category}] {solution}")
    
    async def check_redis_connection(self):
        """Check Redis connection and session storage"""
        try:
            r = redis.from_url(settings.redis_url, decode_responses=True)
            r.ping()
            
            # Check active sessions
            keys = r.keys('session:*')
            print(f"✅ Redis connected: {len(keys)} active sessions")
            
            # Check for expired sessions
            expired_count = 0
            for key in keys:
                ttl = r.ttl(key)
                if ttl <= 0:
                    expired_count += 1
            
            if expired_count > 0:
                self.add_issue(
                    "SESSION", 
                    f"{expired_count} expired sessions found in Redis",
                    "Run: redis-cli DEL $(redis-cli KEYS 'session:*' | grep -E 'session:.*')"
                )
            
        except Exception as e:
            self.add_issue(
                "REDIS", 
                f"Redis connection failed: {e}",
                "Start Redis with: brew services start redis (macOS) or sudo systemctl start redis (Linux)"
            )
    
    def check_environment_config(self):
        """Check environment configuration"""
        print(f"🔧 Environment: {settings.environment}")
        print(f"🔧 Debug mode: {settings.debug}")
        print(f"🔧 Auth debugging: {getattr(settings, 'enable_auth_debugging', False)}")
        
        # Check CORS configuration
        cors_origins = getattr(settings, 'cors_origins', '[]')
        if isinstance(cors_origins, str):
            import ast
            try:
                cors_list = ast.literal_eval(cors_origins)
            except:
                cors_list = [cors_origins]
        else:
            cors_list = cors_origins
            
        print(f"🔧 CORS origins: {cors_list}")
        
        # Check for localhost vs codespace mismatch
        frontend_url = settings.frontend_url
        if "codespace" in frontend_url or "github.dev" in frontend_url:
            if "localhost:8000" in cors_list:
                self.add_issue(
                    "CORS",
                    "Frontend using Codespace URL but CORS allows localhost",
                    "Update CORS_ORIGINS in .env to include your Codespace URLs"
                )
    
    def check_token_configuration(self):
        """Check JWT token configuration"""
        print(f"🔐 Access token expire: {settings.access_token_expire_minutes} minutes")
        print(f"🔐 Refresh token expire: {settings.refresh_token_expire_days} days")
        print(f"🔐 Secret key length: {len(settings.secret_key)} chars")
        print(f"🔐 JWT secret key length: {len(settings.jwt_secret_key)} chars")
        
        if settings.access_token_expire_minutes < 15:
            self.add_issue(
                "TOKEN",
                "Access token expiry too short for development",
                "Set ACCESS_TOKEN_EXPIRE_MINUTES=120 in .env for 2-hour tokens"
            )
        
        if len(settings.secret_key) < 32:
            self.add_issue(
                "SECURITY",
                "Secret key too short",
                "Generate new key: python -c 'import secrets; print(secrets.token_urlsafe(64))'"
            )
    
    def check_cookie_settings(self):
        """Check cookie configuration"""
        print("🍪 Cookie settings:")
        print(f"   - Secure: {settings.environment == 'production'}")
        print(f"   - HttpOnly: True")
        print(f"   - SameSite: lax/strict")
        print(f"   - Domain: {getattr(settings, 'cookie_domain', 'auto')}")
        
        if settings.environment == "development":
            print("   ✅ Development mode: secure=false (correct for localhost)")
        
    async def test_auth_flow(self):
        """Test a complete auth flow"""
        print("\n🧪 Testing Auth Flow:")
        
        try:
            # Test session creation
            test_session_id = "test_diagnostic_session"
            success = await session_manager.create_session(
                session_id=test_session_id,
                user_id=999,
                email="test@example.com",
                role="client"
            )
            
            if success:
                print("✅ Session creation: SUCCESS")
                
                # Test session retrieval
                session_data = await session_manager.get_session(test_session_id)
                if session_data:
                    print("✅ Session retrieval: SUCCESS")
                    print(f"   Session user: {session_data.email}")
                    print(f"   Session age: {datetime.now(timezone.utc) - session_data.created_at}")
                else:
                    print("❌ Session retrieval: FAILED")
                
                # Cleanup test session
                await session_manager.delete_session(test_session_id)
                print("🧹 Test session cleaned up")
            else:
                print("❌ Session creation: FAILED")
                
        except Exception as e:
            self.add_issue(
                "AUTH_FLOW",
                f"Auth flow test failed: {e}",
                "Check session manager and Redis connectivity"
            )
    
    def check_frontend_backend_compatibility(self):
        """Check frontend/backend URL compatibility"""
        backend_url = getattr(settings, 'backend_url', 'http://localhost:8000')
        frontend_url = settings.frontend_url
        
        print(f"🌐 Backend URL: {backend_url}")
        print(f"🌐 Frontend URL: {frontend_url}")
        
        # Check for common mismatches
        if "codespace" in frontend_url or "github.dev" in frontend_url:
            if "localhost" in backend_url:
                self.add_issue(
                    "URL_MISMATCH",
                    "Frontend on Codespace but backend on localhost",
                    "Either use port forwarding or update frontend .env.local to use localhost:8000"
                )
    
    def print_summary(self):
        """Print diagnostic summary"""
        print(f"\n📊 DIAGNOSTIC SUMMARY")
        print("=" * 50)
        
        if not self.issues:
            print("🎉 NO ISSUES FOUND!")
            print("Your authentication system looks healthy.")
        else:
            print(f"⚠️  FOUND {len(self.issues)} ISSUES:")
            for i, issue in enumerate(self.issues, 1):
                print(f"\n{i}. {issue}")
                print(f"   💡 Solution: {self.solutions[i-1]}")
        
        print(f"\n🔧 QUICK FIXES:")
        print("1. Restart both frontend and backend servers")
        print("2. Clear browser cookies and localStorage")
        print("3. Check browser Network tab for CORS errors")
        print("4. Verify Redis is running: redis-cli ping")
        
    async def run_full_diagnostics(self):
        """Run all diagnostic checks"""
        print("🔍 BookedBarber Authentication Diagnostics")
        print("=" * 50)
        
        await self.check_redis_connection()
        self.check_environment_config()
        self.check_token_configuration()
        self.check_cookie_settings()
        self.check_frontend_backend_compatibility()
        await self.test_auth_flow()
        
        self.print_summary()

async def main():
    diagnostics = AuthDiagnostics()
    await diagnostics.run_full_diagnostics()

if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""
Health check script for BookedBarber V2 Backend
Validates API endpoints and database connectivity
"""
import sys
import requests
import time
import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

def check_api_health():
    """Check if API is responding"""
    try:
        response = requests.get(
            "http://localhost:8000/health",
            timeout=5
        )
        return response.status_code == 200
    except Exception as e:
        print(f"API health check failed: {e}")
        return False

def check_database_health():
    """Check database connectivity"""
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("DATABASE_URL not set")
            return False
            
        engine = create_engine(database_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).fetchone()
            return result[0] == 1
    except SQLAlchemyError as e:
        print(f"Database health check failed: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error in database check: {e}")
        return False

def check_redis_health():
    """Check Redis connectivity (optional)"""
    try:
        import redis
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            return True  # Redis is optional
            
        r = redis.from_url(redis_url)
        r.ping()
        return True
    except Exception as e:
        print(f"Redis health check failed (non-critical): {e}")
        return True  # Redis failure shouldn't fail health check

def main():
    """Main health check function"""
    print("Starting health check...")
    
    # Check API
    if not check_api_health():
        print("API health check failed")
        sys.exit(1)
    
    # Check database
    if not check_database_health():
        print("Database health check failed")
        sys.exit(1)
    
    # Check Redis (non-blocking)
    check_redis_health()
    
    print("All health checks passed")
    sys.exit(0)

if __name__ == "__main__":
    main()
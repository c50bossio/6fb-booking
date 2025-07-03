#!/usr/bin/env python3
"""
Health check script for BookedBarber V2 Celery Worker
Validates worker process health and Redis connectivity
"""
import sys
import os
import subprocess
import redis
from celery import Celery

def check_celery_workers():
    """Check if Celery workers are running and responding"""
    try:
        # Create Celery app instance
        celery_app = Celery('workers')
        celery_app.config_from_object('workers.celery_config')
        
        # Get active workers
        inspect = celery_app.control.inspect()
        active_workers = inspect.active()
        
        if not active_workers:
            print("No active Celery workers found")
            return False
            
        print(f"Found {len(active_workers)} active workers")
        return True
        
    except Exception as e:
        print(f"Celery worker check failed: {e}")
        return False

def check_redis_connectivity():
    """Check Redis broker connectivity"""
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = redis.from_url(redis_url)
        r.ping()
        print("Redis connectivity check passed")
        return True
    except Exception as e:
        print(f"Redis connectivity check failed: {e}")
        return False

def check_worker_process():
    """Check if worker process is running"""
    try:
        # Check if celery worker process is running
        result = subprocess.run(
            ["pgrep", "-f", "celery.*worker"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("Celery worker process is running")
            return True
        else:
            print("Celery worker process not found")
            return False
            
    except Exception as e:
        print(f"Worker process check failed: {e}")
        return False

def check_task_queue():
    """Check if task queue is accessible"""
    try:
        from workers.celery_app import celery_app
        
        # Try to get queue length (non-blocking)
        queue_length = celery_app.control.inspect().active_queues()
        if queue_length is not None:
            print("Task queue is accessible")
            return True
        else:
            print("Task queue check failed")
            return False
            
    except Exception as e:
        print(f"Task queue check failed: {e}")
        return False

def main():
    """Main health check function"""
    print("Starting Celery worker health check...")
    
    checks = [
        ("Redis connectivity", check_redis_connectivity),
        ("Worker process", check_worker_process),
        ("Task queue", check_task_queue),
    ]
    
    failed_checks = []
    
    for check_name, check_func in checks:
        try:
            if not check_func():
                failed_checks.append(check_name)
        except Exception as e:
            print(f"Error in {check_name}: {e}")
            failed_checks.append(check_name)
    
    if failed_checks:
        print(f"Failed checks: {', '.join(failed_checks)}")
        sys.exit(1)
    
    print("All Celery worker health checks passed")
    sys.exit(0)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
BookedBarber V2 - Background Job Monitoring Script
Monitor Celery workers, queues, and task execution in real-time
"""

import sys
import time
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Add current directory to path
sys.path.append('.')

try:
    from services.celery_app import celery_app
    from db import SessionLocal
    from models import NotificationQueue, NotificationStatus
    from config import settings
    import redis
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend-v2 directory")
    sys.exit(1)

class BackgroundJobMonitor:
    def __init__(self):
        self.redis_client = None
        self.db = None
        
    def connect_redis(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.from_url(settings.redis_url)
            self.redis_client.ping()
            return True
        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
            return False
    
    def get_worker_status(self) -> Dict[str, Any]:
        """Get status of Celery workers"""
        try:
            inspect = celery_app.control.inspect()
            
            # Get active workers
            active_workers = inspect.active()
            registered_tasks = inspect.registered()
            worker_stats = inspect.stats()
            
            return {
                'active_workers': active_workers or {},
                'registered_tasks': registered_tasks or {},
                'worker_stats': worker_stats or {},
                'total_workers': len(active_workers) if active_workers else 0
            }
        except Exception as e:
            return {'error': str(e), 'total_workers': 0}
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Get status of task queues"""
        try:
            if not self.redis_client:
                return {'error': 'Redis not connected'}
            
            queues = ['notifications', 'data_processing', 'maintenance', 'marketing', 'high_priority', 'default']
            queue_status = {}
            
            for queue in queues:
                key = f"celery_queue_{queue}"
                length = self.redis_client.llen(key)
                queue_status[queue] = {
                    'pending_tasks': length,
                    'status': 'active' if length > 0 else 'idle'
                }
            
            return queue_status
        except Exception as e:
            return {'error': str(e)}
    
    def get_recent_tasks(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent task execution results"""
        try:
            if not self.redis_client:
                return []
            
            # Get recent task results from Redis
            task_keys = self.redis_client.keys("celery-task-meta-*")
            recent_tasks = []
            
            for key in sorted(task_keys, reverse=True)[:limit]:
                try:
                    task_data = self.redis_client.get(key)
                    if task_data:
                        task_info = json.loads(task_data)
                        task_id = key.decode().replace("celery-task-meta-", "")
                        recent_tasks.append({
                            'task_id': task_id,
                            'status': task_info.get('status', 'UNKNOWN'),
                            'result': task_info.get('result', {}),
                            'date_done': task_info.get('date_done'),
                            'traceback': task_info.get('traceback')
                        })
                except Exception:
                    continue
            
            return recent_tasks
        except Exception as e:
            return [{'error': str(e)}]
    
    def get_notification_queue_status(self) -> Dict[str, Any]:
        """Get status of the notification queue from database"""
        try:
            db = SessionLocal()
            
            # Count notifications by status
            from sqlalchemy import func
            status_counts = db.query(
                NotificationQueue.status,
                func.count(NotificationQueue.id)
            ).group_by(NotificationQueue.status).all()
            
            # Count recent notifications (last 24 hours)
            since_yesterday = datetime.utcnow() - timedelta(days=1)
            recent_count = db.query(NotificationQueue).filter(
                NotificationQueue.created_at >= since_yesterday
            ).count()
            
            # Get oldest pending notification
            oldest_pending = db.query(NotificationQueue).filter(
                NotificationQueue.status == NotificationStatus.PENDING
            ).order_by(NotificationQueue.created_at.asc()).first()
            
            db.close()
            
            status_summary = {status.value if hasattr(status, 'value') else str(status): count 
                            for status, count in status_counts}
            
            return {
                'status_counts': status_summary,
                'recent_24h': recent_count,
                'oldest_pending': {
                    'id': oldest_pending.id if oldest_pending else None,
                    'created_at': oldest_pending.created_at.isoformat() if oldest_pending else None,
                    'template_name': oldest_pending.template_name if oldest_pending else None
                } if oldest_pending else None
            }
        except Exception as e:
            return {'error': str(e)}
    
    def test_task_execution(self) -> Dict[str, Any]:
        """Test task execution with a simple health check"""
        try:
            from services.celery_app import health_check_task
            
            # Send a test task
            result = health_check_task.delay()
            
            # Wait for result (with timeout)
            try:
                task_result = result.get(timeout=10)
                return {
                    'test_passed': True,
                    'task_id': result.id,
                    'result': task_result
                }
            except Exception as e:
                return {
                    'test_passed': False,
                    'task_id': result.id,
                    'error': str(e)
                }
        except Exception as e:
            return {
                'test_passed': False,
                'error': str(e)
            }
    
    def print_status_report(self):
        """Print a comprehensive status report"""
        print("🔍 BookedBarber V2 Background Job Monitor")
        print("=" * 60)
        print(f"📅 Report Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print()
        
        # Redis Connection
        print("🔗 Redis Connection")
        if self.connect_redis():
            print("✅ Redis: Connected")
        else:
            print("❌ Redis: Disconnected")
            return
        
        print()
        
        # Worker Status
        print("👷 Worker Status")
        worker_status = self.get_worker_status()
        if 'error' in worker_status:
            print(f"❌ Error: {worker_status['error']}")
        else:
            print(f"✅ Active Workers: {worker_status['total_workers']}")
            for worker_name, tasks in worker_status['active_workers'].items():
                print(f"   {worker_name}: {len(tasks)} active tasks")
        
        print()
        
        # Queue Status
        print("📋 Queue Status")
        queue_status = self.get_queue_status()
        if 'error' in queue_status:
            print(f"❌ Error: {queue_status['error']}")
        else:
            for queue_name, info in queue_status.items():
                status_icon = "🟡" if info['pending_tasks'] > 0 else "🟢"
                print(f"   {status_icon} {queue_name}: {info['pending_tasks']} pending")
        
        print()
        
        # Notification Queue Status
        print("📧 Notification Queue Status")
        notif_status = self.get_notification_queue_status()
        if 'error' in notif_status:
            print(f"❌ Error: {notif_status['error']}")
        else:
            print(f"   📊 Status Counts:")
            for status, count in notif_status['status_counts'].items():
                print(f"      {status}: {count}")
            print(f"   📈 Recent (24h): {notif_status['recent_24h']}")
            if notif_status['oldest_pending']:
                oldest = notif_status['oldest_pending']
                print(f"   ⏰ Oldest Pending: {oldest['template_name']} (ID: {oldest['id']})")
        
        print()
        
        # Task Execution Test
        print("🧪 Task Execution Test")
        test_result = self.test_task_execution()
        if test_result['test_passed']:
            print(f"✅ Test Task Executed Successfully")
            print(f"   Task ID: {test_result['task_id']}")
            print(f"   Result: {test_result['result']}")
        else:
            print(f"❌ Test Task Failed: {test_result.get('error', 'Unknown error')}")
        
        print()
        
        # Recent Tasks
        print("📝 Recent Task Results")
        recent_tasks = self.get_recent_tasks(5)
        if recent_tasks and 'error' not in recent_tasks[0]:
            for task in recent_tasks:
                status_icon = "✅" if task['status'] == 'SUCCESS' else "❌"
                print(f"   {status_icon} {task['task_id'][:8]}... - {task['status']}")
                if task['date_done']:
                    print(f"      Completed: {task['date_done']}")
        else:
            print("   No recent tasks found")
        
        print()
        print("=" * 60)
    
    def watch_mode(self, interval: int = 30):
        """Run in watch mode with periodic updates"""
        try:
            while True:
                # Clear screen
                import os
                os.system('cls' if os.name == 'nt' else 'clear')
                
                self.print_status_report()
                print(f"🔄 Refreshing in {interval} seconds... (Ctrl+C to exit)")
                
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print("\n👋 Monitor stopped by user")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Monitor BookedBarber V2 background jobs')
    parser.add_argument('--watch', '-w', action='store_true', 
                       help='Run in watch mode with periodic updates')
    parser.add_argument('--interval', '-i', type=int, default=30,
                       help='Update interval in seconds for watch mode')
    
    args = parser.parse_args()
    
    monitor = BackgroundJobMonitor()
    
    if args.watch:
        monitor.watch_mode(args.interval)
    else:
        monitor.print_status_report()

if __name__ == '__main__':
    main()
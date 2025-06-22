"""
Advanced Task Manager for 6FB Booking System
Efficient data management, background tasks, and job scheduling
"""

import asyncio
import logging
import time
import json
import pickle
from typing import Dict, List, Any, Optional, Callable, Union
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import redis.asyncio as redis
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Task execution status"""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class TaskPriority(Enum):
    """Task priority levels"""

    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class Task:
    """Task definition"""

    id: str
    name: str
    func: str  # Function name to execute
    args: List[Any]
    kwargs: Dict[str, Any]
    priority: TaskPriority = TaskPriority.NORMAL
    max_retries: int = 3
    retry_delay: int = 60  # seconds
    timeout: int = 300  # seconds
    scheduled_time: Optional[datetime] = None
    created_at: datetime = None
    status: TaskStatus = TaskStatus.PENDING
    result: Any = None
    error: str = None
    retry_count: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.id is None:
            self.id = str(uuid.uuid4())

    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary for serialization"""
        return {
            "id": self.id,
            "name": self.name,
            "func": self.func,
            "args": self.args,
            "kwargs": self.kwargs,
            "priority": self.priority.value,
            "max_retries": self.max_retries,
            "retry_delay": self.retry_delay,
            "timeout": self.timeout,
            "scheduled_time": (
                self.scheduled_time.isoformat() if self.scheduled_time else None
            ),
            "created_at": self.created_at.isoformat(),
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "retry_count": self.retry_count,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Task":
        """Create task from dictionary"""
        task = cls(
            id=data["id"],
            name=data["name"],
            func=data["func"],
            args=data["args"],
            kwargs=data["kwargs"],
            priority=TaskPriority(data["priority"]),
            max_retries=data["max_retries"],
            retry_delay=data["retry_delay"],
            timeout=data["timeout"],
            scheduled_time=(
                datetime.fromisoformat(data["scheduled_time"])
                if data["scheduled_time"]
                else None
            ),
            created_at=datetime.fromisoformat(data["created_at"]),
            status=TaskStatus(data["status"]),
            result=data["result"],
            error=data["error"],
            retry_count=data["retry_count"],
            started_at=(
                datetime.fromisoformat(data["started_at"])
                if data["started_at"]
                else None
            ),
            completed_at=(
                datetime.fromisoformat(data["completed_at"])
                if data["completed_at"]
                else None
            ),
        )
        return task


class TaskQueue:
    """Priority-based task queue with Redis backend"""

    def __init__(self, redis_client=None, queue_name: str = "6fb_task_queue"):
        self.redis_client = redis_client
        self.queue_name = queue_name
        self.memory_queue = defaultdict(deque)  # Fallback for when Redis is unavailable

    async def enqueue(self, task: Task) -> bool:
        """Add task to queue"""
        try:
            if self.redis_client:
                # Use Redis sorted set for priority queue
                score = task.priority.value * 1000000 + int(time.time())
                task_data = json.dumps(task.to_dict())

                await self.redis_client.zadd(
                    f"{self.queue_name}:{task.priority.name.lower()}",
                    {task_data: score},
                )
                return True
            else:
                # Use memory queue
                self.memory_queue[task.priority].append(task)
                return True

        except Exception as e:
            logger.error(f"Failed to enqueue task {task.id}: {str(e)}")
            return False

    async def dequeue(self, priority: TaskPriority = None) -> Optional[Task]:
        """Get next task from queue"""
        try:
            if self.redis_client:
                # Check queues by priority (highest first)
                priorities = [
                    TaskPriority.CRITICAL,
                    TaskPriority.HIGH,
                    TaskPriority.NORMAL,
                    TaskPriority.LOW,
                ]
                if priority:
                    priorities = [priority]

                for prio in priorities:
                    queue_key = f"{self.queue_name}:{prio.name.lower()}"
                    result = await self.redis_client.zrange(
                        queue_key, 0, 0, withscores=True
                    )

                    if result:
                        task_data, score = result[0]
                        await self.redis_client.zrem(queue_key, task_data)

                        task_dict = json.loads(task_data)
                        return Task.from_dict(task_dict)

                return None
            else:
                # Use memory queue
                priorities = [
                    TaskPriority.CRITICAL,
                    TaskPriority.HIGH,
                    TaskPriority.NORMAL,
                    TaskPriority.LOW,
                ]
                if priority:
                    priorities = [priority]

                for prio in priorities:
                    if self.memory_queue[prio]:
                        return self.memory_queue[prio].popleft()

                return None

        except Exception as e:
            logger.error(f"Failed to dequeue task: {str(e)}")
            return None

    async def size(self, priority: TaskPriority = None) -> int:
        """Get queue size"""
        try:
            if self.redis_client:
                if priority:
                    queue_key = f"{self.queue_name}:{priority.name.lower()}"
                    return await self.redis_client.zcard(queue_key)
                else:
                    total = 0
                    for prio in TaskPriority:
                        queue_key = f"{self.queue_name}:{prio.name.lower()}"
                        total += await self.redis_client.zcard(queue_key)
                    return total
            else:
                if priority:
                    return len(self.memory_queue[priority])
                else:
                    return sum(len(queue) for queue in self.memory_queue.values())

        except Exception as e:
            logger.error(f"Failed to get queue size: {str(e)}")
            return 0


class TaskWorker:
    """Worker that processes tasks from the queue"""

    def __init__(
        self, worker_id: str, task_queue: TaskQueue, task_registry: Dict[str, Callable]
    ):
        self.worker_id = worker_id
        self.task_queue = task_queue
        self.task_registry = task_registry
        self.is_running = False
        self.current_task: Optional[Task] = None
        self.processed_tasks = 0
        self.failed_tasks = 0

    async def start(self):
        """Start worker"""
        self.is_running = True
        logger.info(f"Worker {self.worker_id} started")

        while self.is_running:
            try:
                # Get next task
                task = await self.task_queue.dequeue()

                if task:
                    await self.process_task(task)
                else:
                    # No tasks available, wait a bit
                    await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"Worker {self.worker_id} error: {str(e)}")
                await asyncio.sleep(5)  # Wait before retrying

    async def stop(self):
        """Stop worker"""
        self.is_running = False
        logger.info(f"Worker {self.worker_id} stopped")

    async def process_task(self, task: Task):
        """Process a single task"""
        self.current_task = task
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.utcnow()

        logger.info(f"Worker {self.worker_id} processing task {task.id}: {task.name}")

        try:
            # Get function from registry
            if task.func not in self.task_registry:
                raise ValueError(f"Task function '{task.func}' not found in registry")

            func = self.task_registry[task.func]

            # Execute task with timeout
            result = await asyncio.wait_for(
                self.execute_function(func, task.args, task.kwargs),
                timeout=task.timeout,
            )

            # Task completed successfully
            task.status = TaskStatus.COMPLETED
            task.result = result
            task.completed_at = datetime.utcnow()
            self.processed_tasks += 1

            logger.info(f"Task {task.id} completed successfully")

        except asyncio.TimeoutError:
            task.error = f"Task timed out after {task.timeout} seconds"
            await self.handle_task_failure(task)

        except Exception as e:
            task.error = str(e)
            await self.handle_task_failure(task)

        finally:
            self.current_task = None

    async def execute_function(
        self, func: Callable, args: List[Any], kwargs: Dict[str, Any]
    ) -> Any:
        """Execute task function"""
        if asyncio.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        else:
            # Run in thread pool for CPU-bound tasks
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, func, *args, **kwargs)

    async def handle_task_failure(self, task: Task):
        """Handle task failure and retry logic"""
        self.failed_tasks += 1
        task.retry_count += 1

        if task.retry_count <= task.max_retries:
            # Schedule retry
            task.status = TaskStatus.RETRYING
            task.scheduled_time = datetime.utcnow() + timedelta(
                seconds=task.retry_delay
            )

            # Re-enqueue with delay
            await asyncio.sleep(task.retry_delay)
            await self.task_queue.enqueue(task)

            logger.warning(
                f"Task {task.id} failed, retry {task.retry_count}/{task.max_retries}"
            )
        else:
            # Max retries exceeded
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.utcnow()

            logger.error(f"Task {task.id} failed permanently: {task.error}")


class TaskScheduler:
    """Scheduler for periodic and delayed tasks"""

    def __init__(self, task_queue: TaskQueue):
        self.task_queue = task_queue
        self.scheduled_tasks: Dict[str, Task] = {}
        self.recurring_tasks: Dict[str, Dict[str, Any]] = {}
        self.is_running = False

    async def start(self):
        """Start scheduler"""
        self.is_running = True
        logger.info("Task scheduler started")

        while self.is_running:
            try:
                await self.check_scheduled_tasks()
                await self.check_recurring_tasks()
                await asyncio.sleep(10)  # Check every 10 seconds

            except Exception as e:
                logger.error(f"Scheduler error: {str(e)}")
                await asyncio.sleep(30)

    async def stop(self):
        """Stop scheduler"""
        self.is_running = False
        logger.info("Task scheduler stopped")

    async def schedule_task(
        self, task: Task, delay_seconds: int = None, at_time: datetime = None
    ):
        """Schedule a task for later execution"""
        if delay_seconds:
            task.scheduled_time = datetime.utcnow() + timedelta(seconds=delay_seconds)
        elif at_time:
            task.scheduled_time = at_time

        self.scheduled_tasks[task.id] = task
        logger.info(f"Task {task.id} scheduled for {task.scheduled_time}")

    async def schedule_recurring(
        self,
        name: str,
        func: str,
        interval_seconds: int,
        args: List[Any] = None,
        kwargs: Dict[str, Any] = None,
        start_immediately: bool = False,
    ):
        """Schedule a recurring task"""
        self.recurring_tasks[name] = {
            "func": func,
            "interval": interval_seconds,
            "args": args or [],
            "kwargs": kwargs or {},
            "last_run": None,
            "next_run": (
                datetime.utcnow()
                if start_immediately
                else datetime.utcnow() + timedelta(seconds=interval_seconds)
            ),
        }
        logger.info(
            f"Recurring task '{name}' scheduled with interval {interval_seconds}s"
        )

    async def check_scheduled_tasks(self):
        """Check and enqueue scheduled tasks"""
        now = datetime.utcnow()
        ready_tasks = []

        for task_id, task in self.scheduled_tasks.items():
            if task.scheduled_time and task.scheduled_time <= now:
                ready_tasks.append(task_id)

        for task_id in ready_tasks:
            task = self.scheduled_tasks.pop(task_id)
            task.scheduled_time = None
            await self.task_queue.enqueue(task)
            logger.info(f"Scheduled task {task_id} enqueued")

    async def check_recurring_tasks(self):
        """Check and enqueue recurring tasks"""
        now = datetime.utcnow()

        for name, config in self.recurring_tasks.items():
            if config["next_run"] <= now:
                # Create new task instance
                task = Task(
                    id=str(uuid.uuid4()),
                    name=f"recurring_{name}",
                    func=config["func"],
                    args=config["args"],
                    kwargs=config["kwargs"],
                    priority=TaskPriority.NORMAL,
                )

                await self.task_queue.enqueue(task)

                # Update next run time
                config["last_run"] = now
                config["next_run"] = now + timedelta(seconds=config["interval"])

                logger.info(
                    f"Recurring task '{name}' enqueued, next run: {config['next_run']}"
                )


class TaskManager:
    """Main task management system"""

    def __init__(self, redis_client=None, num_workers: int = 4):
        self.redis_client = redis_client
        self.task_queue = TaskQueue(redis_client)
        self.scheduler = TaskScheduler(self.task_queue)
        self.workers: List[TaskWorker] = []
        self.num_workers = num_workers
        self.task_registry: Dict[str, Callable] = {}
        self.is_running = False

        # Statistics
        self.stats = {
            "tasks_enqueued": 0,
            "tasks_completed": 0,
            "tasks_failed": 0,
            "tasks_retried": 0,
            "workers_active": 0,
            "queue_size": 0,
            "uptime_start": time.time(),
        }

        # Register built-in tasks
        self.register_builtin_tasks()

    def register_task(self, name: str, func: Callable):
        """Register a task function"""
        self.task_registry[name] = func
        logger.info(f"Task '{name}' registered")

    def register_builtin_tasks(self):
        """Register built-in system tasks"""
        from config.database import get_db_session

        # Database maintenance tasks
        async def cleanup_old_data():
            """Clean up old data"""
            with get_db_session() as db:
                # Delete old completed appointments (older than 1 year)
                cutoff_date = datetime.utcnow() - timedelta(days=365)
                result = db.execute(
                    text(
                        """
                    DELETE FROM appointments
                    WHERE appointment_date < :cutoff_date
                    AND status = 'completed'
                """
                    ),
                    {"cutoff_date": cutoff_date},
                )

                deleted_count = result.rowcount
                logger.info(f"Cleaned up {deleted_count} old appointments")
                return {"deleted_appointments": deleted_count}

        async def update_analytics():
            """Update analytics data"""
            # This would trigger analytics calculations
            logger.info("Analytics update task executed")
            return {"status": "completed"}

        async def backup_database():
            """Backup database"""
            # This would implement database backup logic
            logger.info("Database backup task executed")
            return {"status": "completed"}

        async def send_notifications():
            """Send scheduled notifications"""
            # This would send pending notifications
            logger.info("Notification sending task executed")
            return {"notifications_sent": 0}

        # Register tasks
        self.register_task("cleanup_old_data", cleanup_old_data)
        self.register_task("update_analytics", update_analytics)
        self.register_task("backup_database", backup_database)
        self.register_task("send_notifications", send_notifications)

    async def start(self):
        """Start task manager"""
        if self.is_running:
            return

        self.is_running = True

        # Start workers
        for i in range(self.num_workers):
            worker = TaskWorker(f"worker_{i}", self.task_queue, self.task_registry)
            self.workers.append(worker)
            asyncio.create_task(worker.start())

        # Start scheduler
        asyncio.create_task(self.scheduler.start())

        # Schedule built-in recurring tasks
        await self.schedule_builtin_tasks()

        self.stats["workers_active"] = len(self.workers)
        logger.info(f"Task manager started with {self.num_workers} workers")

    async def stop(self):
        """Stop task manager"""
        if not self.is_running:
            return

        self.is_running = False

        # Stop workers
        for worker in self.workers:
            await worker.stop()

        # Stop scheduler
        await self.scheduler.stop()

        self.workers.clear()
        self.stats["workers_active"] = 0
        logger.info("Task manager stopped")

    async def schedule_builtin_tasks(self):
        """Schedule built-in recurring tasks"""
        # Daily cleanup at 2 AM
        await self.scheduler.schedule_recurring(
            "daily_cleanup",
            "cleanup_old_data",
            86400,  # 24 hours
            start_immediately=False,
        )

        # Update analytics every hour
        await self.scheduler.schedule_recurring(
            "hourly_analytics",
            "update_analytics",
            3600,  # 1 hour
            start_immediately=True,
        )

        # Send notifications every 5 minutes
        await self.scheduler.schedule_recurring(
            "notification_sender",
            "send_notifications",
            300,  # 5 minutes
            start_immediately=True,
        )

        # Database backup daily at 3 AM
        await self.scheduler.schedule_recurring(
            "daily_backup",
            "backup_database",
            86400,  # 24 hours
            start_immediately=False,
        )

    async def enqueue_task(
        self,
        name: str,
        func: str,
        args: List[Any] = None,
        kwargs: Dict[str, Any] = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
        timeout: int = 300,
    ) -> str:
        """Enqueue a new task"""
        task = Task(
            id=str(uuid.uuid4()),
            name=name,
            func=func,
            args=args or [],
            kwargs=kwargs or {},
            priority=priority,
            max_retries=max_retries,
            timeout=timeout,
        )

        success = await self.task_queue.enqueue(task)
        if success:
            self.stats["tasks_enqueued"] += 1
            logger.info(f"Task {task.id} ({name}) enqueued")
            return task.id
        else:
            raise Exception(f"Failed to enqueue task {name}")

    async def schedule_task(
        self,
        name: str,
        func: str,
        delay_seconds: int = None,
        at_time: datetime = None,
        args: List[Any] = None,
        kwargs: Dict[str, Any] = None,
        priority: TaskPriority = TaskPriority.NORMAL,
    ) -> str:
        """Schedule a task for later execution"""
        task = Task(
            id=str(uuid.uuid4()),
            name=name,
            func=func,
            args=args or [],
            kwargs=kwargs or {},
            priority=priority,
        )

        await self.scheduler.schedule_task(task, delay_seconds, at_time)
        return task.id

    async def get_stats(self) -> Dict[str, Any]:
        """Get task manager statistics"""
        # Update queue size
        self.stats["queue_size"] = await self.task_queue.size()

        # Calculate worker stats
        total_processed = sum(worker.processed_tasks for worker in self.workers)
        total_failed = sum(worker.failed_tasks for worker in self.workers)

        return {
            **self.stats,
            "tasks_processed": total_processed,
            "tasks_failed_workers": total_failed,
            "uptime_seconds": int(time.time() - self.stats["uptime_start"]),
            "workers": [
                {
                    "id": worker.worker_id,
                    "is_running": worker.is_running,
                    "current_task": (
                        worker.current_task.name if worker.current_task else None
                    ),
                    "processed_tasks": worker.processed_tasks,
                    "failed_tasks": worker.failed_tasks,
                }
                for worker in self.workers
            ],
        }


# Global task manager instance
task_manager = TaskManager()

# Export main components
__all__ = ["Task", "TaskStatus", "TaskPriority", "TaskManager", "task_manager"]

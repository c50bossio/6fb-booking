"""
Event Consumer Manager for BookedBarber V2.

Manages the lifecycle of event stream consumers and provides health monitoring.
"""

import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime

from services.event_streaming_service import (
    event_streaming_service, StreamName, initialize_event_consumers, start_all_consumers
)
from services.event_processors import (
    handle_marketing_event, handle_user_behavior_event, handle_notification_event
)

logger = logging.getLogger(__name__)


class EventConsumerManager:
    """
    Manages event stream consumers and provides health monitoring.
    """
    
    def __init__(self):
        self.consumer_tasks: Dict[str, asyncio.Task] = {}
        self.consumer_health: Dict[str, Dict] = {}
        self.is_running = False
        self.health_check_interval = 30  # Check health every 30 seconds
        self.health_task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start all event consumers"""
        if self.is_running:
            logger.warning("Event consumer manager is already running")
            return
        
        try:
            logger.info("Starting event consumer manager")
            
            # Initialize event streaming service
            await event_streaming_service.initialize()
            
            # Register event processors
            await event_streaming_service.register_consumer(
                "marketing_processor",
                StreamName.MARKETING_EVENTS,
                handle_marketing_event
            )
            
            await event_streaming_service.register_consumer(
                "behavior_processor", 
                StreamName.USER_BEHAVIOR,
                handle_user_behavior_event
            )
            
            await event_streaming_service.register_consumer(
                "notification_processor",
                StreamName.NOTIFICATIONS,
                handle_notification_event
            )
            
            # Start consumer tasks
            consumer_names = ["marketing_processor", "behavior_processor", "notification_processor"]
            
            for consumer_name in consumer_names:
                task = asyncio.create_task(
                    event_streaming_service.start_consumer(consumer_name),
                    name=f"consumer_{consumer_name}"
                )
                self.consumer_tasks[consumer_name] = task
                
                # Initialize health status
                self.consumer_health[consumer_name] = {
                    "status": "starting",
                    "last_health_check": datetime.utcnow(),
                    "processed_count": 0,
                    "error_count": 0,
                    "last_error": None
                }
            
            # Start health monitoring
            self.health_task = asyncio.create_task(self._health_monitor())
            
            self.is_running = True
            logger.info(f"Started {len(consumer_names)} event consumers")
            
        except Exception as e:
            logger.error(f"Failed to start event consumer manager: {e}")
            await self.stop()
            raise
    
    async def stop(self):
        """Stop all event consumers"""
        if not self.is_running:
            return
        
        logger.info("Stopping event consumer manager")
        
        # Stop health monitoring
        if self.health_task and not self.health_task.done():
            self.health_task.cancel()
            try:
                await self.health_task
            except asyncio.CancelledError:
                pass
        
        # Stop all consumers
        await event_streaming_service.stop_all_consumers()
        
        # Cancel consumer tasks
        for consumer_name, task in self.consumer_tasks.items():
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        self.consumer_tasks.clear()
        self.consumer_health.clear()
        self.is_running = False
        
        logger.info("Event consumer manager stopped")
    
    async def restart_consumer(self, consumer_name: str):
        """Restart a specific consumer"""
        if consumer_name not in self.consumer_tasks:
            raise ValueError(f"Consumer {consumer_name} not found")
        
        logger.info(f"Restarting consumer {consumer_name}")
        
        # Stop the consumer
        await event_streaming_service.stop_consumer(consumer_name)
        
        # Cancel the task
        task = self.consumer_tasks[consumer_name]
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        # Start a new task
        new_task = asyncio.create_task(
            event_streaming_service.start_consumer(consumer_name),
            name=f"consumer_{consumer_name}"
        )
        self.consumer_tasks[consumer_name] = new_task
        
        # Update health status
        self.consumer_health[consumer_name] = {
            "status": "restarting",
            "last_health_check": datetime.utcnow(),
            "processed_count": 0,
            "error_count": 0,
            "last_error": None
        }
        
        logger.info(f"Consumer {consumer_name} restarted")
    
    async def _health_monitor(self):
        """Monitor consumer health and restart if needed"""
        while self.is_running:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                for consumer_name, task in self.consumer_tasks.items():
                    health = self.consumer_health[consumer_name]
                    
                    # Check if task is still running
                    if task.done():
                        health["status"] = "failed"
                        health["error_count"] += 1
                        
                        # Get exception if task failed
                        try:
                            exception = task.exception()
                            if exception:
                                health["last_error"] = str(exception)
                                logger.error(f"Consumer {consumer_name} failed: {exception}")
                        except Exception:
                            pass
                        
                        # Restart failed consumer
                        try:
                            await self.restart_consumer(consumer_name)
                        except Exception as e:
                            logger.error(f"Failed to restart consumer {consumer_name}: {e}")
                    
                    else:
                        # Task is running
                        if event_streaming_service.running_consumers.get(consumer_name, False):
                            health["status"] = "healthy"
                        else:
                            health["status"] = "stopping"
                    
                    health["last_health_check"] = datetime.utcnow()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health monitor: {e}")
    
    def get_consumer_status(self) -> Dict[str, Dict]:
        """Get status of all consumers"""
        status = {}
        
        for consumer_name, health in self.consumer_health.items():
            task = self.consumer_tasks.get(consumer_name)
            
            status[consumer_name] = {
                "health": health.copy(),
                "task_running": task and not task.done() if task else False,
                "stream_consumer_running": event_streaming_service.running_consumers.get(consumer_name, False)
            }
        
        return status
    
    def get_overall_health(self) -> Dict[str, any]:
        """Get overall health status"""
        if not self.is_running:
            return {
                "status": "stopped",
                "healthy_consumers": 0,
                "total_consumers": 0,
                "unhealthy_consumers": []
            }
        
        healthy_count = 0
        unhealthy_consumers = []
        
        for consumer_name, health in self.consumer_health.items():
            if health["status"] == "healthy":
                healthy_count += 1
            else:
                unhealthy_consumers.append({
                    "name": consumer_name,
                    "status": health["status"],
                    "last_error": health.get("last_error")
                })
        
        total_consumers = len(self.consumer_health)
        
        overall_status = "healthy"
        if healthy_count == 0:
            overall_status = "critical"
        elif healthy_count < total_consumers:
            overall_status = "degraded"
        
        return {
            "status": overall_status,
            "healthy_consumers": healthy_count,
            "total_consumers": total_consumers,
            "unhealthy_consumers": unhealthy_consumers,
            "last_check": datetime.utcnow()
        }


# Global consumer manager instance
consumer_manager = EventConsumerManager()


async def start_event_consumer_manager():
    """Start the event consumer manager"""
    await consumer_manager.start()


async def stop_event_consumer_manager():
    """Stop the event consumer manager"""
    await consumer_manager.stop()


async def get_consumer_manager_health():
    """Get health status of the consumer manager"""
    return consumer_manager.get_overall_health()
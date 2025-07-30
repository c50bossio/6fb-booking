"""
Memory Management & Leak Detection Service
Addresses critical backend memory issues and resource leaks

Features:
- Real-time memory monitoring
- Memory leak detection and alerting
- Resource pool management
- Garbage collection optimization
- Memory usage analytics
"""

import asyncio
import gc
import logging
import psutil
import time
import weakref
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
import threading
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class MemorySnapshot:
    """Memory usage snapshot"""
    timestamp: float
    rss_mb: float
    vms_mb: float
    percent: float
    heap_size: Optional[float] = None
    gc_objects: int = 0
    thread_count: int = 0

@dataclass
class MemoryLeak:
    """Memory leak detection result"""
    component: str
    growth_rate_mb_per_hour: float
    detection_time: float
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    details: Dict[str, Any]

class ResourcePool:
    """Generic resource pool for expensive operations"""
    
    def __init__(self, name: str, factory: Callable, max_size: int = 10, ttl: int = 3600):
        self.name = name
        self.factory = factory
        self.max_size = max_size
        self.ttl = ttl
        self.pool = deque()
        self.in_use = set()
        self.created_count = 0
        self.borrowed_count = 0
        self.lock = threading.Lock()
        
    def borrow(self):
        """Borrow a resource from the pool"""
        with self.lock:
            # Try to get from pool
            if self.pool:
                resource = self.pool.popleft()
                self.in_use.add(id(resource))
                self.borrowed_count += 1
                return resource
            
            # Create new resource if under limit
            if self.created_count < self.max_size:
                resource = self.factory()
                self.in_use.add(id(resource))
                self.created_count += 1
                self.borrowed_count += 1
                return resource
            
            # Pool exhausted - wait or create temporary
            logger.warning(f"Resource pool {self.name} exhausted, creating temporary resource")
            return self.factory()
    
    def return_resource(self, resource):
        """Return a resource to the pool"""
        with self.lock:
            resource_id = id(resource)
            if resource_id in self.in_use:
                self.in_use.remove(resource_id)
                
                # Return to pool if space available
                if len(self.pool) < self.max_size:
                    self.pool.append(resource)
                else:
                    # Pool full, let resource be garbage collected
                    pass
    
    def get_stats(self) -> Dict:
        """Get pool statistics"""
        with self.lock:
            return {
                "name": self.name,
                "pool_size": len(self.pool),
                "in_use": len(self.in_use),
                "created_count": self.created_count,
                "borrowed_count": self.borrowed_count,
                "max_size": self.max_size
            }

class ComponentMemoryTracker:
    """Track memory usage by component/service"""
    
    def __init__(self):
        self.component_memory: Dict[str, List[float]] = defaultdict(list)
        self.component_objects: Dict[str, List[int]] = defaultdict(list)
        self.component_refs: Dict[str, weakref.WeakSet] = defaultdict(weakref.WeakSet)
        
    def track_component(self, component_name: str, memory_mb: float, object_count: int = None):
        """Track memory usage for a component"""
        self.component_memory[component_name].append(memory_mb)
        
        if object_count is not None:
            self.component_objects[component_name].append(object_count)
        
        # Keep only last 100 measurements
        if len(self.component_memory[component_name]) > 100:
            self.component_memory[component_name] = self.component_memory[component_name][-100:]
            
        if component_name in self.component_objects and len(self.component_objects[component_name]) > 100:
            self.component_objects[component_name] = self.component_objects[component_name][-100:]
    
    def register_object(self, component_name: str, obj: Any):
        """Register an object with weak reference tracking"""
        self.component_refs[component_name].add(obj)
    
    def get_component_stats(self) -> Dict:
        """Get memory statistics by component"""
        stats = {}
        
        for component, memory_history in self.component_memory.items():
            if memory_history:
                current_memory = memory_history[-1]
                avg_memory = sum(memory_history) / len(memory_history)
                max_memory = max(memory_history)
                
                # Calculate growth rate if enough data
                growth_rate = 0
                if len(memory_history) >= 10:
                    recent_avg = sum(memory_history[-5:]) / 5
                    older_avg = sum(memory_history[-10:-5]) / 5
                    growth_rate = recent_avg - older_avg
                
                stats[component] = {
                    "current_memory_mb": current_memory,
                    "average_memory_mb": avg_memory,
                    "max_memory_mb": max_memory,
                    "growth_rate_mb": growth_rate,
                    "object_count": len(self.component_refs.get(component, [])),
                    "measurements": len(memory_history)
                }
        
        return stats

class MemoryLeakDetector:
    """Detect memory leaks using various algorithms"""
    
    def __init__(self, leak_threshold_mb_per_hour: float = 50.0):
        self.leak_threshold = leak_threshold_mb_per_hour
        self.memory_history = deque(maxlen=1000)  # Last 1000 snapshots
        self.component_tracker = ComponentMemoryTracker()
        self.detected_leaks: List[MemoryLeak] = []
        
    def add_snapshot(self, snapshot: MemorySnapshot):
        """Add memory snapshot for analysis"""
        self.memory_history.append(snapshot)
        
        # Analyze for leaks if enough data
        if len(self.memory_history) >= 20:
            self._analyze_for_leaks()
    
    def _analyze_for_leaks(self):
        """Analyze memory history for potential leaks"""
        if len(self.memory_history) < 20:
            return
        
        # Simple trend analysis
        recent_snapshots = list(self.memory_history)[-20:]
        time_span_hours = (recent_snapshots[-1].timestamp - recent_snapshots[0].timestamp) / 3600
        
        if time_span_hours > 0:
            memory_growth = recent_snapshots[-1].rss_mb - recent_snapshots[0].rss_mb
            growth_rate = memory_growth / time_span_hours
            
            if growth_rate > self.leak_threshold:
                severity = self._calculate_severity(growth_rate)
                
                leak = MemoryLeak(
                    component="system",
                    growth_rate_mb_per_hour=growth_rate,
                    detection_time=time.time(),
                    severity=severity,
                    details={
                        "memory_growth_mb": memory_growth,
                        "time_span_hours": time_span_hours,
                        "recent_memory_mb": recent_snapshots[-1].rss_mb,
                        "initial_memory_mb": recent_snapshots[0].rss_mb
                    }
                )
                
                self.detected_leaks.append(leak)
                logger.warning(f"Memory leak detected: {growth_rate:.2f} MB/hour growth rate")
    
    def _calculate_severity(self, growth_rate: float) -> str:
        """Calculate leak severity based on growth rate"""
        if growth_rate > 200:
            return "CRITICAL"
        elif growth_rate > 100:
            return "HIGH"
        elif growth_rate > 50:
            return "MEDIUM"
        else:
            return "LOW"
    
    def get_recent_leaks(self, hours: int = 24) -> List[MemoryLeak]:
        """Get leaks detected in recent hours"""
        cutoff_time = time.time() - (hours * 3600)
        return [leak for leak in self.detected_leaks if leak.detection_time > cutoff_time]

class GarbageCollectionOptimizer:
    """Optimize Python garbage collection for better memory management"""
    
    def __init__(self):
        self.gc_stats = []
        self.optimization_enabled = False
        
    def enable_optimization(self):
        """Enable GC optimizations"""
        # Adjust GC thresholds for better performance
        # Default is (700, 10, 10) - we optimize for server workload
        gc.set_threshold(1000, 15, 15)  # Less frequent gen0, more frequent gen1/gen2
        
        # Enable debug flags in development
        if os.getenv("ENVIRONMENT") == "development":
            gc.set_debug(gc.DEBUG_STATS)
        
        self.optimization_enabled = True
        logger.info("Garbage collection optimization enabled")
    
    def force_collection(self) -> Dict:
        """Force garbage collection and return stats"""
        before_counts = gc.get_count()
        before_objects = len(gc.get_objects())
        
        start_time = time.time()
        collected = gc.collect()
        collection_time = time.time() - start_time
        
        after_counts = gc.get_count()
        after_objects = len(gc.get_objects())
        
        stats = {
            "collected_objects": collected,
            "collection_time_ms": collection_time * 1000,
            "objects_before": before_objects,
            "objects_after": after_objects,
            "objects_freed": before_objects - after_objects,
            "gc_counts_before": before_counts,
            "gc_counts_after": after_counts
        }
        
        self.gc_stats.append(stats)
        logger.info(f"Forced GC collected {collected} objects in {collection_time*1000:.2f}ms")
        
        return stats
    
    def get_gc_stats(self) -> Dict:
        """Get garbage collection statistics"""
        return {
            "optimization_enabled": self.optimization_enabled,
            "current_threshold": gc.get_threshold(),
            "current_counts": gc.get_count(),
            "total_objects": len(gc.get_objects()),
            "recent_collections": self.gc_stats[-10:] if self.gc_stats else []
        }

class MemoryManagementService:
    """Main memory management service"""
    
    def __init__(self):
        self.process = psutil.Process()
        self.snapshots = deque(maxlen=1000)
        self.leak_detector = MemoryLeakDetector()
        self.gc_optimizer = GarbageCollectionOptimizer()
        self.resource_pools: Dict[str, ResourcePool] = {}
        self.monitoring_active = False
        self.monitoring_task: Optional[asyncio.Task] = None
        self.alert_callbacks: List[Callable] = []
        
        # Memory thresholds for alerts
        self.memory_alert_threshold_mb = 1000  # 1GB
        self.memory_critical_threshold_mb = 2000  # 2GB
        
    async def start_monitoring(self, interval_seconds: int = 60):
        """Start continuous memory monitoring"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.gc_optimizer.enable_optimization()
        
        self.monitoring_task = asyncio.create_task(self._monitoring_loop(interval_seconds))
        logger.info(f"Memory monitoring started with {interval_seconds}s interval")
        
    async def stop_monitoring(self):
        """Stop memory monitoring"""
        self.monitoring_active = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Memory monitoring stopped")
        
    async def _monitoring_loop(self, interval_seconds: int):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Take memory snapshot
                snapshot = self._take_snapshot()
                self.snapshots.append(snapshot)
                self.leak_detector.add_snapshot(snapshot)
                
                # Check for memory alerts
                await self._check_memory_alerts(snapshot)
                
                # Periodic garbage collection (every 10 minutes)
                if len(self.snapshots) % 10 == 0:
                    self.gc_optimizer.force_collection()
                
                await asyncio.sleep(interval_seconds)
                
            except Exception as e:
                logger.error(f"Error in memory monitoring loop: {e}")
                await asyncio.sleep(interval_seconds)
    
    def _take_snapshot(self) -> MemorySnapshot:
        """Take a memory usage snapshot"""
        memory_info = self.process.memory_info()
        
        return MemorySnapshot(
            timestamp=time.time(),
            rss_mb=memory_info.rss / 1024 / 1024,
            vms_mb=memory_info.vms / 1024 / 1024,
            percent=self.process.memory_percent(),
            gc_objects=len(gc.get_objects()),
            thread_count=threading.active_count()
        )
    
    async def _check_memory_alerts(self, snapshot: MemorySnapshot):
        """Check if memory usage requires alerts"""
        if snapshot.rss_mb > self.memory_critical_threshold_mb:
            await self._trigger_alert("CRITICAL", f"Memory usage critical: {snapshot.rss_mb:.1f}MB")
        elif snapshot.rss_mb > self.memory_alert_threshold_mb:
            await self._trigger_alert("WARNING", f"Memory usage high: {snapshot.rss_mb:.1f}MB")
        
        # Check for recent leaks
        recent_leaks = self.leak_detector.get_recent_leaks(hours=1)
        for leak in recent_leaks:
            if leak.severity in ["HIGH", "CRITICAL"]:
                await self._trigger_alert(
                    leak.severity, 
                    f"Memory leak detected: {leak.growth_rate_mb_per_hour:.2f}MB/hour"
                )
    
    async def _trigger_alert(self, level: str, message: str):
        """Trigger memory alert"""
        logger.error(f"MEMORY ALERT [{level}]: {message}")
        
        # Call registered alert callbacks
        for callback in self.alert_callbacks:
            try:
                await callback(level, message)
            except Exception as e:
                logger.error(f"Error in alert callback: {e}")
    
    def register_alert_callback(self, callback: Callable):
        """Register callback for memory alerts"""
        self.alert_callbacks.append(callback)
    
    def create_resource_pool(self, name: str, factory: Callable, max_size: int = 10) -> ResourcePool:
        """Create a new resource pool"""
        pool = ResourcePool(name, factory, max_size)
        self.resource_pools[name] = pool
        logger.info(f"Created resource pool: {name} (max_size: {max_size})")
        return pool
    
    def get_resource_pool(self, name: str) -> Optional[ResourcePool]:
        """Get resource pool by name"""
        return self.resource_pools.get(name)
    
    def get_memory_stats(self) -> Dict:
        """Get comprehensive memory statistics"""
        current_snapshot = self._take_snapshot()
        
        # Calculate memory trends
        memory_trend = "stable"
        if len(self.snapshots) >= 10:
            recent_avg = sum(s.rss_mb for s in list(self.snapshots)[-5:]) / 5
            older_avg = sum(s.rss_mb for s in list(self.snapshots)[-10:-5]) / 5
            growth = recent_avg - older_avg
            
            if growth > 10:
                memory_trend = "increasing"
            elif growth < -10:
                memory_trend = "decreasing"
        
        return {
            "current_memory": {
                "rss_mb": current_snapshot.rss_mb,
                "vms_mb": current_snapshot.vms_mb,
                "percent": current_snapshot.percent,
                "gc_objects": current_snapshot.gc_objects,
                "thread_count": current_snapshot.thread_count
            },
            "memory_trend": memory_trend,
            "leak_detection": {
                "recent_leaks": len(self.leak_detector.get_recent_leaks(hours=24)),
                "total_leaks": len(self.leak_detector.detected_leaks)
            },
            "garbage_collection": self.gc_optimizer.get_gc_stats(),
            "resource_pools": {
                name: pool.get_stats() 
                for name, pool in self.resource_pools.items()
            },
            "monitoring_active": self.monitoring_active,
            "total_snapshots": len(self.snapshots)
        }
    
    async def cleanup_memory(self) -> Dict:
        """Perform memory cleanup operations"""
        cleanup_stats = {}
        
        # Force garbage collection
        gc_stats = self.gc_optimizer.force_collection()
        cleanup_stats["garbage_collection"] = gc_stats
        
        # Clear internal caches
        cache_cleared = 0
        if hasattr(self, '_internal_cache'):
            cache_cleared = len(self._internal_cache)
            self._internal_cache.clear()
        cleanup_stats["cache_cleared"] = cache_cleared
        
        # Log cleanup results
        memory_before = self.snapshots[-1].rss_mb if self.snapshots else 0
        current_memory = self._take_snapshot().rss_mb
        memory_freed = memory_before - current_memory
        
        cleanup_stats["memory_freed_mb"] = memory_freed
        cleanup_stats["cleanup_timestamp"] = time.time()
        
        logger.info(f"Memory cleanup completed: freed {memory_freed:.2f}MB")
        return cleanup_stats

# Global memory management service instance
memory_manager = MemoryManagementService()

async def initialize_memory_management():
    """Initialize memory management system"""
    await memory_manager.start_monitoring(interval_seconds=60)
    
    # Create common resource pools
    memory_manager.create_resource_pool(
        "database_connections", 
        lambda: None,  # Placeholder - would create actual DB connections
        max_size=20
    )
    
    memory_manager.create_resource_pool(
        "thread_pool_workers",
        lambda: ThreadPoolExecutor(max_workers=4),
        max_size=5
    )
    
    logger.info("Memory management system initialized")

async def shutdown_memory_management():
    """Shutdown memory management system"""
    await memory_manager.stop_monitoring()
    
    # Cleanup resource pools
    for pool_name, pool in memory_manager.resource_pools.items():
        logger.info(f"Shutting down resource pool: {pool_name}")
    
    memory_manager.resource_pools.clear()
    logger.info("Memory management system shutdown completed")

def get_memory_stats() -> Dict:
    """Get current memory statistics"""
    return memory_manager.get_memory_stats()

async def force_memory_cleanup() -> Dict:
    """Force memory cleanup"""
    return await memory_manager.cleanup_memory()
"""
Agent Instance Service - Enhanced service for managing agent instance lifecycle and operations

This service provides comprehensive instance management functionality including:
- Instance lifecycle management (create, activate, pause, stop)
- Performance monitoring and uptime tracking
- Health checks and status management
- Integration with AI providers
- Scaling and load balancing
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from enum import Enum
import uuid

from models import (
    Agent, AgentInstance, AgentStatus, AgentMetrics, AgentConversation,
    User, Client, ConversationStatus
)
from services.ai_providers.ai_provider_manager import AIProviderManager
from services.notification_service import notification_service
from config import settings

logger = logging.getLogger(__name__)


class InstanceAction(Enum):
    """Available actions for agent instances"""
    START = "start"
    PAUSE = "pause"
    STOP = "stop"
    RESTART = "restart"
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    MAINTENANCE = "maintenance"


class PerformanceThreshold(Enum):
    """Performance threshold levels"""
    EXCELLENT = "excellent"  # >90% success rate
    GOOD = "good"           # 75-90% success rate
    FAIR = "fair"           # 60-75% success rate
    POOR = "poor"           # <60% success rate


class AgentInstanceService:
    """Enhanced service for managing agent instance lifecycle and operations"""
    
    def __init__(self):
        self.ai_manager = AIProviderManager()
        self.active_instances = {}  # In-memory cache of active instances
        self.performance_cache = {}  # Cache for performance metrics
        self.health_check_interval = 300  # 5 minutes
        
    async def create_instance(
        self, 
        db: Session, 
        agent_id: int, 
        user_id: int, 
        config: Optional[Dict[str, Any]] = None,
        auto_start: bool = False
    ) -> Dict[str, Any]:
        """
        Create a new agent instance
        
        Args:
            db: Database session
            agent_id: Parent agent ID
            user_id: Owner user ID
            config: Instance-specific configuration
            auto_start: Whether to start the instance immediately
            
        Returns:
            Created instance with status and configuration
        """
        try:
            # Validate agent exists and user has access
            agent = db.query(Agent).filter(
                and_(Agent.id == agent_id, Agent.user_id == user_id)
            ).first()
            
            if not agent:
                raise ValueError(f"Agent {agent_id} not found or access denied")
            
            # Merge agent config with instance-specific config
            agent_config = json.loads(agent.config or "{}")
            instance_config = {**agent_config, **(config or {})}
            
            # Validate configuration
            validation_result = await self._validate_instance_config(instance_config)
            if not validation_result["is_valid"]:
                raise ValueError(f"Invalid instance configuration: {validation_result['errors']}")
            
            # Create instance
            instance = AgentInstance(
                agent_id=agent_id,
                name=f"{agent.name} Instance {datetime.now().strftime('%Y%m%d_%H%M')}",
                status=AgentStatus.STOPPED,
                config=json.dumps(instance_config),
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
                last_health_check=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            
            db.add(instance)
            db.commit()
            db.refresh(instance)
            
            # Initialize metrics
            await self._initialize_instance_metrics(db, instance.id)
            
            # Start if requested
            if auto_start:
                await self.start_instance(db, instance.id, user_id)
            
            return {
                "instance_id": instance.id,
                "agent_id": agent_id,
                "name": instance.name,
                "status": instance.status.value,
                "config": instance_config,
                "validation": validation_result,
                "estimated_resources": await self._estimate_resource_requirements(instance_config),
                "next_steps": self._get_next_steps(instance.status, auto_start)
            }
            
        except Exception as e:
            logger.error(f"Error creating instance for agent {agent_id}: {str(e)}")
            db.rollback()
            raise
    
    async def start_instance(
        self, 
        db: Session, 
        instance_id: int, 
        user_id: int
    ) -> Dict[str, Any]:
        """
        Start an agent instance
        
        Args:
            db: Database session
            instance_id: Instance ID to start
            user_id: User ID for authorization
            
        Returns:
            Instance status and startup information
        """
        try:
            # Get instance with validation
            instance = await self._get_instance_with_auth(db, instance_id, user_id)
            
            if instance.status == AgentStatus.ACTIVE:
                return {
                    "success": True,
                    "message": "Instance is already running",
                    "status": instance.status.value,
                    "uptime": self._calculate_uptime(instance)
                }
            
            # Pre-startup health checks
            health_check = await self._perform_health_check(db, instance)
            if not health_check["healthy"]:
                raise ValueError(f"Health check failed: {health_check['issues']}")
            
            # Initialize AI provider connection
            ai_connection = await self._initialize_ai_connection(instance)
            if not ai_connection["success"]:
                raise ValueError(f"AI provider initialization failed: {ai_connection['error']}")
            
            # Update instance status
            instance.status = AgentStatus.ACTIVE
            instance.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
            instance.last_health_check = datetime.now(timezone.utc).replace(tzinfo=None)
            
            # Add to active instances cache
            self.active_instances[instance_id] = {
                "instance": instance,
                "ai_connection": ai_connection["connection"],
                "startup_time": datetime.now(timezone.utc),
                "performance_metrics": {}
            }
            
            db.commit()
            
            # Start background monitoring
            asyncio.create_task(self._monitor_instance(db, instance_id))
            
            # Record startup event
            await self._record_instance_event(db, instance_id, "startup", {
                "startup_time_ms": (datetime.now(timezone.utc) - instance.started_at).total_seconds() * 1000,
                "ai_provider": ai_connection.get("provider"),
                "config_version": hash(instance.config)
            })
            
            return {
                "success": True,
                "instance_id": instance_id,
                "status": instance.status.value,
                "started_at": instance.started_at.isoformat(),
                "ai_provider": ai_connection.get("provider"),
                "estimated_warmup_time": "30-60 seconds",
                "monitoring": {
                    "health_checks": True,
                    "performance_tracking": True,
                    "auto_scaling": self._get_auto_scaling_config(instance)
                }
            }
            
        except Exception as e:
            logger.error(f"Error starting instance {instance_id}: {str(e)}")
            # Cleanup on failure
            if instance_id in self.active_instances:
                del self.active_instances[instance_id]
            raise
    
    async def pause_instance(
        self, 
        db: Session, 
        instance_id: int, 
        user_id: int,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Pause an agent instance (graceful shutdown with state preservation)
        
        Args:
            db: Database session
            instance_id: Instance ID to pause
            user_id: User ID for authorization
            reason: Optional reason for pausing
            
        Returns:
            Instance status and pause information
        """
        try:
            instance = await self._get_instance_with_auth(db, instance_id, user_id)
            
            if instance.status != AgentStatus.ACTIVE:
                return {
                    "success": True,
                    "message": f"Instance is already {instance.status.value}",
                    "status": instance.status.value
                }
            
            # Complete ongoing conversations gracefully
            ongoing_conversations = await self._get_ongoing_conversations(db, instance_id)
            if ongoing_conversations:
                await self._complete_conversations_gracefully(db, ongoing_conversations)
            
            # Update status
            instance.status = AgentStatus.PAUSED
            instance.paused_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
            # Preserve state in cache for potential resume
            if instance_id in self.active_instances:
                self.active_instances[instance_id]["paused_state"] = {
                    "conversations": len(ongoing_conversations),
                    "last_activity": datetime.now(timezone.utc),
                    "reason": reason
                }
            
            db.commit()
            
            # Record pause event
            await self._record_instance_event(db, instance_id, "pause", {
                "reason": reason,
                "ongoing_conversations": len(ongoing_conversations),
                "uptime_seconds": (instance.paused_at - instance.started_at).total_seconds() if instance.started_at else 0
            })
            
            return {
                "success": True,
                "instance_id": instance_id,
                "status": instance.status.value,
                "paused_at": instance.paused_at.isoformat(),
                "reason": reason,
                "completed_conversations": len(ongoing_conversations),
                "can_resume": True
            }
            
        except Exception as e:
            logger.error(f"Error pausing instance {instance_id}: {str(e)}")
            raise
    
    async def stop_instance(
        self, 
        db: Session, 
        instance_id: int, 
        user_id: int,
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Stop an agent instance (complete shutdown)
        
        Args:
            db: Database session
            instance_id: Instance ID to stop
            user_id: User ID for authorization
            force: Whether to force stop (skip graceful shutdown)
            
        Returns:
            Instance status and stop information
        """
        try:
            instance = await self._get_instance_with_auth(db, instance_id, user_id)
            
            if instance.status == AgentStatus.STOPPED:
                return {
                    "success": True,
                    "message": "Instance is already stopped",
                    "status": instance.status.value
                }
            
            uptime = None
            if instance.started_at:
                uptime = (datetime.now(timezone.utc).replace(tzinfo=None) - instance.started_at).total_seconds()
            
            # Handle ongoing conversations
            ongoing_conversations = await self._get_ongoing_conversations(db, instance_id)
            if ongoing_conversations and not force:
                # Graceful shutdown - complete conversations
                await self._complete_conversations_gracefully(db, ongoing_conversations)
            elif ongoing_conversations and force:
                # Force shutdown - terminate conversations
                await self._terminate_conversations(db, ongoing_conversations)
            
            # Update status
            instance.status = AgentStatus.STOPPED
            instance.stopped_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
            # Remove from active instances
            if instance_id in self.active_instances:
                del self.active_instances[instance_id]
            
            db.commit()
            
            # Record stop event
            await self._record_instance_event(db, instance_id, "stop", {
                "force_stop": force,
                "uptime_seconds": uptime,
                "conversations_handled": len(ongoing_conversations),
                "final_metrics": await self._get_final_metrics(db, instance_id)
            })
            
            return {
                "success": True,
                "instance_id": instance_id,
                "status": instance.status.value,
                "stopped_at": instance.stopped_at.isoformat(),
                "uptime_seconds": uptime,
                "conversations_completed": len(ongoing_conversations),
                "force_stop": force,
                "final_summary": await self._generate_stop_summary(db, instance_id)
            }
            
        except Exception as e:
            logger.error(f"Error stopping instance {instance_id}: {str(e)}")
            raise
    
    async def restart_instance(
        self, 
        db: Session, 
        instance_id: int, 
        user_id: int,
        new_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Restart an agent instance (stop then start with optional config update)
        
        Args:
            db: Database session
            instance_id: Instance ID to restart
            user_id: User ID for authorization
            new_config: Optional new configuration to apply
            
        Returns:
            Restart results and new status
        """
        try:
            # Stop the instance
            stop_result = await self.stop_instance(db, instance_id, user_id, force=False)
            
            # Update config if provided
            if new_config:
                instance = await self._get_instance_with_auth(db, instance_id, user_id)
                current_config = json.loads(instance.config or "{}")
                updated_config = {**current_config, **new_config}
                
                # Validate new config
                validation_result = await self._validate_instance_config(updated_config)
                if not validation_result["is_valid"]:
                    raise ValueError(f"Invalid configuration: {validation_result['errors']}")
                
                instance.config = json.dumps(updated_config)
                db.commit()
            
            # Start the instance
            start_result = await self.start_instance(db, instance_id, user_id)
            
            return {
                "success": True,
                "instance_id": instance_id,
                "restart_completed": True,
                "stop_result": stop_result,
                "start_result": start_result,
                "config_updated": new_config is not None,
                "downtime_seconds": (
                    datetime.fromisoformat(start_result["started_at"]) - 
                    datetime.fromisoformat(stop_result["stopped_at"])
                ).total_seconds()
            }
            
        except Exception as e:
            logger.error(f"Error restarting instance {instance_id}: {str(e)}")
            raise
    
    async def get_instance_status(
        self, 
        db: Session, 
        instance_id: int, 
        user_id: int,
        include_metrics: bool = True
    ) -> Dict[str, Any]:
        """
        Get comprehensive status information for an instance
        
        Args:
            db: Database session
            instance_id: Instance ID to check
            user_id: User ID for authorization
            include_metrics: Whether to include performance metrics
            
        Returns:
            Comprehensive instance status and metrics
        """
        try:
            instance = await self._get_instance_with_auth(db, instance_id, user_id)
            
            # Basic status
            status_info = {
                "instance_id": instance_id,
                "name": instance.name,
                "status": instance.status.value,
                "created_at": instance.created_at.isoformat(),
                "started_at": instance.started_at.isoformat() if instance.started_at else None,
                "paused_at": instance.paused_at.isoformat() if instance.paused_at else None,
                "stopped_at": instance.stopped_at.isoformat() if instance.stopped_at else None,
                "last_health_check": instance.last_health_check.isoformat() if instance.last_health_check else None
            }
            
            # Calculate uptime/downtime
            if instance.status == AgentStatus.ACTIVE and instance.started_at:
                status_info["uptime_seconds"] = (
                    datetime.now(timezone.utc).replace(tzinfo=None) - instance.started_at
                ).total_seconds()
            
            # Health status
            health_check = await self._perform_health_check(db, instance)
            status_info["health"] = health_check
            
            # Performance metrics if requested
            if include_metrics:
                metrics = await self._get_instance_metrics(db, instance_id)
                status_info["metrics"] = metrics
                status_info["performance_rating"] = self._calculate_performance_rating(metrics)
            
            # Current activity
            status_info["current_activity"] = await self._get_current_activity(db, instance_id)
            
            # Resource usage
            if instance_id in self.active_instances:
                status_info["resource_usage"] = await self._get_resource_usage(instance_id)
            
            return status_info
            
        except Exception as e:
            logger.error(f"Error getting status for instance {instance_id}: {str(e)}")
            raise
    
    async def scale_instances(
        self, 
        db: Session, 
        agent_id: int, 
        user_id: int,
        target_count: int,
        scaling_strategy: str = "balanced"
    ) -> Dict[str, Any]:
        """
        Scale agent instances up or down based on demand
        
        Args:
            db: Database session
            agent_id: Agent ID to scale instances for
            user_id: User ID for authorization
            target_count: Target number of instances
            scaling_strategy: Strategy for scaling (balanced, performance, cost)
            
        Returns:
            Scaling results and new instance configuration
        """
        try:
            # Get current instances
            current_instances = db.query(AgentInstance).filter(
                and_(
                    AgentInstance.agent_id == agent_id,
                    AgentInstance.status != AgentStatus.STOPPED
                )
            ).all()
            
            current_count = len(current_instances)
            
            if target_count == current_count:
                return {
                    "success": True,
                    "message": f"Already at target count ({current_count} instances)",
                    "current_count": current_count,
                    "target_count": target_count
                }
            
            results = []
            
            if target_count > current_count:
                # Scale up - create new instances
                instances_to_create = target_count - current_count
                for i in range(instances_to_create):
                    try:
                        result = await self.create_instance(
                            db=db,
                            agent_id=agent_id,
                            user_id=user_id,
                            config=self._get_scaling_config(scaling_strategy),
                            auto_start=True
                        )
                        results.append({"action": "created", "instance_id": result["instance_id"]})
                    except Exception as e:
                        results.append({"action": "failed_create", "error": str(e)})
            
            else:
                # Scale down - stop excess instances
                instances_to_stop = current_count - target_count
                
                # Choose instances to stop based on strategy
                instances_to_stop_list = self._select_instances_for_scale_down(
                    current_instances, instances_to_stop, scaling_strategy
                )
                
                for instance in instances_to_stop_list:
                    try:
                        result = await self.stop_instance(db, instance.id, user_id, force=False)
                        results.append({"action": "stopped", "instance_id": instance.id})
                    except Exception as e:
                        results.append({"action": "failed_stop", "instance_id": instance.id, "error": str(e)})
            
            # Get final count
            final_instances = db.query(AgentInstance).filter(
                and_(
                    AgentInstance.agent_id == agent_id,
                    AgentInstance.status != AgentStatus.STOPPED
                )
            ).count()
            
            return {
                "success": True,
                "agent_id": agent_id,
                "scaling_action": "scale_up" if target_count > current_count else "scale_down",
                "current_count": current_count,
                "target_count": target_count,
                "final_count": final_instances,
                "results": results,
                "scaling_strategy": scaling_strategy,
                "estimated_cost_change": await self._calculate_cost_impact(
                    current_count, final_instances, agent_id
                )
            }
            
        except Exception as e:
            logger.error(f"Error scaling instances for agent {agent_id}: {str(e)}")
            raise
    
    async def get_performance_insights(
        self, 
        db: Session, 
        instance_id: int, 
        user_id: int,
        time_range: str = "24h"
    ) -> Dict[str, Any]:
        """
        Get performance insights and recommendations for an instance
        
        Args:
            db: Database session
            instance_id: Instance ID to analyze
            user_id: User ID for authorization
            time_range: Time range for analysis (1h, 24h, 7d, 30d)
            
        Returns:
            Performance insights and optimization recommendations
        """
        try:
            instance = await self._get_instance_with_auth(db, instance_id, user_id)
            
            # Get metrics for time range
            metrics = await self._get_time_range_metrics(db, instance_id, time_range)
            
            # Analyze performance
            performance_analysis = {
                "overall_score": self._calculate_performance_score(metrics),
                "success_rate": metrics.get("success_rate", 0),
                "response_time": metrics.get("avg_response_time", 0),
                "cost_efficiency": metrics.get("cost_per_success", 0),
                "uptime_percentage": metrics.get("uptime_percentage", 0)
            }
            
            # Generate recommendations
            recommendations = await self._generate_performance_recommendations(
                instance, metrics, performance_analysis
            )
            
            # Trend analysis
            trends = await self._analyze_performance_trends(db, instance_id, time_range)
            
            # Comparative analysis
            comparative = await self._get_comparative_performance(db, instance, metrics)
            
            return {
                "instance_id": instance_id,
                "time_range": time_range,
                "performance_analysis": performance_analysis,
                "recommendations": recommendations,
                "trends": trends,
                "comparative_analysis": comparative,
                "optimization_potential": self._calculate_optimization_potential(metrics),
                "next_review_date": (datetime.now() + timedelta(days=7)).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting performance insights for instance {instance_id}: {str(e)}")
            raise
    
    # Helper methods
    
    async def _get_instance_with_auth(self, db: Session, instance_id: int, user_id: int) -> AgentInstance:
        """Get instance with user authorization check"""
        instance = db.query(AgentInstance).join(Agent).filter(
            and_(
                AgentInstance.id == instance_id,
                Agent.user_id == user_id
            )
        ).first()
        
        if not instance:
            raise ValueError(f"Instance {instance_id} not found or access denied")
        
        return instance
    
    async def _validate_instance_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate instance configuration"""
        errors = []
        warnings = []
        
        # Check required fields
        required_fields = ["max_conversations_per_hour", "response_timeout"]
        for field in required_fields:
            if field not in config:
                errors.append(f"Missing required field: {field}")
        
        # Validate resource limits
        max_conversations = config.get("max_conversations_per_hour", 0)
        if max_conversations > 1000:
            warnings.append("High conversation limit may impact performance")
        elif max_conversations < 1:
            errors.append("Conversations per hour must be at least 1")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    async def _initialize_instance_metrics(self, db: Session, instance_id: int):
        """Initialize metrics tracking for new instance"""
        try:
            initial_metrics = AgentMetrics(
                instance_id=instance_id,
                conversations_handled=0,
                successful_outcomes=0,
                total_cost=0.0,
                avg_response_time=0.0,
                last_activity=datetime.now(timezone.utc).replace(tzinfo=None),
                created_at=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            
            db.add(initial_metrics)
            db.commit()
            
        except Exception as e:
            logger.warning(f"Error initializing metrics for instance {instance_id}: {str(e)}")
    
    async def _perform_health_check(self, db: Session, instance: AgentInstance) -> Dict[str, Any]:
        """Perform comprehensive health check on instance"""
        issues = []
        
        # Check AI provider connectivity
        try:
            await self.ai_manager.health_check()
        except Exception as e:
            issues.append(f"AI provider connectivity: {str(e)}")
        
        # Check database connectivity
        try:
            db.execute("SELECT 1")
        except Exception as e:
            issues.append(f"Database connectivity: {str(e)}")
        
        # Check instance configuration
        try:
            config = json.loads(instance.config or "{}")
            validation = await self._validate_instance_config(config)
            if not validation["is_valid"]:
                issues.extend(validation["errors"])
        except Exception as e:
            issues.append(f"Configuration validation: {str(e)}")
        
        # Update last health check
        instance.last_health_check = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        
        return {
            "healthy": len(issues) == 0,
            "issues": issues,
            "last_check": instance.last_health_check.isoformat(),
            "next_check": (instance.last_health_check + timedelta(seconds=self.health_check_interval)).isoformat()
        }
    
    async def _initialize_ai_connection(self, instance: AgentInstance) -> Dict[str, Any]:
        """Initialize AI provider connection for instance"""
        try:
            config = json.loads(instance.config or "{}")
            provider = config.get("ai_provider", "anthropic")
            
            # Test connection
            test_response = await self.ai_manager.generate_response(
                prompt="Test connection",
                context={},
                provider=provider,
                max_tokens=10
            )
            
            return {
                "success": True,
                "provider": provider,
                "connection": f"connection_{instance.id}",
                "test_response": test_response[:50] + "..." if len(test_response) > 50 else test_response
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "provider": None,
                "connection": None
            }
    
    def _calculate_uptime(self, instance: AgentInstance) -> Optional[float]:
        """Calculate instance uptime in seconds"""
        if instance.status == AgentStatus.ACTIVE and instance.started_at:
            return (datetime.now(timezone.utc).replace(tzinfo=None) - instance.started_at).total_seconds()
        return None
    
    async def _get_ongoing_conversations(self, db: Session, instance_id: int) -> List[AgentConversation]:
        """Get ongoing conversations for instance"""
        return db.query(AgentConversation).filter(
            and_(
                AgentConversation.instance_id == instance_id,
                AgentConversation.status == ConversationStatus.ACTIVE
            )
        ).all()
    
    async def _complete_conversations_gracefully(self, db: Session, conversations: List[AgentConversation]):
        """Complete ongoing conversations gracefully"""
        for conversation in conversations:
            try:
                conversation.status = ConversationStatus.COMPLETED
                conversation.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
                # Add graceful completion message if needed
            except Exception as e:
                logger.warning(f"Error completing conversation {conversation.id}: {str(e)}")
        
        db.commit()
    
    async def _terminate_conversations(self, db: Session, conversations: List[AgentConversation]):
        """Terminate conversations forcefully"""
        for conversation in conversations:
            conversation.status = ConversationStatus.ERROR
            conversation.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
            conversation.error_message = "Instance force stopped"
        
        db.commit()
    
    async def _record_instance_event(
        self, 
        db: Session, 
        instance_id: int, 
        event_type: str, 
        event_data: Dict[str, Any]
    ):
        """Record instance lifecycle event"""
        try:
            # In a real implementation, this would store events in a dedicated table
            logger.info(f"Instance {instance_id} event: {event_type} - {event_data}")
        except Exception as e:
            logger.warning(f"Error recording event for instance {instance_id}: {str(e)}")
    
    def _get_auto_scaling_config(self, instance: AgentInstance) -> Dict[str, Any]:
        """Get auto-scaling configuration for instance"""
        config = json.loads(instance.config or "{}")
        return {
            "enabled": config.get("auto_scaling_enabled", False),
            "min_instances": config.get("min_instances", 1),
            "max_instances": config.get("max_instances", 5),
            "scale_up_threshold": config.get("scale_up_threshold", 0.8),
            "scale_down_threshold": config.get("scale_down_threshold", 0.3)
        }
    
    def _get_next_steps(self, status: AgentStatus, auto_started: bool) -> List[str]:
        """Get recommended next steps based on instance status"""
        if status == AgentStatus.STOPPED and not auto_started:
            return [
                "Start the instance to begin processing conversations",
                "Configure triggers and scheduling",
                "Test with sample conversations"
            ]
        elif status == AgentStatus.ACTIVE:
            return [
                "Monitor performance metrics",
                "Review conversation logs",
                "Adjust configuration as needed"
            ]
        else:
            return ["Check instance status and health"]
    
    async def _estimate_resource_requirements(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Estimate resource requirements for instance configuration"""
        max_conversations = config.get("max_conversations_per_hour", 60)
        
        return {
            "cpu_estimate": f"{max_conversations / 20:.1f} vCPU",
            "memory_estimate": f"{max_conversations * 10}MB RAM",
            "storage_estimate": f"{max_conversations * 50}MB/month",
            "network_estimate": f"{max_conversations * 5}MB/hour",
            "cost_estimate": f"${max_conversations * 0.01:.2f}/hour"
        }
    
    async def _monitor_instance(self, db: Session, instance_id: int):
        """Background monitoring task for instance"""
        try:
            while instance_id in self.active_instances:
                # Perform health check
                instance = db.query(AgentInstance).get(instance_id)
                if instance and instance.status == AgentStatus.ACTIVE:
                    await self._perform_health_check(db, instance)
                
                # Wait for next check
                await asyncio.sleep(self.health_check_interval)
                
        except Exception as e:
            logger.error(f"Error in instance monitoring for {instance_id}: {str(e)}")
    
    # Additional helper methods would continue here for:
    # - _get_instance_metrics
    # - _calculate_performance_rating  
    # - _get_current_activity
    # - _get_resource_usage
    # - _get_scaling_config
    # - _select_instances_for_scale_down
    # - _calculate_cost_impact
    # - _get_time_range_metrics
    # - _calculate_performance_score
    # - _generate_performance_recommendations
    # - _analyze_performance_trends
    # - _get_comparative_performance
    # - _calculate_optimization_potential
    # - _get_final_metrics
    # - _generate_stop_summary
    
    # These would implement the specific business logic for each operation
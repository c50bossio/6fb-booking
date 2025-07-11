"""
Agent Orchestration Service - Core engine for managing AI agent lifecycle
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from celery import current_app as celery_app

from models import (
    Agent, AgentInstance, AgentConversation, AgentMetrics, AgentSubscription,
    AgentType, AgentStatus, ConversationStatus, Client, Appointment, User
)
from services.notification_service import notification_service
# BookingService not needed - using direct functions from booking_service module instead
from services.payment_service import PaymentService
from config import settings
from utils.timezone import convert_to_user_timezone, get_business_timezone

logger = logging.getLogger(__name__)

class AgentOrchestrationService:
    """Manages the lifecycle and execution of AI agents"""
    
    def __init__(self):
        self.payment_service = PaymentService()
        self.active_agents = {}  # Cache of active agent instances
        
    async def create_agent_instance(
        self, 
        db: Session, 
        user_id: int, 
        agent_id: int, 
        config: Dict[str, Any]
    ) -> AgentInstance:
        """Create a new agent instance for a user"""
        # Validate subscription
        subscription = db.query(AgentSubscription).filter_by(
            user_id=user_id, status="active"
        ).first()
        
        if not subscription:
            raise ValueError("Active agent subscription required")
        
        # Check agent limits
        active_count = db.query(AgentInstance).filter_by(
            user_id=user_id, status=AgentStatus.ACTIVE
        ).count()
        
        if active_count >= subscription.agent_limit:
            raise ValueError(f"Agent limit reached ({subscription.agent_limit})")
        
        # Get agent template
        agent = db.query(Agent).filter_by(id=agent_id, is_active=True).first()
        if not agent:
            raise ValueError("Agent template not found")
        
        # Create instance
        instance = AgentInstance(
            agent_id=agent_id,
            user_id=user_id,
            name=config.get("name", f"{agent.name} - {datetime.utcnow().strftime('%Y%m%d')}"),
            config={**agent.default_config, **config},
            status=AgentStatus.DRAFT
        )
        
        db.add(instance)
        db.commit()
        db.refresh(instance)
        
        logger.info(f"Created agent instance {instance.id} for user {user_id}")
        return instance
    
    async def activate_agent(self, db: Session, instance_id: int) -> AgentInstance:
        """Activate an agent instance"""
        instance = db.query(AgentInstance).filter_by(id=instance_id).first()
        if not instance:
            raise ValueError("Agent instance not found")
        
        if instance.status == AgentStatus.ACTIVE:
            return instance
        
        # Validate configuration
        if not self._validate_agent_config(instance):
            raise ValueError("Invalid agent configuration")
        
        # Update status
        instance.status = AgentStatus.ACTIVE
        instance.activated_at = datetime.utcnow()
        instance.next_run_at = self._calculate_next_run(instance)
        
        db.commit()
        
        # Schedule first run
        self._schedule_agent_run(instance.id, instance.next_run_at)
        
        logger.info(f"Activated agent instance {instance_id}")
        return instance
    
    async def pause_agent(self, db: Session, instance_id: int) -> AgentInstance:
        """Pause an active agent"""
        instance = db.query(AgentInstance).filter_by(
            id=instance_id, 
            status=AgentStatus.ACTIVE
        ).first()
        
        if not instance:
            raise ValueError("Active agent instance not found")
        
        instance.status = AgentStatus.PAUSED
        instance.next_run_at = None
        db.commit()
        
        # Cancel scheduled tasks
        self._cancel_scheduled_tasks(instance_id)
        
        logger.info(f"Paused agent instance {instance_id}")
        return instance
    
    async def execute_agent_run(self, db: Session, instance_id: int) -> Dict[str, Any]:
        """Execute a scheduled agent run"""
        instance = db.query(AgentInstance).filter_by(
            id=instance_id,
            status=AgentStatus.ACTIVE
        ).first()
        
        if not instance:
            logger.warning(f"Agent instance {instance_id} not active, skipping run")
            return {"status": "skipped", "reason": "not_active"}
        
        logger.info(f"Starting agent run for instance {instance_id}")
        
        try:
            # Update last run time
            instance.last_run_at = datetime.utcnow()
            
            # Get eligible clients based on agent type
            eligible_clients = await self._get_eligible_clients(db, instance)
            
            # Create conversations for eligible clients
            conversations_created = 0
            for client in eligible_clients[:instance.config.get("max_conversations_per_run", 50)]:
                try:
                    conversation = await self._create_conversation(db, instance, client)
                    if conversation:
                        conversations_created += 1
                except Exception as e:
                    logger.error(f"Error creating conversation for client {client.id}: {e}")
            
            # Update metrics
            instance.total_conversations += conversations_created
            
            # Schedule next run
            instance.next_run_at = self._calculate_next_run(instance)
            self._schedule_agent_run(instance.id, instance.next_run_at)
            
            db.commit()
            
            logger.info(f"Agent run completed: {conversations_created} conversations created")
            return {
                "status": "success",
                "conversations_created": conversations_created,
                "next_run_at": instance.next_run_at
            }
            
        except Exception as e:
            logger.error(f"Error in agent run {instance_id}: {e}")
            instance.error_count += 1
            instance.last_error = str(e)
            
            if instance.error_count >= 5:
                instance.status = AgentStatus.ERROR
                logger.error(f"Agent instance {instance_id} disabled due to errors")
            
            db.commit()
            return {"status": "error", "error": str(e)}
    
    async def _get_eligible_clients(
        self, 
        db: Session, 
        instance: AgentInstance
    ) -> List[Client]:
        """Get clients eligible for agent contact based on agent type"""
        agent = instance.agent
        
        # Base query - exclude opted out clients
        query = db.query(Client).filter(
            Client.is_active == True,
            Client.agent_opt_out == False
        )
        
        # Add user/location filter
        if instance.location_id:
            query = query.join(Appointment).filter(
                Appointment.location_id == instance.location_id
            )
        else:
            query = query.join(Appointment).filter(
                Appointment.barber_id == instance.user_id
            )
        
        # Apply agent-specific filters
        if agent.agent_type == AgentType.REBOOKING:
            # Clients due for rebooking
            interval_days = instance.config.get("rebooking_interval_days", 28)
            cutoff_date = datetime.utcnow() - timedelta(days=interval_days)
            
            query = query.filter(
                Appointment.status == "completed",
                Appointment.start_time < cutoff_date
            ).group_by(Client.id).having(
                func.max(Appointment.start_time) < cutoff_date
            )
            
        elif agent.agent_type == AgentType.BIRTHDAY_WISHES:
            # Clients with birthdays in the next 7 days
            today = datetime.utcnow().date()
            query = query.filter(
                func.extract('month', Client.date_of_birth) == today.month,
                func.extract('day', Client.date_of_birth).between(
                    today.day, today.day + 7
                )
            )
            
        elif agent.agent_type == AgentType.NO_SHOW_FEE:
            # Clients with unpaid no-show fees
            recent_cutoff = datetime.utcnow() - timedelta(days=7)
            query = query.join(Appointment).filter(
                Appointment.status == "no_show",
                Appointment.start_time > recent_cutoff,
                ~Appointment.payments.any()  # No payment recorded
            )
            
        elif agent.agent_type == AgentType.RETENTION:
            # At-risk clients (no visit in 60+ days)
            cutoff_date = datetime.utcnow() - timedelta(days=60)
            query = query.filter(
                Appointment.status == "completed"
            ).group_by(Client.id).having(
                func.max(Appointment.start_time) < cutoff_date
            )
        
        # Exclude clients recently contacted by this agent
        min_interval = timedelta(hours=instance.agent.min_interval_hours)
        recent_cutoff = datetime.utcnow() - min_interval
        
        recent_conversations = db.query(AgentConversation.client_id).filter(
            AgentConversation.agent_instance_id == instance.id,
            AgentConversation.created_at > recent_cutoff
        ).subquery()
        
        query = query.filter(~Client.id.in_(recent_conversations))
        
        return query.limit(100).all()
    
    async def _create_conversation(
        self, 
        db: Session, 
        instance: AgentInstance, 
        client: Client
    ) -> Optional[AgentConversation]:
        """Create a new agent conversation with a client"""
        # Determine communication channel
        channel = self._determine_channel(client, instance)
        if not channel:
            logger.warning(f"No valid channel for client {client.id}")
            return None
        
        # Create conversation record
        conversation = AgentConversation(
            agent_instance_id=instance.id,
            client_id=client.id,
            channel=channel,
            status=ConversationStatus.PENDING,
            scheduled_at=datetime.utcnow() + timedelta(minutes=5),  # Small delay
            expires_at=datetime.utcnow() + timedelta(days=7),
            context_data=self._build_context_data(db, instance, client)
        )
        
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        # Schedule conversation execution
        from tasks.agent_tasks import execute_conversation
        execute_conversation.apply_async(
            args=[conversation.id],
            eta=conversation.scheduled_at
        )
        
        logger.info(f"Created conversation {conversation.id} for client {client.id}")
        return conversation
    
    def _determine_channel(self, client: Client, instance: AgentInstance) -> Optional[str]:
        """Determine best communication channel for client"""
        supported = instance.config.get("supported_channels", ["sms", "email"])
        
        # Check client preferences
        if hasattr(client, "notification_preferences"):
            if client.notification_preferences.sms_enabled and "sms" in supported and client.phone:
                return "sms"
            if client.notification_preferences.email_enabled and "email" in supported and client.email:
                return "email"
        
        # Default priority: SMS > Email
        if "sms" in supported and client.phone:
            return "sms"
        if "email" in supported and client.email:
            return "email"
            
        return None
    
    def _build_context_data(
        self, 
        db: Session, 
        instance: AgentInstance, 
        client: Client
    ) -> Dict[str, Any]:
        """Build context data for AI conversation"""
        context = {
            "client_name": client.name,
            "client_id": client.id,
            "barbershop_name": instance.user.name,
            "agent_type": instance.agent.agent_type.value
        }
        
        # Add last appointment info
        last_appointment = db.query(Appointment).filter_by(
            client_id=client.id,
            status="completed"
        ).order_by(Appointment.start_time.desc()).first()
        
        if last_appointment:
            context["last_visit"] = last_appointment.start_time.isoformat()
            context["last_service"] = last_appointment.service_name
            context["last_barber"] = last_appointment.barber.name if last_appointment.barber else None
            context["days_since_visit"] = (datetime.utcnow() - last_appointment.start_time).days
        
        # Add client statistics
        total_appointments = db.query(Appointment).filter_by(
            client_id=client.id,
            status="completed"
        ).count()
        
        context["total_visits"] = total_appointments
        context["client_since"] = client.created_at.isoformat() if hasattr(client, 'created_at') else None
        
        # Agent-specific context
        if instance.agent.agent_type == AgentType.BIRTHDAY_WISHES:
            context["birthday"] = client.date_of_birth.isoformat() if client.date_of_birth else None
            
        elif instance.agent.agent_type == AgentType.NO_SHOW_FEE:
            no_show = db.query(Appointment).filter_by(
                client_id=client.id,
                status="no_show"
            ).order_by(Appointment.start_time.desc()).first()
            
            if no_show:
                context["no_show_date"] = no_show.start_time.isoformat()
                context["no_show_service"] = no_show.service_name
                context["no_show_amount"] = no_show.price
        
        return context
    
    def _validate_agent_config(self, instance: AgentInstance) -> bool:
        """Validate agent instance configuration"""
        required_fields = instance.agent.required_permissions or []
        config = instance.config or {}
        
        for field in required_fields:
            if field not in config:
                logger.error(f"Missing required config field: {field}")
                return False
        
        return True
    
    def _calculate_next_run(self, instance: AgentInstance) -> datetime:
        """Calculate next run time based on schedule config"""
        schedule = instance.schedule_config
        
        if not schedule.get("enabled", True):
            return None
        
        # Get timezone
        tz = schedule.get("timezone", "UTC")
        
        # Simple daily run for now (can be extended)
        next_run = datetime.utcnow() + timedelta(days=1)
        
        # Set to configured hour
        active_hours = schedule.get("active_hours", {})
        start_hour = active_hours.get("start", "09:00")
        hour, minute = map(int, start_hour.split(":"))
        
        next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        return next_run
    
    def _schedule_agent_run(self, instance_id: int, run_at: datetime):
        """Schedule an agent run via Celery"""
        from tasks.agent_tasks import execute_agent_run
        execute_agent_run.apply_async(args=[instance_id], eta=run_at)
    
    def _cancel_scheduled_tasks(self, instance_id: int):
        """Cancel scheduled tasks for an agent instance"""
        # Implementation depends on Celery backend
        # For now, tasks will check agent status before executing
        pass
    
    async def get_agent_analytics(
        self, 
        db: Session, 
        user_id: int, 
        date_range: Dict[str, datetime]
    ) -> Dict[str, Any]:
        """Get analytics for user's agents"""
        # Get all user's agent instances
        instances = db.query(AgentInstance).filter_by(user_id=user_id).all()
        
        if not instances:
            return {
                "total_revenue": 0,
                "total_conversations": 0,
                "success_rate": 0,
                "avg_response_time": 0,
                "roi": 0,
                "top_performing_agents": [],
                "conversation_trends": []
            }
        
        instance_ids = [i.id for i in instances]
        
        # Get metrics for date range
        metrics = db.query(
            func.sum(AgentMetrics.revenue_generated).label("total_revenue"),
            func.sum(AgentMetrics.conversations_completed).label("total_completed"),
            func.sum(AgentMetrics.conversations_started).label("total_started"),
            func.avg(AgentMetrics.conversion_rate).label("avg_conversion"),
            func.avg(AgentMetrics.roi).label("avg_roi")
        ).filter(
            AgentMetrics.agent_instance_id.in_(instance_ids),
            AgentMetrics.date.between(date_range["start"], date_range["end"])
        ).first()
        
        # Calculate success rate
        success_rate = 0
        if metrics.total_started and metrics.total_started > 0:
            success_rate = (metrics.total_completed or 0) / metrics.total_started * 100
        
        # Get top performing agents
        top_agents = db.query(
            AgentInstance.name,
            AgentInstance.agent_id,
            func.sum(AgentMetrics.revenue_generated).label("revenue"),
            func.avg(AgentMetrics.conversion_rate).label("conversion_rate")
        ).join(AgentMetrics).filter(
            AgentInstance.id.in_(instance_ids),
            AgentMetrics.date.between(date_range["start"], date_range["end"])
        ).group_by(AgentInstance.id).order_by(
            func.sum(AgentMetrics.revenue_generated).desc()
        ).limit(5).all()
        
        return {
            "total_revenue": float(metrics.total_revenue or 0),
            "total_conversations": int(metrics.total_started or 0),
            "success_rate": round(success_rate, 2),
            "avg_response_time": 0,  # TODO: Calculate from conversations
            "roi": float(metrics.avg_roi or 0),
            "top_performing_agents": [
                {
                    "name": agent.name,
                    "revenue": float(agent.revenue),
                    "conversion_rate": float(agent.conversion_rate or 0)
                }
                for agent in top_agents
            ],
            "conversation_trends": []  # TODO: Add daily trends
        }

# Global instance
agent_orchestration_service = AgentOrchestrationService()
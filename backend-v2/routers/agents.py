"""
AI Agent API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import urllib.parse

from database import get_db
from routers.auth import get_current_user
from utils.auth import require_admin_role
from schemas_new.agent import (
    AgentCreate, AgentResponse, AgentInstanceCreate, AgentInstanceUpdate,
    AgentInstanceResponse, ConversationResponse, AgentAnalytics,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    TemplateCreate, TemplateResponse, AgentMessageCreate, AgentMessageResponse,
    ConversationCreate, ConversationUpdate
)
from models import (
    User, Agent, AgentInstance, AgentConversation, AgentSubscription,
    AgentType, AgentStatus, ConversationStatus, AgentMessage, AgentMetrics,
    AgentTemplate
)
from services.agent_orchestration_service import agent_orchestration_service
from services.agent_templates import agent_templates
from services.ai_providers import AIProviderManager
from tasks.agent_tasks import execute_agent_run, process_agent_response

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/agents",
    tags=["agents"]
)

# Agent Template Management

@router.get("/templates", response_model=List[dict])
def get_agent_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available agent templates"""
    templates = agent_templates.get_all_templates()
    
    # Convert to list format with agent type
    template_list = []
    for agent_type, template_data in templates.items():
        template_list.append({
            "agent_type": agent_type,
            **template_data
        })
    
    return template_list


@router.get("/templates/{agent_type}", response_model=dict)
def get_agent_template(
    agent_type: AgentType,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific agent template"""
    templates = agent_templates.get_all_templates()
    template = templates.get(agent_type.value)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "agent_type": agent_type.value,
        **template
    }


# Agent Management (Admin)

@router.post("/", response_model=AgentResponse)
def create_agent(
    agent: AgentCreate,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Create a new agent template (admin only)"""
    # Check if agent type already exists
    existing = db.query(Agent).filter_by(agent_type=agent.agent_type).first()
    if existing:
        raise HTTPException(status_code=400, detail="Agent type already exists")
    
    # Create agent
    db_agent = Agent(**agent.model_dump())
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    
    return db_agent


@router.get("/", response_model=List[AgentResponse])
def list_agents(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    agent_type: Optional[AgentType] = Query(None, description="Filter by agent type"),
    limit: int = Query(50, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all available agents with filtering"""
    query = db.query(Agent)
    
    if is_active is not None:
        query = query.filter(Agent.is_active == is_active)
    
    if agent_type is not None:
        query = query.filter(Agent.agent_type == agent_type)
    
    # Order by creation date descending
    query = query.order_by(desc(Agent.created_at))
    
    return query.offset(offset).limit(limit).all()


# Agent Instance Management

@router.post("/instances", response_model=AgentInstanceResponse)
async def create_agent_instance(
    instance: AgentInstanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new agent instance for the current user"""
    try:
        # Verify user has required role
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Create instance
        db_instance = await agent_orchestration_service.create_agent_instance(
            db=db,
            user_id=current_user.id,
            agent_id=instance.agent_id,
            config=instance.config
        )
        
        # Load relationships for response
        db.refresh(db_instance)
        return db_instance
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating agent instance: {e}")
        raise HTTPException(status_code=500, detail="Failed to create agent instance")


@router.get("/instances", response_model=List[AgentInstanceResponse])
def list_agent_instances(
    status: Optional[AgentStatus] = Query(None, description="Filter by instance status"),
    agent_id: Optional[int] = Query(None, description="Filter by agent template ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all agent instances for the current user with filtering"""
    query = db.query(AgentInstance).filter_by(user_id=current_user.id)
    
    if status:
        query = query.filter(AgentInstance.status == status)
    
    if agent_id:
        query = query.filter(AgentInstance.agent_id == agent_id)
    
    # Order by creation date descending
    query = query.order_by(desc(AgentInstance.created_at))
    
    instances = query.offset(offset).limit(limit).all()
    return instances


@router.get("/instances/{instance_id}", response_model=AgentInstanceResponse)
def get_agent_instance(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get agent instance details"""
    instance = db.query(AgentInstance).filter_by(
        id=instance_id,
        user_id=current_user.id
    ).first()
    
    if not instance:
        raise HTTPException(status_code=404, detail="Agent instance not found")
    
    return instance


@router.put("/instances/{instance_id}", response_model=AgentInstanceResponse)
def update_agent_instance(
    instance_id: int,
    update: AgentInstanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update agent instance configuration"""
    instance = db.query(AgentInstance).filter_by(
        id=instance_id,
        user_id=current_user.id
    ).first()
    
    if not instance:
        raise HTTPException(status_code=404, detail="Agent instance not found")
    
    # Update fields
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(instance, field, value)
    
    instance.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(instance)
    
    return instance


@router.post("/instances/{instance_id}/activate", response_model=AgentInstanceResponse)
async def activate_agent_instance(
    instance_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Activate an agent instance"""
    try:
        instance = await agent_orchestration_service.activate_agent(db, instance_id)
        
        # Schedule first run
        background_tasks.add_task(execute_agent_run.delay, instance_id)
        
        return instance
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error activating agent: {e}")
        raise HTTPException(status_code=500, detail="Failed to activate agent")


@router.post("/instances/{instance_id}/pause", response_model=AgentInstanceResponse)
async def pause_agent_instance(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause an active agent instance"""
    try:
        instance = await agent_orchestration_service.pause_agent(db, instance_id)
        return instance
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error pausing agent: {e}")
        raise HTTPException(status_code=500, detail="Failed to pause agent")


@router.delete("/instances/{instance_id}")
def delete_agent_instance(
    instance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an agent instance"""
    instance = db.query(AgentInstance).filter_by(
        id=instance_id,
        user_id=current_user.id
    ).first()
    
    if not instance:
        raise HTTPException(status_code=404, detail="Agent instance not found")
    
    # Soft delete - just mark as inactive
    instance.status = AgentStatus.INACTIVE
    instance.deactivated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Agent instance deleted"}


# Conversation Management

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    instance_id: Optional[int] = Query(None, description="Filter by agent instance ID"),
    status: Optional[ConversationStatus] = Query(None, description="Filter by conversation status"),
    participant_type: Optional[str] = Query(None, description="Filter by participant type"),
    start_date: Optional[str] = Query(None, description="Filter conversations after this date (ISO format)"),
    end_date: Optional[str] = Query(None, description="Filter conversations before this date (ISO format)"),
    limit: int = Query(50, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List agent conversations for the current user with filtering"""
    # Get user's agent instances
    user_instances = db.query(AgentInstance.id).filter_by(
        user_id=current_user.id
    ).subquery()
    
    query = db.query(AgentConversation).filter(
        AgentConversation.agent_instance_id.in_(user_instances)
    )
    
    if instance_id:
        query = query.filter(AgentConversation.agent_instance_id == instance_id)
    
    if status:
        query = query.filter(AgentConversation.status == status)
    
    if participant_type:
        # This would need to be implemented based on your conversation model
        pass
    
    # Date filtering
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(AgentConversation.created_at >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use ISO format."
            )
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(AgentConversation.created_at <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use ISO format."
            )
    
    # Order by most recent first
    query = query.order_by(desc(AgentConversation.created_at))
    
    conversations = query.offset(offset).limit(limit).all()
    return conversations


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conversation details"""
    # Verify user owns this conversation
    conversation = db.query(AgentConversation).join(
        AgentInstance
    ).filter(
        AgentConversation.conversation_id == conversation_id,
        AgentInstance.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation


@router.post("/conversations/{conversation_id}/message", response_model=AgentMessageResponse)
async def send_conversation_message(
    conversation_id: str,
    message: AgentMessageCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a manual message in a conversation"""
    # Verify ownership
    conversation = db.query(AgentConversation).join(
        AgentInstance
    ).filter(
        AgentConversation.conversation_id == conversation_id,
        AgentInstance.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Conversation not found"
        )
    
    # Create message record
    db_message = AgentMessage(
        conversation_id=conversation_id,
        sender_type=message.sender_type,
        sender_id=message.sender_id or current_user.id,
        content=message.content,
        message_type=message.message_type,
        message_metadata=message.message_metadata,
        created_at=datetime.utcnow()
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Process response asynchronously
    background_tasks.add_task(
        process_agent_response.delay,
        conversation_id,
        message.content,
        conversation.channel
    )
    
    return db_message


# Analytics

@router.get("/analytics")
async def get_agent_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive analytics for user's agents with business intelligence"""
    try:
        # Parse datetime parameters with flexible handling
        def parse_datetime(date_str: str) -> datetime:
            """Parse datetime string with flexible format handling"""
            if not date_str:
                return None
            
            # URL decode the string first
            import urllib.parse
            decoded_date = urllib.parse.unquote(date_str)
            
            # Remove timezone suffix if present and normalize
            clean_date = decoded_date.replace('Z', '+00:00')
            
            # Try different datetime formats
            formats = [
                "%Y-%m-%dT%H:%M:%S.%f%z",  # ISO with microseconds and timezone
                "%Y-%m-%dT%H:%M:%S%z",     # ISO with timezone
                "%Y-%m-%dT%H:%M:%S.%f",    # ISO with microseconds
                "%Y-%m-%dT%H:%M:%S",       # ISO basic
                "%Y-%m-%d",                # Date only
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(clean_date, fmt)
                except ValueError:
                    continue
            
            # If all parsing fails, raise an error
            raise ValueError(f"Unable to parse datetime: {date_str} (decoded: {decoded_date})")
        
        # Parse dates with fallback defaults
        try:
            parsed_end_date = parse_datetime(end_date) if end_date else datetime.utcnow()
            parsed_start_date = parse_datetime(start_date) if start_date else parsed_end_date - timedelta(days=30)
        except ValueError as parse_error:
            logger.warning(f"Date parsing error: {parse_error}")
            # Use defaults if parsing fails
            parsed_end_date = datetime.utcnow()
            parsed_start_date = parsed_end_date - timedelta(days=30)
        
        # Ensure we have valid datetime objects
        end_date = parsed_end_date
        start_date = parsed_start_date
        
        # Import analytics service
        from services.analytics_service import AnalyticsService
        analytics_service = AnalyticsService(db)
        
        # Get comprehensive agent analytics
        analytics = analytics_service.get_agent_analytics(
            start_date=start_date,
            end_date=end_date,
            user_id=current_user.id
        )
        
        return analytics
        
    except Exception as e:
        logger.warning(f"Analytics service error: {str(e)}")
        
        # Fallback to basic analytics or orchestration service
        try:
            date_range = {"start": start_date, "end": end_date}
            analytics = await agent_orchestration_service.get_agent_analytics(
                db, current_user.id, date_range
            )
            return analytics
            
        except Exception as fallback_error:
            logger.error(f"Fallback analytics error: {str(fallback_error)}")
            
            # Return basic mock analytics if all else fails
            return {
                "total_revenue": 0,
                "total_conversations": 0,
                "success_rate": 0,
                "avg_response_time": 0,
                "roi": 0,
                "revenue_by_agent_type": {},
                "conversation_trends": [],
                "top_performing_agents": [],
                "optimization_recommendations": [],
                "competitive_benchmarks": {
                    "industry_averages": {"success_rate": 65, "roi": 3.2},
                    "your_performance_vs_industry": "no_data"
                },
                "current_period_performance": {"today_conversations": 0, "today_revenue": 0},
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": (end_date - start_date).days
                },
                "last_updated": datetime.utcnow().isoformat()
            }


@router.get("/instances/{instance_id}/analytics")
async def get_instance_analytics(
    instance_id: int,
    start_date: Optional[str] = Query(None, description="Start date for analytics (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date for analytics (ISO format)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics for a specific agent instance"""
    # Verify ownership
    instance = db.query(AgentInstance).filter_by(
        id=instance_id,
        user_id=current_user.id
    ).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Agent instance not found"
        )
    
    # Parse date parameters
    try:
        parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else datetime.utcnow()
        parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else parsed_end_date - timedelta(days=30)
    except ValueError:
        parsed_end_date = datetime.utcnow()
        parsed_start_date = parsed_end_date - timedelta(days=30)
    
    # Get conversation metrics for the date range
    conversations_query = db.query(AgentConversation).filter(
        AgentConversation.agent_instance_id == instance_id,
        AgentConversation.created_at >= parsed_start_date,
        AgentConversation.created_at <= parsed_end_date
    )
    
    total_conversations = conversations_query.count()
    successful_conversations = conversations_query.filter(
        AgentConversation.goal_achieved == True
    ).count()
    
    # Get message metrics
    total_messages = db.query(func.sum(AgentConversation.message_count)).filter(
        AgentConversation.agent_instance_id == instance_id,
        AgentConversation.created_at >= parsed_start_date,
        AgentConversation.created_at <= parsed_end_date
    ).scalar() or 0
    
    # Calculate metrics
    success_rate = (successful_conversations / total_conversations * 100) if total_conversations > 0 else 0
    avg_response_time = 2.5  # Placeholder - would need to implement response time tracking
    uptime_percentage = 98.5  # Placeholder - would need to implement uptime tracking
    
    # Get cost metrics
    total_cost = db.query(func.sum(AgentConversation.token_cost)).filter(
        AgentConversation.agent_instance_id == instance_id,
        AgentConversation.created_at >= parsed_start_date,
        AgentConversation.created_at <= parsed_end_date
    ).scalar() or 0.0
    
    avg_cost_per_conversation = (total_cost / total_conversations) if total_conversations > 0 else 0
    
    # Get hourly usage patterns
    usage_patterns = []
    for hour in range(24):
        count = conversations_query.filter(
            func.extract('hour', AgentConversation.created_at) == hour
        ).count()
        usage_patterns.append({
            "hour": hour,
            "conversation_count": count,
            "message_count": count * 3  # Estimated
        })
    
    return {
        "instance": {
            "id": instance.id,
            "name": instance.name,
            "agent_id": instance.agent_id,
            "status": instance.status.value,
            "configuration": instance.config,
            "last_activity": instance.last_run_at.isoformat() if instance.last_run_at else None,
            "total_conversations": instance.total_conversations,
            "total_messages": instance.total_conversations * 3,  # Estimated
            "uptime_percentage": uptime_percentage,
            "created_at": instance.created_at.isoformat(),
            "updated_at": instance.updated_at.isoformat(),
            "user_id": instance.user_id
        },
        "performance_metrics": {
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "average_response_time": avg_response_time,
            "success_rate": success_rate,
            "uptime_percentage": uptime_percentage
        },
        "cost_metrics": {
            "total_cost": total_cost,
            "average_cost_per_conversation": avg_cost_per_conversation,
            "cost_breakdown": {
                "ai_processing": total_cost * 0.8,
                "message_delivery": total_cost * 0.2
            }
        },
        "usage_patterns": usage_patterns
    }


# Dynamic route - must be after static routes like /analytics
@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get agent details"""
    agent = db.query(Agent).filter_by(id=agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Agent not found"
        )
    
    return agent


@router.put("/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: int,
    agent_update: AgentCreate,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Update an agent template (admin only)"""
    agent = db.query(Agent).filter_by(id=agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Agent not found"
        )
    
    # Update fields
    for field, value in agent_update.model_dump(exclude_unset=True).items():
        if hasattr(agent, field):
            setattr(agent, field, value)
    
    agent.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(agent)
    
    return agent


@router.delete("/{agent_id}")
def delete_agent(
    agent_id: int,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Delete an agent template (admin only)"""
    agent = db.query(Agent).filter_by(id=agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Agent not found"
        )
    
    # Check if agent has active instances
    active_instances = db.query(AgentInstance).filter(
        and_(
            AgentInstance.agent_id == agent_id,
            AgentInstance.status.in_([AgentStatus.ACTIVE, AgentStatus.PAUSED])
        )
    ).count()
    
    if active_instances > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete agent with {active_instances} active instances"
        )
    
    # Soft delete - mark as inactive
    agent.is_active = False
    agent.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Agent template deleted successfully"}


# Subscription Management

@router.get("/subscription", response_model=SubscriptionResponse)
def get_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's agent subscription"""
    subscription = db.query(AgentSubscription).filter_by(
        user_id=current_user.id
    ).first()
    
    if not subscription:
        # Return default trial subscription for users without explicit subscription
        return {
            "id": 0,
            "user_id": current_user.id,
            "plan": "trial",
            "billing_cycle": "monthly",
            "max_agents": 3,
            "max_conversations_per_month": 100,
            "current_usage": {
                "agents_count": 0,
                "conversations_this_month": 0
            },
            "is_active": True,
            "auto_renew": False,
            "next_billing_date": (datetime.utcnow() + timedelta(days=14)).isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
    
    # Get current usage statistics
    agents_count = db.query(AgentInstance).filter_by(
        user_id=current_user.id
    ).count()
    
    conversations_this_month = db.query(AgentConversation).join(
        AgentInstance
    ).filter(
        AgentInstance.user_id == current_user.id,
        AgentConversation.created_at >= datetime.utcnow().replace(day=1)
    ).count()
    
    # Add current usage to subscription response
    subscription_dict = subscription.__dict__.copy()
    subscription_dict['current_usage'] = {
        "agents_count": agents_count,
        "conversations_this_month": conversations_this_month
    }
    
    return subscription_dict


@router.post("/subscription", response_model=SubscriptionResponse)
def create_subscription(
    subscription: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update agent subscription"""
    # Check existing subscription
    existing = db.query(AgentSubscription).filter_by(
        user_id=current_user.id
    ).first()
    
    if existing:
        # Update existing
        for field, value in subscription.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new subscription
    db_subscription = AgentSubscription(
        user_id=current_user.id,
        **subscription.model_dump()
    )
    
    # Set trial period for new subscriptions
    if db_subscription.tier == "trial":
        db_subscription.trial_ends_at = datetime.utcnow() + timedelta(days=14)
    
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    
    return db_subscription


# AI Provider Management

@router.get("/providers")
def get_ai_providers(
    current_user: User = Depends(get_current_user)
):
    """Get available AI providers and their status"""
    ai_manager = AIProviderManager()
    
    return {
        "available_providers": ai_manager.get_available_providers(),
        "provider_info": ai_manager.get_provider_info(),
        "validation_status": ai_manager.validate_all_providers()
    }


@router.post("/providers/estimate-cost")
async def estimate_cost(
    request: dict,
    current_user: User = Depends(get_current_user)
):
    """Estimate cost for an agent configuration"""
    try:
        ai_manager = AIProviderManager()
        
        # Extract request parameters
        agent_type = request.get("agent_type")
        expected_conversations = request.get("expected_conversations_per_month", 100)
        avg_messages = request.get("average_messages_per_conversation", 3)
        provider = request.get("provider", "openai")
        model = request.get("model", "gpt-3.5-turbo")
        
        # Validate parameters
        if not agent_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="agent_type is required"
            )
        
        # Calculate estimated usage
        total_messages = expected_conversations * avg_messages
        estimated_tokens_per_message = 150  # Average tokens
        total_input_tokens = total_messages * estimated_tokens_per_message
        total_output_tokens = total_messages * 50  # Estimated response tokens
        
        # Get provider pricing
        provider_info = ai_manager.get_provider_info().get(provider, {})
        pricing = provider_info.get('pricing', {})
        
        # Calculate costs
        input_cost = (total_input_tokens / 1000) * pricing.get('input_tokens', 0.0015)
        output_cost = (total_output_tokens / 1000) * pricing.get('output_tokens', 0.002)
        total_cost = input_cost + output_cost
        
        return {
            "estimated_monthly_cost": total_cost,
            "cost_breakdown": {
                "input_tokens": input_cost,
                "output_tokens": output_cost,
                "function_calls": 0,  # Not implemented yet
                "total": total_cost
            },
            "provider": provider,
            "model": model,
            "assumptions": [
                f"Expected conversations: {expected_conversations}/month",
                f"Average messages per conversation: {avg_messages}",
                f"Average tokens per message: {estimated_tokens_per_message}",
                f"Provider: {provider} ({model})"
            ]
        }
        
    except Exception as e:
        logger.error(f"Cost estimation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to estimate costs"
        )
"""
AI Agent API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from db import get_db
from routers.auth import get_current_user
from utils.auth import require_admin_role
from schemas_new.agent import (
    AgentCreate, AgentResponse, AgentInstanceCreate, AgentInstanceUpdate,
    AgentInstanceResponse, ConversationResponse, SubscriptionCreate,
    SubscriptionResponse
)
from models import (
    User, Agent, AgentInstance, AgentConversation, AgentSubscription,
    AgentType, AgentStatus, ConversationStatus
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
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all available agents"""
    query = db.query(Agent)
    
    if is_active is not None:
        query = query.filter(Agent.is_active == is_active)
    
    return query.all()


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
        logger.error(f"ValueError in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="An error occurred")
    except Exception as e:
        logger.error(f"Error creating agent instance: {e}")
        raise HTTPException(status_code=500, detail="Failed to create agent instance")


@router.get("/instances", response_model=List[AgentInstanceResponse])
def list_agent_instances(
    status: Optional[AgentStatus] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all agent instances for the current user"""
    query = db.query(AgentInstance).filter_by(user_id=current_user.id)
    
    if status:
        query = query.filter(AgentInstance.status == status)
    
    instances = query.all()
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
        logger.error(f"ValueError in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="An error occurred")
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
        logger.error(f"ValueError in {__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="An error occurred")
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
    instance_id: Optional[int] = Query(None),
    status: Optional[ConversationStatus] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List agent conversations for the current user"""
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
    
    # Order by most recent first
    query = query.order_by(AgentConversation.created_at.desc())
    
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


@router.post("/conversations/{conversation_id}/message")
async def send_conversation_message(
    conversation_id: str,
    message: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a manual message in a conversation (for testing)"""
    # Verify ownership
    conversation = db.query(AgentConversation).join(
        AgentInstance
    ).filter(
        AgentConversation.conversation_id == conversation_id,
        AgentInstance.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Process response asynchronously
    background_tasks.add_task(
        process_agent_response.delay,
        conversation_id,
        message["content"],
        message.get("channel", conversation.channel)
    )
    
    return {"message": "Response queued for processing"}


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
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
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
        raise HTTPException(status_code=404, detail="Agent instance not found")
    
    # Get metrics
    # Implementation would aggregate metrics for this specific instance
    
    return {
        "instance_id": instance_id,
        "name": instance.name,
        "total_conversations": instance.total_conversations,
        "successful_conversations": instance.successful_conversations,
        "total_revenue_generated": instance.total_revenue_generated,
        "success_rate": (instance.successful_conversations / instance.total_conversations * 100) if instance.total_conversations > 0 else 0
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
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return agent


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
        raise HTTPException(status_code=404, detail="No active subscription")
    
    return subscription


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
    """Estimate cost for a conversation"""
    ai_manager = AIProviderManager()
    
    messages = request.get("messages", [])
    provider = request.get("provider")
    max_tokens = request.get("max_tokens", 500)
    
    costs = await ai_manager.estimate_cost(messages, provider, max_tokens)
    
    return {"estimated_costs": costs}
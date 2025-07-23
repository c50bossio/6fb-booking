# AI Integration Usage Examples

This document provides examples of how to integrate the new AI services with existing notification and SMS systems in BookedBarber V2.

## Overview

The AI integration services provide enhanced capabilities while maintaining full backward compatibility with existing systems. All enhancements are optional and gracefully fallback to original behavior when AI processing fails.

## Quick Start

### 1. Enhanced Notification Service (Drop-in Replacement)

Replace your existing notification service imports with AI-enhanced versions:

```python
# OLD - Basic notification service
from services.notification_service import notification_service

# NEW - AI-enhanced notification service (backward compatible)
from services.ai_enhanced_notification_wrapper import get_ai_enhanced_notification_service
ai_notification_service = get_ai_enhanced_notification_service()

# Usage remains exactly the same
notifications = ai_notification_service.queue_notification(
    db=db,
    user=user,
    template_name="appointment_reminder",
    context=context,
    appointment_id=appointment.id
)
```

### 2. Enhanced SMS Response Handler (Drop-in Replacement)

```python
# OLD - Basic SMS handler
from services.sms_response_handler import sms_response_handler

# NEW - AI-enhanced SMS handler (backward compatible)
from services.ai_enhanced_sms_wrapper import get_ai_enhanced_sms_handler
ai_sms_handler = get_ai_enhanced_sms_handler()

# Usage remains exactly the same
result = ai_sms_handler.process_sms_response(db, from_phone, message_body)
```

## Complete Integration Examples

### Example 1: Upgrading Appointment Creation

```python
from sqlalchemy.orm import Session
from services.ai_integration_service import get_ai_integration_service
from services.ai_enhanced_notification_wrapper import get_ai_enhanced_notification_service
from models import Appointment, User

async def create_appointment_with_ai(db: Session, appointment_data: dict, user: User):
    """Enhanced appointment creation with AI processing"""
    
    # Create appointment using existing logic
    appointment = Appointment(**appointment_data)
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # NEW: Process appointment through AI pipeline
    ai_service = get_ai_integration_service(db)
    ai_result = await ai_service.process_appointment_with_ai(appointment)
    
    # Schedule enhanced reminders
    ai_notification_service = get_ai_enhanced_notification_service()
    ai_notification_service.schedule_appointment_reminders(db, appointment, enable_ai=True)
    
    return {
        "appointment": appointment,
        "ai_processing": ai_result,
        "risk_level": ai_result.get("risk_assessment", {}).get("risk_level", "unknown"),
        "intervention_created": bool(ai_result.get("intervention_campaign"))
    }
```

### Example 2: Enhanced SMS Webhook

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services.ai_enhanced_sms_wrapper import get_ai_enhanced_sms_handler

router = APIRouter()

@router.post("/webhooks/sms")
async def enhanced_sms_webhook(
    From: str,  # Twilio parameter
    Body: str,  # Twilio parameter
    db: Session = Depends(get_db)
):
    """Enhanced SMS webhook with AI processing"""
    
    # Process SMS with AI enhancement
    ai_sms_handler = get_ai_enhanced_sms_handler()
    result = ai_sms_handler.process_sms_response(db, From, Body)
    
    # Return appropriate TwiML response
    if result.get("response"):
        return f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Message>{result['response']}</Message>
        </Response>"""
    else:
        return """<?xml version="1.0" encoding="UTF-8"?>
        <Response></Response>"""
```

### Example 3: Notification Queue Processing with AI

```python
from services.ai_enhanced_notification_wrapper import get_ai_enhanced_notification_service
from services.ai_integration_service import get_ai_integration_service

async def process_notification_queue_with_ai(db: Session):
    """Enhanced notification queue processing"""
    
    ai_notification_service = get_ai_enhanced_notification_service()
    
    # Process queue with AI enhancements
    result = ai_notification_service.process_notification_queue(db, batch_size=50)
    
    # Get enhanced statistics
    stats = ai_notification_service.get_notification_stats(db, days=7)
    
    return {
        "processed": result["processed"],
        "successful": result["successful"],
        "failed": result["failed"],
        "ai_enhancement_rate": stats["ai_enhancements"]["enhancement_rate"],
        "ai_enabled": stats["ai_enhancements"]["ai_enabled"]
    }
```

## Migration Strategies

### Strategy 1: Gradual Migration (Recommended)

Replace services one at a time while maintaining existing functionality:

```python
# Phase 1: Replace notification service
from services.ai_enhanced_notification_wrapper import get_ai_enhanced_notification_service
notification_service = get_ai_enhanced_notification_service()

# Phase 2: Replace SMS handler  
from services.ai_enhanced_sms_wrapper import get_ai_enhanced_sms_handler
sms_handler = get_ai_enhanced_sms_handler()

# Phase 3: Add AI processing for new appointments only
if settings.ai_features_enabled:
    ai_service = get_ai_integration_service(db)
    await ai_service.process_appointment_with_ai(appointment)
```

### Strategy 2: Feature Flag Migration

Use feature flags to control AI enhancement rollout:

```python
from config import settings

class EnhancedAppointmentService:
    def __init__(self, db: Session):
        self.db = db
        
        # Choose services based on feature flags
        if getattr(settings, 'ai_notifications_enabled', False):
            from services.ai_enhanced_notification_wrapper import get_ai_enhanced_notification_service
            self.notification_service = get_ai_enhanced_notification_service()
        else:
            from services.notification_service import notification_service
            self.notification_service = notification_service
            
        if getattr(settings, 'ai_sms_enabled', False):
            from services.ai_enhanced_sms_wrapper import get_ai_enhanced_sms_handler
            self.sms_handler = get_ai_enhanced_sms_handler()
        else:
            from services.sms_response_handler import sms_response_handler
            self.sms_handler = sms_response_handler
```

## API Integration Examples

### Example 1: Using AI Integration API

```python
import httpx

async def trigger_ai_processing_for_appointment(appointment_id: int, auth_token: str):
    """Trigger AI processing via API"""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"http://localhost:8000/api/v2/ai-integration/appointments/process",
            json={"appointment_id": appointment_id, "force_reprocess": True},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "risk_level": result["risk_assessment"]["risk_level"],
                "intervention_created": bool(result["intervention_campaign"]),
                "optimized_notifications": len(result["optimized_notifications"])
            }
```

### Example 2: SMS Processing via API

```python
async def process_sms_via_api(from_phone: str, message: str, auth_token: str):
    """Process SMS via AI integration API"""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"http://localhost:8000/api/v2/ai-integration/sms/process",
            json={
                "from_phone": from_phone,
                "message_body": message,
                "enable_ai": True
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        return response.json()
```

## Configuration Examples

### Environment Variables for AI Features

```bash
# Enable/disable AI features
AI_FEATURES_ENABLED=true
AI_SMS_FEATURES_ENABLED=true
AI_FALLBACK_ENABLED=true

# AI confidence thresholds
AI_SMS_CONFIDENCE_THRESHOLD=0.7
AI_NOTIFICATION_CONFIDENCE_THRESHOLD=0.8

# AI provider settings
OPENAI_API_KEY=your_openai_key
AI_MESSAGE_PROVIDER=openai
AI_MODEL_NAME=gpt-3.5-turbo
```

### Settings Configuration

```python
# config/settings.py
AI_FEATURES_ENABLED = os.getenv("AI_FEATURES_ENABLED", "true").lower() == "true"
AI_SMS_FEATURES_ENABLED = os.getenv("AI_SMS_FEATURES_ENABLED", "true").lower() == "true"
AI_FALLBACK_ENABLED = os.getenv("AI_FALLBACK_ENABLED", "true").lower() == "true"
AI_SMS_CONFIDENCE_THRESHOLD = float(os.getenv("AI_SMS_CONFIDENCE_THRESHOLD", "0.7"))
```

## Error Handling and Fallbacks

### Graceful Degradation Example

```python
from services.ai_enhanced_notification_wrapper import get_ai_enhanced_notification_service
from services.notification_service import notification_service as base_service

def send_notification_with_fallback(db, user, template_name, context, appointment_id=None):
    """Send notification with graceful AI fallback"""
    
    try:
        # Try AI-enhanced service first
        ai_service = get_ai_enhanced_notification_service()
        return ai_service.queue_notification(
            db, user, template_name, context, appointment_id=appointment_id, enable_ai=True
        )
    except Exception as ai_error:
        logger.warning(f"AI notification failed, using base service: {ai_error}")
        
        # Fallback to base service
        return base_service.queue_notification(
            db, user, template_name, context, appointment_id=appointment_id
        )
```

## Monitoring and Analytics

### AI Performance Monitoring

```python
async def get_ai_performance_metrics(db: Session):
    """Get AI performance metrics"""
    
    # Get notification service stats
    ai_notification_service = get_ai_enhanced_notification_service()
    notification_stats = ai_notification_service.get_ai_enhancement_status()
    
    # Get SMS service stats
    ai_sms_handler = get_ai_enhanced_sms_handler()
    sms_stats = ai_sms_handler.get_ai_sms_status()
    
    # Get overall AI integration health
    ai_service = get_ai_integration_service(db)
    health_status = ai_service.get_integration_health()
    
    return {
        "notifications": {
            "ai_enabled": notification_stats["ai_enabled"],
            "enhancement_rate": notification_stats["ai_stats"]["enhancement_rate"],
            "ai_enhanced_count": notification_stats["ai_stats"]["ai_enhanced_notifications"]
        },
        "sms": {
            "ai_enabled": sms_stats["ai_enabled"],
            "success_rate": sms_stats["ai_stats"]["ai_success_rate"],
            "processed_count": sms_stats["ai_stats"]["ai_processed_messages"]
        },
        "overall_health": health_status["service_status"]
    }
```

## Testing Integration

### Unit Test Example

```python
import pytest
from unittest.mock import Mock, AsyncMock
from services.ai_enhanced_notification_wrapper import get_ai_enhanced_notification_service

@pytest.mark.asyncio
async def test_ai_notification_with_fallback(mock_db, mock_user):
    """Test AI notification with fallback behavior"""
    
    ai_service = get_ai_enhanced_notification_service()
    
    # Mock AI failure to test fallback
    with patch('services.ai_integration_service.get_ai_integration_service') as mock_ai:
        mock_ai.side_effect = Exception("AI service unavailable")
        
        # Should fallback to base service
        result = ai_service.queue_notification(
            mock_db, mock_user, "appointment_reminder", {}, enable_ai=True
        )
        
        # Should still succeed with base functionality
        assert len(result) > 0
        assert result[0].template_name == "appointment_reminder"
```

## Performance Considerations

### Async Processing for Better Performance

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def process_multiple_appointments_with_ai(db: Session, appointment_ids: List[int]):
    """Process multiple appointments with AI in parallel"""
    
    ai_service = get_ai_integration_service(db)
    
    # Create tasks for parallel processing
    tasks = [
        ai_service.process_appointment_with_ai(
            db.query(Appointment).filter(Appointment.id == apt_id).first()
        )
        for apt_id in appointment_ids
    ]
    
    # Process all appointments in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Handle results and exceptions
    successful = [r for r in results if not isinstance(r, Exception)]
    failed = [r for r in results if isinstance(r, Exception)]
    
    return {
        "successful_count": len(successful),
        "failed_count": len(failed),
        "results": successful
    }
```

## Best Practices

1. **Always Enable Fallbacks**: AI services should gracefully degrade to base functionality
2. **Monitor Performance**: Track AI enhancement rates and success metrics
3. **Use Feature Flags**: Control AI feature rollout with configuration
4. **Test Thoroughly**: Test both AI-enhanced and fallback behaviors
5. **Log Appropriately**: Log AI processing results for debugging and optimization
6. **Handle Errors Gracefully**: Never let AI failures break core functionality
7. **Optimize for Performance**: Use background processing for heavy AI operations

## Troubleshooting

### Common Issues and Solutions

1. **AI Service Unavailable**
   - Check API keys and service configuration
   - Verify network connectivity
   - Enable fallback mode in settings

2. **Low AI Confidence Scores**
   - Adjust confidence thresholds in settings
   - Review and improve training data
   - Check message context completeness

3. **High Fallback Rate**
   - Monitor AI service health
   - Check for API rate limits
   - Review error logs for patterns

4. **Performance Issues**
   - Use background processing for AI operations
   - Implement caching for frequently used AI results
   - Monitor and optimize database queries

This integration system provides a robust, backward-compatible way to enhance existing BookedBarber functionality with AI capabilities while maintaining system reliability and performance.
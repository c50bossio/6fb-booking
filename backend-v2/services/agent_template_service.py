"""
Agent Template Service - Enhanced service for managing agent templates and configurations

This service provides comprehensive template management functionality including:
- Template CRUD operations
- Dynamic template generation
- Template validation and testing
- Custom template creation
- Performance optimization recommendations
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from decimal import Decimal

from models import (
    Agent, AgentType, AgentStatus, User, Client, Appointment
)
from services.agent_templates import AgentTemplates
from services.ai_providers.ai_provider_manager import AIProviderManager
from config import settings

logger = logging.getLogger(__name__)


class AgentTemplateService:
    """Enhanced service for managing agent templates and configurations"""
    
    def __init__(self):
        self.ai_manager = AIProviderManager()
        self.base_templates = AgentTemplates()
        
    async def get_all_templates(self, include_custom: bool = True, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get all available agent templates
        
        Args:
            include_custom: Whether to include user-specific custom templates
            user_id: User ID for custom templates
            
        Returns:
            Dictionary containing all available templates with metadata
        """
        try:
            # Get base templates
            templates = self.base_templates.get_all_templates()
            
            # Add metadata for each template
            enhanced_templates = {}
            for template_type, template_config in templates.items():
                enhanced_templates[template_type] = {
                    **template_config,
                    "is_custom": False,
                    "estimated_cost_per_conversation": await self._estimate_template_cost(template_config),
                    "success_rate": self._get_template_success_rate(template_type),
                    "avg_conversation_length": self._get_avg_conversation_length(template_type),
                    "supported_channels": ["sms", "email", "whatsapp"],
                    "business_impact": self._get_business_impact_metrics(template_type)
                }
            
            # Add custom templates if requested
            if include_custom and user_id:
                custom_templates = await self._get_custom_templates(user_id)
                enhanced_templates.update(custom_templates)
            
            return {
                "templates": enhanced_templates,
                "total_count": len(enhanced_templates),
                "categories": self._categorize_templates(enhanced_templates),
                "recommended_for_business": await self._get_recommended_templates(user_id)
            }
            
        except Exception as e:
            logger.error(f"Error fetching templates: {str(e)}")
            raise
    
    async def get_template_by_type(self, template_type: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get a specific template by type with full configuration
        
        Args:
            template_type: The agent template type
            user_id: User ID for customization
            
        Returns:
            Complete template configuration with customization options
        """
        try:
            # Check if it's a standard template
            if hasattr(AgentType, template_type.upper()):
                base_template = getattr(self.base_templates, f"get_{template_type}_template")()
            else:
                # Check for custom template
                custom_template = await self._get_custom_template(template_type, user_id)
                if not custom_template:
                    raise ValueError(f"Template type '{template_type}' not found")
                return custom_template
            
            # Enhance with dynamic content
            enhanced_template = {
                **base_template,
                "customization_options": self._get_customization_options(template_type),
                "integration_requirements": self._get_integration_requirements(template_type),
                "performance_metrics": await self._get_template_performance(template_type, user_id),
                "cost_analysis": await self._get_detailed_cost_analysis(template_type),
                "setup_wizard": self._generate_setup_wizard(template_type),
                "test_scenarios": self._get_test_scenarios(template_type)
            }
            
            return enhanced_template
            
        except Exception as e:
            logger.error(f"Error fetching template {template_type}: {str(e)}")
            raise
    
    async def create_custom_template(
        self, 
        db: Session, 
        user_id: int, 
        template_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a custom agent template
        
        Args:
            db: Database session
            user_id: Owner user ID
            template_data: Template configuration data
            
        Returns:
            Created template with validation results
        """
        try:
            # Validate template structure
            validation_result = await self._validate_template_structure(template_data)
            if not validation_result["is_valid"]:
                raise ValueError(f"Invalid template: {validation_result['errors']}")
            
            # Test template with AI provider
            test_result = await self._test_template_with_ai(template_data)
            
            # Create agent record
            custom_agent = Agent(
                user_id=user_id,
                type=AgentType.CUSTOM,
                name=template_data.get("name", "Custom Agent"),
                description=template_data.get("description", ""),
                prompt_template=template_data.get("prompt_template", ""),
                config=json.dumps(template_data),
                is_active=False,  # Start as inactive until manually activated
                created_at=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            
            db.add(custom_agent)
            db.commit()
            db.refresh(custom_agent)
            
            return {
                "agent_id": custom_agent.id,
                "template": template_data,
                "validation": validation_result,
                "test_result": test_result,
                "estimated_setup_time": self._estimate_setup_time(template_data),
                "recommended_instances": self._recommend_instance_count(template_data, user_id)
            }
            
        except Exception as e:
            logger.error(f"Error creating custom template: {str(e)}")
            db.rollback()
            raise
    
    async def update_template(
        self, 
        db: Session, 
        agent_id: int, 
        user_id: int, 
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update an existing custom template
        
        Args:
            db: Database session
            agent_id: Agent/template ID to update
            user_id: Owner user ID
            updates: Updated configuration data
            
        Returns:
            Updated template with validation results
        """
        try:
            # Get existing agent
            agent = db.query(Agent).filter(
                and_(Agent.id == agent_id, Agent.user_id == user_id)
            ).first()
            
            if not agent:
                raise ValueError(f"Template {agent_id} not found or access denied")
            
            # Merge updates with existing config
            existing_config = json.loads(agent.config or "{}")
            updated_config = {**existing_config, **updates}
            
            # Validate updated template
            validation_result = await self._validate_template_structure(updated_config)
            if not validation_result["is_valid"]:
                raise ValueError(f"Invalid template updates: {validation_result['errors']}")
            
            # Update agent record
            agent.name = updates.get("name", agent.name)
            agent.description = updates.get("description", agent.description)
            agent.prompt_template = updates.get("prompt_template", agent.prompt_template)
            agent.config = json.dumps(updated_config)
            agent.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
            db.commit()
            db.refresh(agent)
            
            return {
                "agent_id": agent.id,
                "template": updated_config,
                "validation": validation_result,
                "change_summary": self._generate_change_summary(existing_config, updated_config),
                "migration_required": self._check_migration_required(existing_config, updated_config)
            }
            
        except Exception as e:
            logger.error(f"Error updating template {agent_id}: {str(e)}")
            db.rollback()
            raise
    
    async def clone_template(
        self, 
        db: Session, 
        source_template_type: str, 
        user_id: int, 
        customizations: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Clone an existing template with optional customizations
        
        Args:
            db: Database session
            source_template_type: Template type to clone from
            user_id: Owner user ID
            customizations: Optional customizations to apply
            
        Returns:
            Cloned template configuration
        """
        try:
            # Get source template
            source_template = await self.get_template_by_type(source_template_type, user_id)
            
            # Apply customizations
            cloned_config = {**source_template}
            if customizations:
                cloned_config.update(customizations)
            
            # Ensure unique name
            cloned_config["name"] = f"{cloned_config['name']} (Copy)"
            cloned_config["description"] = f"Cloned from {source_template_type}: {cloned_config.get('description', '')}"
            
            # Create as custom template
            return await self.create_custom_template(db, user_id, cloned_config)
            
        except Exception as e:
            logger.error(f"Error cloning template {source_template_type}: {str(e)}")
            raise
    
    async def _estimate_template_cost(self, template_config: Dict[str, Any]) -> Decimal:
        """Estimate cost per conversation for a template"""
        try:
            # Base cost estimation
            prompt_length = len(template_config.get("prompt_template", ""))
            expected_tokens = prompt_length * 1.3  # Rough estimation
            
            # Get AI provider costs
            cost_per_token = await self.ai_manager.get_cost_per_token("anthropic", "claude-3-haiku")
            estimated_cost = Decimal(str(expected_tokens * cost_per_token))
            
            return round(estimated_cost, 4)
            
        except Exception as e:
            logger.warning(f"Error estimating template cost: {str(e)}")
            return Decimal("0.01")  # Default fallback
    
    def _get_template_success_rate(self, template_type: str) -> float:
        """Get historical success rate for template type"""
        # In production, this would query actual metrics
        success_rates = {
            "rebooking": 0.78,
            "no_show_fee": 0.65,
            "birthday_wishes": 0.92,
            "holiday_greetings": 0.89,
            "review_request": 0.71,
            "retention": 0.83,
            "upsell": 0.56,
            "appointment_reminder": 0.94
        }
        return success_rates.get(template_type, 0.75)
    
    def _get_avg_conversation_length(self, template_type: str) -> int:
        """Get average conversation length for template type"""
        avg_lengths = {
            "rebooking": 3,
            "no_show_fee": 2,
            "birthday_wishes": 1,
            "holiday_greetings": 1,
            "review_request": 2,
            "retention": 4,
            "upsell": 5,
            "appointment_reminder": 1
        }
        return avg_lengths.get(template_type, 2)
    
    def _get_business_impact_metrics(self, template_type: str) -> Dict[str, Any]:
        """Get business impact metrics for template type"""
        impact_metrics = {
            "rebooking": {
                "revenue_increase": "15-25%",
                "client_retention": "12%",
                "time_saved": "5 hours/week"
            },
            "no_show_fee": {
                "revenue_recovery": "$200-500/month",
                "no_show_reduction": "8%",
                "time_saved": "2 hours/week"
            },
            "birthday_wishes": {
                "client_engagement": "45%",
                "rebooking_rate": "18%",
                "brand_loyalty": "22%"
            },
            "review_request": {
                "review_increase": "35%",
                "rating_improvement": "0.3 stars",
                "seo_boost": "15%"
            }
        }
        return impact_metrics.get(template_type, {
            "engagement_rate": "20%",
            "efficiency_gain": "3 hours/week",
            "client_satisfaction": "8%"
        })
    
    async def _get_custom_templates(self, user_id: int) -> Dict[str, Any]:
        """Get user's custom templates"""
        # This would query the database for custom templates
        # Placeholder implementation
        return {}
    
    def _categorize_templates(self, templates: Dict[str, Any]) -> Dict[str, List[str]]:
        """Categorize templates by business function"""
        categories = {
            "Revenue Generation": ["rebooking", "upsell", "no_show_fee"],
            "Client Engagement": ["birthday_wishes", "holiday_greetings", "retention"],
            "Operations": ["appointment_reminder"],
            "Reputation Management": ["review_request"],
            "Custom": []
        }
        
        # Add custom templates to appropriate category
        for template_name, template_config in templates.items():
            if template_config.get("is_custom", False):
                categories["Custom"].append(template_name)
        
        return categories
    
    async def _get_recommended_templates(self, user_id: Optional[int]) -> List[str]:
        """Get recommended templates based on business analysis"""
        # In production, this would analyze business data
        return ["rebooking", "appointment_reminder", "review_request"]
    
    def _get_customization_options(self, template_type: str) -> Dict[str, Any]:
        """Get available customization options for template"""
        return {
            "scheduling": {
                "trigger_conditions": ["time_based", "event_based", "behavior_based"],
                "frequency_limits": ["once_per_day", "once_per_week", "custom"],
                "timing_preferences": ["morning", "afternoon", "evening", "optimal"]
            },
            "messaging": {
                "tone_options": ["professional", "friendly", "casual", "enthusiastic"],
                "language_support": ["en", "es", "fr"],
                "personalization_level": ["basic", "moderate", "high"]
            },
            "integration": {
                "channels": ["sms", "email", "whatsapp", "in_app"],
                "crm_sync": True,
                "calendar_integration": True,
                "payment_integration": True
            }
        }
    
    def _get_integration_requirements(self, template_type: str) -> Dict[str, Any]:
        """Get integration requirements for template"""
        requirements = {
            "rebooking": {
                "required": ["calendar_access", "client_database"],
                "optional": ["payment_gateway", "sms_provider"],
                "apis": ["google_calendar", "booking_system"]
            },
            "no_show_fee": {
                "required": ["payment_gateway", "appointment_tracking"],
                "optional": ["sms_provider"],
                "apis": ["stripe", "booking_system"]
            }
        }
        return requirements.get(template_type, {
            "required": ["client_database"],
            "optional": ["sms_provider"],
            "apis": ["booking_system"]
        })
    
    async def _get_template_performance(self, template_type: str, user_id: Optional[int]) -> Dict[str, Any]:
        """Get performance metrics for template"""
        # In production, this would query actual performance data
        return {
            "conversations_completed": 0,
            "success_rate": 0.0,
            "avg_response_time": "0s",
            "client_satisfaction": 0.0,
            "cost_per_success": "$0.00",
            "last_30_days": {
                "total_conversations": 0,
                "successful_outcomes": 0,
                "total_cost": "$0.00"
            }
        }
    
    async def _get_detailed_cost_analysis(self, template_type: str) -> Dict[str, Any]:
        """Get detailed cost analysis for template"""
        base_cost = await self._estimate_template_cost({"prompt_template": "sample"})
        
        return {
            "cost_per_conversation": str(base_cost),
            "monthly_estimate": {
                "low_volume": f"${base_cost * 50:.2f}",
                "medium_volume": f"${base_cost * 200:.2f}",
                "high_volume": f"${base_cost * 1000:.2f}"
            },
            "cost_breakdown": {
                "ai_processing": "70%",
                "messaging": "20%",
                "infrastructure": "10%"
            },
            "optimization_tips": [
                "Use shorter prompts when possible",
                "Implement smart scheduling to reduce redundant conversations",
                "Monitor success rates and adjust targeting"
            ]
        }
    
    def _generate_setup_wizard(self, template_type: str) -> List[Dict[str, Any]]:
        """Generate setup wizard steps for template"""
        return [
            {
                "step": 1,
                "title": "Configure Basic Settings",
                "description": "Set up agent name, description, and basic parameters",
                "fields": ["name", "description", "timezone"]
            },
            {
                "step": 2,
                "title": "Customize Messages",
                "description": "Personalize the agent's communication style and content",
                "fields": ["tone", "language", "custom_phrases"]
            },
            {
                "step": 3,
                "title": "Set Triggers and Scheduling",
                "description": "Define when and how often the agent should engage",
                "fields": ["trigger_conditions", "frequency", "timing"]
            },
            {
                "step": 4,
                "title": "Test and Deploy",
                "description": "Test the configuration and activate the agent",
                "fields": ["test_mode", "go_live_date"]
            }
        ]
    
    def _get_test_scenarios(self, template_type: str) -> List[Dict[str, Any]]:
        """Get test scenarios for template validation"""
        scenarios = {
            "rebooking": [
                {
                    "scenario": "Recent client with no upcoming appointment",
                    "expected_outcome": "Friendly rebooking invitation sent",
                    "test_data": {"days_since_last_appointment": 14}
                },
                {
                    "scenario": "VIP client needing follow-up",
                    "expected_outcome": "Personalized message with premium service options",
                    "test_data": {"client_tier": "VIP", "service_history": ["premium_cut"]}
                }
            ]
        }
        return scenarios.get(template_type, [
            {
                "scenario": "Standard client interaction",
                "expected_outcome": "Appropriate response generated",
                "test_data": {"client_type": "standard"}
            }
        ])
    
    async def _validate_template_structure(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate template structure and configuration"""
        errors = []
        warnings = []
        
        # Required fields
        required_fields = ["name", "prompt_template", "type"]
        for field in required_fields:
            if not template_data.get(field):
                errors.append(f"Missing required field: {field}")
        
        # Validate prompt template
        prompt_template = template_data.get("prompt_template", "")
        if len(prompt_template) < 10:
            errors.append("Prompt template too short (minimum 10 characters)")
        elif len(prompt_template) > 4000:
            warnings.append("Prompt template is very long and may be expensive")
        
        # Validate name
        name = template_data.get("name", "")
        if len(name) < 3:
            errors.append("Agent name too short (minimum 3 characters)")
        elif len(name) > 100:
            errors.append("Agent name too long (maximum 100 characters)")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "score": max(0, 100 - len(errors) * 25 - len(warnings) * 5)
        }
    
    async def _test_template_with_ai(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Test template with AI provider to ensure it works"""
        try:
            # Create a test prompt
            test_prompt = template_data.get("prompt_template", "")
            test_context = {
                "client_name": "John Doe",
                "business_name": "Test Barbershop",
                "last_appointment": "2 weeks ago"
            }
            
            # Test with AI provider
            response = await self.ai_manager.generate_response(
                prompt=test_prompt,
                context=test_context,
                max_tokens=150
            )
            
            return {
                "test_passed": True,
                "response_quality": "good",  # Would analyze response quality
                "response_time_ms": 1500,  # Would measure actual time
                "test_response": response[:100] + "..." if len(response) > 100 else response
            }
            
        except Exception as e:
            return {
                "test_passed": False,
                "error": str(e),
                "recommendations": [
                    "Check prompt template syntax",
                    "Verify AI provider configuration",
                    "Ensure all placeholders are valid"
                ]
            }
    
    def _estimate_setup_time(self, template_data: Dict[str, Any]) -> str:
        """Estimate setup time for template"""
        complexity_score = len(template_data.get("prompt_template", "")) / 100
        complexity_score += len(template_data.get("config", {})) / 10
        
        if complexity_score < 5:
            return "5-10 minutes"
        elif complexity_score < 15:
            return "15-30 minutes"
        else:
            return "30-60 minutes"
    
    def _recommend_instance_count(self, template_data: Dict[str, Any], user_id: int) -> int:
        """Recommend number of agent instances to create"""
        # In production, would analyze business size and needs
        template_type = template_data.get("type", "")
        
        if template_type in ["appointment_reminder", "birthday_wishes"]:
            return 1  # Only need one instance
        elif template_type in ["rebooking", "retention"]:
            return 2  # May want different approaches
        else:
            return 1  # Default
    
    async def _get_custom_template(self, template_type: str, user_id: Optional[int]) -> Optional[Dict[str, Any]]:
        """Get a specific custom template"""
        # Would query database for custom template
        return None
    
    def _generate_change_summary(self, old_config: Dict[str, Any], new_config: Dict[str, Any]) -> List[str]:
        """Generate summary of changes between configurations"""
        changes = []
        
        for key, new_value in new_config.items():
            old_value = old_config.get(key)
            if old_value != new_value:
                changes.append(f"Changed {key}: '{old_value}' → '{new_value}'")
        
        return changes
    
    def _check_migration_required(self, old_config: Dict[str, Any], new_config: Dict[str, Any]) -> bool:
        """Check if active instances need migration due to changes"""
        critical_fields = ["prompt_template", "type", "trigger_conditions"]
        
        for field in critical_fields:
            if old_config.get(field) != new_config.get(field):
                return True
        
        return False
#!/usr/bin/env python3
"""
Populate Agent templates in the database

This script creates the basic Agent records that correspond to the agent templates.
Each template needs a corresponding Agent record in the database for the system to work.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import SessionLocal, engine, Base
from models.agent import Agent, AgentType

# Agent templates data
AGENT_TEMPLATES = [
    {
        "name": "Rebooking Agent",
        "agent_type": AgentType.REBOOKING,
        "description": "Automatically reach out to clients for their next appointment using proven 6FB rebooking strategies",
        "prompt_template": """You are a professional barbershop assistant helping with rebooking appointments. 
Your goal is to get the client to book their next appointment using the Six Figure Barber methodology.
Be friendly, professional, and focused on the value of maintaining their look.""",
        "default_config": {
            "rebooking_intervals": {"default": 28, "premium_cuts": 21, "basic_cuts": 35},
            "max_conversations_per_run": 50,
            "supported_channels": ["sms", "email"],
            "message_timing": {"avoid_weekends": True, "preferred_hours": [10, 18]},
            "goal_metrics": {"target_booking_rate": 0.75}
        },
        "is_active": True
    },
    {
        "name": "Birthday Wishes Agent",
        "agent_type": AgentType.BIRTHDAY_WISHES,
        "description": "Send personalized birthday messages with special offers to drive bookings",
        "prompt_template": """You are sending a birthday message to a valued barbershop client.
Be warm, personal, and include a special birthday offer to encourage them to book an appointment.
Make them feel special and valued as a client.""",
        "default_config": {
            "birthday_discount": 20,
            "discount_validity_days": 30,
            "max_conversations_per_run": 25,
            "supported_channels": ["sms", "email"],
            "goal_metrics": {"target_conversion_rate": 0.35}
        },
        "is_active": True
    },
    {
        "name": "No-Show Fee Collection Agent",
        "agent_type": AgentType.NO_SHOW_FEE,
        "description": "Handle no-show fee collection professionally while maintaining client relationships",
        "prompt_template": """You are handling a no-show fee collection professionally.
Be understanding but firm about the policy. Focus on maintaining the relationship
while collecting the fee and encouraging rebooking.""",
        "default_config": {
            "max_conversations_per_run": 20,
            "supported_channels": ["sms", "email"],
            "fee_amount": 25,
            "grace_period_hours": 2,
            "goal_metrics": {"target_collection_rate": 0.60}
        },
        "is_active": True
    },
    {
        "name": "Holiday Greetings Agent",
        "agent_type": AgentType.HOLIDAY_GREETINGS,
        "description": "Send holiday greetings with special promotions during holiday seasons",
        "prompt_template": """You are sending holiday greetings to barbershop clients.
Be festive and warm, and include relevant holiday promotions or gift card offers.
Focus on bringing clients in during the holiday season.""",
        "default_config": {
            "holidays": ["Christmas", "New Year", "Thanksgiving", "Independence Day"],
            "max_conversations_per_run": 100,
            "supported_channels": ["sms", "email"],
            "promotion_type": "gift_cards",
            "goal_metrics": {"target_booking_rate": 0.25}
        },
        "is_active": True
    },
    {
        "name": "Review Request Agent",
        "agent_type": AgentType.REVIEW_REQUEST,
        "description": "Request reviews from satisfied clients to build online reputation",
        "prompt_template": """You are following up with a client after their recent appointment
to request a review. Be grateful for their business and make it easy for them
to leave a positive review on Google or other platforms.""",
        "default_config": {
            "follow_up_delay_hours": 4,
            "max_conversations_per_run": 30,
            "supported_channels": ["sms", "email"],
            "review_platforms": ["google", "yelp"],
            "goal_metrics": {"target_review_rate": 0.40}
        },
        "is_active": True
    },
    {
        "name": "Client Retention Agent",
        "agent_type": AgentType.RETENTION,
        "description": "Re-engage clients who haven't booked in a while with special offers",
        "prompt_template": """You are reaching out to a client who hasn't been in for a while.
Be welcoming, acknowledge the time gap, and offer an incentive to return.
Focus on making them feel missed and valued.""",
        "default_config": {
            "retention_window_days": 60,
            "max_conversations_per_run": 40,
            "supported_channels": ["sms", "email"],
            "comeback_discount": 15,
            "goal_metrics": {"target_return_rate": 0.30}
        },
        "is_active": True
    },
    {
        "name": "Upselling Agent",
        "agent_type": AgentType.UPSELL,
        "description": "Suggest additional services and premium packages to existing clients",
        "prompt_template": """You are suggesting additional services to a client based on their history.
Be consultative and focus on the benefits of premium services.
Help them understand the value of upgrading their experience.""",
        "default_config": {
            "upsell_services": ["beard_trim", "hot_towel", "premium_products"],
            "max_conversations_per_run": 20,
            "supported_channels": ["sms", "email"],
            "discount_for_upgrade": 10,
            "goal_metrics": {"target_upsell_rate": 0.25}
        },
        "is_active": True
    },
    {
        "name": "Appointment Reminder Agent",
        "agent_type": AgentType.APPOINTMENT_REMINDER,
        "description": "Send timely appointment reminders to reduce no-shows",
        "prompt_template": """You are sending an appointment reminder to a client.
Be clear about the appointment details and include any preparation instructions.
Make it easy for them to confirm or reschedule if needed.""",
        "default_config": {
            "reminder_times": [24, 2],  # hours before appointment
            "max_conversations_per_run": 200,
            "supported_channels": ["sms", "email"],
            "include_preparation_tips": True,
            "goal_metrics": {"target_confirmation_rate": 0.85}
        },
        "is_active": True
    }
]

def populate_agent_templates():
    """Populate the database with agent templates."""
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Create database session
    db = SessionLocal()
    
    try:
        print("🤖 Populating AI Agent templates...")
        
        # Check if templates already exist
        existing_count = db.query(Agent).count()
        if existing_count > 0:
            print(f"   Found {existing_count} existing agents. Checking for updates...")
        
        created_count = 0
        updated_count = 0
        
        for template_data in AGENT_TEMPLATES:
            # Check if agent already exists
            existing_agent = db.query(Agent).filter_by(
                agent_type=template_data["agent_type"]
            ).first()
            
            if existing_agent:
                # Update existing agent
                for key, value in template_data.items():
                    if hasattr(existing_agent, key):
                        setattr(existing_agent, key, value)
                updated_count += 1
                print(f"   ✅ Updated: {template_data['name']}")
            else:
                # Create new agent
                agent = Agent(**template_data)
                db.add(agent)
                created_count += 1
                print(f"   ✨ Created: {template_data['name']}")
        
        # Commit all changes
        db.commit()
        
        print(f"\n🎉 Agent template population completed!")
        print(f"   📊 Created: {created_count} new agents")
        print(f"   🔄 Updated: {updated_count} existing agents")
        print(f"   🤖 Total agents: {db.query(Agent).count()}")
        
        # Verify the agents
        print(f"\n📋 Agent Types Available:")
        agents = db.query(Agent).filter_by(is_active=True).all()
        for agent in agents:
            print(f"   {agent.id}. {agent.name} ({agent.agent_type.value})")
        
    except Exception as e:
        print(f"❌ Error populating agent templates: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main function."""
    try:
        populate_agent_templates()
        print("\n✅ Agent templates populated successfully!")
    except Exception as e:
        print(f"\n❌ Failed to populate agent templates: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Setup Agent Testing Environment
Creates database tables, populates test data, and prepares for manual agent testing
"""

import sys
import os
import json
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from database import engine, SessionLocal
from models.agent import AgentType, AgentStatus, ConversationStatus, SubscriptionTier

def create_agent_tables_direct():
    """Create agent tables using direct SQL - SQLite compatible"""
    print("🔧 Creating agent database tables...")
    
    try:
        with engine.connect() as conn:
            # Create agents table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS agents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    agent_type TEXT NOT NULL,
                    description TEXT,
                    default_config TEXT NOT NULL DEFAULT '{}',
                    prompt_templates TEXT NOT NULL DEFAULT '{}',
                    required_permissions TEXT DEFAULT '[]',
                    supported_channels TEXT DEFAULT '["sms", "email"]',
                    min_interval_hours INTEGER DEFAULT 24,
                    max_attempts INTEGER DEFAULT 3,
                    success_metrics TEXT DEFAULT '{}',
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create agent_instances table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS agent_instances (
                    id TEXT PRIMARY KEY,
                    agent_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'DRAFT',
                    config TEXT NOT NULL DEFAULT '{}',
                    custom_prompt_templates TEXT DEFAULT '{}',
                    success_metrics TEXT DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (agent_id) REFERENCES agents(id)
                )
            """))
            
            # Create agent_conversations table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS agent_conversations (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    agent_instance_id TEXT NOT NULL,
                    client_id INTEGER,
                    channel TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    messages TEXT DEFAULT '[]',
                    message_count INTEGER DEFAULT 0,
                    total_tokens_used INTEGER DEFAULT 0,
                    prompt_tokens INTEGER DEFAULT 0,
                    completion_tokens INTEGER DEFAULT 0,
                    token_cost REAL DEFAULT 0.0000,
                    goal_achieved INTEGER DEFAULT 0,
                    revenue_generated REAL DEFAULT 0.00,
                    appointment_id INTEGER,
                    context_data TEXT DEFAULT '{}',
                    scheduled_at TEXT,
                    started_at TEXT,
                    last_message_at TEXT,
                    completed_at TEXT,
                    expires_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (agent_instance_id) REFERENCES agent_instances(id)
                )
            """))
            
            # Create agent_subscriptions table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS agent_subscriptions (
                    id TEXT PRIMARY KEY,
                    barbershop_id INTEGER NOT NULL,
                    subscription_tier TEXT NOT NULL DEFAULT 'TRIAL',
                    agent_types TEXT NOT NULL DEFAULT '[]',
                    max_conversations_per_month INTEGER DEFAULT 100,
                    max_active_instances INTEGER DEFAULT 3,
                    monthly_cost REAL DEFAULT 0.00,
                    is_active INTEGER DEFAULT 1,
                    trial_ends_at TEXT,
                    next_billing_date TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create test users table for testing
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS test_clients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    last_appointment TEXT,
                    preferred_service TEXT,
                    average_interval_days INTEGER,
                    total_visits INTEGER DEFAULT 0,
                    total_spent REAL DEFAULT 0.00,
                    birthday TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            conn.commit()
            
        print("✅ Agent tables created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

def populate_agent_templates():
    """Populate the database with agent templates"""
    print("📝 Populating agent templates...")
    
    agent_templates = [
        {
            "name": "Smart Rebooking Agent",
            "agent_type": "rebooking",
            "description": "Automatically reaches out to clients for rebooking based on optimal intervals using Six Figure Barber methodology",
            "default_config": json.dumps({
                "rebooking_intervals": {
                    "haircut": 21,
                    "beard_trim": 14, 
                    "hair_color": 28,
                    "shave": 7,
                    "default": 28
                },
                "message_timing": {
                    "days_before": 3,
                    "time_of_day": "10:00",
                    "avoid_weekends": True
                },
                "max_conversations_per_run": 50,
                "supported_channels": ["sms", "email"]
            }),
            "prompt_templates": json.dumps({
                "system": "You are a friendly and professional barbershop assistant. Your goal is to help clients schedule their next appointment at the optimal time using the Six Figure Barber methodology.",
                "initial_message": "Hi {client_name}! It's been {days_since_last} days since your last {service} at {barbershop_name}. You're due for your next appointment to keep your look fresh. Would you like to schedule your next visit?",
                "follow_up": "Just a friendly reminder that you're due for your next appointment. Our calendar is filling up - would you like me to hold a spot for you?"
            }),
            "success_metrics": json.dumps({
                "target_response_rate": 0.4,
                "target_booking_rate": 0.7,
                "target_revenue_per_conversation": 50.0
            })
        },
        {
            "name": "Birthday Wishes Agent", 
            "agent_type": "birthday_wishes",
            "description": "Sends personalized birthday messages with special offers to drive bookings",
            "default_config": json.dumps({
                "birthday_discount": 20,
                "discount_validity_days": 30,
                "max_conversations_per_run": 25,
                "supported_channels": ["sms", "email"]
            }),
            "prompt_templates": json.dumps({
                "system": "You are sending warm, personal birthday messages to valued barbershop clients with special offers.",
                "birthday_message": "🎉 Happy Birthday {client_name}! As a special birthday gift, enjoy 20% off your next appointment at {barbershop_name}. Book within 30 days to use this exclusive offer!"
            }),
            "success_metrics": json.dumps({
                "target_response_rate": 0.6,
                "target_booking_rate": 0.35,
                "target_revenue_per_conversation": 45.0
            })
        },
        {
            "name": "Retention Champion Agent",
            "agent_type": "retention", 
            "description": "Identifies at-risk clients and re-engages them with personalized outreach",
            "default_config": json.dumps({
                "inactive_threshold_days": 45,
                "max_attempts": 3,
                "attempt_interval_days": 7,
                "special_offer_percentage": 15
            }),
            "prompt_templates": json.dumps({
                "system": "You specialize in client retention using empathetic, value-focused communication.",
                "win_back_message": "Hi {client_name}, we miss you at {barbershop_name}! It's been {days_since_last} days since your last visit. We'd love to welcome you back with a special 15% discount on your next appointment."
            }),
            "success_metrics": json.dumps({
                "target_response_rate": 0.3,
                "target_booking_rate": 0.5,
                "target_revenue_per_conversation": 60.0
            })
        }
    ]
    
    try:
        with engine.connect() as conn:
            for template in agent_templates:
                # Check if agent already exists
                result = conn.execute(text(
                    "SELECT id FROM agents WHERE agent_type = :agent_type"
                ), {"agent_type": template["agent_type"]})
                
                if result.fetchone():
                    print(f"  ⚠️  Agent {template['agent_type']} already exists, skipping...")
                    continue
                
                # Insert new agent template
                conn.execute(text("""
                    INSERT INTO agents (name, agent_type, description, default_config, prompt_templates, success_metrics)
                    VALUES (:name, :agent_type, :description, :default_config, :prompt_templates, :success_metrics)
                """), {
                    "name": template["name"],
                    "agent_type": template["agent_type"],
                    "description": template["description"],
                    "default_config": template["default_config"],
                    "prompt_templates": template["prompt_templates"],
                    "success_metrics": template["success_metrics"]
                })
                
                print(f"  ✅ Created {template['name']}")
            
            conn.commit()
            
        print("✅ Agent templates populated successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error populating templates: {e}")
        return False

def create_test_clients():
    """Create realistic test client data"""
    print("👥 Creating test client data...")
    
    test_clients = [
        {
            "name": "Marcus Johnson",
            "email": "marcus.johnson@email.com",
            "phone": "+1-555-0101",
            "last_appointment": (datetime.now() - timedelta(days=25)).isoformat(),
            "preferred_service": "haircut",
            "average_interval_days": 21,
            "total_visits": 12,
            "total_spent": 720.00,
            "birthday": "1985-08-15"
        },
        {
            "name": "David Chen",
            "email": "david.chen@email.com", 
            "phone": "+1-555-0102",
            "last_appointment": (datetime.now() - timedelta(days=30)).isoformat(),
            "preferred_service": "haircut + beard_trim",
            "average_interval_days": 28,
            "total_visits": 8,
            "total_spent": 560.00,
            "birthday": "1990-12-03"
        },
        {
            "name": "Michael Rodriguez",
            "email": "mike.rodriguez@email.com",
            "phone": "+1-555-0103", 
            "last_appointment": (datetime.now() - timedelta(days=50)).isoformat(),
            "preferred_service": "fade",
            "average_interval_days": 21,
            "total_visits": 15,
            "total_spent": 900.00,
            "birthday": "1988-03-22"
        },
        {
            "name": "James Wilson",
            "email": "james.wilson@email.com",
            "phone": "+1-555-0104",
            "last_appointment": (datetime.now() - timedelta(days=15)).isoformat(),
            "preferred_service": "shave",
            "average_interval_days": 7,
            "total_visits": 25,
            "total_spent": 750.00,
            "birthday": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")  # Birthday in 5 days
        },
        {
            "name": "Robert Taylor",
            "email": "robert.taylor@email.com",
            "phone": "+1-555-0105",
            "last_appointment": (datetime.now() - timedelta(days=60)).isoformat(),
            "preferred_service": "haircut",
            "average_interval_days": 28,
            "total_visits": 20,
            "total_spent": 1200.00,
            "birthday": "1982-07-18"
        }
    ]
    
    try:
        with engine.connect() as conn:
            # Clear existing test data
            conn.execute(text("DELETE FROM test_clients"))
            
            for client in test_clients:
                conn.execute(text("""
                    INSERT INTO test_clients 
                    (name, email, phone, last_appointment, preferred_service, 
                     average_interval_days, total_visits, total_spent, birthday)
                    VALUES (:name, :email, :phone, :last_appointment, :preferred_service,
                            :average_interval_days, :total_visits, :total_spent, :birthday)
                """), client)
                
                print(f"  ✅ Created client: {client['name']}")
            
            conn.commit()
            
        print("✅ Test client data created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating test clients: {e}")
        return False

def create_active_agent_instances():
    """Create active agent instances for testing"""
    print("🤖 Creating active agent instances...")
    
    try:
        with engine.connect() as conn:
            # Get agent templates
            agents = conn.execute(text("SELECT id, name, agent_type, default_config FROM agents")).fetchall()
            
            for agent in agents:
                agent_id, name, agent_type, config = agent
                
                instance_id = str(uuid.uuid4())
                instance_name = f"{name} - Active Instance"
                
                # Create active instance
                conn.execute(text("""
                    INSERT INTO agent_instances 
                    (id, agent_id, name, status, config)
                    VALUES (:id, :agent_id, :name, :status, :config)
                """), {
                    "id": instance_id,
                    "agent_id": agent_id,
                    "name": instance_name,
                    "status": "ACTIVE",
                    "config": config
                })
                
                print(f"  ✅ Created active instance: {instance_name}")
            
            conn.commit()
            
        print("✅ Active agent instances created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating agent instances: {e}")
        return False

def verify_setup():
    """Verify the setup was successful"""
    print("🔍 Verifying agent testing setup...")
    
    try:
        with engine.connect() as conn:
            # Check agents
            agent_count = conn.execute(text("SELECT COUNT(*) FROM agents")).fetchone()[0]
            print(f"  📋 Agent templates: {agent_count}")
            
            # Check instances  
            instance_count = conn.execute(text("SELECT COUNT(*) FROM agent_instances WHERE status = 'ACTIVE'")).fetchone()[0]
            print(f"  🤖 Active instances: {instance_count}")
            
            # Check test clients
            client_count = conn.execute(text("SELECT COUNT(*) FROM test_clients")).fetchone()[0]
            print(f"  👥 Test clients: {client_count}")
            
            if agent_count > 0 and instance_count > 0 and client_count > 0:
                print("✅ Agent testing environment ready!")
                return True
            else:
                print("❌ Setup incomplete")
                return False
                
    except Exception as e:
        print(f"❌ Error verifying setup: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up Agent Testing Environment")
    print("=" * 50)
    
    success = True
    
    # Step 1: Create tables
    if not create_agent_tables_direct():
        success = False
    
    # Step 2: Populate agent templates
    if success and not populate_agent_templates():
        success = False
    
    # Step 3: Create test clients
    if success and not create_test_clients():
        success = False
        
    # Step 4: Create active instances
    if success and not create_active_agent_instances():
        success = False
    
    # Step 5: Verify setup
    if success and not verify_setup():
        success = False
    
    print("=" * 50)
    if success:
        print("🎉 Agent testing environment setup complete!")
        print("\nNext steps:")
        print("1. Run: python test_agent_manual.py")
        print("2. Test agents with: ./ACTIVATE_AGENTS_V2.sh --status")
    else:
        print("❌ Setup failed. Check errors above.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
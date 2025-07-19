#!/usr/bin/env python3
"""
Create Agent Tables - Direct Database Initialization
Creates the agent-related database tables needed for the AI agent system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, MetaData
from database import engine
from models.agent import Agent, AgentInstance, AgentConversation, AgentSubscription

def create_agent_tables():
    """Create only agent-related database tables"""
    print("Creating agent database tables...")
    
    try:
        # Create metadata object
        metadata = MetaData()
        
        # Get agent table definitions
        agent_tables = [
            Agent.__table__,
            AgentInstance.__table__, 
            AgentConversation.__table__,
            AgentSubscription.__table__
        ]
        
        # Create only agent tables
        for table in agent_tables:
            table.metadata = metadata
        
        metadata.create_all(bind=engine)
        print("✅ Agent database tables created successfully!")
        
        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        agent_tables = [t for t in tables if 'agent' in t.lower()]
        print(f"✅ Agent tables created: {agent_tables}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating agent tables: {e}")
        # Try alternative approach
        print("Trying direct SQL creation...")
        return create_tables_sql()

def create_tables_sql():
    """Create tables using direct SQL"""
    try:
        from sqlalchemy import text
        
        with engine.connect() as conn:
            # Agent table
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                agent_type VARCHAR(50) NOT NULL,
                description TEXT,
                default_config TEXT NOT NULL DEFAULT '{}',
                prompt_templates TEXT NOT NULL DEFAULT '{}',
                required_permissions TEXT DEFAULT '[]',
                supported_channels TEXT DEFAULT '["sms", "email"]',
                min_interval_hours INTEGER DEFAULT 24,
                max_attempts INTEGER DEFAULT 3,
                success_metrics TEXT DEFAULT '{}',
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """))
            
            # Agent instances table
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agent_instances (
                id VARCHAR(36) PRIMARY KEY,
                agent_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                config TEXT NOT NULL DEFAULT '{}',
                custom_prompt_templates TEXT DEFAULT '{}',
                success_metrics TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )
            """))
            
            # Agent conversations table
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agent_conversations (
                id VARCHAR(36) PRIMARY KEY,
                conversation_id VARCHAR(100) NOT NULL,
                agent_instance_id VARCHAR(36) NOT NULL,
                client_id INTEGER,
                channel VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                messages TEXT DEFAULT '[]',
                message_count INTEGER DEFAULT 0,
                total_tokens_used INTEGER DEFAULT 0,
                prompt_tokens INTEGER DEFAULT 0,
                completion_tokens INTEGER DEFAULT 0,
                token_cost DECIMAL(10,4) DEFAULT 0.0000,
                goal_achieved BOOLEAN DEFAULT FALSE,
                revenue_generated DECIMAL(10,2) DEFAULT 0.00,
                appointment_id INTEGER,
                context_data TEXT DEFAULT '{}',
                scheduled_at DATETIME,
                started_at DATETIME,
                last_message_at DATETIME,
                completed_at DATETIME,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_instance_id) REFERENCES agent_instances(id)
            )
            """))
            
            # Agent subscriptions table
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agent_subscriptions (
                id VARCHAR(36) PRIMARY KEY,
                barbershop_id INTEGER NOT NULL,
                subscription_tier VARCHAR(20) NOT NULL DEFAULT 'TRIAL',
                agent_types TEXT NOT NULL DEFAULT '[]',
                max_conversations_per_month INTEGER DEFAULT 100,
                max_active_instances INTEGER DEFAULT 3,
                monthly_cost DECIMAL(10,2) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT TRUE,
                trial_ends_at DATETIME,
                next_billing_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """))
            
            conn.commit()
        
        print("✅ Agent tables created successfully using SQL!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables with SQL: {e}")
        return False

if __name__ == "__main__":
    success = create_agent_tables()
    sys.exit(0 if success else 1)
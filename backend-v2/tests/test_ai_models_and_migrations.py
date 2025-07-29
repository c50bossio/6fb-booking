"""
Comprehensive tests for AI Business Calendar database models and migrations

Tests cover:
- Model validation and constraints
- Relationships and foreign keys
- Data integrity
- Migration scripts
- Index performance
- Model methods and properties
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from unittest.mock import patch

from models import (
    User, Agent, AgentInstance, AgentConversation, AgentSubscription,
    BusinessCalendarMetadata, AIAnalyticsEvent, ClientInsight,
    AgentType, AgentStatus, ConversationStatus
)
from db import Base


class TestAIBusinessModels:
    """Test suite for AI Business Calendar related models"""

    def test_agent_model_creation(self, db):
        """Test Agent model creation and validation"""
        agent = Agent(
            agent_type=AgentType.FINANCIAL_COACH,
            name="Financial Coach",
            description="Revenue optimization specialist",
            capabilities=["pricing_analysis", "revenue_optimization"],
            pricing_tier="standard",
            is_active=True
        )
        
        db.add(agent)
        db.commit()
        db.refresh(agent)
        
        assert agent.id is not None
        assert agent.agent_type == AgentType.FINANCIAL_COACH
        assert agent.name == "Financial Coach"
        assert agent.is_active is True
        assert agent.created_at is not None
        assert agent.updated_at is not None

    def test_agent_model_constraints(self, db):
        """Test Agent model constraints and validations"""
        # Test required fields
        with pytest.raises(IntegrityError):
            agent = Agent()  # Missing required fields
            db.add(agent)
            db.commit()

        db.rollback()

        # Test unique constraint on agent_type
        agent1 = Agent(
            agent_type=AgentType.FINANCIAL_COACH,
            name="Financial Coach 1",
            description="First coach",
            capabilities=["pricing"],
            pricing_tier="standard",
            is_active=True
        )
        db.add(agent1)
        db.commit()

        with pytest.raises(IntegrityError):
            agent2 = Agent(
                agent_type=AgentType.FINANCIAL_COACH,  # Duplicate
                name="Financial Coach 2",
                description="Second coach",
                capabilities=["pricing"],
                pricing_tier="standard",
                is_active=True
            )
            db.add(agent2)
            db.commit()

    def test_agent_instance_model_creation(self, db, test_user):
        """Test AgentInstance model creation"""
        # First create an agent
        agent = Agent(
            agent_type=AgentType.GROWTH_STRATEGIST,
            name="Growth Strategist",
            description="Growth specialist",
            capabilities=["client_retention"],
            pricing_tier="premium",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

        # Create agent instance
        instance = AgentInstance(
            agent_id=agent.id,
            user_id=test_user.id,
            name="My Growth Strategist",
            status=AgentStatus.ACTIVE,
            config={"max_conversations": 10, "response_time": "fast"},
            total_conversations=5,
            successful_conversations=4,
            total_revenue_generated=500.0
        )
        
        db.add(instance)
        db.commit()
        db.refresh(instance)
        
        assert instance.id is not None
        assert instance.agent_id == agent.id
        assert instance.user_id == test_user.id
        assert instance.status == AgentStatus.ACTIVE
        assert instance.config["max_conversations"] == 10
        assert instance.total_conversations == 5
        assert instance.success_rate == 80.0  # 4/5 * 100

    def test_agent_instance_relationships(self, db, test_user):
        """Test AgentInstance model relationships"""
        agent = Agent(
            agent_type=AgentType.OPERATIONS_OPTIMIZER,
            name="Operations Optimizer",
            description="Operations specialist",
            capabilities=["scheduling"],
            pricing_tier="standard",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

        instance = AgentInstance(
            agent_id=agent.id,
            user_id=test_user.id,
            name="My Operations Optimizer",
            status=AgentStatus.ACTIVE,
            config={},
            total_conversations=0,
            successful_conversations=0
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)

        # Test relationships
        assert instance.agent is not None
        assert instance.agent.name == "Operations Optimizer"
        assert instance.user is not None
        assert instance.user.id == test_user.id

    def test_agent_conversation_model_creation(self, db, test_user):
        """Test AgentConversation model creation"""
        # Create required dependencies
        agent = Agent(
            agent_type=AgentType.BRAND_DEVELOPER,
            name="Brand Developer",
            description="Brand specialist",
            capabilities=["brand_development"],
            pricing_tier="premium",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

        instance = AgentInstance(
            agent_id=agent.id,
            user_id=test_user.id,
            name="My Brand Developer",
            status=AgentStatus.ACTIVE,
            config={}
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)

        # Create conversation
        conversation = AgentConversation(
            conversation_id="conv_123456",
            agent_instance_id=instance.id,
            status=ConversationStatus.ACTIVE,
            channel="web",
            metadata={"client_id": "client_123", "session_id": "session_456"},
            message_count=10,
            total_tokens=2500,
            estimated_cost=0.15
        )
        
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        assert conversation.id is not None
        assert conversation.conversation_id == "conv_123456"
        assert conversation.status == ConversationStatus.ACTIVE
        assert conversation.metadata["client_id"] == "client_123"
        assert conversation.message_count == 10
        assert conversation.average_tokens_per_message == 250.0  # 2500/10

    def test_agent_subscription_model_creation(self, db, test_user):
        """Test AgentSubscription model creation"""
        subscription = AgentSubscription(
            user_id=test_user.id,
            tier="pro",
            status="active",
            max_agents=5,
            max_conversations_per_month=1000,
            monthly_fee=99.99,
            trial_ends_at=datetime.utcnow() + timedelta(days=14)
        )
        
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        
        assert subscription.id is not None
        assert subscription.user_id == test_user.id
        assert subscription.tier == "pro"
        assert subscription.is_trial_active is True
        assert subscription.days_until_trial_end > 0

    def test_business_calendar_metadata_model(self, db, test_user):
        """Test BusinessCalendarMetadata model creation"""
        metadata = BusinessCalendarMetadata(
            user_id=test_user.id,
            google_event_id="google_event_123",
            appointment_id=1,
            service_category="haircut",
            service_tier="premium",
            client_value_tier="high",
            expected_revenue=85.0,
            actual_revenue=85.0,
            client_ltv=1200.0,
            client_frequency="monthly",
            coaching_opportunities=["pricing_optimization", "upselling"],
            optimization_flags=["peak_time_booking"],
            six_fb_compliance_score=92.0
        )
        
        db.add(metadata)
        db.commit()
        db.refresh(metadata)
        
        assert metadata.id is not None
        assert metadata.user_id == test_user.id
        assert metadata.google_event_id == "google_event_123"
        assert metadata.service_tier == "premium"
        assert metadata.six_fb_compliance_score == 92.0
        assert len(metadata.coaching_opportunities) == 2
        assert metadata.is_high_value is True  # Based on revenue > 80

    def test_ai_analytics_event_model(self, db, test_user):
        """Test AIAnalyticsEvent model creation"""
        event = AIAnalyticsEvent(
            user_id=test_user.id,
            event_type="coaching_session_completed",
            agent_type="financial_coach",
            event_data={
                "session_duration": 300,
                "recommendations_provided": 5,
                "user_engagement_score": 8.5
            },
            business_impact={"revenue_opportunity": 150.0},
            occurred_at=datetime.utcnow()
        )
        
        db.add(event)
        db.commit()
        db.refresh(event)
        
        assert event.id is not None
        assert event.event_type == "coaching_session_completed"
        assert event.event_data["session_duration"] == 300
        assert event.business_impact["revenue_opportunity"] == 150.0

    def test_client_insight_model(self, db, test_user):
        """Test ClientInsight model creation"""
        insight = ClientInsight(
            user_id=test_user.id,
            client_id=1,
            insight_type="behavioral_pattern",
            confidence_score=0.85,
            insight_data={
                "pattern": "prefers_morning_appointments",
                "frequency": "weekly",
                "value_tier": "premium"
            },
            recommended_actions=["offer_morning_packages", "premium_upselling"],
            generated_by_agent="growth_strategist",
            is_active=True
        )
        
        db.add(insight)
        db.commit()
        db.refresh(insight)
        
        assert insight.id is not None
        assert insight.confidence_score == 0.85
        assert insight.is_high_confidence is True  # > 0.8
        assert len(insight.recommended_actions) == 2

    def test_model_cascade_deletion(self, db, test_user):
        """Test cascade deletion behavior"""
        # Create agent with instance and conversations
        agent = Agent(
            agent_type="test_agent",
            name="Test Agent",
            description="Test",
            capabilities=["test"],
            pricing_tier="standard",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

        instance = AgentInstance(
            agent_id=agent.id,
            user_id=test_user.id,
            name="Test Instance",
            status=AgentStatus.ACTIVE,
            config={}
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)

        conversation = AgentConversation(
            conversation_id="test_conv",
            agent_instance_id=instance.id,
            status=ConversationStatus.ACTIVE,
            channel="web"
        )
        db.add(conversation)
        db.commit()

        # Delete agent should cascade to instances and conversations
        db.delete(agent)
        db.commit()

        # Check that related records are handled appropriately
        remaining_instances = db.query(AgentInstance).filter_by(agent_id=agent.id).count()
        assert remaining_instances == 0

    def test_model_indexing_performance(self, db, test_user):
        """Test database indexes for performance"""
        # Create multiple records to test indexing
        agents = []
        for i in range(10):
            agent = Agent(
                agent_type=f"test_agent_{i}",
                name=f"Test Agent {i}",
                description=f"Test agent {i}",
                capabilities=[f"capability_{i}"],
                pricing_tier="standard",
                is_active=i % 2 == 0
            )
            agents.append(agent)
            db.add(agent)
        
        db.commit()

        # Test query performance with indexes
        start_time = datetime.utcnow()
        
        # Query by agent_type (should be indexed)
        result = db.query(Agent).filter_by(agent_type="test_agent_5").first()
        
        # Query by is_active (should be indexed)
        active_agents = db.query(Agent).filter_by(is_active=True).all()
        
        end_time = datetime.utcnow()
        query_time = (end_time - start_time).total_seconds()
        
        # Should be fast with proper indexing
        assert query_time < 1.0
        assert result is not None
        assert len(active_agents) == 5

    def test_model_validation_methods(self, db, test_user):
        """Test custom validation methods on models"""
        # Test AgentInstance validation
        agent = Agent(
            agent_type=AgentType.FINANCIAL_COACH,
            name="Financial Coach",
            description="Test",
            capabilities=["test"],
            pricing_tier="standard",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

        instance = AgentInstance(
            agent_id=agent.id,
            user_id=test_user.id,
            name="Test Instance",
            status=AgentStatus.ACTIVE,
            config={"max_conversations": 10},
            total_conversations=8,
            successful_conversations=6
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)

        # Test calculated properties
        assert instance.success_rate == 75.0
        assert instance.is_performing_well is True  # > 70%

    def test_model_serialization(self, db, test_user):
        """Test model serialization for API responses"""
        agent = Agent(
            agent_type=AgentType.GROWTH_STRATEGIST,
            name="Growth Strategist",
            description="Growth specialist",
            capabilities=["client_retention", "acquisition"],
            pricing_tier="premium",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

        # Test that model can be serialized
        agent_dict = {
            "id": agent.id,
            "agent_type": agent.agent_type,
            "name": agent.name,
            "description": agent.description,
            "capabilities": agent.capabilities,
            "pricing_tier": agent.pricing_tier,
            "is_active": agent.is_active,
            "created_at": agent.created_at.isoformat() if agent.created_at else None,
            "updated_at": agent.updated_at.isoformat() if agent.updated_at else None
        }
        
        assert agent_dict["name"] == "Growth Strategist"
        assert agent_dict["agent_type"] == AgentType.GROWTH_STRATEGIST
        assert isinstance(agent_dict["capabilities"], list)

    def test_model_data_integrity(self, db, test_user):
        """Test data integrity constraints across models"""
        # Create agent and instance
        agent = Agent(
            agent_type=AgentType.OPERATIONS_OPTIMIZER,
            name="Operations Optimizer",
            description="Operations specialist",
            capabilities=["scheduling"],
            pricing_tier="standard",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

        instance = AgentInstance(
            agent_id=agent.id,
            user_id=test_user.id,
            name="My Operations Optimizer",
            status=AgentStatus.ACTIVE,
            config={"max_conversations": 100},
            total_conversations=50,
            successful_conversations=40,
            total_revenue_generated=2000.0
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)

        # Test that calculated fields are consistent
        assert instance.success_rate == 80.0
        assert instance.average_revenue_per_conversation == 40.0

        # Test subscription limits
        subscription = AgentSubscription(
            user_id=test_user.id,
            tier="basic",
            status="active",
            max_agents=2,
            max_conversations_per_month=100,
            monthly_fee=29.99
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)

        # Test that business logic constraints are enforced
        assert subscription.can_create_agent() is True  # User has less than max_agents
        assert subscription.can_start_conversation() is True  # Under monthly limit


class TestAIMigrations:
    """Test suite for AI-related database migrations"""

    def test_agent_tables_migration(self):
        """Test that agent-related tables are created correctly"""
        # Create in-memory database for migration testing
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        
        # Check that all tables exist
        inspector = engine.dialect.get_table_names(engine.connect())
        
        expected_tables = [
            'agents',
            'agent_instances', 
            'agent_conversations',
            'agent_subscriptions',
            'business_calendar_metadata',
            'ai_analytics_events',
            'client_insights'
        ]
        
        for table in expected_tables:
            assert table in inspector, f"Table {table} not found in migration"

    def test_indexes_creation(self):
        """Test that required indexes are created"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        
        with engine.connect() as conn:
            # Test agent_type index on agents table
            result = conn.execute(text("PRAGMA index_list(agents)"))
            indexes = [row[1] for row in result.fetchall()]
            
            # Should have index on agent_type for unique constraint
            assert any('agent_type' in idx for idx in indexes)
            
            # Test user_id indexes for performance
            result = conn.execute(text("PRAGMA index_list(agent_instances)"))
            indexes = [row[1] for row in result.fetchall()]
            
            # Should have indexes on foreign keys
            assert len(indexes) > 0

    def test_foreign_key_constraints(self):
        """Test that foreign key constraints are properly set up"""
        engine = create_engine("sqlite:///:memory:", 
                             connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            # Test that foreign key constraint works
            instance = AgentInstance(
                agent_id=99999,  # Non-existent agent
                user_id=1,
                name="Test Instance",
                status=AgentStatus.ACTIVE,
                config={}
            )
            session.add(instance)
            
            # This should raise an integrity error
            with pytest.raises(IntegrityError):
                session.commit()
        finally:
            session.rollback()
            session.close()

    def test_column_types_and_constraints(self):
        """Test that columns have correct types and constraints"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        
        # Check agents table structure
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(agents)"))
            columns = {row[1]: {'type': row[2], 'notnull': row[3]} for row in result.fetchall()}
            
            # Verify critical columns
            assert 'agent_type' in columns
            assert columns['agent_type']['notnull'] == 1  # NOT NULL
            assert 'name' in columns
            assert columns['name']['notnull'] == 1
            assert 'is_active' in columns
            
            # Check agent_instances table
            result = conn.execute(text("PRAGMA table_info(agent_instances)"))
            columns = {row[1]: {'type': row[2], 'notnull': row[3]} for row in result.fetchall()}
            
            assert 'agent_id' in columns
            assert 'user_id' in columns
            assert 'status' in columns
            assert 'config' in columns  # JSON field

    def test_data_migration_scenarios(self):
        """Test data migration scenarios"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            # Simulate migration of existing data
            # Create basic user data
            from models import User
            user = User(
                email="migration@test.com",
                name="Migration Test",
                hashed_password="test_hash",
                role="user"
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
            # Create agent data
            agent = Agent(
                agent_type=AgentType.FINANCIAL_COACH,
                name="Migrated Financial Coach",
                description="Migrated from old system",
                capabilities=["pricing", "revenue"],
                pricing_tier="standard",
                is_active=True
            )
            session.add(agent)
            session.commit()
            session.refresh(agent)
            
            # Verify migration worked
            assert agent.id is not None
            assert agent.created_at is not None
            
        finally:
            session.close()

    def test_backward_compatibility(self):
        """Test that migrations maintain backward compatibility"""
        # This would test that existing API endpoints still work
        # after database schema changes
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        
        # Test that old query patterns still work
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            # Create test data
            agent = Agent(
                agent_type=AgentType.GROWTH_STRATEGIST,
                name="Compatibility Test",
                description="Testing backward compatibility",
                capabilities=["growth"],
                pricing_tier="premium",
                is_active=True
            )
            session.add(agent)
            session.commit()
            
            # Test old query patterns
            found_agent = session.query(Agent).filter_by(
                agent_type=AgentType.GROWTH_STRATEGIST
            ).first()
            
            assert found_agent is not None
            assert found_agent.name == "Compatibility Test"
            
        finally:
            session.close()

    def test_performance_after_migration(self):
        """Test that database performance is maintained after migrations"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            # Create test data for performance testing
            agents = []
            for i in range(100):
                agent = Agent(
                    agent_type=f"perf_agent_{i}",
                    name=f"Performance Agent {i}",
                    description=f"Performance test agent {i}",
                    capabilities=[f"capability_{i}"],
                    pricing_tier="standard",
                    is_active=i % 2 == 0
                )
                agents.append(agent)
                session.add(agent)
            
            session.commit()
            
            # Test query performance
            start_time = datetime.utcnow()
            
            # Query that should use indexes
            active_agents = session.query(Agent).filter_by(is_active=True).all()
            
            end_time = datetime.utcnow()
            query_time = (end_time - start_time).total_seconds()
            
            # Should complete quickly with proper indexing
            assert query_time < 1.0
            assert len(active_agents) == 50
            
        finally:
            session.close()


class TestModelIntegration:
    """Test suite for model integration scenarios"""

    def test_complete_agent_workflow(self, db, test_user):
        """Test complete agent workflow from creation to analytics"""
        # 1. Create agent
        agent = Agent(
            agent_type=AgentType.FINANCIAL_COACH,
            name="Integration Test Coach",
            description="Testing complete workflow",
            capabilities=["pricing", "revenue", "optimization"],
            pricing_tier="premium",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
        
        # 2. Create user subscription
        subscription = AgentSubscription(
            user_id=test_user.id,
            tier="pro",
            status="active",
            max_agents=5,
            max_conversations_per_month=1000,
            monthly_fee=99.99
        )
        db.add(subscription)
        db.commit()
        
        # 3. Create agent instance
        instance = AgentInstance(
            agent_id=agent.id,
            user_id=test_user.id,
            name="My Integration Coach",
            status=AgentStatus.ACTIVE,
            config={"max_conversations": 20, "response_time": "fast"},
            total_conversations=10,
            successful_conversations=8,
            total_revenue_generated=800.0
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)
        
        # 4. Create conversations
        conversations = []
        for i in range(3):
            conv = AgentConversation(
                conversation_id=f"integration_conv_{i}",
                agent_instance_id=instance.id,
                status=ConversationStatus.COMPLETED,
                channel="web",
                metadata={"test": f"conversation_{i}"},
                message_count=5 + i,
                total_tokens=500 + i * 100,
                estimated_cost=0.05 + i * 0.01
            )
            conversations.append(conv)
            db.add(conv)
        
        db.commit()
        
        # 5. Create analytics events
        events = []
        for i in range(2):
            event = AIAnalyticsEvent(
                user_id=test_user.id,
                event_type="conversation_completed",
                agent_type="financial_coach",
                event_data={"conversation_id": f"integration_conv_{i}"},
                business_impact={"revenue_generated": 100.0 + i * 50},
                occurred_at=datetime.utcnow() - timedelta(hours=i)
            )
            events.append(event)
            db.add(event)
        
        db.commit()
        
        # 6. Create business metadata
        metadata = BusinessCalendarMetadata(
            user_id=test_user.id,
            google_event_id="integration_event_123",
            appointment_id=1,
            service_category="consultation",
            service_tier="premium",
            client_value_tier="high",
            expected_revenue=150.0,
            actual_revenue=150.0,
            client_ltv=2000.0,
            client_frequency="weekly",
            coaching_opportunities=["upselling", "retention"],
            optimization_flags=["high_value_client"],
            six_fb_compliance_score=95.0
        )
        db.add(metadata)
        db.commit()
        
        # 7. Verify complete workflow
        # Check agent exists and is active
        assert agent.is_active is True
        
        # Check subscription allows agent creation
        assert subscription.can_create_agent() is True
        
        # Check instance performance
        assert instance.success_rate == 80.0
        assert instance.average_revenue_per_conversation == 80.0
        
        # Check conversations are tracked
        total_conversations = db.query(AgentConversation).filter_by(
            agent_instance_id=instance.id
        ).count()
        assert total_conversations == 3
        
        # Check analytics are captured
        total_events = db.query(AIAnalyticsEvent).filter_by(
            user_id=test_user.id
        ).count()
        assert total_events == 2
        
        # Check business metadata is stored
        assert metadata.is_high_value is True
        assert len(metadata.coaching_opportunities) == 2

    def test_data_consistency_across_models(self, db, test_user):
        """Test data consistency across related models"""
        # Create interconnected data
        agent = Agent(
            agent_type=AgentType.BRAND_DEVELOPER,
            name="Consistency Test Agent",
            description="Testing data consistency",
            capabilities=["branding"],
            pricing_tier="premium",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
        
        instance = AgentInstance(
            agent_id=agent.id,
            user_id=test_user.id,
            name="Consistency Test Instance",
            status=AgentStatus.ACTIVE,
            config={},
            total_conversations=5,
            successful_conversations=5,
            total_revenue_generated=500.0
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)
        
        # Create 5 conversations to match total_conversations
        for i in range(5):
            conv = AgentConversation(
                conversation_id=f"consistency_conv_{i}",
                agent_instance_id=instance.id,
                status=ConversationStatus.COMPLETED,
                channel="web",
                message_count=10,
                total_tokens=1000
            )
            db.add(conv)
        
        db.commit()
        
        # Verify consistency
        actual_conversations = db.query(AgentConversation).filter_by(
            agent_instance_id=instance.id
        ).count()
        
        assert actual_conversations == instance.total_conversations
        assert instance.success_rate == 100.0  # All successful

    def test_model_performance_with_relationships(self, db, test_user):
        """Test model performance when loading relationships"""
        # Create agent with many instances and conversations
        agent = Agent(
            agent_type=AgentType.OPERATIONS_OPTIMIZER,
            name="Performance Test Agent",
            description="Testing relationship performance",
            capabilities=["optimization"],
            pricing_tier="standard",
            is_active=True
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
        
        # Create multiple instances
        instances = []
        for i in range(5):
            instance = AgentInstance(
                agent_id=agent.id,
                user_id=test_user.id,
                name=f"Performance Instance {i}",
                status=AgentStatus.ACTIVE,
                config={}
            )
            instances.append(instance)
            db.add(instance)
        
        db.commit()
        for instance in instances:
            db.refresh(instance)
        
        # Create conversations for each instance
        for instance in instances:
            for j in range(3):  # 3 conversations per instance
                conv = AgentConversation(
                    conversation_id=f"perf_conv_{instance.id}_{j}",
                    agent_instance_id=instance.id,
                    status=ConversationStatus.ACTIVE,
                    channel="web"
                )
                db.add(conv)
        
        db.commit()
        
        # Test query performance with relationships
        start_time = datetime.utcnow()
        
        # Load agent with all instances and their conversations
        loaded_agent = db.query(Agent).filter_by(id=agent.id).first()
        
        # Access relationships to trigger loading
        instance_count = len(loaded_agent.instances)
        total_conversations = sum(len(inst.conversations) for inst in loaded_agent.instances)
        
        end_time = datetime.utcnow()
        query_time = (end_time - start_time).total_seconds()
        
        # Verify data is correct
        assert instance_count == 5
        assert total_conversations == 15  # 5 instances * 3 conversations
        
        # Should complete in reasonable time
        assert query_time < 2.0
"""
Comprehensive tests for AI Agents API endpoints

Tests cover:
- Agent template management
- Agent instance creation and management
- Conversation handling
- Analytics and reporting
- Subscription management
- AI provider integration
- Error handling
- Authentication and authorization
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from httpx import AsyncClient
from sqlalchemy.orm import Session

from models import User, Agent, AgentInstance, AgentConversation, AgentSubscription
from models import AgentType, AgentStatus, ConversationStatus


class TestAgentsAPI:
    """Test suite for AI Agents API endpoints"""

    @pytest.fixture
    def mock_agent_orchestration_service(self):
        """Mock agent orchestration service"""
        with patch('routers.agents.agent_orchestration_service') as mock:
            # Mock agent instance
            mock_instance = Mock()
            mock_instance.id = 1
            mock_instance.agent_id = 1
            mock_instance.user_id = 1
            mock_instance.name = "Test Financial Coach"
            mock_instance.status = AgentStatus.ACTIVE
            mock_instance.config = {"max_conversations": 10}
            mock_instance.total_conversations = 5
            mock_instance.successful_conversations = 4
            mock_instance.total_revenue_generated = 500.0
            
            mock.create_agent_instance.return_value = mock_instance
            mock.activate_agent.return_value = mock_instance
            mock.pause_agent.return_value = mock_instance
            mock.get_agent_analytics.return_value = {
                'total_revenue': 1000.0,
                'total_conversations': 25,
                'success_rate': 80.0,
                'avg_response_time': 2.5,
                'roi': 5.2,
                'revenue_by_agent_type': {'financial_coach': 600.0, 'growth_strategist': 400.0},
                'conversation_trends': [],
                'top_performing_agents': [],
                'optimization_recommendations': [],
                'competitive_benchmarks': {'industry_averages': {'success_rate': 65, 'roi': 3.2}},
                'current_period_performance': {'today_conversations': 3, 'today_revenue': 150.0},
                'date_range': {'start': '2024-01-01', 'end': '2024-01-31', 'days': 30},
                'last_updated': datetime.utcnow().isoformat()
            }
            
            yield mock

    @pytest.fixture
    def mock_agent_templates(self):
        """Mock agent templates service"""
        with patch('routers.agents.agent_templates') as mock:
            mock.get_all_templates.return_value = {
                'financial_coach': {
                    'name': 'Financial Coach',
                    'description': 'Revenue optimization and pricing strategies',
                    'personality': 'analytical and data-driven',
                    'capabilities': ['pricing_analysis', 'revenue_optimization'],
                    'pricing_tier': 'standard'
                },
                'growth_strategist': {
                    'name': 'Growth Strategist',
                    'description': 'Client acquisition and retention insights',
                    'personality': 'motivational and strategic',
                    'capabilities': ['client_retention', 'acquisition_strategies'],
                    'pricing_tier': 'premium'
                }
            }
            
            yield mock

    @pytest.fixture
    def mock_ai_provider_manager(self):
        """Mock AI provider manager"""
        with patch('routers.agents.AIProviderManager') as mock:
            manager_instance = Mock()
            manager_instance.get_available_providers.return_value = ['openai', 'anthropic']
            manager_instance.get_provider_info.return_value = {
                'openai': {'models': ['gpt-4', 'gpt-3.5-turbo'], 'status': 'active'},
                'anthropic': {'models': ['claude-3', 'claude-2'], 'status': 'active'}
            }
            manager_instance.validate_all_providers.return_value = {
                'openai': True,
                'anthropic': True
            }
            manager_instance.estimate_cost.return_value = {
                'openai': {'estimated_cost': 0.05, 'tokens': 500},
                'anthropic': {'estimated_cost': 0.04, 'tokens': 500}
            }
            
            mock.return_value = manager_instance
            yield manager_instance

    @pytest.fixture
    def sample_agent(self, db: Session):
        """Create a sample agent for testing"""
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
        return agent

    @pytest.fixture
    def sample_agent_instance(self, db: Session, test_user: User, sample_agent: Agent):
        """Create a sample agent instance for testing"""
        instance = AgentInstance(
            agent_id=sample_agent.id,
            user_id=test_user.id,
            name="My Financial Coach",
            status=AgentStatus.ACTIVE,
            config={"max_conversations": 10},
            total_conversations=5,
            successful_conversations=4,
            total_revenue_generated=500.0
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)
        return instance

    @pytest.fixture
    def sample_conversation(self, db: Session, sample_agent_instance: AgentInstance):
        """Create a sample conversation for testing"""
        conversation = AgentConversation(
            conversation_id="conv_123",
            agent_instance_id=sample_agent_instance.id,
            status=ConversationStatus.ACTIVE,
            channel="web",
            metadata={"client_id": "client_123"},
            message_count=5,
            total_tokens=1000
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation

    @pytest.fixture
    def sample_subscription(self, db: Session, test_user: User):
        """Create a sample subscription for testing"""
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
        return subscription

    # Agent Template Tests

    async def test_get_agent_templates_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_agent_templates: Mock
    ):
        """Test successful agent templates retrieval"""
        response = await async_client.get(
            "/agents/templates",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 2
        assert data[0]["agent_type"] == "financial_coach"
        assert data[0]["name"] == "Financial Coach"
        assert data[1]["agent_type"] == "growth_strategist"
        assert data[1]["name"] == "Growth Strategist"

    async def test_get_specific_agent_template_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_agent_templates: Mock
    ):
        """Test successful specific agent template retrieval"""
        response = await async_client.get(
            "/agents/templates/financial_coach",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["agent_type"] == "financial_coach"
        assert data["name"] == "Financial Coach"
        assert data["description"] == "Revenue optimization and pricing strategies"
        assert "capabilities" in data
        assert "pricing_tier" in data

    async def test_get_agent_template_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_agent_templates: Mock
    ):
        """Test agent template not found"""
        response = await async_client.get(
            "/agents/templates/nonexistent_agent",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "Template not found" in response.json()["detail"]

    # Agent Management Tests

    async def test_create_agent_success(
        self,
        async_client: AsyncClient,
        admin_auth_headers: dict
    ):
        """Test successful agent creation (admin only)"""
        agent_data = {
            "agent_type": "brand_developer",
            "name": "Brand Developer",
            "description": "Brand and experience specialist",
            "capabilities": ["brand_development", "customer_experience"],
            "pricing_tier": "premium",
            "is_active": True
        }
        
        response = await async_client.post(
            "/agents/",
            headers=admin_auth_headers,
            json=agent_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["agent_type"] == "brand_developer"
        assert data["name"] == "Brand Developer"
        assert data["is_active"] is True

    async def test_create_agent_unauthorized(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test agent creation with non-admin user"""
        agent_data = {
            "agent_type": "brand_developer",
            "name": "Brand Developer",
            "description": "Brand specialist",
            "capabilities": ["brand_development"],
            "pricing_tier": "premium",
            "is_active": True
        }
        
        response = await async_client.post(
            "/agents/",
            headers=auth_headers,
            json=agent_data
        )
        
        assert response.status_code == 403

    async def test_create_agent_duplicate_type(
        self,
        async_client: AsyncClient,
        admin_auth_headers: dict,
        sample_agent: Agent
    ):
        """Test creating agent with duplicate type"""
        agent_data = {
            "agent_type": "financial_coach",  # Same as existing
            "name": "Another Financial Coach",
            "description": "Duplicate agent",
            "capabilities": ["pricing"],
            "pricing_tier": "standard",
            "is_active": True
        }
        
        response = await async_client.post(
            "/agents/",
            headers=admin_auth_headers,
            json=agent_data
        )
        
        assert response.status_code == 400
        assert "Agent type already exists" in response.json()["detail"]

    async def test_list_agents_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent: Agent
    ):
        """Test successful agents listing"""
        response = await async_client.get(
            "/agents/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) >= 1
        agent = data[0]
        assert "id" in agent
        assert "agent_type" in agent
        assert "name" in agent
        assert "description" in agent

    async def test_list_agents_filter_active(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent: Agent
    ):
        """Test agents listing with active filter"""
        response = await async_client.get(
            "/agents/?is_active=true",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for agent in data:
            assert agent["is_active"] is True

    async def test_get_agent_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent: Agent
    ):
        """Test successful agent retrieval"""
        response = await async_client.get(
            f"/agents/{sample_agent.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == sample_agent.id
        assert data["name"] == sample_agent.name
        assert data["agent_type"] == sample_agent.agent_type

    async def test_get_agent_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test agent retrieval when not found"""
        response = await async_client.get(
            "/agents/99999",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "Agent not found" in response.json()["detail"]

    # Agent Instance Tests

    async def test_create_agent_instance_success(
        self,
        async_client: AsyncClient,
        admin_auth_headers: dict,
        sample_agent: Agent,
        mock_agent_orchestration_service: Mock
    ):
        """Test successful agent instance creation"""
        instance_data = {
            "agent_id": sample_agent.id,
            "config": {"max_conversations": 15}
        }
        
        response = await async_client.post(
            "/agents/instances",
            headers=admin_auth_headers,
            json=instance_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == 1
        assert data["agent_id"] == sample_agent.id
        assert data["name"] == "Test Financial Coach"
        assert data["status"] == "active"

    async def test_create_agent_instance_unauthorized(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent: Agent
    ):
        """Test agent instance creation with non-admin user"""
        instance_data = {
            "agent_id": sample_agent.id,
            "config": {"max_conversations": 15}
        }
        
        response = await async_client.post(
            "/agents/instances",
            headers=auth_headers,
            json=instance_data
        )
        
        assert response.status_code == 403
        assert "Admin access required" in response.json()["detail"]

    async def test_list_agent_instances_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent_instance: AgentInstance
    ):
        """Test successful agent instances listing"""
        response = await async_client.get(
            "/agents/instances",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) >= 1
        instance = data[0]
        assert instance["id"] == sample_agent_instance.id
        assert instance["name"] == sample_agent_instance.name

    async def test_list_agent_instances_filter_status(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent_instance: AgentInstance
    ):
        """Test agent instances listing with status filter"""
        response = await async_client.get(
            "/agents/instances?status=active",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for instance in data:
            assert instance["status"] == "active"

    async def test_get_agent_instance_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent_instance: AgentInstance
    ):
        """Test successful agent instance retrieval"""
        response = await async_client.get(
            f"/agents/instances/{sample_agent_instance.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == sample_agent_instance.id
        assert data["name"] == sample_agent_instance.name
        assert data["status"] == sample_agent_instance.status

    async def test_get_agent_instance_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test agent instance retrieval when not found"""
        response = await async_client.get(
            "/agents/instances/99999",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "Agent instance not found" in response.json()["detail"]

    async def test_update_agent_instance_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent_instance: AgentInstance
    ):
        """Test successful agent instance update"""
        update_data = {
            "name": "Updated Financial Coach",
            "config": {"max_conversations": 20}
        }
        
        response = await async_client.put(
            f"/agents/instances/{sample_agent_instance.id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "Updated Financial Coach"
        assert data["config"]["max_conversations"] == 20

    async def test_activate_agent_instance_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent_instance: AgentInstance,
        mock_agent_orchestration_service: Mock
    ):
        """Test successful agent instance activation"""
        response = await async_client.post(
            f"/agents/instances/{sample_agent_instance.id}/activate",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == 1
        assert data["status"] == "active"
        
        # Verify orchestration service was called
        mock_agent_orchestration_service.activate_agent.assert_called_once()

    async def test_pause_agent_instance_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent_instance: AgentInstance,
        mock_agent_orchestration_service: Mock
    ):
        """Test successful agent instance pausing"""
        response = await async_client.post(
            f"/agents/instances/{sample_agent_instance.id}/pause",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == 1
        
        # Verify orchestration service was called
        mock_agent_orchestration_service.pause_agent.assert_called_once()

    async def test_delete_agent_instance_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent_instance: AgentInstance
    ):
        """Test successful agent instance deletion (soft delete)"""
        response = await async_client.delete(
            f"/agents/instances/{sample_agent_instance.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "deleted" in data["message"]

    # Conversation Tests

    async def test_list_conversations_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_conversation: AgentConversation
    ):
        """Test successful conversations listing"""
        response = await async_client.get(
            "/agents/conversations",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) >= 1
        conversation = data[0]
        assert conversation["conversation_id"] == sample_conversation.conversation_id
        assert conversation["status"] == sample_conversation.status

    async def test_list_conversations_with_filters(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_conversation: AgentConversation
    ):
        """Test conversations listing with filters"""
        response = await async_client.get(
            f"/agents/conversations?instance_id={sample_conversation.agent_instance_id}&status=active&limit=10&offset=0",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) <= 10
        if data:
            assert data[0]["status"] == "active"

    async def test_get_conversation_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_conversation: AgentConversation
    ):
        """Test successful conversation retrieval"""
        response = await async_client.get(
            f"/agents/conversations/{sample_conversation.conversation_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["conversation_id"] == sample_conversation.conversation_id
        assert data["status"] == sample_conversation.status
        assert data["message_count"] == sample_conversation.message_count

    async def test_get_conversation_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test conversation retrieval when not found"""
        response = await async_client.get(
            "/agents/conversations/nonexistent_conv",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "Conversation not found" in response.json()["detail"]

    async def test_send_conversation_message_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_conversation: AgentConversation
    ):
        """Test successful conversation message sending"""
        message_data = {
            "content": "Test message",
            "channel": "web"
        }
        
        response = await async_client.post(
            f"/agents/conversations/{sample_conversation.conversation_id}/message",
            headers=auth_headers,
            json=message_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "queued for processing" in data["message"]

    # Analytics Tests

    async def test_get_agent_analytics_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_agent_orchestration_service: Mock
    ):
        """Test successful agent analytics retrieval"""
        response = await async_client.get(
            "/agents/analytics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_revenue" in data
        assert "total_conversations" in data
        assert "success_rate" in data
        assert "avg_response_time" in data
        assert "roi" in data
        assert "revenue_by_agent_type" in data
        assert "optimization_recommendations" in data
        assert "competitive_benchmarks" in data
        
        assert data["total_revenue"] == 1000.0
        assert data["success_rate"] == 80.0

    async def test_get_agent_analytics_with_date_range(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_agent_orchestration_service: Mock
    ):
        """Test agent analytics with custom date range"""
        start_date = "2024-01-01T00:00:00Z"
        end_date = "2024-01-31T23:59:59Z"
        
        response = await async_client.get(
            f"/agents/analytics?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "date_range" in data
        assert data["date_range"]["days"] == 30

    async def test_get_instance_analytics_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_agent_instance: AgentInstance
    ):
        """Test successful instance-specific analytics retrieval"""
        response = await async_client.get(
            f"/agents/instances/{sample_agent_instance.id}/analytics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["instance_id"] == sample_agent_instance.id
        assert data["name"] == sample_agent_instance.name
        assert data["total_conversations"] == sample_agent_instance.total_conversations
        assert data["successful_conversations"] == sample_agent_instance.successful_conversations
        assert "success_rate" in data

    # Subscription Tests

    async def test_get_subscription_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_subscription: AgentSubscription
    ):
        """Test successful subscription retrieval"""
        response = await async_client.get(
            "/agents/subscription",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tier"] == sample_subscription.tier
        assert data["status"] == sample_subscription.status
        assert data["max_agents"] == sample_subscription.max_agents
        assert data["monthly_fee"] == sample_subscription.monthly_fee

    async def test_get_subscription_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test subscription retrieval when no subscription exists"""
        response = await async_client.get(
            "/agents/subscription",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "No active subscription" in response.json()["detail"]

    async def test_create_subscription_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test successful subscription creation"""
        subscription_data = {
            "tier": "pro",
            "max_agents": 5,
            "max_conversations_per_month": 1000,
            "monthly_fee": 99.99
        }
        
        response = await async_client.post(
            "/agents/subscription",
            headers=auth_headers,
            json=subscription_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tier"] == "pro"
        assert data["max_agents"] == 5
        assert data["monthly_fee"] == 99.99

    async def test_update_existing_subscription(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_subscription: AgentSubscription
    ):
        """Test updating existing subscription"""
        update_data = {
            "tier": "enterprise",
            "max_agents": 10,
            "monthly_fee": 199.99
        }
        
        response = await async_client.post(
            "/agents/subscription",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tier"] == "enterprise"
        assert data["max_agents"] == 10
        assert data["monthly_fee"] == 199.99

    # AI Provider Tests

    async def test_get_ai_providers_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_ai_provider_manager: Mock
    ):
        """Test successful AI providers retrieval"""
        response = await async_client.get(
            "/agents/providers",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "available_providers" in data
        assert "provider_info" in data
        assert "validation_status" in data
        
        assert len(data["available_providers"]) == 2
        assert "openai" in data["available_providers"]
        assert "anthropic" in data["available_providers"]

    async def test_estimate_cost_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_ai_provider_manager: Mock
    ):
        """Test successful cost estimation"""
        request_data = {
            "messages": [{"role": "user", "content": "Hello"}],
            "provider": "openai",
            "max_tokens": 500
        }
        
        response = await async_client.post(
            "/agents/providers/estimate-cost",
            headers=auth_headers,
            json=request_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "estimated_costs" in data
        assert "openai" in data["estimated_costs"]
        assert "estimated_cost" in data["estimated_costs"]["openai"]

    # Error Handling Tests

    async def test_service_error_handling(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        mock_agent_orchestration_service: Mock
    ):
        """Test handling of service errors"""
        mock_agent_orchestration_service.create_agent_instance.side_effect = Exception("Service error")
        
        instance_data = {
            "agent_id": 1,
            "config": {"max_conversations": 15}
        }
        
        response = await async_client.post(
            "/agents/instances",
            headers={"Authorization": "Bearer admin_token"},  # Mock admin token
            json=instance_data
        )
        
        # Should handle error gracefully
        assert response.status_code in [500, 403]  # Either service error or auth error

    async def test_value_error_handling(
        self,
        async_client: AsyncClient,
        admin_auth_headers: dict,
        mock_agent_orchestration_service: Mock
    ):
        """Test handling of value errors"""
        mock_agent_orchestration_service.create_agent_instance.side_effect = ValueError("Invalid input")
        
        instance_data = {
            "agent_id": 1,
            "config": {"max_conversations": 15}
        }
        
        response = await async_client.post(
            "/agents/instances",
            headers=admin_auth_headers,
            json=instance_data
        )
        
        assert response.status_code == 400

    # Authorization Tests

    async def test_unauthorized_access(self, async_client: AsyncClient):
        """Test all endpoints require authentication"""
        endpoints = [
            ("/agents/templates", "GET"),
            ("/agents/", "GET"),
            ("/agents/instances", "GET"),
            ("/agents/conversations", "GET"),
            ("/agents/analytics", "GET"),
            ("/agents/subscription", "GET"),
            ("/agents/providers", "GET"),
        ]
        
        for endpoint, method in endpoints:
            if method == "GET":
                response = await async_client.get(endpoint)
            else:
                response = await async_client.post(endpoint, json={})
            
            assert response.status_code == 401, f"Endpoint {endpoint} should require auth"

    async def test_admin_only_endpoints(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test admin-only endpoints reject regular users"""
        admin_endpoints = [
            ("/agents/", "POST", {"agent_type": "test", "name": "Test"}),
        ]
        
        for endpoint, method, data in admin_endpoints:
            if method == "POST":
                response = await async_client.post(endpoint, headers=auth_headers, json=data)
            
            assert response.status_code == 403, f"Endpoint {endpoint} should require admin"

    # Input Validation Tests

    async def test_input_validation(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test input validation for various endpoints"""
        
        # Test invalid subscription data
        response = await async_client.post(
            "/agents/subscription",
            headers=auth_headers,
            json={"invalid_field": "value"}
        )
        assert response.status_code == 422
        
        # Test invalid analytics date format
        response = await async_client.get(
            "/agents/analytics?start_date=invalid_date",
            headers=auth_headers
        )
        # Should handle gracefully and use defaults
        assert response.status_code in [200, 422]

    async def test_pagination_limits(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test pagination limits are enforced"""
        response = await async_client.get(
            "/agents/conversations?limit=150",  # Above max of 100
            headers=auth_headers
        )
        
        assert response.status_code == 422
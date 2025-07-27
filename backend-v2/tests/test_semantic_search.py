"""
Tests for Semantic Search Service using Voyage.ai embeddings
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy.orm import Session

from services.semantic_search_service import SemanticSearchService, SemanticMatch
from models import User, Service, Appointment


class TestSemanticSearchService:
    """Test suite for SemanticSearchService"""
    
    @pytest.fixture
    def mock_voyageai_client(self):
        """Mock Voyage.ai client"""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.embeddings = [[0.1, 0.2, 0.3, 0.4, 0.5]]
        mock_client.embed.return_value = mock_response
        return mock_client
    
    @pytest.fixture
    def semantic_service(self, mock_voyageai_client):
        """Create SemanticSearchService with mocked client"""
        service = SemanticSearchService()
        service.client = mock_voyageai_client
        return service
    
    @pytest.fixture
    def sample_barber(self):
        """Create sample barber user"""
        return User(
            id=1,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            unified_role="BARBER",
            bio="Experienced barber specializing in fades and beard trimming. 5 years experience."
        )
    
    @pytest.fixture
    def sample_service(self):
        """Create sample service"""
        return Service(
            id=1,
            name="Classic Haircut",
            description="Traditional men's haircut with styling",
            price=25.00,
            duration=30,
            category="Haircuts",
            is_active=True
        )
    
    def test_initialization_with_api_key(self):
        """Test service initializes correctly with API key"""
        with patch.dict('os.environ', {'VOYAGE_API_KEY': 'test-key'}):
            with patch('voyageai.Client') as mock_client:
                service = SemanticSearchService()
                mock_client.assert_called_once_with(api_key='test-key')
                assert service.model == "voyage-3-large"
                assert service.embedding_dimension == 1024
    
    def test_initialization_without_api_key(self):
        """Test service handles missing API key gracefully"""
        with patch.dict('os.environ', {}, clear=True):
            service = SemanticSearchService()
            assert service.client is None
            assert not service.is_available()
    
    @pytest.mark.asyncio
    async def test_generate_embedding_success(self, semantic_service):
        """Test successful embedding generation"""
        text = "Experienced barber specializing in fades"
        
        embedding = await semantic_service.generate_embedding(text)
        
        assert embedding is not None
        assert len(embedding) == 5
        assert embedding == [0.1, 0.2, 0.3, 0.4, 0.5]
        
        # Verify client was called with correct parameters
        semantic_service.client.embed.assert_called_once_with(
            texts=[text],
            model="voyage-3-large",
            input_type="document"
        )
    
    @pytest.mark.asyncio
    async def test_generate_embedding_with_query_type(self, semantic_service):
        """Test embedding generation with query input type"""
        text = "looking for barber with fade experience"
        
        embedding = await semantic_service.generate_embedding(text, input_type="query")
        
        assert embedding is not None
        semantic_service.client.embed.assert_called_once_with(
            texts=[text],
            model="voyage-3-large",
            input_type="query"
        )
    
    @pytest.mark.asyncio
    async def test_generate_embedding_failure(self, semantic_service):
        """Test handling of embedding generation failure"""
        semantic_service.client.embed.side_effect = Exception("API Error")
        
        embedding = await semantic_service.generate_embedding("test text")
        
        assert embedding is None
    
    @pytest.mark.asyncio
    async def test_generate_embeddings_batch(self, semantic_service):
        """Test batch embedding generation"""
        texts = ["text 1", "text 2", "text 3"]
        semantic_service.client.embed.return_value.embeddings = [
            [0.1, 0.2], [0.3, 0.4], [0.5, 0.6]
        ]
        
        embeddings = await semantic_service.generate_embeddings_batch(texts)
        
        assert len(embeddings) == 3
        assert embeddings[0] == [0.1, 0.2]
        assert embeddings[1] == [0.3, 0.4]
        assert embeddings[2] == [0.5, 0.6]
    
    def test_calculate_similarity(self, semantic_service):
        """Test cosine similarity calculation"""
        embedding1 = [1.0, 0.0, 0.0]
        embedding2 = [0.0, 1.0, 0.0]
        embedding3 = [1.0, 0.0, 0.0]
        
        # Orthogonal vectors should have similarity ~0.5 (normalized from 0)
        similarity1 = semantic_service.calculate_similarity(embedding1, embedding2)
        assert abs(similarity1 - 0.5) < 0.01
        
        # Identical vectors should have similarity 1.0
        similarity2 = semantic_service.calculate_similarity(embedding1, embedding3)
        assert abs(similarity2 - 1.0) < 0.01
    
    def test_clean_text(self, semantic_service):
        """Test text cleaning functionality"""
        # Test whitespace removal
        assert semantic_service._clean_text("  hello   world  ") == "hello world"
        
        # Test empty text
        assert semantic_service._clean_text("") == ""
        assert semantic_service._clean_text(None) == ""
        
        # Test long text truncation
        long_text = "word " * 2000  # Very long text
        cleaned = semantic_service._clean_text(long_text)
        assert len(cleaned) <= 8000
        assert not cleaned.endswith(" ")  # Should end at word boundary
    
    def test_create_barber_description(self, semantic_service, sample_barber):
        """Test barber description creation"""
        description = semantic_service._create_barber_description(sample_barber)
        
        assert "Experienced barber specializing in fades and beard trimming" in description
        assert "Professional barber" in description
        assert sample_barber.bio in description
    
    def test_create_service_description(self, semantic_service, sample_service):
        """Test service description creation"""
        description = semantic_service._create_service_description(sample_service)
        
        assert sample_service.name in description
        assert sample_service.description in description
        assert f"Category: {sample_service.category}" in description
        assert f"Duration: {sample_service.duration} minutes" in description
        assert f"Price: ${sample_service.price}" in description
    
    @pytest.mark.asyncio
    async def test_find_similar_barbers_success(self, semantic_service):
        """Test finding similar barbers with semantic search"""
        # Mock database session
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [
            User(
                id=1,
                first_name="John",
                last_name="Doe",
                email="john@example.com",
                unified_role="BARBER",
                bio="Expert in fades and modern cuts"
            )
        ]
        
        # Mock embedding generation to return high similarity
        semantic_service.generate_embedding = AsyncMock()
        semantic_service.generate_embedding.side_effect = [
            [1.0, 0.0, 0.0],  # Query embedding
            [0.9, 0.1, 0.0]   # Barber embedding (high similarity)
        ]
        
        query = "Looking for fade specialist"
        matches = await semantic_service.find_similar_barbers(query, mock_db, limit=5)
        
        assert len(matches) == 1
        assert matches[0].entity_type == "barber"
        assert matches[0].title == "John Doe"
        assert matches[0].similarity_score > 0.6
        assert matches[0].metadata["email"] == "john@example.com"
    
    @pytest.mark.asyncio
    async def test_find_similar_barbers_fallback(self, semantic_service):
        """Test fallback to keyword search when semantic search fails"""
        # Make semantic search unavailable
        semantic_service.client = None
        
        # Mock database session
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = [
            User(
                id=1,
                first_name="John",
                last_name="Doe",
                email="john@example.com",
                unified_role="BARBER",
                bio="Expert in fades and modern cuts"
            )
        ]
        
        query = "fade"
        matches = await semantic_service.find_similar_barbers(query, mock_db, limit=5)
        
        assert len(matches) == 1
        assert matches[0].entity_type == "barber"
        assert matches[0].similarity_score == 0.5  # Default fallback score
    
    @pytest.mark.asyncio
    async def test_find_similar_services_success(self, semantic_service):
        """Test finding similar services with semantic search"""
        # Mock database session
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [
            Service(
                id=1,
                name="Classic Haircut",
                description="Traditional men's haircut",
                price=25.00,
                duration=30,
                category="Haircuts",
                is_active=True
            )
        ]
        
        # Mock embedding generation
        semantic_service.generate_embedding = AsyncMock()
        semantic_service.generate_embedding.side_effect = [
            [1.0, 0.0, 0.0],  # Query embedding
            [0.8, 0.2, 0.0]   # Service embedding (good similarity)
        ]
        
        query = "traditional haircut"
        matches = await semantic_service.find_similar_services(query, mock_db, limit=5)
        
        assert len(matches) == 1
        assert matches[0].entity_type == "service"
        assert matches[0].title == "Classic Haircut"
        assert matches[0].similarity_score > 0.5
        assert matches[0].metadata["price"] == 25.00
    
    @pytest.mark.asyncio
    async def test_recommend_barber_for_client_with_history(self, semantic_service):
        """Test barber recommendations based on client history"""
        # Mock database session
        mock_db = Mock(spec=Session)
        
        # Mock appointment query
        mock_appointment_query = Mock()
        mock_db.query.return_value = mock_appointment_query
        mock_appointment_query.filter.return_value = mock_appointment_query
        mock_appointment_query.order_by.return_value = mock_appointment_query
        mock_appointment_query.limit.return_value = mock_appointment_query
        mock_appointment_query.all.return_value = [
            Appointment(
                id=1,
                client_id=1,
                service_name="Fade Haircut",
                notes="Likes short sides"
            )
        ]
        
        # Mock find_similar_barbers
        semantic_service.find_similar_barbers = AsyncMock()
        semantic_service.find_similar_barbers.return_value = [
            SemanticMatch(
                entity_id=2,
                entity_type="barber",
                title="Jane Smith",
                description="Fade specialist",
                similarity_score=0.8,
                metadata={"specialties": ["fades"]}
            )
        ]
        
        client_id = 1
        recommendations = await semantic_service.recommend_barber_for_client(client_id, mock_db)
        
        assert len(recommendations) == 1
        assert recommendations[0].title == "Jane Smith"
        assert recommendations[0].similarity_score == 0.8
        
        # Verify find_similar_barbers was called with client preferences
        semantic_service.find_similar_barbers.assert_called_once()
        call_args = semantic_service.find_similar_barbers.call_args[0]
        assert "Fade Haircut" in call_args[0]  # Client preferences should include service
    
    @pytest.mark.asyncio
    async def test_recommend_barber_for_client_no_history(self, semantic_service):
        """Test barber recommendations for client with no history"""
        # Mock database session
        mock_db = Mock(spec=Session)
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        
        # Mock get_popular_barbers
        semantic_service._get_popular_barbers = AsyncMock()
        semantic_service._get_popular_barbers.return_value = [
            SemanticMatch(
                entity_id=1,
                entity_type="barber",
                title="Popular Barber",
                description="High appointment count",
                similarity_score=0.7,
                metadata={"appointment_count": 50}
            )
        ]
        
        client_id = 1
        recommendations = await semantic_service.recommend_barber_for_client(client_id, mock_db)
        
        assert len(recommendations) == 1
        assert recommendations[0].title == "Popular Barber"
        semantic_service._get_popular_barbers.assert_called_once_with(mock_db, 5)
    
    def test_extract_client_preferences(self, semantic_service):
        """Test extracting client preferences from appointment history"""
        appointments = [
            Appointment(
                service_name="Fade Haircut",
                notes="Likes it short on the sides"
            ),
            Appointment(
                service_name="Beard Trim",
                notes="Keep mustache longer"
            )
        ]
        
        preferences = semantic_service._extract_client_preferences(appointments)
        
        assert "Fade Haircut" in preferences
        assert "Beard Trim" in preferences
        assert "Likes it short" in preferences
        assert "Keep mustache longer" in preferences


class TestSemanticSearchIntegration:
    """Integration tests for semantic search functionality"""
    
    @pytest.mark.asyncio
    async def test_semantic_search_unavailable_graceful_degradation(self):
        """Test that system works when semantic search is unavailable"""
        service = SemanticSearchService()
        service.client = None  # Simulate unavailable service
        
        # Mock database
        mock_db = Mock(spec=Session)
        mock_db.query.return_value.filter.return_value.limit.return_value.all.return_value = []
        
        # Should not raise exception, should return empty results
        results = await service.find_similar_barbers("test query", mock_db)
        assert isinstance(results, list)
        assert len(results) == 0


if __name__ == "__main__":
    pytest.main([__file__])
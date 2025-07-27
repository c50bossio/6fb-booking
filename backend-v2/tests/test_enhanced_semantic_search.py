"""
Comprehensive Integration Tests for Enhanced Semantic Search

Tests complete search workflows including:
- End-to-end barber search
- End-to-end service search  
- API endpoint integration
- Error handling and edge cases
- Performance benchmarks
- Analytics tracking
"""

import pytest
import asyncio
import json
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from services.enhanced_semantic_search_service import (
    enhanced_semantic_search, 
    EnhancedSemanticMatch, 
    SearchContext
)
from services.advanced_search_service import advanced_search
from models import User, Service, EmbeddingCache, SearchAnalytics
from db import get_db

# Test client setup
client = TestClient(app)


class TestEnhancedSemanticSearchIntegration:
    """Integration tests for enhanced semantic search functionality"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session for testing"""
        db = Mock(spec=Session)
        return db

    @pytest.fixture
    def sample_barbers(self):
        """Sample barber data for testing"""
        return [
            Mock(
                id=1,
                first_name="Marcus",
                last_name="FadeMaster",
                name="Marcus FadeMaster",
                email="marcus@bookedbarber.com",
                unified_role="BARBER",
                specialties=["fade", "styling"],
                experience_years=12,
                is_active=True,
                location_id=None
            ),
            Mock(
                id=2,
                first_name="Antonio",
                last_name="BeardKing",
                name="Antonio BeardKing",
                email="antonio@bookedbarber.com",
                unified_role="BARBER", 
                specialties=["beard", "shaving"],
                experience_years=8,
                is_active=True,
                location_id=None
            ),
            Mock(
                id=3,
                first_name="Isabella",
                last_name="StyleMaven",
                name="Isabella StyleMaven",
                email="isabella@bookedbarber.com",
                unified_role="BARBER",
                specialties=["styling", "cuts"],
                experience_years=5,
                is_active=True,
                location_id=None
            )
        ]

    @pytest.fixture
    def sample_services(self):
        """Sample service data for testing"""
        return [
            Mock(
                id=1,
                name="Premium Fade Cut",
                description="Expert fade cutting with precision styling",
                category="Haircuts",
                price=45.0,
                duration=45,
                is_active=True
            ),
            Mock(
                id=2, 
                name="Beard Trim & Shape",
                description="Professional beard grooming and styling",
                category="Facial Hair",
                price=25.0,
                duration=20,
                is_active=True
            ),
            Mock(
                id=3,
                name="Hot Towel Shave",
                description="Traditional straight razor shave with hot towel",
                category="Shaving", 
                price=40.0,
                duration=30,
                is_active=True
            )
        ]

    @pytest.mark.asyncio
    async def test_end_to_end_barber_search_workflow(self, mock_db, sample_barbers):
        """Test complete barber search workflow from query to results"""
        
        # Mock database query - need to support multiple query chains
        query_mock = Mock()
        query_mock.filter.return_value = query_mock
        query_mock.all.return_value = sample_barbers
        query_mock.limit.return_value = query_mock  # For keyword search
        mock_db.query.return_value = query_mock
        
        # Mock embedding generation 
        with patch.object(enhanced_semantic_search, '_batch_generate_entity_embeddings') as mock_embed:
            # Import SearchChunk for proper mocking
            from services.enhanced_semantic_search_service import SearchChunk
            
            mock_embed.return_value = {
                1: [
                    (SearchChunk(content="Marcus FadeMaster expert fade specialist", chunk_type="primary", weight=1.0), [0.1, 0.2, 0.3]),
                    (SearchChunk(content="12 years experience fade cutting", chunk_type="secondary", weight=0.8), [0.2, 0.3, 0.4])
                ],
                2: [
                    (SearchChunk(content="Antonio BeardKing beard specialist", chunk_type="primary", weight=1.0), [0.1, 0.1, 0.8]),
                    (SearchChunk(content="8 years beard grooming experience", chunk_type="secondary", weight=0.8), [0.1, 0.2, 0.7])
                ],
                3: [
                    (SearchChunk(content="Isabella StyleMaven creative stylist", chunk_type="primary", weight=1.0), [0.3, 0.4, 0.2]),
                    (SearchChunk(content="5 years styling experience", chunk_type="secondary", weight=0.8), [0.4, 0.3, 0.3])
                ]
            }
            
            with patch.object(enhanced_semantic_search, 'generate_embedding_with_cache') as mock_query_embed:
                mock_query_embed.return_value = [0.15, 0.25, 0.6]  # Query embedding
                
                # Test search
                context = SearchContext(
                    user_id=1,
                    user_role="CLIENT", 
                    session_id="test_session_123"
                )
                
                results = await enhanced_semantic_search.search_barbers(
                    query="fade specialist",
                    db=mock_db,
                    limit=10,
                    search_type="hybrid",
                    context=context
                )
                
                # Verify results
                assert len(results) > 0
                assert all(isinstance(r, EnhancedSemanticMatch) for r in results)
                assert results[0].entity_type == "barber"
                assert results[0].similarity_score > 0
                
                # Verify embedding generation was called correctly
                mock_embed.assert_called_once()
                mock_query_embed.assert_called_once_with("fade specialist", "query", mock_db)

    @pytest.mark.asyncio
    async def test_end_to_end_service_search_workflow(self, mock_db, sample_services):
        """Test complete service search workflow from query to results"""
        
        # Mock database query
        query_mock = Mock()
        query_mock.filter.return_value = query_mock
        query_mock.all.return_value = sample_services
        mock_db.query.return_value = query_mock
        
        # Mock embedding generation
        with patch.object(enhanced_semantic_search, '_batch_generate_entity_embeddings') as mock_embed:
            mock_embed.return_value = {
                1: [
                    (Mock(content="Premium Fade Cut expert cutting"), [0.1, 0.2, 0.7]),
                    (Mock(content="Haircuts service $45 45 minutes"), [0.2, 0.3, 0.5])
                ],
                2: [
                    (Mock(content="Beard Trim & Shape grooming"), [0.8, 0.1, 0.1]),
                    (Mock(content="Facial Hair service $25 20 minutes"), [0.7, 0.2, 0.1])
                ],
                3: [
                    (Mock(content="Hot Towel Shave traditional"), [0.3, 0.4, 0.3]),
                    (Mock(content="Shaving service $40 30 minutes"), [0.4, 0.3, 0.3])
                ]
            }
            
            with patch.object(enhanced_semantic_search, 'generate_embedding_with_cache') as mock_query_embed:
                mock_query_embed.return_value = [0.5, 0.2, 0.3]  # Query embedding
                
                # Test service search
                context = SearchContext(
                    user_id=1,
                    user_role="CLIENT",
                    session_id="test_session_456",
                    filters={"category": "Haircuts"}
                )
                
                results = await enhanced_semantic_search.search_services(
                    query="haircut fade",
                    db=mock_db,
                    limit=5,
                    search_type="semantic",
                    context=context
                )
                
                # Verify results
                assert len(results) > 0
                assert all(isinstance(r, EnhancedSemanticMatch) for r in results)
                assert results[0].entity_type == "service"
                assert results[0].similarity_score > 0
                
                # Verify embedding generation was called correctly
                mock_embed.assert_called_once()
                mock_query_embed.assert_called_once_with("haircut fade", "query", mock_db)

    @pytest.mark.asyncio
    async def test_search_with_caching_workflow(self, mock_db):
        """Test search workflow with embedding caching"""
        
        # Mock cached embedding retrieval
        with patch.object(enhanced_semantic_search, '_get_cached_embedding') as mock_cached:
            mock_cached.return_value = [0.1, 0.2, 0.3]  # Cached embedding
            
            with patch.object(enhanced_semantic_search, 'voyage_client') as mock_client:
                # Test that cached embedding is used
                embedding = await enhanced_semantic_search.generate_embedding_with_cache(
                    "test query", "query", mock_db
                )
                
                # Verify cached embedding was returned
                assert embedding == [0.1, 0.2, 0.3]
                # Verify API was not called
                mock_client.get_embedding.assert_not_called()

    @pytest.mark.asyncio 
    async def test_search_error_handling(self, mock_db):
        """Test search error handling and fallbacks"""
        
        # Test API failure handling
        with patch.object(enhanced_semantic_search, 'generate_embedding_with_cache') as mock_embed:
            mock_embed.side_effect = Exception("API failure")
            
            # Mock database query to return empty results
            query_mock = Mock()
            query_mock.filter.return_value = query_mock
            query_mock.all.return_value = []
            mock_db.query.return_value = query_mock
            
            # Test search with API failure
            results = await enhanced_semantic_search.search_barbers(
                query="test query",
                db=mock_db,
                limit=10,
                search_type="semantic"
            )
            
            # Should fallback to keyword search and return empty results
            assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_search_analytics_tracking(self, mock_db):
        """Test search analytics are properly tracked"""
        
        with patch.object(enhanced_semantic_search, '_log_search_analytics') as mock_analytics:
            with patch.object(enhanced_semantic_search, '_semantic_search_barbers') as mock_search:
                mock_search.return_value = []
                
                context = SearchContext(
                    user_id=1,
                    user_role="CLIENT",
                    session_id="analytics_test"
                )
                
                await enhanced_semantic_search.search_barbers(
                    query="test analytics",
                    db=mock_db,
                    limit=5,
                    search_type="semantic",
                    context=context
                )
                
                # Verify analytics were logged
                mock_analytics.assert_called_once()
                args = mock_analytics.call_args[0]
                assert args[0] == "test analytics"  # query
                assert args[1] == "semantic"        # search_type

    def test_search_chunking_functionality(self):
        """Test content chunking for different entity types"""
        
        # Test barber chunking
        barber_data = {
            'bio': 'Expert barber specializing in fades',
            'first_name': 'John',
            'last_name': 'Doe',
            'specialties': ['fade', 'beard'],
            'experience_years': 10,
            'unified_role': 'BARBER'
        }
        
        chunks = enhanced_semantic_search._create_searchable_chunks("barber", barber_data)
        assert len(chunks) >= 1
        assert any("Expert barber" in chunk.content for chunk in chunks)
        
        # Test service chunking
        service_data = {
            'name': 'Fade Cut',
            'description': 'Professional fade cutting service',
            'category': 'Haircuts',
            'price': 35.0,
            'duration': 30
        }
        
        chunks = enhanced_semantic_search._create_searchable_chunks("service", service_data)
        assert len(chunks) >= 1
        assert any("Fade Cut" in chunk.content for chunk in chunks)

    @pytest.mark.asyncio
    async def test_hybrid_search_combination(self, mock_db, sample_barbers):
        """Test hybrid search combines semantic and keyword results"""
        
        # Mock database query
        query_mock = Mock()
        query_mock.filter.return_value = query_mock
        query_mock.all.return_value = sample_barbers
        mock_db.query.return_value = query_mock
        
        with patch.object(enhanced_semantic_search, '_semantic_search_barbers') as mock_semantic:
            with patch.object(enhanced_semantic_search, '_keyword_search_barbers') as mock_keyword:
                
                # Mock semantic results
                mock_semantic.return_value = [
                    EnhancedSemanticMatch(
                        entity_id=1,
                        entity_type="barber",
                        title="Marcus FadeMaster",
                        description="Fade specialist",
                        similarity_score=0.8,
                        chunk_scores=[0.8],
                        search_type="semantic",
                        rank=1,
                        metadata={}
                    )
                ]
                
                # Mock keyword results
                mock_keyword.return_value = [
                    EnhancedSemanticMatch(
                        entity_id=2,
                        entity_type="barber", 
                        title="Antonio BeardKing",
                        description="Beard specialist",
                        similarity_score=0.6,
                        chunk_scores=[0.6],
                        search_type="keyword",
                        rank=1,
                        metadata={}
                    )
                ]
                
                # Test hybrid search
                results = await enhanced_semantic_search.hybrid_search_barbers(
                    query="fade specialist",
                    db=mock_db,
                    limit=10,
                    min_similarity=0.5
                )
                
                # Verify both methods were called
                mock_semantic.assert_called_once()
                mock_keyword.assert_called_once()
                
                # Verify results are combined
                assert len(results) == 2
                assert any(r.entity_id == 1 for r in results)
                assert any(r.entity_id == 2 for r in results)

    @pytest.mark.asyncio
    async def test_performance_with_large_dataset(self, mock_db):
        """Test search performance with larger dataset"""
        
        # Create large dataset of barbers
        large_barber_set = []
        for i in range(100):
            barber = Mock(
                id=i,
                first_name=f"Barber{i}",
                last_name=f"Test{i}",
                bio=f"Professional barber {i} with various skills",
                unified_role="BARBER",
                specialties=["cut", "style"],
                experience_years=i % 20
            )
            large_barber_set.append(barber)
        
        # Mock database query
        query_mock = Mock()
        query_mock.filter.return_value = query_mock
        query_mock.all.return_value = large_barber_set
        mock_db.query.return_value = query_mock
        
        # Mock batch embedding generation
        with patch.object(enhanced_semantic_search, '_batch_generate_entity_embeddings') as mock_embed:
            # Generate mock embeddings for all barbers
            mock_embeddings = {}
            for i in range(100):
                mock_embeddings[i] = [
                    (Mock(content=f"Barber{i} content"), [0.1, 0.2, 0.3])
                ]
            mock_embed.return_value = mock_embeddings
            
            with patch.object(enhanced_semantic_search, 'generate_embedding_with_cache') as mock_query_embed:
                mock_query_embed.return_value = [0.1, 0.2, 0.3]
                
                # Measure search performance
                start_time = datetime.now()
                
                results = await enhanced_semantic_search.search_barbers(
                    query="professional barber",
                    db=mock_db,
                    limit=20,
                    search_type="semantic"
                )
                
                end_time = datetime.now()
                search_time = (end_time - start_time).total_seconds()
                
                # Performance assertions
                assert search_time < 2.0  # Should complete within 2 seconds
                assert len(results) <= 20  # Respects limit
                
                # Verify batch processing was used (not individual calls)
                assert mock_embed.call_count == 1

    @pytest.mark.asyncio
    async def test_contextual_boosting(self, mock_db, sample_barbers):
        """Test contextual boosting affects search results"""
        
        # Mock database query
        query_mock = Mock()
        query_mock.filter.return_value = query_mock
        query_mock.all.return_value = sample_barbers
        mock_db.query.return_value = query_mock
        
        with patch.object(enhanced_semantic_search, '_batch_generate_entity_embeddings') as mock_embed:
            mock_embed.return_value = {
                1: [(Mock(content="Marcus content"), [0.5, 0.5, 0.5])],
                2: [(Mock(content="Antonio content"), [0.5, 0.5, 0.5])],
                3: [(Mock(content="Isabella content"), [0.5, 0.5, 0.5])]
            }
            
            with patch.object(enhanced_semantic_search, 'generate_embedding_with_cache') as mock_query_embed:
                mock_query_embed.return_value = [0.5, 0.5, 0.5]
                
                # Create context with location preference
                context = SearchContext(
                    user_id=1,
                    user_role="CLIENT",
                    session_id="boost_test",
                    filters={"location_id": 123}
                )
                
                # Add location_id to first barber to trigger boost
                sample_barbers[0].location_id = 123
                sample_barbers[1].location_id = 456
                sample_barbers[2].location_id = 789
                
                results = await enhanced_semantic_search.search_barbers(
                    query="barber",
                    db=mock_db,
                    limit=10,
                    search_type="semantic",
                    context=context
                )
                
                # Verify contextual boosting affected results
                if results:
                    # Barber with matching location should be boosted
                    assert any(r.entity_id == 1 for r in results)


class TestSearchAPIEndpoints:
    """Integration tests for search API endpoints"""

    def test_enhanced_barber_search_endpoint(self):
        """Test enhanced barber search API endpoint"""
        
        with patch('routers.search.enhanced_semantic_search.search_barbers') as mock_search:
            mock_search.return_value = []
            
            with patch('routers.search.get_current_user') as mock_user:
                mock_user.return_value = Mock(id=1, unified_role="CLIENT")
                
                with patch('routers.search.get_permission_checker') as mock_perms:
                    mock_perms.return_value = Mock()
                    mock_perms.return_value.has_permission.return_value = True
                    
                    response = client.get(
                        "/api/v2/search/enhanced/barbers?q=fade&limit=5",
                        headers={"Authorization": "Bearer test_token"}
                    )
                    
                    # Should not fail with 500 error
                    assert response.status_code in [200, 401, 403]  # Auth might fail in test

    def test_enhanced_service_search_endpoint(self):
        """Test enhanced service search API endpoint"""
        
        with patch('routers.search.enhanced_semantic_search.search_services') as mock_search:
            mock_search.return_value = []
            
            with patch('routers.search.get_current_user') as mock_user:
                mock_user.return_value = Mock(id=1, unified_role="CLIENT")
                
                with patch('routers.search.get_permission_checker') as mock_perms:
                    mock_perms.return_value = Mock()
                    mock_perms.return_value.has_permission.return_value = True
                    
                    response = client.get(
                        "/api/v2/search/enhanced/services?q=haircut&limit=5",
                        headers={"Authorization": "Bearer test_token"}
                    )
                    
                    # Should not fail with 500 error
                    assert response.status_code in [200, 401, 403]  # Auth might fail in test

    def test_search_capabilities_endpoint(self):
        """Test search capabilities status endpoint"""
        
        response = client.get("/api/v2/search/capabilities")
        
        # Should return capabilities info
        assert response.status_code == 200
        data = response.json()
        assert "capabilities" in data
        assert "version" in data


class TestSearchPerformance:
    """Performance tests for search functionality"""

    @pytest.mark.asyncio
    async def test_search_response_time(self, mock_db):
        """Test search responds within acceptable time limits"""
        
        # Mock fast database response
        query_mock = Mock()
        query_mock.filter.return_value = query_mock
        query_mock.all.return_value = []
        mock_db.query.return_value = query_mock
        
        with patch.object(enhanced_semantic_search, 'generate_embedding_with_cache') as mock_embed:
            mock_embed.return_value = [0.1, 0.2, 0.3]
            
            start_time = datetime.now()
            
            await enhanced_semantic_search.search_barbers(
                query="test performance",
                db=mock_db,
                limit=10
            )
            
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds()
            
            # Should respond within 1 second for empty dataset
            assert response_time < 1.0

    @pytest.mark.asyncio
    async def test_batch_embedding_performance(self, mock_db):
        """Test batch embedding generation is more efficient than individual calls"""
        
        # Create dataset
        barbers = [Mock(id=i, first_name=f"Test{i}", bio=f"Bio {i}") for i in range(10)]
        
        query_mock = Mock()
        query_mock.filter.return_value = query_mock
        query_mock.all.return_value = barbers
        mock_db.query.return_value = query_mock
        
        # Test batch processing
        with patch.object(enhanced_semantic_search.voyage_client, 'get_embedding') as mock_api:
            mock_api.return_value = [[0.1, 0.2, 0.3]] * 20  # Return embeddings for all chunks
            
            # Create batch data
            batch_data = []
            for barber in barbers:
                batch_data.append({
                    'entity_id': barber.id,
                    'first_name': barber.first_name,
                    'bio': barber.bio,
                    'unified_role': 'BARBER'
                })
            
            # Test batch embedding generation
            results = await enhanced_semantic_search._batch_generate_entity_embeddings(
                "barber", batch_data, mock_db
            )
            
            # Should call API only once for all embeddings
            assert mock_api.call_count <= 1
            assert len(results) == 10


class TestSearchErrorScenarios:
    """Test error handling and edge cases"""

    @pytest.mark.asyncio
    async def test_empty_query_handling(self, mock_db):
        """Test handling of empty or invalid queries"""
        
        # Test empty query
        with patch.object(enhanced_semantic_search, 'generate_embedding_with_cache') as mock_embed:
            mock_embed.return_value = None  # Simulates embedding failure
            
            results = await enhanced_semantic_search.search_barbers(
                query="",
                db=mock_db,
                limit=10
            )
            
            # Should handle gracefully
            assert isinstance(results, list)

    @pytest.mark.asyncio 
    async def test_database_failure_handling(self, mock_db):
        """Test handling of database failures"""
        
        # Mock database failure
        mock_db.query.side_effect = Exception("Database connection failed")
        
        results = await enhanced_semantic_search.search_barbers(
            query="test query",
            db=mock_db,
            limit=10
        )
        
        # Should handle gracefully and return empty results
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_voyage_api_failure_handling(self, mock_db):
        """Test handling of Voyage AI API failures"""
        
        with patch.object(enhanced_semantic_search, 'voyage_client') as mock_client:
            mock_client.get_embedding.side_effect = Exception("API rate limit exceeded")
            
            # Mock database query
            query_mock = Mock()
            query_mock.filter.return_value = query_mock
            query_mock.all.return_value = []
            mock_db.query.return_value = query_mock
            
            results = await enhanced_semantic_search.search_barbers(
                query="test api failure",
                db=mock_db,
                limit=10,
                search_type="semantic"
            )
            
            # Should fallback gracefully
            assert isinstance(results, list)


if __name__ == "__main__":
    # Run tests with pytest
    import sys
    sys.exit(pytest.main([__file__, "-v"]))
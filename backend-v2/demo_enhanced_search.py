#!/usr/bin/env python3
"""
Demo script for Enhanced Semantic Search

Shows the improved search capabilities with:
- Vector storage and caching
- Chunking strategies  
- Hybrid search
- Analytics tracking
"""

import asyncio
import json
from datetime import datetime
from sqlalchemy.orm import Session

from db import get_db, SessionLocal
from models import User, Service
from services.enhanced_semantic_search_service import (
    enhanced_semantic_search, SearchContext
)


async def demo_enhanced_search():
    """Demonstrate enhanced search capabilities"""
    
    print("🔍 Enhanced Semantic Search Demo")
    print("=" * 50)
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Create sample data if needed
        await setup_sample_data(db)
        
        # Demo 1: Basic semantic search
        print("\n1. Basic Semantic Search")
        print("-" * 30)
        
        context = SearchContext(
            user_id=1,
            user_role="SHOP_OWNER",
            session_id="demo_session"
        )
        
        results = await enhanced_semantic_search.search_barbers(
            query="experienced barber with fade expertise",
            db=db,
            limit=5,
            search_type="semantic",
            context=context
        )
        
        print(f"Found {len(results)} barbers:")
        for i, result in enumerate(results, 1):
            print(f"  {i}. {result.title} (Score: {result.similarity_score:.3f})")
            print(f"     Type: {result.search_type}, Chunks: {len(result.chunk_scores)}")
        
        # Demo 2: Hybrid search comparison
        print("\n2. Hybrid vs Semantic Search")
        print("-" * 30)
        
        query = "beard specialist"
        
        # Semantic only
        semantic_results = await enhanced_semantic_search.search_barbers(
            query=query, db=db, limit=3, search_type="semantic", context=context
        )
        
        # Hybrid search
        hybrid_results = await enhanced_semantic_search.search_barbers(
            query=query, db=db, limit=3, search_type="hybrid", context=context
        )
        
        print(f"Query: '{query}'")
        print(f"Semantic only: {len(semantic_results)} results")
        print(f"Hybrid search: {len(hybrid_results)} results")
        
        if hybrid_results:
            print("Hybrid results:")
            for result in hybrid_results:
                print(f"  - {result.title} ({result.search_type}: {result.similarity_score:.3f})")
        
        # Demo 3: Caching demonstration
        print("\n3. Embedding Caching Demo")
        print("-" * 30)
        
        # First search (should generate embeddings)
        start_time = datetime.now()
        first_results = await enhanced_semantic_search.search_barbers(
            query="professional haircut specialist",
            db=db,
            limit=2,
            context=context
        )
        first_time = (datetime.now() - start_time).total_seconds()
        
        # Second search (should use cache)
        start_time = datetime.now()
        second_results = await enhanced_semantic_search.search_barbers(
            query="professional haircut specialist",  # Same query
            db=db,
            limit=2,
            context=context
        )
        second_time = (datetime.now() - start_time).total_seconds()
        
        print(f"First search: {first_time:.3f}s")
        print(f"Second search: {second_time:.3f}s")
        print(f"Cache speedup: {first_time/second_time:.1f}x faster")
        
        # Demo 4: Chunking strategy
        print("\n4. Content Chunking Strategy")
        print("-" * 30)
        
        # Show how content gets chunked
        barber_data = {
            'bio': 'Master barber with 15 years experience specializing in classic cuts, modern fades, and traditional straight razor shaves',
            'specialties': ['fades', 'beard trimming', 'straight razor', 'classic cuts'],
            'experience_years': 15,
            'unified_role': 'SHOP_OWNER',
            'first_name': 'Master',
            'last_name': 'Barber'
        }
        
        chunks = enhanced_semantic_search._create_searchable_chunks("barber", barber_data)
        
        print("Content chunks created:")
        for i, chunk in enumerate(chunks, 1):
            print(f"  Chunk {i} ({chunk.chunk_type}, weight: {chunk.weight}):")
            print(f"    '{chunk.content[:60]}...'")
        
        # Demo 5: Show analytics data
        print("\n5. Search Analytics")
        print("-" * 30)
        
        # Query analytics from database
        from models import SearchAnalytics
        
        recent_searches = db.query(SearchAnalytics).order_by(
            SearchAnalytics.created_at.desc()
        ).limit(5).all()
        
        if recent_searches:
            print("Recent search analytics:")
            for search in recent_searches:
                print(f"  - '{search.query}' ({search.search_type})")
                print(f"    Results: {search.results_count}, Time: {search.search_time_ms}ms")
                if search.top_similarity_score:
                    print(f"    Top score: {search.top_similarity_score:.3f}")
        else:
            print("No analytics data yet")
        
        print("\n✅ Demo completed successfully!")
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        db.close()


async def setup_sample_data(db: Session):
    """Create sample data for demo if needed"""
    
    # Check if we have sample barbers
    barber_count = db.query(User).filter(
        User.unified_role.in_(["BARBER", "SHOP_OWNER"])
    ).count()
    
    if barber_count < 3:
        print("Creating sample barber data...")
        
        sample_barbers = [
            {
                'first_name': 'John',
                'last_name': 'Fade',
                'email': 'john.fade@demo.com',
                'bio': 'Expert barber specializing in modern fades and precision cuts. 10 years experience in trendy styles.',
                'unified_role': 'BARBER',
                'hashed_password': 'demo_hash'
            },
            {
                'first_name': 'Mike',
                'last_name': 'Beard',
                'email': 'mike.beard@demo.com', 
                'bio': 'Traditional barber focused on beard trimming and straight razor shaves. Classic techniques with modern precision.',
                'unified_role': 'BARBER',
                'hashed_password': 'demo_hash'
            },
            {
                'first_name': 'Sarah',
                'last_name': 'Styles',
                'email': 'sarah.styles@demo.com',
                'bio': 'Creative stylist offering both classic and contemporary cuts. Specializes in textured styles and color.',
                'unified_role': 'SHOP_OWNER',
                'hashed_password': 'demo_hash'
            }
        ]
        
        for barber_data in sample_barbers:
            barber = User(**barber_data)
            db.add(barber)
        
        db.commit()
        print(f"Created {len(sample_barbers)} sample barbers")


def show_configuration():
    """Show current search configuration"""
    print("\n🔧 Search Configuration")
    print("-" * 30)
    
    config = enhanced_semantic_search.config
    print(f"Primary model: {config['primary_model']}")
    print(f"Hybrid search enabled: {config['enable_hybrid_search']}")
    print(f"Analytics enabled: {config['enable_analytics']}")
    print(f"Min similarity (barber): {config['min_similarity_barber']}")
    print(f"Cache TTL: {config['embedding_cache_ttl_days']} days")


if __name__ == "__main__":
    print("🚀 Starting Enhanced Semantic Search Demo")
    
    # Show configuration
    show_configuration()
    
    # Check if Voyage AI is available
    if not enhanced_semantic_search.is_available():
        print("⚠️  Warning: Voyage.ai not available - will use keyword fallback")
    else:
        print("✅ Voyage.ai client initialized")
    
    # Run demo
    asyncio.run(demo_enhanced_search())
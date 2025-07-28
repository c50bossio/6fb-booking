#!/usr/bin/env python3
"""
Advanced Search Demo

Demonstrates state-of-the-art search features:
- BM25 lexical search for precise keyword matching
- Cross-encoder reranking for ultimate precision
- Contextual retrieval with user preferences
- Query expansion with barbershop terminology
- Multi-index RAG pipeline
"""

import asyncio
import json
from datetime import datetime
from sqlalchemy.orm import Session

from db import SessionLocal
from models import User, Service
from services.advanced_search_service import (
    advanced_search, BarbershopTermExpander, AdvancedSearchConfig
)
from services.enhanced_semantic_search_service import SearchContext


async def demo_advanced_search():
    """Demonstrate advanced search capabilities"""
    
    print("🚀 Advanced Search Demo")
    print("=" * 60)
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Setup sample data
        await setup_advanced_sample_data(db)
        
        # Demo 1: BM25 vs Semantic Search
        print("\n1. BM25 vs Semantic Search Comparison")
        print("-" * 50)
        
        test_queries = [
            "fade haircut",      # Exact keyword match
            "beard specialist",   # Skill-based search
            "experienced master", # Experience-based
            "straight razor"      # Tool-specific
        ]
        
        context = SearchContext(
            user_id=1,
            user_role="CLIENT",
            session_id="demo_advanced"
        )
        
        for query in test_queries:
            print(f"\nQuery: '{query}'")
            
            # Perform advanced search
            results = await advanced_search.advanced_search_barbers(
                query=query,
                db=db,
                limit=3,
                context=context
            )
            
            print(f"  Results: {len(results)}")
            for i, result in enumerate(results, 1):
                match = result.original_match
                print(f"    {i}. {match.title} ({match.search_type})")
                print(f"       Original: {match.similarity_score:.3f}, "
                      f"Reranked: {result.final_score:.3f}")
                
                # Show score breakdown
                if result.score_breakdown:
                    breakdown_str = ", ".join(
                        f"{k}: {v:.3f}" for k, v in result.score_breakdown.items()
                    )
                    print(f"       Breakdown: {breakdown_str}")
        
        # Demo 2: Query Expansion
        print("\n2. Query Expansion & Synonym Matching")
        print("-" * 50)
        
        expander = BarbershopTermExpander()
        expansion_tests = [
            "fade",
            "beard trim", 
            "experienced barber",
            "straight razor shave"
        ]
        
        for query in expansion_tests:
            expansions = expander.expand_query(query)
            print(f"'{query}' → {expansions}")
        
        # Demo 3: Contextual Boosting
        print("\n3. Contextual Boosting Demo")
        print("-" * 50)
        
        # Search with different contexts
        query = "professional barber"
        
        # Context 1: Shop owner searching (should boost barbers)
        owner_context = SearchContext(
            user_id=1,
            user_role="SHOP_OWNER",
            session_id="demo_owner",
            filters={"location_id": 123}
        )
        
        # Context 2: Client searching (standard search)
        client_context = SearchContext(
            user_id=2,
            user_role="CLIENT",
            session_id="demo_client"
        )
        
        for context_name, context in [("Shop Owner", owner_context), ("Client", client_context)]:
            results = await advanced_search.advanced_search_barbers(
                query=query,
                db=db,
                limit=2,
                context=context
            )
            
            print(f"\n{context_name} search:")
            for result in results:
                boost = result.original_match.metadata.get('contextual_boost', 1.0)
                print(f"  - {result.original_match.title}: {result.final_score:.3f} "
                      f"(boost: {boost:.2f}x)")
        
        # Demo 4: Reranking Impact Analysis
        print("\n4. Cross-Encoder Reranking Analysis")
        print("-" * 50)
        
        # Test with and without reranking
        query = "expert fade specialist with beard experience"
        
        # Without reranking
        config_no_rerank = AdvancedSearchConfig(enable_reranking=False)
        advanced_search.config = config_no_rerank
        
        results_no_rerank = await advanced_search.advanced_search_barbers(
            query=query, db=db, limit=5, context=context
        )
        
        # With reranking
        config_with_rerank = AdvancedSearchConfig(enable_reranking=True)
        advanced_search.config = config_with_rerank
        
        results_with_rerank = await advanced_search.advanced_search_barbers(
            query=query, db=db, limit=5, context=context
        )
        
        print("Without reranking:")
        for i, result in enumerate(results_no_rerank[:3], 1):
            print(f"  {i}. {result.original_match.title}: {result.final_score:.3f}")
        
        print("\nWith reranking:")
        for i, result in enumerate(results_with_rerank[:3], 1):
            print(f"  {i}. {result.original_match.title}: {result.final_score:.3f}")
        
        # Show reranking impact
        if advanced_search.reranker and advanced_search.reranker.is_available():
            print("✅ Cross-encoder reranking is active")
            
            # Calculate reranking improvements
            improvements = []
            for result in results_with_rerank:
                if 'rerank' in result.score_breakdown and 'original' in result.score_breakdown:
                    improvement = result.score_breakdown['rerank'] - result.score_breakdown['original']
                    improvements.append(improvement)
            
            if improvements:
                avg_improvement = sum(improvements) / len(improvements)
                print(f"Average reranking improvement: {avg_improvement:+.3f}")
        else:
            print("⚠️  Cross-encoder reranking not available")
        
        # Demo 5: Intelligent Search Suggestions
        print("\n5. Intelligent Search Suggestions")
        print("-" * 50)
        
        partial_queries = ["fad", "bear", "exp", "stra"]
        
        for partial in partial_queries:
            suggestions = await advanced_search.get_search_suggestions(partial, limit=4)
            print(f"'{partial}' → {suggestions}")
        
        # Demo 6: Search Method Performance Comparison
        print("\n6. Search Method Performance Comparison")
        print("-" * 50)
        
        test_query = "experienced barber with fade skills"
        
        # Time each method
        methods = [
            ("Semantic Only", {"enable_reranking": False, "enable_contextual": False}),
            ("BM25 + Semantic", {"enable_reranking": False, "enable_contextual": True}),
            ("Full Advanced", {"enable_reranking": True, "enable_contextual": True})
        ]
        
        for method_name, config_params in methods:
            config = AdvancedSearchConfig(**config_params)
            advanced_search.config = config
            
            start_time = datetime.now()
            results = await advanced_search.advanced_search_barbers(
                query=test_query, db=db, limit=3, context=context
            )
            end_time = datetime.now()
            
            response_time = (end_time - start_time).total_seconds() * 1000
            
            print(f"{method_name:20} | {len(results)} results | {response_time:.1f}ms")
            if results:
                top_score = results[0].final_score
                print(f"{' '*20} | Top score: {top_score:.3f}")
        
        # Demo 7: Index Statistics
        print("\n7. Search Index Statistics")
        print("-" * 50)
        
        # BM25 index stats
        barber_docs = len(advanced_search.bm25_barber_index.documents)
        service_docs = len(advanced_search.bm25_service_index.documents)
        
        print(f"BM25 Barber Index: {barber_docs} documents")
        print(f"BM25 Service Index: {service_docs} documents")
        
        if advanced_search.barber_index_updated:
            print(f"Last updated: {advanced_search.barber_index_updated}")
        
        # Show sample document tokens
        if barber_docs > 0:
            sample_tokens = advanced_search.bm25_barber_index.documents[0][:10]
            print(f"Sample tokens: {sample_tokens}")
        
        print("\n✅ Advanced search demo completed!")
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        db.close()


async def setup_advanced_sample_data(db: Session):
    """Create advanced sample data for demo"""
    
    # Check if we have enough sample data
    barber_count = db.query(User).filter(
        User.unified_role.in_(["BARBER", "SHOP_OWNER"])
    ).count()
    
    if barber_count < 5:
        print("Creating advanced sample barber data...")
        
        # More diverse barber profiles for testing
        advanced_barbers = [
            {
                'first_name': 'Marcus',
                'last_name': 'FadeMaster',
                'email': 'marcus.fade@demo.com',
                'bio': 'Expert in all fade techniques - high fade, low fade, mid fade, skin fade. 12 years experience creating perfect gradients.',
                'unified_role': 'BARBER',
                'hashed_password': 'demo_hash'
            },
            {
                'first_name': 'Antonio',
                'last_name': 'BeardKing', 
                'email': 'antonio.beard@demo.com',
                'bio': 'Master beard specialist. Straight razor shaves, beard sculpting, mustache grooming. Traditional techniques with modern precision.',
                'unified_role': 'BARBER',
                'hashed_password': 'demo_hash'
            },
            {
                'first_name': 'Isabella',
                'last_name': 'StyleMaven',
                'email': 'isabella.style@demo.com',
                'bio': 'Creative stylist specializing in modern cuts and classic styles. Scissor expert with 8 years experience.',
                'unified_role': 'SHOP_OWNER',
                'hashed_password': 'demo_hash'
            },
            {
                'first_name': 'Carlos',
                'last_name': 'ClipperPro',
                'email': 'carlos.clipper@demo.com',
                'bio': 'Professional barber focused on precision clipper work. Buzz cuts, crew cuts, and clean lineups.',
                'unified_role': 'BARBER',
                'hashed_password': 'demo_hash'
            },
            {
                'first_name': 'Sophia',
                'last_name': 'MasterBarber',
                'email': 'sophia.master@demo.com',
                'bio': 'Master barber with 15 years experience. Expert in all services - cuts, shaves, styling, consultations.',
                'unified_role': 'SHOP_OWNER',
                'hashed_password': 'demo_hash'
            }
        ]
        
        for barber_data in advanced_barbers:
            # Check if barber already exists
            existing = db.query(User).filter(
                User.email == barber_data['email']
            ).first()
            
            if not existing:
                barber = User(**barber_data)
                db.add(barber)
        
        db.commit()
        print(f"Created advanced sample data")


def show_advanced_configuration():
    """Show advanced search configuration"""
    print("\n🔧 Advanced Search Configuration")
    print("-" * 40)
    
    config = advanced_search.config
    print(f"BM25 Parameters:")
    print(f"  k1 (term frequency): {config.bm25.k1}")
    print(f"  b (length normalization): {config.bm25.b}")
    print(f"  epsilon (IDF floor): {config.bm25.epsilon}")
    
    print(f"\nReranking:")
    print(f"  Enabled: {config.enable_reranking}")
    print(f"  Model: {config.rerank_model}")
    print(f"  Top-k candidates: {config.rerank_top_k}")
    
    print(f"\nContextual Features:")
    print(f"  Enabled: {config.enable_contextual}")
    print(f"  Location boost: {config.location_boost}x")
    print(f"  History boost: {config.history_boost}x")
    
    print(f"\nScoring Weights:")
    print(f"  Semantic: {config.semantic_weight}")
    print(f"  BM25: {config.bm25_weight}")
    print(f"  Contextual: {config.contextual_weight}")


if __name__ == "__main__":
    print("🚀 Starting Advanced Search Demo")
    
    # Show configuration
    show_advanced_configuration()
    
    # Check model availability
    print(f"\n🤖 Model Availability:")
    print(f"Voyage AI: {'✅' if advanced_search.bm25_barber_index else '❌'}")
    print(f"Cross-encoder: {'✅' if advanced_search.reranker and advanced_search.reranker.is_available() else '❌'}")
    print(f"BM25: ✅ (always available)")
    
    # Run demo
    asyncio.run(demo_advanced_search())
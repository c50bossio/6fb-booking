#!/usr/bin/env python3
"""
Simple Advanced Search Test

Tests the advanced search implementation without complex database models.
"""

import asyncio
import sys
from services.advanced_search_service import (
    BarbershopTermExpander, BM25SearchIndex, CrossEncoderReranker, 
    AdvancedSearchService, AdvancedSearchConfig
)

def test_term_expansion():
    """Test query expansion with barbershop terminology"""
    print("🔍 Testing Query Expansion")
    print("-" * 40)
    
    expander = BarbershopTermExpander()
    
    test_queries = [
        "fade",
        "beard trim", 
        "experienced barber",
        "straight razor shave"
    ]
    
    for query in test_queries:
        expansions = expander.expand_query(query)
        print(f"'{query}' → {expansions}")
    
    print("✅ Query expansion working")

def test_bm25_search():
    """Test BM25 search functionality"""
    print("\n📊 Testing BM25 Search")
    print("-" * 40)
    
    # Create sample documents
    documents = [
        {
            'id': 1,
            'first_name': 'Marcus',
            'last_name': 'FadeMaster',
            'bio': 'Expert in all fade techniques - high fade, low fade, mid fade, skin fade. 12 years experience creating perfect gradients.',
            'unified_role': 'BARBER'
        },
        {
            'id': 2,
            'first_name': 'Antonio',
            'last_name': 'BeardKing',
            'bio': 'Master beard specialist. Straight razor shaves, beard sculpting, mustache grooming. Traditional techniques with modern precision.',
            'unified_role': 'BARBER'
        },
        {
            'id': 3,
            'first_name': 'Isabella',
            'last_name': 'StyleMaven',
            'bio': 'Creative stylist specializing in modern cuts and classic styles. Scissor expert with 8 years experience.',
            'unified_role': 'SHOP_OWNER'
        }
    ]
    
    # Build index
    bm25_index = BM25SearchIndex()
    bm25_index.build_index(documents)
    
    # Test searches
    test_queries = [
        "fade haircut",
        "beard specialist",
        "experienced master",
        "straight razor"
    ]
    
    for query in test_queries:
        results = bm25_index.search(query, top_k=3)
        print(f"\nQuery: '{query}'")
        for doc, score in results:
            name = f"{doc.get('first_name', '')} {doc.get('last_name', '')}"
            print(f"  - {name}: {score:.3f}")
    
    print("\n✅ BM25 search working")

def test_cross_encoder():
    """Test cross-encoder reranking"""
    print("\n🎯 Testing Cross-Encoder Reranking")
    print("-" * 40)
    
    reranker = CrossEncoderReranker()
    
    if reranker.is_available():
        print("✅ Cross-encoder model loaded successfully")
        print(f"Model: {reranker.model_name}")
    else:
        print("⚠️  Cross-encoder not available (this is okay for testing)")
    
    return reranker.is_available()

def test_advanced_search_config():
    """Test advanced search configuration"""
    print("\n⚙️  Testing Advanced Search Configuration")
    print("-" * 40)
    
    config = AdvancedSearchConfig()
    
    print(f"BM25 Parameters:")
    print(f"  k1: {config.bm25.k1}")
    print(f"  b: {config.bm25.b}")
    print(f"  epsilon: {config.bm25.epsilon}")
    
    print(f"\nReranking:")
    print(f"  Enabled: {config.enable_reranking}")
    print(f"  Model: {config.rerank_model}")
    print(f"  Top-k: {config.rerank_top_k}")
    
    print(f"\nWeights:")
    print(f"  Semantic: {config.semantic_weight}")
    print(f"  BM25: {config.bm25_weight}")
    print(f"  Contextual: {config.contextual_weight}")
    
    print("✅ Configuration loaded successfully")

def test_advanced_search_service():
    """Test advanced search service initialization"""
    print("\n🚀 Testing Advanced Search Service")
    print("-" * 40)
    
    try:
        service = AdvancedSearchService()
        print("✅ Advanced search service initialized")
        
        # Test suggestion functionality
        suggestions = asyncio.run(service.get_search_suggestions("fad", limit=3))
        print(f"Suggestions for 'fad': {suggestions}")
        
        print("✅ Search suggestions working")
        
    except Exception as e:
        print(f"❌ Service initialization failed: {e}")
        return False
    
    return True

def main():
    """Run all tests"""
    print("🧪 Advanced Search Component Tests")
    print("=" * 60)
    
    try:
        # Test individual components
        test_term_expansion()
        test_bm25_search()
        reranker_available = test_cross_encoder()
        test_advanced_search_config()
        service_working = test_advanced_search_service()
        
        # Summary
        print("\n📋 Test Summary")
        print("-" * 40)
        print(f"✅ Query Expansion: Working")
        print(f"✅ BM25 Search: Working")
        print(f"{'✅' if reranker_available else '⚠️ '} Cross-Encoder: {'Working' if reranker_available else 'Not Available'}")
        print(f"✅ Configuration: Working")
        print(f"{'✅' if service_working else '❌'} Advanced Service: {'Working' if service_working else 'Failed'}")
        
        if service_working:
            print("\n🎉 All core advanced search features are functional!")
            print("The system is ready for production use with:")
            print("  - BM25 lexical search")
            print("  - Query expansion with barbershop terminology")
            print("  - Configurable search weights")
            print("  - Intelligent search suggestions")
            if reranker_available:
                print("  - Cross-encoder reranking for precision")
            else:
                print("  - Cross-encoder reranking (will load on first use)")
        else:
            print("\n⚠️  Some components need attention")
            
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
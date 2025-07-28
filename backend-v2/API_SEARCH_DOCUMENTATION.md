# Advanced Search API Documentation

## Overview

The BookedBarber V2 platform provides state-of-the-art search capabilities through multiple API endpoints. The search system combines semantic understanding, keyword matching, and contextual intelligence to deliver highly relevant results.

## Authentication

All search endpoints require authentication via JWT token:

```bash
Authorization: Bearer <your_jwt_token>
```

## Search Endpoints

### 1. Enhanced Semantic Search

#### Search Barbers (Enhanced)
```
GET /api/v2/search/enhanced/barbers
```

**Parameters:**
- `q` (required): Search query (1-100 characters)
- `limit` (optional): Maximum results (1-50, default: 10)  
- `min_similarity` (optional): Minimum similarity threshold (0.0-1.0, default: 0.6)
- `search_type` (optional): "semantic", "keyword", or "hybrid" (default: "hybrid")
- `session_id` (optional): Session ID for analytics

**Response:**
```json
{
  "query": "fade specialist",
  "results": [
    {
      "id": 123,
      "type": "barber", 
      "title": "Marcus FadeMaster",
      "subtitle": "Similarity: 85% (hybrid)",
      "url": "/barbers/123",
      "similarity_score": 0.85,
      "chunk_scores": [0.89, 0.81],
      "search_type": "hybrid",
      "rank": 1,
      "metadata": {
        "bio": "Expert fade specialist...",
        "experience_years": 12,
        "cached": true
      }
    }
  ],
  "total": 5,
  "search_type": "hybrid", 
  "took_ms": 245,
  "analytics": {
    "cache_hits": 3,
    "semantic_results": 4,
    "keyword_results": 2,
    "avg_similarity": 0.78
  }
}
```

### 2. Advanced Search (Recommended)

#### Search Barbers (Advanced)
```
GET /api/v2/search/advanced/barbers
```

**Parameters:**
- `q` (required): Search query (1-100 characters)
- `limit` (optional): Maximum results (1-20, default: 10)
- `enable_reranking` (optional): Enable cross-encoder reranking (default: true)
- `enable_contextual` (optional): Enable contextual boosting (default: true) 
- `session_id` (optional): Session ID for analytics

**Response:**
```json
{
  "query": "beard specialist with experience",
  "results": [
    {
      "id": 456,
      "type": "barber",
      "title": "Antonio BeardKing", 
      "subtitle": "Relevance: 92% (hybrid)",
      "url": "/barbers/456",
      "original_score": 0.83,
      "rerank_score": 0.91,
      "final_score": 0.92,
      "search_type": "hybrid",
      "score_breakdown": {
        "semantic": 0.85,
        "bm25": 0.81,
        "rerank": 0.91,
        "final": 0.92
      },
      "contextual_boost": 1.1,
      "metadata": {
        "bio": "Master beard specialist...",
        "specialties": ["beard", "straight_razor"]
      }
    }
  ],
  "total": 3,
  "took_ms": 387,
  "search_methods": ["semantic", "bm25", "reranking", "contextual"],
  "reranking_used": true,
  "analytics": {
    "avg_final_score": 0.87,
    "score_distribution": {
      "semantic": 2,
      "bm25": 1, 
      "hybrid": 3
    },
    "reranking_impact": {
      "score_changes": [
        {
          "entity_id": 456,
          "original": 0.83,
          "reranked": 0.92,
          "improvement": 0.09
        }
      ]
    }
  }
}
```

### 3. Search Analytics

#### Query Performance Analytics
```
GET /api/v2/search/analytics/query-performance
```

**Parameters:**
- `limit` (optional): Number of recent queries (1-1000, default: 100)
- `search_type` (optional): Filter by search type
- `min_results` (optional): Minimum number of results

**Response:**
```json
{
  "summary": {
    "total_searches": 1247,
    "avg_response_time_ms": 324.5,
    "avg_results_count": 7.2,
    "success_rate": 94.3,
    "semantic_searches": 890,
    "keyword_searches": 201,
    "hybrid_searches": 156
  },
  "performance_distribution": {
    "fast": 892,     // < 100ms
    "medium": 298,   // 100-500ms  
    "slow": 57       // > 500ms
  },
  "popular_queries": [
    {
      "query": "fade haircut",
      "search_count": 89,
      "success_rate": 96.6,
      "click_through_rate": 78.4
    }
  ],
  "recent_searches": [
    {
      "query": "beard specialist",
      "search_type": "hybrid",
      "results_count": 5,
      "response_time_ms": 287,
      "similarity_score": 0.84,
      "created_at": "2025-07-27T14:30:00Z"
    }
  ]
}
```

#### Click Tracking
```
POST /api/v2/search/analytics/click-tracking
```

**Request Body:**
```json
{
  "query": "fade specialist",
  "result_id": 123,
  "result_type": "barber",
  "position": 1,
  "similarity_score": 0.85,
  "time_to_click_ms": 1500,
  "session_id": "session_abc123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Click tracked"
}
```

### 4. Search Suggestions

#### Intelligent Suggestions
```
GET /api/v2/search/suggestions/intelligent
```

**Parameters:**
- `q` (required): Partial search query (1-50 characters)
- `limit` (optional): Maximum suggestions (1-10, default: 5)

**Response:**
```json
{
  "query": "fad",
  "suggestions": [
    "fade haircut",
    "fade specialist", 
    "high fade",
    "skin fade",
    "fade expert"
  ],
  "total": 5
}
```

### 5. System Capabilities

#### Search Capabilities Status
```
GET /api/v2/search/capabilities
```

**Response:**
```json
{
  "capabilities": {
    "semantic_search": {
      "available": true,
      "model": "voyage-3-large",
      "features": ["embeddings", "similarity_matching", "caching"]
    },
    "bm25_search": {
      "available": true,
      "algorithm": "BM25Okapi",
      "features": ["keyword_matching", "term_frequency", "query_expansion"]
    },
    "reranking": {
      "available": true,
      "model": "cross-encoder/ms-marco-MiniLM-L-12-v2",
      "features": ["cross_encoder", "final_ranking"]
    },
    "contextual_retrieval": {
      "available": true,
      "features": ["location_boost", "preference_matching", "temporal_context"]
    },
    "query_expansion": {
      "available": true,
      "features": ["barbershop_synonyms", "term_variants", "skill_matching"]
    },
    "analytics": {
      "available": true,
      "features": ["performance_tracking", "user_behavior", "click_analytics"]
    }
  },
  "performance": {
    "barber_index_updated": "2025-07-27T14:00:00Z",
    "service_index_updated": "2025-07-27T14:00:00Z",
    "cache_enabled": true,
    "search_methods": ["semantic", "bm25", "hybrid", "reranked"]
  },
  "version": "2.0.0-advanced",
  "last_updated": "2025-07-27T15:30:00Z"
}
```

## Search Types Explained

### Semantic Search
- **Best for**: Natural language queries, concept matching
- **Examples**: "experienced barber", "beard specialist", "creative stylist"
- **Technology**: Voyage.ai embeddings with similarity matching

### BM25 Search  
- **Best for**: Exact term matching, specific skills
- **Examples**: "fade", "straight razor", "clipper cut"
- **Technology**: BM25Okapi algorithm with term frequency analysis

### Hybrid Search (Recommended)
- **Best for**: Balanced results combining meaning and keywords
- **Examples**: "fade specialist", "experienced beard trimmer"
- **Technology**: Weighted combination of semantic and BM25 results

### Advanced Search (Production Recommended)
- **Best for**: Highest accuracy and relevance
- **Examples**: All query types with optimal results
- **Technology**: Full pipeline with reranking and contextual boosting

## Query Expansion

The search system automatically expands queries with barbershop-specific terminology:

| Original Term | Expanded Terms |
|---------------|----------------|
| "fade" | "skin fade", "high fade", "low fade", "mid fade", "taper fade" |
| "beard" | "facial hair", "beard trim", "goatee", "mustache" |
| "experienced" | "expert", "professional", "skilled", "master" |
| "straight razor" | "razor", "blade", "traditional shave" |

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "detail": "Query parameter 'q' is required"
}
```

### 403 Forbidden
```json
{
  "detail": "Insufficient permissions to search barbers"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Search failed: <error details>"
}
```

### 503 Service Unavailable
```json
{
  "detail": "Semantic search is temporarily unavailable. Please try keyword search."
}
```

## Rate Limits

- **Search requests**: 100 requests per minute per user
- **Analytics requests**: 50 requests per minute per user
- **Suggestions requests**: 200 requests per minute per user

## Performance Guidelines

### Response Times
- **Target**: < 500ms for most queries
- **Fast**: < 100ms (cached results)
- **Medium**: 100-500ms (normal operation)
- **Slow**: > 500ms (complex queries with reranking)

### Best Practices
1. **Use session IDs** for analytics tracking
2. **Enable caching** by using consistent queries
3. **Choose appropriate search type** based on query nature
4. **Monitor performance** through analytics endpoints
5. **Handle graceful degradation** when components are unavailable

## Examples

### Search for Fade Specialists
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v2/search/advanced/barbers?q=fade+specialist&limit=5"
```

### Get Search Suggestions
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v2/search/suggestions/intelligent?q=bear&limit=3"
```

### Track Search Click
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query":"fade expert","result_id":123,"position":1}' \
  "http://localhost:8000/api/v2/search/analytics/click-tracking"
```

### Check System Status
```bash
curl "http://localhost:8000/api/v2/search/capabilities"
```

---

**Version**: 2.0.0-advanced  
**Last Updated**: 2025-07-27  
**Contact**: API Support Team
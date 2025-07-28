# Advanced Search Deployment Notes

## 🚀 New Dependencies

### Required Python Packages
```bash
# Add to requirements.txt
rank-bm25==0.2.2              # BM25 search algorithm
sentence-transformers==2.2.2   # Cross-encoder reranking models

# Already present (verify versions)
voyageai>=0.2.0               # Semantic embeddings
numpy==1.26.4                 # Scientific computing
scipy==1.12.0                 # Statistical functions
```

### Installation Commands
```bash
# Production deployment
pip install rank-bm25==0.2.2 sentence-transformers==2.2.2

# Development environment
cd backend-v2
pip install -r requirements.txt
```

## 🗄️ Database Migrations

### New Tables Created
```sql
-- Vector storage and caching
CREATE TABLE embedding_cache (
    id SERIAL PRIMARY KEY,
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    embedding JSON NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    cache_hits INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search performance analytics
CREATE TABLE search_analytics (
    id SERIAL PRIMARY KEY,
    query VARCHAR(500) NOT NULL,
    query_hash VARCHAR(64),
    search_type VARCHAR(20) DEFAULT 'semantic',
    search_time_ms INTEGER NOT NULL,
    results_count INTEGER DEFAULT 0,
    top_similarity_score FLOAT,
    user_id INTEGER,
    session_id VARCHAR(100),
    clicked_result_id INTEGER,
    clicked_result_type VARCHAR(20),
    clicked_result_position INTEGER,
    clicked_result_score FLOAT,
    time_to_click_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search suggestions and popular queries
CREATE TABLE search_query_suggestions (
    id SERIAL PRIMARY KEY,
    query VARCHAR(500) NOT NULL,
    normalized_query VARCHAR(500) NOT NULL,
    search_count INTEGER DEFAULT 1,
    success_rate FLOAT DEFAULT 0.0,
    click_through_rate FLOAT DEFAULT 0.0,
    last_searched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search configuration
CREATE TABLE semantic_search_configuration (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSON NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Migration Commands
```bash
# Apply database migrations
cd backend-v2
alembic upgrade head

# Verify migration success
python -c "from db import engine; from sqlalchemy import text; print([row[0] for row in engine.execute(text('SELECT tablename FROM pg_tables WHERE schemaname = \'public\' AND tablename LIKE \'%search%\' OR tablename LIKE \'%embedding%\''))])"
```

## 🔧 Environment Variables

### Required Configuration
```bash
# .env file additions
VOYAGE_API_KEY=pa-your_voyage_api_key_here    # Required for semantic search
OPENAI_API_KEY=sk-your_openai_key_here        # Optional, for future enhancements

# Optional performance tuning
SEARCH_CACHE_TTL=3600                         # Cache timeout in seconds
SEARCH_INDEX_REFRESH_INTERVAL=3600            # Index refresh in seconds
SEARCH_MAX_RESULTS=50                         # Maximum results per query
SEARCH_MIN_SIMILARITY=0.5                     # Minimum similarity threshold
```

### Production Environment Setup
```bash
# Production .env
VOYAGE_API_KEY=pa-prod_voyage_key
DATABASE_URL=postgresql://user:pass@host:5432/bookedbarber_prod
REDIS_URL=redis://redis-host:6379/0
DEBUG=false
ENVIRONMENT=production

# Staging .env  
VOYAGE_API_KEY=pa-staging_voyage_key
DATABASE_URL=postgresql://user:pass@host:5432/bookedbarber_staging
REDIS_URL=redis://redis-host:6379/1
DEBUG=false
ENVIRONMENT=staging
```

## 🚀 Deployment Steps

### 1. Pre-Deployment Checklist
```bash
# Verify current system
python test_search_system_final.py

# Check database connection
python -c "from db import get_db; next(get_db()); print('Database OK')"

# Verify existing models
python -c "from models import User, Service; print('Models OK')"
```

### 2. Update Dependencies
```bash
# Production server
pip install --upgrade rank-bm25==0.2.2 sentence-transformers==2.2.2

# Restart application server
sudo systemctl restart bookedbarber-backend
# OR
pm2 restart backend-v2
```

### 3. Apply Database Migrations
```bash
cd backend-v2
alembic upgrade head

# Verify tables created
python -c "from models import EmbeddingCache, SearchAnalytics; print('Search models loaded')"
```

### 4. Initialize Search System
```bash
# Test search system initialization
python -c "
from services.advanced_search_service import advanced_search
from services.enhanced_semantic_search_service import enhanced_semantic_search
print('BM25 Ready:', bool(advanced_search.bm25_barber_index))
print('Voyage Ready:', enhanced_semantic_search.is_available())
print('Reranker Ready:', advanced_search.reranker.is_available() if advanced_search.reranker else False)
"
```

### 5. Verify API Endpoints
```bash
# Test search endpoints
curl -X GET "http://localhost:8000/api/v2/search/capabilities"
curl -X GET "http://localhost:8000/api/v2/search/enhanced/barbers?q=fade&limit=3"
curl -X GET "http://localhost:8000/api/v2/search/advanced/barbers?q=expert&limit=3"
```

## ⚡ Performance Considerations

### Memory Requirements
- **Base System**: ~200MB
- **With sentence-transformers**: +800MB
- **With BM25 indexes**: +50MB per 1000 documents
- **Total Recommended**: 2GB+ RAM for production

### CPU Usage
- **Model Loading**: Initial spike during startup
- **Search Queries**: ~50-100ms CPU time per query
- **Index Building**: Background process, minimal impact
- **Reranking**: Additional 100-200ms for complex queries

### Storage Requirements
- **Model Cache**: ~500MB for sentence-transformers models
- **Vector Cache**: ~1KB per cached embedding
- **Search Analytics**: ~1KB per search query
- **Indexes**: ~100KB per 1000 documents

## 🔍 Monitoring & Health Checks

### Health Check Endpoints
```bash
# Overall system status
curl http://localhost:8000/health

# Search-specific status
curl http://localhost:8000/api/v2/search/capabilities

# Component status
curl http://localhost:8000/api/v2/search/analytics/query-performance?limit=10
```

### Key Metrics to Monitor
```bash
# Response times (target < 500ms)
# Cache hit rates (target > 60%)
# Search success rates (target > 90%)
# Model availability (target 100%)
# Error rates (target < 1%)
```

### Log Monitoring
```bash
# Search-related log patterns
tail -f /var/log/bookedbarber/backend.log | grep -E "(search|BM25|voyage|rerank)"

# Performance warnings
tail -f /var/log/bookedbarber/backend.log | grep -E "(slow|timeout|error)"

# Model loading status
tail -f /var/log/bookedbarber/backend.log | grep -E "(model|transformer|voyage)"
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Voyage.ai API Key Issues
```bash
# Symptoms: Semantic search unavailable
# Check: VOYAGE_API_KEY environment variable
# Test: curl -H "Authorization: Bearer $VOYAGE_API_KEY" https://api.voyageai.com/v1/models

# Solution:
export VOYAGE_API_KEY=pa-your_actual_key
# Restart application
```

#### 2. sentence-transformers Model Loading
```bash
# Symptoms: Reranking not available, memory issues
# Check model download location
python -c "from sentence_transformers import SentenceTransformer; print(SentenceTransformer.cache_folder)"

# Clear cache if corrupted
rm -rf ~/.cache/torch/sentence_transformers/

# Restart application to re-download
```

#### 3. Database Migration Issues
```bash
# Check current migration version
alembic current

# Show migration history
alembic history

# Manual migration (if needed)
alembic upgrade +1
```

#### 4. Performance Issues
```bash
# Check memory usage
ps aux | grep python | grep backend

# Monitor search response times
curl -w "Response time: %{time_total}s\n" "http://localhost:8000/api/v2/search/advanced/barbers?q=test"

# Check cache performance
python -c "
from services.enhanced_semantic_search_service import enhanced_semantic_search
print('Cache stats available via analytics endpoint')
"
```

## 🔄 Rollback Plan

### Emergency Rollback Steps
```bash
# 1. Revert to previous application version
git checkout previous-stable-commit
pip install -r requirements.txt --force-reinstall

# 2. Remove new dependencies if needed
pip uninstall rank-bm25 sentence-transformers

# 3. Rollback database (CAUTION)
alembic downgrade -1  # Only if necessary

# 4. Restart services
sudo systemctl restart bookedbarber-backend
```

### Safe Rollback (Recommended)
```bash
# 1. Disable advanced search features
export ENABLE_ADVANCED_SEARCH=false

# 2. Use fallback to basic search
# Application should gracefully degrade

# 3. Investigate issues without downtime
# 4. Fix and re-enable when ready
```

## 📊 Performance Benchmarks

### Expected Performance
```bash
# Search Response Times:
# - Cached queries: 50-100ms
# - Semantic search: 200-400ms  
# - BM25 search: 100-200ms
# - Advanced search: 300-500ms
# - With reranking: 400-600ms

# Throughput:
# - Concurrent searches: 50-100/second
# - Cache hit ratio: 60-80%
# - Model loading time: 10-30 seconds
```

### Load Testing
```bash
# Basic load test
for i in {1..10}; do
  curl -s -w "Request $i: %{time_total}s\n" \
    "http://localhost:8000/api/v2/search/advanced/barbers?q=fade&limit=5" \
    > /dev/null &
done
wait
```

## 🔐 Security Considerations

### API Security
- All search endpoints require authentication
- Rate limiting applied (100 searches/minute per user)
- Input validation on all query parameters
- SQL injection protection via SQLAlchemy ORM

### Data Privacy
- Search queries logged for analytics (anonymized)
- Vector embeddings stored securely
- Personal data not included in search indexes
- GDPR compliance for search analytics

### Production Security
```bash
# Ensure secure environment variables
chmod 600 .env

# Verify API key security
# Never log API keys in application logs
# Rotate keys regularly

# Monitor for suspicious search patterns
# Implement abuse detection
```

---

**Deployment Version**: 2.0.0-advanced  
**Deployment Date**: July 27, 2025  
**Compatibility**: BookedBarber V2 backend  
**Dependencies**: Python 3.9+, PostgreSQL 12+, Redis (optional)
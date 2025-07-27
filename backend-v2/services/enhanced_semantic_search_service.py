"""
Enhanced Semantic Search Service for BookedBarber V2

Provides intelligent search capabilities with:
- Vector storage and caching
- Advanced chunking strategies
- Hybrid semantic + keyword search
- Search analytics and learning
- Multiple model optimization
"""

import os
import logging
import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
import asyncio

import voyageai
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_, desc, func

from models import (
    User, Service, Appointment, 
    EmbeddingCache, SearchAnalytics, SearchQuerySuggestions, 
    SemanticSearchConfiguration
)
from config import settings

logger = logging.getLogger(__name__)


@dataclass
class SearchChunk:
    """Represents a searchable chunk of content"""
    content: str
    chunk_type: str  # "primary", "secondary", "metadata"
    weight: float = 1.0  # Importance weight for ranking
    metadata: Dict[str, Any] = None


@dataclass
class EnhancedSemanticMatch:
    """Enhanced search result with additional metadata"""
    entity_id: int
    entity_type: str
    title: str
    description: str
    similarity_score: float
    chunk_scores: List[float]  # Scores for individual chunks
    search_type: str  # "semantic", "keyword", "hybrid"
    metadata: Dict[str, Any]
    rank: int = 0  # Final ranking position


@dataclass
class SearchContext:
    """Context information for search requests"""
    user_id: Optional[int] = None
    user_role: Optional[str] = None
    session_id: Optional[str] = None
    filters: Dict[str, Any] = None
    preferences: Dict[str, Any] = None


class EnhancedSemanticSearchService:
    """
    Enhanced semantic search service with caching, analytics, and optimization
    """
    
    def __init__(self):
        self.client = None
        self.config = None
        self._initialize_client()
        self._load_configuration()
    
    def _initialize_client(self):
        """Initialize Voyage.ai client with API key"""
        try:
            api_key = getattr(settings, 'voyage_api_key', None) or os.getenv('VOYAGE_API_KEY')
            if not api_key:
                logger.warning("VOYAGE_API_KEY not found. Semantic search will be disabled.")
                return
            
            self.client = voyageai.Client(api_key=api_key)
            logger.info("Enhanced Voyage.ai client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Voyage.ai client: {e}")
            self.client = None
    
    def _load_configuration(self):
        """Load search configuration from database or use defaults"""
        # In a real implementation, this would load from database
        # For now, use default configuration
        self.config = {
            "primary_model": "voyage-3-large",
            "query_model": "voyage-3-large",
            "content_model": "voyage-3-large",
            "min_similarity_barber": 0.6,
            "min_similarity_service": 0.5,
            "min_similarity_recommendation": 0.4,
            "max_embedding_cache_size": 10000,
            "embedding_cache_ttl_days": 30,
            "batch_size": 10,
            "enable_hybrid_search": True,
            "enable_analytics": True,
        }
    
    def is_available(self) -> bool:
        """Check if semantic search is available"""
        return self.client is not None
    
    def _create_content_hash(self, content: str) -> str:
        """Create SHA-256 hash of content for caching"""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def _create_searchable_chunks(self, entity_type: str, entity_data: dict) -> List[SearchChunk]:
        """Create optimized chunks for better semantic search"""
        chunks = []
        
        if entity_type == "barber":
            # Primary chunk: Core skills and bio
            primary_parts = []
            if entity_data.get('bio'):
                primary_parts.append(entity_data['bio'])
            if entity_data.get('specialties'):
                specialties = entity_data['specialties']
                if isinstance(specialties, list):
                    primary_parts.append(f"Specialties: {', '.join(specialties)}")
                else:
                    primary_parts.append(f"Specialties: {specialties}")
            
            if primary_parts:
                chunks.append(SearchChunk(
                    content=". ".join(primary_parts),
                    chunk_type="primary",
                    weight=1.0
                ))
            
            # Secondary chunk: Experience and context
            secondary_parts = []
            if entity_data.get('experience_years'):
                secondary_parts.append(f"{entity_data['experience_years']} years of professional experience")
            if entity_data.get('unified_role') == "SHOP_OWNER":
                secondary_parts.append("Shop owner and experienced barber")
            else:
                secondary_parts.append("Professional barber")
            
            if secondary_parts:
                chunks.append(SearchChunk(
                    content=". ".join(secondary_parts),
                    chunk_type="secondary",
                    weight=0.8
                ))
            
            # Metadata chunk: Additional context
            if entity_data.get('first_name') and entity_data.get('last_name'):
                name_chunk = f"Barber {entity_data['first_name']} {entity_data['last_name']}"
                chunks.append(SearchChunk(
                    content=name_chunk,
                    chunk_type="metadata",
                    weight=0.6
                ))
                
        elif entity_type == "service":
            # Primary chunk: Service name and description
            primary_parts = [entity_data['name']]
            if entity_data.get('description'):
                primary_parts.append(entity_data['description'])
            
            chunks.append(SearchChunk(
                content=". ".join(primary_parts),
                chunk_type="primary",
                weight=1.0
            ))
            
            # Secondary chunk: Category and pricing context
            secondary_parts = []
            if entity_data.get('category'):
                secondary_parts.append(f"{entity_data['category']} service")
            if entity_data.get('price') and entity_data.get('duration'):
                secondary_parts.append(f"${entity_data['price']} for {entity_data['duration']} minutes")
            elif entity_data.get('price'):
                secondary_parts.append(f"${entity_data['price']}")
            elif entity_data.get('duration'):
                secondary_parts.append(f"{entity_data['duration']} minute service")
            
            if secondary_parts:
                chunks.append(SearchChunk(
                    content=". ".join(secondary_parts),
                    chunk_type="secondary",
                    weight=0.7
                ))
        
        # Filter out chunks that are too short
        return [chunk for chunk in chunks if len(chunk.content.strip()) > 10]
    
    async def _get_cached_embedding(
        self, 
        content: str, 
        content_type: str, 
        entity_id: int,
        chunk_index: int = 0,
        db: Session = None
    ) -> Optional[List[float]]:
        """Get embedding from cache or return None if not cached"""
        if not db:
            return None
        
        content_hash = self._create_content_hash(content)
        
        try:
            cached = db.query(EmbeddingCache).filter(
                and_(
                    EmbeddingCache.content_hash == content_hash,
                    EmbeddingCache.content_type == content_type,
                    EmbeddingCache.entity_id == entity_id,
                    EmbeddingCache.chunk_index == chunk_index,
                    EmbeddingCache.is_active == True
                )
            ).first()
            
            if cached:
                # Update last used timestamp
                cached.update_last_used()
                db.commit()
                return cached.embedding
                
        except Exception as e:
            logger.error(f"Error retrieving cached embedding: {e}")
            
        return None
    
    async def _cache_embedding(
        self,
        content: str,
        embedding: List[float],
        content_type: str,
        entity_id: int,
        chunk_index: int = 0,
        model: str = "voyage-3-large",
        db: Session = None
    ):
        """Cache embedding in database"""
        if not db or not embedding:
            return
        
        content_hash = self._create_content_hash(content)
        
        try:
            # Check if already exists
            existing = db.query(EmbeddingCache).filter(
                EmbeddingCache.content_hash == content_hash
            ).first()
            
            if existing:
                # Update existing
                existing.embedding = embedding
                existing.updated_at = datetime.utcnow()
                existing.last_used_at = datetime.utcnow()
                existing.is_active = True
            else:
                # Create new
                cache_entry = EmbeddingCache(
                    content_hash=content_hash,
                    content_type=content_type,
                    entity_id=entity_id,
                    content_text=content,
                    embedding=embedding,
                    embedding_model=model,
                    chunk_index=chunk_index,
                    embedding_dimension=len(embedding),
                    content_length=len(content),
                    is_active=True
                )
                db.add(cache_entry)
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error caching embedding: {e}")
            db.rollback()
    
    async def generate_embedding_with_cache(
        self, 
        content: str, 
        content_type: str,
        entity_id: int,
        chunk_index: int = 0,
        input_type: str = "document",
        model: str = None,
        db: Session = None
    ) -> Optional[List[float]]:
        """Generate embedding with caching support"""
        if not self.client:
            return None
        
        model = model or self.config.get("content_model", "voyage-3-large")
        
        # Try to get from cache first
        if db:
            cached_embedding = await self._get_cached_embedding(
                content, content_type, entity_id, chunk_index, db
            )
            if cached_embedding:
                return cached_embedding
        
        # Generate new embedding
        try:
            cleaned_content = self._clean_text(content)
            if not cleaned_content:
                return None
            
            response = self.client.embed(
                texts=[cleaned_content],
                model=model,
                input_type=input_type
            )
            
            if response and response.embeddings:
                embedding = response.embeddings[0]
                
                # Cache the embedding
                if db:
                    await self._cache_embedding(
                        content, embedding, content_type, entity_id, 
                        chunk_index, model, db
                    )
                
                return embedding
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    async def _batch_generate_entity_embeddings(
        self, entity_type: str, entity_data_batch: List[Dict[str, Any]], 
        db: Session
    ) -> Dict[int, List[Tuple[SearchChunk, List[float]]]]:
        """
        Batch generate embeddings for multiple entities to avoid N+1 queries.
        Returns a dictionary mapping entity_id to their chunk embeddings.
        """
        results = {}
        
        # Batch check cache for all entities first
        cache_lookups = {}
        for entity_data in entity_data_batch:
            entity_id = entity_data['entity_id']
            chunks = self._create_content_chunks(entity_type, entity_data)
            
            cached_chunks = []
            uncached_chunks = []
            
            for chunk in chunks:
                content_hash = self._create_content_hash(chunk.content)
                cached_embedding = await self._get_cached_embedding(content_hash, db)
                
                if cached_embedding:
                    cached_chunks.append((chunk, cached_embedding))
                else:
                    uncached_chunks.append(chunk)
            
            cache_lookups[entity_id] = {
                'cached_chunks': cached_chunks,
                'uncached_chunks': uncached_chunks
            }
        
        # Batch generate embeddings for all uncached content
        all_uncached_content = []
        uncached_mapping = {}  # Maps content to (entity_id, chunk)
        
        for entity_id, lookup_data in cache_lookups.items():
            for chunk in lookup_data['uncached_chunks']:
                all_uncached_content.append(chunk.content)
                uncached_mapping[chunk.content] = (entity_id, chunk)
        
        # Generate embeddings in batch if we have uncached content
        if all_uncached_content:
            try:
                batch_embeddings = await self.voyage_client.get_embedding(all_uncached_content)
                
                # Cache the new embeddings
                for i, content in enumerate(all_uncached_content):
                    embedding = batch_embeddings[i]
                    content_hash = self._create_content_hash(content)
                    
                    # Store in cache
                    await self._store_cached_embedding(
                        content_hash, content, embedding, "batch_generation", db
                    )
                    
                    # Add to results
                    entity_id, chunk = uncached_mapping[content]
                    if entity_id not in results:
                        results[entity_id] = []
                    results[entity_id].append((chunk, embedding))
            
            except Exception as e:
                logger.error(f"Batch embedding generation failed: {e}")
                # Continue with cached results only
        
        # Combine cached and newly generated embeddings
        for entity_id, lookup_data in cache_lookups.items():
            if entity_id not in results:
                results[entity_id] = []
            
            # Add cached embeddings
            results[entity_id].extend(lookup_data['cached_chunks'])
        
        return results
    
    async def _generate_entity_embeddings(
        self,
        entity_type: str,
        entity_data: dict,
        entity_id: int,
        db: Session = None
    ) -> List[Tuple[SearchChunk, List[float]]]:
        """Generate embeddings for all chunks of an entity"""
        chunks = self._create_searchable_chunks(entity_type, entity_data)
        chunk_embeddings = []
        
        for i, chunk in enumerate(chunks):
            embedding = await self.generate_embedding_with_cache(
                content=chunk.content,
                content_type=entity_type,
                entity_id=entity_id,
                chunk_index=i,
                input_type="document",
                db=db
            )
            
            if embedding:
                chunk_embeddings.append((chunk, embedding))
        
        return chunk_embeddings
    
    def calculate_weighted_similarity(
        self, 
        query_embedding: List[float], 
        chunk_embeddings: List[Tuple[SearchChunk, List[float]]]
    ) -> Tuple[float, List[float]]:
        """Calculate weighted similarity score across multiple chunks"""
        if not chunk_embeddings:
            return 0.0, []
        
        chunk_scores = []
        weighted_scores = []
        
        for chunk, embedding in chunk_embeddings:
            similarity = self._calculate_cosine_similarity(query_embedding, embedding)
            chunk_scores.append(similarity)
            weighted_scores.append(similarity * chunk.weight)
        
        # Calculate final score (weighted average)
        total_weight = sum(chunk.weight for chunk, _ in chunk_embeddings)
        final_score = sum(weighted_scores) / total_weight if total_weight > 0 else 0.0
        
        return final_score, chunk_scores
    
    def _calculate_cosine_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float((similarity + 1) / 2)  # Convert to 0-1 range
            
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0
    
    async def _semantic_search_barbers(
        self,
        query: str,
        db: Session,
        limit: int = 10,
        min_similarity: float = None,
        context: SearchContext = None
    ) -> List[EnhancedSemanticMatch]:
        """Perform semantic search for barbers"""
        min_similarity = min_similarity or self.config.get("min_similarity_barber", 0.6)
        
        # Generate query embedding
        query_embedding = await self.generate_embedding_with_cache(
            content=query,
            content_type="query",
            entity_id=0,  # Query doesn't have entity_id
            input_type="query",
            model=self.config.get("query_model"),
            db=db
        )
        
        if not query_embedding:
            return []
        
        # Get barbers
        barber_query = db.query(User).filter(
            User.unified_role.in_(["BARBER", "SHOP_OWNER"]),
            User.is_active == True
        )
        
        # Apply context filters if provided
        if context and context.filters:
            if 'location_id' in context.filters:
                barber_query = barber_query.filter(
                    User.location_id == context.filters['location_id']
                )
        
        barbers = barber_query.all()
        matches = []
        
        # Batch preparation for embeddings to avoid N+1 queries
        barber_data_batch = []
        for barber in barbers:
            barber_data = {
                'bio': f"Professional {barber.unified_role.lower().replace('_', ' ')}",  # Generate description from role
                'specialties': getattr(barber, 'specialties', []),
                'experience_years': getattr(barber, 'experience_years', None),
                'unified_role': barber.unified_role,
                'first_name': barber.first_name,
                'last_name': barber.last_name,
                'entity_id': barber.id
            }
            barber_data_batch.append(barber_data)
        
        # Batch generate embeddings for all barbers to avoid N+1 queries
        barber_embeddings_batch = await self._batch_generate_entity_embeddings(
            "barber", barber_data_batch, db
        )
        
        for i, barber in enumerate(barbers):
            chunk_embeddings = barber_embeddings_batch.get(barber.id, [])
            
            if not chunk_embeddings:
                continue
            
            # Calculate weighted similarity
            similarity, chunk_scores = self.calculate_weighted_similarity(
                query_embedding, chunk_embeddings
            )
            
            if similarity >= min_similarity:
                # Create description from chunks
                descriptions = [chunk.content for chunk, _ in chunk_embeddings]
                description = ". ".join(descriptions[:2])  # Use first 2 chunks
                
                matches.append(EnhancedSemanticMatch(
                    entity_id=barber.id,
                    entity_type="barber",
                    title=f"{barber.first_name} {barber.last_name}".strip(),
                    description=description,
                    similarity_score=similarity,
                    chunk_scores=chunk_scores,
                    search_type="semantic",
                    metadata={
                        "email": barber.email,
                        "bio": f"Professional {barber.unified_role.lower().replace('_', ' ')}",
                        "experience_years": getattr(barber, 'experience_years', None),
                        "specialties": getattr(barber, 'specialties', []),
                        "chunk_count": len(chunk_embeddings)
                    }
                ))
        
        # Sort by similarity score
        matches.sort(key=lambda x: x.similarity_score, reverse=True)
        return matches[:limit]
    
    async def _keyword_search_barbers(
        self,
        query: str,
        db: Session,
        limit: int = 10,
        context: SearchContext = None
    ) -> List[EnhancedSemanticMatch]:
        """Perform keyword search for barbers"""
        search_term = f"%{query.lower()}%"
        
        barber_query = db.query(User).filter(
            User.unified_role.in_(["BARBER", "SHOP_OWNER"]),
            User.name.ilike(search_term)
        )
        
        # Apply context filters
        if context and context.filters:
            if 'location_id' in context.filters:
                barber_query = barber_query.filter(
                    User.location_id == context.filters['location_id']
                )
        
        barbers = barber_query.limit(limit).all()
        matches = []
        
        for barber in barbers:
            # Calculate simple keyword relevance score
            name_lower = (barber.name or "").lower()
            query_lower = query.lower()
            
            # Simple scoring: exact matches get higher scores
            if query_lower in name_lower:
                score = 0.8 if query_lower == name_lower else 0.6
            else:
                score = 0.4
            
            matches.append(EnhancedSemanticMatch(
                entity_id=barber.id,
                entity_type="barber",
                title=f"{barber.first_name or ''} {barber.last_name or ''}".strip() or barber.name or f"Barber {barber.id}",
                description=f"Professional {barber.unified_role.lower().replace('_', ' ')}",
                similarity_score=score,
                chunk_scores=[score],
                search_type="keyword",
                metadata={
                    "email": barber.email,
                    "bio": f"Professional {barber.unified_role.lower().replace('_', ' ')}"
                }
            ))
        
        return matches
    
    async def hybrid_search_barbers(
        self,
        query: str,
        db: Session,
        limit: int = 10,
        min_similarity: float = None,
        context: SearchContext = None
    ) -> List[EnhancedSemanticMatch]:
        """Combine semantic and keyword search for optimal results"""
        if not self.config.get("enable_hybrid_search", True):
            return await self._semantic_search_barbers(query, db, limit, min_similarity, context)
        
        # Get results from both methods
        semantic_results = await self._semantic_search_barbers(
            query, db, limit//2, min_similarity, context
        )
        
        keyword_results = await self._keyword_search_barbers(
            query, db, limit//2, context
        )
        
        # Combine and deduplicate
        seen_ids = set()
        combined_results = []
        
        # Add semantic results first (higher priority)
        for result in semantic_results:
            if result.entity_id not in seen_ids:
                combined_results.append(result)
                seen_ids.add(result.entity_id)
        
        # Add keyword results that weren't found semantically
        for result in keyword_results:
            if result.entity_id not in seen_ids:
                result.search_type = "hybrid"  # Mark as hybrid
                combined_results.append(result)
                seen_ids.add(result.entity_id)
        
        # Re-rank combined results
        combined_results.sort(key=lambda x: x.similarity_score, reverse=True)
        
        # Set final rankings
        for i, result in enumerate(combined_results):
            result.rank = i + 1
        
        return combined_results[:limit]
    
    async def _log_search_analytics(
        self,
        query: str,
        search_type: str,
        results: List[EnhancedSemanticMatch],
        search_time_ms: int,
        context: SearchContext = None,
        error_message: str = None,
        db: Session = None
    ):
        """Log search analytics for optimization"""
        if not self.config.get("enable_analytics", True) or not db:
            return
        
        try:
            query_hash = self._create_content_hash(query)
            
            # Calculate analytics metrics
            similarity_scores = [r.similarity_score for r in results if r.similarity_score]
            top_score = max(similarity_scores) if similarity_scores else None
            avg_score = sum(similarity_scores) / len(similarity_scores) if similarity_scores else None
            
            has_semantic = any(r.search_type in ["semantic", "hybrid"] for r in results)
            has_keyword = any(r.search_type in ["keyword", "hybrid"] for r in results)
            
            analytics = SearchAnalytics(
                query=query[:500],  # Truncate long queries
                query_hash=query_hash,
                normalized_query=query.lower().strip(),
                user_id=context.user_id if context else None,
                user_role=context.user_role if context else None,
                session_id=context.session_id if context else None,
                search_type=search_type,
                search_category="barbers",  # Could be parameterized
                results_count=len(results),
                has_semantic_results=has_semantic,
                has_keyword_results=has_keyword,
                top_similarity_score=top_score,
                avg_similarity_score=avg_score,
                search_time_ms=search_time_ms,
                error_message=error_message,
                search_context=context.filters if context and context.filters else None,
                result_metadata={
                    "result_ids": [r.entity_id for r in results[:10]],
                    "search_types": list(set(r.search_type for r in results))
                }
            )
            
            db.add(analytics)
            db.commit()
            
        except Exception as e:
            logger.error(f"Error logging search analytics: {e}")
            if db:
                db.rollback()
    
    def _clean_text(self, text: str) -> str:
        """Clean and prepare text for embedding"""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        cleaned = " ".join(text.strip().split())
        
        # Limit length (Voyage.ai has token limits)
        max_length = 8000
        if len(cleaned) > max_length:
            cleaned = cleaned[:max_length].rsplit(' ', 1)[0]
        
        return cleaned
    
    async def search_barbers(
        self,
        query: str,
        db: Session,
        limit: int = 10,
        min_similarity: float = None,
        search_type: str = "hybrid",
        context: SearchContext = None
    ) -> List[EnhancedSemanticMatch]:
        """Main search interface for barbers"""
        start_time = datetime.now()
        
        try:
            if not self.is_available():
                logger.warning("Semantic search not available, using keyword search")
                search_type = "keyword"
            
            # Perform search based on type
            if search_type == "semantic":
                results = await self._semantic_search_barbers(query, db, limit, min_similarity, context)
            elif search_type == "keyword":
                results = await self._keyword_search_barbers(query, db, limit, context)
            else:  # hybrid
                results = await self.hybrid_search_barbers(query, db, limit, min_similarity, context)
            
            # Calculate search time
            search_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Log analytics
            await self._log_search_analytics(
                query, search_type, results, search_time_ms, context, db=db
            )
            
            return results
            
        except Exception as e:
            search_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            error_msg = str(e)
            logger.error(f"Search failed: {error_msg}")
            
            # Log error analytics
            await self._log_search_analytics(
                query, search_type, [], search_time_ms, context, error_msg, db
            )
            
            # Fallback to basic keyword search
            return await self._keyword_search_barbers(query, db, limit, context)

    async def search_services(
        self,
        query: str,
        db: Session,
        limit: int = 10,
        min_similarity: float = None,
        search_type: str = "hybrid",
        context: SearchContext = None
    ) -> List[EnhancedSemanticMatch]:
        """
        Enhanced semantic search for services with caching and analytics.
        
        Args:
            query: Search query
            db: Database session
            limit: Maximum number of results
            min_similarity: Minimum similarity threshold
            search_type: "semantic", "keyword", or "hybrid"
            context: Search context for analytics and filtering
        """
        start_time = datetime.now()
        
        try:
            if not self.is_available():
                logger.warning("Semantic search not available for services, using keyword search")
                search_type = "keyword"
            
            # Use default similarity if not provided
            if min_similarity is None:
                min_similarity = self.config.get("min_similarity_service", 0.5)
            
            # Perform search based on type
            if search_type == "semantic":
                results = await self._semantic_search_services(query, db, limit, min_similarity, context)
            elif search_type == "keyword":
                results = await self._keyword_search_services(query, db, limit, context)
            else:  # hybrid
                results = await self.hybrid_search_services(query, db, limit, min_similarity, context)
            
            # Calculate search time
            search_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Log analytics
            await self._log_search_analytics(
                query, search_type, results, search_time_ms, context, db=db
            )
            
            return results
            
        except Exception as e:
            search_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            error_msg = str(e)
            logger.error(f"Service search failed: {error_msg}")
            
            # Log error analytics
            await self._log_search_analytics(
                query, search_type, [], search_time_ms, context, error_msg, db
            )
            
            # Fallback to basic keyword search
            return await self._keyword_search_services(query, db, limit, context)

    async def _semantic_search_services(
        self, query: str, db: Session, limit: int, min_similarity: float, context: SearchContext = None
    ) -> List[EnhancedSemanticMatch]:
        """Semantic search for services using embeddings"""
        # Generate query embedding
        query_embedding = await self.generate_embedding_with_cache(query, "query", db)
        
        if not query_embedding:
            logger.warning("Failed to generate query embedding for service search")
            return []
        
        # Get services from database
        from models import Service
        service_query = db.query(Service).filter(Service.is_active == True)
        
        # Apply context filters if provided
        if context and context.filters:
            if 'location_id' in context.filters:
                service_query = service_query.filter(
                    Service.location_id == context.filters['location_id']
                )
            if 'category' in context.filters:
                service_query = service_query.filter(
                    Service.category == context.filters['category']
                )
        
        services = service_query.all()
        matches = []
        
        # Batch preparation for embeddings to avoid N+1 queries
        service_data_batch = []
        for service in services:
            service_data = {
                'name': service.name,
                'description': service.description or '',
                'category': service.category or '',
                'price': float(service.price),
                'duration': service.duration,
                'entity_id': service.id
            }
            service_data_batch.append(service_data)
        
        # Batch generate embeddings for all services to avoid N+1 queries
        service_embeddings_batch = await self._batch_generate_entity_embeddings(
            "service", service_data_batch, db
        )
        
        for service in services:
            chunk_embeddings = service_embeddings_batch.get(service.id, [])
            
            if not chunk_embeddings:
                continue
            
            # Calculate weighted similarity
            similarity, chunk_scores = self.calculate_weighted_similarity(
                query_embedding, chunk_embeddings
            )
            
            if similarity >= min_similarity:
                # Create description from chunks
                descriptions = [chunk.content for chunk, _ in chunk_embeddings]
                description = ". ".join(descriptions[:2])  # Use first 2 chunks
                
                # Apply contextual boosting for services
                contextual_boost = 1.0
                if context:
                    # Boost based on user preferences or location
                    if hasattr(context, 'user_preferences'):
                        if service.category in context.user_preferences.get('preferred_categories', []):
                            contextual_boost *= 1.15
                    
                    # Price range preference boosting
                    if hasattr(context, 'price_range'):
                        price_min = context.price_range.get('min', 0)
                        price_max = context.price_range.get('max', float('inf'))
                        if price_min <= float(service.price) <= price_max:
                            contextual_boost *= 1.1
                
                final_similarity = similarity * contextual_boost
                
                matches.append(EnhancedSemanticMatch(
                    entity_id=service.id,
                    entity_type="service",
                    title=service.name,
                    description=description,
                    similarity_score=final_similarity,
                    chunk_scores=chunk_scores,
                    search_type="semantic",
                    rank=0,  # Will be set after sorting
                    metadata={
                        "category": service.category,
                        "price": float(service.price),
                        "duration": service.duration,
                        "is_active": service.is_active,
                        "contextual_boost": contextual_boost,
                        "original_similarity": similarity,
                        "cached": any("cached" in str(chunk) for chunk, _ in chunk_embeddings)
                    }
                ))
        
        # Sort by similarity score (highest first)
        sorted_matches = sorted(matches, key=lambda x: x.similarity_score, reverse=True)
        
        # Add rank to sorted results
        for i, match in enumerate(sorted_matches):
            match.rank = i + 1
        
        return sorted_matches[:limit]

    async def _keyword_search_services(
        self, query: str, db: Session, limit: int, context: SearchContext = None
    ) -> List[EnhancedSemanticMatch]:
        """Keyword-based search for services using SQL LIKE queries"""
        from models import Service
        from sqlalchemy import or_, func
        
        # Create search terms
        search_terms = query.lower().split()
        
        # Build query
        service_query = db.query(Service).filter(Service.is_active == True)
        
        # Apply context filters
        if context and context.filters:
            if 'location_id' in context.filters:
                service_query = service_query.filter(
                    Service.location_id == context.filters['location_id']
                )
            if 'category' in context.filters:
                service_query = service_query.filter(
                    Service.category == context.filters['category']
                )
        
        # Add keyword filtering
        for term in search_terms:
            service_query = service_query.filter(
                or_(
                    func.lower(Service.name).contains(term),
                    func.lower(Service.description).contains(term),
                    func.lower(Service.category).contains(term)
                )
            )
        
        services = service_query.limit(limit * 2).all()  # Get extra for ranking
        matches = []
        
        for service in services:
            # Calculate keyword match score
            name_matches = sum(1 for term in search_terms if term in service.name.lower())
            desc_matches = sum(1 for term in search_terms if term in (service.description or "").lower())
            category_matches = sum(1 for term in search_terms if term in (service.category or "").lower())
            
            # Weighted scoring
            score = (name_matches * 0.6 + desc_matches * 0.3 + category_matches * 0.1) / len(search_terms)
            
            if score > 0:
                matches.append(EnhancedSemanticMatch(
                    entity_id=service.id,
                    entity_type="service",
                    title=service.name,
                    description=service.description or f"{service.category} service",
                    similarity_score=score,
                    chunk_scores=[score],
                    search_type="keyword",
                    rank=0,
                    metadata={
                        "category": service.category,
                        "price": float(service.price),
                        "duration": service.duration,
                        "is_active": service.is_active,
                        "name_matches": name_matches,
                        "desc_matches": desc_matches,
                        "category_matches": category_matches
                    }
                ))
        
        # Sort by score and add ranks
        sorted_matches = sorted(matches, key=lambda x: x.similarity_score, reverse=True)
        for i, match in enumerate(sorted_matches):
            match.rank = i + 1
        
        return sorted_matches[:limit]

    async def hybrid_search_services(
        self, query: str, db: Session, limit: int, min_similarity: float, context: SearchContext = None
    ) -> List[EnhancedSemanticMatch]:
        """Hybrid search combining semantic and keyword results for services"""
        # Get results from both methods
        semantic_results = await self._semantic_search_services(query, db, limit, min_similarity, context)
        keyword_results = await self._keyword_search_services(query, db, limit, context)
        
        # Combine and deduplicate results
        combined_results = {}
        
        # Add semantic results with higher weight
        for result in semantic_results:
            result.search_type = "hybrid"
            result.similarity_score *= 0.7  # Semantic weight
            combined_results[result.entity_id] = result
        
        # Add keyword results, merging with existing
        for result in keyword_results:
            if result.entity_id in combined_results:
                # Merge scores
                existing = combined_results[result.entity_id]
                existing.similarity_score += result.similarity_score * 0.3  # Keyword weight
                existing.metadata.update(result.metadata)
            else:
                result.search_type = "hybrid"
                result.similarity_score *= 0.3  # Keyword weight only
                combined_results[result.entity_id] = result
        
        # Sort combined results
        final_results = sorted(combined_results.values(), key=lambda x: x.similarity_score, reverse=True)
        
        # Add final ranks
        for i, result in enumerate(final_results):
            result.rank = i + 1
        
        return final_results[:limit]


# Global instance
enhanced_semantic_search = EnhancedSemanticSearchService()